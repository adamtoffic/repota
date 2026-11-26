import { useId, type SelectHTMLAttributes, type ReactNode } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  recordLabel?: boolean;
  children: ReactNode;
}

export const Select = ({
  id,
  label,
  error,
  className = "",
  children,
  recordLabel = true,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;
  const describedBy = [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  const selectClasses = `bg-input text-main w-full rounded-lg border px-4 py-2.5 outline-none transition-all ${
    error
      ? "border-red-500 focus:ring-2 focus:ring-red-500"
      : "border-border-strong focus:border-primary-text focus:ring-2 focus:ring-primary-text/30"
  } ${className}`;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="text-secondary block text-sm font-medium"
          {...(recordLabel ? { "data-record": "true" } : {})}
        >
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <select
        id={selectId}
        aria-invalid={ariaInvalid ?? (error ? true : undefined)}
        aria-describedby={describedBy}
        className={selectClasses}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};
