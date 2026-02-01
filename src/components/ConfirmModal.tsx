import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean; // If true, button becomes RED
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
  onConfirm,
  onClose,
}: Props) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when modal opens & trap Escape key
  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button
    cancelButtonRef.current?.focus();

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} className="max-w-sm">
      <div className="animate-in zoom-in-95 scale-100 p-6 duration-200">
        {/* Header with Icon */}
        <div className="mb-4 flex items-start gap-4">
          <div
            className={`shrink-0 rounded-full p-3 ${isDangerous ? "bg-red-100" : "bg-blue-100"}`}
          >
            <AlertTriangle
              className={`h-6 w-6 ${isDangerous ? "text-red-600" : "text-blue-600"}`}
            />
          </div>
          <div>
            <h3 className="text-main text-lg leading-tight font-bold">{title}</h3>
            <p className="text-muted mt-1 text-sm leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            className="hover:bg-background rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors"
          >
            {cancelText}
          </button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            variant={isDangerous ? "danger" : "primary"}
            size="md"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
