/**
 * All the information related to a document
 */
export interface DocumentInfo {
    /**
     * The identity ID of the document's owner
     */
    user: string
    /**
     * This property is the sort key in dynamodb. It's formatted as `document:{document id}`
     */
    dataType: string
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
     * The wrapped document key. The original key is a JWK, and the wrapped key is a base64 encoded string
     */
    wrappedKey: ArrayBuffer;
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

/**
 * Represents a user's keypair
 */
export interface KeyPair {
    /**
     * The identity ID of the user who's keypair this is
     */
    user: string;
    /**
     * This will be of the format "keypair:{id}"
     */
    dataType: string;
    /**
     * The wrapped private key
     */
    privateKey?: Uint8Array;
    /**
     * The public key
     */
    publicKey: JsonWebKey;
}