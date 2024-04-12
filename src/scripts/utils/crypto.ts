/**
 * A collection of static functions for cryptography
 */
export class CryptoUtils {
    /**
     * The params for the user's key pair
     */
    public static keyPairParams = {
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
    };

    /**
     * Encode an ArrayBuffer as a base64 string
     * @param data The data to encode
     */
    public static encode(data: ArrayBuffer): string {
        let binaryString = "";
        const bytes = new Uint8Array(data);
        
        for (let i = 0; i < data.byteLength; i++) {
            binaryString += String.fromCharCode(bytes.at(i));
        }
        return btoa(binaryString);
    }
    /**
     * Turn a base64 string into an ArrayBuffer
     * @param data The base64 encoded string
    */
   public static decode(data: string): ArrayBuffer {
       const binaryString = atob(data);
       const bytes = new Uint8Array(binaryString.length);
       for (let i = 0; i < binaryString.length; i++) {
           bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
    
    /**
     * Derive a key from a passcode
     * @param passcode The passcode to derive the key from
     * @param salt The salt to use (should be the user's identity ID)
     * @returns The derived key
     */
    public static async passcodeToKey(passcode: string, salt: ArrayBuffer | string): Promise<CryptoKey> {
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
     * Generate a new key pair
     */
    public static async generateKeyPair(): Promise<CryptoKeyPair> {
        return await crypto.subtle.generateKey(CryptoUtils.keyPairParams, true, [ "wrapKey", "unwrapKey" ]);
    }

    /**
     * Encrypt some data. This will generate a new IV and prepend it to the output
     * @param data The data to encrypt
     * @param key The AES-GCM key to use
     */
    public static async encrypt(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
        // generate a 96 bit IV
        const iv = crypto.getRandomValues(new Uint8Array(96/8));

        // encrypt the journal data
        console.log("encrypting data...");
        const encrypted = new Uint8Array(await crypto.subtle.encrypt(
            { name: "AES-GCM", iv }, key, data
        ));
        console.log("encryption finished");

        // create a new array that's the combined length
        const fullData = new Uint8Array(encrypted.length + iv.length);
        // put the IV at the beginning
        fullData.set(iv);
        // set the rest of the object to the encrypted data
        fullData.set(encrypted, iv.length);

        return fullData;
    }

    /**
     * Decrypt an object.
     * @param data The encrypted object. This should have the 96 bit IV at the beginning, and the result of encryption at the end.
     * @param key The key to use.
     * @returns The decrypted data.
     */
    public static async decrypt(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
        const iv = data.slice(0, 96/8); // extract the 96 bit IV
        const body = data.slice(96/8); // extract the encrypted data
        console.log("decrypting data...");
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", length: 256, iv },
            key, body
        );
        console.log("decryption finished");
        return new Uint8Array(decrypted);
    }
}