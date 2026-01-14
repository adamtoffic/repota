import { useEffect } from "react";
import { CheckCircle, AlertCircle, X, Info, RotateCcw } from "lucide-react"; // ✅ Added RotateCcw

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  action?: {
    // ✅ NEW: Optional Action Button
    label: string;
    onClick: () => void;
  };
}

interface Props {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000); // Increased to 5s to give time to undo
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const styles = {
    success: "bg-green-50 text-green-800 border-green-200",
    error: "bg-red-50 text-red-800 border-red-200",
    info: "bg-slate-800 text-white border-slate-700", // Dark mode style for Info/Undo
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-400" />,
  };

  return (
    <div
      className={`animate-in slide-in-from-bottom-5 fade-in mb-3 flex min-w-75 items-center gap-3 rounded-lg border px-4 py-3 shadow-xl shadow-black/10 duration-300 ${styles[toast.type]} `}
    >
      <div className="shrink-0">{icons[toast.type]}</div>
      <p className="flex-1 text-sm leading-snug font-medium">{toast.message}</p>

      {/* ✅ ACTION BUTTON */}
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onClose(toast.id);
          }}
          className="mr-2 flex items-center gap-1 rounded bg-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/20 active:scale-95"
        >
          <RotateCcw className="h-3 w-3" />
          {toast.action.label}
        </button>
      )}

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
