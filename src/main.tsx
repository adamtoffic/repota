import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App.tsx";

// Register PWA Service Worker
import { registerSW } from "virtual:pwa-register";

// Register service worker with auto-update
registerSW({
  onNeedRefresh() {
    // Show a prompt to user that a new version is available
    if (confirm("New version available! Reload to update?")) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
