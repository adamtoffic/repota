// src/utils/iosInteraction.ts
// Minimal utilities for mobile PWA optimization

/**
 * Provides haptic feedback on mobile devices
 * Use sparingly for critical actions (delete, submit) to maintain premium feel
 */
export const triggerHaptic = (style: "light" | "medium" | "heavy" = "medium") => {
  if ("vibrate" in navigator && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    const patterns = {
      light: 10,
      medium: 25,
      heavy: 40,
    };
    navigator.vibrate(patterns[style]);
  }
};

/**
 * Detect if running as iOS PWA (for print handler)
 */
interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export const isIOSDevice = (): boolean => {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS Safari/WebApps identify as Macintosh with touch points
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
};

export const isIOSPWA = (): boolean => {
  const nav = window.navigator as NavigatorStandalone;
  const standalone =
    nav.standalone === true ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches);
  return standalone && isIOSDevice();
};

/**
 * Parse Safari/WebKit major version from the UA string (e.g. `Version/27.2` -> `27`).
 */
export const getSafariMajorVersion = (ua: string = navigator.userAgent): number | null => {
  const match = /Version\/(\d+)(?:\.\d+)?/.exec(ua);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * On iOS 27+ Home Screen web apps, `window.print()` is silently dropped by the standalone
 * container. Apple omits `Version/XX` from real Home Screen PWA user agents, so when
 * `safariMajor === null` inside `isIOSPWA()` we enable the PDF + Share Sheet fallback too.
 */
export const shouldUseIOSPdfPrintFallback = (): boolean => {
  if (!isIOSPWA()) return false;
  const safariMajor = getSafariMajorVersion();
  return safariMajor === null || safariMajor >= 27;
};
