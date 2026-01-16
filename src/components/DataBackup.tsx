import { useState, useRef } from "react";
import { Download, Upload, AlertTriangle, CheckCircle, Share2 } from "lucide-react"; // ✅ Added Share2 icon
import { useToast } from "../hooks/useToast";
import { ConfirmModal } from "./ConfirmModal";
import { safeGetItem, safeSetItem, STORAGE_KEYS } from "../utils/storage";

export function DataBackup() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { showToast } = useToast();

  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState({ count: 0, school: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. EXPORT HANDLER
  const handleExport = () => {
    try {
      const students = safeGetItem(STORAGE_KEYS.STUDENTS);
      const settings = safeGetItem(STORAGE_KEYS.SETTINGS);

      const parsedSettings = settings ? JSON.parse(settings) : {};
      const parsedStudents = students ? JSON.parse(students) : [];

      const backup = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        students: parsedStudents,
        settings: parsedSettings,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const schoolName = parsedSettings.schoolName || "School";
      const className = parsedSettings.className || "Class";
      const date = new Date().toISOString().split("T")[0];

      // Filename optimized for WhatsApp (e.g., "Class6_Data_2025.json")
      link.href = url;
      link.download = `${schoolName}_${className}_${date}.json`.replace(/\s+/g, "_");

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus("success");
      showToast("File saved! You can now send this via WhatsApp.", "success");
      setMessage(`File downloaded. Check your 'Downloads' folder.`);
      setTimeout(() => setStatus("idle"), 5000);
    } catch (error) {
      setStatus("error");
      setMessage("Failed to save file.");
      console.error(error);
    }
  };

  // 2. FILE SELECTION
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content);

        if (!backup.students || !backup.settings) {
          throw new Error("Invalid file format");
        }

        setPendingFile(file);
        setImportStats({
          count: backup.students.length,
          school: backup.settings.schoolName || "Unknown School",
        });
        setShowImportModal(true);
      } catch {
        setStatus("error");
        showToast("Invalid file. Please select a valid Repota file.", "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // 3. IMPORT EXECUTION
  const executeImport = () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const backup = JSON.parse(content);

      safeSetItem(STORAGE_KEYS.STUDENTS, JSON.stringify(backup.students));
      safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(backup.settings));

      setStatus("success");
      showToast("Class data loaded successfully!", "success");
      setTimeout(() => window.location.reload(), 1000);
    };
    reader.readAsText(pendingFile);
    setShowImportModal(false);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-blue-50 p-2">
          <Share2 className="h-5 w-5 text-blue-600" />
        </div>
        <h2 className="text-base font-bold tracking-wide text-gray-800 uppercase">
          Share & Transfer Data
        </h2>
      </div>

      <p className="mb-6 text-sm leading-relaxed text-gray-600">
        Need to switch from your phone to a laptop? Or send this class to another teacher?
        <br />
        Save this file and send it via <strong>WhatsApp (Document)</strong> or Bluetooth.
      </p>

      {/* Status Message */}
      {status !== "idle" && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg p-3 ${
            status === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {status === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{message}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={handleExport}
          className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-bold text-white shadow-sm transition-colors active:scale-95"
        >
          <Download className="h-4 w-4" />
          Save Class File
        </button>

        <label className="bg-background flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 font-bold text-gray-700 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 active:scale-95">
          <Upload className="h-4 w-4" />
          Load Class File
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Warning Notice */}
      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-blue-600" />
          <div className="text-xs text-blue-800">
            <p className="font-bold">Working with other teachers?</p>
            <p className="mt-1">
              Pass this file like a baton. Finish your part, save it, and send it to the next
              teacher.
              <strong>Do not work on the same file at the same time</strong>, or someone's work will
              be lost.
            </p>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showImportModal}
        title="Load New Class Data?"
        message={`You are about to load "${importStats.school}" (${importStats.count} students). This will REPLACE the current data on this device.`}
        confirmText="Yes, Load File"
        cancelText="Cancel"
        isDangerous={true}
        onClose={() => {
          setShowImportModal(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        onConfirm={executeImport}
      />
    </div>
  );
}
