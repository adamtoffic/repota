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
    blue: "bg-blue-50/50 text-blue-600",
    green: "bg-green-50/50 text-green-600",
    amber: "bg-amber-50/50 text-amber-600",
    red: "bg-red-50/50 text-red-600",
    purple: "bg-purple-50/50 text-purple-600",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted text-xs font-bold tracking-wide uppercase sm:text-sm">{title}</p>
          <p className="text-main mt-2 text-2xl font-black sm:text-3xl">{value}</p>
          {subtitle && <p className="text-muted mt-1 text-xs">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-xs font-bold ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted text-xs">vs last term</span>
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
