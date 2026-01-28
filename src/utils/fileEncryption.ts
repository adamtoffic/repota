/**
 * File Encryption Utility
 * Encrypts/decrypts backup files when shared between teachers
 * Uses AES-256-GCM with password-based key derivation (PBKDF2)
 *
 * Browser storage remains UNENCRYPTED for performance.
 * Only export/import files are encrypted.
 */

const ENCRYPTION_VERSION = "v1";
const PBKDF2_ITERATIONS = 100000; // Industry standard for password derivation
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits (GCM standard)

export interface EncryptedFile {
  version: string;
  encrypted: true;
  salt: string; // Base64
  iv: string; // Base64
  data: string; // Base64 encrypted data
  hint?: string; // Optional password hint
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Convert Uint8Array to Base64 string
 */
function arrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}

/**
 * Convert Base64 string to Uint8Array
 */
function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}

/**
 * Encrypt backup data with password
 */
export async function encryptBackupFile(
  data: unknown,
  password: string,
  hint?: string,
): Promise<EncryptedFile> {
  try {
    // 1. Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // 2. Derive encryption key from password
    const key = await deriveKey(password, salt);

    // 3. Convert data to JSON and encode
    const encoder = new TextEncoder();
    const jsonData = JSON.stringify(data);
    const dataBuffer = encoder.encode(jsonData);

    // 4. Encrypt with AES-GCM
    const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, dataBuffer);

    // 5. Return encrypted file object
    return {
      version: ENCRYPTION_VERSION,
      encrypted: true,
      salt: arrayToBase64(salt),
      iv: arrayToBase64(iv),
      data: arrayToBase64(new Uint8Array(encryptedBuffer)),
      hint,
    };
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt file. Please try again.");
  }
}

/**
 * Decrypt backup file with password
 */
export async function decryptBackupFile<T>(
  encryptedFile: EncryptedFile,
  password: string,
): Promise<T> {
  try {
    // 1. Validate file format
    if (!encryptedFile.encrypted || encryptedFile.version !== ENCRYPTION_VERSION) {
      throw new Error("Invalid encrypted file format");
    }

    // 2. Convert Base64 strings to arrays
    const salt = base64ToArray(encryptedFile.salt);
    const iv = base64ToArray(encryptedFile.iv);
    const encryptedData = base64ToArray(encryptedFile.data);

    // 3. Derive decryption key from password
    const key = await deriveKey(password, salt);

    // 4. Decrypt with AES-GCM
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      encryptedData.buffer as ArrayBuffer,
    );

    // 5. Convert buffer to JSON and parse
    const decoder = new TextDecoder();
    const jsonData = decoder.decode(decryptedBuffer);
    return JSON.parse(jsonData) as T;
  } catch (error) {
    // AES-GCM will fail if password is wrong
    if (error instanceof Error && error.message.includes("operation-specific")) {
      throw new Error("Incorrect password. Please try again.");
    }
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt file. The password may be incorrect.");
  }
}

/**
 * Check if a file is encrypted
 */
export function isEncryptedFile(data: unknown): data is EncryptedFile {
  if (!data || typeof data !== "object") return false;
  const file = data as Partial<EncryptedFile>;
  return (
    file.encrypted === true &&
    typeof file.version === "string" &&
    typeof file.salt === "string" &&
    typeof file.iv === "string" &&
    typeof file.data === "string"
  );
}

/**
 * Get user-friendly encryption info
 */
export function getEncryptionInfo(file: EncryptedFile): string {
  const parts = [
    "🔒 This file is password-protected",
    file.hint ? `💡 Hint: ${file.hint}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}
