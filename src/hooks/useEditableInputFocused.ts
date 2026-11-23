import { useEffect, useRef, useState } from "react";

const NON_KEYBOARD_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/**
 * Delay clearing editable focus across `focusout` -> `focusin` gaps so iOS WebKit
 * Form Assistant transitions between adjacent inputs never toggle fixed chrome mid-jump.
 */
const BLUR_SETTLE_DELAY_MS = 180;

/**
 * Returns `true` only when `target` is a non-disabled, editable control that summons
 * a software keyboard (`<textarea>`, `contenteditable`, or text/numeric `<input>`).
 *
 * Excludes `<select>` deliberately: iOS Safari keeps `document.activeElement` on a
 * `<select>` after its native picker closes, which would trap mobile chrome hidden.
 */
export function isEditableFormControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement) {
    return !target.disabled && !target.readOnly;
  }
  if (target instanceof HTMLInputElement) {
    if (target.disabled || target.readOnly) return false;
    return !NON_KEYBOARD_INPUT_TYPES.has(target.type.toLowerCase());
  }
  return target.isContentEditable;
}

/**
 * Tracks whether a software-keyboard-summoning control holds document focus, with a
 * `180ms` debounced `focusout` settle window so fixed overlays can disable hit-testing
 * continuously while navigating across inputs on iOS Safari and PWAs.
 */
export function useEditableInputFocused(): boolean {
  const [isEditableFocused, setIsEditableFocused] = useState<boolean>(() =>
    typeof document !== "undefined" ? isEditableFormControl(document.activeElement) : false,
  );
  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const clearPendingBlur = () => {
      if (blurTimerRef.current !== null) {
        window.clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableFormControl(event.target)) return;
      clearPendingBlur();
      setIsEditableFocused(true);
    };

    const handleFocusOut = () => {
      clearPendingBlur();
      blurTimerRef.current = window.setTimeout(() => {
        blurTimerRef.current = null;
        if (!isEditableFormControl(document.activeElement)) {
          setIsEditableFocused(false);
        }
      }, BLUR_SETTLE_DELAY_MS);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      clearPendingBlur();
    };
  }, []);

  return isEditableFocused;
}
