import { GetUserCommandOutput } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CognitoIdentityCredentialProvider, fromCognitoIdentity, fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { AwsCredentialIdentity, Provider } from "@smithy/types";
import jwtDecode from "jwt-decode";

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

    public async putDynamoItem(key: string, data: any) {
        const userID = await this.credentials().then(val => val.identityId);
        console.log(userID);
        const putCommand = new PutItemCommand({
            Item: {
                "user": { "S": userID },
                "dataType": { "S": "TEST" },
                "otherShit": { "S": "balls" }
            },
            TableName: cloudConfig.tableName
        });
        const resp = await this.dynamoClient.send(putCommand);
        console.log(resp);
    }

    public async putS3Object() {
        const userID = await this.credentials().then(val => val.identityId);
        const putCommand = new PutObjectCommand({
            Bucket: cloudConfig.bucketName,
            Key: `${userID}/test`,
            Body: "hello world"
        });
        const resp = await this.s3Client.send(putCommand);
        console.log(resp);
    }
}