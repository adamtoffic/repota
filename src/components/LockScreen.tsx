import { useState, useEffect, useRef } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputReady, setInputReady] = useState(false);

  const checkAndPromptBiometric = async () => {
    if (isBiometricEnrolled()) {
      const { available, type } = await isBiometricAvailable();
      if (available) {
        setBiometricName(getBiometricName(type));
        setShowBiometricButton(true);
        // Auto-prompt biometric - but not on iOS (causes issues)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (!isIOS) {
          attemptBiometricUnlock();
        }
      }
    }
  };

  // Auto-prompt biometric on mount - with iOS-safe delay
  useEffect(() => {
    // Longer delay for iOS to ensure DOM is ready
    const timer = setTimeout(() => {
      setInputReady(true);
      checkAndPromptBiometric();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus input when ready (iOS safe)
  useEffect(() => {
    if (inputReady && inputRef.current && !isUnlocking) {
      // Use requestAnimationFrame for iOS compatibility
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [inputReady, isUnlocking]);

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
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, "").slice(0, 4);
    setPin(numericValue);
    setError("");

    // Auto-verify when 4 digits entered
    if (numericValue.length === 4) {
      // Small delay for better UX on mobile
      setTimeout(() => {
        verifyPinCode(numericValue);
      }, 100);
    }
  };

  const handleInputClick = () => {
    // Ensure keyboard opens on iOS
    if (inputRef.current) {
      inputRef.current.focus();
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #1E3A8A 0%, #1e40af 50%, #2563eb 100%)",
        minHeight: "-webkit-fill-available",
        touchAction: "manipulation",
      }}
    >
      {/* Animated background blobs - Ghana theme */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 h-full w-full animate-pulse rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -right-1/2 -bottom-1/2 h-full w-full animate-pulse rounded-full bg-blue-400/10 blur-3xl delay-1000" />
      </div>

      <div
        className={`relative w-full max-w-md transition-all duration-500 ${isUnlocking ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
      >
        {/* Lock Icon with Ghana gold accent */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-amber-400/20 blur-2xl" />
            <div className="relative rounded-2xl border-2 border-amber-400/40 bg-linear-to-br from-amber-400 to-amber-500 p-6 shadow-2xl">
              <Lock className="h-16 w-16 text-blue-900 drop-shadow-lg" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-center text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">
          {isUnlocking ? "Unlocking..." : "Welcome Back"}
        </h1>
        <p className="mb-10 text-center text-sm font-medium text-blue-100">
          Enter your 4-digit PIN to continue
        </p>

        {/* PIN Input with enhanced styling and iOS fixes */}
        <div className={`mb-6 transition-transform duration-200 ${shake ? "animate-shake" : ""}`}>
          <div className="relative">
            <input
              ref={inputRef}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              onClick={handleInputClick}
              onFocus={() => setError("")}
              disabled={isVerifying || isUnlocking}
              className="w-full rounded-2xl border-2 border-amber-400/50 bg-white/20 p-6 text-center text-5xl font-bold tracking-[0.5em] text-white placeholder-amber-100/40 shadow-2xl backdrop-blur-xl transition-all outline-none focus:border-amber-400 focus:bg-white/30 focus:ring-4 focus:ring-amber-400/30 disabled:opacity-60"
              style={{
                WebkitAppearance: "none",
                letterSpacing: "0.5em",
                fontSize: "3rem",
              }}
              placeholder="••••"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
              {isVerifying && (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
            </div>
          </div>

          {/* Error Message with slide animation */}
          {error && (
            <div className="animate-in slide-in-from-top-2 mt-4 flex items-center justify-center gap-2 rounded-xl bg-red-600/95 px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-sm duration-300">
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
                  ? "scale-125 bg-amber-400 shadow-lg shadow-amber-400/60"
                  : "scale-100 border-2 border-amber-200/50 bg-transparent"
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
              className="group inline-flex items-center gap-2 rounded-xl border-2 border-amber-400/40 bg-amber-400/10 px-6 py-3 text-sm font-bold text-amber-100 shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:border-amber-400/60 hover:bg-amber-400/20 active:scale-95 disabled:opacity-50"
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
            className="group inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-blue-100 transition-all hover:bg-white/10 hover:text-amber-100 disabled:opacity-50"
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
