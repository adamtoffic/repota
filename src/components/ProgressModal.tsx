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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>

          <h3 className="mb-2 text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-muted mb-4 text-sm">{message}</p>

          {/* Progress Bar */}
          {displayProgress > 0 && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-gray-600">
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
