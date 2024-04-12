import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CognitoIdentityCredentialProvider, fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import jwtDecode from "jwt-decode";
import { DocumentInfo, WrappedMasterKeyPair, MasterKeyPair } from "./cloud-types";
import { CryptoUtils } from "./crypto";
import { CloudConfig } from "./cloud-config";
import { SecretManager, Tokens } from "./secrets";

declare const cloudConfig: CloudConfig;

/**
 * A static class
 */
export class CloudConnection {
    /**
     * Credentials from the cognito identity pool
     */
    private static credentials: CognitoIdentityCredentialProvider;
    /**
     * S3 client
     */
    private static s3Client: S3Client;
    /**
     * DynamoDB client
     */
    private static dynamoClient: DynamoDBClient;
    /**
     * The user's cognito tokens (NOT the identity pool credentials)
     */
    private static tokens: Tokens;
    /**
     * The user's id (the one used as the dynamo partition key, and the s3 prefix)
     */
    public static identityId: string;
    /**
     * The master key that's used to wrap/unwrap all the document keys
     */
    private static masterKey: MasterKeyPair;
    /**
     * Whether the object has been fully initialized or not
     */
    private static loaded: boolean;

    static {
        console.log("CloudConnection static initialization");
    }

    /**
     * Initialize credentials and clients
     * @param tokens A tokens object
     */

    public static async initialize() {
        if (this.loaded) {
            return;
        }
        this.tokens = await SecretManager.getTokens();
        console.log(await this.tokens.getIdToken());
        this.identityId = (jwtDecode(await this.tokens.getIdToken()) as any)["custom:identityId"];
        this.credentials = fromCognitoIdentityPool({
            identityPoolId: cloudConfig.identityPool,
            logins: {
                [cloudConfig.userPool]: await this.tokens.getIdToken()
            },
            clientConfig: { region: "us-west-2" }
        });
        this.s3Client = new S3Client({ credentials: this.credentials, region: "us-west-2" });
        this.dynamoClient = new DynamoDBClient({ credentials: this.credentials, region: "us-west-2" });

        this.loaded = true;
    }

    /**
     * Fetch a document from S3, as a string
     * @param id The document's ID
     * @returns The document's content
     */
    public static async getDocumentContent(id: string): Promise<string> {
        await this.initialize();
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
    public static  async getObject(objectName: string, key: CryptoKey) {
        await this.initialize();
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
    public static async getDocumentInfo(id: string): Promise<DocumentInfo> {
        await this.initialize();
        
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
    public static async putObject(objectName: string, data: Uint8Array, key: CryptoKey) {
        await this.initialize();

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
    public static async createDocument(type: string, title?: string): Promise<DocumentInfo> {
        await this.initialize();
        
        // Create a new document key
        console.log("generating key");
        const documentKey = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true, [ "encrypt", "decrypt" ]
        ) as CryptoKey;

        // wrap the document key
        const wrappedKey = await crypto.subtle.wrapKey("jwk", documentKey, this.masterKey.publicKey, { name: "RSA-OAEP" }) as ArrayBuffer;

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
     * Update a user's key pair
     * @param masterKey Either the key to use for wrapping the private key, or the passcode to generate a key from
     * @returns The generated keypair
     */
    public static async updateKeyPair(keyPair: MasterKeyPair, masterKey?: CryptoKey | string): Promise<void> {
        await this.initialize();

        if (!keyPair.wrappedPrivateKey && !masterKey) {
            throw new Error("No wrapped private key was found and no master key was provided to wrap the unwrapped key");
        }

        let wrappedPrivateKey: ArrayBuffer;
        if (!keyPair.wrappedPrivateKey) {
            let wrappingKey: CryptoKey;
    
            // Derive a key if needed
            if (typeof masterKey === "string") {
                wrappingKey = await CryptoUtils.passcodeToKey(masterKey, this.identityId);
            } else {
                wrappingKey = masterKey
            }
    
            // make sure the key can be used for wrapping
            if (!wrappingKey.usages.includes("wrapKey")) {
                throw new Error("Can't use the provided master key for wrapping");
            }
    
            // wrap the private key for storage in the cloud
            console.log("wrapping the private key");
            wrappedPrivateKey = await crypto.subtle.wrapKey(
                "jwk", keyPair.privateKey, wrappingKey, "AES-KW"
            );
            console.log("wrapping complete");
        }

        // upload the key to DynamoDB
        const dynamoObject: WrappedMasterKeyPair = {
            user: this.identityId,
            id: "keypair",
            privateKey: new Uint8Array(wrappedPrivateKey),
            publicKey: new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey))
        }
        const putCommand = new PutItemCommand({
            TableName: cloudConfig.tableName,
            Item: marshall(dynamoObject)
        });
        await this.dynamoClient.send(putCommand);
    }

    public static async getMasterKeyPair(masterKey: CryptoKey | string): Promise<MasterKeyPair> {
        await this.initialize();

        // Derive a key if necessary
        let wrappingKey: CryptoKey;
        if (typeof masterKey === "string") {
            wrappingKey = await CryptoUtils.passcodeToKey(masterKey, this.identityId);
        } else {
            wrappingKey = masterKey;
        }

        // Fetch the key pair from DynamoDB
        const getCommand = new GetItemCommand({
            TableName: cloudConfig.tableName,
            ExpressionAttributeNames: {
                "#user": "user"
            },
            Key: {
                "user": { S: this.identityId },
                "id": { S: "keypair" }
            },
            ProjectionExpression: "#user, publicKey, privateKey"
        });
        const response = await this.dynamoClient.send(getCommand);
        const keyPair = unmarshall(response.Item) as WrappedMasterKeyPair;

        // Import the keys and return
        return {
            publicKey: await crypto.subtle.importKey("spki", keyPair.publicKey, CryptoUtils.keyPairParams, true, [ "wrapKey" ]),
            privateKey: await crypto.subtle.unwrapKey("jwk", keyPair.privateKey, wrappingKey, "AES-KW", CryptoUtils.keyPairParams, true, [ "unwrapKey" ]),
            wrappedPrivateKey: keyPair.privateKey
        }
    }

    /**
     * Get a user's public key
     * @param user The identity ID of the user who's public key you are fetching
     */
    public static async getPublicKey(user: string): Promise<CryptoKey> {
        await this.initialize();

        // Fetch the key pair from DynamoDB
        const getCommand = new GetItemCommand({
            TableName: cloudConfig.tableName,
            Key: {
                "user": { S: user },
                "id": { S: "keypair" }
            },
            ProjectionExpression: `user, id, publicKey`
        });
        const response = await this.dynamoClient.send(getCommand);
        const keyPair = unmarshall(response.Item) as WrappedMasterKeyPair;

        return crypto.subtle.importKey("spki", keyPair.publicKey, CryptoUtils.keyPairParams, false, [ "wrapKey" ]);
    }
}