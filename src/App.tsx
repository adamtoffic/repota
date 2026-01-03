// src/App.tsx
import { useState } from "react";
import { useSchoolData } from "./hooks/useSchoolData";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";

function App() {
  // 1. Load Data (The Brain)
  const { settings, setSettings, students, addStudent, deleteStudent } = useSchoolData();

  // 2. Local View State
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");

  return (
    <Layout schoolName={settings.name} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "dashboard" ? (
        <Dashboard
          students={students}
          settings={settings}
          onAddStudent={addStudent}
          onDeleteStudent={deleteStudent}
        />
      ) : (
        <Settings
          settings={settings}
          onSave={(newSettings) => {
            setSettings(newSettings);
            alert("Settings Saved Successfully!");
            setActiveTab("dashboard");
          }}
        />
      )}
    </Layout>
  );
}

export default App;
