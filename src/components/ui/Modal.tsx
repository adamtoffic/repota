import type { ReactNode } from "react";

interface ModalProps {
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
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 backdrop-blur-md"
      onClick={handleBackdropClick}
      style={{ position: "fixed" }}
    >
      <div className={`w-full max-w-md rounded-lg bg-white shadow-xl ${className}`}>{children}</div>
    </div>
  );
};
