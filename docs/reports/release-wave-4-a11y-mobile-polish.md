# Release Hardening Wave 4 — Privacy, Mobile/iOS Polish, A11y & Hosting Cleanup

## What Changed

- **Privacy, Analytics Host Gating & Hosting Security (`src/utils/analyticsEnv.ts`, `docs/analytics-events.md`, `vite.config.ts`, `vercel.json`):**
  - Removed the `vercelEnv === "production"` bypass and changed the unknown-host fallback in `resolveAppEnv` from `"production"` to `"preview"`, so analytics and session replay fail closed outside `PRODUCTION_HOSTS` (`repota.app`, `www.repota.app`, `repota.vercel.app`).
  - Excluded `**/posthog-*.js` from Workbox `globIgnores` in `vite.config.ts`, reducing offline precache to 59 entries (`2841.62 KiB`).
  - Added baseline HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`) to `vercel.json`.
  - Updated `docs/analytics-events.md` paths (`src/utils/analytics.ts`, `src/context/school/useSchoolStorageLifecycle.ts`) and stripped `data-record="true"` from dynamic counts/metrics in `AnalyticsInsightsTab`, `DashboardToolbar`, `AppShell`, `SbaPage`, `QuickGradebookHeader`, `SbaMarkbookGrid`, and `SbaTaskManagerModal`.
- **Mobile / iOS Safari PWA Ergonomics, Dark Mode & WCAG AA Contrast:**
  - Added `env(safe-area-inset-top)` clearance and `role="group" aria-label="Ink mode"` (`grid-cols-2`) to the `PrintPreview` toolbar.
  - Fixed Dark Mode contrast on both active B&W toggles (`dark:bg-slate-100 dark:text-slate-900`) and added `aria-pressed` states in `ReportTemplateSection`.
  - Extended the iOS anti-zoom media query in `src/index.css` with `(hover: none) and (pointer: coarse)`, updated the mobile-sheet hide rule to `max-width: 767px`, and switched route shells and modals from `min-h-screen`/`vh` to `min-h-dvh`/`dvh`.
  - Guarded `localStorage`/`sessionStorage` access in `PwaInstallPrompt`, `OfflineDetector`, and `WelcomeTour`, added legacy `navigator.standalone` detection and non-overlapping positioning on `PwaInstallPrompt`, suppressed `AutoSaveIndicator` non-error pills while software keyboards are active, made `WelcomeTour` scrollable on short viewports, and strengthened WCAG AA contrast (`bg-amber-700`, `text-orange-700`, `text-green-700`, `text-red-700`).
- **Accessibility & Dead Code Cleanup:**
  - Replaced `hidden` with `sr-only` + `focus-within:ring-2` on file upload inputs (`DataBackup`, `BulkImportModal`, `ScoreImportConfigAndInput`), labeled search and import textareas, added `ariaLabelledBy` across all 9 `<Modal>` components, added `useDialogA11y` focus traps + portals to `ProgressModal` (`role="progressbar"`) and `BackupModals` `showReloadOverlay`, fixed `DashboardToolbar` `md:` breakpoint z-index + Arrow/Escape menu keyboard navigation, updated `ScoreEntryModal`, `PdfExportModal`, `SbaTaskManagerModal` ARIA tablist/tabpanel, `DashboardStats`, `SecurityBackupSection`, `StorageMonitor`, `PinSetup`, and `PinRecovery`.
  - Deleted unused `src/components/reports/*`, empty `src/App.css`, dead CSS rules in `src/index.css`, and minor dead props/comments (`AppShell`, `PageHeader`, `AboutModal`, `Footer`).
- **Tests (`src/test/reportAnalytics.test.ts`, `src/test/ReleaseWave4A11yPrivacyPolish.test.tsx`, `src/test/NavigationShell.test.tsx`):**
  - Added non-allowlisted domain tests and Wave 4 regression specs for privacy gating, dark-mode B&W toggles, accessible file inputs/dialogs/menus/tabs, `data-record` masking, and iOS/storage resilience.

## Why

- Guarantee zero-PII session replay boundaries, fail-closed analytics gating on preview/staging forks, full keyboard & screen-reader parity, and clean iOS Safari PWA viewport behavior before launch.

## What Was Verified

- `npm run lint` — 0 errors, 0 warnings.
- `.\node_modules\.bin\tsc.cmd -b` — exited 0.
- `.\node_modules\.bin\vitest.cmd run --maxWorkers=1` — 65/65 test files passed, 608/608 tests passed.
- `npm run build` — succeeded (`59 entries`, `2841.62 KiB`); verified `dist/sw.js` contains zero `posthog-` precache entries.
- `npm run test:e2e` — 9/9 Playwright Chromium tests passed.

## What Could NOT Be Verified

- Live Vercel HTTP response headers and physical iPhone notch / landscape Safari keyboard rendering cannot be executed inside local `vitest`/`chromium` runs (header config checked in `vercel.json` and CSS rules checked directly).

## Summary for reviewer

- Hardened privacy & hosting: `resolveAppEnv` fails closed to `"preview"`, `data-record="true"` removed from dynamic metrics, `posthog-*.js` excluded from Workbox precache (`59` entries in `dist/sw.js`), and `vercel.json` security headers added.
- Fixed `/print` `safe-top` clearance, Dark Mode active B&W toggles, landscape iOS anti-zoom (`pointer: coarse`), `min-h-dvh`/`dvh` sizing, `PwaInstallPrompt`/`OfflineDetector`/`WelcomeTour` storage resilience, `AutoSaveIndicator` keyboard hiding, and WCAG AA contrast ratios.
- Made file uploads keyboard-accessible (`sr-only`), named all 9 `<Modal>` dialogs + added `ProgressModal`/`ReloadOverlay` focus traps, added `DashboardToolbar` `md:` z-index & keyboard menu navigation, and removed orphaned `src/components/reports/*` + `src/App.css`.
- Verified with `lint`, `tsc -b`, 65/65 Vitest files (608 tests), production build + SW check, and 9/9 Playwright E2E tests.
