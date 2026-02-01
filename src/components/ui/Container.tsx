/**
 * Container Component
 * Provides consistent page width and padding
 */

import { type ReactNode } from "react";

export interface ContainerProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: boolean;
  className?: string;
  as?: "div" | "main" | "section" | "article";
}

const maxWidthStyles = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[1400px]",
  "2xl": "max-w-[1536px]",
  full: "max-w-full",
} as const;

export function Container({
  children,
  maxWidth = "lg",
  padding = true,
  className = "",
  as: Component = "div",
}: ContainerProps) {
  return (
    <Component
      className={`mx-auto w-full ${maxWidthStyles[maxWidth]} ${padding ? "px-4 sm:px-6 lg:px-8" : ""} ${className}`}
    >
      {children}
    </Component>
  );
}
