import { AlertTriangle, X } from "lucide-react";

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
            <h3 className="text-lg leading-tight font-bold text-gray-900">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{message}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors ${
              isDangerous ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
