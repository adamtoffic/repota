# Design Tokens & Dark Mode Implementation Report

Branch: `feat/dark-mode` (branched from `feat/navigation-shell`)

## What Changed

### 1. Device-Local Theme Engine & Zero-FOUC Boot
- Updated `index.html` with a single `<meta name="theme-color" content="#1E3A8A" />` and synchronous inline boot script reading `repota_theme` from `localStorage` (`"system" | "light" | "dark"`) to apply `.dark`, `color-scheme`, `dataset.theme`, and `#0F172A` before first paint.
- Added `src/utils/theme.ts` (`THEME_STORAGE_KEY`, `THEME_CHANGE_EVENT`, `LIGHT_THEME_COLOR`, `DARK_THEME_COLOR`, `readStoredThemePreference`, `getSystemTheme`, `resolveTheme`, `applyThemeToDocument`, `saveThemePreference`, `getChartThemeColors`, `normalizeChartSvgForLightExport`).
- Added `src/context/ThemeContextDefinition.ts`, `src/context/ThemeContext.tsx`, and `src/hooks/useTheme.ts` (`ThemeProvider` + fallback-safe `useTheme()` subscribing to `prefers-color-scheme: dark` changes and storage/theme events, wrapped in `src/App.tsx` with Sonner `<Toaster theme={resolvedTheme} />`).

### 2. Semantic Design Tokens & White-Paper Isolation
- Updated `src/index.css` with `@custom-variant dark (&:where(.dark, .dark *));`, `:root` and `:root.dark` CSS variables mapped via `@theme inline` (`--color-background`, `--color-surface`, `--color-subtle`, `--color-elevated`, `--color-input`, `--color-border*`, `--color-main`, `--color-secondary`, `--color-muted`, `--color-primary*`, `--color-accent*`, `--color-danger*`, `--color-success*`), `@layer base` `html, body` defaults, `.report-page, [data-paper-surface="true"]` light token locks, and `@media print` `:root, :root.dark` resets.
- Isolated report sheets and exports to light paper while leaving dark mode intact on screen: `[data-paper-surface="true"]` on `PrintPreview` (`[data-pdf-card="true"]`), `LazyReportCard`, `ReportTemplateSection` live header preview, `pdfPrint.ts` (`generateReportsPdfFile` & `generateBlocksPdfFile` staging + `html2canvas` `onclone` stripping `.dark` + `normalizeChartSvgForLightExport`), and `analyticsExport.ts`.

### 3. UI Controls, App Components, Charts & Tests
- Added a compact 3-way `System / Light / Dark` switcher in `src/components/navigation/AppShell.tsx` above `Print Reports` and an Appearance section in `src/pages/settings/SettingsHub.tsx` with `data-record="true"` strictly on static labels/buttons.
- Migrated all shared UI primitives (`src/components/ui/*`), pages (`Dashboard`, `Analytics`, `PrintPreview`, `SbaPage`, `SettingsHub`, `SettingsSubPageLayout`, `router`), Recharts wrappers (`BarChart`, `ComposedChart`, `LineChart`, `PieChart`, `RadarChart`), tabs, settings sections, and dialogs (`AddStudentModal`, `BulkAttendanceModal`, `BulkImportModal`, `BulkPromotionModal`, `ConfirmModal`, `ProgressModal`, `AboutModal`, `PdfExportModal`, `ScoreImportModal`, plus `ImageUploader`) to semantic tokens and `.dark` contrast variants.
- Added `src/test/ThemeAndDarkMode.test.tsx` (8 tests) and updated the legacy PwaInstallPrompt dark-class exclusion test in `src/test/ModalAndOverlayUX.test.tsx` to assert semantic tokens (`bg-elevated`, `text-main`) without hardcoded `bg-white` or `dark:bg-gray-900`.

## Why
- Deliver comfortable low-light contrast across Gradebook, SBA, Settings, and Analytics without altering `SchoolSettings`, IndexedDB stores (`ges_v1_students`, `ges_v1_settings`), `.repota` encrypted backups, or A4 report templates (`src/templates/*`, `src/components/reports/*`, `ReportTemplate.tsx`).
- Keep report previews, PNG/PDF exports, uploaded black-ink crests/signatures (`ImageUploader`), and native printouts on clean white paper regardless of screen theme.

## What Was Verified
- `npm run lint` (`eslint .`): exited `0`.
- `npx tsc -b`: exited `0`.
- `npm test -- --run --maxWorkers=2`: exited `0` — `Test Files  47 passed (47)`, `Tests  437 passed (437)` (0 skipped), including `src/test/ThemeAndDarkMode.test.tsx` (8 passed).
- `npm run build` (`tsc -b && vite build` + PWA v1.3.0): exited `0` in `32.70s` (`dist/sw.js`, `precache 32 entries`).
- Live Vite dev server check at `http://127.0.0.1:5173/` (`BROWSER_HOST_FACTS` verified visited origins `http://localhost:5173`, `http://127.0.0.1:5173`, `blocked_origins: none`, and inspected `final_step_54.png`): confirmed dark mode toggle, reload persistence of `.dark`, Dashboard dark table/KPI contrast at desktop width (`1280px`), Quick Gradebook inputs, Analytics Recharts/tooltips, Settings Hub Appearance card, Settings/Templates Live Header Preview light paper, and Print Preview white A4 cards (`[data-pdf-card="true"]` `bg-white text-black`). (Pre-existing narrow `md` desktop crowding at `~847px` viewport width on stat card icons / filter pill wrapping is unrelated to theme styling.)
- Protected-file check (`git status --short`): zero modifications to `src/templates/*`, `src/components/reports/*`, `src/components/ReportTemplate.tsx`, `src/utils/backupValidation.ts`, `src/utils/fileEncryption.ts`, `src/types/index.ts`, `src/utils/idbStorage.ts`, `src/utils/analytics.ts`, or `src/utils/reportAnalytics.ts`.

## What Could Not Be Verified
- Physical iOS Safari standalone PWA status-bar rendering (`<meta name="theme-color">`) and physical OS dark-mode transitions outside the mocked `matchMedia` unit tests.
- Actual browser OS print dialog PDF output and real PNG/PDF pixel output from non-mocked `html2canvas-pro` / `jspdf` inside Vitest (`happy-dom`).
- Direct DOM `localStorage.getItem` inspection inside the browser subagent sandbox (`evaluate` disabled; verified indirectly via reload persistence and Settings Hub card state).

## Summary for reviewer
- Added opt-in class-based Dark Mode (`@custom-variant dark`) and semantic Tailwind v4 tokens in `src/index.css` on branch `feat/dark-mode`.
- Stored theme preference (`"system" | "light" | "dark"`) strictly device-locally in `localStorage` (`repota_theme`) with zero FOUC via `index.html`.
- Added compact sidebar toggle (`AppShell`), Appearance card (`SettingsHub`), Sonner `<Toaster>` syncing, and themed Recharts wrappers.
- Isolated `PrintPreview`, `LazyReportCard`, `ReportTemplateSection` preview, `@media print`, `pdfPrint.ts`, and `analyticsExport.ts` to white paper.
- Migrated all app pages, forms, cards, settings sections, and modals while leaving report templates, IDB schemas, and backups untouched.
- Put `data-record="true"` strictly on static labels/controls to preserve Zero-PII session replay masking.
- Verified with `npm run lint` (0), `npx tsc -b` (0), `npm test -- --run --maxWorkers=2` (47 files / 437 tests passed), `npm run build` (0), and Vite browser visual check.
