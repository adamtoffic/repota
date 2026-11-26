import { useState, useEffect, useRef, useCallback } from "react";
import { Lock, AlertCircle, KeyRound, Fingerprint, Delete } from "lucide-react";
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
  paused?: boolean;
}

const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function LockScreen({ onUnlock, onForgotPin, paused = false }: Props) {
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

  const attemptBiometricUnlock = useCallback(async () => {
    setError("");

    try {
      const { success } = await verifyBiometric();

      if (success) {
        clearPinLockout();
        setIsUnlocking(true);
        setTimeout(() => {
          onUnlock();
        }, 400);
      }
    } catch (err) {
      console.error("Biometric error:", err);
      // Silent fail - user can use PIN
    }
  }, [onUnlock]);

  const checkAndPromptBiometric = useCallback(async () => {
    if (isBiometricEnrolled()) {
      const { available, type } = await isBiometricAvailable();
      if (available) {
        setBiometricName(getBiometricName(type));
        setShowBiometricButton(true);
        // Auto-prompt biometric - but not on iOS or while paused behind recovery
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (!isIOS && !paused) {
          void attemptBiometricUnlock();
        }
      }
    }
  }, [attemptBiometricUnlock, paused]);

  // Auto-prompt biometric on mount - with iOS-safe delay
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => {
      setInputReady(true);
      void checkAndPromptBiometric();
    }, 500);

    return () => clearTimeout(timer);
  }, [paused, checkAndPromptBiometric]);

  // Focus input when ready (desktop/accessibility; mobile virtual keyboard stays suppressed via inputMode="none")
  useEffect(() => {
    if (!paused && inputReady && inputRef.current && !isUnlocking) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [paused, inputReady, isUnlocking]);

  const verifyPinCode = useCallback(
    async (pinToVerify: string) => {
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
          setError(
            `Incorrect PIN (${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} before pause)`,
          );
        } else {
          setError("Incorrect PIN");
        }
        setShake(true);
        setPin("");
        setIsVerifying(false);
        setTimeout(() => setShake(false), 450);
      }
    },
    [onUnlock],
  );

  const handlePinChange = useCallback(
    (value: string) => {
      if (paused || cooldownSeconds > 0 || isVerifying || isUnlocking) return;

      // Only allow numeric input
      const numericValue = value.replace(/\D/g, "").slice(0, 4);
      setPin(numericValue);
      setError("");

      // Auto-verify when 4 digits entered
      if (numericValue.length === 4) {
        setTimeout(() => {
          void verifyPinCode(numericValue);
        }, 100);
      }
    },
    [paused, cooldownSeconds, isVerifying, isUnlocking, verifyPinCode],
  );

  // Allow desktop hardware keyboard entry even when focus rests on a keypad button
  useEffect(() => {
    if (paused) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (cooldownSeconds > 0 || isVerifying || isUnlocking) return;
      if (e.target === inputRef.current) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePinChange(pin + e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handlePinChange(pin.slice(0, -1));
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [paused, cooldownSeconds, isVerifying, isUnlocking, pin, handlePinChange]);

  const handleInputClick = () => {
    if (!paused && inputRef.current && cooldownSeconds <= 0) {
      inputRef.current.focus();
    }
  };

  const isDisabled = isVerifying || isUnlocking || cooldownSeconds > 0;

  return (
    <div
      aria-hidden={paused || undefined}
      className={`safe-y animate-fade-in fixed inset-0 z-90 flex items-center justify-center overflow-y-auto bg-[#0F1D3A] p-4 ${
        paused ? "pointer-events-none" : ""
      }`}
      style={{
        backgroundImage: "linear-gradient(160deg, #0B152B 0%, #0F1D3A 55%, #162647 100%)",
        minHeight: "-webkit-fill-available",
        touchAction: "manipulation",
      }}
    >
      <div
        className={`animate-sheet-up bg-surface dark:border-border relative my-auto w-full max-w-sm rounded-3xl px-6 py-7 shadow-[0_24px_64px_-16px_rgba(2,6,23,0.55)] ring-1 ring-white/10 transition-all duration-300 sm:px-8 sm:py-8 dark:border ${
          isUnlocking ? "scale-[0.98] opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Minimal Brand Lock Mark */}
        <div className="mb-4 flex justify-center">
          <div className="bg-primary shadow-primary/20 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md">
            <Lock className="h-5 w-5" strokeWidth={2.2} />
          </div>
        </div>

        {/* Title */}
        <p className="text-muted mb-1 text-center text-[11px] font-bold tracking-[0.2em] uppercase">
          Repota
        </p>
        <h1 className="text-main text-center text-xl font-bold tracking-tight sm:text-2xl">
          {isUnlocking ? "Unlocking..." : "Welcome Back"}
        </h1>
        <p className="text-muted mt-1 mb-6 text-center text-sm">
          Enter your 4-digit PIN to continue
        </p>

        {/* PIN Input: 4-slot masked boxes layered over hidden accessible password input */}
        <div className={`transition-transform duration-200 ${shake ? "animate-shake" : ""}`}>
          <div className="relative mx-auto max-w-[232px]" onClick={handleInputClick}>
            <input
              ref={inputRef}
              type="password"
              inputMode="none"
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
              disabled={isDisabled || paused}
              tabIndex={paused ? -1 : undefined}
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
                    className={`flex h-13 items-center justify-center rounded-2xl border-2 transition-all duration-150 ${
                      isActiveSlot
                        ? "border-primary bg-primary/[0.04] ring-primary/15 dark:bg-primary/10 ring-4"
                        : isFilled
                          ? "border-border-strong bg-subtle"
                          : error
                            ? "border-red-300 bg-red-50/40 dark:border-red-700/70 dark:bg-red-950/30"
                            : "border-border bg-input"
                    } ${cooldownSeconds > 0 ? "opacity-60" : ""}`}
                  >
                    <div
                      className={`rounded-full transition-all duration-150 ${
                        isFilled
                          ? "animate-dot-pop bg-primary h-3 w-3"
                          : "bg-border-strong h-2 w-2"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {isVerifying && (
            <div
              role="status"
              aria-live="polite"
              className="text-muted mt-3 flex items-center justify-center gap-2 text-xs font-medium"
            >
              <div className="border-primary/25 border-t-primary h-3.5 w-3.5 animate-spin rounded-full border-2" />
              <span>Verifying...</span>
            </div>
          )}

          {/* Error / Cooldown Banner */}
          {(cooldownSeconds > 0 || error) && (
            <div
              role="alert"
              aria-live="assertive"
              className="animate-slide-in-down mt-3 flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700 dark:border-red-800/70 dark:bg-red-950/60 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {cooldownSeconds > 0
                  ? `Too many incorrect attempts. Try again in ${cooldownSeconds}s or use Forgot PIN.`
                  : error}
              </span>
            </div>
          )}
        </div>

        {/* Built-In Tactile Numeric Keypad */}
        <div
          className="mx-auto mt-6 grid max-w-[264px] grid-cols-3 gap-2.5"
          role="group"
          aria-label="PIN keypad"
        >
          {KEYPAD_DIGITS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handlePinChange(pin + digit)}
              disabled={isDisabled || paused || pin.length >= 4}
              tabIndex={paused ? -1 : undefined}
              className="border-border bg-subtle text-main hover:bg-elevated active:bg-border flex h-13 items-center justify-center rounded-2xl border text-xl font-semibold transition-all duration-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {digit}
            </button>
          ))}

          {/* Bottom row: Biometric (if enrolled) | 0 | Backspace */}
          {showBiometricButton ? (
            <button
              type="button"
              onClick={attemptBiometricUnlock}
              disabled={isUnlocking || paused}
              tabIndex={paused ? -1 : undefined}
              aria-label={`Use ${biometricName}`}
              title={`Use ${biometricName}`}
              className="border-primary/30 bg-primary/10 text-primary-text hover:bg-primary/15 flex h-13 items-center justify-center rounded-2xl border transition-all duration-100 active:scale-95 disabled:opacity-45"
            >
              <Fingerprint className="h-5 w-5" />
            </button>
          ) : (
            <div aria-hidden="true" />
          )}

          <button
            type="button"
            onClick={() => handlePinChange(pin + "0")}
            disabled={isDisabled || paused || pin.length >= 4}
            tabIndex={paused ? -1 : undefined}
            className="border-border bg-subtle text-main hover:bg-elevated active:bg-border flex h-13 items-center justify-center rounded-2xl border text-xl font-semibold transition-all duration-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            0
          </button>

          <button
            type="button"
            onClick={() => handlePinChange(pin.slice(0, -1))}
            disabled={isDisabled || paused || pin.length === 0}
            tabIndex={paused ? -1 : undefined}
            aria-label="Delete digit"
            className="border-border bg-subtle text-secondary hover:bg-elevated hover:text-main active:bg-border flex h-13 items-center justify-center rounded-2xl border transition-all duration-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Forgot PIN Link */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onForgotPin}
            disabled={isUnlocking || paused}
            tabIndex={paused ? -1 : undefined}
            className="group hover:text-primary-text text-muted hover:bg-subtle inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4 transition-transform group-hover:rotate-12" />
            <span>Forgot your PIN?</span>
          </button>
        </div>
      </div>
    </div>
  );
}
