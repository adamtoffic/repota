import { useState } from "react";
import type { ReactNode } from "react";
import type { ToastMessage, ToastType } from "../components/Toast";
import { Toast } from "../components/Toast";
// ✅ Import the definition from the new file
import { ToastContext } from "./ToastContextDefinition";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    message: string,
    type: ToastType = "success",
    action?: { label: string; onClick: () => void },
  ) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type, action }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2">
        <div className="pointer-events-auto">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
