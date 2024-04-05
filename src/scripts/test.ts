import { CloudConnection } from "./utils/aws";
import { CloudConfig } from "./utils/cloud-config";
import { SecretManager } from "./utils/crypto";
import { SettingsManager } from "./utils/settings";
import { Tokens } from "./utils/tokens";
const defaults = require("json-schema-defaults");

declare const cloudConfig: CloudConfig;

async function test() {
    //console.log("putting");
    //await CloudConnection.createNewKeyPair(await SecretManager.getUserPassword());

    console.log("getting");
    console.log(await SecretManager.getMasterKeyPair());
}

export {test}