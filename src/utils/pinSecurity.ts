/**
 * PIN Security utilities - Client-side only, no backend
 * Uses Web Crypto API (salted PBKDF2-HMAC-SHA256) with backward compatibility
 * for legacy unsalted SHA-256 hashes (upgraded automatically on verification).
 */

const PIN_STORAGE_KEY = "app_pin_hash";
const RECOVERY_CODE_KEY = "recovery_code_hash";
const SECURITY_QUESTIONS_KEY = "security_questions";
const PIN_LOCKOUT_KEY = "app_pin_lockout";
const RECOVERY_LOCKOUT_KEY = "app_recovery_lockout";

export const PIN_CONFIG_CHANGED_EVENT = "repota:pin-config-changed";

const PBKDF2_PREFIX = "v2:pbkdf2$";
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const DERIVED_BITS = 256;
const FREE_ATTEMPTS_BEFORE_COOLDOWN = 5;
const MAX_COOLDOWN_MS = 5 * 60_000;
const RECOVERY_MAX_COOLDOWN_MS = 15 * 60_000;

function notifyPinConfigChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PIN_CONFIG_CHANGED_EVENT));
  }
}

export interface SecurityQuestionAnswer {
  questionId: string;
  answerHash: string;
}

export interface PinLockoutStatus {
  isLockedOut: boolean;
  remainingMs: number;
  failedAttempts: number;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Legacy unsalted SHA-256 hash (read-only compatibility for upgrading existing hashes).
 */
async function hashLegacySha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(hashBuffer));
}

async function derivePbkdf2Hex(
  value: string,
  salt: Uint8Array,
  iterations: number,
): Promise<string> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(value),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    DERIVED_BITS,
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

/**
 * Hash a PIN, recovery code, or normalized answer using random 128-bit salt + PBKDF2-SHA256.
 */
async function hashSecret(value: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derivedHex = await derivePbkdf2Hex(value, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${derivedHex}`;
}

async function verifySecret(
  value: string,
  storedHash: string,
): Promise<{ matches: boolean; needsUpgrade: boolean }> {
  if (storedHash.startsWith(PBKDF2_PREFIX)) {
    const payload = storedHash.slice(PBKDF2_PREFIX.length);
    const parts = payload.split("$");
    if (parts.length !== 3) return { matches: false, needsUpgrade: false };

    const iterations = Number(parts[0]);
    const salt = hexToBytes(parts[1]);
    const expectedHex = parts[2];
    if (!Number.isInteger(iterations) || iterations < 1 || !salt || !expectedHex) {
      return { matches: false, needsUpgrade: false };
    }

    const actualHex = await derivePbkdf2Hex(value, salt, iterations);
    return {
      matches: constantTimeEqual(actualHex, expectedHex),
      needsUpgrade: iterations < PBKDF2_ITERATIONS,
    };
  }

  // Legacy unsalted SHA-256 digest
  const legacyDigest = await hashLegacySha256(value);
  const matches = constantTimeEqual(legacyDigest, storedHash);
  return { matches, needsUpgrade: matches };
}

/**
 * Generate a cryptographically random 6-digit recovery code.
 */
export function generateRecoveryCode(): string {
  const range = 900_000;
  const maxUnbiased = Math.floor(0x1_0000_0000 / range) * range;
  const buf = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= maxUnbiased);
  return (100_000 + (value % range)).toString();
}

function readLockoutStatus(storageKey: string): PinLockoutStatus {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { isLockedOut: false, remainingMs: 0, failedAttempts: 0 };
    const parsed = JSON.parse(raw) as { failedAttempts?: unknown; lockedUntil?: unknown };
    const failedAttempts = typeof parsed.failedAttempts === "number" ? parsed.failedAttempts : 0;
    const lockedUntil = typeof parsed.lockedUntil === "number" ? parsed.lockedUntil : 0;
    const remainingMs = Math.max(0, lockedUntil - Date.now());
    return {
      isLockedOut: remainingMs > 0,
      remainingMs,
      failedAttempts,
    };
  } catch {
    return { isLockedOut: false, remainingMs: 0, failedAttempts: 0 };
  }
}

function recordLockoutAttempt(storageKey: string, maxCooldownMs: number): PinLockoutStatus {
  const current = readLockoutStatus(storageKey);
  const failedAttempts = current.failedAttempts + 1;
  let lockedUntil = 0;
  if (failedAttempts >= FREE_ATTEMPTS_BEFORE_COOLDOWN) {
    const exponent = failedAttempts - FREE_ATTEMPTS_BEFORE_COOLDOWN;
    const durationMs = Math.min(30_000 * 2 ** exponent, maxCooldownMs);
    lockedUntil = Date.now() + durationMs;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify({ failedAttempts, lockedUntil }));
  } catch {
    // Ignore storage quota issues for lockout tracking
  }
  const remainingMs = Math.max(0, lockedUntil - Date.now());
  return {
    isLockedOut: remainingMs > 0,
    remainingMs,
    failedAttempts,
  };
}

function clearLockout(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // ignore storage errors
  }
}

export function getPinLockoutStatus(): PinLockoutStatus {
  return readLockoutStatus(PIN_LOCKOUT_KEY);
}

export function recordFailedPinAttempt(): PinLockoutStatus {
  return recordLockoutAttempt(PIN_LOCKOUT_KEY, MAX_COOLDOWN_MS);
}

export function clearPinLockout(): void {
  clearLockout(PIN_LOCKOUT_KEY);
}

export function getRecoveryLockoutStatus(): PinLockoutStatus {
  return readLockoutStatus(RECOVERY_LOCKOUT_KEY);
}

export function recordFailedRecoveryAttempt(): PinLockoutStatus {
  return recordLockoutAttempt(RECOVERY_LOCKOUT_KEY, RECOVERY_MAX_COOLDOWN_MS);
}

export function clearRecoveryLockout(): void {
  clearLockout(RECOVERY_LOCKOUT_KEY);
}

/**
 * Set up PIN for the first time
 */
export async function setupPin(pin: string, recoveryCode: string): Promise<boolean> {
  try {
    const pinHash = await hashSecret(pin);
    const recoveryHash = await hashSecret(recoveryCode);

    localStorage.setItem(PIN_STORAGE_KEY, pinHash);
    localStorage.setItem(RECOVERY_CODE_KEY, recoveryHash);
    clearPinLockout();
    clearRecoveryLockout();
    notifyPinConfigChanged();

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
  try {
    return localStorage.getItem(PIN_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Verify entered PIN (auto-upgrades legacy SHA-256 hash to salted PBKDF2)
 */
export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (!storedHash) return false;

    const { matches, needsUpgrade } = await verifySecret(pin, storedHash);
    if (matches) {
      clearPinLockout();
      if (needsUpgrade) {
        try {
          localStorage.setItem(PIN_STORAGE_KEY, await hashSecret(pin));
        } catch {
          // Never lock out a valid user because storage is full during legacy hash upgrade
        }
      }
    }
    return matches;
  } catch (error) {
    console.error("PIN verification error:", error);
    return false;
  }
}

/**
 * Check if new PIN is same as current PIN
 */
export async function isSameAsCurrentPin(newPin: string): Promise<boolean> {
  try {
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (!storedHash) return false;

    const { matches } = await verifySecret(newPin, storedHash);
    return matches;
  } catch (error) {
    console.error("PIN comparison error:", error);
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

    const { matches, needsUpgrade } = await verifySecret(code, storedHash);
    if (matches) {
      clearRecoveryLockout();
      if (needsUpgrade) {
        try {
          localStorage.setItem(RECOVERY_CODE_KEY, await hashSecret(code));
        } catch {
          // Never reject a valid recovery code if localStorage is full during hash upgrade
        }
      }
    }
    return matches;
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

    const pinHash = await hashSecret(newPin);
    localStorage.setItem(PIN_STORAGE_KEY, pinHash);
    clearPinLockout();
    clearRecoveryLockout();
    notifyPinConfigChanged();

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
  localStorage.removeItem(SECURITY_QUESTIONS_KEY);
  clearPinLockout();
  clearRecoveryLockout();

  // Also disable biometric since it's tied to PIN
  localStorage.removeItem("biometric_credential_id");
  localStorage.removeItem("biometric_enabled");
  notifyPinConfigChanged();
}

/**
 * Save security questions and answers
 */
export async function saveSecurityQuestions(
  questions: Array<{ questionId: string; answer: string }>,
): Promise<boolean> {
  try {
    const hashedQuestions: SecurityQuestionAnswer[] = await Promise.all(
      questions.map(async (q) => ({
        questionId: q.questionId,
        answerHash: await hashSecret(q.answer.toLowerCase().trim()),
      })),
    );

    localStorage.setItem(SECURITY_QUESTIONS_KEY, JSON.stringify(hashedQuestions));
    return true;
  } catch (error) {
    console.error("Error saving security questions:", error);
    return false;
  }
}

/**
 * Get saved security question IDs
 */
export function getSavedSecurityQuestionIds(): string[] {
  try {
    const stored = localStorage.getItem(SECURITY_QUESTIONS_KEY);
    if (!stored) return [];

    const questions: SecurityQuestionAnswer[] = JSON.parse(stored);
    return questions.map((q) => q.questionId);
  } catch (error) {
    console.error("Error getting security questions:", error);
    return [];
  }
}

/**
 * Verify security question answers
 */
export async function verifySecurityAnswers(
  answers: Array<{ questionId: string; answer: string }>,
): Promise<{ verified: boolean; correctCount: number }> {
  try {
    const stored = localStorage.getItem(SECURITY_QUESTIONS_KEY);
    if (!stored) return { verified: false, correctCount: 0 };

    const savedQuestions: SecurityQuestionAnswer[] = JSON.parse(stored);
    let correctCount = 0;
    let updatedAny = false;

    for (const answer of answers) {
      const savedQuestion = savedQuestions.find((q) => q.questionId === answer.questionId);
      if (!savedQuestion) continue;

      const normalized = answer.answer.toLowerCase().trim();
      const { matches, needsUpgrade } = await verifySecret(normalized, savedQuestion.answerHash);
      if (matches) {
        correctCount++;
        if (needsUpgrade) {
          savedQuestion.answerHash = await hashSecret(normalized);
          updatedAny = true;
        }
      }
    }

    if (updatedAny) {
      try {
        localStorage.setItem(SECURITY_QUESTIONS_KEY, JSON.stringify(savedQuestions));
      } catch {
        // Never reject valid answers when storage is full during legacy hash upgrade
      }
    }

    // Require at least 2 out of 3 correct answers
    const verified = correctCount >= 2;
    if (verified) {
      clearRecoveryLockout();
    }
    return { verified, correctCount };
  } catch (error) {
    console.error("Error verifying security answers:", error);
    return { verified: false, correctCount: 0 };
  }
}

/**
 * Check if security questions are configured
 */
export function areSecurityQuestionsConfigured(): boolean {
  const stored = localStorage.getItem(SECURITY_QUESTIONS_KEY);
  if (!stored) return false;

  try {
    const questions: SecurityQuestionAnswer[] = JSON.parse(stored);
    return questions.length === 3;
  } catch {
    return false;
  }
}

/**
 * Reset PIN using security questions
 */
export async function resetPinWithSecurityQuestions(newPin: string): Promise<boolean> {
  try {
    const pinHash = await hashSecret(newPin);
    localStorage.setItem(PIN_STORAGE_KEY, pinHash);
    clearPinLockout();
    clearRecoveryLockout();
    notifyPinConfigChanged();
    return true;
  } catch (error) {
    console.error("PIN reset error:", error);
    return false;
  }
}
