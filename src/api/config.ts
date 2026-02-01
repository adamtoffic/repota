/**
 * API Configuration
 * Toggle between local-only mode and backend mode
 */

// Environment configuration
export const API_CONFIG = {
  // Set to 'local' for offline-first (current behavior)
  // Set to 'supabase' when ready to connect to Supabase
  MODE: (import.meta.env.VITE_API_MODE || "local") as "local" | "supabase",

  // Supabase configuration (when MODE is 'supabase')
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || "",

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
 * Check if app is in backend mode (Supabase)
 */
export const isBackendMode = () => API_CONFIG.MODE === "supabase";

/**
 * Check if Supabase is configured
 */
export const isSupabaseConfigured = () => {
  return !!(API_CONFIG.SUPABASE_URL && API_CONFIG.SUPABASE_ANON_KEY);
};

/**
 * Get full API endpoint URL (deprecated - kept for backward compatibility)
 * Use Supabase client instead
 */
export const getEndpoint = (_path: string) => {
  return null; // Not used with Supabase
};
