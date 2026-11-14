export const CHUNK_RELOAD_KEY = "repota_chunk_reload";

/**
 * Attaches a window-level listener for Vite dynamic import preload failures (vite:preloadError).
 * Reloads the window at most once per session to fetch freshly deployed hashed chunks.
 *
 * If sessionStorage is blocked or throws, reloading is suppressed to avoid infinite loops.
 */
export function setupVitePreloadErrorHandler(): () => void {
  const handler = () => {
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
