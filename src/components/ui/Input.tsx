import { useId, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | ReactNode;
  labelAction?: ReactNode;
  error?: string;
  helperText?: ReactNode;
  recordLabel?: boolean;
}

export const Input = ({
  id,
  label,
  labelAction,
  error,
  helperText,
  className = "",
  recordLabel = true,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const describedBy =
    [ariaDescribedBy, error ? errorId : helperText ? helperId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  const inputClasses = `bg-input text-main placeholder:text-muted block w-full min-w-0 max-w-full rounded-lg border px-4 py-2.5 outline-none transition-all ${
    props.type === "date" ? "appearance-none text-left " : ""
  }${
    error
      ? "border-red-500 focus:ring-2 focus:ring-red-500"
      : "border-border-strong focus:border-primary-text focus:ring-2 focus:ring-primary-text/30"
  } ${className}`;

  const labelElement = label && (
    <label
      htmlFor={inputId}
      className={`text-secondary ${labelAction ? "" : "block "}text-sm font-medium`}
      {...(recordLabel ? { "data-record": "true" } : {})}
    >
      {label}
      {props.required && <span aria-hidden="true" className="ml-1 text-red-500">*</span>}
    </label>
  );

  return (
    <div className="min-w-0 space-y-1.5">
      {labelElement &&
        (labelAction ? (
          <div className="flex items-center justify-between gap-2">
            {labelElement}
            {labelAction}
          </div>
        ) : (
          labelElement
        ))}
      <input
        id={inputId}
        aria-invalid={ariaInvalid ?? (error ? true : undefined)}
        aria-describedby={describedBy}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-muted text-sm">
          {helperText}
        </p>
      )}
    </div>
  );
};
