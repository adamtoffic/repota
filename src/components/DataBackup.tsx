import { useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle, Download, Lock, Share2, Upload } from "lucide-react";
import type { RecoveryAction } from "../context/SchoolContextDefinition";
import { SettingsFormContext } from "../context/SettingsFormContextDefinition";
import {
  useSchoolActions,
  useSchoolLifecycle,
  useSchoolStudents,
} from "../hooks/useSchoolData";
import { useToast } from "../hooks/useToast";
import { captureEvent } from "../utils/analytics";
import { IncompleteRollbackError, importBackupAtomically } from "../utils/backupValidation";
import {
  IDB_KEYS,
  deleteFromStorage,
  loadFromStorageResult,
  saveEntriesToStorage,
  saveToStorage,
} from "../utils/idbStorage";
import { isIOSDevice } from "../utils/iosInteraction";
import { BackupModals } from "./backup/BackupModals";
import {
  buildEncryptedBackupArtifact,
  deliverEncryptedBackupBlob,
  parseIncomingBackupContent,
} from "./backup/backupOperations";

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
  const students = useSchoolStudents();
  const {
    loadError,
    isStorageReady,
    isRollbackIncomplete,
    activeRecoveryAction: contextRecoveryAction,
  } = useSchoolLifecycle();
  const {
    suspendPersistence,
    resumePersistence,
    markIncompleteRollback,
    clearIncompleteRollback,
    setActiveRecoveryAction: contextSetRecoveryAction,
    waitForMigration,
    flushPendingWrites,
  } = useSchoolActions();
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
    const attemptCounter = decryptAttemptRef;
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      ++attemptCounter.current;
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

      const artifact = await buildEncryptedBackupArtifact({
        parsedStudents,
        parsedSettings,
        usePassword,
        password,
        passwordHint,
      });

      const outcome = await deliverEncryptedBackupBlob(artifact);
      if (outcome === "canceled") {
        resetExportPasswordState();
        showToast("Share canceled", "info");
        return;
      }

      const sharedViaOs = outcome === "shared";
      captureEvent("Backup_Exported", {
        password_protected: Boolean(usePassword && password),
        delivery_method: sharedViaOs ? "os_share" : "download",
        students_count: parsedStudents.length,
        is_demo: artifact.demoCount > 0 && artifact.realCount === 0,
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
        const parsed = await parseIncomingBackupContent((e.target?.result as string) || "");
        if (isUnmountedRef.current || decryptAttemptRef.current !== attempt) return;

        if (parsed.requiresPassword) {
          setDecryptedBackupData(null);
          setEncryptionHint(parsed.hint);
          setPendingFile(file);
          setShowImportPasswordModal(true);
          return;
        }

        const validated = parsed.validated;
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
        const parsed = await parseIncomingBackupContent(
          (e.target?.result as string) || "",
          importPassword,
        );
        if (isUnmountedRef.current || decryptAttemptRef.current !== attempt) return;
        if (parsed.requiresPassword) {
          throw new Error("Incorrect password. Please try again.");
        }

        const validated = parsed.validated;
        setImportStats({
          count: validated.students.length,
          school: (validated.settings.schoolName as string) || "Unknown School",
          currentCount: students.length,
          warningCount: validated.warningCount,
        });
        setDecryptedBackupData(validated);
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
      if (decryptedBackupData) {
        backup = decryptedBackupData;
      } else if (pendingFile) {
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

      {!recoveryOnly && (
        <p className="text-secondary mb-6 text-sm leading-relaxed">
          Need to switch from your phone to a laptop? Or send this class to another teacher?
          <br />
          Save this file and send it via <strong>WhatsApp (Document)</strong> or Bluetooth.
        </p>
      )}

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
        {!recoveryOnly && (
          <button
            type="button"
            onClick={initiateExport}
            disabled={loadError || isRollbackIncomplete || isImporting || isRecoveryBusy}
            className="bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-bold text-white shadow-sm transition-colors active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {usePassword ? <Lock className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {usePassword ? "Save Encrypted File" : "Save Class File"}
          </button>
        )}

        <label
          className={`bg-background border-border-strong text-secondary flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 font-bold transition-colors ${
            isImporting || isRecoveryBusy
              ? "pointer-events-none cursor-not-allowed opacity-50"
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
              <strong>Do not work on the same file at the same time</strong>, or someone&apos;s work will
              be lost.
            </p>
          </div>
        </div>
      </div>

      <BackupModals
        showReloadOverlay={showReloadOverlay}
        showImportModal={showImportModal}
        importStats={importStats}
        isImporting={isImporting}
        onCloseImportModal={() => {
          if (!isImportingRef.current) {
            setShowImportModal(false);
            setDecryptedBackupData(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            releaseImportRecoveryOwnership();
          }
        }}
        onConfirmImport={executeImport}
        showEmptyExportConfirm={showEmptyExportConfirm}
        onCloseEmptyExportConfirm={() => {
          setShowEmptyExportConfirm(false);
          resetExportPasswordState();
        }}
        onConfirmEmptyExport={() => {
          setShowEmptyExportConfirm(false);
          void handleExport(true);
        }}
        showExportPasswordModal={showExportPasswordModal}
        password={password}
        confirmPassword={confirmPassword}
        passwordHint={passwordHint}
        showPassword={showPassword}
        isExportPasswordMismatch={isExportPasswordMismatch}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onPasswordHintChange={setPasswordHint}
        onToggleShowPassword={() => setShowPassword(!showPassword)}
        onCloseExportPasswordModal={resetExportPasswordState}
        onConfirmExportWithPassword={() => void handleExport()}
        showImportPasswordModal={showImportPasswordModal}
        encryptionHint={encryptionHint}
        importPassword={importPassword}
        showImportPassword={showImportPassword}
        isDecrypting={isDecrypting}
        onImportPasswordChange={setImportPassword}
        onToggleShowImportPassword={() => setShowImportPassword(!showImportPassword)}
        onCancelImportPasswordModal={cancelImportPasswordModal}
        onDecryptAndImport={handleDecryptAndImport}
      />
    </div>
  );
}
