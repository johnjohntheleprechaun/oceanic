import { CognitoIdentityProviderClient, UpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { CloudConnection as CloudConnection } from "./utils/aws";
import { marshall } from "@aws-sdk/util-dynamodb";

declare const cloudConfig: any;

async function test() {
    const cloudConnection = CloudConnection.fromLocalStorage();
    const doc = await cloudConnection.createDocument("messages-journal");
    console.log(doc);
    const fetchedDoc = await cloudConnection.getDocumentInfo(doc.dataType);
    console.log(fetchedDoc);
}

export {test}