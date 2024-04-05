import { CognitoIdentityProviderClient, UpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { CloudConnection as CloudConnection } from "./utils/aws";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Database } from "./utils/storage";
import { UserSettings, userSettingsSchema, userSettingsValidator } from "./utils/settings-schemas";
import { SettingsManager } from "./utils/settings";
import { SecretManager } from "./utils/crypto";
const defaults = require("json-schema-defaults");

declare const cloudConfig: any;

async function test() {
    console.log( window.sessionStorage.getItem("poop") );
    console.log(await SecretManager.getUserPassword());
}

export {test}