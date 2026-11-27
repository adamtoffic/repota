import { useRef, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "../../hooks/useDialogA11y";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  ariaLabel?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  children,
  className = "",
  closeOnBackdrop = true,
  closeOnEscape = true,
  ariaLabelledBy,
  ariaDescribedBy,
  ariaLabel,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogA11y({
    isOpen,
    onClose,
    dialogRef,
    closeOnEscape,
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const hasMaxWidth = /\bmax-w-/.test(className);

  const modalContent = (
    <div
      className="modal-backdrop animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-black/50 px-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-md sm:p-6 dark:bg-black/70"
      onClick={handleBackdropClick}
      style={{ position: "fixed" }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel}
        className={`animate-sheet-up border-border bg-elevated text-main my-auto w-full border ${hasMaxWidth ? "" : "max-w-md"} flex-shrink-0 rounded-xl shadow-xl focus:outline-none dark:shadow-[0_24px_60px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.07)] ${className}`}
      >
        {children}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
