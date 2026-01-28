import { useState, useRef } from "react";
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Share2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "../hooks/useToast";
import { ConfirmModal } from "./ConfirmModal";
import { recordBackup } from "../utils/dataProtection";
import { loadFromStorage, saveToStorage, IDB_KEYS } from "../utils/idbStorage";
import { encryptBackupFile, decryptBackupFile, isEncryptedFile } from "../utils/fileEncryption";

export function DataBackup() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { showToast } = useToast();

  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState({ count: 0, school: "" });

  // Password protection state
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showExportPasswordModal, setShowExportPasswordModal] = useState(false);

  // Import password state
  const [showImportPasswordModal, setShowImportPasswordModal] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [encryptionHint, setEncryptionHint] = useState("");
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. EXPORT HANDLER - Opens password modal or exports directly
  const initiateExport = () => {
    if (usePassword) {
      setShowExportPasswordModal(true);
    } else {
      handleExport();
    }
  };

  const handleExport = async () => {
    try {
      const students = await loadFromStorage(IDB_KEYS.STUDENTS);
      const settings = await loadFromStorage(IDB_KEYS.SETTINGS);

      const parsedSettings = (settings || {}) as Record<string, unknown>;
      const parsedStudents = students || [];

      const backup = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        students: parsedStudents,
        settings: parsedSettings,
      };

      let finalData: unknown = backup;
      let fileExtension = "json";

      // Encrypt if password is provided
      if (usePassword && password) {
        if (password.length < 4) {
          showToast("Password must be at least 4 characters", "error");
          return;
        }
        if (password !== confirmPassword) {
          showToast("Passwords do not match", "error");
          return;
        }

        finalData = await encryptBackupFile(backup, password, passwordHint || undefined);
        fileExtension = "repota"; // Encrypted files get .repota extension
        showToast("File encrypted successfully! 🔒", "success");
      }

      const blob = new Blob([JSON.stringify(finalData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const schoolName = (parsedSettings.schoolName as string) || "School";
      const className = (parsedSettings.className as string) || "Class";
      const date = new Date().toISOString().split("T")[0];

      // Filename optimized for WhatsApp
      link.href = url;
      link.download = `${schoolName}_${className}_${date}.${fileExtension}`.replace(/\s+/g, "_");

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      recordBackup(); // Track backup timestamp

      setStatus("success");
      showToast(
        usePassword
          ? "Encrypted file saved! Share via WhatsApp 🔒"
          : "File saved! You can now send this via WhatsApp.",
        "success",
      );
      setMessage(`File downloaded. Check your 'Downloads' folder.`);

      // Reset password fields
      setShowExportPasswordModal(false);
      setPassword("");
      setConfirmPassword("");
      setPasswordHint("");

      setTimeout(() => setStatus("idle"), 5000);
    } catch (error) {
      setStatus("error");
      setMessage("Failed to save file.");
      console.error(error);
      showToast("Export failed. Please try again.", "error");
    }
  };

  // 2. FILE SELECTION - Detect if encrypted
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Check if file is encrypted
        if (isEncryptedFile(data)) {
          setEncryptionHint(data.hint || "");
          setPendingFile(file);
          setShowImportPasswordModal(true);
          return;
        }

        // Plain JSON file
        if (!data.students || !data.settings) {
          throw new Error("Invalid file format");
        }
        setPendingFile(file);
        setImportStats({
          count: data.students.length,
          school: (data.settings.schoolName as string) || "Unknown School",
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

  // 3. DECRYPT AND IMPORT
  const handleDecryptAndImport = async () => {
    if (!pendingFile || !importPassword) {
      showToast("Please enter the password", "error");
      return;
    }

    setIsDecrypting(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const encryptedData = JSON.parse(content);

        // Decrypt the file
        const decryptedBackup = await decryptBackupFile<{
          students: unknown[];
          settings: Record<string, unknown>;
        }>(encryptedData, importPassword);

        // Validate decrypted data
        if (!decryptedBackup.students || !decryptedBackup.settings) {
          throw new Error("Invalid backup data");
        }

        // Show confirmation modal with decrypted stats
        setImportStats({
          count: decryptedBackup.students.length,
          school: (decryptedBackup.settings.schoolName as string) || "Unknown School",
        });
        setShowImportPasswordModal(false);
        setShowImportModal(true);
        setImportPassword("");
        showToast("File decrypted successfully! 🔓", "success");
      } catch (error) {
        console.error("Decryption error:", error);
        showToast(
          error instanceof Error ? error.message : "Incorrect password. Please try again.",
          "error",
        );
      } finally {
        setIsDecrypting(false);
      }
    };
    reader.readAsText(pendingFile);
  };

  // 4. IMPORT EXECUTION
  const executeImport = async () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let backup = JSON.parse(content);

        // If encrypted, decrypt first
        if (isEncryptedFile(backup)) {
          backup = await decryptBackupFile(backup, importPassword);
        }

        await saveToStorage(IDB_KEYS.STUDENTS, backup.students);
        await saveToStorage(IDB_KEYS.SETTINGS, backup.settings);

        setStatus("success");
        showToast("Class data loaded successfully!", "success");
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        showToast("Failed to import file. Please try again.", "error");
        console.error(error);
      }
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

      {/* Password Protection Toggle */}
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={usePassword}
            onChange={(e) => setUsePassword(e.target.checked)}
            className="mt-0.5 h-5 w-5 cursor-pointer rounded border-amber-300 text-amber-600 focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600" />
              <span className="font-bold text-amber-900">Password protect this file</span>
            </div>
            <p className="mt-1 text-xs text-amber-700">
              Recommended when sharing via WhatsApp or email. Only people with the password can open
              this file.
            </p>
          </div>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={initiateExport}
          className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-bold text-white shadow-sm transition-colors active:scale-95"
        >
          {usePassword ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {usePassword ? "Save Encrypted File" : "Save Class File"}
        </button>

        <label className="bg-background flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 font-bold text-gray-700 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 active:scale-95">
          <Upload className="h-4 w-4" />
          Load Class File
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.repota"
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

      {/* Export Password Modal */}
      {showExportPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <Lock className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Set Password</h3>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              Create a password to encrypt this file. You'll need this password to open the file
              later.
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password (min 4 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 pr-10 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    placeholder="Enter password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  placeholder="Re-enter password"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Password Hint (optional)
                </label>
                <input
                  type="text"
                  value={passwordHint}
                  onChange={(e) => setPasswordHint(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  placeholder="e.g., 'My birth year'"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This hint will be shown when someone tries to open the file
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowExportPasswordModal(false);
                  setPassword("");
                  setConfirmPassword("");
                  setPasswordHint("");
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!password || password.length < 4}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Encrypt & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Password Modal */}
      {showImportPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Password Required</h3>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              This file is password-protected. Enter the password to decrypt and load the data.
            </p>

            {encryptionHint && (
              <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <strong>💡 Hint:</strong> {encryptionHint}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showImportPassword ? "text" : "password"}
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && importPassword) {
                        handleDecryptAndImport();
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 p-2.5 pr-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    placeholder="Enter password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowImportPassword(!showImportPassword)}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showImportPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowImportPasswordModal(false);
                  setImportPassword("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDecryptAndImport}
                disabled={!importPassword || isDecrypting}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isDecrypting ? "Decrypting..." : "Unlock File"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
