import jwtDecode from "jwt-decode";
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
        if ([ "full", "minimal" ].includes(settings.securitySettings.local.deviceTrust)) {
            await this.loadDatabase();
            const tokenObject = await this.database.getObject("tokens", "secrets");
            this.tokens = Tokens.import(tokenObject);
        }
        else if (settings.securitySettings.local.deviceTrust === "none") {
            this.tokens = Tokens.fromSessionStorage();
        }
        return this.tokens;
    }

    public static async storeTokens(accessToken: string, idToken: string, refreshToken: string) {
        const settings = await SettingsManager.getSettings();
        this.tokens = new Tokens(accessToken, idToken, refreshToken);

        if ([ "minimal", "full" ].includes(settings.securitySettings.local.deviceTrust)) {
            await this.loadDatabase();
            this.database.putObject(this.tokens.export(), "secrets");
        }
        else if (settings.securitySettings.local.deviceTrust === "none") {
            window.sessionStorage.setItem("access_token", accessToken);
            window.sessionStorage.setItem("id_token", idToken);
            window.sessionStorage.setItem("refresh_token", refreshToken);
        }
    }

    public static async getMasterKeyPair(): Promise<MasterKeyPair> {
        if (this.keyPair) {
            return this.keyPair;
        }

        let importedKeyPair: any = {};

        const privateKeyData = window.sessionStorage.getItem("private_key");
        const publicKeyData = window.sessionStorage.getItem("public_key");
        
        // Load as much as we can from session storage
        if (privateKeyData) {
            importedKeyPair.privateKey = await crypto.subtle.importKey("pkcs8", decode(privateKeyData), keyPairParams, true, [ "unwrapKey" ]);
        }
        if (publicKeyData) {
            importedKeyPair.publicKey = await crypto.subtle.importKey("spki", decode(publicKeyData), keyPairParams, true, [ "wrapKey" ]);
        }

        // If we've got a full key pair, return it
        if (importedKeyPair.privateKey && importedKeyPair.publicKey) {
            return importedKeyPair;
        }
        
        // attempt to load from indexedDB
        await this.loadDatabase();
        let idbKeyPair = await this.database.getObject("keypair", "secrets") as MasterKeyPair;

        // if there's no key in IDB, try to fetch one from the cloud
        if (!idbKeyPair) {
            const password = await this.getUserPassword();
            return await CloudConnection.getMasterKeyPair(password);
        }
        // if there's an unwrapped key, set it (but default to using a key from session storage if one exists)
        if (idbKeyPair.privateKey && !importedKeyPair.privateKey) {
            importedKeyPair.privateKey = idbKeyPair.privateKey;
        }
        if (idbKeyPair.publicKey && !importedKeyPair.publicKey) {
            importedKeyPair.publicKey = idbKeyPair.publicKey;
        }
        // unwrap the wrapped private key if there is one (and a private key hasn't already been found)
        if (idbKeyPair.wrappedPrivateKey && !importedKeyPair.privateKey) {
            // Should store user data like identity IDs with a class instead of this BS
            const passcode = await this.getUserPassword();
            const tokens = await this.getTokens();
            const salt = (jwtDecode(await tokens.getIdToken()) as any)["custom:identityId"];
            const masterKey = await passcodeToKey(passcode, salt);
            importedKeyPair.privateKey = await crypto.subtle.unwrapKey("jwk", idbKeyPair.wrappedPrivateKey, masterKey, "AES-KW", keyPairParams, true, [ "unwrapKey" ]);
        }

        // if you still don't have a full key pair, try to fetch from the cloud
        if (!importedKeyPair.privateKey || !importedKeyPair.publicKey) {
            const password = await this.getUserPassword();
            return await CloudConnection.getMasterKeyPair(password);
        }

        return importedKeyPair;

        // TODO add logic for private key importing or something
    }

    public static async storeMasterKeyPair(keyPair: MasterKeyPair) {
        const settings = await SettingsManager.getSettings();
        switch (settings.securitySettings.local.deviceTrust) {
            case "none":
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

            case "minimal":
                await this.loadDatabase();
                if (!keyPair.wrappedPrivateKey) {
                    throw new Error("No wrapped key was provided");
                }

                const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
                window.sessionStorage.setItem("private_key", encode(privateKey));
                await this.database.putObject(
                    {
                        id: "keypair",
                        publicKey: keyPair.publicKey,
                        wrappedPrivateKey: keyPair.wrappedPrivateKey
                    }, "secrets"
                );
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