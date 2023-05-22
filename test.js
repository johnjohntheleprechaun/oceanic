import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { checkToken, refresh_tokens } from "./token";
import { dynamoQuery, loadCredentials, logCredentials, utilsInit } from "./aws";

async function test() {
    utilsInit();

    const entryID = "aef82f76a6e643fb680ba0152c38d9cc";
    const params = {
        TableName: "journal-messages",
        KeyConditionExpression: "entryID = :pk",
        ExpressionAttributeValues: {
            ":pk": { S: entryID }
        }
    };
    console.log(await dynamoQuery(params));
    setTimeout(async () => {
        console.log(await dynamoQuery(params));
    }, 3660000);
}

test();