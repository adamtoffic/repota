# Branch 5 Task Report: Design System, Typography & Dashboard Polish (`feat/design-system-polish`)

## What Changed
- **Offline Self-Hosted Typography (`src/assets/fonts/`, `src/index.css`):**
  - Bundled `inter-latin-wght-normal.woff2` (48.26 kB, OFL-1.1 license in `INTER-OFL-LICENSE.txt`) directly in `src/assets/fonts/` with zero new npm dependencies.
  - Declared `@font-face` (`font-display: swap`, weight `100 900`) and applied `--font-sans` with tabular/legibility font features (`cv02`, `cv03`, `cv04`, `cv11`) globally on `html, body`.
  - Refined overly heavy `font-black` headings/wordmarks to crisp `font-bold` / `font-extrabold` with `tracking-tight` across [Dashboard.tsx](../../src/pages/Dashboard.tsx), [DashboardStats.tsx](../../src/components/DashboardStats.tsx), [AppShell.tsx](../../src/components/navigation/AppShell.tsx), and [PageHeader.tsx](../../src/components/ui/PageHeader.tsx).
- **Warm Paper Light Mode & Aligned Academic Dark Mode (`src/index.css`, `index.html`, `src/utils/theme.ts`):**
  - Updated `:root` light-mode tokens to warm paper stationery neutrals (`#f7f7f5` canvas, `#ffffff` cards, `#f1f0ec` subtle surface, `#fafaf8` inputs, `#e6e4de` borders, `#8a8882` strong borders, `#14181f` ink, `#525866` muted ink).
  - Updated `:root.dark` tokens to aligned midnight academic navy (`#0b101b` canvas, `#121927` cards, `#182133` subtle, `#1e293e` elevated, `#2e52b5` primary, `#7aa7ff` primary text, `#5b7092` strong border).
  - Updated `DARK_THEME_COLOR` (`#0B101B`), `LIGHT_CHART_COLORS`, `DARK_CHART_COLORS`, and `DARK_TO_LIGHT_SVG_COLOR` in [src/utils/theme.ts](../../src/utils/theme.ts) and the early theme-color script in [index.html](../../index.html).
  - Preserved `.report-page`, `[data-paper-surface="true"]`, and `@media print` paper isolation untouched.
- **Calm Dashboard Hierarchy & Repota Gold Brand Budget:**
  - Removed pulsing `animate-ping` dots from [DashboardStats.tsx](../../src/components/DashboardStats.tsx), replaced rainbow KPI icon wells with neutral monochrome wells (lighting amber/red only on active alerts), and tightened `Dashboard.tsx` vertical padding.
  - Added Repota Gold distinction to Top 3 positions (`1st`, `2nd`, `3rd`) while keeping 4th+ ranks neutral in [StudentList.tsx](../../src/components/StudentList.tsx), moved Student Records header inside the card (`bg-surface`), and replaced unrelated purple accents (`Print`, `Import Scores`, `Auto-Fill Teacher Remarks`).
  - Removed redundant `⚠️` emoji prefix from [ValidationWarnings.tsx](../../src/components/ValidationWarnings.tsx) where Lucide icons already appear.
  - Aligned focus rings to `--color-primary-text` across [Input.tsx](../../src/components/ui/Input.tsx), [Select.tsx](../../src/components/ui/Select.tsx), [Textarea.tsx](../../src/components/ui/Textarea.tsx), and [DashboardToolbar.tsx](../../src/components/DashboardToolbar.tsx).
  - Unified the mobile floating dock styling in [AppShell.tsx](../../src/components/navigation/AppShell.tsx) with the app's crisp card aesthetic.
- **Tests (`src/test/ThemeAndDarkMode.test.tsx`, `src/test/DesignSystemPolish.test.tsx`):**
  - Updated dark `theme-color` meta expectations (`#0B101B`) and chart SVG light-export normalization checks.
  - Added regression assertions for bundled `.woff2` font + palette tokens, removal of `animate-ping`, Top-3 gold rank vs. 4th+ neutral styling, and clean `ValidationWarnings` text.

## Why
The previous system-font fallback rendered differently across OSes (SF Pro on iOS vs. chunky Segoe UI on Windows), light/dark modes felt visually disconnected, and multiple unrelated colors and pulsing indicators added visual noise to the Dashboard.

## What Was Verified
- `npm run lint` (`eslint .`) — passed (exit `0`).
- `npx tsc -b` — passed (exit `0`).
- `npx vitest run --maxWorkers=2` — **`59` test files passed (`59`), `540` tests passed (`540`)**.
- `npm run build` — passed (`19.73s`); emitted `dist/assets/inter-latin-wght-normal-*.woff2` (`48.26 kB`) and generated `dist/sw.js` precaching `57` entries (`3243.47 KiB`).
- `git diff --stat package.json package-lock.json` — zero dependency changes.

## What Could Not Be Verified
- Visual typography kerning, warm light-mode stationery tones, aligned dark-mode surfaces, and mobile dock translucency on physical iOS, Android, and Windows displays (verified via automated build, token, and DOM tests only).

## Summary for Reviewer
- Bundled self-hosted Inter Variable (`inter-latin-wght-normal.woff2`, 48.26 kB) into Vite + Workbox precache with zero new npm dependencies.
- Tuned light mode to warm paper neutral (`#f7f7f5`) and aligned dark mode to deep academic navy (`#0b101b` / `#2e52b5`) while keeping print/PDF paper surfaces white.
- Calmed the Dashboard by removing `animate-ping` dots, using monochrome KPI icon wells, and tightening vertical spacing above the student table.
- Brought Repota Gold into Top 3 rank badges (`1st`/`2nd`/`3rd`), sidebar class chip, Mock Exam chip, and Smart Assistant action; aligned mobile dock and form focus tokens.
- Verified with `npm run lint`, `npx tsc -b`, `npx vitest run --maxWorkers=2` (59 files / 540 tests), and `npm run build`.
