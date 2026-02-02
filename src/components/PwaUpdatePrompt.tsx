import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered: " + r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (offlineReady) {
      console.log("App ready to work offline");
    }
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [offlineReady, needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="animate-in slide-in-from-bottom fixed right-4 bottom-4 left-4 z-50 duration-300 sm:left-auto sm:w-96">
      <div className="rounded-lg border border-green-200 bg-white p-4 shadow-lg dark:border-green-800 dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <RefreshCw className="size-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">Update Available</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              A new version of Repota is available. Update now to get the latest features and
              improvements.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleUpdate}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
              >
                Update Now
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
