import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext } from "./ThemeContextDefinition";
import {
  applyThemeToDocument,
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
 * Synchronizes device-local theme preference (`"system" | "light" | "dark"`) with
 * `document.documentElement` (`.dark`, `color-scheme`) and `meta[name="theme-color"]`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() => readStoredThemePreference());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  const resolvedTheme = resolveTheme(preference, systemTheme);

  useLayoutEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const mql =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const handleSystemChange = () => {
      setSystemTheme(getSystemTheme());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === THEME_STORAGE_KEY) {
        setPreference(readStoredThemePreference());
      }
    };

    const handleThemeEvent = () => {
      setPreference(readStoredThemePreference());
      setSystemTheme(getSystemTheme());
    };

    if (mql) {
      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", handleSystemChange);
      } else if (typeof mql.addListener === "function") {
        mql.addListener(handleSystemChange);
      }
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeEvent);

    return () => {
      if (mql) {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", handleSystemChange);
        } else if (typeof mql.removeListener === "function") {
          mql.removeListener(handleSystemChange);
        }
      }
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeEvent);
    };
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setPreference(next);
    saveThemePreference(next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setTheme }),
    [preference, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
