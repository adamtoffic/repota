/**
 * Biometric Authentication using Web Authentication API (WebAuthn)
 * Supports Face ID, Touch ID, Fingerprint, Windows Hello
 * Works offline, no server needed
 */

const CREDENTIAL_ID_KEY = "biometric_credential_id";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";

/**
 * Check if biometric authentication is available on this device
 */
export async function isBiometricAvailable(): Promise<{
  available: boolean;
  type: "face" | "fingerprint" | "other" | null;
}> {
  // Check if WebAuthn is supported
  if (!window.PublicKeyCredential) {
    return { available: false, type: null };
  }

  try {
    // Check if platform authenticator is available
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

    if (!available) {
      return { available: false, type: null };
    }

    // Try to detect type based on user agent
    const ua = navigator.userAgent.toLowerCase();
    let type: "face" | "fingerprint" | "other" = "other";

    // iOS devices with Face ID (iPhone X and newer)
    if (/iphone|ipad|ipod/.test(ua)) {
      // iPhone X and newer models typically have Face ID
      // Older models have Touch ID (fingerprint)
      // We can't detect exactly, so default to "face" for modern iOS
      type = "face";
    }
    // Android devices typically use fingerprint
    else if (/android/.test(ua)) {
      type = "fingerprint";
    }
    // macOS with Touch ID or Face ID
    else if (/mac os x/.test(ua)) {
      type = "fingerprint"; // Most Macs have Touch ID
    }

    return { available: true, type };
  } catch (error) {
    console.error("Error checking biometric availability:", error);
    return { available: false, type: null };
  }
}

/**
 * Get friendly name for biometric type
 */
export function getBiometricName(type: "face" | "fingerprint" | "other" | null): string {
  switch (type) {
    case "face":
      return "Face ID";
    case "fingerprint":
      return "Fingerprint";
    case "other":
      return "Biometric";
    default:
      return "Biometric";
  }
}

/**
 * Enroll biometric authentication (call after PIN is set up)
 */
export async function enrollBiometric(): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate a random challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Generate a random user ID
    const userId = new Uint8Array(16);
    crypto.getRandomValues(userId);

    // Create credential
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Repota",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: "teacher",
          displayName: "Teacher",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Use device biometric
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: "Failed to create credential" };
    }

    // Store credential ID
    const credentialIdArray = new Uint8Array(credential.rawId);
    const credentialIdBase64 = btoa(String.fromCharCode(...credentialIdArray));

    localStorage.setItem(CREDENTIAL_ID_KEY, credentialIdBase64);
    localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");

    return { success: true };
  } catch (error: any) {
    console.error("Biometric enrollment error:", error);

    if (error.name === "NotAllowedError") {
      return { success: false, error: "Biometric access denied. Please try again." };
    } else if (error.name === "InvalidStateError") {
      return { success: false, error: "Biometric already enrolled on this device." };
    }

    return { success: false, error: "Failed to enroll biometric. Please try again." };
  }
}

/**
 * Verify using biometric authentication
 */
export async function verifyBiometric(): Promise<{ success: boolean; error?: string }> {
  try {
    const credentialIdBase64 = localStorage.getItem(CREDENTIAL_ID_KEY);

    if (!credentialIdBase64) {
      return { success: false, error: "Biometric not enrolled" };
    }

    // Convert base64 to Uint8Array
    const credentialIdString = atob(credentialIdBase64);
    const credentialId = new Uint8Array(credentialIdString.length);
    for (let i = 0; i < credentialIdString.length; i++) {
      credentialId[i] = credentialIdString.charCodeAt(i);
    }

    // Generate a random challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    // Get assertion (verify biometric)
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: "public-key",
            id: credentialId,
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (!assertion) {
      return { success: false, error: "Biometric verification failed" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Biometric verification error:", error);

    if (error.name === "NotAllowedError") {
      return { success: false, error: "Biometric verification cancelled" };
    }

    return { success: false, error: "Biometric verification failed" };
  }
}

/**
 * Check if biometric is enrolled
 */
export function isBiometricEnrolled(): boolean {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
}

/**
 * Disable biometric authentication
 */
export function disableBiometric(): void {
  localStorage.removeItem(CREDENTIAL_ID_KEY);
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
}

/**
 * Check if biometric is enabled (user preference)
 */
export function isBiometricEnabled(): boolean {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
}
