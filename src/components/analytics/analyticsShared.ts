import { BarChart3, BookOpen, Brain, Users } from "lucide-react";

export type AnalyticsViewId = "overview" | "subjects" | "demographics" | "insights";

export const ANALYTICS_VIEWS: ReadonlyArray<{
  id: AnalyticsViewId;
  label: string;
  icon: typeof BarChart3;
}> = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "subjects", label: "Subjects", icon: BookOpen },
  { id: "demographics", label: "Demographics", icon: Users },
  { id: "insights", label: "AI Insights", icon: Brain },
];

export const GRADE_COLORS: Record<string, string> = {
  // KG grades
  GOLD: "#10b981",
  SILVER: "#94a3b8",
  BRONZE: "#f59e0b",
  // PRIMARY / JHS numeric grades
  "1": "#10b981",
  "2": "#3b82f6",
  "3": "#f59e0b",
  "4": "#f97316",
  "5": "#ef4444",
  "6": "#dc2626",
  "7": "#991b1b",
  "8": "#7f1d1d",
  "9": "#450a0a",
  // SHS grades
  A1: "#10b981",
  B2: "#059669",
  B3: "#3b82f6",
  C4: "#2563eb",
  C5: "#f59e0b",
  C6: "#d97706",
  D7: "#f97316",
  E8: "#ef4444",
  F9: "#dc2626",
};
