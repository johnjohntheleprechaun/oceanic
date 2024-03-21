import { CognitoIdentityProviderClient, UpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { AWSConnection as CloudConnection } from "./utils/aws";

declare const cloudConfig: any;

async function test() {
    const cloudConnection = CloudConnection.fromLocalStorage();
    const doc = await cloudConnection.getDocumentInfo("test");
    console.log(doc);
}

export {test}