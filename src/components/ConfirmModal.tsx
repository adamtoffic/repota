import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";

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
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm duration-200">
      <div className="animate-in zoom-in-95 w-full max-w-sm scale-100 rounded-xl bg-white p-6 shadow-xl duration-200">
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
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-95 ${
              isDangerous ? "bg-danger hover:bg-danger/90" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
