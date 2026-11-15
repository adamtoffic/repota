import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ToastMessage, ToastType } from "../components/Toast";
import { Toast } from "../components/Toast";
// ✅ Import the definition from the new file
import { ToastContext } from "./ToastContextDefinition";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "success",
      action?: { label: string; onClick: () => void },
    ) => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type, action }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="bottom-safe-nav pointer-events-none fixed right-4 z-50 flex flex-col items-end gap-2 print:hidden">
        <div className="pointer-events-auto">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
