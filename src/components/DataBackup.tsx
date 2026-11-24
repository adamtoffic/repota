import { useContext, useState, useRef, useEffect } from "react";
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Share2,
  Lock,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { useToast } from "../hooks/useToast";
import { ConfirmModal } from "./ConfirmModal";
import { Modal } from "./ui/Modal";
import { recordBackup } from "../utils/dataProtection";
import {
  loadFromStorageResult,
  saveToStorage,
  deleteFromStorage,
  saveEntriesToStorage,
  IDB_KEYS,
} from "../utils/idbStorage";
import {
  encryptAppSealedBackup,
  encryptBackupFile,
  decryptBackupFile,
  isEncryptedFile,
  requiresPassword,
} from "../utils/fileEncryption";
import { Input } from "./ui";
import { useSchoolData } from "../hooks/useSchoolData";
import {
  createBackupPayload,
  importBackupAtomically,
  IncompleteRollbackError,
  validateBackup,
} from "../utils/backupValidation";
import type { RecoveryAction } from "../context/SchoolContextDefinition";
import { SettingsFormContext } from "../context/SettingsFormContextDefinition";
import { isIOSDevice } from "../utils/iosInteraction";
import { captureEvent } from "../utils/analytics";
import { isDemoStudent } from "../utils/reportAnalytics";

export interface DataBackupProps {
  recoveryOnly?: boolean;
  disabled?: boolean;
  activeRecoveryAction?: RecoveryAction;
  onRecoveryActionChange?: (action: RecoveryAction) => void;
}

export function DataBackup({
  recoveryOnly = false,
  disabled = false,
  activeRecoveryAction: activeRecoveryActionProp,
  onRecoveryActionChange,
}: DataBackupProps) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { showToast } = useToast();
  const {
    loadError,
    students,
    suspendPersistence,
    resumePersistence,
    isStorageReady,
    markIncompleteRollback,
    clearIncompleteRollback,
    isRollbackIncomplete,
    activeRecoveryAction: contextRecoveryAction,
    setActiveRecoveryAction: contextSetRecoveryAction,
    waitForMigration,
    flushPendingWrites,
  } = useSchoolData();
  const settingsFormCtx = useContext(SettingsFormContext);

  const currentRecoveryAction = activeRecoveryActionProp ?? contextRecoveryAction ?? null;
  const setRecoveryAction = onRecoveryActionChange ?? contextSetRecoveryAction;
  const hasForeignRecoveryOwner =
    currentRecoveryAction !== null && currentRecoveryAction !== "import";
  const hasForeignRecoveryOwnerRef = useRef(hasForeignRecoveryOwner);
  const isRecoveryBusy = Boolean(currentRecoveryAction) || disabled;

  useEffect(() => {
    hasForeignRecoveryOwnerRef.current = hasForeignRecoveryOwner;
  }, [hasForeignRecoveryOwner]);
  const [showReloadOverlay, setShowReloadOverlay] = useState(false);
  const isImportingRef = useRef(false);
  const activeReaderRef = useRef<FileReader | null>(null);
  const isUnmountedRef = useRef(false);
  const decryptAttemptRef = useRef(0);
  const [isImporting, setIsImporting] = useState(false);

  const releaseImportRecoveryOwnership = () => {
    if (!hasForeignRecoveryOwner && typeof setRecoveryAction === "function") {
      setRecoveryAction(null);
    }
  };

  useEffect(() => {
    isUnmountedRef.current = false;
    ++decryptAttemptRef.current;
    return () => {
      isUnmountedRef.current = true;
      if (activeReaderRef.current) {
        try {
          activeReaderRef.current.abort();
        } catch {
          // ignore
        }
        activeReaderRef.current = null;
      }
      if (
        !isImportingRef.current &&
        !hasForeignRecoveryOwnerRef.current &&
        typeof setRecoveryAction === "function"
      ) {
        setRecoveryAction(null);
      }
    };
  }, [setRecoveryAction]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState({
    count: 0,
    school: "",
    currentCount: 0,
    warningCount: 0,
  });
  const [decryptedBackupData, setDecryptedBackupData] = useState<{
    students: unknown[];
    settings: Record<string, unknown>;
  } | null>(null);

  // Password protection state
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordHint, setPasswordHint] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showExportPasswordModal, setShowExportPasswordModal] = useState(false);

  // Empty export confirmation state
  const [showEmptyExportConfirm, setShowEmptyExportConfirm] = useState(false);

  // Import password state
  const [showImportPasswordModal, setShowImportPasswordModal] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [encryptionHint, setEncryptionHint] = useState("");
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isIOS = isIOSDevice();

  const resetExportPasswordState = () => {
    setShowExportPasswordModal(false);
    setPassword("");
    setConfirmPassword("");
    setPasswordHint("");
  };

  const cancelImportPasswordModal = () => {
    ++decryptAttemptRef.current;
    if (activeReaderRef.current) {
      try {
        activeReaderRef.current.abort();
      } catch {
        // ignore
      }
      activeReaderRef.current = null;
    }
    setIsDecrypting(false);
    setShowImportPasswordModal(false);
    setDecryptedBackupData(null);
    setImportPassword("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    releaseImportRecoveryOwnership();
  };

  const isExportPasswordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (isIOS) {
      // Defer revocation so iOS/Safari WebKit completes the download before the blob URL invalidates
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      URL.revokeObjectURL(url);
    }
  };

  // 1. EXPORT HANDLER - Opens password modal or exports directly
  const initiateExport = () => {
    if (usePassword) {
      setShowExportPasswordModal(true);
    } else {
      void handleExport();
    }
  };

  const handleExport = async (skipEmptyCheck = false) => {
    try {
      if (loadError || isRollbackIncomplete) {
        throw new Error("Data could not be read. Please use Try again before exporting.");
      }

      if (usePassword) {
        if (!password || password.length < 4) {
          showToast("Password must be at least 4 characters", "error");
          return;
        }
        if (password !== confirmPassword) {
          showToast("Passwords do not match", "error");
          return;
        }
      }

      // Flush any debounced settings or school edits before reading storage for export
      settingsFormCtx?.flushPendingSave();
      await flushPendingWrites?.();

      const studentsResult = await loadFromStorageResult<unknown[]>(IDB_KEYS.STUDENTS);
      const settingsResult = await loadFromStorageResult<Record<string, unknown>>(IDB_KEYS.SETTINGS);
      if (studentsResult.status === "error" || settingsResult.status === "error") {
        throw new Error("Data could not be read. Please use Try again before exporting.");
      }
      const parsedStudents = studentsResult.status === "found" ? studentsResult.value : [];
      const parsedSettings = settingsResult.status === "found" ? settingsResult.value : {};
      if (parsedStudents.length === 0 && !skipEmptyCheck) {
        setShowExportPasswordModal(false);
        setShowEmptyExportConfirm(true);
        return;
      }

      const backup = createBackupPayload(parsedStudents, parsedSettings);

      // Every saved .repota file is AES-256-GCM encrypted (app-sealed by default, or password-locked).
      const finalData =
        usePassword && password
          ? await encryptBackupFile(backup, password, passwordHint || undefined)
          : await encryptAppSealedBackup(backup);

      const serialized = JSON.stringify(finalData);
      const blob = new Blob([serialized], {
        type: "application/octet-stream",
      });

      const schoolName = (parsedSettings.schoolName as string) || "School";
      const className = (parsedSettings.className as string) || "Class";
      const date = new Date().toISOString().split("T")[0];
      const fileName = `${schoolName}_${className}_${date}.repota`.replace(/\s+/g, "_");

      let sharedViaOs = false;
      const shareFile =
        typeof File !== "undefined" ? new File([blob], fileName, { type: "application/octet-stream" }) : null;
      const nav = typeof navigator !== "undefined" ? navigator : undefined;
      if (shareFile && nav && typeof nav.share === "function" && nav.canShare?.({ files: [shareFile] })) {
        try {
          await nav.share({
            files: [shareFile],
            title: `${schoolName} (${className}) Class Backup`,
          });
          sharedViaOs = true;
        } catch (shareError) {
          if (shareError instanceof Error && shareError.name === "AbortError") {
            resetExportPasswordState();
            showToast("Share canceled", "info");
            return;
          }
          // Fall back to direct download if OS share fails or user activation expired after crypto
          triggerBlobDownload(blob, fileName);
        }
      } else {
        triggerBlobDownload(blob, fileName);
      }

      recordBackup(); // Track backup timestamp

      const demoCount = parsedStudents.filter(
        (item) => Boolean(item && typeof item === "object" && isDemoStudent(item as { id: string })),
      ).length;
      const realCount = parsedStudents.length - demoCount;
      captureEvent("Backup_Exported", {
        password_protected: Boolean(usePassword && password),
        delivery_method: sharedViaOs ? "os_share" : "download",
        students_count: parsedStudents.length,
        is_demo: demoCount > 0 && realCount === 0,
      });

      setStatus("success");
      showToast(
        sharedViaOs
          ? "Encrypted backup shared! 🔒"
          : usePassword
            ? "Password-locked .repota file saved! Share via WhatsApp 🔒"
            : "Encrypted .repota file saved! Share via WhatsApp 🔒",
        "success",
      );
      setMessage(
        sharedViaOs
          ? "Encrypted .repota backup sent via share sheet."
          : "Encrypted .repota file downloaded. Check your 'Downloads' folder.",
      );

      resetExportPasswordState();
      setShowEmptyExportConfirm(false);

      setTimeout(() => setStatus("idle"), 5000);
    } catch (error) {
      setStatus("error");
      const errorMessage =
        error instanceof Error ? error.message : "Export failed. Please try again.";
      setMessage(errorMessage);
      console.error(error);
      showToast(errorMessage, "error");
    }
  };

  // 2. FILE SELECTION - Detect if encrypted
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (hasForeignRecoveryOwner) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      showToast("Another recovery action is already in progress.", "error");
      return;
    }

    const attempt = ++decryptAttemptRef.current;
    if (typeof setRecoveryAction === "function") {
      setRecoveryAction("import");
    }

    const reader = new FileReader();
    activeReaderRef.current = reader;
    const handleReaderError = () => {
      if (activeReaderRef.current === reader) {
        activeReaderRef.current = null;
      }
      if (isUnmountedRef.current || decryptAttemptRef.current !== attempt) return;
      setDecryptedBackupData(null);
      releaseImportRecoveryOwnership();
      setStatus("error");
      showToast("Failed to read the selected file. Please try again.", "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.onerror = handleReaderError;
    reader.onabort = handleReaderError;
    reader.onload = async (e) => {
      if (activeReaderRef.current === reader) {
        activeReaderRef.current = null;
      }
      if (isUnmountedRef.current || decryptAttemptRef.current !== attempt) return;
      try {
        const content = (e.target?.result as string).replace(/^\uFEFF/, "").trim();
        const data = JSON.parse(content);

        let rawBackup: unknown = data;

        // Handle encrypted envelopes (v1 password-only, v2 password or app-sealed)
        if (isEncryptedFile(data)) {
          if (requiresPassword(data)) {
            setDecryptedBackupData(null);
            setEncryptionHint(data.hint || "");
            setPendingFile(file);
            setShowImportPasswordModal(true);
            return;
          }

          rawBackup = await decryptBackupFile(data);
          if (isUnmountedRef.current || decryptAttemptRef.current !== attempt) return;
        }

        const validated = validateBackup(rawBackup);
        setDecryptedBackupData(validated);
        setPendingFile(file);
        setImportStats({
          count: validated.students.length,
          school: (validated.settings.schoolName as string) || "Unknown School",
          currentCount: students.length,
          warningCount: validated.warningCount,
        });
        setShowImportModal(true);
      } catch {
        if (isUnmountedRef.current || decryptAttemptRef.current !== attempt) return;
        setDecryptedBackupData(null);
        releaseImportRecoveryOwnership();
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

    const attempt = ++decryptAttemptRef.current;
    setIsDecrypting(true);

    const reader = new FileReader();
    activeReaderRef.current = reader;
    const handleDecryptReaderError = () => {
      if (activeReaderRef.current === reader) {
        activeReaderRef.current = null;
      }
      if (isUnmountedRef.current || decryptAttemptRef.current !== attempt) return;
      setIsDecrypting(false);
      showToast("Failed to read the selected file. Please try again.", "error");
    };
    reader.onerror = handleDecryptReaderError;
    reader.onabort = handleDecryptReaderError;
    reader.onload = async (e) => {
      if (activeReaderRef.current === reader) {
        activeReaderRef.current = null;
      }
      if (isUnmountedRef.current || decryptAttemptRef.current !== attempt) return;
      try {
        const content = (e.target?.result as string).replace(/^\uFEFF/, "").trim();
        const encryptedData = JSON.parse(content);

        // Decrypt the file
        const decryptedBackup = await decryptBackupFile<{
          students: unknown[];
          settings: Record<string, unknown>;
        }>(encryptedData, importPassword);

        if (isUnmountedRef.current || decryptAttemptRef.current !== attempt) return;

        // Validate decrypted data
        const validated = validateBackup(decryptedBackup);

        // Show confirmation modal with decrypted stats
        setImportStats({
          count: validated.students.length,
          school: (validated.settings.schoolName as string) || "Unknown School",
          currentCount: students.length,
          warningCount: validated.warningCount,
        });
        setDecryptedBackupData(validated); // Store validated data
        setShowImportPasswordModal(false);
        setShowImportModal(true);
        setImportPassword("");
        showToast("File decrypted successfully! 🔓", "success");
      } catch (error) {
        if (isUnmountedRef.current || decryptAttemptRef.current !== attempt) return;
        console.error("Decryption error:", error);
        showToast(
          error instanceof Error ? error.message : "Incorrect password. Please try again.",
          "error",
        );
      } finally {
        if (!isUnmountedRef.current && decryptAttemptRef.current === attempt) {
          setIsDecrypting(false);
        }
      }
    };
    reader.readAsText(pendingFile);
  };

  // 4. IMPORT EXECUTION
  const executeImport = async () => {
    if (isImportingRef.current) return;
    if (hasForeignRecoveryOwner) {
      setDecryptedBackupData(null);
      setShowImportModal(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showToast("Another recovery action is already in progress.", "error");
      return;
    }
    isImportingRef.current = true;
    setIsImporting(true);
    if (typeof setRecoveryAction === "function") {
      setRecoveryAction("import");
    }

    try {
      let backup;

      // If we have decrypted data, use it
      if (decryptedBackupData) {
        backup = decryptedBackupData;
      } else if (pendingFile) {
        // Otherwise read and parse the file
        const reader = new FileReader();
        const content = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsText(pendingFile);
        });
        backup = JSON.parse(content.replace(/^\uFEFF/, "").trim());
      } else {
        throw new Error("No file to import");
      }

      if (isStorageReady === false) {
        throw new Error("Storage is still initializing. Try the recovery again shortly.");
      }

      if (typeof waitForMigration === "function") {
        await waitForMigration();
      }

      suspendPersistence();
      try {
        await importBackupAtomically(
          backup,
          loadFromStorageResult,
          saveToStorage,
          recoveryOnly,
          deleteFromStorage,
          saveEntriesToStorage,
        );
      } catch (error) {
        if (error instanceof IncompleteRollbackError) {
          if (typeof markIncompleteRollback === "function") {
            markIncompleteRollback();
          } else {
            try {
              localStorage.setItem("repota_incomplete_rollback", "true");
            } catch {
              // ignore
            }
          }
        } else {
          resumePersistence();
        }
        throw error;
      }

      if (isRollbackIncomplete && !loadError) {
        try {
          localStorage.removeItem("repota_incomplete_rollback");
        } catch {
          // ignore
        }
      } else if (typeof clearIncompleteRollback === "function") {
        clearIncompleteRollback();
      } else {
        try {
          localStorage.removeItem("repota_incomplete_rollback");
        } catch {
          // ignore
        }
      }
      setStatus("success");
      showToast("Class data loaded successfully!", "success");

      const warningCount =
        typeof (backup as { warningCount?: unknown }).warningCount === "number"
          ? (backup as { warningCount: number }).warningCount
          : 0;
      captureEvent("Backup_Restored", {
        students_count: backup.students.length,
        from_recovery_mode: Boolean(recoveryOnly),
        had_warnings: warningCount > 0,
      });

      // Clean up
      setShowReloadOverlay(true);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      isImportingRef.current = false;
      setIsImporting(false);
      if (typeof setRecoveryAction === "function") {
        setRecoveryAction(null);
      }
      showToast(error instanceof Error ? error.message : "Failed to import file. Please try again.", "error");
      console.error(error);
    } finally {
      setDecryptedBackupData(null);
      setShowImportModal(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border-border bg-surface rounded-xl border p-6 shadow-sm">
      {showReloadOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6">
          <div className="border-border bg-elevated rounded-xl border p-6 text-center shadow-2xl">
            <h2 className="text-main text-lg font-bold">Backup loaded. Reloading...</h2>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-primary hover:bg-primary/90 mt-4 rounded-lg px-4 py-2 font-bold text-white"
            >
              Reload now
            </button>
          </div>
        </div>
      )}
      {isRollbackIncomplete && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 dark:text-red-200">
                Incomplete Restore / Storage Inconsistency
              </h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                A previous backup import encountered a storage error and could not be fully rolled back.
                Persistence has been suspended to prevent data corruption. Please choose a valid backup file below to restore.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-950/60">
          <Share2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-main text-base font-bold tracking-wide uppercase">
          Share & Transfer Data
        </h2>
      </div>

      {!recoveryOnly && <p className="text-secondary mb-6 text-sm leading-relaxed">
        Need to switch from your phone to a laptop? Or send this class to another teacher?
        <br />
        Save this file and send it via <strong>WhatsApp (Document)</strong> or Bluetooth.
      </p>}

      {/* Status Message */}
      {status !== "idle" && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg p-3 ${
            status === "success"
              ? "bg-green-50 text-green-800 dark:bg-emerald-950/50 dark:text-emerald-200"
              : "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200"
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

      {!recoveryOnly && (
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/70 dark:bg-amber-950/45">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={usePassword}
            onChange={(e) => setUsePassword(e.target.checked)}
            className="mt-0.5 h-5 w-5 cursor-pointer rounded border-amber-300 text-amber-600 focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="font-bold text-amber-900 dark:text-amber-200">
                Password protect this file
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Every saved .repota file is encrypted so WhatsApp and file apps cannot preview student
              records. Turn this on to add a password so only people with that password can open
              it.
            </p>
          </div>
        </label>
      </div>
      )}

      {/* Action Buttons */}
      <div className="grid gap-3 sm:grid-cols-2">
        {!recoveryOnly && <button
          onClick={initiateExport}
          disabled={loadError || isRollbackIncomplete || isImporting || isRecoveryBusy}
          className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-bold text-white shadow-sm transition-colors active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          {usePassword ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />}
          {usePassword ? "Save Encrypted File" : "Save Class File"}
        </button>}

        <label
          className={`bg-background border-border-strong text-secondary flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 font-bold transition-colors ${
            isImporting || isRecoveryBusy
              ? "pointer-events-none opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 active:scale-95 dark:hover:border-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-300"
          }`}
          onClick={(e) => {
            if (isImporting || isRecoveryBusy) {
              e.preventDefault();
            }
          }}
        >
          <Upload className="h-4 w-4" />
          Load Class File
          <input
            ref={fileInputRef}
            type="file"
            accept={isIOS ? undefined : ".json,.repota"}
            disabled={isImporting || isRecoveryBusy}
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {/* Warning Notice */}
      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-800/70 dark:bg-blue-950/45">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p className="font-bold">Working with other teachers?</p>
            <p className="mt-1">
              Pass this file like a baton. Finish your part, save it, and send it to the next
              teacher.{" "}
              <strong>Do not work on the same file at the same time</strong>, or someone's work will
              be lost.
            </p>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showImportModal}
        title="Load New Class Data?"
        message={`You are about to load "${importStats.school}" (${importStats.count} students). This will replace ${importStats.currentCount} current students on this device.${importStats.warningCount > 0 ? ` ${importStats.warningCount} values look unusual and will be imported as-is.` : ""}`}
        confirmText={isImporting ? "Loading..." : "Yes, Load File"}
        cancelText="Cancel"
        isDangerous={true}
        onClose={() => {
          if (!isImportingRef.current) {
            setShowImportModal(false);
            setDecryptedBackupData(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            releaseImportRecoveryOwnership();
          }
        }}
        onConfirm={executeImport}
      />

      <ConfirmModal
        isOpen={showEmptyExportConfirm}
        title="Save Empty Class File?"
        message="No students found. This backup will contain no students."
        confirmText="Yes, Save File"
        cancelText="Cancel"
        isDangerous={false}
        onClose={() => {
          setShowEmptyExportConfirm(false);
          resetExportPasswordState();
        }}
        onConfirm={() => {
          setShowEmptyExportConfirm(false);
          void handleExport(true);
        }}
      />

      {/* Export Password Modal */}
      <Modal
        isOpen={showExportPasswordModal}
        onClose={resetExportPasswordState}
        closeOnBackdrop={false}
        className="max-w-md"
      >
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-950/60">
                <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-main text-lg font-bold">Set Password</h3>
            </div>
            <button
              type="button"
              onClick={resetExportPasswordState}
              aria-label="Close modal"
              className="text-muted hover:bg-subtle hover:text-main rounded-lg p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-secondary mb-4 text-sm">
            Create a password to encrypt this file. You&apos;ll need this password to open the file
            later.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-secondary mb-1 block text-sm font-medium">
                Password (min 4 characters)
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 text-sm"
                  placeholder="Enter password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-muted hover:text-main absolute top-1/2 right-2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Input
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={isExportPasswordMismatch ? "Passwords do not match" : undefined}
              className="text-sm"
              placeholder="Re-enter password"
            />

            <div>
              <Input
                label="Password Hint (optional)"
                type="text"
                value={passwordHint}
                onChange={(e) => setPasswordHint(e.target.value)}
                className="text-sm"
                placeholder="e.g., 'My birth year'"
              />
              <p className="text-muted mt-1 text-xs">
                This hint will be shown when someone tries to open the file
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={resetExportPasswordState}
              className="border-border-strong text-secondary hover:bg-subtle flex-1 rounded-lg border px-4 py-2.5 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={!password || password.length < 4 || password !== confirmPassword}
              className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Encrypt &amp; Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Password Modal */}
      <Modal
        isOpen={showImportPasswordModal}
        onClose={cancelImportPasswordModal}
        closeOnBackdrop={false}
        className="max-w-md"
      >
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-950/60">
                <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-main text-lg font-bold">Password Required</h3>
            </div>
            <button
              type="button"
              onClick={cancelImportPasswordModal}
              aria-label="Close modal"
              className="text-muted hover:bg-subtle hover:text-main rounded-lg p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-secondary mb-4 text-sm">
            This file is password-protected. Enter the password to decrypt and load the data.
          </p>

          {encryptionHint && (
            <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:border dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200">
              <strong>💡 Hint:</strong> {encryptionHint}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-secondary mb-1 block text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  type={showImportPassword ? "text" : "password"}
                  value={importPassword}
                  onChange={(e) => setImportPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && importPassword) {
                      handleDecryptAndImport();
                    }
                  }}
                  className="pr-10 text-sm"
                  placeholder="Enter password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowImportPassword(!showImportPassword)}
                  aria-label={showImportPassword ? "Hide password" : "Show password"}
                  className="text-muted hover:text-main absolute top-1/2 right-2 -translate-y-1/2"
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
              type="button"
              onClick={cancelImportPasswordModal}
              className="border-border-strong text-secondary hover:bg-subtle flex-1 rounded-lg border px-4 py-2.5 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDecryptAndImport}
              disabled={!importPassword || isDecrypting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isDecrypting ? "Decrypting..." : "Unlock File"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
