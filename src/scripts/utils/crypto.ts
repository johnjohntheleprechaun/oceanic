import { CloudConnection } from "./aws";
import { MasterKeyPair } from "./cloud-types";
import { formSubmit } from "./forms";
import { SettingsManager } from "./settings";
import { Database, userDatabaseUpgrade, userDatabaseVersion } from "./storage";
import { Tokens } from "./tokens";
const passwordPromptHTML: string = require("../../templates/password-prompt.html").default;

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
        false, [ "wrapKey", "unwrapKey" ]
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

export function encode(data: ArrayBuffer) {
    let binaryString = "";
    const bytes = new Uint8Array(data);

    for (let i = 0; i < data.byteLength; i++) {
        binaryString += String.fromCharCode(bytes.at(i));
    }
    return btoa(binaryString);
}

export class SecretManager {
    private static keyPair: MasterKeyPair;
    private static database: Database;
    private static tokens: Tokens;

    private static async loadDatabase() {
        if (!this.database) {
            this.database = await Database.open("user", userDatabaseVersion, userDatabaseUpgrade);
        }
    }

    public static async getTokens(): Promise<Tokens> {
        if (this.tokens) {
            return this.tokens;
        }
        const settings = await SettingsManager.getSettings();
        //console.log(settings.securitySettings.local.deviceTrust)
        if (settings.securitySettings.local.deviceTrust === "full") {
            this.tokens = Tokens.fromLocalStorage();
        }
        else if (settings.securitySettings.local.deviceTrust === "minimal") {
            this.tokens = Tokens.fromSessionStorage();
        }
        return this.tokens;
    }

    public static async setTokens(accessToken: string, idToken: string, refreshToken: string) {
        const settings = await SettingsManager.getSettings();
        if (settings.securitySettings.local.deviceTrust === "full") {
            window.localStorage.setItem("access_token", accessToken);
            window.localStorage.setItem("id_token", idToken);
            window.localStorage.setItem("refresh_token", refreshToken);
        }
        else if (settings.securitySettings.local.deviceTrust === "minimal") {
            window.sessionStorage.setItem("access_token", accessToken);
            window.sessionStorage.setItem("id_token", idToken);
            window.sessionStorage.setItem("refresh_token", refreshToken);
        }

        this.tokens = new Tokens(accessToken, idToken, refreshToken);
    }

    public static async getMasterKeyPair(): Promise<MasterKeyPair> {
        if (this.keyPair) {
            return this.keyPair;
        }
        const settings = await SettingsManager.getSettings();

        // Check the location
        let foundKey = false;
        switch (settings.securitySettings.local.deviceTrust) {
            case "minimal":
                // fetch from session storage
                const privateKeyData = window.sessionStorage.getItem("private_key");
                const publicKeyData = window.sessionStorage.getItem("public_key");
                if (!privateKeyData || !publicKeyData) {
                    // key wasn't in storage, need to reprompt the user
                    break;
                }
                // decode both keys
                const privateKeyBuffer = decode(privateKeyData);
                const publicKeyBuffer = decode(publicKeyData);

                this.keyPair = {
                    "privateKey": await crypto.subtle.importKey("pkcs8", privateKeyBuffer, keyPairParams, false, [ "unwrapKey" ]),
                    "publicKey": await crypto.subtle.importKey("spki", publicKeyBuffer, keyPairParams, true, [ "wrapKey" ])
                };
                foundKey = true;
                break;


            case "full":
                // fetch the cryptoKey object from indexedDB
                await this.loadDatabase();
                const keyPair = await this.database.getObject("keypair", "secrets");
                if (!keyPair) {
                    // key wasn't in storage
                    break;
                }
                this.keyPair = keyPair;
                foundKey = true;
                break;
        }

        if (!foundKey) {
            const password = await this.getUserPassword();
            const keyPair = await CloudConnection.getMasterKeyPair(password);
            await this.storeKeyPair(keyPair);
            this.keyPair = keyPair
        }

        return this.keyPair
    }

    public static async storeKeyPair(keyPair: MasterKeyPair) {
        const settings = await SettingsManager.getSettings();
        switch (settings.securitySettings.local.deviceTrust) {
            case "minimal":
                // export keys
                const privateKeyData = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
                const publicKeyData = await crypto.subtle.exportKey("spki", keyPair.publicKey);

                // encode keys
                const privateKeyEncoded = encode(privateKeyData);
                const publicKeyEncoded = encode(publicKeyData);

                // store keys
                window.sessionStorage.setItem("private_key", privateKeyEncoded);
                window.sessionStorage.setItem("public_key", publicKeyEncoded);
                break;
            
            case "full":
                await this.loadDatabase();
                if (!keyPair.id) {
                    keyPair.id = "keypair";
                }
                await this.database.putObject(keyPair, "secrets");
                break;
        }
    }

    static async getUserPassword(): Promise<string> {
        console.log(passwordPromptHTML);
        const prompt = document.createElement("div");
        document.body.appendChild(prompt);
        prompt.outerHTML = passwordPromptHTML;

        const form = document.getElementById("password-form") as HTMLFormElement;
        const data = await formSubmit(form);
        document.getElementById("password-form-wrapper").remove();
        return data.get("password").toString();
    }
}