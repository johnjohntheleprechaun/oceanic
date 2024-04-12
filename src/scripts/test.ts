import { CloudConnection } from "./utils/aws";
import { CloudConfig } from "./utils/cloud-config";
import { CryptoUtils } from "./utils/crypto";
import { SecretManager } from "./utils/secrets";
import { SettingsManager } from "./utils/settings";
import { Database, userDatabaseUpgrade, userDatabaseVersion } from "./utils/storage";
const defaults = require("json-schema-defaults");

declare const cloudConfig: CloudConfig;

async function test() {
    const keyPair = await CryptoUtils.generateKeyPair();
    console.log(keyPair);
}

export {test}