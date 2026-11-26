import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Key, AlertCircle, X, HelpCircle } from "lucide-react";
import {
  verifyRecoveryCode,
  resetPinWithRecoveryCode,
  verifySecurityAnswers,
  resetPinWithSecurityQuestions,
  getSavedSecurityQuestionIds,
  areSecurityQuestionsConfigured,
  isSameAsCurrentPin,
} from "../utils/pinSecurity";
import { SECURITY_QUESTIONS } from "../constants/securityQuestions";
import { useDialogA11y } from "../hooks/useDialogA11y";

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

export function PinRecovery({ onComplete, onCancel }: Props) {
  const hasSecurityQuestions = areSecurityQuestionsConfigured();
  const [method, setMethod] = useState<"code" | "questions">("code");
  const [step, setStep] = useState<"verify" | "newPin" | "confirm">("verify");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const codeTabRef = useRef<HTMLButtonElement>(null);
  const questionsTabRef = useRef<HTMLButtonElement>(null);
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;

  useDialogA11y({
    isOpen: true,
    onClose: onCancel,
    dialogRef,
  });

  // Security questions state
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const savedQuestionIds = getSavedSecurityQuestionIds();

  const handleMethodTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "Home" || e.key === "End") {
      e.preventDefault();
      let nextMethod: "code" | "questions";
      if (e.key === "Home") {
        nextMethod = "code";
      } else if (e.key === "End") {
        nextMethod = "questions";
      } else {
        nextMethod = method === "code" ? "questions" : "code";
      }
      setMethod(nextMethod);
      setError("");
      if (nextMethod === "code") {
        codeTabRef.current?.focus();
      } else {
        questionsTabRef.current?.focus();
      }
    }
  };

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

  const handleVerifySecurityQuestions = async () => {
    if (answers.some((a) => a.trim().length < 2)) {
      setError("Please answer all security questions");
      return;
    }

    const questionsToVerify = savedQuestionIds.map((questionId, index) => ({
      questionId,
      answer: answers[index],
    }));

    const { verified, correctCount } = await verifySecurityAnswers(questionsToVerify);

    if (!verified) {
      setError(`Only ${correctCount}/3 correct. You need at least 2 correct answers.`);
      return;
    }

    setError("");
    setStep("newPin");
  };

  const handleNewPin = async () => {
    if (newPin.length !== 4) {
      setError("PIN must be 4 digits");
      return;
    }

    // Check if trying to use the same PIN
    const isSame = await isSameAsCurrentPin(newPin);
    if (isSame) {
      setError("New PIN must be different from your old PIN");
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

    let success: boolean;
    if (method === "code") {
      success = await resetPinWithRecoveryCode(recoveryCode, newPin);
    } else {
      success = await resetPinWithSecurityQuestions(newPin);
    }

    if (success) {
      onComplete();
    } else {
      setError("Failed to reset PIN. Please try again.");
    }
  };

  if (step === "verify") {
    const codeTabId = `${idPrefix}-tab-code`;
    const questionsTabId = `${idPrefix}-tab-questions`;
    const codePanelId = `${idPrefix}-panel-code`;
    const questionsPanelId = `${idPrefix}-panel-questions`;

    return (
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-y animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm focus:outline-none dark:bg-black/70"
      >
        <div className="animate-sheet-up border-border bg-elevated relative my-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border p-6 shadow-2xl sm:p-8">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close PIN recovery"
            className="text-muted hover:bg-subtle hover:text-main absolute top-4 right-4 rounded-full p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-yellow-100 p-4 dark:bg-amber-950/60">
              {method === "code" ? (
                <Key className="h-12 w-12 text-yellow-600 dark:text-amber-400" />
              ) : (
                <HelpCircle className="h-12 w-12 text-green-600 dark:text-emerald-400" />
              )}
            </div>
          </div>

          <h1 id={titleId} className="text-main mb-3 text-center text-2xl font-bold">
            {method === "code" ? "Enter Recovery Code" : "Answer Security Questions"}
          </h1>
          <p className="text-muted mb-6 text-center text-sm">
            {method === "code"
              ? "Enter the 6-digit recovery code you saved when you set up your PIN."
              : "Answer at least 2 out of 3 questions correctly to reset your PIN."}
          </p>

          {/* Method switcher tabs */}
          {hasSecurityQuestions && (
            <div
              role="tablist"
              aria-label="PIN recovery method"
              className="bg-subtle border-border mb-6 flex gap-2 rounded-lg border p-1"
            >
              <button
                ref={codeTabRef}
                id={codeTabId}
                type="button"
                role="tab"
                aria-selected={method === "code"}
                aria-controls={codePanelId}
                tabIndex={method === "code" ? 0 : -1}
                onClick={() => {
                  setMethod("code");
                  setError("");
                }}
                onKeyDown={handleMethodTabKeyDown}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                  method === "code"
                    ? "bg-surface text-main shadow-sm"
                    : "text-muted hover:text-main"
                }`}
              >
                Recovery Code
              </button>
              <button
                ref={questionsTabRef}
                id={questionsTabId}
                type="button"
                role="tab"
                aria-selected={method === "questions"}
                aria-controls={questionsPanelId}
                tabIndex={method === "questions" ? 0 : -1}
                onClick={() => {
                  setMethod("questions");
                  setError("");
                }}
                onKeyDown={handleMethodTabKeyDown}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                  method === "questions"
                    ? "bg-surface text-main shadow-sm"
                    : "text-muted hover:text-main"
                }`}
              >
                Security Questions
              </button>
            </div>
          )}

          {/* Recovery Code Form */}
          {method === "code" && (
            <div
              id={codePanelId}
              role={hasSecurityQuestions ? "tabpanel" : undefined}
              aria-labelledby={hasSecurityQuestions ? codeTabId : undefined}
              className="mb-6"
            >
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                aria-label="6-digit recovery code"
                data-large-input="true"
                value={recoveryCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setRecoveryCode(value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyRecovery()}
                className="border-border-strong bg-input text-main placeholder:text-muted w-full rounded-lg border-2 p-4 text-center text-3xl font-bold tracking-widest transition-all outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/25"
                placeholder="000000"
                autoFocus
              />
            </div>
          )}

          {/* Security Questions Form */}
          {method === "questions" && (
            <div
              id={questionsPanelId}
              role={hasSecurityQuestions ? "tabpanel" : undefined}
              aria-labelledby={hasSecurityQuestions ? questionsTabId : undefined}
              className="mb-6 space-y-4"
            >
              {savedQuestionIds.map((questionId, index) => {
                const question = SECURITY_QUESTIONS.find((q) => q.id === questionId);
                if (!question) return null;
                const answerInputId = `${idPrefix}-answer-${index}`;

                return (
                  <div
                    key={questionId}
                    className="border-border bg-subtle rounded-lg border-2 p-4"
                  >
                    <label
                      htmlFor={answerInputId}
                      className="text-secondary mb-2 block text-sm font-bold"
                    >
                      {question.question}
                    </label>
                    <input
                      id={answerInputId}
                      type="text"
                      value={answers[index]}
                      onChange={(e) => {
                        const newAnswers = [...answers];
                        newAnswers[index] = e.target.value;
                        setAnswers(newAnswers);
                        setError("");
                      }}
                      placeholder={question.placeholder}
                      className="border-border-strong bg-input text-main placeholder:text-muted w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/30 focus:outline-none"
                      autoFocus={index === 0}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:border dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={method === "code" ? handleVerifyRecovery : handleVerifySecurityQuestions}
            className="w-full rounded-lg bg-amber-700 px-4 py-3 font-bold text-white shadow-md transition-all hover:bg-amber-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              method === "code"
                ? recoveryCode.length !== 6
                : answers.some((a) => a.trim().length < 2)
            }
          >
            {method === "code" ? "Verify Code" : "Verify Answers"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "newPin") {
    return (
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="safe-y animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm focus:outline-none dark:bg-black/70"
      >
        <div className="animate-sheet-up border-border bg-elevated relative my-auto w-full max-w-md rounded-3xl border p-6 shadow-2xl sm:p-8">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close PIN recovery"
            className="text-muted hover:bg-subtle hover:text-main absolute top-4 right-4 rounded-full p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <h1 id={titleId} className="text-main mb-3 text-center text-2xl font-bold">
            Create New PIN
          </h1>
          <p className="text-muted mb-6 text-center text-sm">Enter your new 4-digit PIN.</p>

          <div className="mb-6">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              aria-label="New 4-digit PIN"
              data-large-input="true"
              value={newPin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setNewPin(value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleNewPin()}
              className="border-border-strong bg-input text-main w-full rounded-lg border-2 p-4 text-center text-4xl font-bold tracking-widest transition-all outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/25"
              placeholder="••••"
              autoFocus
            />

            {error && (
              <div
                role="alert"
                className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:border dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleNewPin}
            className="bg-primary hover:bg-primary/90 w-full rounded-lg px-4 py-3 font-bold text-white shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="safe-y animate-fade-in fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm focus:outline-none dark:bg-black/70"
    >
      <div className="animate-sheet-up border-border bg-elevated relative my-auto w-full max-w-md rounded-3xl border p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close PIN recovery"
          className="text-muted hover:bg-subtle hover:text-main absolute top-4 right-4 rounded-full p-1 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h1 id={titleId} className="text-main mb-3 text-center text-2xl font-bold">
          Confirm New PIN
        </h1>
        <p className="text-muted mb-6 text-center text-sm">Re-enter your PIN to confirm.</p>

        <div className="mb-6">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            aria-label="Confirm new 4-digit PIN"
            data-large-input="true"
            value={confirmPin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setConfirmPin(value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleConfirmPin()}
            className="border-border-strong bg-input text-main w-full rounded-lg border-2 p-4 text-center text-4xl font-bold tracking-widest transition-all outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/25"
            placeholder="••••"
            autoFocus
          />

          {error && (
            <div
              role="alert"
              className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:border dark:border-red-800/70 dark:bg-red-950/50 dark:text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setConfirmPin("");
              setStep("newPin");
            }}
            className="border-border-strong text-secondary hover:bg-subtle flex-1 rounded-lg border-2 px-4 py-3 font-bold transition-all active:scale-95"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirmPin}
            className="flex-1 rounded-lg bg-green-700 px-4 py-3 font-bold text-white shadow-md transition-all hover:bg-green-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={confirmPin.length !== 4}
          >
            Reset PIN
          </button>
        </div>
      </div>
    </div>
  );
}
