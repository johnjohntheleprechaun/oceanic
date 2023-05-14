import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

async function test() {
    const credentials = fromCognitoIdentityPool({
        identityPoolId: "us-west-2:fef09b59-5eb4-4b2d-b5ac-e0fee5dca5b9",
        logins: {
            "cognito-idp.us-west-2.amazonaws.com/us-west-2_H6yuRNbli": "eyJraWQiOiJJYnRyZnVnQ09aRHc1K3NVeU92S1Nacng4Q2dNb1wvZ01EUlZPSm1XWFY3az0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI0NDM0NzJjOS00ZTMwLTQ0YzAtYjljZS04YWMxOGM0OTYzMmQiLCJjb2duaXRvOmdyb3VwcyI6WyJvd25lciJdLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAudXMtd2VzdC0yLmFtYXpvbmF3cy5jb21cL3VzLXdlc3QtMl9INnl1Uk5ibGkiLCJ2ZXJzaW9uIjoyLCJjbGllbnRfaWQiOiIyamk2YmpvcW00cDM3czFyODd0MTA5OW4wYSIsIm9yaWdpbl9qdGkiOiI1MjM2MGE2NC0xOTM3LTRhZjctYmVmNy0yM2ZjMzkyNTI0MWEiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6InBob25lIG9wZW5pZCBlbWFpbCIsImF1dGhfdGltZSI6MTY4MzI0NTcxMSwiZXhwIjoxNjgzMjQ5MzExLCJpYXQiOjE2ODMyNDU3MTEsImp0aSI6IjgzZDQ1NTEzLTc4MTMtNDkwMS05MmUxLTc0OTJlMmFkOTZiNCIsInVzZXJuYW1lIjoiSm9obm55X1RodW5kZXIifQ.MTUbmGLPLb5m22JsdH8re1q86jlLb3r2O9mKozObmQ2Yf2PLnr66-HUgX4OoXm2kX-n601TAgsAcTP5H4zX3xXLOoIcARwp-FEq4ptcZj8r6IjTrywBj35UCJ-pzE4fItyyIiImPNF7GFLAM_6zn8_sYNW-haWiRz_Pne9GOWOx-L152wVRzToxBe9eGt44IHrDio8fAcFTWPPgDiCCaqtShmilYugAuSHx_QfHR22VYnL0zEup5sIdcsNugz9Q-6j9LDuNn57FoyyYVwyq4BZBWhUL8tjU8qcqKd956nwV1aVWhcFLs8nKjsuIl-eqj6r_MoqVhWDGlzwN1gpeDZA"
        }
    });

    console.log(credentials);

    const entryID = "aef82f76a6e643fb680ba0152c38d9cc";
    const client = new DynamoDBClient({ 
        region: "us-west-2",
        credentials: credentials
    });
    console.log(await client.config.region());

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
    //console.log(data);
}

test();