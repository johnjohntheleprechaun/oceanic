import { dynamoQuery, utilsInit } from "./aws";

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
    setInterval(async () => {
        console.log(await dynamoQuery(params));
    }, 3660000);
}

test();