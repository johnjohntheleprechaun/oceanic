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
    id: string
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
     * The document key, wrapped with this user's public key
     */
    documentKey: Uint8Array;
    /**
     * All the users (exluding the owner) who have access to the document
     */
    authorizedUsers: AuthorizedUser[];

    // Local shit

    /**
     * Whether this document should be backed up in the cloud
     */
    backup?: boolean;
    /**
     * The unix timestamp (in milliseconds) of the last sync operation
     */
    lastSync?: number;
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
 * Represents a user's keypair, as stored in DynamoDB
 */
export interface WrappedMasterKeyPair {
    /**
     * The identity ID of the user who's keypair this is
     */
    user: string;
    /**
     * The DynamoDB sort key
     */
    id?: "keypair";
    /**
     * The wrapped private key
     */
    privateKey?: Uint8Array;
    /**
     * The public key
     */
    publicKey: Uint8Array;
}

/**
 * The master key pair as stored in indexedDB and used withing the code
 */
export interface MasterKeyPair {
    id?: "keypair",
    privateKey: CryptoKey;
    wrappedPrivateKey?: ArrayBuffer;
    publicKey: CryptoKey;
}