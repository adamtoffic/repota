import { Fingerprint, Key, Lock, RotateCcw } from "lucide-react";
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
    biometricAvailable,
    biometricType,
    enrollingBiometric,
    handleEnrollBiometric,
    handleDisableBiometric,
    setShowPinSetup,
    setShowPinRecovery,
    setShowDisablePinModal,
    setShowFactoryResetModal,
  } = useSettingsForm();

  return (
    <>
      <fieldset disabled={isPersistenceSuspended} className="m-0 min-w-0 border-0 p-0">
        {/* CARD 6: SECURITY & PRIVACY */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2.5">
              <Lock className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800" data-record="true">
              Security & Privacy
            </h2>
          </div>

          <div className="space-y-4">
            <Alert variant="success" title="PIN Lock (Optional)">
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
                <p className="mb-3">You'll need your 6-digit recovery code to reset your PIN.</p>
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
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h3 className="mb-2 font-bold text-blue-900" data-record="true">
                  Auto-Lock Timer
                </h3>
                <p className="mb-3 text-sm text-blue-800">
                  Automatically lock the app after a period of inactivity.
                </p>
                <div className="flex items-center gap-3">
                  <label htmlFor="autoLockTimeout" className="text-sm font-medium text-blue-900">
                    Lock after:
                  </label>
                  <select
                    id="autoLockTimeout"
                    value={formData.autoLockTimeout || 5}
                    onChange={(e) =>
                      setFormData({ ...formData, autoLockTimeout: Number(e.target.value) })
                    }
                    className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-900 transition-all outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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

      <Alert
        variant="error"
        title={
          <>
            <RotateCcw className="inline h-5 w-5" /> Reset Configuration
          </>
        }
      >
        <p className="mb-4">
          This will restore default subject lists and settings. Your student data will remain safe.
        </p>
        <Button
          onClick={() => setShowFactoryResetModal(true)}
          variant="danger"
          size="sm"
          disabled={isPersistenceSuspended}
          className="w-full sm:w-auto"
        >
          Restore Factory Defaults
        </Button>
      </Alert>
    </>
  );
}
