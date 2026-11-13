import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import "./index.css";
import App from "./App.tsx";

// Auto-reload once on Vite dynamic import chunk/preload failures
export function setupVitePreloadErrorHandler() {
  const handler = () => {
    try {
      if (sessionStorage.getItem("repota_chunk_reload") !== "true") {
        sessionStorage.setItem("repota_chunk_reload", "true");
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };
  window.addEventListener("vite:preloadError", handler);
  return () => window.removeEventListener("vite:preloadError", handler);
}

setupVitePreloadErrorHandler();

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  person_profiles: "identified_only",
  capture_pageview: true,
  autocapture: true,
  persistence: "localStorage", // Queues events while offline

  mask_all_text: true,
  mask_all_element_attributes: true,

  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "*",
    blockSelector: "img",
    maskTextFn: (text, element) =>
      element?.closest('[data-record="true"]') ? text : "*".repeat(text.length),
  },
});

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
