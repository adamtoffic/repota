import { useCallback, useContext, useEffect, useState } from "react";
import { ThemeContext, type ThemeContextValue } from "../context/ThemeContextDefinition";
import {
  getSystemTheme,
  readStoredThemePreference,
  resolveTheme,
  saveThemePreference,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "../utils/theme";

/**
 * Returns the active theme state and setter. Falls back to `localStorage` + `matchMedia` when
 * called outside `ThemeProvider` (for example in isolated component or route tests).
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  const [fallbackPreference, setFallbackPreference] = useState<ThemePreference>(() =>
    readStoredThemePreference(),
  );
  const [fallbackSystemTheme, setFallbackSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme(),
  );

  useEffect(() => {
    if (context) return;

    const mql =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const syncFromSystem = () => {
      setFallbackSystemTheme(getSystemTheme());
    };

    const syncFromExternal = () => {
      setFallbackPreference(readStoredThemePreference());
      setFallbackSystemTheme(getSystemTheme());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        syncFromExternal();
      }
    };

    if (mql) {
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", syncFromSystem);
      } else if (typeof mql.addListener === "function") {
        mql.addListener(syncFromSystem);
      }
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener(THEME_CHANGE_EVENT, syncFromExternal);

    return () => {
      if (mql) {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", syncFromSystem);
        } else if (typeof mql.removeListener === "function") {
          mql.removeListener(syncFromSystem);
        }
      }
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, syncFromExternal);
    };
  }, [context]);

  const setFallbackTheme = useCallback((next: ThemePreference) => {
    setFallbackPreference(next);
    saveThemePreference(next);
  }, []);

  if (context) {
    return context;
  }

  return {
    preference: fallbackPreference,
    resolvedTheme: resolveTheme(fallbackPreference, fallbackSystemTheme),
    setTheme: setFallbackTheme,
  };
}
