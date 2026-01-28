import { useState, useEffect } from "react";
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

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const { available, type } = await isBiometricAvailable();
    setBiometricAvailable(available);
    setBiometricType(type);
  };

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
      // Check if biometric is available, if so go to biometric step
      if (biometricAvailable) {
        setStep("biometric");
      } else {
        await handleFinishSetup();
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
      await handleFinishSetup();
    } else {
      setError(biometricError || "Failed to enroll biometric");
    }
  };

  const handleSkipBiometric = async () => {
    await handleFinishSetup();
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
      <div className="bg-opacity-95 fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          {onCancel && (
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-blue-100 p-4">
              <Lock className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <h1 className="mb-3 text-center text-2xl font-bold text-gray-900">
            {isChangingPin ? "Change Your PIN" : "Secure Your Data"}
          </h1>
          <p className="mb-6 text-center text-sm text-gray-600">
            {isChangingPin
              ? "Set a new 4-digit PIN to protect your student records."
              : "Set up a 4-digit PIN to protect your student records from unauthorized access."}
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
        <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          {onCancel && (
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <h2 className="mb-2 text-center text-xl font-bold text-gray-900">
            {isChangingPin ? "Enter New PIN" : "Create Your PIN"}
          </h2>
          <p className="mb-6 text-center text-sm text-gray-600">
            {isChangingPin
              ? "Choose a new 4-digit PIN"
              : "Choose a 4-digit PIN to secure your data"}
          </p>

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
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-center text-2xl tracking-widest transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
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
            {isChangingPin && onCancel && (
              <button
                onClick={onCancel}
                className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleCreatePin}
              disabled={pin.length !== 4}
              className={`${isChangingPin ? "flex-1" : "w-full"} rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          {onCancel && (
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <h2 className="mb-2 text-center text-xl font-bold text-gray-900">Confirm Your PIN</h2>
          <p className="mb-6 text-center text-sm text-gray-600">Re-enter your PIN to confirm</p>

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
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-center text-2xl tracking-widest transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
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
  if (step === "recovery") {
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
              <span className="text-4xl font-bold tracking-wider text-amber-900">
                {recoveryCode}
              </span>
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
                <strong>Important:</strong> Keep this code safe. You'll need it to reset your PIN.
              </span>
            </p>
          </div>

          <button
            onClick={() => setStep("questions")}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <HelpCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <h2 className="mb-3 text-center text-xl font-bold text-gray-900">
            Set Security Questions (Optional)
          </h2>
          <p className="mb-6 text-center text-sm text-gray-600">
            Answer 3 questions to help you recover access if you forget your PIN.
          </p>

          <div className="mb-6 space-y-4">
            {[0, 1, 2].map((index) => {
              const selectedQuestion = SECURITY_QUESTIONS.find(
                (q) => q.id === selectedQuestions[index],
              );

              return (
                <div key={index} className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4">
                  <label className="mb-2 block text-sm font-bold text-gray-700">
                    Question {index + 1}
                  </label>
                  <select
                    value={selectedQuestions[index]}
                    onChange={(e) => {
                      const newQuestions = [...selectedQuestions];
                      newQuestions[index] = e.target.value;
                      setSelectedQuestions(newQuestions);
                      setError("");
                    }}
                    className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none"
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
                      value={answers[index]}
                      onChange={(e) => {
                        const newAnswers = [...answers];
                        newAnswers[index] = e.target.value;
                        setAnswers(newAnswers);
                        setError("");
                      }}
                      placeholder={selectedQuestion.placeholder}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Choose questions with answers you'll always remember. Answers
              are case-insensitive.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("recovery");
                setError("");
              }}
              className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleSaveSecurityQuestions}
              className="flex-1 rounded-lg bg-green-600 py-3 font-semibold text-white transition-colors hover:bg-green-700"
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-indigo-100 p-4">
              <Fingerprint className="h-12 w-12 text-indigo-600" />
            </div>
          </div>

          <h2 className="mb-3 text-center text-xl font-bold text-gray-900">
            Enable {biometricName}?
          </h2>
          <p className="mb-6 text-center text-sm text-gray-600">
            Use {biometricName} to unlock the app quickly. Your PIN will still work as a backup.
          </p>

          <div className="mb-6 space-y-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
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
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSkipBiometric}
              disabled={enrollingBiometric}
              className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Skip for Now
            </button>
            <button
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
