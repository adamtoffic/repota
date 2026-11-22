import type { SelectHTMLAttributes, ReactNode } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  recordLabel?: boolean;
  children: ReactNode;
}

export const Select = ({
  label,
  error,
  className = "",
  children,
  recordLabel = true,
  ...props
}: SelectProps) => {
  const selectClasses = `bg-input text-main w-full rounded-lg border px-4 py-2.5 outline-none transition-all ${
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
      <select className={selectClasses} {...props}>
        {children}
      </select>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};
