import { useEffect, useId, useRef, useState } from "react";
import { captureEvent } from "../utils/analytics";
import {
  Lock,
  Key,
  AlertCircle,
  CheckCircle,
  Copy,
  X,
  HelpCircle,
  Fingerprint,
} from "lucide-react";
import {
  setupPin,
  generateRecoveryCode,
  isPinConfigured,
  isSameAsCurrentPin,
  saveSecurityQuestions,
} from "../utils/pinSecurity";
import { isBiometricAvailable, enrollBiometric, getBiometricName } from "../utils/biometricAuth";
import { SECURITY_QUESTIONS } from "../constants/securityQuestions";
import { useDialogA11y } from "../hooks/useDialogA11y";

interface Props {
  onComplete: () => void;
  onCancel?: () => void;
}

export function PinSetup({ onComplete, onCancel }: Props) {
  const isChangingPin = isPinConfigured();
  const [step, setStep] = useState<
    "intro" | "create" | "confirm" | "recovery" | "questions" | "biometric"
  >(isChangingPin ? "create" : "intro");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [recoveryCode] = useState(generateRecoveryCode());
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Security questions state
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(["", "", ""]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<"face" | "fingerprint" | "other" | null>(null);
  const [enrollingBiometric, setEnrollingBiometric] = useState(false);
  const securityQuestionsSavedRef = useRef(false);
  const wasChangingPinRef = useRef(isChangingPin);
  const dialogRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;

  useDialogA11y({
    isOpen: true,
    onClose: onCancel ?? (() => {}),
    closeOnEscape: Boolean(onCancel),
    dialogRef,
  });

  // Check biometric availability on mount
  useEffect(() => {
    (async () => {
      const { available, type } = await isBiometricAvailable();
      setBiometricAvailable(available);
      setBiometricType(type);
    })();
  }, []);

  const handleCreatePin = async () => {
    if (pin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    // Check if trying to use the same PIN when changing
    if (isChangingPin) {
      const isSame = await isSameAsCurrentPin(pin);
      if (isSame) {
        setError("New PIN must be different from current PIN");
        return;
      }
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

  const handleSaveSecurityQuestions = async () => {
    // Validate all questions are selected and answered
    if (selectedQuestions.some((q) => !q)) {
      setError("Please select all 3 security questions");
      return;
    }

    if (answers.some((a) => a.trim().length < 2)) {
      setError("Please provide answers for all questions (minimum 2 characters)");
      return;
    }

    // Check for duplicate questions
    const uniqueQuestions = new Set(selectedQuestions);
    if (uniqueQuestions.size !== 3) {
      setError("Please select 3 different questions");
      return;
    }

    const questionsToSave = selectedQuestions.map((questionId, index) => ({
      questionId,
      answer: answers[index],
    }));

    const success = await saveSecurityQuestions(questionsToSave);
    if (success) {
      securityQuestionsSavedRef.current = true;
      // Check if biometric is available, if so go to biometric step
      if (biometricAvailable) {
        setStep("biometric");
      } else {
        await handleFinishSetup(false);
      }
    } else {
      setError("Failed to save security questions. Please try again.");
    }
  };

  const handleEnrollBiometric = async () => {
    setEnrollingBiometric(true);
    setError("");

    const { success, error: biometricError } = await enrollBiometric();

    setEnrollingBiometric(false);

    if (success) {
      await handleFinishSetup(true);
    } else {
      setError(biometricError || "Failed to enroll biometric");
    }
  };

  const handleSkipBiometric = async () => {
    await handleFinishSetup(false);
  };

  const handleFinishSetup = async (biometricEnrolled = false) => {
    const success = await setupPin(pin, recoveryCode);
    if (success) {
      captureEvent("Pin_Lock_Configured", {
        is_change: wasChangingPinRef.current,
        biometric_enabled: biometricEnrolled,
        security_questions_configured: securityQuestionsSavedRef.current,
      });
      onComplete();
    } else {
      setError("Failed to set up PIN. Please try again.");
    }
  };

  const handleSkipSecurityQuestions = async () => {
    setError("");
    if (biometricAvailable) {
      setStep("biometric");
    } else {
      await handleFinishSetup(false);
    }
  };

  const copyRecoveryCode = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy automatically — please write the code down.");
    }
  };

  if (step === "intro") {
    return (
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-y animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-[#0F1D3A] p-4 focus:outline-none"
        style={{
          backgroundImage: "linear-gradient(160deg, #0B152B 0%, #0F1D3A 55%, #162647 100%)",
        }}
      >
        <div className="animate-sheet-up bg-surface dark:border-border relative my-auto w-full max-w-md rounded-3xl p-6 shadow-[0_24px_64px_-16px_rgba(2,6,23,0.55)] ring-1 ring-white/10 sm:p-8 dark:border">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel PIN setup"
              className="text-muted hover:bg-subtle hover:text-main absolute top-4 right-4 rounded-full p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-blue-100 p-4 dark:bg-blue-950/60">
              <Lock className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <h1 id={titleId} className="text-main mb-3 text-center text-2xl font-bold">
            {isChangingPin ? "Change Your PIN" : "Secure Your Data"}
          </h1>
          <p className="text-muted mb-6 text-center text-sm">
            {isChangingPin
              ? "Set a new 4-digit PIN to protect your student records."
              : "Set up a 4-digit PIN to protect your student records from unauthorized access."}
          </p>

          <div className="mb-6 space-y-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-900 dark:border dark:border-blue-800/70 dark:bg-blue-950/45 dark:text-blue-200">
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
              <span>You&apos;ll receive a recovery code in case you forget your PIN</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStep("create")}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  if (step === "create") {
    const createPinInputId = `${idPrefix}-create-pin`;
    return (
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-y animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-[#0F1D3A] p-4 focus:outline-none"
        style={{
          backgroundImage: "linear-gradient(160deg, #0B152B 0%, #0F1D3A 55%, #162647 100%)",
        }}
      >
        <div className="animate-sheet-up bg-surface dark:border-border relative my-auto w-full max-w-md rounded-3xl p-6 shadow-[0_24px_64px_-16px_rgba(2,6,23,0.55)] ring-1 ring-white/10 sm:p-8 dark:border">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel PIN setup"
              className="text-muted hover:bg-subtle hover:text-main absolute top-4 right-4 rounded-full p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <p className="text-primary-text mb-1 text-center text-xs font-bold tracking-wider uppercase">
            Step 1 of 4
          </p>
          <h2 id={titleId} className="text-main mb-2 text-center text-xl font-bold">
            {isChangingPin ? "Enter New PIN" : "Create Your PIN"}
          </h2>
          <p className="text-muted mb-6 text-center text-sm">
            {isChangingPin
              ? "Choose a new 4-digit PIN"
              : "Choose a 4-digit PIN to secure your data"}
          </p>

          <div className="mb-6">
            <label
              htmlFor={createPinInputId}
              className="text-secondary mb-2 block text-sm font-medium"
            >
              Enter 4-digit PIN
            </label>
            <input
              id={createPinInputId}
              type="password"
              inputMode="numeric"
              maxLength={4}
              data-large-input="true"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && pin.length === 4) {
                  void handleCreatePin();
                }
              }}
              className="border-border-strong bg-input text-main w-full rounded-lg border-2 px-4 py-3 text-center text-2xl tracking-widest transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
              placeholder="••••"
              autoFocus
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:border dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            {isChangingPin && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="border-border-strong text-secondary hover:bg-subtle flex-1 rounded-lg border-2 py-3 font-semibold transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleCreatePin}
              disabled={pin.length !== 4}
              className={`${isChangingPin ? "flex-1" : "w-full"} rounded-lg bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    const confirmPinInputId = `${idPrefix}-confirm-pin`;
    return (
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-y animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-[#0F1D3A] p-4 focus:outline-none"
        style={{
          backgroundImage: "linear-gradient(160deg, #0B152B 0%, #0F1D3A 55%, #162647 100%)",
        }}
      >
        <div className="animate-sheet-up bg-surface dark:border-border relative my-auto w-full max-w-md rounded-3xl p-6 shadow-[0_24px_64px_-16px_rgba(2,6,23,0.55)] ring-1 ring-white/10 sm:p-8 dark:border">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel PIN setup"
              className="text-muted hover:bg-subtle hover:text-main absolute top-4 right-4 rounded-full p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <p className="text-primary-text mb-1 text-center text-xs font-bold tracking-wider uppercase">
            Step 2 of 4
          </p>
          <h2 id={titleId} className="text-main mb-2 text-center text-xl font-bold">
            Confirm Your PIN
          </h2>
          <p className="text-muted mb-6 text-center text-sm">Re-enter your PIN to confirm</p>

          <div className="mb-6">
            <label
              htmlFor={confirmPinInputId}
              className="text-secondary mb-2 block text-sm font-medium"
            >
              Re-enter your 4-digit PIN
            </label>
            <input
              id={confirmPinInputId}
              type="password"
              inputMode="numeric"
              maxLength={4}
              data-large-input="true"
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && confirmPin.length === 4) {
                  handleConfirmPin();
                }
              }}
              className="border-border-strong bg-input text-main w-full rounded-lg border-2 px-4 py-3 text-center text-2xl tracking-widest transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
              placeholder="••••"
              autoFocus
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:border dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep("create");
                setConfirmPin("");
                setError("");
              }}
              className="border-border-strong text-secondary hover:bg-subtle flex-1 rounded-lg border-2 py-3 font-semibold transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmPin}
              disabled={confirmPin.length !== 4}
              className="flex-1 rounded-lg bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Recovery code step
  if (step === "recovery") {
    return (
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-y animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-[#0F1D3A] p-4 focus:outline-none"
        style={{
          backgroundImage: "linear-gradient(160deg, #0B152B 0%, #0F1D3A 55%, #162647 100%)",
        }}
      >
        <div className="animate-sheet-up bg-surface dark:border-border relative my-auto w-full max-w-md rounded-3xl p-6 shadow-[0_24px_64px_-16px_rgba(2,6,23,0.55)] ring-1 ring-white/10 sm:p-8 dark:border">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel PIN setup"
              className="text-muted hover:bg-subtle hover:text-main absolute top-4 right-4 rounded-full p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <div className="mb-4 flex justify-center sm:mb-6">
            <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-950/60">
              <Key className="h-12 w-12 text-amber-600 dark:text-amber-400" />
            </div>
          </div>

          <p className="mb-1 text-center text-xs font-bold tracking-wider text-amber-700 uppercase dark:text-amber-400">
            Step 3 of 4
          </p>
          <h2 id={titleId} className="text-main mb-2 text-center text-xl font-bold">
            Save Your Recovery Code
          </h2>
          <p className="text-muted mb-6 text-center text-sm">
            Write this down in a safe place. You&apos;ll need it if you forget your PIN.
          </p>

          <div className="mb-5 rounded-lg bg-amber-50 p-4 sm:mb-6 sm:p-6 dark:border dark:border-amber-800/70 dark:bg-amber-950/45">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-mono text-2xl font-bold tracking-wider text-amber-900 sm:text-4xl dark:text-amber-200">
                {recoveryCode}
              </span>
              <button
                type="button"
                onClick={() => void copyRecoveryCode()}
                className="shrink-0 rounded-lg bg-amber-200 p-2 text-amber-900 transition-colors hover:bg-amber-300 dark:bg-amber-900/70 dark:text-amber-100 dark:hover:bg-amber-800"
                title="Copy to clipboard"
                aria-label="Copy recovery code"
              >
                {copied ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {copied ? "✓ Copied to clipboard!" : "Tap the button to copy"}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:border dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6 rounded-lg border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-800/70 dark:bg-amber-950/45">
            <p className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>Important:</strong> Keep this code safe. You&apos;ll need it to reset your
                PIN.
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setStep("questions");
            }}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Next: Set Security Questions
          </button>
        </div>
      </div>
    );
  }

  // Security questions step
  if (step === "questions") {
    const getAvailableQuestions = (currentIndex: number) => {
      const otherSelections = selectedQuestions.filter((_, i) => i !== currentIndex);
      return SECURITY_QUESTIONS.filter((q) => !otherSelections.includes(q.id));
    };

    return (
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-y animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-[#0F1D3A] p-4 focus:outline-none"
        style={{
          backgroundImage: "linear-gradient(160deg, #0B152B 0%, #0F1D3A 55%, #162647 100%)",
        }}
      >
        <div className="animate-sheet-up bg-surface dark:border-border relative my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6 shadow-[0_24px_64px_-16px_rgba(2,6,23,0.55)] ring-1 ring-white/10 sm:p-8 dark:border">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel PIN setup"
              className="text-muted hover:bg-subtle hover:text-main absolute top-4 right-4 rounded-full p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <div className="mb-4 flex justify-center sm:mb-6">
            <div className="rounded-full bg-green-100 p-4 dark:bg-emerald-950/60">
              <HelpCircle className="h-12 w-12 text-green-600 dark:text-emerald-400" />
            </div>
          </div>

          <p className="mb-1 text-center text-xs font-bold tracking-wider text-green-600 uppercase dark:text-emerald-400">
            Step 4 of 4
          </p>
          <h2 id={titleId} className="text-main mb-2 text-center text-xl font-bold">
            Set Security Questions (Optional)
          </h2>
          <p className="text-muted mb-6 text-center text-sm">
            Answer 3 questions to help recover access if you forget your PIN, or skip this step.
          </p>

          <div className="mb-6 space-y-4">
            {[0, 1, 2].map((index) => {
              const selectedQuestion = SECURITY_QUESTIONS.find(
                (q) => q.id === selectedQuestions[index],
              );
              const questionSelectId = `${idPrefix}-question-${index}`;

              return (
                <div key={index} className="border-border bg-subtle rounded-lg border-2 p-4">
                  <label
                    htmlFor={questionSelectId}
                    className="text-secondary mb-2 block text-sm font-bold"
                  >
                    Question {index + 1}
                  </label>
                  <select
                    id={questionSelectId}
                    value={selectedQuestions[index]}
                    onChange={(e) => {
                      const newQuestions = [...selectedQuestions];
                      newQuestions[index] = e.target.value;
                      setSelectedQuestions(newQuestions);
                      setError("");
                    }}
                    className="border-border-strong bg-input text-main mb-3 w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none"
                  >
                    <option value="">-- Select a question --</option>
                    {getAvailableQuestions(index).map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.question}
                      </option>
                    ))}
                  </select>

                  {selectedQuestion && (
                    <input
                      type="text"
                      aria-label={`Answer for question ${index + 1}`}
                      value={answers[index]}
                      onChange={(e) => {
                        const newAnswers = [...answers];
                        newAnswers[index] = e.target.value;
                        setAnswers(newAnswers);
                        setError("");
                      }}
                      placeholder={selectedQuestion.placeholder}
                      className="border-border-strong bg-input text-main placeholder:text-muted w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:border dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/70 dark:bg-blue-950/45">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> Choose questions with answers you&apos;ll always remember.
              Answers are case-insensitive.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setStep("recovery");
                setError("");
              }}
              className="border-border-strong text-secondary hover:bg-subtle flex-1 rounded-lg border-2 py-3 font-semibold transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void handleSkipSecurityQuestions()}
              className="border-border-strong text-secondary hover:bg-subtle flex-1 rounded-lg border-2 py-3 font-semibold transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleSaveSecurityQuestions}
              className="flex-1 rounded-lg bg-green-700 px-3 py-3 font-semibold text-white transition-colors hover:bg-green-800"
            >
              {biometricAvailable ? "Next" : "Complete Setup"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Biometric enrollment step
  if (step === "biometric") {
    const biometricName = getBiometricName(biometricType);

    return (
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-y animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-[#0F1D3A] p-4 focus:outline-none"
        style={{
          backgroundImage: "linear-gradient(160deg, #0B152B 0%, #0F1D3A 55%, #162647 100%)",
        }}
      >
        <div className="animate-sheet-up bg-surface dark:border-border relative my-auto w-full max-w-md rounded-3xl p-6 shadow-[0_24px_64px_-16px_rgba(2,6,23,0.55)] ring-1 ring-white/10 sm:p-8 dark:border">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancel PIN setup"
              className="text-muted hover:bg-subtle hover:text-main absolute top-4 right-4 rounded-full p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-indigo-100 p-4 dark:bg-indigo-950/60">
              <Fingerprint className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>

          <h2 id={titleId} className="text-main mb-3 text-center text-xl font-bold">
            Enable {biometricName}?
          </h2>
          <p className="text-muted mb-6 text-center text-sm">
            Use {biometricName} to unlock the app quickly. Your PIN will still work as a backup.
          </p>

          <div className="mb-6 space-y-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 dark:border-indigo-800/70 dark:bg-indigo-950/45 dark:text-indigo-200">
            <p className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Faster unlock on this device</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>More secure than PIN alone</span>
            </p>
            <p className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>PIN remains available as fallback</span>
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:border dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkipBiometric}
              disabled={enrollingBiometric}
              className="border-border-strong text-secondary hover:bg-subtle flex-1 rounded-lg border-2 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Skip for Now
            </button>
            <button
              type="button"
              onClick={handleEnrollBiometric}
              disabled={enrollingBiometric}
              className="flex-1 rounded-lg bg-indigo-600 py-3 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enrollingBiometric ? "Setting up..." : `Enable ${biometricName}`}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
