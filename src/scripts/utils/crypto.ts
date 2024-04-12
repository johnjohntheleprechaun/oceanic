/**
 * The params for the user's key pair
 */
export const keyPairParams = {
    name: "RSA-OAEP",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
};

/**
 * Derive a key from a passcode
 * @param passcode The passcode to derive the key from
 * @param salt The salt to use (should be the user's identity ID)
 * @returns The derived key
 */
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

/**
 * Encode an ArrayBuffer as a base64 string
 * @param data The data to encode
 * @returns The base64 encoded string
 */
export function encode(data: ArrayBuffer) {
    let binaryString = "";
    const bytes = new Uint8Array(data);

    for (let i = 0; i < data.byteLength; i++) {
        binaryString += String.fromCharCode(bytes.at(i));
    }
    return btoa(binaryString);
}

