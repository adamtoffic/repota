import { useEffect } from "react";
import type { ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  children,
  className = "",
  closeOnBackdrop = true,
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen || !closeOnBackdrop) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnBackdrop, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-md"
      onClick={handleBackdropClick}
      style={{ position: "fixed" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`animate-sheet-up my-auto w-full max-w-md flex-shrink-0 rounded-lg bg-white shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
