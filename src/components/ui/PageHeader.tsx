import type { ReactNode } from "react";
import { RepotaLogo } from "./RepotaLogo";

interface PageHeaderProps {
  schoolName?: string;
  actions?: ReactNode;
  variant?: "solid" | "transparent";
  hideOnDesktop?: boolean;
}

/**
 * Reusable page header with Repota branding and school name
 * Used across Dashboard, Analytics, and other main pages
 */
export function PageHeader({
  schoolName,
  actions,
  variant = "solid",
  hideOnDesktop = false,
}: PageHeaderProps) {
  const bgClass = variant === "transparent" ? "bg-surface/95 backdrop-blur-sm" : "bg-surface";
  const safeAreaBg = variant === "transparent" ? "bg-surface/95" : "bg-surface";

  return (
    <nav
      className={`border-border sticky top-0 z-30 border-b shadow-sm ${bgClass} ${!actions || hideOnDesktop ? "md:hidden" : ""}`}
    >
      {/* Safe area spacer for notch/dynamic island */}
      <div className={`safe-top ${safeAreaBg}`} />
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
              <h1 className="text-main text-lg leading-none font-black tracking-tight">REPOTA</h1>
              <p className="text-muted truncate text-xs font-medium">
                {schoolName || "No School Selected"}
              </p>
            </div>
          </div>

          {/* RIGHT SIDE: Actions */}
          {actions && <div className="flex items-center gap-2 pl-2">{actions}</div>}
        </div>
      </div>
    </nav>
  );
}
