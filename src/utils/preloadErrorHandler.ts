export const CHUNK_RELOAD_KEY = "repota_chunk_reload";

let hasUnsavedChangesFlag = false;
const unsavedSources = new Set<string>();

export function setUnsavedChanges(sourceOrPending: string | boolean, pending?: boolean): void {
  if (typeof sourceOrPending === "boolean") {
    hasUnsavedChangesFlag = sourceOrPending;
    if (!sourceOrPending) {
      unsavedSources.clear();
    }
    return;
  }
  if (pending) {
    unsavedSources.add(sourceOrPending);
  } else {
    unsavedSources.delete(sourceOrPending);
  }
}

export function hasUnsavedChanges(): boolean {
  return hasUnsavedChangesFlag || unsavedSources.size > 0;
}

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  return (
    name === "ChunkLoadError" ||
    /chunkloaderror/i.test(name) ||
    /failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /importing a module script failed/i.test(msg) ||
    /unable to preload css/i.test(msg) ||
    /javascript mime type/i.test(msg) ||
    /mime type/i.test(msg) ||
    /loading (chunk|css chunk)/i.test(msg)
  );
}

/**
 * Attaches a window-level listener for Vite dynamic import preload failures (vite:preloadError).
 * Reloads the window at most once per session to fetch freshly deployed hashed chunks.
 *
 * If event.payload/detail is present and does not match a chunk/MIME/CSS load error,
 * the reload is skipped so application runtime errors propagate to route error boundaries.
 * If unsaved student or settings changes are present, reloading is suppressed to prevent data loss.
 * If sessionStorage is blocked or throws, reloading is suppressed to avoid infinite loops.
 */
export function setupVitePreloadErrorHandler(): () => void {
  const handler = (event: Event) => {
    const customEvent = event as { payload?: unknown };
    const error = customEvent.payload;
    if (error && !isChunkLoadError(error)) {
      return;
    }

    if (hasUnsavedChanges()) {
      return;
    }

    try {
      const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "true";
      if (!alreadyReloaded) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, "true");
        window.location.reload();
      }
    } catch {
      // If sessionStorage throws or is blocked, do not reload to prevent infinite loops
    }
  };
  window.addEventListener("vite:preloadError", handler);
  return () => window.removeEventListener("vite:preloadError", handler);
}
