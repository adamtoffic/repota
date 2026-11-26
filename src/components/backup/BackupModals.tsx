import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, Lock, X } from "lucide-react";
import { useDialogA11y } from "../../hooks/useDialogA11y";
import { ConfirmModal } from "../ConfirmModal";
import { Input } from "../ui";
import { Modal } from "../ui/Modal";

interface BackupModalsProps {
  showReloadOverlay: boolean;
  showImportModal: boolean;
  importStats: {
    count: number;
    school: string;
    currentCount: number;
    warningCount: number;
  };
  isImporting: boolean;
  onCloseImportModal: () => void;
  onConfirmImport: () => void;
  showEmptyExportConfirm: boolean;
  onCloseEmptyExportConfirm: () => void;
  onConfirmEmptyExport: () => void;
  showExportPasswordModal: boolean;
  password: string;
  confirmPassword: string;
  passwordHint: string;
  showPassword: boolean;
  isExportPasswordMismatch: boolean;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordHintChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onCloseExportPasswordModal: () => void;
  onConfirmExportWithPassword: () => void;
  showImportPasswordModal: boolean;
  encryptionHint: string;
  importPassword: string;
  showImportPassword: boolean;
  isDecrypting: boolean;
  onImportPasswordChange: (value: string) => void;
  onToggleShowImportPassword: () => void;
  onCancelImportPasswordModal: () => void;
  onDecryptAndImport: () => void;
}

export function BackupModals({
  showReloadOverlay,
  showImportModal,
  importStats,
  isImporting,
  onCloseImportModal,
  onConfirmImport,
  showEmptyExportConfirm,
  onCloseEmptyExportConfirm,
  onConfirmEmptyExport,
  showExportPasswordModal,
  password,
  confirmPassword,
  passwordHint,
  showPassword,
  isExportPasswordMismatch,
  onPasswordChange,
  onConfirmPasswordChange,
  onPasswordHintChange,
  onToggleShowPassword,
  onCloseExportPasswordModal,
  onConfirmExportWithPassword,
  showImportPasswordModal,
  encryptionHint,
  importPassword,
  showImportPassword,
  isDecrypting,
  onImportPasswordChange,
  onToggleShowImportPassword,
  onCancelImportPasswordModal,
  onDecryptAndImport,
}: BackupModalsProps) {
  const modalIdPrefix = useId();
  const reloadDialogRef = useRef<HTMLDivElement>(null);
  const reloadTitleId = `${modalIdPrefix}-reload-title`;
  const exportTitleId = `${modalIdPrefix}-export-title`;
  const importTitleId = `${modalIdPrefix}-import-title`;
  const exportPasswordId = `${modalIdPrefix}-export-password`;
  const importPasswordId = `${modalIdPrefix}-import-password`;

  useDialogA11y({
    isOpen: showReloadOverlay,
    onClose: () => {},
    dialogRef: reloadDialogRef,
    closeOnEscape: false,
  });

  const reloadOverlayContent = showReloadOverlay ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6">
      <div
        ref={reloadDialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={reloadTitleId}
        className="border-border bg-elevated rounded-xl border p-6 text-center shadow-2xl focus:outline-none"
      >
        <h2 id={reloadTitleId} className="text-main text-lg font-bold">
          Backup loaded. Reloading...
        </h2>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-primary hover:bg-primary/90 mt-4 rounded-lg px-4 py-2 font-bold text-white"
        >
          Reload now
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {reloadOverlayContent &&
        (typeof document !== "undefined"
          ? createPortal(reloadOverlayContent, document.body)
          : reloadOverlayContent)}

      <ConfirmModal
        isOpen={showImportModal}
        title="Load New Class Data?"
        message={`You are about to load "${importStats.school}" (${importStats.count} students). This will replace ${importStats.currentCount} current students on this device.${importStats.warningCount > 0 ? ` ${importStats.warningCount} values look unusual and will be imported as-is.` : ""}`}
        confirmText={isImporting ? "Loading..." : "Yes, Load File"}
        cancelText="Cancel"
        isDangerous={true}
        onClose={onCloseImportModal}
        onConfirm={onConfirmImport}
      />

      <ConfirmModal
        isOpen={showEmptyExportConfirm}
        title="Save Empty Class File?"
        message="No students found. This backup will contain no students."
        confirmText="Yes, Save File"
        cancelText="Cancel"
        isDangerous={false}
        onClose={onCloseEmptyExportConfirm}
        onConfirm={onConfirmEmptyExport}
      />

      {/* Export Password Modal */}
      <Modal
        isOpen={showExportPasswordModal}
        onClose={onCloseExportPasswordModal}
        closeOnBackdrop={false}
        ariaLabelledBy={exportTitleId}
        className="max-h-[90dvh] max-w-md overflow-y-auto"
      >
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-950/60">
                <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 id={exportTitleId} className="text-main text-lg font-bold">
                Set Password
              </h3>
            </div>
            <button
              type="button"
              onClick={onCloseExportPasswordModal}
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
              <label
                htmlFor={exportPasswordId}
                className="text-secondary mb-1 block text-sm font-medium"
              >
                Password (min 4 characters)
              </label>
              <div className="relative">
                <Input
                  id={exportPasswordId}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  className="pr-10 text-sm"
                  placeholder="Enter password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onToggleShowPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-muted hover:text-main absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Input
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              error={isExportPasswordMismatch ? "Passwords do not match" : undefined}
              className="text-sm"
              placeholder="Re-enter password"
            />

            <div>
              <Input
                label="Password Hint (optional)"
                type="text"
                value={passwordHint}
                onChange={(e) => onPasswordHintChange(e.target.value)}
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
              onClick={onCloseExportPasswordModal}
              className="border-border-strong text-secondary hover:bg-subtle flex-1 rounded-lg border px-4 py-2.5 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmExportWithPassword}
              disabled={!password || password.length < 4 || password !== confirmPassword}
              className="flex-1 rounded-lg bg-amber-700 px-4 py-2.5 font-bold text-white hover:bg-amber-800 disabled:opacity-50"
            >
              Encrypt &amp; Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Password Modal */}
      <Modal
        isOpen={showImportPasswordModal}
        onClose={onCancelImportPasswordModal}
        closeOnBackdrop={false}
        ariaLabelledBy={importTitleId}
        className="max-h-[90dvh] max-w-md overflow-y-auto"
      >
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-950/60">
                <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 id={importTitleId} className="text-main text-lg font-bold">
                Password Required
              </h3>
            </div>
            <button
              type="button"
              onClick={onCancelImportPasswordModal}
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
              <label
                htmlFor={importPasswordId}
                className="text-secondary mb-1 block text-sm font-medium"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id={importPasswordId}
                  type={showImportPassword ? "text" : "password"}
                  value={importPassword}
                  onChange={(e) => onImportPasswordChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && importPassword) {
                      onDecryptAndImport();
                    }
                  }}
                  className="pr-10 text-sm"
                  placeholder="Enter password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onToggleShowImportPassword}
                  aria-label={showImportPassword ? "Hide password" : "Show password"}
                  className="text-muted hover:text-main absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md"
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
              onClick={onCancelImportPasswordModal}
              className="border-border-strong text-secondary hover:bg-subtle flex-1 rounded-lg border px-4 py-2.5 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDecryptAndImport}
              disabled={!importPassword || isDecrypting}
              className="bg-primary hover:bg-primary/90 flex-1 rounded-lg px-4 py-2.5 font-bold text-white disabled:opacity-50"
            >
              {isDecrypting ? "Decrypting..." : "Unlock File"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
