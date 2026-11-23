/**
 * Badge Component
 * Used for status indicators, counts, and labels
 */

import { type ReactNode } from "react";

export interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const variantStyles = {
  default: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-subtle dark:text-secondary dark:border-border",
  primary:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/70",
  success:
    "bg-green-100 text-green-700 border-green-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70",
  warning:
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70",
  error:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/70",
  info: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/70",
} as const;

const sizeStyles = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-0.5 text-xs",
  lg: "px-2.5 py-1 text-sm",
} as const;

export function Badge({ children, variant = "default", size = "md", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded border font-bold ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}
