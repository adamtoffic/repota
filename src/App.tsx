import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { Toaster } from "sonner";
import { SchoolProvider } from "./context/SchoolContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineDetector } from "./components/OfflineDetector";
import { useState } from "react";
import { isPinConfigured } from "./utils/pinSecurity";
import { PinSetup } from "./components/PinSetup";

function App() {
  const [showPinSetup, setShowPinSetup] = useState(() => !isPinConfigured());
  const [isCheckingPin, setIsCheckingPin] = useState(true);

  // Complete PIN check after initial render
  if (isCheckingPin) {
    setTimeout(() => setIsCheckingPin(false), 0);
  }

  // Show nothing while checking PIN status
  if (isCheckingPin) {
    return null;
  }

  // Show PIN setup if not configured
  if (showPinSetup) {
    return <PinSetup onComplete={() => setShowPinSetup(false)} />;
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
