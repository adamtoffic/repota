import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
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
  onCancel?: () => void; // Optional callback for cancel action
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
  onCancel,
}: Props) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const handleCancel = useCallback(() => {
    onCancel?.();
    onClose();
  }, [onCancel, onClose]);

  // Focus cancel button when modal opens & trap Escape key
  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button
    cancelButtonRef.current?.focus();

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleCancel]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      closeOnBackdrop={Boolean(onCancel)}
      className="max-w-sm"
    >
      <div className="p-6">
        {/* Header with Icon */}
        <div className="mb-4 flex items-start gap-4">
          <div
            className={`shrink-0 rounded-full p-3 ${isDangerous ? "bg-red-100 dark:bg-red-950/60" : "bg-blue-100 dark:bg-blue-950/60"}`}
          >
            <AlertTriangle
              className={`h-6 w-6 ${isDangerous ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}
            />
          </div>
          <div>
            <h3 className="text-main text-lg leading-tight font-bold" data-record="true">
              {title}
            </h3>
            <p className="text-muted mt-1 text-sm leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            onClick={handleCancel}
            className="hover:bg-subtle border-border-strong bg-surface text-secondary rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            data-record="true"
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
            data-record="true"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
