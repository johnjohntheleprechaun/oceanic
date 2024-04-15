import { CloudConfig } from "./utils/cloud-config";
import { MasterKeyPair } from "./utils/cloud-types";
import { CryptoUtils } from "./utils/crypto";

declare const cloudConfig: CloudConfig;

async function test() {
    const testTitle = "This is a journal title";
    const encodedTitle = CryptoUtils.encode(testTitle);
    
    const keyPair = await CryptoUtils.generateKeyPair();

    const keys = [];
    const wrappedKeys = [];
    for (let i = 0; i < 200; i++) {
        const key = await CryptoUtils.generateSymmetricKey();
        keys.push(key);
        wrappedKeys.push(await CryptoUtils.wrapDocumentKey(key, keyPair));
    }

    const encryptedTitles: Uint8Array[] = [];
    for (const key of keys) {
        encryptedTitles.push(await CryptoUtils.encrypt(encodedTitle, key));
    }

    const speeds: number[][] = [[], [], [], []];
    for (let i = 0; i < 100; i++) {
        console.log(`iteration ${i}`);
        const speed0 = await normalDecrypt(wrappedKeys.slice(0, 50), encryptedTitles, keyPair);
        speeds[0].push(speed0);
        console.log(speed0);

        const speed1 = await normalDecrypt(wrappedKeys, encryptedTitles, keyPair);
        speeds[1].push(speed1);
        console.log(speed1);

        const speed2 = await fastDecrypt(wrappedKeys.slice(0, 50), encryptedTitles, keyPair);
        speeds[2].push(speed2);
        console.log(speed2);

        const speed3 = await fastDecrypt(wrappedKeys, encryptedTitles, keyPair);
        speeds[3].push(speed3);
        console.log(speed3);
    }
    
    const mean0 = speeds[0].reduce((partial, a) => partial + a, 0) / speeds[0].length;
    const mean1 = speeds[1].reduce((partial, a) => partial + a, 0) / speeds[1].length;
    const mean2 = speeds[2].reduce((partial, a) => partial + a, 0) / speeds[2].length;
    const mean3 = speeds[3].reduce((partial, a) => partial + a, 0) / speeds[3].length;

    console.log(`Normal decrypt speeds: ${mean0} | ${mean1}`);
    console.log(`fast decrypt speeds: ${mean2} | ${mean3}`);
}

async function normalDecrypt(wrappedKeys: Uint8Array[], encryptedTitles: Uint8Array[], keyPair: MasterKeyPair) {
    const decryptionStart = Date.now();
    for (let i = 0; i < wrappedKeys.length; i++) {
        const key = await CryptoUtils.unwrapDocumentKey(wrappedKeys[i], keyPair);
        await CryptoUtils.decrypt(encryptedTitles[i], key);
    }
    return Date.now() - decryptionStart
}

async function fastDecrypt(wrappedKeys: Uint8Array[], encryptedTitles: Uint8Array[], keyPair: MasterKeyPair) {
    const decryptionStart = Date.now();
    const promises = [];
    for (let i = 0; i < wrappedKeys.length; i++) {
        promises.push(
            CryptoUtils.unwrapDocumentKey(wrappedKeys[i], keyPair)
            .then(key => CryptoUtils.decrypt(encryptedTitles[i], key))
        );
    }
    await Promise.all(promises);
    return Date.now() - decryptionStart
}

export {test}