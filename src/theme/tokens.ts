/**
 * Design Tokens - Single source of truth for all design values
 *
 * Usage:
 * - Import tokens instead of hardcoding values
 * - Ensures consistency across the app
 * - Easy to rebrand or theme
 *
 * @example
 * ```tsx
 * import { colors, spacing, radius } from '@/theme/tokens';
 *
 * <div style={{
 *   color: colors.primary.main,
 *   padding: spacing.md,
 *   borderRadius: radius.lg
 * }}>
 * ```
 */

/**
 * Color Palette
 * Based on current purple theme
 */
export const colors = {
  // Primary brand color (Purple)
  primary: {
    50: "#faf5ff",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7",
    600: "#9333ea", // Main brand color
    700: "#7e22ce",
    800: "#6b21a8",
    900: "#581c87",
    main: "#9333ea",
    light: "#a855f7",
    dark: "#7e22ce",
    contrast: "#ffffff",
  },

  // Semantic colors
  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    main: "#16a34a",
    light: "#22c55e",
    dark: "#15803d",
  },

  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    main: "#ea580c",
    light: "#f59e0b",
    dark: "#b45309",
  },

  error: {
    50: "#fef2f2",
    100: "#fee2e2",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    main: "#dc2626",
    light: "#ef4444",
    dark: "#b91c1c",
  },

  info: {
    50: "#eff6ff",
    100: "#dbeafe",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    main: "#2563eb",
    light: "#3b82f6",
    dark: "#1d4ed8",
  },

  // Neutral grays
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },

  // Special colors
  white: "#ffffff",
  black: "#000000",
  transparent: "transparent",
} as const;

/**
 * Spacing Scale (8px base)
 * Use for padding, margin, gaps
 */
export const spacing = {
  0: "0",
  0.5: "0.125rem", // 2px
  1: "0.25rem", // 4px
  1.5: "0.375rem", // 6px
  2: "0.5rem", // 8px
  2.5: "0.625rem", // 10px
  3: "0.75rem", // 12px
  3.5: "0.875rem", // 14px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  7: "1.75rem", // 28px
  8: "2rem", // 32px
  9: "2.25rem", // 36px
  10: "2.5rem", // 40px
  12: "3rem", // 48px
  14: "3.5rem", // 56px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px

  // Semantic names
  xs: "0.5rem", // 8px
  sm: "0.75rem", // 12px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  "2xl": "3rem", // 48px
  "3xl": "4rem", // 64px
} as const;

/**
 * Border Radius
 */
export const radius = {
  none: "0",
  sm: "0.25rem", // 4px
  DEFAULT: "0.375rem", // 6px
  md: "0.5rem", // 8px
  lg: "0.75rem", // 12px
  xl: "1rem", // 16px
  "2xl": "1.5rem", // 24px
  full: "9999px",
} as const;

/**
 * Typography
 */
export const fontSize = {
  xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
  sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
  base: ["1rem", { lineHeight: "1.5rem" }], // 16px
  lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
  xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
  "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
  "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
  "4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
} as const;

export const fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

/**
 * Shadows
 */
export const shadows = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  none: "none",
} as const;

/**
 * Transitions
 */
export const transitions = {
  fast: "100ms ease-in-out",
  base: "150ms ease-in-out",
  slow: "300ms ease-in-out",
} as const;

/**
 * Z-Index Scale
 */
export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  100: 100, // Modals
  auto: "auto",
} as const;

/**
 * Breakpoints (for reference)
 */
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;
