import { CognitoIdentityProviderClient, UpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { CloudConnection as CloudConnection } from "./utils/aws";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Database } from "./utils/storage";

declare const cloudConfig: any;

async function test() {
    const database = await Database.open("journal", 3, null);
    database.addObject({
        "id": crypto.randomUUID(),
        "created": 10,
        "asdfasdf": "asdfnlaskjfnlekjanclkjnksjndclkjehlfaidshfkjahdsf"
    }, "entries");

    for await (const item of database.listItems("entries", "created")) {
        console.log(item);
    }
}

export {test}