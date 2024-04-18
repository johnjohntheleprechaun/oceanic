import { CloudConnection } from "./utils/aws";
import { CloudConfig } from "./utils/cloud-config";
import { MasterKeyPair } from "./utils/cloud-types";
import { CryptoUtils } from "./utils/crypto";
import { SettingsManager } from "./utils/settings";

declare const cloudConfig: CloudConfig;

async function test() {
    await SettingsManager.updateSetting("generalSettings.onlineMode", "online");
    const settings = await SettingsManager.getSettings();
    console.log(settings);
    console.log(await CloudConnection.checkOnline());
}

export {test}