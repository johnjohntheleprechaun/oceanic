import { SettingsManager } from "./settings";

export const keyPairParams = {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
};

export async function passcodeToKey(passcode: string, salt: ArrayBuffer | string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    if (typeof salt === "string") {
        salt = encoder.encode(salt);
    }
    const importedPassKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(passcode),
        "PBKDF2",
        false,
        [ "deriveBits", "deriveKey" ]
    );
    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt, // need a way to manage salts. maybe just the identity ID?
            iterations: 600000
        },
        importedPassKey,
        {
            name: "AES-KW",
            length: 256
        },
        false, [ "wrapKey" ]
    )
}

/**
 * Turn a base64 string into an ArrayBuffer
 * @param data The base64 encoded string
 */
export function decode(data: string) {
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export class SecretManager {
    private static privateKey: CryptoKey;
    public static async getPrivateKey() {
        if (this.privateKey) {
            return this.privateKey;
        }
        const settings = await SettingsManager.getSettings();

        // Check the location
        switch (settings.securitySettings.local.deviceTrustLevel) {
            case "none":
                // prompt the user for their password
                break;
            case "minimal":
                // fetch from session storage
                const keyData = window.sessionStorage.getItem("private_key");
                const keyBuffer = decode(keyData);
                this.privateKey = await crypto.subtle.importKey("pkcs8", keyBuffer, keyPairParams, false, [ "unwrapKey" ]);
                break;
            case "secure":
                // fetch from indexedDB
                break;
        }
        return this.privateKey
    }
}