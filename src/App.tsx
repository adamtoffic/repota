// src/App.tsx
import { useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";

// Define the valid views
type ViewState = "dashboard" | "settings";

function App() {
  // State to track which page is visible
  const [currentView, setCurrentView] = useState<ViewState>("dashboard");

  return (
    <>
      {/* VIEW 1: DASHBOARD */}
      {currentView === "dashboard" && (
        <Dashboard onOpenSettings={() => setCurrentView("settings")} />
      )}

      {/* VIEW 2: SETTINGS */}
      {currentView === "settings" && <Settings onBack={() => setCurrentView("dashboard")} />}
    </>
  );
}

export default App;
