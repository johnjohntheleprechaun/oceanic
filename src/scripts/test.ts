import { CloudConnection } from "./utils/aws";
import { CloudConfig } from "./utils/cloud-config";
import { MasterKeyPair } from "./utils/cloud-types";
import { CryptoUtils } from "./utils/crypto";
import { SettingsManager } from "./utils/settings";

declare const cloudConfig: CloudConfig;

async function test() {
    const settings = await SettingsManager.getSettings();
    console.log(settings);
}

export {test}