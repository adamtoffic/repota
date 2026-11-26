# Branch 1 Report: Accessibility Foundation (`fix/a11y-contrast-landmarks`)

Branch: `fix/a11y-contrast-landmarks` (branched off `feat/navigation-shell`)

## What Changed

1. **Mobile Zoom & Double-Tap Protection (`index.html`, `src/index.css`)**
   - Removed `maximum-scale=1.0, user-scalable=no` from the `<meta name="viewport">` tag while keeping `width=device-width, initial-scale=1.0, viewport-fit=cover`.
   - Added `:where(a, button) { touch-action: manipulation; }` in `@layer base` so fast taps avoid accidental double-tap zoom while two-finger pinch-to-zoom remains enabled.

2. **WCAG AA Contrast & Global Focus Tokens (`src/index.css`)**
   - Light theme (`:root`): updated `--status-success` to `#15803d`, `--border-strong` to `#8492a6`, and `--text-muted` to `#475569`.
   - Dark theme (`:root.dark`): updated `--brand-primary` to `#2563eb`, `--status-danger` to `#dc2626`, `--status-success` to `#22c55e`, `--status-success-foreground` to `#090c12`, and `--border-strong` to `#556888`.
   - Added a `@layer base` `:focus-visible` outline rule (`2px solid var(--brand-primary-text)`, `outline-offset: 2px`) for interactive controls and `[tabindex]:not([tabindex="-1"])`.
   - Preserved `.report-page` / `[data-paper-surface="true"]` and `@media print` styling untouched.

3. **Accessible Button & Contrast Fixes Across Components**
   - `src/components/ui/Button.tsx` and `src/components/ui/IconButton.tsx`: defaulted `type="button"` and added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-text focus-visible:ring-offset-2 focus-visible:ring-offset-surface`.
   - `src/components/navigation/AppShell.tsx`: updated `SidebarStudentCountBadge` from `bg-white/20` to `bg-black/25` inside the `Print Reports` CTA so dark-mode `#2563eb` primary background retains high white-text contrast.
   - `src/components/DashboardToolbar.tsx`: updated active filter pill backgrounds (`bg-orange-700`, `bg-amber-700`, `bg-red-600`) and added `type="button"` and `aria-pressed={isActive}` to `FilterButton`.
   - `src/components/StudentList.tsx`: raised desktop action row resting opacity (`md:opacity-85`), updated delete icon contrast (`text-red-600 dark:text-red-400`), and added student-specific `aria-label`s (`Edit scores for ...`, `Print report for ...`, `Delete ...`).
   - `src/components/PinRecovery.tsx`, `src/components/PinSetup.tsx`, `src/components/settings/SecurityBackupSection.tsx`, `src/components/analytics/AnalyticsOverviewTab.tsx`: darkened filled badge/button surfaces (`bg-amber-700`, `bg-green-700`, darker rank pill gradients) and darkened light-mode amber/green text (`text-amber-700`, `text-green-700`) across `AnalyticsOverviewTab.tsx`, `AnalyticsInsightsTab.tsx`, `InsightCard.tsx`, `StatCard.tsx`, and `PinSetup.tsx`.

4. **Landmarks, Skip Link, Heading Order, Table Semantics, & Control Attributes**
   - `src/components/navigation/AppShell.tsx`: added `#main-content` skip link, `aria-label="Primary navigation"` on the desktop sidebar `<nav>`, and `focus-visible` ring styling on navigation links, theme controls, and the Print CTA.
   - `src/components/ui/PageHeader.tsx`: changed outer `<nav>` to `<header>` and `<h1>REPOTA</h1>` to a non-heading `<span>` so each route owns a single `<h1>`.
   - `src/pages/Dashboard.tsx`, `src/pages/SbaPage.tsx`, `src/pages/Analytics.tsx`, `src/pages/PrintPreview.tsx`, `src/pages/settings/SettingsHub.tsx`, `src/pages/settings/SettingsSubPageLayout.tsx`: standardized `<main id="main-content" tabIndex={-1}>` targets and single page `<h1>` structure (`PrintPreview` uses `<header>` for the sticky toolbar and `<main>` for printable pages). In `Dashboard.tsx`, only the non-interactive `<h1>` uses `max-md:sr-only` on mobile while desktop controls use `hidden md:...` so no focusable elements are visually hidden on mobile.
   - Normalized heading hierarchy (`h1` -> `h2` -> `h3`) across `DashboardStats.tsx` (`StatCard` value switched from `<h3>` to `<p data-stat-value="true">`, over-capacity banner to `<h2>`), `Dashboard.tsx`, `Analytics.tsx`, `ChartCard.tsx`, `InsightCard.tsx`, `FilterPanel.tsx`, `AnalyticsOverviewTab.tsx`, `AnalyticsSubjectsTab.tsx`, `AnalyticsDemographicsTab.tsx`, and `AnalyticsInsightsTab.tsx`.
   - Added `scope="col"` to `<th>` headers in `StudentList.tsx`, `AnalyticsSubjectsTab.tsx`, and `AnalyticsDemographicsTab.tsx`; updated `StudentList.tsx` virtualizer spacer rows to render only when non-zero with `aria-hidden="true"` and `<td colSpan={6} className="p-0" />`, and added a `"-"` fallback cell when `Position` is pending so all header columns describe populated cells.
   - Added missing `type="button"` attributes across `AboutModal.tsx`, `Alert.tsx`, `DataBackup.tsx`, `ErrorBoundary.tsx`, `FilterPanel.tsx`, `Footer.tsx`, `StorageMonitor.tsx`, `Dashboard.tsx`, and `Analytics.tsx`.
   - Added `aria-label` attributes on subject removal buttons in `src/components/settings/AcademicSessionSection.tsx` and the mobile empty-state add button in `src/pages/Dashboard.tsx`.

5. **Tests**
   - Added `src/test/AccessibilityFoundation.test.tsx` (6 tests covering zoom meta, landmarks/skip-link/single-`<h1>`/non-interactive `sr-only`/sequential heading levels/`SidebarStudentCountBadge` contrast class, `PageHeader` landmark, `Button`/`IconButton` focus & `type` defaults, `StudentList` `th[scope="col"]` + labels / `DashboardToolbar` pressed state, and `AcademicSessionSection` remove button labels).
   - Updated `PageHeader` element assertions (`nav` -> `header`) in `src/test/SbaWorkflow.test.tsx` and `src/test/ScoreEntryUX.test.tsx`, and updated heading selectors (`h3`/`h4` -> `h2` / `[data-stat-value="true"]`) in `src/test/PostHogConfig.test.tsx`.

## Why

To establish WCAG 2.1 Level AA fundamentals and resolve the Branch 1 Lighthouse findings (contrast on dark-mode Print count badge and light-mode Analytics amber/green labels, sequential `h1 -> h2 -> h3` heading order on Dashboard and Analytics, and `StudentList` `<th>` / data-cell associations) without breaking print surfaces or existing storage/data contracts. Note: `<select>` label association (`First Term / Second Term / Third Term` on `/settings/academic`) is scoped to Branch 2 (`fix/a11y-modals-forms-live`).

## What Was Verified

All checks ran cleanly after the final code and test edit:

- `npm run lint` (`eslint .`): passed (exit code 0)
- `npx tsc -b`: passed (exit code 0)
- `npx vitest run --maxWorkers=2`: passed — `56` test files passed (`56`), `521` tests passed (`521`), including `AccessibilityFoundation.test.tsx`, `PostHogConfig.test.tsx`, `ScoreEntryUX.test.tsx`, and `SbaWorkflow.test.tsx`.

## What Could NOT Be Verified

- Real assistive-technology announcement order and navigation in VoiceOver, NVDA, or TalkBack.
- Re-running live browser Lighthouse Mobile/Desktop audits and physical touch-device pinch-to-zoom after this follow-up commit.

## Summary for reviewer

- **Branch 1 (`fix/a11y-contrast-landmarks`)** completes WCAG 2.1 AA foundation fixes plus the Branch 1 Lighthouse follow-up fixes, leaving persisted keys, IDB stores, backup formats, and `.report-page` print styles untouched.
- Pinch-to-zoom is unlocked in `index.html` while `touch-action: manipulation` on `a, button` prevents accidental double-tap zoom; `:focus-visible` outlines and contrast tokens are updated in `src/index.css`.
- Fixed dark-mode `Print Reports` badge contrast (`bg-black/25`), light-mode Analytics/PinSetup amber and green text (`text-amber-700`, `text-green-700`), `h1 -> h2 -> h3` heading order across Dashboard & Analytics (`StatCard` numeric value is `<p>`), and `<th>` `scope="col"` / non-empty Position cell / spacer cells in `StudentList.tsx`.
- `/settings/academic` `<select>` label association (`Select.tsx`) remains scoped to Branch 2 (`fix/a11y-modals-forms-live`).
- Verified after the last edit: `npm run lint` (0 errors), `npx tsc -b` (0 errors), and `npx vitest run --maxWorkers=2` (**56/56 files, 521/521 tests passed**).
