# Branch 1 Report: Accessibility Foundation (`fix/a11y-contrast-landmarks`)

Branch: `fix/a11y-contrast-landmarks` (branched off `feat/navigation-shell`)

## What Changed

1. **Mobile Zoom Unlocked (`index.html`)**
   - Removed `maximum-scale=1.0, user-scalable=no` from the `<meta name="viewport">` tag while keeping `width=device-width, initial-scale=1.0, viewport-fit=cover`.

2. **WCAG AA Contrast & Global Focus Tokens (`src/index.css`)**
   - Light theme (`:root`): updated `--status-success` to `#15803d`, `--border-strong` to `#8492a6`, and `--text-muted` to `#475569`.
   - Dark theme (`:root.dark`): updated `--brand-primary` to `#2563eb`, `--status-danger` to `#dc2626`, `--status-success` to `#22c55e`, `--status-success-foreground` to `#090c12`, and `--border-strong` to `#556888`.
   - Added a `@layer base` `:focus-visible` outline rule (`2px solid var(--brand-primary-text)`, `outline-offset: 2px`) for interactive controls and `[tabindex]:not([tabindex="-1"])`.
   - Preserved `.report-page` / `[data-paper-surface="true"]` and `@media print` styling untouched.

3. **Accessible Button & Contrast Fixes Across Components**
   - `src/components/ui/Button.tsx` and `src/components/ui/IconButton.tsx`: defaulted `type="button"` and added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface`.
   - `src/components/DashboardToolbar.tsx`: updated active filter pill backgrounds (`bg-orange-700`, `bg-amber-700`, `bg-red-600`) and added `type="button"` and `aria-pressed={isActive}` to `FilterButton`.
   - `src/components/StudentList.tsx`: raised desktop action row resting opacity (`md:opacity-85`), updated delete icon contrast (`text-red-600 dark:text-red-400`), and added student-specific `aria-label`s (`Edit scores for ...`, `Print report for ...`, `Delete ...`).
   - `src/components/PinRecovery.tsx`, `src/components/PinSetup.tsx`, `src/components/settings/SecurityBackupSection.tsx`, `src/components/analytics/AnalyticsOverviewTab.tsx`: darkened filled badge/button surfaces (`bg-amber-700`, `bg-green-700`, darker rank pill gradients) so white foreground text clears WCAG AA contrast.

4. **Landmarks, Skip Link, Single `<h1>`, and Missing Control Attributes**
   - `src/components/navigation/AppShell.tsx`: added `#main-content` skip link, `aria-label="Primary navigation"` on the desktop sidebar `<nav>`, and `focus-visible` ring styling on navigation links, theme controls, and the Print CTA.
   - `src/components/ui/PageHeader.tsx`: changed outer `<nav>` to `<header>` and `<h1>REPOTA</h1>` to a non-heading `<span>` so each route owns a single `<h1>`.
   - `src/pages/Dashboard.tsx`, `src/pages/SbaPage.tsx`, `src/pages/Analytics.tsx`, `src/pages/PrintPreview.tsx`, `src/pages/settings/SettingsHub.tsx`, `src/pages/settings/SettingsSubPageLayout.tsx`: standardized `<main id="main-content" tabIndex={-1}>` targets and single page `<h1>` structure (`PrintPreview` uses `<header>` for the sticky toolbar and `<main>` for printable pages). In `Dashboard.tsx`, only the non-interactive `<h1>` uses `max-md:sr-only` on mobile while desktop controls use `hidden md:...` so no focusable elements are visually hidden on mobile.
   - Added missing `type="button"` attributes across `AboutModal.tsx`, `Alert.tsx`, `DataBackup.tsx`, `ErrorBoundary.tsx`, `FilterPanel.tsx`, `Footer.tsx`, `StorageMonitor.tsx`, `Dashboard.tsx`, and `Analytics.tsx`.
   - Added `aria-label` attributes on subject removal buttons in `src/components/settings/AcademicSessionSection.tsx` and the mobile empty-state add button in `src/pages/Dashboard.tsx`.

5. **Tests**
   - Added `src/test/AccessibilityFoundation.test.tsx` (6 tests covering zoom meta, landmarks/skip-link/single-`<h1>`/non-interactive `sr-only`, `PageHeader` landmark, `Button`/`IconButton` focus & `type` defaults, `StudentList`/`DashboardToolbar` labels/pressed state, and `AcademicSessionSection` remove button labels).
   - Updated `PageHeader` element assertions (`nav` -> `header`) in `src/test/SbaWorkflow.test.tsx` and `src/test/ScoreEntryUX.test.tsx`.

## Why

To establish WCAG 2.1 Level AA fundamentals (pinch-to-zoom, 4.5:1 text contrast / 3:1 UI border contrast, visible keyboard focus indicators, proper landmarks and heading hierarchy, and explicit button types/labels) on the first isolated fix branch without breaking print surfaces or existing storage/data contracts.

## What Was Verified

All checks ran cleanly after the final code and test edit:

- `npm run lint` (`eslint .`): passed (exit code 0)
- `npx tsc -b`: passed (exit code 0)
- `npx vitest run --maxWorkers=2`: passed — `56` test files passed (`56`), `521` tests passed (`521`), including `AccessibilityFoundation.test.tsx`, `ScoreEntryUX.test.tsx`, and `SbaWorkflow.test.tsx`.

## What Could NOT Be Verified

- Real assistive-technology announcement order and navigation in VoiceOver, NVDA, or TalkBack.
- Physical iOS/Android pinch-to-zoom gesture testing on real devices.
- Live browser rendering/visual inspection across viewports and light/dark themes.

## Summary for reviewer

- **Branch 1 (`fix/a11y-contrast-landmarks`)** completes the WCAG 2.1 AA foundation fixes without altering any persisted keys, IDB stores, backup formats, or `.report-page` print styles.
- Pinch-to-zoom is unlocked in `index.html`, light/dark theme contrast tokens are tightened in `src/index.css` and status pills/rank badges, and `:focus-visible` outlines are active globally.
- `AppShell`, `PageHeader`, and all route pages now expose a skip link, distinct `<header>`/`<nav>`/`<main id="main-content">` landmarks, single-`<h1>` routes, explicit `type="button"` attributes, and accessible button labels.
- Mobile `Dashboard.tsx` hides only desktop chrome with `hidden md:...` while keeping the single `<h1>` `max-md:sr-only`, preventing hidden-but-focusable links/buttons on mobile.
- Verified after the last edit: `npm run lint` (0 errors), `npx tsc -b` (0 errors), and `npx vitest run --maxWorkers=2` (**56/56 files, 521/521 tests passed**).
