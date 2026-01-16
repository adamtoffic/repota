import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";

interface Props {
  children: ReactNode;
  schoolName: string;
  activeTab: "dashboard" | "settings";
  onTabChange: (tab: "dashboard" | "settings") => void;
}

export function Layout({ children, schoolName, activeTab, onTabChange }: Props) {
  return (
    <div className="text-main bg-background min-h-screen font-sans">
      {/* NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-blue-900 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-yellow-400" />
            <div>
              <h1 className="text-xl leading-tight font-bold">Repota</h1>
              <p className="text-xs text-blue-200 opacity-80">
                {schoolName || "Configure School Name"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onTabChange("dashboard")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-white/10 text-white"
                  : "text-blue-100 hover:bg-white/5"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onTabChange("settings")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "settings"
                  ? "bg-white/10 text-white"
                  : "text-blue-100 hover:bg-white/5"
              }`}
            >
              Settings
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT CONTAINER */}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
