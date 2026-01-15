import { useState, useRef } from "react";
import { Download, Upload, Database, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "../hooks/useToast";
import { ConfirmModal } from "./ConfirmModal"; // ✅ Import Modal
import { safeGetItem, safeSetItem, STORAGE_KEYS } from "../utils/storage"; // ✅ Use Safe Storage

export function DataBackup() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { showToast } = useToast();

  // ✅ STATE FOR MODAL
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState({ count: 0, school: "" });

  // Ref to reset file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. EXPORT HANDLER
  const handleExport = () => {
    try {
      const students = safeGetItem(STORAGE_KEYS.STUDENTS);
      const settings = safeGetItem(STORAGE_KEYS.SETTINGS);

      // Parse safely
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

      // Filename: "Royal_School_JHS2_Backup_2025-10-20.json"
      link.href = url;
      link.download = `${schoolName}_${className}_Backup_${date}.json`.replace(/\s+/g, "_");

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus("success");
      showToast(`Backup created with ${parsedStudents.length} students.`, "success");
      setMessage(`Backup downloaded! (${parsedStudents.length} students)`);
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      setStatus("error");
      setMessage("Failed to export data.");
      console.error(error);
    }
  };

  // 2. FILE SELECTION (Pre-Validation)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content);

        // Validate structure
        if (!backup.students || !backup.settings) {
          throw new Error("Invalid file format");
        }

        // ✅ Save file to state and OPEN MODAL instead of window.confirm
        setPendingFile(file);
        setImportStats({
          count: backup.students.length,
          school: backup.settings.schoolName || "Unknown School",
        });
        setShowImportModal(true);
      } catch (error) {
        setStatus("error");
        showToast("Invalid backup file.", "error");
        if (fileInputRef.current) fileInputRef.current.value = ""; // Reset
      }
    };
    reader.readAsText(file);
  };

  // 3. ACTUAL IMPORT (After Modal Confirmation)
  const executeImport = () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const backup = JSON.parse(content);

      // Restore to LocalStorage
      safeSetItem(STORAGE_KEYS.STUDENTS, JSON.stringify(backup.students));
      safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(backup.settings));

      setStatus("success");
      showToast("Data restored! Reloading...", "success");
      setMessage("Restore complete. Refreshing app...");

      // Reload to apply changes (Context needs to re-mount to pick up storage changes if purely relying on init)
      setTimeout(() => window.location.reload(), 1000);
    };
    reader.readAsText(pendingFile);
    setShowImportModal(false);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Database className="h-5 w-5 text-blue-600" />
        <h2 className="text-base font-bold tracking-wide text-gray-800 uppercase">
          Share Class Data
        </h2>
      </div>

      <p className="mb-6 text-sm leading-relaxed text-gray-600">
        <strong>Going to the Cafe?</strong> Download your data here to take it with you. You can
        also send this file to another teacher to input scores.
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
        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95"
        >
          <Download className="h-4 w-4" />
          Save to Device
        </button>

        {/* Import */}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 font-bold text-gray-700 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 active:scale-95">
          <Upload className="h-4 w-4" />
          Load from Device
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
      <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600" />
          <div className="text-xs text-orange-800">
            <p className="font-bold">Team Work Tip:</p>
            <p className="mt-1">
              If you share this file with another teacher, <strong>wait for them to finish</strong>{" "}
              and send it back before you continue working. Otherwise, your changes might overwrite
              theirs!
            </p>
          </div>
        </div>
      </div>

      {/* ✅ CONFIRM IMPORT MODAL */}
      <ConfirmModal
        isOpen={showImportModal}
        title="Overwrite Current Data?"
        message={`You are about to load data for "${importStats.school}" containing ${importStats.count} students. This will REPLACE everything currently on this device.`}
        confirmText="Yes, Overwrite Everything"
        cancelText="Cancel"
        isDangerous={true}
        onClose={() => {
          setShowImportModal(false);
          if (fileInputRef.current) fileInputRef.current.value = ""; // Reset input
        }}
        onConfirm={executeImport}
      />
    </div>
  );
}
