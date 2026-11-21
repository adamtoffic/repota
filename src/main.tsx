import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import "./index.css";
import App from "./App.tsx";
import { getRuntimeAnalyticsContext, sanitizePostHogUrl } from "./utils/analytics";
import { resolveAppEnv, shouldSendAnalytics } from "./utils/analyticsEnv";
import { setupVitePreloadErrorHandler } from "./utils/preloadErrorHandler";

// Auto-reload once on Vite dynamic import chunk/preload failures
setupVitePreloadErrorHandler();

const appEnv = resolveAppEnv();
const isAnalyticsEnabled = shouldSendAnalytics(appEnv);

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  person_profiles: "identified_only",
  capture_pageview: "history_change",
  capture_pageleave: "if_capture_pageview",
  autocapture: true,
  persistence: "localStorage", // Queues events while offline
  disable_session_recording: !isAnalyticsEnabled,

  mask_all_text: true,
  mask_all_element_attributes: true,

  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "*",
    blockSelector: "img",
    maskTextFn: (text, element) =>
      element?.closest('[data-record="true"]') ? text : "*".repeat(text.length),
  },

  before_send: (event) => {
    if (!event || !isAnalyticsEnabled) return null;
    const nextProperties: Record<string, unknown> = {
      ...getRuntimeAnalyticsContext(),
      ...event.properties,
      app_env: appEnv,
    };
    if (event.properties?.$current_url !== undefined) {
      nextProperties.$current_url = sanitizePostHogUrl(event.properties.$current_url);
    }
    return {
      ...event,
      properties: nextProperties,
    };
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
