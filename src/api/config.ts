/**
 * API Configuration
 * Toggle between local-only mode and backend mode
 */

// Environment configuration
export const API_CONFIG = {
  // Set to 'local' for offline-first (current behavior)
  // Set to 'backend' when ready to connect to server
  MODE: (import.meta.env.VITE_API_MODE || "local") as "local" | "backend",

  // Backend URL (when MODE is 'backend')
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",

  // Request timeout (ms)
  TIMEOUT: 10000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

/**
 * Check if app is in local-only mode
 */
export const isLocalMode = () => API_CONFIG.MODE === "local";

/**
 * Check if app is in backend mode
 */
export const isBackendMode = () => API_CONFIG.MODE === "backend";

/**
 * Get full API endpoint URL
 */
export const getEndpoint = (path: string) => {
  if (isLocalMode()) {
    return null; // No network calls in local mode
  }
  return `${API_CONFIG.BASE_URL}${path}`;
};
