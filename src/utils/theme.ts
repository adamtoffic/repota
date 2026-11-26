export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

/**
 * Device-local theme key in `localStorage`. Kept separate from `SchoolSettings`, IndexedDB
 * stores, and `.repota` backups so device appearance never leaks across backups or teachers.
 */
export const THEME_STORAGE_KEY = "repota_theme";

/** Window event emitted after `saveThemePreference` updates `localStorage` and DOM theme state. */
export const THEME_CHANGE_EVENT = "repota:theme-change";

export const LIGHT_THEME_COLOR = "#FFFFFF";
export const DARK_THEME_COLOR = "#0B101B";

export interface ChartThemeColors {
  grid: string;
  axis: string;
  label: string;
  cursor: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

const LIGHT_CHART_COLORS: ChartThemeColors = {
  grid: "#e6e4de",
  axis: "#525866",
  label: "#374151",
  cursor: "rgba(30, 58, 138, 0.06)",
  tooltipBg: "#ffffff",
  tooltipBorder: "#e6e4de",
  tooltipText: "#14181f",
};

const DARK_CHART_COLORS: ChartThemeColors = {
  grid: "#222e44",
  axis: "#93a3bd",
  label: "#e2e8f0",
  cursor: "rgba(122, 167, 255, 0.10)",
  tooltipBg: "#121927",
  tooltipBorder: "#324360",
  tooltipText: "#f1f5f9",
};

const DARK_TO_LIGHT_SVG_COLOR: Record<string, string> = {
  "#222e44": "#e5e7eb",
  "#93a3bd": "#6b7280",
  "#20293a": "#e5e7eb",
  "#8b98b0": "#6b7280",
  "#334155": "#e5e7eb",
  "#94a3b8": "#6b7280",
  "#e2e8f0": "#374151",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function readStoredThemePreference(): ThemePreference {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    return "system";
  }
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme = getSystemTheme(),
): ResolvedTheme {
  return preference === "system" ? systemTheme : preference;
}

export function applyThemeToDocument(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark = resolved === "dark";
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = resolved;
  root.dataset.theme = resolved;

  const nextThemeColor = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta && meta.getAttribute("content") !== nextThemeColor) {
    meta.setAttribute("content", nextThemeColor);
    // Re-insert the same meta node so iOS Safari / WebKit fires themeColorChanged()
    // and repaints the Dynamic Island / top safe area immediately on live theme toggles.
    const parent = meta.parentNode;
    if (parent) {
      const nextSibling = meta.nextSibling;
      parent.removeChild(meta);
      parent.insertBefore(meta, nextSibling);
    }
  }
}

export function saveThemePreference(preference: ThemePreference): ResolvedTheme {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage access errors (private mode / quota)
  }
  const resolved = resolveTheme(preference);
  applyThemeToDocument(resolved);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, {
        detail: { preference, resolved },
      }),
    );
  }
  return resolved;
}

export function getChartThemeColors(resolved: ResolvedTheme): ChartThemeColors {
  return resolved === "dark" ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;
}

/**
 * Rewrite concrete dark-mode chart strokes and fills to light-paper ink on cloned SVG trees.
 * `html2canvas-pro` and `exportChartAsPNG` serialize `<svg>` nodes via `XMLSerializer` onto a
 * `#ffffff` canvas, so CSS variables and dark slate hex attributes must become dark-on-white.
 */
export function normalizeChartSvgForLightExport(root: ParentNode): void {
  const svgs: SVGElement[] = [];
  if (typeof SVGElement !== "undefined" && root instanceof SVGElement) {
    svgs.push(root);
  } else if ("querySelectorAll" in root) {
    root.querySelectorAll("svg").forEach((svg) => svgs.push(svg));
  }

  for (const svg of svgs) {
    const nodes: Element[] = [svg, ...Array.from(svg.querySelectorAll("*"))];
    for (const el of nodes) {
      for (const attr of ["stroke", "fill"] as const) {
        const val = el.getAttribute(attr);
        if (val) {
          const replacement = DARK_TO_LIGHT_SVG_COLOR[val.trim().toLowerCase()];
          if (replacement) {
            el.setAttribute(attr, replacement);
          }
        }
      }
      if ("style" in el) {
        const styledEl = el as SVGElement | HTMLElement;
        const inlineStroke = styledEl.style.stroke?.trim().toLowerCase();
        if (inlineStroke && DARK_TO_LIGHT_SVG_COLOR[inlineStroke]) {
          styledEl.style.stroke = DARK_TO_LIGHT_SVG_COLOR[inlineStroke];
        }
        const inlineFill = styledEl.style.fill?.trim().toLowerCase();
        if (inlineFill && DARK_TO_LIGHT_SVG_COLOR[inlineFill]) {
          styledEl.style.fill = DARK_TO_LIGHT_SVG_COLOR[inlineFill];
        }
      }
    }
  }
}
