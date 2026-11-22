// src/components/ui/Skeleton.tsx

interface Props {
  className?: string;
  variant?: "text" | "circle" | "rectangular";
  animation?: "pulse" | "wave" | "none";
}

export function Skeleton({ className = "", variant = "rectangular", animation = "pulse" }: Props) {
  const baseClasses = "bg-gray-200 dark:bg-subtle";

  const variantClasses = {
    text: "h-4 rounded",
    circle: "rounded-full",
    rectangular: "rounded-lg",
  };

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-subtle dark:via-elevated dark:to-subtle bg-[length:200%_100%]",
    none: "",
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      aria-hidden="true"
    />
  );
}

// Skeleton components for common patterns
export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant="text" className={i === lines - 1 ? "w-4/5" : "w-full"} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`border-border bg-surface rounded-lg border p-6 ${className}`}>
      <Skeleton variant="rectangular" className="mb-4 h-6 w-1/3" />
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead className="bg-subtle">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton variant="text" className="h-3" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border-subtle divide-y">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-4">
                  <Skeleton variant="text" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
