// src/components/analytics/InsightCard.tsx
import React from "react";
import type { LucideIcon } from "lucide-react";

interface InsightItem {
  name: string;
  value: string | number;
}

interface InsightCardProps {
  title: string;
  icon: LucideIcon;
  items: InsightItem[];
  variant: "success" | "warning" | "danger";
  emptyMessage?: string;
}

const variantStyles = {
  success: {
    border: "border-green-200 dark:border-emerald-800/70",
    bg: "bg-green-50/50 dark:bg-emerald-950/40",
    titleColor: "text-green-900 dark:text-emerald-200",
    itemColor: "text-green-800 dark:text-emerald-300",
    valueColor: "text-green-600 dark:text-emerald-400",
  },
  warning: {
    border: "border-amber-200 dark:border-amber-800/70",
    bg: "bg-amber-50/50 dark:bg-amber-950/40",
    titleColor: "text-amber-900 dark:text-amber-200",
    itemColor: "text-amber-800 dark:text-amber-300",
    valueColor: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    border: "border-red-200 dark:border-red-800/70",
    bg: "bg-red-50/50 dark:bg-red-950/40",
    titleColor: "text-red-900 dark:text-red-200",
    itemColor: "text-red-800 dark:text-red-300",
    valueColor: "text-red-600 dark:text-red-400",
  },
};

export const InsightCard: React.FC<InsightCardProps> = ({
  title,
  icon: Icon,
  items,
  variant,
  emptyMessage,
}) => {
  const styles = variantStyles[variant];

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-4 shadow-sm sm:p-6`}>
      <h4
        className={`mb-3 flex items-center gap-2 text-sm font-bold ${styles.titleColor}`}
        data-record="true"
      >
        <Icon className="h-4 w-4" />
        {title}
      </h4>
      <div className="space-y-2">
        {items.length > 0
          ? items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className={`font-medium ${styles.itemColor}`}>{item.name}</span>
                <span className={`font-bold ${styles.valueColor}`}>{item.value}</span>
              </div>
            ))
          : emptyMessage && (
              <p className={`text-xs ${styles.itemColor}`} data-record="true">
                {emptyMessage}
              </p>
            )}
      </div>
    </div>
  );
};
