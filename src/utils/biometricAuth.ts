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

    // Smart device detection
    const ua = navigator.userAgent.toLowerCase();
    let type: "face" | "fingerprint" | "other" = "other";

    // iOS devices - highly accurate detection
    if (/iphone|ipad|ipod/.test(ua)) {
      const screenHeight = Math.max(window.screen.height, window.screen.width);
      const screenWidth = Math.min(window.screen.height, window.screen.width);

      // iPhone models with Touch ID (Fingerprint):
      // - iPhone SE (1st, 2nd, 3rd gen): 375x667, 375x667, 375x667
      // - iPhone 6/6s/7/8: 375x667
      // - iPhone 6+/7+/8+ Plus: 414x736
      // - iPad with Home button

      // iPhone models with Face ID:
      // - iPhone X and newer (notch/dynamic island): height >= 812
      // - iPhone 11, 12, 13, 14, 15 series

      const isTouchIDDevice =
        (screenWidth === 375 && screenHeight === 667) || // iPhone SE, 6, 7, 8
        (screenWidth === 414 && screenHeight === 736) || // iPhone Plus models
        (screenWidth === 320 && screenHeight === 568) || // iPhone 5s (first Touch ID)
        (/ipad/.test(ua) && screenHeight < 1024); // Older iPads with Touch ID

      const isFaceIDDevice = screenHeight >= 812; // iPhone X and newer

      if (isFaceIDDevice) {
        type = "face";
      } else if (isTouchIDDevice) {
        type = "fingerprint";
      } else {
        // Fallback for edge cases
        type = "fingerprint"; // Most older iPhones have Touch ID
      }
    }
    // Android devices
    else if (/android/.test(ua)) {
      // Most Android devices use fingerprint
      // Some newer ones have face unlock, but fingerprint is most common
      type = "fingerprint";
    }
    // macOS
    else if (/mac os x/.test(ua)) {
      // MacBook Pro/Air with Touch ID
      type = "fingerprint";
    }
    // Windows Hello
    else if (/windows/.test(ua)) {
      // Could be fingerprint or face
      type = "fingerprint"; // Most common
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
      return "Touch ID"; // Better UX for Apple devices
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
  } catch (error: unknown) {
    console.error("Biometric enrollment error:", error);
    const err = error as Error;

    if (err.name === "NotAllowedError") {
      return { success: false, error: "Biometric access denied. Please try again." };
    } else if (err.name === "InvalidStateError") {
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

    // Shorter timeout for better mobile experience (30 seconds)
    const timeout = 30000;

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
        timeout,
      },
    });

    if (!assertion) {
      return { success: false, error: "Biometric verification failed" };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Biometric verification error:", error);
    const err = error as Error;

    if (err.name === "NotAllowedError") {
      return { success: false, error: "Biometric verification cancelled" };
    } else if (err.name === "AbortError") {
      return { success: false, error: "Biometric verification cancelled" };
    } else if (err.name === "TimeoutError") {
      return { success: false, error: "Biometric verification timed out" };
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
