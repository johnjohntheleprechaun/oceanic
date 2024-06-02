import { CloudConnection } from "./utils/aws";
import { CloudConfig } from "./utils/cloud-config";
import { MasterKeyPair } from "./utils/cloud-types";
import { CryptoUtils } from "./utils/crypto";
import { SecretManager } from "./utils/secrets";
import { SettingsManager } from "./utils/settings";

declare const cloudConfig: CloudConfig;

async function test() {
    const settings = await SettingsManager.getSettings();
    console.log(settings);
    console.log(SecretManager.getTokens());
}

export {test}