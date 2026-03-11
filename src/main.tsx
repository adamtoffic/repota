import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import posthog from "posthog-js";
import "./index.css";
import App from "./App.tsx";

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  person_profiles: "identified_only",
  capture_pageview: false, // We will rely on manual events to save bandwidth
  autocapture: false, // Disable autocapture to prevent heavy DOM tracking
  persistence: "localStorage", // CRITICAL FOR PWA: Queues events when offline
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
