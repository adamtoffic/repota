// src/components/WelcomeTour.tsx
import { useState, useEffect } from "react";
import { X, ArrowRight, Check } from "lucide-react";

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

  useEffect(() => {
    // Check if user has completed tour before
    const hasCompletedTour = localStorage.getItem(storageKey);
    if (!hasCompletedTour) {
      // Small delay before showing tour for better UX
      setTimeout(() => setIsVisible(true), 800);
    }
  }, [storageKey]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(storageKey, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="animate-slide-in-up relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Skip tour"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress indicator */}
        <div className="mb-6 flex gap-1.5">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-blue-600"
                  : index < currentStep
                    ? "bg-blue-300"
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">{step.title}</h2>
          <p className="leading-relaxed text-gray-600">{step.description}</p>
        </div>

        {/* Step action if provided */}
        {step.action && (
          <button
            onClick={step.action.onClick}
            className="mb-4 w-full rounded-lg border-2 border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            {step.action.text}
          </button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleSkip}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Skip tour
          </button>

          <button
            onClick={handleNext}
            className="bg-primary hover:bg-primary/90 flex items-center gap-2 rounded-lg px-6 py-2.5 font-bold text-white shadow-sm transition-all active:scale-95"
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

        {/* Step counter */}
        <p className="mt-4 text-center text-xs text-gray-400">
          Step {currentStep + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}
