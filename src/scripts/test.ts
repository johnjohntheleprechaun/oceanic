import { CloudConnection } from "./utils/aws";
import { CloudConfig } from "./utils/cloud-config";
import { CryptoUtils } from "./utils/crypto";
import { SecretManager } from "./utils/secrets";
import { SettingsManager } from "./utils/settings";
import { Database, userDatabaseUpgrade, userDatabaseVersion } from "./utils/storage";
const defaults = require("json-schema-defaults");

declare const cloudConfig: CloudConfig;

async function test() {
    const test = "Hello World!";
    const encoded = CryptoUtils.encode(test);
    const decoded = CryptoUtils.decode(encoded);
    console.log(encoded);
    console.log(decoded);
}

export {test}