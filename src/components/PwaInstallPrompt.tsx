import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Detect if user is on iOS
const isIOS = () => {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

// Detect if user is on Safari
const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOSDevice] = useState(isIOS());

  // Check if app is already installed or dismissed recently
  const getInitialShowPrompt = () => {
    // Don't show if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return false;
    }

    // Don't show if dismissed recently (within 7 days)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return false;
      }
    }

    // For iOS, show prompt after a delay since beforeinstallprompt won't fire
    return false;
  };

  const [showPrompt, setShowPrompt] = useState(getInitialShowPrompt);

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Only show if not already installed and not recently dismissed
      if (!window.matchMedia("(display-mode: standalone)").matches) {
        const dismissed = localStorage.getItem("pwa-install-dismissed");
        if (!dismissed) {
          setShowPrompt(true);
        } else {
          const dismissedTime = parseInt(dismissed);
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          if (Date.now() - dismissedTime >= sevenDays) {
            setShowPrompt(true);
          }
        }
      }
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For iOS Safari, show install instructions after a delay
    // (beforeinstallprompt won't fire on iOS)
    if (isIOSDevice && isSafari()) {
      const timer = setTimeout(() => {
        if (!window.matchMedia("(display-mode: standalone)").matches) {
          const dismissed = localStorage.getItem("pwa-install-dismissed");
          if (!dismissed) {
            setShowPrompt(true);
          } else {
            const dismissedTime = parseInt(dismissed);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - dismissedTime >= sevenDays) {
              setShowPrompt(true);
            }
          }
        }
      }, 3000); // Show after 3 seconds

      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isIOSDevice]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store dismissal in localStorage to not show again for a while
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  if (!showPrompt) return null;

  // Different UI for iOS Safari (instructions instead of install button)
  if (isIOSDevice && isSafari()) {
    return (
      <div className="animate-in slide-in-from-bottom fixed right-4 bottom-4 left-4 z-50 duration-300 sm:left-auto sm:w-96">
        <div className="rounded-lg border border-blue-200 bg-white p-4 shadow-lg dark:border-blue-800 dark:bg-gray-900">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
              <Share className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">Install Repota</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                To install this app on your iPhone or iPad:
              </p>
              <ol className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="font-semibold">1.</span>
                  <span>
                    Tap the <Share className="mx-1 inline size-4" /> Share button below
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Scroll and tap "Add to Home Screen"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Tap "Add" to confirm</span>
                </li>
              </ol>
              <div className="mt-3">
                <button
                  onClick={handleDismiss}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Got it
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

  // Default UI for Chrome/Edge (with install button)
  return (
    <div className="animate-in slide-in-from-bottom fixed right-4 bottom-4 left-4 z-50 duration-300 sm:left-auto sm:w-96">
      <div className="rounded-lg border border-blue-200 bg-white p-4 shadow-lg dark:border-blue-800 dark:bg-gray-900">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Download className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">Install Repota</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Install this app on your device for quick access and offline use.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleInstall}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Not now
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
