import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { ToastProvider } from "./context/ToastContext";
import { SchoolProvider } from "./context/SchoolContext"; // ✅ Import this
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        {/* ✅ Wrap Router with SchoolProvider */}
        <SchoolProvider>
          <RouterProvider router={router} />
        </SchoolProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
