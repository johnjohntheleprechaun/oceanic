import { CognitoIdentityProviderClient, UpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { CloudConnection as CloudConnection } from "./utils/aws";
import { marshall } from "@aws-sdk/util-dynamodb";

declare const cloudConfig: any;

async function test() {
    const testPassword = "thisisatestpassword";
    const cloudConnection = await CloudConnection.fromLocalStorage();
    const document = await cloudConnection.createDocument("messages-journal");
    console.log(document);
}

export {test}