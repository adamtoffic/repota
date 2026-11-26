# Branch 5 Task Report: Design System, Modal Alignment & Playwright Pass (`feat/design-system-polish`)

## What Changed
- **Offline Self-Hosted Typography (`src/assets/fonts/`, `src/index.css`):**
  - Bundled `inter-latin-wght-normal.woff2` (48.26 kB, OFL-1.1 license in `INTER-OFL-LICENSE.txt`) directly in `src/assets/fonts/` with zero new npm dependencies.
  - Declared `@font-face` (`font-display: swap`, weight `100 900`) and applied `--font-sans` with tabular/legibility font features (`cv02`, `cv03`, `cv04`, `cv11`) globally on `html, body`.
  - Refined overly heavy `font-black` headings/wordmarks to crisp `font-bold` / `font-extrabold` + `tracking-tight` across [Dashboard.tsx](../../src/pages/Dashboard.tsx), [DashboardStats.tsx](../../src/components/DashboardStats.tsx), [AppShell.tsx](../../src/components/navigation/AppShell.tsx), [PageHeader.tsx](../../src/components/ui/PageHeader.tsx), and [SbaWeightsModal.tsx](../../src/components/sba/SbaWeightsModal.tsx).
- **Warm Paper Light Mode & Aligned Academic Dark Mode (`src/index.css`, `index.html`, `src/utils/theme.ts`):**
  - Updated `:root` light-mode tokens to warm paper stationery neutrals (`#f7f7f5` canvas, `#ffffff` cards, `#f1f0ec` subtle surface, `#fafaf8` inputs, `#e6e4de` borders, `#8a8882` strong borders, `#14181f` ink, `#525866` muted ink).
  - Updated `:root.dark` tokens to aligned midnight academic navy (`#0b101b` canvas, `#121927` cards, `#182133` subtle, `#1e293e` elevated, `#2e52b5` primary, `#7aa7ff` primary text, `#5b7092` strong border).
  - Updated `DARK_THEME_COLOR` (`#0B101B`), `LIGHT_CHART_COLORS`, `DARK_CHART_COLORS`, and `DARK_TO_LIGHT_SVG_COLOR` in [src/utils/theme.ts](../../src/utils/theme.ts) and [index.html](../../index.html), keeping `.report-page` / `[data-paper-surface="true"]` paper surfaces isolated to white.
- **Calm Dashboard Hierarchy & Repota Gold Brand Budget:**
  - Removed pulsing `animate-ping` dots from [DashboardStats.tsx](../../src/components/DashboardStats.tsx), switched KPI wells to calm neutral monochrome (lighting amber/red only on active alerts), and tightened Dashboard spacing.
  - Highlighted Top 3 positions (`1st`, `2nd`, `3rd`) with Repota Gold while keeping `4th+` neutral in [StudentList.tsx](../../src/components/StudentList.tsx), moved Student Records header inside the card, and removed unrelated purple/bright-blue accents.
  - Removed redundant `⚠️` emoji from [ValidationWarnings.tsx](../../src/components/ValidationWarnings.tsx); unified mobile dock styling in [AppShell.tsx](../../src/components/navigation/AppShell.tsx); aligned focus tokens across form controls.
- **`ScoreEntryModal` Input Alignment & Responsive Modal Pass:**
  - Fixed vertical stagger between Class Score and Exam Score inputs in [SubjectRow.tsx](../../src/components/SubjectRow.tsx) by switching desktop rows to `sm:items-start` while vertically centering Total/Grade/Name cells against the `h-10` input baseline (`= X/Y` captions underneath Exam Score no longer pull Exam Score upward).
  - Aligned `Date of Birth` with `Male`/`Female` buttons, `Days Present` with `Promotion Status` (adding `min-h-5` label headers so the dynamic attendance badge never pushes `Days Present` down), and `Fee Payment Status` with `Fee Arrears` in [DetailsTab.tsx](../../src/components/tabs/DetailsTab.tsx).
  - Prevented narrow-screen tab wrapping in [ScoreEntryModal.tsx](../../src/components/ScoreEntryModal.tsx) (`overflow-x-auto no-scrollbar whitespace-nowrap`) and aligned [AcademicTab.tsx](../../src/components/tabs/AcademicTab.tsx) focus/button tokens.
  - Added sticky-header / scrollable-body / sticky-footer `max-h-[88dvh]` containers, safe mobile widths/touch targets, and aligned form rows across [BulkAttendanceModal.tsx](../../src/components/BulkAttendanceModal.tsx), [BulkPromotionModal.tsx](../../src/components/BulkPromotionModal.tsx), [BulkImportModal.tsx](../../src/components/BulkImportModal.tsx), [ScoreImportConfigAndInput.tsx](../../src/components/import/ScoreImportConfigAndInput.tsx), [SbaTaskManagerModal.tsx](../../src/components/sba/SbaTaskManagerModal.tsx), [BackupModals.tsx](../../src/components/backup/BackupModals.tsx), [AddStudentModal.tsx](../../src/components/AddStudentModal.tsx), and [AboutModal.tsx](../../src/components/AboutModal.tsx).
- **Tests & Real-Browser Playwright E2E:**
  - Added unit tests in [DesignSystemPolish.test.tsx](../../src/test/DesignSystemPolish.test.tsx) and updated [ThemeAndDarkMode.test.tsx](../../src/test/ThemeAndDarkMode.test.tsx).
  - Fixed Analytics ARIA tab assertions (`getByRole("tab")`) in [repota-core.spec.ts](../../e2e/repota-core.spec.ts).
  - Added [responsive-modals-and-theme.spec.ts](../../e2e/responsive-modals-and-theme.spec.ts) verifying real-browser `Inter` font load, zero horizontal overflow across all routes on desktop (`1280x800`) and mobile (`390x844`) in Light & Dark modes, `<= 2px` bounding-box alignment on `ScoreEntryModal` inputs, and mobile modal viewport containment.

## Why
Ensure crisp offline typography on Windows/Android/iOS, cohesive Light/Dark palette parity, pixel-aligned score/detail form rows, responsive mobile modal containment, and automated real-browser E2E confidence.

## What Was Verified
- `npm run lint` (`eslint .`) — passed (exit `0`).
- `npx tsc -b` — passed (exit `0`).
- `npx vitest run --maxWorkers=2` — **`59` test files passed (`59`), `540` tests passed (`540`)**.
- `npm run build` — passed (`23.76s`); `index` chunk `369.17 kB` (`108.01 kB` gzip), `inter-latin-wght-normal-*.woff2` `48.26 kB`, Workbox precache `57 entries (3244.52 KiB)`.
- `npm run test:e2e` (`playwright test`, real Chromium) — **`9` passed (`56.8s`)**.
- `git diff --stat package.json package-lock.json` — zero dependency changes.

## What Could Not Be Verified
- Visual appearance on physical mobile hardware (Safari iOS / Android Chrome) and non-Chromium engines (WebKit/Firefox); automated real-browser tests ran in Playwright Chromium.

## Summary for Reviewer
- Bundled self-hosted `Inter Variable` (`48.26 kB`), tuned warm paper Light Mode + deep navy Dark Mode tokens, and calmed Dashboard stat hierarchy + Top-3 Repota Gold ranks.
- Fixed `ScoreEntryModal` input misalignment in `SubjectRow` (`sm:items-start`) and `DetailsTab` (uniform `min-h-5` label headers + matching `h-11 sm:h-[42px]` inputs).
- Audited and upgraded modal responsiveness (`max-h-[88dvh]` scroll shells, touch targets, `scope="col"` preview headers) across 9 modal components.
- Verified with `npm run lint`, `npx tsc -b`, `npx vitest run --maxWorkers=2` (59 files / 540 tests), `npm run build`, and Playwright E2E (9/9 Chromium tests passing).
