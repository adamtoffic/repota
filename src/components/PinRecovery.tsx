import { useState } from "react";
import { Key, AlertCircle, X } from "lucide-react";
import { verifyRecoveryCode, resetPinWithRecoveryCode } from "../utils/pinSecurity";

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

export function PinRecovery({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState<"verify" | "newPin" | "confirm">("verify");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const handleVerifyRecovery = async () => {
    if (recoveryCode.length !== 6) {
      setError("Recovery code must be 6 digits");
      return;
    }

    const isValid = await verifyRecoveryCode(recoveryCode);
    if (!isValid) {
      setError("Invalid recovery code. Please try again.");
      return;
    }

    setError("");
    setStep("newPin");
  };

  const handleNewPin = () => {
    if (newPin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }
    setError("");
    setStep("confirm");
  };

  const handleConfirmPin = async () => {
    if (confirmPin !== newPin) {
      setError("PINs do not match");
      return;
    }

    const success = await resetPinWithRecoveryCode(recoveryCode, newPin);
    if (success) {
      onComplete();
    } else {
      setError("Failed to reset PIN. Please try again.");
    }
  };

  if (step === "verify") {
    return (
      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-yellow-100 p-4">
              <Key className="h-12 w-12 text-yellow-600" />
            </div>
          </div>

          <h1 className="mb-3 text-center text-2xl font-bold text-gray-900">Enter Recovery Code</h1>
          <p className="mb-6 text-center text-sm text-gray-600">
            Enter the 6-digit recovery code you saved when you set up your PIN.
          </p>

          <div className="mb-6">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={recoveryCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setRecoveryCode(value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyRecovery()}
              className="w-full rounded-lg border-2 border-gray-300 p-4 text-center text-3xl font-bold tracking-widest transition-all outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-200"
              placeholder="000000"
              autoFocus
            />

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleVerifyRecovery}
            className="w-full rounded-lg bg-yellow-600 px-4 py-3 font-bold text-white shadow-md transition-all hover:bg-yellow-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={recoveryCode.length !== 6}
          >
            Verify Code
          </button>
        </div>
      </div>
    );
  }

  if (step === "newPin") {
    return (
      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>

          <h1 className="mb-3 text-center text-2xl font-bold text-gray-900">Create New PIN</h1>
          <p className="mb-6 text-center text-sm text-gray-600">Enter your new 4-digit PIN.</p>

          <div className="mb-6">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setNewPin(value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleNewPin()}
              className="w-full rounded-lg border-2 border-gray-300 p-4 text-center text-4xl font-bold tracking-widest transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-200"
              placeholder="••••"
              autoFocus
            />

            {error && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleNewPin}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={newPin.length !== 4}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // step === "confirm"
  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h1 className="mb-3 text-center text-2xl font-bold text-gray-900">Confirm New PIN</h1>
        <p className="mb-6 text-center text-sm text-gray-600">Re-enter your PIN to confirm.</p>

        <div className="mb-6">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setConfirmPin(value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleConfirmPin()}
            className="w-full rounded-lg border-2 border-gray-300 p-4 text-center text-4xl font-bold tracking-widest transition-all outline-none focus:border-green-500 focus:ring-4 focus:ring-green-200"
            placeholder="••••"
            autoFocus
          />

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setConfirmPin("");
              setStep("newPin");
            }}
            className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-3 font-bold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
          >
            Back
          </button>
          <button
            onClick={handleConfirmPin}
            className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-bold text-white shadow-md transition-all hover:bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={confirmPin.length !== 4}
          >
            Reset PIN
          </button>
        </div>
      </div>
    </div>
  );
}
