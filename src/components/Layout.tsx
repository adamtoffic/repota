import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";

interface Props {
  children: ReactNode;
  schoolName: string;
  activeTab: "dashboard" | "settings" | "subject-entry";
  onTabChange: (tab: "dashboard" | "settings" | "subject-entry") => void;
}

export function Layout({ children, schoolName, activeTab, onTabChange }: Props) {
  return (
    <div className="text-main bg-background min-h-screen font-sans">
      {/* NAVIGATION */}
      <nav className="safe-top sticky top-0 z-50 bg-blue-900 shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-linear-to-br from-amber-400 to-amber-500 p-2">
              <GraduationCap className="h-6 w-6 text-blue-900" />
            </div>
            <div>
              <h1 className="text-xl leading-tight font-bold text-white">Repota</h1>
              <p className="text-xs text-blue-200 opacity-90">
                {schoolName || "Configure School Name"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onTabChange("dashboard")}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors sm:px-4 ${
                activeTab === "dashboard"
                  ? "bg-white text-blue-900"
                  : "text-blue-100 hover:bg-white/10"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onTabChange("subject-entry")}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors sm:px-4 ${
                activeTab === "subject-entry"
                  ? "bg-white text-blue-900"
                  : "text-blue-100 hover:bg-white/10"
              }`}
            >
              <span className="hidden sm:inline">Subject Entry</span>
              <span className="sm:hidden">Entry</span>
            </button>
            <button
              onClick={() => onTabChange("settings")}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors sm:px-4 ${
                activeTab === "settings"
                  ? "bg-white text-blue-900"
                  : "text-blue-100 hover:bg-white/10"
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
