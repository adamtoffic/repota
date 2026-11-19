import { useState, useEffect, useRef } from "react";
import { Lock, AlertCircle, KeyRound, Fingerprint } from "lucide-react";
import {
  clearPinLockout,
  getPinLockoutStatus,
  recordFailedPinAttempt,
  verifyPin,
} from "../utils/pinSecurity";
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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputReady, setInputReady] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(() =>
    Math.ceil(getPinLockoutStatus().remainingMs / 1000),
  );

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      const remaining = Math.ceil(getPinLockoutStatus().remainingMs / 1000);
      setCooldownSeconds(remaining);
      if (remaining <= 0) {
        setError("");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

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

  const attemptBiometricUnlock = async () => {
    setError("");

    try {
      const { success, error: biometricError } = await verifyBiometric();

      if (success) {
        clearPinLockout();
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

  const handlePinChange = (value: string) => {
    if (cooldownSeconds > 0 || isVerifying || isUnlocking) return;

    // Only allow numeric input
    const numericValue = value.replace(/\D/g, "").slice(0, 4);
    setPin(numericValue);
    setError("");

    // Auto-verify when 4 digits entered
    if (numericValue.length === 4) {
      // Small delay for better UX on mobile
      setTimeout(() => {
        void verifyPinCode(numericValue);
      }, 100);
    }
  };

  const handleInputClick = () => {
    // Ensure keyboard opens on iOS
    if (inputRef.current && cooldownSeconds <= 0) {
      inputRef.current.focus();
    }
  };

  const verifyPinCode = async (pinToVerify: string) => {
    const status = getPinLockoutStatus();
    if (status.isLockedOut) {
      setCooldownSeconds(Math.ceil(status.remainingMs / 1000));
      setPin("");
      return;
    }

    setIsVerifying(true);
    const isValid = await verifyPin(pinToVerify);

    if (isValid) {
      setIsUnlocking(true);
      // Smooth unlock animation before transitioning
      setTimeout(() => {
        onUnlock();
      }, 400);
    } else {
      const lockout = recordFailedPinAttempt();
      const remainingSeconds = Math.ceil(lockout.remainingMs / 1000);
      if (lockout.isLockedOut && remainingSeconds > 0) {
        setCooldownSeconds(remainingSeconds);
        setError(`Too many incorrect attempts. Try again in ${remainingSeconds}s.`);
      } else if (lockout.failedAttempts >= 3) {
        const attemptsLeft = Math.max(1, 5 - lockout.failedAttempts);
        setError(`Incorrect PIN (${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} before pause)`);
      } else {
        setError("Incorrect PIN");
      }
      setShake(true);
      setPin("");
      setIsVerifying(false);
      setTimeout(() => setShake(false), 650);
    }
  };

  return (
    <div
      className="safe-y fixed inset-0 z-100 flex items-center justify-center overflow-y-auto p-4"
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
        className={`relative my-auto w-full max-w-md py-4 transition-all duration-500 ${isUnlocking ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
      >
        {/* Lock Icon with Ghana gold accent */}
        <div className="mb-5 flex justify-center sm:mb-6">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-amber-400/20 blur-2xl" />
            <div className="relative rounded-2xl border-2 border-amber-400/40 bg-linear-to-br from-amber-400 to-amber-500 p-4 shadow-2xl sm:p-5">
              <Lock className="h-12 w-12 text-blue-900 drop-shadow-lg sm:h-14 sm:w-14" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-center text-2xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-3xl">
          {isUnlocking ? "Unlocking..." : "Welcome Back"}
        </h1>
        <p className="mb-6 text-center text-sm font-medium text-blue-100 sm:mb-8">
          Enter your 4-digit PIN to continue
        </p>

        {/* PIN Input: 4-slot masked visual boxes layered over a real password numeric input */}
        <div className={`mb-6 transition-transform duration-200 ${shake ? "animate-shake" : ""}`}>
          <div className="relative mx-auto max-w-xs" onClick={handleInputClick}>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              onClick={handleInputClick}
              onFocus={() => {
                setIsInputFocused(true);
                if (cooldownSeconds <= 0) setError("");
              }}
              onBlur={() => setIsInputFocused(false)}
              disabled={isVerifying || isUnlocking || cooldownSeconds > 0}
              aria-label="4-digit PIN"
              data-large-input="true"
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
              placeholder="••••"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />

            <div aria-hidden="true" className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((i) => {
                const isFilled = pin.length > i;
                const isActiveSlot =
                  isInputFocused && cooldownSeconds <= 0 && !isVerifying && pin.length === i;
                return (
                  <div
                    key={i}
                    className={`flex h-16 items-center justify-center rounded-2xl border-2 backdrop-blur-xl transition-all duration-200 sm:h-18 ${
                      isActiveSlot
                        ? "border-amber-400 bg-white/30 ring-4 ring-amber-400/30"
                        : isFilled
                          ? "border-amber-300/80 bg-white/25"
                          : "border-white/30 bg-white/15"
                    } ${cooldownSeconds > 0 ? "opacity-60" : ""}`}
                  >
                    <div
                      className={`rounded-full transition-all duration-200 ${
                        isFilled
                          ? "h-3.5 w-3.5 scale-110 bg-amber-400 shadow-lg shadow-amber-400/60"
                          : "h-3 w-3 border-2 border-amber-200/50 bg-transparent"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {isVerifying && (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-blue-100">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>Verifying...</span>
            </div>
          )}

          {/* Error / Cooldown Message with slide animation */}
          {(cooldownSeconds > 0 || error) && (
            <div className="animate-in slide-in-from-top-2 mt-4 flex items-center justify-center gap-2 rounded-xl bg-red-600/95 px-4 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur-sm duration-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>
                {cooldownSeconds > 0
                  ? `Too many incorrect attempts. Try again in ${cooldownSeconds}s or use Forgot PIN.`
                  : error}
              </span>
            </div>
          )}
        </div>

        {/* Biometric Button (if available) */}
        {showBiometricButton && (
          <div className="mb-4 text-center sm:mb-6">
            <button
              type="button"
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
            type="button"
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
