// src/components/analytics/StatCard.tsx
import React from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  color?: "blue" | "green" | "amber" | "red" | "purple";
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  color = "blue",
}) => {
  const colorClasses = {
    blue: "bg-blue-50/50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    green: "bg-green-50/50 text-green-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    amber: "bg-amber-50/50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    red: "bg-red-50/50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    purple: "bg-purple-50/50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
  };

  return (
    <div className="border-border bg-surface rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-muted text-xs font-bold tracking-wide uppercase sm:text-sm"
            data-record="true"
          >
            {title}
          </p>
          <p className="text-main mt-2 text-2xl font-black tabular-nums sm:text-3xl">{value}</p>
          {subtitle && <p className="text-muted mt-1 text-xs">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-xs font-bold tabular-nums ${
                  trend.isPositive
                    ? "text-green-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted text-xs" data-record="true">
                vs last term
              </span>
            </div>
          )}
        </div>
        <div className={`shrink-0 rounded-lg p-2.5 sm:p-3 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </div>
  );
};
