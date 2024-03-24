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
        false, [ "wrapKey" ]
    )
}