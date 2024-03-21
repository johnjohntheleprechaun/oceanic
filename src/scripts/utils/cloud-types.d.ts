export interface DocumentInfo {
    title: string;
    type: string;
    created: number;
    updated: number;
    attachments: string[];
    documentKeys: DocumentKey[];
    authorizedUsers: AuthorizedUser[];
}

export interface DocumentKey {
    user: string;
    publicKeyVersion: string;
    documentKeyVersion: string;
    wrappedKey: JsonWebKey;
}

export interface AuthorizedUser {
    user: string;
    permissions: Permissions;
}

export interface Permissions {
    read: boolean;
    write: boolean;
}