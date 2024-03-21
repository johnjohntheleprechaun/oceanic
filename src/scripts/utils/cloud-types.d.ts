/**
 * All the information related to a document
 */
export interface DocumentInfo {
    /**
     * The document's title
     */
    title: string;
    /**
     * The document type
     */
    type: string;
    /**
     * A UNIX timestamp representing when the document was created
     */
    created: number;
    /**
     * A UNIX timestamp representing when the document was last updated
     */
    updated: number;
    /**
     * A list of all the UUIDs for any attached files
     */
    attachments: string[];
    /**
     * The document keys for everyone with access to the document
     */
    documentKeys: DocumentKey[];
    /**
     * All the users (exluding the owner) who have access to the document
     */
    authorizedUsers: AuthorizedUser[];
}

/**
 * A wrapped AES key for a document
 */
export interface DocumentKey {
    /**
     * The identity ID of the user this key was wrapped for
     */
    user: string;
    /**
     * The version of the user's public key that this key was wrapped with
     */
    publicKeyVersion: string;
    /**
     * The version of the document key that was wrapped
     */
    documentKeyVersion: string;
    /**
     * The wrapped document key
     */
    wrappedKey: JsonWebKey;
}

export interface AuthorizedUser {
    /**
     * The user's identity ID
     */
    user: string;
    /**
     * The permissions this user has
     */
    permissions: DocumentPermissions;
}

/**
 * Access rights to a document
 */
export interface DocumentPermissions {
    read: boolean;
    write: boolean;
}