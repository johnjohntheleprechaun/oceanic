import { CognitoIdentityProviderClient, InitiateAuthCommand, InitiateAuthCommandOutput } from "@aws-sdk/client-cognito-identity-provider";
import jwtDecode, { JwtPayload } from "jwt-decode";
import { CloudConfig } from "./cloud-config";
import { CloudConnection } from "./aws";
import { MasterKeyPair } from "./cloud-types";
import { formSubmit } from "./forms";
import { SettingsManager } from "./settings";
import { Database, userDatabaseUpgrade, userDatabaseVersion } from "./storage";
import { CryptoUtils } from "./crypto";

declare const cloudConfig: CloudConfig;
const passwordPromptHTML: string = require("../../templates/password-prompt.html").default;

export interface ExportedTokens {
    id: "tokens";
    accessToken: string;
    idToken: string;
    refreshToken: string;
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

    /**
     * Fetch tokens from session storage or indexed DB (depending on securitySettings.local.deviceTrust)
     * @returns The tokens
     */
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

    /**
     * Store a users token in the location specified by securitySettings.local.deviceTrust
     * @param accessToken
     * @param idToken
     * @param refreshToken
     */
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

    /**
     * Get the user's master key pair (whether from session storage, indexedDB, or the cloud). Also handles any unwrapping, prompting, etc.
     * @returns The master key pair
     */
    public static async getMasterKeyPair(): Promise<MasterKeyPair> {
        if (this.keyPair) {
            return this.keyPair;
        }

        let importedKeyPair: any = {};

        let updateStorage = false;

        const privateKeyData = window.sessionStorage.getItem("private_key");
        const publicKeyData = window.sessionStorage.getItem("public_key");
        
        // Load as much as we can from session storage
        if (privateKeyData) {
            importedKeyPair.privateKey = await crypto.subtle.importKey("pkcs8", CryptoUtils.decode(privateKeyData), CryptoUtils.keyPairParams, true, [ "unwrapKey" ]);
        }
        if (publicKeyData) {
            importedKeyPair.publicKey = await crypto.subtle.importKey("spki", CryptoUtils.decode(publicKeyData), CryptoUtils.keyPairParams, true, [ "wrapKey" ]);
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
            importedKeyPair = await CloudConnection.getMasterKeyPair(password);
            updateStorage = true;
        }
        // if there's an unwrapped key, set it (but default to using a key from session storage if one exists)
        if (!importedKeyPair.privateKey && idbKeyPair.privateKey) {
            importedKeyPair.privateKey = idbKeyPair.privateKey;
        }
        if (!importedKeyPair.publicKey && idbKeyPair.publicKey) {
            importedKeyPair.publicKey = idbKeyPair.publicKey;
        }
        // unwrap the wrapped private key if there is one (and a private key hasn't already been found)
        if (!importedKeyPair.privateKey && idbKeyPair.wrappedPrivateKey) {
            // Should store user data like identity IDs with a class instead of this BS
            const passcode = await this.getUserPassword();
            const tokens = await this.getTokens();
            const salt = (jwtDecode(await tokens.getIdToken()) as any)["custom:identityId"];
            const masterKey = await CryptoUtils.passcodeToKey(passcode, salt);
            importedKeyPair.privateKey = await crypto.subtle.unwrapKey("jwk", idbKeyPair.wrappedPrivateKey, masterKey, "AES-KW", CryptoUtils.keyPairParams, true, [ "unwrapKey" ]);
            importedKeyPair.wrappedPrivateKey = idbKeyPair.wrappedPrivateKey;
            updateStorage = true;
        }

        // if you still don't have a full key pair, try to fetch from the cloud
        if (!importedKeyPair.privateKey || !importedKeyPair.publicKey) {
            const password = await this.getUserPassword();
            importedKeyPair = await CloudConnection.getMasterKeyPair(password);
            updateStorage = true;
        }

        // re-store the keypair (so that, for example, the unwrapped private key will be put back in session storage)
        if (updateStorage) {
            await this.storeMasterKeyPair(importedKeyPair);
        }

        return importedKeyPair;

        // TODO add logic for private key importing or something
    }

    /**
     * Store the master key pair (in the locations defined by the securitySettings.local.deviceTrust)
     * @param keyPair The key pair to store
     */
    public static async storeMasterKeyPair(keyPair: MasterKeyPair) {
        const settings = await SettingsManager.getSettings();
        switch (settings.securitySettings.local.deviceTrust) {
            case "none":
                // export keys
                const privateKeyData = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
                const publicKeyData = await crypto.subtle.exportKey("spki", keyPair.publicKey);

                // encode keys
                const privateKeyEncoded = CryptoUtils.encode(privateKeyData);
                const publicKeyEncoded = CryptoUtils.encode(publicKeyData);

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
                window.sessionStorage.setItem("private_key", CryptoUtils.encode(privateKey));
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

    /**
     * Prompt the user to enter their password and return the result
     * @returns The password provided by the user
     */
    static async getUserPassword(): Promise<string> {
        console.log("Prompting the user for their password");
        const prompt = document.createElement("div");
        document.body.appendChild(prompt);
        prompt.outerHTML = passwordPromptHTML;

        const form = document.getElementById("password-form") as HTMLFormElement;
        const data = await formSubmit(form);
        document.getElementById("password-form-wrapper").remove();
        return data.get("password").toString();
    }
}

export class Tokens {
    cognitoClient: CognitoIdentityProviderClient;
    
    constructor(
        public accessToken: string,
        public idToken: string,
        public refreshToken: string
    ) {
        this.cognitoClient = new CognitoIdentityProviderClient({ region: "us-west-2" });
    }

    /**
     * Export the tokens so that they can be stored in indexedDB
     */
    public export(): ExportedTokens {
        return {
            "id": "tokens",
            "accessToken": this.accessToken,
            "idToken": this.idToken,
            "refreshToken": this.refreshToken
        }
    }

    public static import(tokens: ExportedTokens) {
        return new Tokens(tokens.accessToken, tokens.idToken, tokens.refreshToken);
    }

    /**
     * Refresh the token if necessary, then return it
     * @returns
     */
    public async getAccessToken(): Promise<string> {
        if (Tokens.isExpired(this.accessToken)) {
            // refresh the token
            await this.refresh();
        }
        return this.accessToken;
    }
    /**
     * Refresh the token if necessary, then return it
     * @returns The ID token
     */
    public async getIdToken(): Promise<string> {
        if (Tokens.isExpired(this.idToken)) {
            // refresh the token
            await this.refresh();
        }
        return this.idToken;
    }

    /**
     * Attempt to refresh the tokens stored in the object
     */
    public async refresh() {
        console.log("refreshing");
        const refreshCommand = new InitiateAuthCommand({
            AuthFlow: "REFRESH_TOKEN_AUTH",
            AuthParameters: {
                "REFRESH_TOKEN": this.refreshToken
            },
            ClientId: cloudConfig.clientId
        });

        let response: InitiateAuthCommandOutput;
        try {
            response = await this.cognitoClient.send(refreshCommand);
        } catch {
            throw new ExpiredTokenError("refresh");
        }

        this.accessToken = response.AuthenticationResult.AccessToken;
        this.idToken = response.AuthenticationResult.IdToken;
        this.refreshToken = response.AuthenticationResult.RefreshToken;
        console.log(response.AuthenticationResult);
    }

    /**
     * Fetch tokens from session storage
     * @returns A new token object
     */
    public static fromSessionStorage() {
        const accessToken = window.sessionStorage.getItem("access_token");
        const idToken = window.sessionStorage.getItem("id_token");
        const refreshToken = window.sessionStorage.getItem("refresh_token");

        if ([accessToken, idToken, refreshToken].includes(null)) {
            throw new MissingTokenError("session storage");
        }
        return new Tokens(accessToken, idToken, refreshToken);
    }

    /**
     * Check if a token is expired (won't work on refresh tokens)
     * @param token The token to check
     * @returns `true` if the token is expired, otherwise `false`
     */
    public static isExpired(token: string): boolean {
        const decoded = jwtDecode(token) as JwtPayload;
        if (decoded.exp < Date.now() / 1000) {
            return true;
        } else {
            return false;
        }
    }
}

export class MissingTokenError extends Error {
    constructor(source?: string) {
        if (source) {
            super(`Couldn't find tokens in ${source}`);
        } else {
            super("Couldn't find tokens");
        }
        this.name = "MissingTokenError";
    }
}

export class ExpiredTokenError extends Error {
    constructor(tokenType: string) {
        super(`${tokenType} token is expired`);
        this.name = "ExpiredTokenError";
    }
}