import { useState, useEffect } from "react";
import { Lock, AlertCircle, KeyRound, Fingerprint } from "lucide-react";
import { verifyPin } from "../utils/pinSecurity";
import {
  isBiometricEnrolled,
  verifyBiometric,
  getBiometricName,
  isBiometricAvailable,
} from "../utils/biometricAuth";

interface Props {
  onUnlock: () => void;
  onForgotPin: () => void;
}

export function LockScreen({ onUnlock, onForgotPin }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [biometricName, setBiometricName] = useState<string>("Biometric");
  const [showBiometricButton, setShowBiometricButton] = useState(false);

  // Auto-prompt biometric on mount
  useEffect(() => {
    // Small delay to ensure component is fully mounted and visible
    const timer = setTimeout(() => {
      checkAndPromptBiometric();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const checkAndPromptBiometric = async () => {
    if (isBiometricEnrolled()) {
      const { available, type } = await isBiometricAvailable();
      if (available) {
        setBiometricName(getBiometricName(type));
        setShowBiometricButton(true);
        // Auto-prompt biometric
        attemptBiometricUnlock();
      }
    }
  };

  const attemptBiometricUnlock = async () => {
    setError("");

    try {
      const { success, error: biometricError } = await verifyBiometric();

      if (success) {
        setIsUnlocking(true);
        setTimeout(() => {
          onUnlock();
        }, 400);
      } else if (biometricError && !biometricError.includes("cancelled")) {
        // Only show error if not cancelled by user
        // Don't show error on auto-prompt (silent fail to PIN)
        console.log("Biometric failed:", biometricError);
      }
    } catch (err) {
      console.error("Biometric error:", err);
      // Silent fail - user can use PIN
    }
  };

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
      setIsUnlocking(true);
      // Smooth unlock animation before transitioning
      setTimeout(() => {
        onUnlock();
      }, 400);
    } else {
      setError("Incorrect PIN");
      setShake(true);
      setPin("");
      setIsVerifying(false);
      setTimeout(() => setShake(false), 650);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 h-full w-full animate-pulse rounded-full bg-blue-500/20 blur-3xl" />
        <div
          className="absolute -right-1/2 -bottom-1/2 h-full w-full animate-pulse rounded-full bg-purple-500/20 blur-3xl"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div
        className={`relative w-full max-w-md transition-all duration-500 ${isUnlocking ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
      >
        {/* Lock Icon with glow effect */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-white/30 blur-xl" />
            <div className="relative rounded-full border border-white/30 bg-white/20 p-6 shadow-2xl backdrop-blur-md">
              <Lock className="h-16 w-16 text-white drop-shadow-lg" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-center text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">
          {isUnlocking ? "Unlocking..." : "Welcome Back"}
        </h1>
        <p className="mb-10 text-center text-sm font-medium text-white/80">
          Enter your 4-digit PIN to continue
        </p>

        {/* PIN Input with enhanced styling */}
        <div className={`mb-6 transition-transform duration-200 ${shake ? "animate-shake" : ""}`}>
          <div className="relative">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              disabled={isVerifying || isUnlocking}
              className="w-full rounded-2xl border-2 border-white/40 bg-white/15 p-6 text-center text-5xl font-bold tracking-[0.5em] text-white placeholder-white/30 shadow-2xl backdrop-blur-xl transition-all outline-none focus:border-white/70 focus:bg-white/20 focus:ring-4 focus:ring-white/30 disabled:opacity-60"
              placeholder="••••"
              autoFocus
            />
            <div className="absolute top-1/2 right-4 -translate-y-1/2">
              {isVerifying && (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
            </div>
          </div>

          {/* Error Message with slide animation */}
          {error && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-red-500/90 px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* PIN Dots Indicator with stagger animation */}
        <div className="mb-10 flex justify-center gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-full transition-all duration-300 ${
                pin.length > i
                  ? "scale-125 bg-white shadow-lg shadow-white/50"
                  : "scale-100 border-2 border-white/50 bg-transparent"
              }`}
              style={{ transitionDelay: `${i * 50}ms` }}
            />
          ))}
        </div>

        {/* Biometric Button (if available) */}
        {showBiometricButton && (
          <div className="mb-6 text-center">
            <button
              onClick={attemptBiometricUnlock}
              disabled={isUnlocking}
              className="group inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/20 active:scale-95 disabled:opacity-50"
            >
              <Fingerprint className="h-5 w-5 transition-transform group-hover:scale-110" />
              <span>Use {biometricName}</span>
            </button>
          </div>
        )}

        {/* Forgot PIN Link with icon */}
        <div className="text-center">
          <button
            onClick={onForgotPin}
            disabled={isUnlocking}
            className="group inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white/90 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4 transition-transform group-hover:rotate-12" />
            <span>Forgot your PIN?</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.65s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
}
