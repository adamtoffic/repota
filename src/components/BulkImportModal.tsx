import { useState } from "react";
import { X, Upload, CheckCircle } from "lucide-react";
import { useSchoolData } from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import type { StudentRecord } from "../types";
import { Button } from "./ui/Button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: Props) {
  const { addStudent, settings } = useSchoolData();
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);

  if (!isOpen) return null;

  // 1. Process Text Input
  const handlePreview = () => {
    if (!text.trim()) return;

    // Split by newline, trim whitespace, remove empty lines
    const names = text
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    setPreview(names);
    setIsPreviewing(true);
  };

  // 2. Commit to Database
  const handleImport = () => {
    let addedCount = 0;

    preview.forEach((name, index) => {
      // Basic duplicate check (optional, or just allow duplicates as per our new philosophy)
      // For bulk, let's just add them. Unique IDs handle identity.

      const newStudent: StudentRecord = {
        id: `${Date.now()}-${index}`, // Ensure unique timestamp even in loop
        name: name,
        gender: "Male", // Default - can be updated individually later
        className: settings.className || "Class",
        subjects: [],
        attendancePresent: 0,
      };

      addStudent(newStudent, true); // 🔥 SILENT MODE - no individual toasts
      addedCount++;
    });

    // 🎯 Single batch notification
    if (addedCount > 0) {
      showToast(
        `Successfully imported ${addedCount} student${addedCount > 1 ? "s" : ""}!`,
        "success",
      );
    }

    onClose();
    setText("");
    setIsPreviewing(false);
    setPreview([]);
  };

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
      style={{ position: "fixed" }}
    >
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
                Paste your class list below. One student name per line.
              </p>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Kwame Mensah&#10;Ama Serwaa&#10;Aiman Adam&#10;...etc"
                className="h-64 w-full resize-none rounded-lg border border-gray-300 p-4 font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                onClick={handlePreview}
                disabled={!text.trim()}
                variant="primary"
                size="md"
                fullWidth
              >
                Preview List
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span>
                  Found <strong>{preview.length}</strong> valid names ready to import.
                </span>
              </div>

              <div className="bg-background max-h-60 overflow-y-auto rounded-lg border border-gray-200 p-2">
                <ul className="divide-y divide-gray-200">
                  {preview.map((name, i) => (
                    <li key={i} className="px-3 py-2 text-sm font-medium text-gray-700">
                      {i + 1}. {name}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setIsPreviewing(false)}
                  variant="secondary"
                  size="md"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleImport} variant="primary" size="md" className="flex-1">
                  Import All
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
