import { useState } from "react";
import { Lock, Key, AlertCircle, CheckCircle, Copy } from "lucide-react";
import { setupPin, generateRecoveryCode } from "../utils/pinSecurity";

interface Props {
  onComplete: () => void;
}

export function PinSetup({ onComplete }: Props) {
  const [step, setStep] = useState<"intro" | "create" | "confirm" | "recovery">("intro");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [recoveryCode] = useState(generateRecoveryCode());
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreatePin = () => {
    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    setError("");
    setStep("confirm");
  };

  const handleConfirmPin = () => {
    if (confirmPin !== pin) {
      setError("PINs do not match");
      return;
    }
    setError("");
    setStep("recovery");
  };

  const handleFinishSetup = async () => {
    const success = await setupPin(pin, recoveryCode);
    if (success) {
      onComplete();
    } else {
      setError("Failed to set up PIN. Please try again.");
    }
  };

  const copyRecoveryCode = () => {
    navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === "intro") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-blue-100 p-4">
              <Lock className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <h1 className="mb-3 text-center text-2xl font-bold text-gray-900">Secure Your Data</h1>
          <p className="mb-6 text-center text-sm text-gray-600">
            Set up a 4-digit PIN to protect your student records from unauthorized access.
          </p>

          <div className="mb-6 space-y-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            <p className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Your data stays on this device only</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>No internet required</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>You'll receive a recovery code in case you forget your PIN</span>
            </p>
          </div>

          <button
            onClick={() => setStep("create")}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  if (step === "create") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-center text-xl font-bold text-gray-900">Create Your PIN</h2>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Enter 4-digit PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-center text-2xl tracking-widest focus:border-blue-500 focus:outline-none"
              placeholder="••••"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleCreatePin}
            disabled={pin.length !== 4}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-center text-xl font-bold text-gray-900">Confirm Your PIN</h2>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Re-enter your 4-digit PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-center text-2xl tracking-widest focus:border-blue-500 focus:outline-none"
              placeholder="••••"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("create");
                setConfirmPin("");
                setError("");
              }}
              className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleConfirmPin}
              disabled={confirmPin.length !== 4}
              className="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Recovery code step
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-amber-100 p-4">
            <Key className="h-12 w-12 text-amber-600" />
          </div>
        </div>

        <h2 className="mb-3 text-center text-xl font-bold text-gray-900">
          Save Your Recovery Code
        </h2>
        <p className="mb-6 text-center text-sm text-gray-600">
          Write this down in a safe place. You'll need it if you forget your PIN.
        </p>

        <div className="mb-6 rounded-lg bg-amber-50 p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-4xl font-bold tracking-wider text-amber-900">{recoveryCode}</span>
            <button
              onClick={copyRecoveryCode}
              className="rounded-lg bg-amber-200 p-2 text-amber-900 transition-colors hover:bg-amber-300"
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-xs text-amber-700">
            {copied ? "✓ Copied to clipboard!" : "Click to copy"}
          </p>
        </div>

        <div className="mb-6 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
          <p className="flex items-start gap-2 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>Important:</strong> Without this code, you won't be able to reset your PIN if
              you forget it. The only option will be to reset the entire app and lose all data.
            </span>
          </p>
        </div>

        <button
          onClick={handleFinishSetup}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          I've Saved My Recovery Code
        </button>
      </div>
    </div>
  );
}
