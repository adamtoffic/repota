# Branch 4 Report: Light & Dark Theme Polish (`fix/theme-polish-parity`)

Merged Branch 3 (`fix/responsive-ux-bugs`) into `feat/navigation-shell` (`--no-ff`) and branched `fix/theme-polish-parity`.

## What Changed

1. **Unified Glass, Elevation, & Scrollbar Tokens (`src/index.css`)**
   - Added `--surface-glass`, `--surface-dock`, `--shadow-card`, and `--shadow-elevated` CSS custom properties across `:root` and `:root.dark`.
   - Added light-mode scrollbar color token (`scrollbar-color: #cbd5e1 #f1f5f9`) inside `@layer base` to match dark mode.
   - Kept `.report-page`, `[data-paper-surface="true"]`, `@media print`, `LIGHT_THEME_COLOR` (`#FFFFFF`), and `DARK_THEME_COLOR` (`#090C12`) untouched.

2. **Theme-Aware Light & Dark Auth Backdrops (`src/components/LockScreen.tsx`, `src/components/PinSetup.tsx`)**
   - Replaced hardcoded `bg-[#0F1D3A]` and inline navy gradient styles on `LockScreen` and all 6 steps of `PinSetup` with responsive theme gradients (`from-slate-100 via-blue-50 to-indigo-100` in light mode, `dark:from-[#0B152B] dark:via-[#0F1D3A] dark:to-[#162647]` in dark mode) and crisp light/dark card borders, rings, and elevation shadows.

3. **Asset-Aware `ImageUploader` Backing & Chart Contrast (`PieChart`, `RadarChart`, `ComposedChart`)**
   - `src/components/ImageUploader.tsx`: keeps `data-paper-surface="true"` + light `bg-white dark:bg-slate-100` backing for signatures, crests, and logos so dark ink stays legible in dark mode, uses dark-friendly `bg-subtle dark:bg-elevated` backing for `Student Photo` uploads, and enlarges tip/remove-button sizing (`text-xs`, `px-2.5 py-1.5`).
   - `src/components/charts/PieChart.tsx`: renders outer SVG percentage `<text>` labels using `chartColors.label` (`#374151` light / `#e2e8f0` dark, preserved by `normalizeChartSvgForLightExport`) and replaces default tooltip styling with `PieChartTooltip` using `bg-elevated` and theme-contrast text + colored swatch dots.
   - `src/components/charts/RadarChart.tsx` & `src/components/charts/ComposedChart.tsx`: updated tooltip value styling to use `text-primary-text`/`text-main` paired with swatch dots.

4. **Mobile Quick Theme Toggle & Glass Chrome (`src/components/ui/PageHeader.tsx`, `src/components/navigation/AppShell.tsx`)**
   - Added a compact mobile-only quick theme toggle (`md:hidden`, `h-10 w-10`, `data-record="true"`) in `PageHeader` alongside existing actions, and unified both `PageHeader` and `AppShell`'s `MobileBottomNav` onto `--surface-glass` / `--surface-dock`.

5. **Tests (`src/test/ThemeAndDarkMode.test.tsx`)**
   - Added 4 tests verifying the `PageHeader` mobile theme toggle + `data-record` attribute, `LockScreen`/`PinSetup` theme-aware backdrop classes, `ImageUploader` paper vs photo backing, and `PieChart` SVG label colors in dark vs light mode + `PieChartTooltip` contrast.

## Why

To bring light and dark mode to full visual and contrast parity across auth screens, asset upload previews, Recharts tooltips/SVG labels, scrollbars, and translucent chrome, and give mobile users one-tap theme switching without opening Settings.

## What Was Verified

All checks passed after the final edit:

- `npm run lint` (`eslint .`): passed (exit code `0`)
- `npx tsc -b`: passed (exit code `0`)
- `npx vitest run --maxWorkers=2`: passed — **`58` test files passed (`58`), `536` tests passed (`536`)**

## What Could NOT Be Verified

- Manual visual review across physical iOS/Android screens and desktop OS light/dark transitions.
- Real-browser PostHog session replay recording with `data-record="true"` on the mobile header theme toggle.

## Summary for reviewer

- **Branch 4 (`fix/theme-polish-parity`)** builds on merged Branch 3 and completes the light/dark theme parity and polish pass while preserving `.report-page` white-paper isolation and existing storage/theme-color invariants.
- Unified glass/elevation/scrollbar tokens in [index.css](file:///c:/Users/Flash/Documents/Projects/repota/src/index.css) and wired `--surface-glass` / `--surface-dock` into [PageHeader.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ui/PageHeader.tsx) and [AppShell.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/navigation/AppShell.tsx).
- Converted [LockScreen.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/LockScreen.tsx) and all 6 [PinSetup.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/PinSetup.tsx) steps to theme-aware light/dark gradients with crisp card elevation, and gave [ImageUploader.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ImageUploader.tsx) paper backing for ink assets vs dark backing for photos.
- Added outer `chartColors.label` SVG labels + high-contrast tooltips in [PieChart.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/charts/PieChart.tsx), [RadarChart.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/charts/RadarChart.tsx), and [ComposedChart.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/charts/ComposedChart.tsx), plus a mobile theme toggle button in [PageHeader.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ui/PageHeader.tsx).
- Verified after final edit: `npm run lint` (0 errors), `npx tsc -b` (0 errors), and `npx vitest run --maxWorkers=2` (**58/58 files, 536/536 tests passed**).
