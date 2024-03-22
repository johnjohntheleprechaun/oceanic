import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CognitoIdentityCredentialProvider, fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import jwtDecode from "jwt-decode";
import { DocumentInfo } from "./cloud-types";

declare const cloudConfig: CloudConfig;

export interface Tokens {
    accessToken: string;
    idToken: string;
    refreshToken: string;
}

export class AWSConnection {
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
        return new AWSConnection(
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
     * Fetch an S3 object
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
        if (id.startsWith("document:")) {
            id = id.slice(9)
        }
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

    public async createDocument(type: string, title?: string): Promise<DocumentInfo> {
        const documentKey = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true, [ "encrypt", "decrypt" ]
        ) as CryptoKey;
        console.log(documentKey);
        // fetch the most recent public key, and wrap the document key
        const publicKey = await this.getLatestPublicKey(this.identityId);
        const wrappedKey = await crypto.subtle.wrapKey("jwk", documentKey, publicKey.key, { name: "RSA-OAEP" }) as ArrayBuffer;
        const documentInfo: DocumentInfo = {
            user: this.identityId,
            dataType: `document:${crypto.randomUUID()}`,
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
                    wrappedKey: new Uint8Array(wrappedKey)
                }
            ],
            authorizedUsers: []
        };
        //console.log(documentInfo);
        const marshalled = marshall(documentInfo);
        const putCommand = new PutItemCommand({
            TableName: cloudConfig.tableName,
            Item: marshalled
        });
        const resp = await this.dynamoClient.send(putCommand);
        console.log(resp);
        return documentInfo;
    }

    public async getLatestPublicKey(user: string) {
        console.log("generating key");
        const key = await crypto.subtle.generateKey(
            {
              name: "RSA-OAEP",
              modulusLength: 4096,
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt", "wrapKey"],
        );
        console.log(key);
        return {
            key: key.publicKey,
            version: ""
        }
    }
}