import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CognitoIdentityCredentialProvider, fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import jwtDecode from "jwt-decode";
import { DocumentInfo, KeyPair } from "./cloud-types";
import { passcodeToKey } from "./crypto";

declare const cloudConfig: CloudConfig;

export interface Tokens {
    accessToken: string;
    idToken: string;
    refreshToken: string;
}

const keypairParams = {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
};

export class CloudConnection {
    private accessToken: string;
    private idToken: string;
    private refreshToken: string;
    private credentials: CognitoIdentityCredentialProvider;
    private s3Client: S3Client;
    private dynamoClient: DynamoDBClient;
    public identityId: string;

    /**
     * Automatically use localStorage to create an AWSConnection object
     * @returns A new AWSConnection
     */
    public static fromLocalStorage() {
        return new CloudConnection(
            window.localStorage.getItem("access_token"),
            window.localStorage.getItem("id_token"),
            window.localStorage.getItem("refresh_token")
        );
    }
    constructor (accessToken: string, idToken: string, refreshToken: string) {
        this.accessToken = accessToken;
        this.idToken = idToken;
        this.refreshToken = refreshToken;
        this.identityId = (jwtDecode(idToken) as any)["custom:identityId"];
        this.credentials = fromCognitoIdentityPool({
            identityPoolId: cloudConfig.identityPool,
            logins: {
                [cloudConfig.userPool]: this.idToken
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
        const decoder = new TextDecoder();
        const documentData = await this.getObject(id);
        return decoder.decode(documentData);
    }

    /**
     * Fetch an S3 object's binary data. You should probably be using getDocumentContent
     * @param key The object key
     * @returns The object's content
     */
    public async getObject(key: string) {
        const getCommand = new GetObjectCommand({
            Bucket: cloudConfig.bucketName,
            Key: `${this.identityId}/${key}`
        });
        const document = await this.s3Client.send(getCommand);
        return document.Body.transformToByteArray();
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
                dataType: {
                    "S": `document:${id}`
                }
            }
        });
        const document = await this.dynamoClient.send(getCommand);
        return unmarshall(document.Item) as DocumentInfo;
    }

    /**
     * Create a new document and upload it to DynamoDB
     * @param type The document's type
     * @param title The document's title. Set as an empty string if none is provided
     * @returns The DocumentInfo object that was sent to DynamoDB
     */
    public async createDocument(type: string, title?: string): Promise<DocumentInfo> {
        // Create a new document key
        const documentKey = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true, [ "encrypt", "decrypt" ]
        ) as CryptoKey;

        // fetch the most recent public key
        const publicKey = await this.getLatestPublicKey(this.identityId);

        // wrap the document key
        const wrappedKey = await crypto.subtle.wrapKey("jwk", documentKey, publicKey.key, { name: "RSA-OAEP" }) as ArrayBuffer;

        // set the document's properties
        const documentInfo: DocumentInfo = {
            user: this.identityId,
            dataType: `document:${crypto.randomUUID()}`, // new UUID
            title: title || "",
            type: type,
            created: Date.now(),
            updated: Date.now(),
            attachments: [],
            documentKeys: [
                {
                    user: this.identityId,
                    publicKeyVersion: publicKey.version,
                    documentKeyVersion: Date.now().toString(),
                    wrappedKey: new Uint8Array(wrappedKey) // Convert to Uint8Array so that the dynamo client will automatically format it as b64 before upload
                }
            ],
            authorizedUsers: [] // the owner isn't included here, so just an empty list
        };

        // marshall the document and upload it
        const marshalled = marshall(documentInfo);
        const putCommand = new PutItemCommand({
            TableName: cloudConfig.tableName,
            Item: marshalled
        });
        await this.dynamoClient.send(putCommand);
        
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
        const encoder = new TextEncoder();
        if (typeof wrapper === "string") {
            wrappingKey = await passcodeToKey(wrapper, encoder.encode(this.identityId).buffer);
        } else {
            wrappingKey = wrapper
        }

        // make sure the key can be used for wrapping
        if (!wrappingKey.usages.includes("wrapKey")) {
            throw new Error("Can't use that key for wrapping")
        }

        // generate a new key pair
        const keyPair = await crypto.subtle.generateKey(keypairParams, true, [ "wrapKey", "unwrapKey" ]);
        const keyPairId = Date.now().toString();

        // wrap the private key for storage in the cloud
        const wrappedPrivateKey = await crypto.subtle.wrapKey(
            "jwk", keyPair.privateKey, wrappingKey, "AES-KW"
        )

        // upload the key to DynamoDB
        const dynamoObject: KeyPair = {
            user: this.identityId,
            dataType: `keypair:${keyPairId}`,
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

    /**
     * Get the most recent public key for a user
     * @param user the identity ID of the user who's public key you are fetching
     */
    public async getLatestPublicKey(user?: string) {
        const queryCommand = new QueryCommand({
            TableName: cloudConfig.tableName,
            ProjectionExpression: "publicKey, dataType, #owner", // don't try to get the private key, the request will 
            ExpressionAttributeValues: {
                ":user": { S: user || this.identityId },
                ":type": { S: "keypair:" }
            },
            ExpressionAttributeNames: {
                "#owner": "user" // "user" is a reserved name in dynamo
            },
            KeyConditionExpression: "#owner = :user AND begins_with ( dataType, :type )",
            ScanIndexForward: false, // get the highest, since keypair IDs are just the timestamp of their creation
            Limit: 1 // only get the most recent
        });
        const resp = await this.dynamoClient.send(queryCommand);

        // extract the key object
        const keyPair = unmarshall(resp.Items[0]) as KeyPair;

        // import the key
        const key: CryptoKey = await crypto.subtle.importKey(
            "jwk", keyPair.publicKey,
            keypairParams, false, [ "wrapKey" ]
        );
        
        return {
            version: keyPair.dataType.replace(/^keypair:/, ""),
            key: key
        }
    }
}