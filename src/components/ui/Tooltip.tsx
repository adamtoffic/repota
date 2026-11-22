// src/components/ui/Tooltip.tsx
import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";

interface Props {
  content: string;
  children?: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  showIcon?: boolean;
}

export function Tooltip({ content, children, position = "top", showIcon = true }: Props) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-slate-900 dark:border-t-slate-100",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-slate-900 dark:border-b-slate-100",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-900 dark:border-l-slate-100",
    right:
      "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-900 dark:border-r-slate-100",
  };

  return (
    <div className="relative inline-flex items-center">
      <span
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-flex cursor-help items-center"
        tabIndex={0}
        role="tooltip"
        aria-label={content}
      >
        {children || (showIcon && <Info className="text-muted hover:text-main h-4 w-4" />)}
      </span>

      {isVisible && (
        <div
          className={`animate-fade-in pointer-events-none absolute z-50 whitespace-nowrap ${positionClasses[position]}`}
        >
          <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900">
            {content}
            <div className={`absolute h-0 w-0 border-4 ${arrowClasses[position]}`} />
          </div>
        </div>
      )}
    </div>
  );
}
