// src/utils/printHandler.ts
// iOS-friendly print handling for PWA

import { triggerHaptic } from "./iosInteraction";

/** Custom window event read by `AppContent` (`src/App.tsx`) to suppress visibility-change PIN locking while the native print dialog is open. */
export const PRINT_STARTED_EVENT = "repota:print-started";

/**
 * Broadcasts `PRINT_STARTED_EVENT` before calling `window.print()` so returning from the system
 * print dialog does not immediately trigger the inactivity/visibility PIN lock on mobile PWAs.
 */
export const markPrintStarted = () => {
  window.dispatchEvent(new Event(PRINT_STARTED_EVENT));
};

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
      markPrintStarted();
      window.print();
    }, 100);
  };
};

/**
 * Keyboard print trigger (`Enter`/`Space`) that dispatches `beforeprint`, waits 100ms for
 * lazy report views to render, then calls `markPrintStarted()` and `window.print()`.
 */
export const createKeyboardPrintHandler = () => {
  return (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Dispatch custom event to force all lazy components to render
      window.dispatchEvent(new Event("beforeprint"));
      setTimeout(() => {
        markPrintStarted();
        window.print();
      }, 100);
    }
  };
};
