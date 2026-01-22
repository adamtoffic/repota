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

export const isIOSPWA = (): boolean => {
  return (
    "standalone" in window.navigator &&
    (window.navigator as NavigatorStandalone).standalone === true &&
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  );
};
