/**
 * File Encryption Utility
 * Encrypts/decrypts backup files when shared between teachers.
 * Uses AES-256-GCM with PBKDF2-HMAC-SHA256 key derivation and optional gzip compression.
 *
 * Every `.repota` v2 export is encrypted:
 * - Default ("app" mode): App-sealed AES-256-GCM hides student PII from casual text/preview
 *   inspection and adds authenticated integrity while opening seamlessly inside Repota.
 * - Optional ("password" mode): User password provides zero-knowledge confidentiality.
 *
 * Browser storage remains UNENCRYPTED for performance.
 */

const CURRENT_VERSION = "v2";
const SUPPORTED_VERSIONS = new Set(["v1", "v2"]);
const PBKDF2_ITERATIONS = 100000; // Industry standard for password derivation
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits (GCM standard)
const BASE64_CHUNK_SIZE = 0x8000; // 32KB chunks prevent Safari/WebKit call-stack overflow

// App-sealing domain key (not zero-knowledge; prevents plaintext exposure in chat/file previews)
const APP_SEAL_PARTS = ["repota", "class-backup", "aes256gcm", "v2", "seal-2026"] as const;

function getAppSealSecret(): string {
  return APP_SEAL_PARTS.join("::");
}

export type BackupEncryptionMode = "app" | "password";

export interface EncryptedFile {
  version: string;
  encrypted: true;
  mode?: BackupEncryptionMode;
  compressed?: boolean;
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
 * Convert Uint8Array to Base64 string using chunks so large backups with photos
 * do not exceed WebKit/V8 maximum argument stack limits.
 */
function arrayToBase64(array: Uint8Array): string {
  if (array.length === 0) return "";
  const chunks: string[] = [];
  for (let i = 0; i < array.length; i += BASE64_CHUNK_SIZE) {
    const slice = array.subarray(i, i + BASE64_CHUNK_SIZE);
    chunks.push(String.fromCharCode(...slice));
  }
  return btoa(chunks.join(""));
}

function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
}

/**
 * Gzip-compress bytes when CompressionStream is supported and smaller/available.
 */
async function compressUtf8Bytes(bytes: Uint8Array): Promise<{ bytes: Uint8Array; compressed: boolean }> {
  if (typeof CompressionStream === "undefined") {
    return { bytes, compressed: false };
  }
  try {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("gzip"));
    const compressedBuffer = await new Response(stream).arrayBuffer();
    return { bytes: new Uint8Array(compressedBuffer), compressed: true };
  } catch {
    return { bytes, compressed: false };
  }
}

/**
 * Decompress gzip bytes produced during export.
 */
async function decompressUtf8Bytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot open compressed backups. Please update your browser.");
  }
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  const buffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function encryptPayload(
  data: unknown,
  mode: BackupEncryptionMode,
  secret: string,
  hint?: string,
): Promise<EncryptedFile> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(secret, salt);

    const encoder = new TextEncoder();
    const rawBytes = encoder.encode(JSON.stringify(data));
    const { bytes: payloadBytes, compressed } = await compressUtf8Bytes(rawBytes);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      payloadBytes as BufferSource,
    );

    return {
      version: CURRENT_VERSION,
      encrypted: true,
      mode,
      compressed,
      salt: arrayToBase64(salt),
      iv: arrayToBase64(iv),
      data: arrayToBase64(new Uint8Array(encryptedBuffer)),
      ...(hint ? { hint } : {}),
    };
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt file. Please try again.", { cause: error });
  }
}

/**
 * Encrypt backup data with app-sealing (no user password required; hides PII from previews).
 */
export async function encryptAppSealedBackup(data: unknown): Promise<EncryptedFile> {
  return encryptPayload(data, "app", getAppSealSecret());
}

/**
 * Encrypt backup data with a user password (zero-knowledge protection).
 */
export async function encryptBackupFile(
  data: unknown,
  password: string,
  hint?: string,
): Promise<EncryptedFile> {
  if (!password) {
    throw new Error("Password is required to encrypt with password protection.");
  }
  return encryptPayload(data, "password", password, hint);
}

/**
 * Return true if the encrypted file requires a user-entered password to unlock.
 */
export function requiresPassword(file: EncryptedFile): boolean {
  return !(file.version === CURRENT_VERSION && file.mode === "app");
}

/**
 * Decrypt backup file (supports v1 password files, v2 password files, and v2 app-sealed files).
 */
export async function decryptBackupFile<T>(
  encryptedFile: EncryptedFile,
  password?: string,
): Promise<T> {
  try {
    if (!encryptedFile.encrypted || !SUPPORTED_VERSIONS.has(encryptedFile.version)) {
      throw new Error("Invalid encrypted file format");
    }

    const needsPassword = requiresPassword(encryptedFile);
    if (needsPassword && !password) {
      throw new Error("Password is required to unlock this file.");
    }
    const secret = needsPassword ? password! : getAppSealSecret();

    const salt = base64ToArray(encryptedFile.salt);
    const iv = base64ToArray(encryptedFile.iv);
    const encryptedData = base64ToArray(encryptedFile.data);

    const key = await deriveKey(secret, salt);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      encryptedData as BufferSource,
    );

    let plainBytes: Uint8Array = new Uint8Array(decryptedBuffer);
    if (encryptedFile.compressed) {
      plainBytes = await decompressUtf8Bytes(plainBytes);
    }

    const decoder = new TextDecoder();
    const jsonData = decoder.decode(plainBytes);
    return JSON.parse(jsonData) as T;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("operation-specific") ||
        error.message.includes("Invalid encrypted file format") ||
        error.message.includes("not open compressed backups"))
    ) {
      if (error.message.includes("operation-specific")) {
        throw new Error("Incorrect password. Please try again.", { cause: error });
      }
      throw error;
    }
    console.error("Decryption error:", error);
    throw new Error(
      requiresPassword(encryptedFile)
        ? "Failed to decrypt file. The password may be incorrect."
        : "Failed to read protected backup file. The file may be corrupted.",
      { cause: error },
    );
  }
}

/**
 * Check if a parsed JSON payload is a Repota encrypted envelope (v1 or v2).
 */
export function isEncryptedFile(data: unknown): data is EncryptedFile {
  if (!data || typeof data !== "object") return false;
  const file = data as Partial<EncryptedFile>;
  if (
    file.encrypted !== true ||
    typeof file.version !== "string" ||
    !SUPPORTED_VERSIONS.has(file.version) ||
    typeof file.salt !== "string" ||
    typeof file.iv !== "string" ||
    typeof file.data !== "string"
  ) {
    return false;
  }
  if (file.version === CURRENT_VERSION && file.mode !== "app" && file.mode !== "password") {
    return false;
  }
  return true;
}

/**
 * Get user-friendly encryption info
 */
export function getEncryptionInfo(file: EncryptedFile): string {
  const parts = [
    requiresPassword(file)
      ? "🔒 This file is password-protected"
      : "🛡️ This file is encrypted for Repota",
    file.hint ? `💡 Hint: ${file.hint}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}
