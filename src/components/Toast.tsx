// src/components/Toast.tsx
import { useEffect } from "react";
import { CheckCircle, AlertCircle, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface Props {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: Props) {
  // Auto-dismiss logic
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000); // 4 seconds is a comfortable read time
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const styles = {
    success: "bg-green-50 text-green-800 border-green-200",
    error: "bg-red-50 text-red-800 border-red-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
  };

  return (
    <div
      className={`animate-in slide-in-from-bottom-5 fade-in mb-3 flex min-w-75 items-center gap-3 rounded-lg border px-4 py-3 shadow-lg shadow-black/5 duration-300 ${styles[toast.type]} `}
    >
      <div className="shrink-0">{icons[toast.type]}</div>
      <p className="flex-1 text-sm leading-snug font-medium">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="p-1 opacity-50 transition-opacity hover:opacity-100"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
