import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { Toaster } from "sonner";
import { SchoolProvider } from "./context/SchoolContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineDetector } from "./components/OfflineDetector";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { useState, useEffect, useCallback, useRef } from "react";
import { isPinConfigured } from "./utils/pinSecurity";
import { LockScreen } from "./components/LockScreen";
import { PinRecovery } from "./components/PinRecovery";
import { useIdleTimer } from "./hooks/useIdleTimer";
import { useSchoolData } from "./hooks/useSchoolData";
import { PRINT_STARTED_EVENT } from "./utils/printHandler";

export const HIDDEN_LOCK_GRACE_MS = 30_000;
export const PRINT_LOCK_SUPPRESSION_MS = 2 * 60_000;

function AppContent() {
  const [isLocked, setIsLocked] = useState(() => isPinConfigured());
  const [showRecovery, setShowRecovery] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { settings } = useSchoolData();
  const idleTimeout = (settings.autoLockTimeout ?? 5) * 60 * 1000;
  const hiddenAtRef = useRef<number | null>(null);
  const printInProgressRef = useRef(false);
  const printTimeoutRef = useRef<number | null>(null);

  // Auto-lock after idle time
  const handleIdle = useCallback(() => {
    if (isPinConfigured() && !isLocked) {
      setIsLocked(true);
    }
  }, [isLocked]);

  useIdleTimer({
    timeout: idleTimeout,
    onIdle: handleIdle,
    enabled: isPinConfigured() && !isLocked,
  });

  // Lock app when it becomes hidden (user switches tabs/apps)
  useEffect(() => {
    const clearPrintState = () => {
      printInProgressRef.current = false;
      if (printTimeoutRef.current !== null) {
        window.clearTimeout(printTimeoutRef.current);
        printTimeoutRef.current = null;
      }
    };

    const markPrintInProgress = () => {
      printInProgressRef.current = true;
      if (printTimeoutRef.current !== null) {
        window.clearTimeout(printTimeoutRef.current);
      }
      printTimeoutRef.current = window.setTimeout(clearPrintState, PRINT_LOCK_SUPPRESSION_MS);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (
        hiddenAt !== null &&
        !printInProgressRef.current &&
        Date.now() - hiddenAt >= HIDDEN_LOCK_GRACE_MS &&
        isPinConfigured()
      ) {
        setIsLocked(true);
      }
    };

    window.addEventListener(PRINT_STARTED_EVENT, markPrintInProgress);
    window.addEventListener("beforeprint", markPrintInProgress);
    window.addEventListener("afterprint", clearPrintState);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener(PRINT_STARTED_EVENT, markPrintInProgress);
      window.removeEventListener("beforeprint", markPrintInProgress);
      window.removeEventListener("afterprint", clearPrintState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (printTimeoutRef.current !== null) {
        window.clearTimeout(printTimeoutRef.current);
      }
    };
  }, []);

  const handleUnlock = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsLocked(false);
      setIsTransitioning(false);
    }, 300);
  };

  // Show recovery modal if user forgot PIN
  if (showRecovery) {
    return (
      <ErrorBoundary>
        <PinRecovery
          onComplete={() => {
            setShowRecovery(false);
            handleUnlock();
          }}
          onCancel={() => setShowRecovery(false)}
        />
      </ErrorBoundary>
    );
  }

  // Show lock screen if PIN is enabled and app is locked
  if (isLocked) {
    return (
      <ErrorBoundary>
        <LockScreen onUnlock={handleUnlock} onForgotPin={() => setShowRecovery(true)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div
        className={`transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
      >
        {/* Sonner Toaster - positioned at bottom-right */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "print:hidden",
            style: {
              borderRadius: "0.75rem",
            },
          }}
          richColors
          closeButton
        />

        {/* Detect offline/online transitions */}
        <OfflineDetector />

        {/* PWA Install Prompt */}
        <PwaInstallPrompt />

        <RouterProvider router={router} />
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <SchoolProvider>
        <AppContent />
      </SchoolProvider>
    </ErrorBoundary>
  );
}

export default App;
