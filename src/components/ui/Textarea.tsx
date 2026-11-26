import { useId, type TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  recordLabel?: boolean;
}

export const Textarea = ({
  id,
  label,
  error,
  className = "",
  recordLabel = true,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaProps) => {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const errorId = `${textareaId}-error`;
  const describedBy = [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;

  const textareaClasses = `bg-input text-main placeholder:text-muted w-full rounded-lg border px-4 py-2.5 outline-none transition-all resize-none ${
    error
      ? "border-red-500 focus:ring-2 focus:ring-red-500"
      : "border-border-strong focus:border-primary-text focus:ring-2 focus:ring-primary-text/30"
  } ${className}`;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-secondary block text-sm font-medium"
          {...(recordLabel ? { "data-record": "true" } : {})}
        >
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={ariaInvalid ?? (error ? true : undefined)}
        aria-describedby={describedBy}
        className={textareaClasses}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};
