/**
 * PIN Security utilities - Client-side only, no backend
 * Uses Web Crypto API for secure hashing
 */

const PIN_STORAGE_KEY = "app_pin_hash";
const RECOVERY_CODE_KEY = "recovery_code_hash";

/**
 * Simple hash function using Web Crypto API
 */
async function hashString(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a random 6-digit recovery code
 */
export function generateRecoveryCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Set up PIN for the first time
 */
export async function setupPin(pin: string, recoveryCode: string): Promise<boolean> {
  try {
    const pinHash = await hashString(pin);
    const recoveryHash = await hashString(recoveryCode);

    localStorage.setItem(PIN_STORAGE_KEY, pinHash);
    localStorage.setItem(RECOVERY_CODE_KEY, recoveryHash);

    return true;
  } catch (error) {
    console.error("PIN setup error:", error);
    return false;
  }
}

/**
 * Check if PIN has been set up
 */
export function isPinConfigured(): boolean {
  return localStorage.getItem(PIN_STORAGE_KEY) !== null;
}

/**
 * Verify entered PIN
 */
export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (!storedHash) return false;

    const enteredHash = await hashString(pin);
    return enteredHash === storedHash;
  } catch (error) {
    console.error("PIN verification error:", error);
    return false;
  }
}

/**
 * Verify recovery code
 */
export async function verifyRecoveryCode(code: string): Promise<boolean> {
  try {
    const storedHash = localStorage.getItem(RECOVERY_CODE_KEY);
    if (!storedHash) return false;

    const enteredHash = await hashString(code);
    return enteredHash === storedHash;
  } catch (error) {
    console.error("Recovery code verification error:", error);
    return false;
  }
}

/**
 * Reset PIN using recovery code (returns new PIN)
 */
export async function resetPinWithRecoveryCode(
  recoveryCode: string,
  newPin: string,
): Promise<boolean> {
  try {
    const isValidRecoveryCode = await verifyRecoveryCode(recoveryCode);
    if (!isValidRecoveryCode) return false;

    // Set new PIN (keep same recovery code)
    const pinHash = await hashString(newPin);
    localStorage.setItem(PIN_STORAGE_KEY, pinHash);

    return true;
  } catch (error) {
    console.error("PIN reset error:", error);
    return false;
  }
}

/**
 * Disable PIN lock (just remove PIN hashes, keep app data)
 */
export function disablePinLock(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(RECOVERY_CODE_KEY);
}
