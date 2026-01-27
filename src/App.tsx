import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { Toaster } from "sonner";
import { SchoolProvider } from "./context/SchoolContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineDetector } from "./components/OfflineDetector";
import { useState, useEffect } from "react";
import { isPinConfigured } from "./utils/pinSecurity";
import { LockScreen } from "./components/LockScreen";
import { PinRecovery } from "./components/PinRecovery";

function App() {
  const [isLocked, setIsLocked] = useState(() => isPinConfigured());
  const [showRecovery, setShowRecovery] = useState(false);

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

  // Show recovery modal if user forgot PIN
  if (showRecovery) {
    return (
      <ErrorBoundary>
        <PinRecovery
          onComplete={() => {
            setShowRecovery(false);
            setIsLocked(false);
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
        <LockScreen onUnlock={() => setIsLocked(false)} onForgotPin={() => setShowRecovery(true)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {/* Sonner Toaster - positioned at bottom-right */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "0.75rem",
          },
        }}
        richColors
        closeButton
      />

      {/* Detect offline/online transitions */}
      <OfflineDetector />

      {/* Wrap Router with SchoolProvider */}
      <SchoolProvider>
        <RouterProvider router={router} />
      </SchoolProvider>
    </ErrorBoundary>
  );
}

export default App;
