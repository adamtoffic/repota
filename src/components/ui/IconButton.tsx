/**
 * IconButton Component
 * Button component for icon-only buttons
 */

import { type ReactNode, type ButtonHTMLAttributes } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  "aria-label": string; // Required for accessibility
}

const variantStyles = {
  primary: "bg-primary hover:bg-primary/90 text-white shadow-sm",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm",
  ghost: "hover:bg-gray-100 text-gray-700",
} as const;

const sizeStyles = {
  sm: "h-8 w-8 p-1.5",
  md: "h-10 w-10 p-2",
  lg: "h-12 w-12 p-3",
} as const;

export function IconButton({
  children,
  variant = "ghost",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
