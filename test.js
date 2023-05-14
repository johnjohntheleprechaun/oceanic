import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

async function test() {
    const credentials = fromCognitoIdentityPool({
        identityPoolId: "us-west-2:fef09b59-5eb4-4b2d-b5ac-e0fee5dca5b9",
        logins: {
            "cognito-idp.us-west-2.amazonaws.com/us-west-2_H6yuRNbli": window.localStorage.getItem("access_token")
        },
        clientConfig: { region: "us-west-2" }
    });

    const entryID = "aef82f76a6e643fb680ba0152c38d9cc";
    const client = new DynamoDBClient({ 
        region: "us-west-2",
        credentials: credentials
    });
    console.log(await client.config.credentials());

    const params = {
        TableName: "journal-messages",
        KeyConditionExpression: "entryID = :pk",
        ExpressionAttributeValues: {
            ":pk": { S: entryID }
        }
    };
    const command = new QueryCommand(params);
    console.log("sending command");
    const data = await client.send(command);
    console.log(data);
}

test();