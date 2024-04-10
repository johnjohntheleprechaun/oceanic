import { CloudConnection } from "./utils/aws";
import { CloudConfig } from "./utils/cloud-config";
import { SecretManager } from "./utils/crypto";
import { SettingsManager } from "./utils/settings";
import { Database, userDatabaseUpgrade, userDatabaseVersion } from "./utils/storage";
import { ExportedTokens, Tokens } from "./utils/tokens";
const defaults = require("json-schema-defaults");

declare const cloudConfig: CloudConfig;

async function test() {
    const keyPair = await SecretManager.getMasterKeyPair();
    console.log(keyPair);
}

export {test}