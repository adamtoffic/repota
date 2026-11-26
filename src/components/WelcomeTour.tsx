// src/components/WelcomeTour.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useDialogA11y } from "../hooks/useDialogA11y";

interface TourStep {
  title: string;
  description: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface Props {
  steps: TourStep[];
  onComplete: () => void;
  storageKey?: string;
}

export function WelcomeTour({ steps, onComplete, storageKey = "welcome_tour_completed" }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleComplete = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
    onComplete();
  }, [storageKey, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
  }, [storageKey]);

  useEffect(() => {
    // Check if user has completed tour before
    const hasCompletedTour = localStorage.getItem(storageKey);
    if (!hasCompletedTour) {
      // Small delay before showing tour for better UX
      const timer = window.setTimeout(() => setIsVisible(true), 800);
      return () => window.clearTimeout(timer);
    }
  }, [storageKey]);

  useDialogA11y({
    isOpen: isVisible && steps.length > 0,
    onClose: handleSkip,
    dialogRef,
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  if (!isVisible || steps.length === 0) return null;

  const step = steps[currentStep] ?? steps[0];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="animate-fade-in fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-tour-title"
        className="animate-slide-in-up border-border bg-elevated w-full max-w-md rounded-2xl border p-5 shadow-2xl focus:outline-none sm:p-6"
      >
        {/* Progress indicator + non-overlapping Close button */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-blue-600 dark:bg-blue-400"
                    : index < currentStep
                      ? "bg-blue-300 dark:bg-blue-700"
                      : "bg-subtle"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-muted hover:bg-subtle hover:text-main shrink-0 rounded-full p-1.5 transition-colors"
            aria-label="Close tour"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <h2 id="welcome-tour-title" className="text-main mb-2 text-xl font-bold sm:text-2xl">
            {step.title}
          </h2>
          <p className="text-secondary leading-relaxed">{step.description}</p>
        </div>

        {/* Step action if provided */}
        {step.action && (
          <button
            type="button"
            onClick={step.action.onClick}
            className="mb-4 w-full rounded-lg border-2 border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950/80"
          >
            {step.action.text}
          </button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="text-muted hover:text-main text-sm font-medium"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                className="border-border bg-surface text-secondary hover:bg-subtle flex items-center gap-1 rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-5 py-2.5 font-bold text-white shadow-sm transition-all active:scale-95 sm:px-6"
            >
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Step counter */}
        <p className="text-muted mt-4 text-center text-xs">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}
