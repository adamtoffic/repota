import { Suspense, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Calculator,
  Home,
  LayoutTemplate,
  Printer,
  School,
  Settings,
  ShieldCheck,
} from "lucide-react";
import {
  useSchoolLifecycle,
  useSchoolSettings,
  useSchoolStudents,
} from "../../hooks/useSchoolData";
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

export function AppShell({ children }: AppShellProps) {
  const settings = useSchoolSettings();
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

  return (
    <div className="bg-background min-h-screen">
      {/* Desktop Persistent Sidebar */}
      <aside
        aria-label="Sidebar navigation"
        className="hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col md:border-r md:border-gray-200 md:bg-white print:hidden"
      >
        <div className="border-b border-gray-100 px-4 py-4">
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
            <div className="mt-3 inline-flex max-w-full items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
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
                    ? "bg-primary/10 text-primary font-bold"
                    : "font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
                data-record="true"
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Settings Quick-Jump Sub-Links */}
          <div className="mt-1 ml-4 space-y-1 border-l border-gray-200 pl-3">
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
                      ? "bg-blue-50 font-bold text-blue-700"
                      : "font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900"
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

        <div className="border-t border-gray-200 p-4">
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

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 transform-gpu rounded-t-3xl border-t border-gray-200/80 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm md:hidden print:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-4 px-2">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                preload={false}
                aria-current={item.isActive ? "page" : undefined}
                onClick={() => triggerHaptic("light")}
                className={`group flex touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl py-1 text-[11px] select-none ${
                  item.isActive ? "text-primary font-bold" : "font-medium text-gray-500"
                }`}
                data-record="true"
              >
                <span
                  className={`spring-tab pointer-events-none flex h-7 w-12 items-center justify-center rounded-full group-active:scale-95 ${
                    item.isActive ? "text-primary -translate-y-0.5 scale-105 bg-blue-100/90 shadow-xs" : ""
                  }`}
                >
                  <Icon
                    className={`pointer-events-none h-5 w-5 ${item.isActive ? "stroke-[2.5]" : "stroke-2"}`}
                  />
                </span>
                <span className="pointer-events-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
