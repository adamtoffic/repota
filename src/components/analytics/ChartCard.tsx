// src/components/analytics/ChartCard.tsx
import React from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "../ui/Card";

interface ChartCardProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, icon: Icon, children, className }) => {
  return (
    <Card className={className}>
      <h3 className="text-main mb-4 flex items-center gap-2 text-base font-bold sm:text-lg">
        <Icon className="h-5 w-5" />
        {title}
      </h3>
      {children}
    </Card>
  );
};
