import { Loader2 } from "lucide-react";

interface ProgressModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  progress?: number; // 0-100 percentage
  total?: number;
  current?: number;
}

export function ProgressModal({
  isOpen,
  title,
  message,
  progress,
  total,
  current,
}: ProgressModalProps) {
  if (!isOpen) return null;

  const displayProgress = progress ?? (total && current ? Math.round((current / total) * 100) : 0);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-title"
      aria-describedby="progress-message"
    >
      <div className="bg-surface border-border w-full max-w-md rounded-xl border p-6 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/60">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>

          <h3 id="progress-title" className="text-main mb-2 text-lg font-bold">
            {title}
          </h3>
          <p id="progress-message" className="text-muted mb-4 text-sm">
            {message}
          </p>

          {/* Progress Bar */}
          {displayProgress > 0 && (
            <div className="space-y-2">
              <div className="bg-subtle h-2 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>

              <div className="text-secondary flex items-center justify-between text-xs font-bold">
                {total && current !== undefined ? (
                  <>
                    <span>
                      {current} of {total}
                    </span>
                    <span>{displayProgress}%</span>
                  </>
                ) : (
                  <span className="w-full text-center">{displayProgress}%</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
