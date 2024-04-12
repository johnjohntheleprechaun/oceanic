import { CloudConnection } from "./utils/aws";
import { CloudConfig } from "./utils/cloud-config";
import { CryptoUtils } from "./utils/crypto";
import { SecretManager } from "./utils/secrets";
import { SettingsManager } from "./utils/settings";
import { Database, userDatabaseUpgrade, userDatabaseVersion } from "./utils/storage";
const defaults = require("json-schema-defaults");

declare const cloudConfig: CloudConfig;

async function test() {
    const key = await CryptoUtils.generateSymmetricKey();
    console.log(key);
    
    const initial = new Uint8Array(1073741824)
    console.log(initial);
    
    const encrypted = await CryptoUtils.encrypt(initial, key);
    console.log(encrypted);

    const decrypted = await CryptoUtils.decrypt(encrypted, key);
    console.log(decrypted);
}

export {test}