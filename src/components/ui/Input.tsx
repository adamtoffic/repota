import type { InputHTMLAttributes, ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | ReactNode;
  error?: string;
  helperText?: ReactNode;
  recordLabel?: boolean;
}

export const Input = ({
  label,
  error,
  helperText,
  className = "",
  recordLabel = true,
  ...props
}: InputProps) => {
  const inputClasses = `bg-input text-main placeholder:text-muted w-full rounded-lg border px-4 py-2.5 outline-none transition-all ${
    error
      ? "border-red-500 focus:ring-2 focus:ring-red-500"
      : "border-border-strong focus:ring-2 focus:ring-blue-500"
  } ${className}`;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          className="text-secondary block text-sm font-medium"
          {...(recordLabel ? { "data-record": "true" } : {})}
        >
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <input className={inputClasses} {...props} />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {helperText && !error && <p className="text-muted text-sm">{helperText}</p>}
    </div>
  );
};
