import type { ReactNode } from "react";

interface PageHeaderProps {
  schoolName?: string;
  actions?: ReactNode;
  variant?: "solid" | "transparent";
}

/**
 * Reusable page header with Repota branding and school name
 * Used across Dashboard, Analytics, and other main pages
 */
export function PageHeader({ schoolName, actions, variant = "solid" }: PageHeaderProps) {
  const bgClass = variant === "transparent" ? "bg-white/95 backdrop-blur-sm" : "bg-white";
  const safeAreaBg = variant === "transparent" ? "bg-white/95" : "bg-white";

  return (
    <nav className={`sticky top-0 z-30 border-b border-gray-200 shadow-sm ${bgClass}`}>
      {/* Safe area spacer for notch/dynamic island */}
      <div className={`safe-top ${safeAreaBg}`} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* LEFT SIDE: Brand Identity */}
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Repota Logo */}
            <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm">
              <img src="/logo.svg" alt="Repota" className="h-full w-full p-1" />
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
