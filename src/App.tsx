// src/App.tsx
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { ToastProvider } from "./context/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary"; // ✅ Import

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
