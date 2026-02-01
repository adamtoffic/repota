/**
 * Alert Component
 * Used for displaying important messages, warnings, and notifications
 */

import { type ReactNode } from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";

export interface AlertProps {
  children: ReactNode;
  variant?: "info" | "success" | "warning" | "error";
  title?: ReactNode;
  onClose?: () => void;
  className?: string;
  icon?: ReactNode;
  showIcon?: boolean;
}

const variantStyles = {
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: "text-blue-600",
    IconComponent: Info,
  },
  success: {
    container: "bg-green-50 border-green-200 text-green-800",
    icon: "text-green-600",
    IconComponent: CheckCircle,
  },
  warning: {
    container: "bg-yellow-50 border-yellow-200 text-yellow-800",
    icon: "text-yellow-600",
    IconComponent: AlertTriangle,
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: "text-red-600",
    IconComponent: AlertCircle,
  },
} as const;

export function Alert({
  children,
  variant = "info",
  title,
  onClose,
  className = "",
  icon,
  showIcon = true,
}: AlertProps) {
  const styles = variantStyles[variant];
  const IconComponent = styles.IconComponent;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${styles.container} ${className}`}
      role="alert"
    >
      {showIcon && (
        <div className={`mt-0.5 shrink-0 ${styles.icon}`}>
          {icon || <IconComponent className="h-5 w-5" />}
        </div>
      )}
      <div className="flex-1">
        {title && <p className="mb-1 text-sm font-bold">{title}</p>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 rounded p-1 transition-colors hover:bg-black/10"
          aria-label="Close alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
