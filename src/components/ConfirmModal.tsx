import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean; // If true, button becomes RED
  /** Optional keyword (matched case-insensitively after trim) the user must type to enable confirm. */
  confirmKeyword?: string;
  /** Disables dismissal and confirm actions while an async confirmation is in flight. */
  isLoading?: boolean;
  /** Keeps the modal open when confirm is clicked so async handlers control closing. */
  keepOpenOnConfirm?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  onCancel?: () => void; // Optional callback for cancel action
}

export function ConfirmModal(props: Props) {
  if (!props.isOpen) return null;
  return <ConfirmModalContent {...props} />;
}

function ConfirmModalContent({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
  confirmKeyword,
  isLoading = false,
  keepOpenOnConfirm = false,
  onConfirm,
  onClose,
  onCancel,
}: Props) {
  const [typedKeyword, setTypedKeyword] = useState("");
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const handleCancel = useCallback(() => {
    if (isLoading) return;
    onCancel?.();
    onClose();
  }, [isLoading, onCancel, onClose]);

  const keywordMatches =
    !confirmKeyword || typedKeyword.trim().toUpperCase() === confirmKeyword.trim().toUpperCase();
  const isConfirmDisabled = isLoading || !keywordMatches;

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      closeOnBackdrop={Boolean(onCancel) && !isLoading}
      closeOnEscape={!isLoading}
      className="max-w-sm"
    >
      <div className="p-5 sm:p-6">
        {/* Header with Icon */}
        <div className="mb-4 flex items-start gap-4">
          <div
            className={`shrink-0 rounded-full p-3 ${isDangerous ? "bg-red-100 dark:bg-red-950/60" : "bg-blue-100 dark:bg-blue-950/60"}`}
          >
            <AlertTriangle
              className={`h-6 w-6 ${isDangerous ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-main text-lg leading-tight font-bold" data-record="true">
              {title}
            </h3>
            <p className="text-muted mt-1 text-sm leading-relaxed">{message}</p>
          </div>
        </div>

        {confirmKeyword && (
          <div className="mt-4">
            <Input
              label={`Type ${confirmKeyword} to confirm`}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={isLoading}
              value={typedKeyword}
              onChange={(e) => setTypedKeyword(e.target.value)}
              placeholder={confirmKeyword}
              className="font-mono text-base font-bold uppercase sm:text-sm"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={isLoading}
            onClick={handleCancel}
            className="hover:bg-subtle border-border-strong bg-surface text-secondary w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            data-record="true"
          >
            {cancelText}
          </button>
          <Button
            type="button"
            disabled={isConfirmDisabled}
            onClick={() => {
              if (isConfirmDisabled) return;
              onConfirm();
              if (!keepOpenOnConfirm) {
                onClose();
              }
            }}
            variant={isDangerous ? "danger" : "primary"}
            size="md"
            className="w-full sm:w-auto"
            data-record="true"
          >
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            <span>{confirmText}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
