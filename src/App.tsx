// src/App.tsx
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { ToastProvider } from "./context/ToastContext"; // ✅ Import Provider

function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

export default App;
