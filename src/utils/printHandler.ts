// src/utils/printHandler.ts
// iOS-friendly print handling for PWA

import { triggerHaptic } from "./iosInteraction";

/**
 * Create a user-initiated print button handler for iOS PWA
 * Ensures iOS recognizes it as a legitimate user action (not bot)
 *
 * @param haptic - Whether to provide haptic feedback before printing
 */
export const createPrintHandler = (haptic: boolean = true) => {
  return (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent any default behavior
    e.preventDefault();
    e.stopPropagation();

    // Optional haptic feedback for premium feel
    if (haptic) {
      triggerHaptic("light");
    }

    // Dispatch custom event to force all lazy components to render
    window.dispatchEvent(new Event("beforeprint"));

    // Give components time to render before printing (especially in PWA)
    setTimeout(() => {
      window.print();
    }, 100);
  };
};

/**
 * For keyboard accessibility
 */
export const createKeyboardPrintHandler = () => {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Dispatch custom event to force all lazy components to render
      window.dispatchEvent(new Event("beforeprint"));
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };
};
