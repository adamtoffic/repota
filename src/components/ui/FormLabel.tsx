import type { LabelHTMLAttributes, ReactNode } from "react";

export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
  variant?: "default" | "uppercase";
}

/**
 * FormLabel - Consistent label styling across forms
 * Replaces duplicate label components in Settings, DetailsTab, StudentList
 */
export function FormLabel({
  children,
  required = false,
  variant = "default",
  className = "",
  ...props
}: FormLabelProps) {
  const baseClass = "text-muted mb-1 block text-xs font-bold";
  const variantClass = variant === "uppercase" ? "uppercase tracking-wide" : "";

  return (
    <label className={`${baseClass} ${variantClass} ${className}`} {...props}>
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}
