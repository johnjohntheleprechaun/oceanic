import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CognitoIdentityCredentialProvider, fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import jwtDecode from "jwt-decode";
import { DocumentInfo, KeyPair, MasterKeyPair } from "./cloud-types";
import { passcodeToKey } from "./crypto";
import { Tokens } from "./tokens";
import { CloudConfig } from "./cloud-config";

declare const cloudConfig: CloudConfig;

const keyPairParams = {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
};

export class CloudConnection {
    /**
     * Credentials from the cognito identity pool
     */
    private credentials: CognitoIdentityCredentialProvider;
    /**
     * S3 client
     */
    private s3Client: S3Client;
    /**
     * DynamoDB client
     */
    private dynamoClient: DynamoDBClient;
    /**
     * The user's cognito tokens (NOT the identity pool credentials)
     */
    private tokens: Tokens;
    /**
     * The user's id (the one used as the dynamo partition key, and the s3 prefix)
     */
    public identityId: string;
    /**
     * The master key that's used to wrap/unwrap all the document keys
     */
    private masterKey: MasterKeyPair;

    /**
     * Automatically use localStorage to create an AWSConnection object
     * @returns A new AWSConnection
     */
    public static async fromLocalStorage() {
        const connection = new CloudConnection();
        await connection.initialize( Tokens.fromLocalStorage() );
        return connection;
    }
    /**
     * Initialize credentials and clients
     * @param tokens A tokens object
     */
    public async initialize(tokens?: Tokens) {
        if (tokens) {
            this.tokens = tokens;
        } else {
            this.tokens = Tokens.fromLocalStorage();
        }
        this.identityId = (jwtDecode(tokens.idToken) as any)["custom:identityId"];
        this.credentials = fromCognitoIdentityPool({
            identityPoolId: cloudConfig.identityPool,
            logins: {
                [cloudConfig.userPool]: await this.tokens.getIdToken()
            },
            clientConfig: { region: "us-west-2" }
        });
        this.s3Client = new S3Client({ credentials: this.credentials, region: "us-west-2" });
        this.dynamoClient = new DynamoDBClient({ credentials: this.credentials, region: "us-west-2" });
    }

    /**
     * Fetch a document from S3, as a string
     * @param id The document's ID
     * @returns The document's content
     */
    public async getDocumentContent(id: string): Promise<string> {
        const documentInfo = await this.getDocumentInfo(id);
        const wrappedKey = documentInfo.documentKey;
        const documentKey = await crypto.subtle.unwrapKey("raw", wrappedKey, this.masterKey.privateKey, { name: "RSA-OAEP" }, "AES-GCM", false, [ "encrypt", "decrypt" ]);
        const decoder = new TextDecoder();
        const documentData = await this.getObject(id, documentKey);
        return decoder.decode(documentData);
    }

    /**
     * Fetch an S3 object's binary data. You should probably be using getDocumentContent
     * @param objectName The object's name
     * @param key The key this object is encrypted with
     * @returns The object's content
     */
    public async getObject(objectName: string, key: CryptoKey) {
        const getCommand = new GetObjectCommand({
            Bucket: cloudConfig.bucketName,
            Key: `${this.identityId}/${objectName}`
        });
        const document = await this.s3Client.send(getCommand);
        const body = await document.Body.transformToByteArray();
        // decrypt the object
        const iv = body.slice(0, 96/8); // extract the 96 bit IV
        const encrypted = body.slice(96/8); // extract the encrypted data
        return await crypto.subtle.decrypt(
            { name: "AES-GCM", length: 256, iv },
            key, encrypted
        );
    }

    /**
     * Fetch the document info from dynamodb
     * @param id The document's ID
     * @returns The unmarshalled DocumentInfo object
     */
    public async getDocumentInfo(id: string): Promise<DocumentInfo> {
        id = id.replace(/^document:/, "");
        const getCommand = new GetItemCommand({
            TableName: cloudConfig.tableName,
            Key: {
                user: {
                    "S": this.identityId
                },
                id: {
                    "S": `document:${id}`
                }
            }
        });
        const document = await this.dynamoClient.send(getCommand);
        return unmarshall(document.Item) as DocumentInfo;
    }

    /**
     * Encrypt an object and upload it to S3
     * @param objectName The name of the object in S3, not including the identity ID prefix
     * @param data The object's data to be put in S3
     * @param key The key to encrypt the object data with
     * @returns The response from S3
     */
    public async putObject(objectName: string, data: Uint8Array, key: CryptoKey) {
        // generate a 96 bit IV
        const iv = crypto.getRandomValues(new Uint8Array(96/8));

        // encrypt the journal data
        console.log("encrypting...");
        const encrypted = new Uint8Array(await crypto.subtle.encrypt(
            { name: "AES-GCM", iv }, key, data
        ));
        console.log("done");

        // create a new array that's the combined length
        const fullData = new Uint8Array(encrypted.length + iv.length);
        // put the IV at the beginning
        fullData.set(iv);
        // set the rest of the object to the encrypted data
        fullData.set(encrypted, iv.length);

        const putCommand = new PutObjectCommand({
            Bucket: cloudConfig.bucketName,
            Key: `${this.identityId}/${objectName}`,
            Body: fullData
        });
        console.log("sending");
        return await this.s3Client.send(putCommand);
    }

    /**
     * Create a new document and upload it to DynamoDB
     * @param type The document's type
     * @param title The document's title. Set as an empty string if none is provided
     * @returns The DocumentInfo object that was sent to DynamoDB
     */
    public async createDocument(type: string, title?: string): Promise<DocumentInfo> {
        // Create a new document key
        console.log("generating key");
        const documentKey = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true, [ "encrypt", "decrypt" ]
        ) as CryptoKey;

        // fetch the most recent public key
        const publicKey = await this.getLatestPublicKey(this.identityId);

        // wrap the document key
        const wrappedKey = await crypto.subtle.wrapKey("jwk", documentKey, publicKey, { name: "RSA-OAEP" }) as ArrayBuffer;

        // generate a document ID
        const documentId = crypto.randomUUID();

        // set the document's properties
        const documentInfo: DocumentInfo = {
            user: this.identityId,
            id: `document:${documentId}`,
            title: title || "",
            type: type,
            created: Date.now(),
            updated: Date.now(),
            attachments: [],
            documentKey: new Uint8Array(wrappedKey), // Convert to Uint8Array so that the dynamo client will automatically format it as b64 before upload
            authorizedUsers: [] // the owner isn't included here, so just an empty list
        };

        // marshall the document and upload it
        const marshalled = marshall(documentInfo);
        const putCommand = new PutItemCommand({
            TableName: cloudConfig.tableName,
            Item: marshalled
        });
        const dynamoSend = this.dynamoClient.send(putCommand);
        
        // put an empty document into s3
        const s3Put = this.putObject(documentId, new Uint8Array(), documentKey);

        await Promise.all([ dynamoSend, s3Put ]);
        
        // return the file
        return documentInfo;
    }

    /**
     * Generate a new key pair, and push it to DynamoDB
     * @param wrapper Either the key to use for wrapping the private key, or the passcode to generate a key from
     * @returns The generated keypair
     */
    public async createNewKeyPair(wrapper: CryptoKey | string) {
        let wrappingKey: CryptoKey;

        // Derive a key if needed
        if (typeof wrapper === "string") {
            wrappingKey = await passcodeToKey(wrapper, this.identityId);
        } else {
            wrappingKey = wrapper
        }

        // make sure the key can be used for wrapping
        if (!wrappingKey.usages.includes("wrapKey")) {
            throw new Error("Can't use that key for wrapping")
        }

        // generate a new key pair
        const keyPair = await crypto.subtle.generateKey(keyPairParams, true, [ "wrapKey", "unwrapKey" ]);

        // wrap the private key for storage in the cloud
        const wrappedPrivateKey = await crypto.subtle.wrapKey(
            "jwk", keyPair.privateKey, wrappingKey, "AES-KW"
        )

        // upload the key to DynamoDB
        const dynamoObject: KeyPair = {
            user: this.identityId,
            id: "keypair",
            privateKey: new Uint8Array(wrappedPrivateKey),
            publicKey: await crypto.subtle.exportKey("jwk", keyPair.publicKey)
        }
        const putCommand = new PutItemCommand({
            TableName: cloudConfig.tableName,
            Item: marshall(dynamoObject)
        });
        await this.dynamoClient.send(putCommand);

        // return the newly generated key pair
        return keyPair;
    }

    public async getMasterKeyPair(masterKey: CryptoKey | string): Promise<MasterKeyPair> {
        // Derive a key if necessary
        let wrappingKey: CryptoKey;
        if (typeof masterKey === "string") {
            wrappingKey = await passcodeToKey(masterKey, this.identityId);
        } else {
            wrappingKey = masterKey;
        }

        // Fetch the key pair from DynamoDB
        const getCommand = new GetItemCommand({
            TableName: cloudConfig.tableName,
            Key: {
                "user": { S: this.identityId },
                "id": { S: "keypair" }
            },
            ProjectionExpression: `user, id, publicKey, privateKey`
        });
        const response = await this.dynamoClient.send(getCommand);
        const keyPair = unmarshall(response.Item) as KeyPair;

        // Import the keys and return
        return {
            publicKey: await crypto.subtle.importKey("jwk", keyPair.publicKey, keyPairParams, false, [ "wrapKey" ]),
            privateKey: await crypto.subtle.unwrapKey("jwk", keyPair.privateKey, wrappingKey, "AES-KW", keyPairParams, false, [ "unwrapKey" ])
        }
    }

    /**
     * Get the most recent public key for a user
     * @param user the identity ID of the user who's public key you are fetching
     */
    public async getLatestPublicKey(user?: string): Promise<CryptoKey> {
        const queryCommand = new QueryCommand({
            TableName: cloudConfig.tableName,
            ProjectionExpression: "publicKey, id, #owner", // don't try to get the private key, the request will 
            ExpressionAttributeValues: {
                ":user": { S: user || this.identityId },
                ":id": { S: "keypair:" }
            },
            ExpressionAttributeNames: {
                "#owner": "user" // "user" is a reserved name in dynamo
            },
            KeyConditionExpression: "#owner = :user AND begins_with ( id, :id )",
            ScanIndexForward: false, // get the highest, since keypair IDs are just the timestamp of their creation
            Limit: 1 // only get the most recent
        });
        const resp = await this.dynamoClient.send(queryCommand);

        // extract the key object
        const keyPair = unmarshall(resp.Items[0]) as KeyPair;

        // import the key and return it
        return await crypto.subtle.importKey(
            "jwk", keyPair.publicKey,
            keyPairParams, false, [ "wrapKey" ]
        );
    }
}