import { createContext } from "react";
import type { ToastType } from "../components/Toast";

export interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastType,
    action?: { label: string; onClick: () => void },
  ) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
