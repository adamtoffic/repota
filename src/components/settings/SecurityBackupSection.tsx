import { useEffect } from "react";
import { AlertTriangle, Fingerprint, Key, Lock, RotateCcw, Trash2, Users } from "lucide-react";
import { DataBackup } from "../DataBackup";
import { StorageMonitor } from "../StorageMonitor";
import { Alert, Button } from "../ui";
import { isPinConfigured } from "../../utils/pinSecurity";
import { getBiometricName, isBiometricEnrolled } from "../../utils/biometricAuth";
import { useSettingsForm } from "../../hooks/useSettingsForm";

export function SecurityBackupSection() {
  const {
    formData,
    setFormData,
    isPersistenceSuspended,
    studentsCount,
    biometricAvailable,
    biometricType,
    enrollingBiometric,
    checkBiometric,
    handleEnrollBiometric,
    handleDisableBiometric,
    setShowPinSetup,
    setShowPinRecovery,
    setShowDisablePinModal,
    setShowClearStudentsModal,
    setShowFactoryResetModal,
    setShowFullAppResetModal,
  } = useSettingsForm();

  useEffect(() => {
    void checkBiometric();
  }, [checkBiometric]);

  return (
    <>
      <fieldset disabled={isPersistenceSuspended} className="m-0 min-w-0 border-0 p-0">
        {/* CARD 6: SECURITY & PRIVACY */}
        <div className="border-border bg-surface rounded-xl border p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2.5 dark:bg-emerald-950/60">
              <Lock className="h-5 w-5 text-green-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-main text-lg font-bold" data-record="true">
              Security & Privacy
            </h2>
          </div>

          <div className="space-y-4">
            <Alert
              variant="success"
              title={isPinConfigured() ? "PIN Lock Active" : "PIN Lock (Optional)"}
            >
              <p className="mb-4">
                Secure your student data with a 4-digit PIN. You'll need to enter it when opening
                the app.
              </p>
              <Button
                type="button"
                onClick={() => setShowPinSetup(true)}
                variant="primary"
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 sm:w-auto"
              >
                {isPinConfigured() ? "Change PIN" : "Enable PIN Lock"}
              </Button>
            </Alert>

            {isPinConfigured() && (
              <Alert
                variant="warning"
                title={
                  <>
                    <Key className="inline h-4 w-4" /> Forgot Your PIN?
                  </>
                }
              >
                <p className="mb-3">
                  Reset your PIN using your 6-digit recovery code or security questions.
                </p>
                <Button
                  type="button"
                  onClick={() => setShowPinRecovery(true)}
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Reset PIN with Recovery Code
                </Button>
              </Alert>
            )}

            {isPinConfigured() && (
              <Alert variant="error" title="Disable PIN Lock">
                <p className="mb-3">
                  Remove PIN protection from the app. This action cannot be undone.
                </p>
                <Button
                  type="button"
                  onClick={() => setShowDisablePinModal(true)}
                  variant="danger"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Disable PIN Lock
                </Button>
                <p className="mt-3 text-xs">
                  <strong>Lost your recovery code?</strong> Disabling PIN lock is the only way to
                  regain access. Your student data will remain safe.
                </p>
              </Alert>
            )}

            {isPinConfigured() && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/70 dark:bg-blue-950/45">
                <h3
                  className="mb-2 font-bold text-blue-900 dark:text-blue-200"
                  data-record="true"
                >
                  Auto-Lock Timer
                </h3>
                <p className="mb-3 text-sm text-blue-800 dark:text-blue-300">
                  Automatically lock the app after a period of inactivity.
                </p>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="autoLockTimeout"
                    className="text-sm font-medium text-blue-900 dark:text-blue-200"
                  >
                    Lock after:
                  </label>
                  <select
                    id="autoLockTimeout"
                    value={formData.autoLockTimeout || 5}
                    onChange={(e) =>
                      setFormData({ ...formData, autoLockTimeout: Number(e.target.value) })
                    }
                    className="bg-input text-main rounded-lg border border-blue-300 px-3 py-2 text-sm font-medium transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-blue-700/70"
                  >
                    <option value={1}>1 minute</option>
                    <option value={2}>2 minutes</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>
              </div>
            )}

            {isPinConfigured() && biometricAvailable && (
              <Alert
                variant="info"
                title={
                  <>
                    <Fingerprint className="inline h-4 w-4" /> {getBiometricName(biometricType)}
                  </>
                }
              >
                <p className="mb-3">
                  Use {getBiometricName(biometricType)} to unlock the app quickly. Your PIN will
                  still work as a backup.
                </p>

                {isBiometricEnrolled() ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="font-medium">
                        {getBiometricName(biometricType)} is enabled
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={handleDisableBiometric}
                      variant="secondary"
                      size="sm"
                    >
                      Disable {getBiometricName(biometricType)}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={handleEnrollBiometric}
                    disabled={enrollingBiometric}
                    variant="primary"
                    size="sm"
                    isLoading={enrollingBiometric}
                    className="w-full sm:w-auto"
                  >
                    {enrollingBiometric
                      ? "Setting up..."
                      : `Enable ${getBiometricName(biometricType)}`}
                  </Button>
                )}
              </Alert>
            )}
          </div>
        </div>
      </fieldset>

      {/* STORAGE MONITORING */}
      <StorageMonitor />

      {/* BACKUP & DANGER ZONE */}
      <DataBackup />

      {/* RESET & CLEANUP */}
      <div className="bg-surface rounded-xl border border-red-200 p-5 shadow-sm sm:p-6 dark:border-red-900/70">
        <div className="mb-1 flex items-center gap-3">
          <div className="rounded-lg bg-red-100 p-2.5 dark:bg-red-950/60">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-main text-lg font-bold" data-record="true">
              Reset &amp; Cleanup
            </h2>
            <p className="text-muted text-xs">
              Tip: Save a .repota backup above before clearing class or app data.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {/* Tier 1: New Class, Same School */}
          <div className="border-border bg-subtle flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-main flex items-center gap-2 text-sm font-bold" data-record="true">
                <Users className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
                <span>Remove All Students (New Class, Same School)</span>
              </h3>
              <p className="text-muted mt-1 text-xs leading-relaxed">
                Clears all students, scores, and photos while keeping your school identity, subjects,
                SBA tasks, and report style.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowClearStudentsModal(true)}
              variant="danger"
              size="sm"
              disabled={isPersistenceSuspended || studentsCount === 0}
              className="w-full shrink-0 sm:w-auto"
            >
              {studentsCount > 0 ? `Remove All Students (${studentsCount})` : "Remove All Students"}
            </Button>
          </div>

          {/* Tier 2: Restore Default Settings */}
          <div className="border-border bg-subtle flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-main flex items-center gap-2 text-sm font-bold" data-record="true">
                <RotateCcw className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Restore Default Settings (Keep Students)</span>
              </h3>
              <p className="text-muted mt-1 text-xs leading-relaxed">
                Resets school name, logo, signatures, subjects, SBA setup, and report style back to
                defaults while keeping all student records safe.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowFactoryResetModal(true)}
              variant="danger"
              size="sm"
              disabled={isPersistenceSuspended}
              className="w-full shrink-0 sm:w-auto"
            >
              Restore Factory Defaults
            </Button>
          </div>

          {/* Tier 3: Full App Reset */}
          <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/70 dark:bg-red-950/35">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200" data-record="true">
                <span className="inline-flex items-center gap-2">
                  <Trash2 className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>Reset Entire App (Start Completely Fresh)</span>
                </span>
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-red-800/90 dark:text-red-300/90">
                Permanently wipes all students, settings, photos, PIN/biometric lock, and preferences
                back to a first-visit state. Requires typing <strong>RESET</strong>.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowFullAppResetModal(true)}
              variant="danger"
              size="sm"
              disabled={isPersistenceSuspended}
              className="w-full shrink-0 sm:w-auto"
            >
              Reset Entire App
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
