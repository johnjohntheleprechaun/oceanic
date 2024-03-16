import { GetUserCommandOutput } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { marshall } from "@aws-sdk/util-dynamodb";

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
    private credentials: any;
    private s3Client: S3Client;
    private dynamoClient: DynamoDBClient;
    public userData: GetUserCommandOutput;

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
        data.user = this.userData.UserAttributes.find(val => val.Name === "sub");
        console.log(data.user);
        const putCommand = new PutItemCommand({
            Item: marshall(data),
            TableName: cloudConfig.tableName
        });
        const resp = await this.dynamoClient.send(putCommand);
        console.log(resp);
    }
}