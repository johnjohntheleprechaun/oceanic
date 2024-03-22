import { CognitoIdentityProviderClient, UpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { AWSConnection as CloudConnection } from "./utils/aws";
import { marshall } from "@aws-sdk/util-dynamodb";

declare const cloudConfig: any;

async function test() {
    const cloudConnection = CloudConnection.fromLocalStorage();
    const doc = await cloudConnection.createDocument("messages-journal");
}

export {test}