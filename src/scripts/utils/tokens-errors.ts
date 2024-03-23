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