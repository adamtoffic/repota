import { lazy, type ComponentType } from "react";
import { CHUNK_RELOAD_KEY, hasUnsavedChanges, isChunkLoadError } from "./preloadErrorHandler";

/**
 * Wraps `React.lazy` with one-shot stale-chunk reload recovery.
 * Avoids reloading when unsaved changes exist or when sessionStorage is blocked.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const module = await factory();
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      } catch {
        // ignore storage access errors
      }
      return module;
    } catch (error) {
      const isChunk = isChunkLoadError(error);
      if (isChunk) {
        if (hasUnsavedChanges()) {
          throw error;
        }

        let canReload = false;
        try {
          const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "true";
          if (!alreadyReloaded) {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, "true");
            canReload = true;
          }
        } catch {
          // If sessionStorage throws or is blocked, do not reload to prevent infinite loops
          canReload = false;
        }

        if (canReload) {
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }

      throw error;
    }
  });
}
