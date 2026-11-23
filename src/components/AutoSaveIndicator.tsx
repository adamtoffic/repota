import { useEffect, useState } from "react";
import { Check, Loader2, Wifi, WifiOff } from "lucide-react";

interface Props {
  isSaving: boolean;
  lastSaved?: Date;
  error?: string;
}

export function AutoSaveIndicator({ isSaving, lastSaved, error }: Props) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [timeAgo, setTimeAgo] = useState("");
  const [dismissedSavedTime, setDismissedSavedTime] = useState<number | null>(() =>
    lastSaved && Date.now() - lastSaved.getTime() >= 3500 ? lastSaved.getTime() : null,
  );

  const isSavedRecentlyVisible =
    Boolean(lastSaved) && dismissedSavedTime !== lastSaved?.getTime();
  const isVisible = isSaving || Boolean(error) || !isOnline || isSavedRecentlyVisible;

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update time ago every 10 seconds only while visible
  useEffect(() => {
    if (!lastSaved || !isVisible) return;

    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);

      if (seconds < 10) {
        setTimeAgo("just now");
      } else if (seconds < 60) {
        setTimeAgo(`${seconds}s ago`);
      } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        setTimeAgo(`${mins}m ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeAgo(`${hours}h ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, [lastSaved, isVisible]);

  // Auto-hide transient "Saved" pill after 3.5s while keeping errors/offline/saving visible
  useEffect(() => {
    if (!lastSaved) return;
    const savedTimestamp = lastSaved.getTime();
    const elapsed = Date.now() - savedTimestamp;
    const remaining = Math.max(0, 3500 - elapsed);
    const hideTimer = setTimeout(() => {
      setDismissedSavedTime(savedTimestamp);
    }, remaining);
    return () => clearTimeout(hideTimer);
  }, [lastSaved]);

  if (!isVisible) return null;

  return (
    <div className="animate-fade-in bottom-safe-nav pointer-events-none fixed left-4 z-30 md:left-72 print:hidden">
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium shadow-lg ${
          error
            ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800/70 dark:bg-red-950/90 dark:text-red-300"
            : !isOnline
              ? "border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/70 dark:bg-orange-950/90 dark:text-orange-300"
              : isSaving
                ? "border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/90 dark:text-blue-300"
                : "border border-green-200 bg-green-50 text-green-700 dark:border-emerald-800/70 dark:bg-emerald-950/90 dark:text-emerald-300"
        }`}
      >
        {/* Icon */}
        {error ? (
          <WifiOff className="h-4 w-4" />
        ) : !isOnline ? (
          <WifiOff className="h-4 w-4" />
        ) : isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}

        {/* Text */}
        <span>
          {error
            ? "Save failed"
            : !isOnline
              ? "Offline · Saved locally"
              : isSaving
                ? "Saving..."
                : lastSaved
                  ? `Saved ${timeAgo}`
                  : "All changes saved"}
        </span>

        {/* Online/Offline indicator */}
        {isOnline && !error && <Wifi className="h-3 w-3 opacity-50" />}
      </div>
    </div>
  );
}
