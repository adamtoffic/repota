# Branch 3 Report: Responsive Breakpoints & Live UX Bug Fixes (`fix/responsive-ux-bugs`)

Merged Branch 2 (`fix/a11y-modals-forms-live`) into `feat/navigation-shell` (`--no-ff`) and branched `fix/responsive-ux-bugs`.

## What Changed

1. **768px–1024px Tablet Squeeze & Rank Badge Overflow**
   - `src/components/StudentList.tsx`: moved mobile card -> desktop table breakpoint from `md:` (`768px`) to `lg:` (`1024px`) so `768px–1023px` tablets alongside the `md:w-64` sidebar never squeeze the 6-column table; updated desktop rank pill from fixed `h-8 w-8` to `h-8 min-w-8 px-2` so `10th`, `23rd`, and `100th` never clip; raised mobile card action buttons to `min-h-11`.
   - `src/components/sba/SbaMarkbookGrid.tsx` & `src/test/SbaWorkflow.test.tsx`: shifted markbook desktop table threshold from `(min-width: 768px)` to `(min-width: 1024px)`.
   - `src/components/analytics/AnalyticsOverviewTab.tsx`, `AnalyticsSubjectsTab.tsx`, `AnalyticsDemographicsTab.tsx`, `src/pages/settings/SettingsHub.tsx`, `src/components/settings/SchoolIdentitySection.tsx`: shifted tight `md:grid-cols-2`/`md:grid-cols-3`/`sm:grid-cols-[...]` multi-column layouts to `lg:`/`xl:` breakpoints, linked `SchoolIdentitySection` fee `Cycle` `<label htmlFor>` to its `<select>`, and raised `text-[10px]` fee card labels to `text-xs`.

2. **Restored Mobile Home Class Context Strip (`src/pages/Dashboard.tsx`)**
   - Replaced the desktop-only hidden context header with a responsive stack visible on both mobile and desktop (`<h1>` class title, exam mode badge, term/year/subject metadata, and `Import Scores` / `Add Student` `min-h-11` action buttons).

3. **Mobile `/print` Responsive Scaling & Zoom Toggle (`src/pages/PrintPreview.tsx`)**
   - Replaced hardcoded `h-[126mm]`/`sm:h-[225mm]` wrapper heights and static `scale-[0.42]` with dynamic `ResizeObserver` fit-to-width scaling (`A4_WIDTH_PX = 794`, `A4_HEIGHT_PX = 1123`), added a compact `Fit` / `100%` toggle when `fitScale < 0.98`, added `.report-scale-stage { transform: none !important; width: 210mm !important; }` to `@media print`, and bumped toolbar controls/labels (`min-h-10 sm:h-9`, `text-[11px]`).

4. **Live UX Bugs & Touch Targets**
   - `src/components/settings/ReportTemplateSection.tsx`: added local draft states (`primaryHexDraft`, `accentHexDraft`) so typing or backspacing inside the Primary/Accent hex inputs works smoothly, commits valid 6-digit hex colors immediately, and reverts incomplete drafts on blur.
   - `src/components/charts/BarChart.tsx` & Analytics callers (`AnalyticsOverviewTab.tsx`, `AnalyticsDemographicsTab.tsx`, `AnalyticsSubjectsTab.tsx`): added `useId()`-scoped `<linearGradient>` IDs so mounted bar charts never collide, added `valueFormatter` prop across all 5 bar charts (count charts display `N student(s)` instead of `%`), and fixed `BarChartTooltip` using an explicit swatch dot and readable theme color.
   - `src/components/settings/AcademicSessionSection.tsx`: wrapped the add-subject `<Input>` inside `<div className="min-w-0 flex-1">` so it flex-grows properly.
   - `src/components/DashboardToolbar.tsx` & `src/components/sba/SbaMarkbookMobileView.tsx`: raised mobile filter pills, Class Tools trigger, close button, and SBA mobile pill touch targets (`min-h-10`) and count badge text (`text-xs`).

5. **Tests (`src/test/ResponsiveAndUxBugs.test.tsx`)**
   - Added 5 regression tests covering hex color draft editing/blur revert, unique SVG gradient IDs + tooltip unit formatting, `AcademicSessionSection` flex-1 wrapper, visible mobile Dashboard class context strip + `min-w-8`/`min-h-11` `StudentList` controls, and dynamic `/print` Fit vs `100%` zoom without `h-[126mm]`.

## Why

To eliminate the tablet-width (`768px–1023px`) horizontal squeeze behind the persistent sidebar, restore missing class/term context on mobile Home, fix mobile A4 print preview clipping, repair broken hex/chart/flex UX bugs, and bring mobile tap targets into a comfortable >=40–44px range without changing `.report-page` print layout or stored data formats.

## What Was Verified

All checks passed after the final edit:

- `npm run lint` (`eslint .`): passed (exit code `0`)
- `npx tsc -b`: passed (exit code `0`)
- `npx vitest run --maxWorkers=2`: passed — **`58` test files passed (`58`), `532` tests passed (`532`)**

## What Could NOT Be Verified

- Physical phone/tablet browser layout and pinch/pan behavior on `/print`, `/`, `/sba`, `/analytics`, and `/settings`.
- Printed A4 paper output from native browser print and iOS PDF share fallback.

## Summary for reviewer

- **Branch 3 (`fix/responsive-ux-bugs`)** builds on merged Branch 2 and resolves tablet/mobile responsive breakpoints, print scaling, and live UX bugs without touching `.report-page` print rules or stored data.
- Shifted cramped `768px–1023px` grids/tables (`StudentList`, `SbaMarkbookGrid`, Analytics tabs, `SettingsHub`, `SchoolIdentitySection`) to `lg:`/`xl:` and changed rank pills to `min-w-8 px-2` + raised mobile touch targets (`min-h-10` / `min-h-11`).
- Restored the visible mobile class context strip + action row in [Dashboard.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/pages/Dashboard.tsx) and replaced hardcoded `h-[126mm]` scaling in [PrintPreview.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/pages/PrintPreview.tsx) with dynamic `ResizeObserver` fit scaling + a `Fit`/`100%` zoom toggle.
- Fixed uneditable hex drafts in [ReportTemplateSection.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/settings/ReportTemplateSection.tsx), SVG gradient ID collisions + `%` count tooltips in [BarChart.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/charts/BarChart.tsx), and the flex-1 subject input wrapper in [AcademicSessionSection.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/settings/AcademicSessionSection.tsx).
- Verified after final edit: `npm run lint` (0 errors), `npx tsc -b` (0 errors), and `npx vitest run --maxWorkers=2` (**58/58 files, 532/532 tests passed**).
