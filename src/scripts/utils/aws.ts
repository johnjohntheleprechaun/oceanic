import { GetUserCommandOutput } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { CognitoIdentityCredentialProvider, fromCognitoIdentity, fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { AwsCredentialIdentity, Provider } from "@smithy/types";

declare const cloudConfig: any;

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
    public userData: GetUserCommandOutput;
    public identityId: string;

    /**
     * Automatically use localStorage to create an AWSConnection object
     * @returns A new AWSConnection
     */
    public static fromLocalStorage() {
        return new AWSConnection(
            window.localStorage.getItem("access_token"),
            window.localStorage.getItem("id_token"),
            window.localStorage.getItem("refresh_token"),
            JSON.parse(window.localStorage.getItem("user_data"))
        );
    }
    constructor (accessToken: string, idToken: string, refreshToken: string, userData: GetUserCommandOutput) {
        this.accessToken = accessToken;
        this.idToken = idToken;
        this.refreshToken = refreshToken;
        this.userData = userData;
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
}