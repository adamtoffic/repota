/**
 * PIN Security utilities - Client-side only, no backend
 * Uses Web Crypto API for secure hashing
 */

const PIN_STORAGE_KEY = "app_pin_hash";
const RECOVERY_CODE_KEY = "recovery_code_hash";
const SECURITY_QUESTIONS_KEY = "security_questions";

export interface SecurityQuestionAnswer {
  questionId: string;
  answerHash: string;
}

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
 * Check if new PIN is same as current PIN
 */
export async function isSameAsCurrentPin(newPin: string): Promise<boolean> {
  try {
    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    if (!storedHash) return false;

    const newHash = await hashString(newPin);
    return newHash === storedHash;
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
  localStorage.removeItem(SECURITY_QUESTIONS_KEY);
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
        answerHash: await hashString(q.answer.toLowerCase().trim()),
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

    for (const answer of answers) {
      const savedQuestion = savedQuestions.find((q) => q.questionId === answer.questionId);
      if (!savedQuestion) continue;

      const answerHash = await hashString(answer.answer.toLowerCase().trim());
      if (answerHash === savedQuestion.answerHash) {
        correctCount++;
      }
    }

    // Require at least 2 out of 3 correct answers
    const verified = correctCount >= 2;
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
    const pinHash = await hashString(newPin);
    localStorage.setItem(PIN_STORAGE_KEY, pinHash);
    return true;
  } catch (error) {
    console.error("PIN reset error:", error);
    return false;
  }
}
