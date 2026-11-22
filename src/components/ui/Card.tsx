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
      className={`border-border bg-surface rounded-xl border shadow-sm ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
};
