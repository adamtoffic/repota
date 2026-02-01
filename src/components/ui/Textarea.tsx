import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = ({ label, error, className = "", ...props }: TextareaProps) => {
  const textareaClasses = `w-full rounded-lg border px-4 py-2.5 outline-none transition-all resize-none ${
    error
      ? "border-red-500 focus:ring-2 focus:ring-red-500"
      : "border-gray-300 focus:ring-2 focus:ring-blue-500"
  } ${className}`;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      <textarea className={textareaClasses} {...props} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};
