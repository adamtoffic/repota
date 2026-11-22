import { Suspense, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Calculator,
  Home,
  LayoutTemplate,
  Monitor,
  Moon,
  Printer,
  School,
  Settings,
  ShieldCheck,
  Sun,
} from "lucide-react";
import {
  useSchoolLifecycle,
  useSchoolSettings,
  useSchoolStudents,
} from "../../hooks/useSchoolData";
import { useTheme } from "../../hooks/useTheme";
import { triggerHaptic } from "../../utils/iosInteraction";
import { AutoSaveIndicator } from "../AutoSaveIndicator";
import { PageLoader } from "../PageLoader";
import { RepotaLogo } from "../ui/RepotaLogo";

interface AppShellProps {
  children: ReactNode;
}

const SETTINGS_QUICK_LINKS = [
  { to: "/settings/school" as const, label: "School & Staff", icon: School },
  { to: "/settings/academic" as const, label: "Class & Subjects", icon: BookOpen },
  { to: "/settings/templates" as const, label: "Report Style", icon: LayoutTemplate },
  { to: "/settings/security" as const, label: "Security & Backup", icon: ShieldCheck },
];

function SidebarStudentCountBadge() {
  const students = useSchoolStudents();
  if (students.length === 0) return null;
  return (
    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
      {students.length}
    </span>
  );
}

function ConnectedAutoSaveIndicator() {
  const { isSaving, lastSaved } = useSchoolLifecycle();
  return <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />;
}

const THEME_OPTIONS = [
  { value: "system" as const, label: "System", icon: Monitor },
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "dark" as const, label: "Dark", icon: Moon },
];

export function AppShell({ children }: AppShellProps) {
  const settings = useSchoolSettings();
  const { preference, setTheme } = useTheme();
  const pathname = useLocation({ select: (location) => location.pathname });

  const isHomeActive = pathname === "/";
  const isSbaActive = pathname.startsWith("/sba");
  const isAnalyticsActive = pathname.startsWith("/analytics");
  const isSettingsActive = pathname.startsWith("/settings");

  const primaryItems = [
    { to: "/" as const, label: "Home", icon: Home, isActive: isHomeActive },
    { to: "/sba" as const, label: "SBA", icon: Calculator, isActive: isSbaActive },
    { to: "/analytics" as const, label: "Analytics", icon: BarChart3, isActive: isAnalyticsActive },
    { to: "/settings" as const, label: "Settings", icon: Settings, isActive: isSettingsActive },
  ];
  const activePrimaryIndex = primaryItems.findIndex((item) => item.isActive);

  return (
    <div className="bg-background min-h-screen">
      {/* Desktop Persistent Sidebar */}
      <aside
        aria-label="Sidebar navigation"
        className="md:border-border md:bg-surface hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col md:border-r print:hidden"
      >
        <div className="border-border-subtle border-b px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-sm">
              <RepotaLogo className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="text-main block text-lg leading-none font-black tracking-tight"
                data-record="true"
              >
                REPOTA
              </span>
              <p className="text-muted mt-1 truncate text-xs font-medium">
                {settings.schoolName || "No School Selected"}
              </p>
            </div>
          </div>
          {settings.className && (
            <div className="mt-3 inline-flex max-w-full items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-300">
              <span className="truncate">{settings.className}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                preload={false}
                aria-current={item.isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  item.isActive
                    ? "bg-primary/10 text-primary-text dark:bg-elevated dark:text-main font-bold dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                    : "text-secondary hover:bg-subtle hover:text-main font-medium"
                }`}
                data-record="true"
              >
                <Icon className={`h-5 w-5 shrink-0 ${item.isActive ? "text-primary-text" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Settings Quick-Jump Sub-Links */}
          <div className="border-border mt-1 ml-4 space-y-1 border-l pl-3">
            {SETTINGS_QUICK_LINKS.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = pathname === sub.to;
              return (
                <Link
                  key={sub.to}
                  to={sub.to}
                  aria-current={isSubActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                    isSubActive
                      ? "bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                      : "text-muted hover:bg-subtle hover:text-main font-medium"
                  }`}
                  data-record="true"
                >
                  <SubIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{sub.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-border space-y-3 border-t p-4">
          <div
            role="group"
            aria-label="Theme preference"
            className="bg-subtle border-border grid grid-cols-3 gap-1 rounded-xl border p-1"
          >
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = preference === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={isSelected}
                  aria-label={`Use ${option.label.toLowerCase()} theme`}
                  className={`flex items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-all ${
                    isSelected
                      ? "bg-surface text-main dark:bg-elevated shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                      : "text-muted hover:text-main"
                  }`}
                  data-record="true"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <Link
            to="/print"
            className="bg-primary hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all active:scale-95"
            data-record="true"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span>Print Reports</span>
            <SidebarStudentCountBadge />
          </Link>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="pb-safe-nav flex min-h-screen flex-col md:pl-64 print:pb-0 print:pl-0">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </div>

      {/* Persistent Auto-Save Indicator (isolated leaf so save ticks never re-render AppShell) */}
      <ConnectedAutoSaveIndicator />

      {/* Mobile Floating Liquid Glass Bottom Navigation Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="safe-bottom safe-bottom-floating pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 md:hidden print:hidden"
      >
        <div className="pointer-events-auto relative mx-auto grid h-[60px] max-w-[380px] transform-gpu grid-cols-4 items-center rounded-full border border-white/80 bg-white/72 p-1.5 shadow-[0_8px_32px_rgba(15,23,42,0.12),0_2px_8px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.95),inset_0_-1px_1px_rgba(15,23,42,0.05)] backdrop-blur-2xl backdrop-saturate-[180%] dark:border-white/[0.14] dark:bg-[#131926]/72 dark:shadow-[0_12px_36px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0.5px_rgba(255,255,255,0.18),inset_0_-1px_1px_rgba(0,0,0,0.35)]">
          {activePrimaryIndex >= 0 && (
            <div className="pointer-events-none absolute inset-1.5" aria-hidden="true">
              <div
                className="h-full w-1/4 rounded-full bg-slate-900/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.05] transition-transform duration-300 ease-[cubic-bezier(0.32,1.18,0.42,1)] motion-reduce:transition-none dark:bg-white/[0.12] dark:shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.22),0_2px_8px_rgba(0,0,0,0.25)] dark:ring-white/[0.10]"
                style={{ transform: `translateX(${activePrimaryIndex * 100}%)` }}
              />
            </div>
          )}

          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                preload={false}
                aria-current={item.isActive ? "page" : undefined}
                onClick={() => triggerHaptic("light")}
                className={`relative z-10 flex h-full touch-manipulation flex-col items-center justify-center gap-0.5 rounded-full text-[11px] leading-none transition-transform duration-150 select-none active:scale-95 ${
                  item.isActive
                    ? "text-primary-text font-bold"
                    : "text-secondary/80 dark:text-muted font-medium"
                }`}
                data-record="true"
              >
                <Icon
                  className={`pointer-events-none h-5 w-5 transition-transform duration-200 ${
                    item.isActive ? "scale-105 stroke-[2.4]" : "stroke-[1.9]"
                  }`}
                />
                <span className="pointer-events-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
