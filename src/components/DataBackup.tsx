import { useState } from "react";
import { Download, Upload, Database, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "../hooks/useToast";

// Add this component to your Settings page
export function DataBackup() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { showToast } = useToast();

  // Export all data as JSON file
  const handleExport = () => {
    try {
      const students = localStorage.getItem("ges_v1_students");
      const settings = localStorage.getItem("ges_v1_settings");

      const backup = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        students: students ? JSON.parse(students) : [],
        settings: settings ? JSON.parse(settings) : {},
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      // Create filename with school name and date
      const schoolName = backup.settings.name || "School";
      const date = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `${schoolName}_Backup_${date}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatus("success");
      showToast(`Backup downloaded: ${backup.students.length} students included.`, "info");
      setMessage(`Backup downloaded successfully! (${backup.students.length} students)`);
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      setStatus("error");
      setMessage("Failed to create backup. Please try again.");
      console.error("Export error:", error);
    }
  };

  // Import data from JSON file
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content);

        // Validate backup structure
        if (!backup.version || !backup.students || !backup.settings) {
          throw new Error("Invalid backup file format");
        }

        // Confirm before overwriting
        const studentCount = backup.students.length;
        const confirmMsg = `This will replace your current data with ${studentCount} students from ${backup.settings.name}. Continue?`;

        if (!confirm(confirmMsg)) {
          setStatus("idle");
          setMessage("Import cancelled.");
          return;
        }

        // Restore data
        localStorage.setItem("ges_v1_students", JSON.stringify(backup.students));
        localStorage.setItem("ges_v1_settings", JSON.stringify(backup.settings));

        setStatus("success");
        showToast("Data restored successfully! Refreshing...", "success");
        setMessage(`Successfully restored ${studentCount} students. Refreshing...`);

        // Reload page to reflect changes
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        setStatus("error");
        setMessage("Invalid backup file. Please check the file and try again.");
        console.error("Import error:", error);
      }
    };

    reader.readAsText(file);
    event.target.value = ""; // Reset input
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Database className="h-5 w-5 text-blue-600" />
        <h2 className="text-base font-bold tracking-wide text-gray-800 uppercase">
          Data Backup & Restore
        </h2>
      </div>

      <p className="mb-6 text-sm text-gray-600">
        Export your data regularly to prevent loss if browser data is cleared. You can restore your
        data anytime from a backup file.
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
        {/* Export Button */}
        <button
          onClick={handleExport}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          Download Backup
        </button>

        {/* Import Button */}
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 font-bold text-gray-700 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700">
          <Upload className="h-4 w-4" />
          Restore from Backup
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </div>

      {/* Warning Notice */}
      <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600" />
          <div className="text-xs text-orange-800">
            <p className="font-bold">Important:</p>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>Export your data weekly or after major updates</li>
              <li>Store backup files safely (Google Drive, USB, etc.)</li>
              <li>Restoring will replace all current data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
