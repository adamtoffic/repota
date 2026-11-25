import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initPostHogAnalytics } from "./utils/analytics";
import { resolveAppEnv, shouldSendAnalytics } from "./utils/analyticsEnv";
import { setupVitePreloadErrorHandler } from "./utils/preloadErrorHandler";

// Auto-reload once on Vite dynamic import chunk/preload failures
setupVitePreloadErrorHandler();

if (import.meta.env.MODE === "test") {
  void initPostHogAnalytics({ forceInTest: true });
} else if (shouldSendAnalytics(resolveAppEnv())) {
  const startAnalytics = () => {
    void initPostHogAnalytics();
  };
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(startAnalytics);
  } else if (typeof window !== "undefined") {
    window.setTimeout(startAnalytics, 1500);
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
