import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "danger" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  isLoading?: boolean;
  fullWidth?: boolean;
}

/**
 * Reusable Button component with consistent styling across the app
 * Supports multiple variants, sizes, and states
 */
export function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  isLoading = false,
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) {
  // Base styles applied to all buttons
  const baseStyles =
    "inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50";

  // Variant styles
  const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-primary hover:bg-primary/90 text-white shadow-sm",
    danger: "bg-danger hover:bg-danger/90 text-white shadow-sm",
    secondary: "bg-background hover:bg-gray-100 border border-gray-200 text-gray-700",
    ghost: "hover:bg-gray-100 text-gray-700",
    outline: "border border-gray-300 bg-white hover:bg-background text-gray-700 transition-colors",
  };

  // Size styles
  const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-2.5 text-base",
  };

  // Width styles
  const widthStyles = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
