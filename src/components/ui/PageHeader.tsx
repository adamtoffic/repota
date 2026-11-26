import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { RepotaLogo } from "./RepotaLogo";

interface PageHeaderProps {
  schoolName?: string;
  actions?: ReactNode;
  variant?: "solid" | "transparent";
  hideOnDesktop?: boolean;
  /** Pin header to the top viewport edge (`false` removes sticky hit-test bar during mobile gradebook entry). */
  sticky?: boolean;
}

/**
 * Reusable page header with Repota branding and school name
 * Used across Dashboard, Analytics, and other main pages
 */
export function PageHeader({
  schoolName,
  actions,
  hideOnDesktop = false,
  sticky = true,
}: PageHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const bgClass = "bg-[var(--surface-glass)] backdrop-blur-xl backdrop-saturate-[160%]";

  return (
    <header
      className={`border-border/80 ${sticky ? "sticky top-0 z-30" : "relative"} border-b shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)] ${bgClass} ${!actions || hideOnDesktop ? "md:hidden" : ""}`}
    >
      {/* Safe area spacer for notch/dynamic island */}
      <div className="safe-top" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between md:justify-end">
          {/* LEFT SIDE: Brand Identity (mobile only — desktop sidebar shows brand lockup) */}
          <div className="flex items-center gap-3 overflow-hidden md:hidden">
            {/* Repota Logo */}
            <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-sm">
              <RepotaLogo className="h-full w-full" />
            </div>

            {/* App Name + School Context */}
            <div className="min-w-0 flex-1">
              <span className="text-main block text-lg leading-none font-extrabold tracking-tight">
                REPOTA
              </span>
              <p className="text-muted truncate text-xs font-medium">
                {schoolName || "No School Selected"}
              </p>
            </div>
          </div>

          {/* RIGHT SIDE: Mobile Quick Theme Toggle + Actions */}
          <div className="flex items-center gap-2 pl-2">
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              data-record="true"
              className="border-border bg-subtle/80 text-secondary hover:bg-subtle hover:text-main inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text md:hidden"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            {actions}
          </div>
        </div>
      </div>
    </header>
  );
}
