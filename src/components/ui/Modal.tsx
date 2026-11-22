import { useEffect } from "react";
import type { ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  children,
  className = "",
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  const hasMaxWidth = /\bmax-w-/.test(className);

  return (
    <div
      className="modal-backdrop animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-md sm:p-6 dark:bg-black/70"
      onClick={handleBackdropClick}
      style={{ position: "fixed" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`animate-sheet-up border-border bg-elevated text-main my-auto w-full border ${hasMaxWidth ? "" : "max-w-md"} flex-shrink-0 rounded-xl shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
