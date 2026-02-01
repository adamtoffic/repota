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
        className={`my-auto w-full max-w-md flex-shrink-0 rounded-lg bg-white shadow-xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
};
