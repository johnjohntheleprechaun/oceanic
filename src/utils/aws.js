import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { checkToken, refresh_tokens } from "./token";
import { DynamoDBClient, PutItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { NotAuthorizedException } from "@aws-sdk/client-cognito-identity";
import { S3Client } from "@aws-sdk/client-s3";

let credentials;
let dynamoClient;
let s3Client;

export async function utilsInit() {
    await loadCredentials();

    // Initialize clients
    dynamoClient = new DynamoDBClient({ 
        region: "us-west-2",
        credentials: credentials
    });
    s3Client = new S3Client({
        region: "us-west-2",
        credentials: credentials
    })

    // Bind send functions
    dynamoClient.send = dynamoClient.send.bind(dynamoClient);
    s3Client.send = s3Client.send.bind(s3Client);
}

export async function loadCredentials() {
    let token = window.localStorage.getItem("id_token");
    if (!checkToken(token)) {
        await refresh_tokens();
        token = window.localStorage.getItem("id_token");
    }
    credentials = fromCognitoIdentityPool({
        identityPoolId: "us-west-2:cc44443b-6758-4eaa-a278-d964bb899ea7",
        logins: {
            "cognito-idp.us-west-2.amazonaws.com/us-west-2_Kn1Q4gwus": token
        },
        clientConfig: { region: "us-west-2" }
    });
}

export async function dynamoQuery(params) {
    const command = new QueryCommand(params);
    return (await attemptCall(dynamoClient.send, command)).Items;
}
export async function dynamoScan(params) {
    const command = new ScanCommand(params);
    return (await attemptCall(dynamoClient.send, command)).Items;
}
export async function dynamoPutItem(params) {
    const command = new PutItemCommand(params);
    return await attemptCall(dynamoClient.send, command);
}

async function attemptCall(sdkFunc, params, attempted=false) {
    try {
        return await sdkFunc(params);
    }
    catch (error) {
        if (error instanceof NotAuthorizedException && !attempted) {
            await refresh_tokens();
            return await attemptCall(sdkFunc, params, true)
        } else {
            throw error;
        }
    }
}