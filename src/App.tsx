import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { Toaster, toast } from "sonner";
import { SchoolProvider } from "./context/SchoolContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineDetector } from "./components/OfflineDetector";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { PIN_CONFIG_CHANGED_EVENT, isPinConfigured } from "./utils/pinSecurity";
import { LockScreen } from "./components/LockScreen";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { useIdleTimer } from "./hooks/useIdleTimer";

const PinRecovery = lazyWithRetry(() =>
  import("./components/PinRecovery").then((module) => ({ default: module.PinRecovery })),
);
import { useSchoolSettings } from "./hooks/useSchoolData";
import { useTheme } from "./hooks/useTheme";
import { PRINT_STARTED_EVENT } from "./utils/printHandler";
import { getStorageType, STORAGE_QUOTA_EXCEEDED_EVENT } from "./utils/idbStorage";
import { captureEvent } from "./utils/analytics";

export const HIDDEN_LOCK_GRACE_MS = 30_000;
export const PRINT_LOCK_SUPPRESSION_MS = 2 * 60_000;

function AppContent({
  isLocked: propIsLocked,
  setIsLocked: propSetIsLocked,
}: {
  isLocked?: boolean;
  setIsLocked?: React.Dispatch<React.SetStateAction<boolean>>;
} = {}) {
  const [localIsLocked, setLocalIsLocked] = useState(() => isPinConfigured());
  const [pinConfigured, setPinConfigured] = useState(() => isPinConfigured());
  const isLocked = propIsLocked ?? localIsLocked;
  const setIsLocked = propSetIsLocked ?? setLocalIsLocked;
  const [showRecovery, setShowRecovery] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const settings = useSchoolSettings();
  const { resolvedTheme } = useTheme();
  const rawTimeout = settings.autoLockTimeout;
  const timeoutMinutes =
    typeof rawTimeout === "number" &&
    Number.isFinite(rawTimeout) &&
    rawTimeout >= 1 &&
    rawTimeout <= 30
      ? rawTimeout
      : 5;
  const idleTimeout = timeoutMinutes * 60 * 1000;
  const hiddenAtRef = useRef<number | null>(null);
  const printInProgressRef = useRef(false);
  const printTimeoutRef = useRef<number | null>(null);
  const [isPrintSuppressed, setIsPrintSuppressed] = useState(false);

  useEffect(() => {
    const syncPinConfigured = () => setPinConfigured(isPinConfigured());
    syncPinConfigured();
    window.addEventListener(PIN_CONFIG_CHANGED_EVENT, syncPinConfigured);
    window.addEventListener("storage", syncPinConfigured);
    return () => {
      window.removeEventListener(PIN_CONFIG_CHANGED_EVENT, syncPinConfigured);
      window.removeEventListener("storage", syncPinConfigured);
    };
  }, []);

  // Auto-lock after idle time
  const handleIdle = useCallback(() => {
    if (isPinConfigured() && !isLocked && !printInProgressRef.current) {
      setIsLocked(true);
    }
  }, [isLocked, setIsLocked]);

  useIdleTimer({
    timeout: idleTimeout,
    onIdle: handleIdle,
    enabled: pinConfigured && !isLocked && !isPrintSuppressed,
  });

  // Lock app when it becomes hidden (user switches tabs/apps)
  useEffect(() => {
    const clearPrintState = () => {
      printInProgressRef.current = false;
      setIsPrintSuppressed(false);
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
      }
      if (printTimeoutRef.current !== null) {
        window.clearTimeout(printTimeoutRef.current);
        printTimeoutRef.current = null;
      }
    };

    const markPrintInProgress = () => {
      printInProgressRef.current = true;
      setIsPrintSuppressed(true);
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

    const handleStorageQuotaExceeded = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      toast.error(
        detail?.message ||
          "Storage full: cannot save latest changes. Save a .repota backup and clear old photos.",
        { id: "storage-quota-exceeded", duration: 8000 },
      );
      captureEvent("Storage_Quota_Exceeded", { storage_type: getStorageType() });
    };

    window.addEventListener(PRINT_STARTED_EVENT, markPrintInProgress);
    window.addEventListener("beforeprint", markPrintInProgress);
    window.addEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, handleStorageQuotaExceeded);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener(PRINT_STARTED_EVENT, markPrintInProgress);
      window.removeEventListener("beforeprint", markPrintInProgress);
      window.removeEventListener(STORAGE_QUOTA_EXCEEDED_EVENT, handleStorageQuotaExceeded);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (printTimeoutRef.current !== null) {
        window.clearTimeout(printTimeoutRef.current);
      }
    };
  }, [setIsLocked]);

  const handleUnlock = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsLocked(false);
      setIsTransitioning(false);
    }, 300);
  };

  // Show lock screen (kept mounted behind PinRecovery so backdrop blur layers cleanly)
  if (isLocked) {
    return (
      <ErrorBoundary>
        <LockScreen
          paused={showRecovery}
          onUnlock={handleUnlock}
          onForgotPin={() => setShowRecovery(true)}
        />
        {showRecovery && (
          <Suspense fallback={null}>
            <PinRecovery
              onComplete={() => {
                setShowRecovery(false);
                handleUnlock();
              }}
              onCancel={() => setShowRecovery(false)}
            />
          </Suspense>
        )}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div
        className={`transition-opacity duration-300 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
      >
        {/* Sonner Toaster - top-center so it never overlaps the mobile bottom nav */}
        <Toaster
          theme={resolvedTheme}
          position="top-center"
          offset={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
          mobileOffset={{
            top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
            left: "1rem",
            right: "1rem",
          }}
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
  const [isLocked, setIsLocked] = useState(() => isPinConfigured());
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SchoolProvider isLocked={isLocked}>
          <AppContent isLocked={isLocked} setIsLocked={setIsLocked} />
        </SchoolProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
