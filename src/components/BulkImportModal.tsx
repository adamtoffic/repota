import { useState } from "react";
import { X, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import type { StudentRecord } from "../types";
import { bulkImportTextSchema, validateBulkNames } from "../schemas";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: Props) {
  const { addStudent, settings } = useSchoolData();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [errors, setErrors] = useState<Array<{ name: string; error: string }>>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 🛡️ 1. SANITIZE AND VALIDATE TEXT INPUT
  const handlePreview = () => {
    if (!text.trim()) return;

    // First, sanitize the text with Zod
    const sanitizeResult = bulkImportTextSchema.safeParse(text);

    if (!sanitizeResult.success) {
      setValidationError(sanitizeResult.error.issues[0]?.message || "Invalid input");
      return;
    }

    // Clear previous validation error
    setValidationError(null);

    // Then validate each name individually
    const { valid, errors: nameErrors } = validateBulkNames(sanitizeResult.data);

    setPreview(valid);
    setErrors(nameErrors);
    setIsPreviewing(true);
  };

  // 2. Commit to Database (Only Valid Names)
  const handleImport = () => {
    let addedCount = 0;

    preview.forEach((name) => {
      const newStudent: StudentRecord = {
        id: crypto.randomUUID(), // Proper UUID generation
        name: name, // Already validated and sanitized
        className: settings.className || "Class",
        subjects: [],
        attendancePresent: 0,
      };

      addStudent(newStudent, true); // 🔥 SILENT MODE - no individual toasts
      addedCount++;
    });

    // 🎯 Single batch notification
    if (addedCount > 0) {
      const errorMsg = errors.length > 0 ? ` (${errors.length} skipped due to errors)` : "";
      showToast(
        `Successfully imported ${addedCount} student${addedCount > 1 ? "s" : ""}${errorMsg}!`,
        "success",
      );
    }

    onClose();
    setText("");
    setIsPreviewing(false);
    setPreview([]);
    setErrors([]);
    setValidationError(null);
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h3 className="text-main flex items-center gap-2 text-lg font-bold">
            <Upload className="text-primary h-5 w-5" />
            Bulk Import Students
          </h3>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!isPreviewing ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Paste your class list below. One student name per line. Numbers and bullets will be
                automatically removed.
              </p>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setValidationError(null); // Clear error on change
                }}
                placeholder="1. Kwame Mensah&#10;2. Ama Serwaa&#10;3. Aiman Adam&#10;...etc"
                className={`h-64 w-full resize-none rounded-lg border p-4 font-mono text-sm transition-colors outline-none ${
                  validationError
                    ? "border-red-500 focus:ring-2 focus:ring-red-200"
                    : "border-gray-300 focus:ring-2 focus:ring-blue-500"
                }`}
              />

              {/* Validation Error */}
              {validationError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <span>{validationError}</span>
                </div>
              )}

              <button
                onClick={handlePreview}
                disabled={!text.trim()}
                className="bg-primary hover:bg-primary/90 w-full rounded-lg py-2.5 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                Preview List
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span>
                  Found <strong>{preview.length}</strong> valid name
                  {preview.length !== 1 ? "s" : ""} ready to import.
                </span>
              </div>

              {/* Error Summary */}
              {errors.length > 0 && (
                <div className="rounded-lg bg-orange-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-orange-800">
                    <AlertCircle className="h-4 w-4" />
                    <span>
                      {errors.length} name{errors.length !== 1 ? "s" : ""} skipped due to errors:
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="space-y-1 text-xs text-orange-700">
                      {errors.map((err, i) => (
                        <li key={i}>
                          <span className="font-mono">"{err.name}"</span> - {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Valid Names Preview */}
              <div className="bg-background max-h-60 overflow-y-auto rounded-lg border border-gray-200 p-2">
                <ul className="divide-y divide-gray-200">
                  {preview.map((name, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {i + 1}. {name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsPreviewing(false);
                    setErrors([]);
                  }}
                  className="hover:bg-background flex-1 rounded-lg border border-gray-300 py-2 font-bold text-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={preview.length === 0}
                  className="bg-primary hover:bg-primary/90 flex-1 rounded-lg py-2 font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Import All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
