import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { Toaster } from "sonner";
import { SchoolProvider } from "./context/SchoolContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineDetector } from "./components/OfflineDetector";

function App() {
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
