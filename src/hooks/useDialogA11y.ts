import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(", ");

const dialogStack: symbol[] = [];
let bodyLockCount = 0;
let previousBodyOverflow: string | null = null;

function isElementVisible(el: HTMLElement): boolean {
  if (el.closest('[aria-hidden="true"], [hidden], [inert], fieldset[disabled]')) {
    return false;
  }
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isElementVisible,
  );
}

export interface UseDialogA11yOptions {
  /** Whether the dialog is currently open. */
  isOpen: boolean;
  /** Callback invoked when the top-most dialog receives Escape. */
  onClose: () => void;
  /** Container element carrying `role="dialog"` (should also set `tabIndex={-1}`). */
  dialogRef: RefObject<HTMLElement | null>;
  /** Allow closing via the Escape key when this dialog is topmost on the stack. */
  closeOnEscape?: boolean;
  /** Reference-counted `document.body.style.overflow = "hidden"` lock while open. */
  lockScroll?: boolean;
  /** Trap Tab / Shift+Tab cycling within `dialogRef.current`. */
  trapFocus?: boolean;
}

/**
 * Manages stacked Escape dismissal, focus trapping, initial focus placement,
 * focus restoration, and reference-counted document scroll locking for modal dialogs.
 */
export function useDialogA11y({
  isOpen,
  onClose,
  dialogRef,
  closeOnEscape = true,
  lockScroll = true,
  trapFocus = true,
}: UseDialogA11yOptions): void {
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  const trapFocusRef = useRef(trapFocus);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
    trapFocusRef.current = trapFocus;
  });

  useEffect(() => {
    if (!isOpen) return;

    const id = Symbol("dialog");
    dialogStack.push(id);

    if (lockScroll) {
      if (bodyLockCount === 0) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      bodyLockCount += 1;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      const focusable = getFocusableElements(dialog);
      (focusable[0] ?? dialog).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== id) return;

      if (e.key === "Escape" && closeOnEscapeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === "Tab" && trapFocusRef.current && dialogRef.current) {
        const focusable = getFocusableElements(dialogRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === first || active === dialogRef.current || !dialogRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last || !dialogRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      const idx = dialogStack.indexOf(id);
      const hasNewerDialogAbove = idx !== -1 && idx < dialogStack.length - 1;
      if (idx !== -1) {
        dialogStack.splice(idx, 1);
      }

      if (lockScroll) {
        bodyLockCount = Math.max(0, bodyLockCount - 1);
        if (bodyLockCount === 0) {
          document.body.style.overflow = previousBodyOverflow ?? "";
          previousBodyOverflow = null;
        }
      }

      if (!hasNewerDialogAbove && previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, dialogRef, lockScroll]);
}
