import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { checkToken, refresh_tokens } from "./token";
import { DynamoDBClient, PutItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { NotAuthorizedException } from "@aws-sdk/client-cognito-identity";

let credentials;
let dynamoClient;

export function utilsInit() {
    loadCredentials();
    dynamoClient = new DynamoDBClient({ 
        region: "us-west-2",
        credentials: credentials
    });
    dynamoClient.send = dynamoClient.send.bind(dynamoClient);
}

export function loadCredentials() {
    let token = window.localStorage.getItem("id_token");
    if (!checkToken(token)) {
        refresh_tokens();
        token = window.localStorage.getItem("id_token");
    }
    credentials = fromCognitoIdentityPool({
        identityPoolId: "us-west-2:fef09b59-5eb4-4b2d-b5ac-e0fee5dca5b9",
        logins: {
            "cognito-idp.us-west-2.amazonaws.com/us-west-2_H6yuRNbli": token
        },
        clientConfig: { region: "us-west-2" }
    });
}

export async function dynamoQuery(params) {
    const command = new QueryCommand(params);
    return await attemptCall(dynamoClient.send, command).Items;
}
export async function dynamoScan(params) {
    const command = new ScanCommand(params);
    return (await attemptCall(dynamoClient.send, command)).Items;
}
export async function dynamoPutItem(params) {
    const command = new PutItemCommand(params);
    return (await attemptCall(dynamoClient.send, command)).Items;
}

async function attemptCall(sdkFunc, params, attempted=false) {
    try {
        return await sdkFunc(params);
    }
    catch (error) {
        if (error instanceof NotAuthorizedException && !attempted) {
            refresh_tokens();
            return await attemptCall(sdkFunc, params, true)
        } else {
            throw error;
        }
    }
}