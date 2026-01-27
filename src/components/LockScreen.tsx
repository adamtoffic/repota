import { useState } from "react";
import { Lock, AlertCircle } from "lucide-react";
import { verifyPin } from "../utils/pinSecurity";

interface Props {
  onUnlock: () => void;
  onForgotPin: () => void;
}

export function LockScreen({ onUnlock, onForgotPin }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePinChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    setPin(numericValue);
    setError("");

    // Auto-verify when 4 digits entered
    if (numericValue.length === 4) {
      verifyPinCode(numericValue);
    }
  };

  const verifyPinCode = async (pinToVerify: string) => {
    setIsVerifying(true);
    const isValid = await verifyPin(pinToVerify);

    if (isValid) {
      onUnlock();
    } else {
      setError("Incorrect PIN");
      setPin("");
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
      <div className="w-full max-w-md">
        {/* Lock Icon */}
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-white/20 p-6 backdrop-blur-sm">
            <Lock className="h-16 w-16 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-center text-3xl font-bold text-white">Enter PIN</h1>
        <p className="mb-8 text-center text-sm text-blue-100">Enter your 4-digit PIN to unlock</p>

        {/* PIN Input */}
        <div className="mb-6">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            disabled={isVerifying}
            className="w-full rounded-2xl border-2 border-white/30 bg-white/10 p-6 text-center text-5xl font-bold tracking-widest text-white placeholder-white/40 backdrop-blur-sm transition-all outline-none focus:border-white/60 focus:ring-4 focus:ring-white/20 disabled:opacity-50"
            placeholder="••••"
            autoFocus
          />

          {/* Error Message */}
          {error && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-500/90 p-3 text-sm text-white backdrop-blur-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* PIN Dots Indicator */}
        <div className="mb-8 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full transition-all ${
                pin.length > i ? "bg-white shadow-lg" : "border-2 border-white/40 bg-transparent"
              }`}
            />
          ))}
        </div>

        {/* Forgot PIN Link */}
        <div className="text-center">
          <button
            onClick={onForgotPin}
            className="text-sm font-medium text-white/90 underline transition-colors hover:text-white"
          >
            Forgot PIN?
          </button>
        </div>
      </div>
    </div>
  );
}
