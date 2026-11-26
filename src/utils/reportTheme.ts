import type { PrintMode, SchoolSettings } from "../types";

export interface SchoolColorPreset {
  id: string;
  name: string;
  primary: string;
  accent: string;
}

export const SCHOOL_COLOR_PRESETS: SchoolColorPreset[] = [
  { id: "royal-navy", name: "Royal Navy", primary: "#1e3a8a", accent: "#d97706" },
  { id: "oxford-indigo", name: "Oxford Indigo", primary: "#312e81", accent: "#b45309" },
  { id: "forest-emerald", name: "Forest Emerald", primary: "#047857", accent: "#d97706" },
  { id: "cathedral-pine", name: "Cathedral Pine", primary: "#064e3b", accent: "#b45309" },
  { id: "deep-teal", name: "Deep Teal", primary: "#0f766e", accent: "#0284c7" },
  { id: "burgundy-maroon", name: "Royal Burgundy", primary: "#881337", accent: "#d97706" },
  { id: "imperial-purple", name: "Imperial Purple", primary: "#5b21b6", accent: "#d97706" },
  { id: "heritage-gold", name: "Cocoa & Gold", primary: "#78350f", accent: "#1e3a8a" },
  { id: "crimson-red", name: "Crimson Crest", primary: "#991b1b", accent: "#1e293b" },
  { id: "slate-charcoal", name: "Ink-Saver Slate", primary: "#1e293b", accent: "#475569" },
];

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string | undefined): value is string {
  return typeof value === "string" && HEX_COLOR_RE.test(value.trim());
}

export function normalizeHexColor(value: string | undefined, fallback: string): string {
  if (!isValidHexColor(value)) return fallback.toLowerCase();
  return value.trim().toLowerCase();
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function toHex([r, g, b]: [number, number, number]): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Blends `hex` toward `targetHex` by `ratio` (0 = full `hex`, 1 = full `targetHex`).
 * Returns solid hex so `html2canvas-pro` and browsers print crisply without alpha surprises.
 */
export function mixHex(hex: string, targetHex: string, ratio: number): string {
  const [r1, g1, b1] = parseHexRgb(normalizeHexColor(hex, "#1e3a8a"));
  const [r2, g2, b2] = parseHexRgb(normalizeHexColor(targetHex, "#ffffff"));
  const t = Math.max(0, Math.min(1, ratio));
  return toHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
}

/**
 * Returns WCAG-accessible text color ("#ffffff" or "#0f172a") for a given background hex.
 */
export function getContrastTextColor(bgHex: string): "#ffffff" | "#0f172a" {
  const [r, g, b] = parseHexRgb(normalizeHexColor(bgHex, "#1e3a8a"));
  const toLinear = (c: number) => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.36 ? "#0f172a" : "#ffffff";
}

export interface ReportPalette {
  isBW: boolean;
  isCustomActive: boolean;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryMedium: string;
  primaryBorder: string;
  onPrimary: "#ffffff" | "#0f172a";
  accent: string;
  onAccent: "#ffffff" | "#0f172a";
  zebraBg: string;
  /** Ink-aware surface fill for wide header banners (light tint in B&W, primary in color). */
  bannerBg: string;
  /** Readable foreground ink paired with {@link bannerBg}. */
  bannerText: "#ffffff" | "#0f172a" | "#000000";
  /** Ink-aware surface fill for KPI/position/aggregate highlight boxes and compact badges. */
  highlightBg: string;
  /** Readable foreground ink paired with {@link highlightBg}. */
  highlightText: "#ffffff" | "#0f172a" | "#000000";
  /** Ink-aware surface fill for table column headers. */
  tableHeaderBg: string;
  /** Readable foreground ink paired with {@link tableHeaderBg}. */
  tableHeaderText: "#ffffff" | "#0f172a" | "#000000";
  /** Foreground fill for mastery/progress bars (high-contrast grayscale in B&W). */
  barFill: string;
}

export function getReportPalette({
  settings,
  printMode,
  defaultPrimary,
  defaultAccent = "#d97706",
}: {
  settings: Pick<SchoolSettings, "useCustomTemplateColor" | "primaryColor" | "accentColor">;
  printMode?: PrintMode;
  defaultPrimary: string;
  defaultAccent?: string;
}): ReportPalette {
  const isBW = printMode === "bw";
  if (isBW) {
    return {
      isBW: true,
      isCustomActive: false,
      primary: "#000000",
      primaryDark: "#000000",
      primarySoft: "#f3f4f6",
      primaryMedium: "#e5e7eb",
      primaryBorder: "#000000",
      onPrimary: "#ffffff",
      accent: "#111827",
      onAccent: "#ffffff",
      zebraBg: "#f9fafb",
      bannerBg: "#f3f4f6",
      bannerText: "#000000",
      highlightBg: "#111827",
      highlightText: "#ffffff",
      tableHeaderBg: "#e5e7eb",
      tableHeaderText: "#000000",
      barFill: "#111827",
    };
  }

  const isCustomActive = Boolean(settings.useCustomTemplateColor && isValidHexColor(settings.primaryColor));
  const primary = isCustomActive
    ? normalizeHexColor(settings.primaryColor, defaultPrimary)
    : normalizeHexColor(defaultPrimary, "#1e3a8a");
  const accent = isCustomActive && isValidHexColor(settings.accentColor)
    ? normalizeHexColor(settings.accentColor, defaultAccent)
    : normalizeHexColor(defaultAccent, "#d97706");
  const onPrimary = getContrastTextColor(primary);

  return {
    isBW: false,
    isCustomActive,
    primary,
    primaryDark: mixHex(primary, "#000000", 0.28),
    primarySoft: mixHex(primary, "#ffffff", 0.93),
    primaryMedium: mixHex(primary, "#ffffff", 0.82),
    primaryBorder: mixHex(primary, "#000000", 0.15),
    onPrimary,
    accent,
    onAccent: getContrastTextColor(accent),
    zebraBg: mixHex(primary, "#ffffff", 0.95),
    bannerBg: primary,
    bannerText: onPrimary,
    highlightBg: primary,
    highlightText: onPrimary,
    tableHeaderBg: primary,
    tableHeaderText: onPrimary,
    barFill: primary,
  };
}
