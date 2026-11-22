// src/components/ui/Card.tsx
import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-6",
  lg: "p-5 sm:p-7",
};

export const Card: React.FC<CardProps> = ({ children, className = "", padding = "md" }) => {
  return (
    <div
      className={`border-border bg-surface rounded-xl border shadow-sm dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
};
