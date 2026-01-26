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

  // Update time ago every 10 seconds
  useEffect(() => {
    if (!lastSaved) return;

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
  }, [lastSaved]);

  // Don't show anything if never saved and not currently saving
  if (!isSaving && !lastSaved && !error) return null;

  return (
    <div className="animate-fade-in fixed bottom-6 left-6 z-30">
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium shadow-lg ${
          error
            ? "border border-red-200 bg-red-50 text-red-700"
            : !isOnline
              ? "border border-orange-200 bg-orange-50 text-orange-700"
              : isSaving
                ? "border border-blue-200 bg-blue-50 text-blue-700"
                : "border border-green-200 bg-green-50 text-green-700"
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
              ? "Offline - changes will sync"
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
