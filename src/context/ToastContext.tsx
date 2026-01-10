// src/context/ToastContext.tsx
import { createContext, useState } from "react";
import type { ReactNode } from "react";
import type { ToastMessage, ToastType } from "../components/Toast";
import { Toast } from "../components/Toast";

// Define the shape of our context
interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

// 1. Create the Context
export const ToastContext = createContext<ToastContextType | undefined>(undefined);

// 2. Create the Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType = "success") => {
    const id = Date.now().toString();
    // Add new toast to the list
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    // Remove toast by ID
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* GLOBAL TOAST CONTAINER */}
      {/* Fixed to the bottom-right of the screen */}
      <div className="pointer-events-none fixed right-4 bottom-4 z-100 flex flex-col items-end">
        {/* We re-enable pointer events on the items so buttons work */}
        <div className="pointer-events-auto">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
