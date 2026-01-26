// src/components/OfflineDetector.tsx
import { useEffect, useRef } from "react";
import { useToast } from "../hooks/useToast";
import { requestPersistentStorage, checkStoragePersistence } from "../utils/dataProtection";

/**
 * Component to detect online/offline transitions and show toast notifications
 * Also requests persistent storage to prevent data loss on Android
 * Must be rendered inside ToastProvider
 */
export const OfflineDetector = () => {
  const { showToast } = useToast();
  const previousOnlineState = useRef<boolean>(navigator.onLine);
  const hasCheckedStorage = useRef(false);

  // Check and request persistent storage on mount
  useEffect(() => {
    if (hasCheckedStorage.current) return;
    hasCheckedStorage.current = true;

    const checkStorage = async () => {
      const isPersisted = await checkStoragePersistence();
      
      if (!isPersisted) {
        // Request persistent storage
        const granted = await requestPersistentStorage();
        
        if (granted) {
          showToast("✓ Storage protected - your data won't be auto-deleted", "success");
        } else {
          // Only show this once, on first load
          showToast(
            "💾 Remember to backup your data regularly",
            "info"
          );
        }
      }
    };

    checkStorage();
  }, [showToast]);

  // Monitor online/offline transitions
  useEffect(() => {
    const handleOnline = () => {
      // Only show toast if we were previously offline
      if (!previousOnlineState.current) {
        showToast("🌐 Back online - all changes saved locally", "success");
      }
      previousOnlineState.current = true;
    };

    const handleOffline = () => {
      // Only show toast if we were previously online
      if (previousOnlineState.current) {
        showToast("📡 You're offline - app continues to work normally", "info");
      }
      previousOnlineState.current = false;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [showToast]);

  return null; // This component doesn't render anything
};
