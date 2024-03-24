import { CognitoIdentityProviderClient, InitiateAuthCommand, InitiateAuthCommandOutput } from "@aws-sdk/client-cognito-identity-provider";
import jwtDecode, { JwtPayload } from "jwt-decode";
import { ExpiredTokenError, MissingTokenError } from "./tokens-errors";

declare const cloudConfig: CloudConfig;

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
     * Fetch tokens from window.localStorage
     * @returns A new token object
     */
    public static fromLocalStorage() {
        const accessToken = window.localStorage.getItem("access_token");
        const idToken = window.localStorage.getItem("id_token");
        const refreshToken = window.localStorage.getItem("refresh_token");

        if ([accessToken, idToken, refreshToken].includes(null)) {
            throw new MissingTokenError("local storage");
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