// src/lib/server/crypto.ts

// WARNING: This is NOT a secure encryption method.
// It's a placeholder to demonstrate the data flow of encryption and decryption.
// In a real production environment, this MUST be replaced with Node.js's `crypto`
// module (e.g., AES-256-GCM) and a strong, securely managed encryption key
// (e.g., from Google Secret Manager or another secrets store).

const SHIFT = 13; // A simple ROT13 cipher for demonstration

/**
 * "Encrypts" a text using a simple ROT13 cipher.
 * @param text The plaintext to encrypt.
 * @returns The "encrypted" text.
 */
export function encrypt(text: string): string {
    if (!text) return '';
    return text.replace(/[a-zA-Z]/g, (char) => {
        const code = char.charCodeAt(0);
        // Uppercase letters
        if (code >= 65 && code <= 90) {
            return String.fromCharCode(((code - 65 + SHIFT) % 26) + 65);
        }
        // Lowercase letters
        if (code >= 97 && code <= 122) {
            return String.fromCharCode(((code - 97 + SHIFT) % 26) + 97);
        }
        return char; // Non-alphabetic characters are not changed
    });
}

/**
 * "Decrypts" a text using a simple ROT13 cipher.
 * For ROT13, encryption and decryption are the same operation.
 * @param text The ciphertext to decrypt.
 * @returns The "decrypted" text.
 */
export function decrypt(text: string): string {
    if (!text) return '';
    // For ROT13, decryption is the same as encryption
    return encrypt(text);
}
