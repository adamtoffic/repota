import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { Toaster } from "sonner";
import { SchoolProvider } from "./context/SchoolContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineDetector } from "./components/OfflineDetector";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { useState, useEffect, useCallback } from "react";
import { isPinConfigured } from "./utils/pinSecurity";
import { LockScreen } from "./components/LockScreen";
import { PinRecovery } from "./components/PinRecovery";
import { useIdleTimer } from "./hooks/useIdleTimer";
import { loadFromStorage } from "./utils/idbStorage";
import type { SchoolSettings } from "./types";

function App() {
  const [isLocked, setIsLocked] = useState(() => isPinConfigured());
  const [showRecovery, setShowRecovery] = useState(false);
  const [idleTimeout, setIdleTimeout] = useState(5 * 60 * 1000); // Default 5 minutes
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load auto-lock timeout from settings
  useEffect(() => {
    loadFromStorage<{ settings: SchoolSettings }>("app-data").then((data) => {
      if (data?.settings?.autoLockTimeout) {
        setIdleTimeout(data.settings.autoLockTimeout * 60 * 1000);
      }
    });
  }, []);

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
    const handleVisibilityChange = () => {
      if (document.hidden && isPinConfigured()) {
        setIsLocked(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
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

        {/* Wrap Router with SchoolProvider */}
        <SchoolProvider>
          <RouterProvider router={router} />
        </SchoolProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;
