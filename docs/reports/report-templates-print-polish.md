# Branch 7: Report Templates & Print Polish (`feat/report-templates-print-polish`)

## What Changed

- **Ink-smart monochrome & print-calibrated color presets (`src/utils/reportTheme.ts`):**
  - Expanded `SCHOOL_COLOR_PRESETS` from 8 to 10 uncoated-A4-safe academic palettes (`royal-navy`, `oxford-indigo`, `forest-emerald`, `cathedral-pine`, `deep-teal`, `burgundy-maroon`, `imperial-purple` with `#d97706` gold accent instead of `#ec4899`, `heritage-gold` Cocoa & Gold, `crimson-red`, and `slate-charcoal` Ink-Saver Slate).
  - Extended `ReportPalette` and `getReportPalette()` with `bannerBg`, `bannerText`, `highlightBg`, `highlightText`, and `barFill` so wide header bands and KPI boxes print with crisp light-gray tints (`#f3f4f6` / `#e5e7eb`) and black ink in `bw` mode instead of solid toner-heavy `#000000` slabs.
- **Executive B&W toner polish (`src/templates/ExecutiveTemplate.tsx`):**
  - Switched header banner to `palette.bannerBg`/`palette.bannerText` with `border-b-2 border-black` in `bw` mode, Position & Aggregate highlight boxes to `palette.highlightBg`/`palette.highlightText`, and Arrears highlighting to `text-black underline` in `bw` mode.
- **Two new single-A4 print-grade templates & registry (`src/templates/HeritageTemplate.tsx`, `src/templates/ScholarTemplate.tsx`, `src/templates/registry.ts`):**
  - Added `Heritage Framed` (`heritage_v1`): double-rule institutional collegiate frame with corner accents, centered crest header, bordered bio ledger, compact academic table, qualitative remarks, and fee schedule.
  - Added `Editorial Scholar` (`scholar_v1`): modern Swiss editorial masthead with left accent bar, 4-metric KPI strip, subject performance table with proportional inline mastery progress bars (`palette.barFill`), and clean signatures/fees footer.
  - Both support 3-tier A4 density (6–18 subjects), `MOCK` mode, `KG` aggregate suppression, dual position flags, private school 3-slot fee schedule + arrears, Islamic RTL header, blank missing crest fallback, and strict `bw` monochrome.
- **Settings → Report Style visual upgrades (`src/components/settings/ReportTemplateSection.tsx`):**
  - Added pure-HTML/CSS `TemplateThumbnail` wireframe previews for all 7 templates (tinted dynamically by custom school colors or each template's defaults).
  - Upgraded presets grid to `sm:grid-cols-5` with dual-dot swatches (Primary + Accent).
  - Added a `Color` / `B&W` preview toggle inside `Report Header Preview` powered by `bannerBg`/`bannerText`.
- **Unit test coverage (`src/test/ReportTemplates.test.tsx`, `src/test/reportThemeAndFees.test.ts`):**
  - Added `HeritageTemplate` and `ScholarTemplate` to all parameterized template contracts, verified ink-saving `rgb(243, 244, 246)` B&W header surfaces, `ScholarTemplate` mastery bars & `MOCK` mode, and all 10 `SCHOOL_COLOR_PRESETS` + new `ReportPalette` tokens.

## Why

Before the November 29 launch, schools needed richer, print-calibrated report designs alongside `Original`, `Classic`, `Modern`, `Minimal`, and `Executive`, plus relief from heavy `#000000` solid banner toner blocks when switching Print Preview to Black & White. Upgrading Settings with miniature wireframe previews and a Color/B&W toggle lets administrators judge layout geometry and ink efficiency before opening Print Preview.

## What Was Verified

- `npm run lint` — passed (`eslint .`, exit `0`).
- `npx tsc -b` — passed (exit `0`).
- `npx vitest run --maxWorkers=2` — `59` test files passed, `558` tests passed (`0` failed/skipped).
- `npm run build` — production Vite + PWA build succeeded in `18.55s` (`60` precache entries).
- `npm run test:e2e` — `9/9` Playwright Chromium E2E tests passed (`44.4s`).

## What Could Not Be Verified

- Physical ink output on an actual laser/inkjet A4 printer and visual inspection inside iOS Safari Print / AirPrint sheet (not connected in this headless test environment; verified via DOM styling and automated headless Chromium).

## Summary for reviewer

- Added `Heritage Framed` (`heritage_v1`) and `Editorial Scholar` (`scholar_v1`) single-A4 templates in `src/templates/registry.ts`.
- Added ink-saving `bannerBg`, `bannerText`, `highlightBg`, `highlightText`, and `barFill` tokens to `src/utils/reportTheme.ts` so B&W banners use bordered `#f3f4f6`/`#e5e7eb` instead of solid `#000000`.
- Applied the ink-saving banner/highlight/arrears polish to `src/templates/ExecutiveTemplate.tsx`, keeping `bwPalette.primary === "#000000"` intact for borders/accents.
- Expanded `SCHOOL_COLOR_PRESETS` to 10 print-safe palettes (replacing `#ec4899` on Imperial Purple with `#d97706`).
- Upgraded `src/components/settings/ReportTemplateSection.tsx` with 7 wireframe thumbnails, dual-dot preset swatches, and a `Color`/`B&W` preview toggle.
- Verified with `lint`, `tsc -b`, Vitest (`59` files, `558` tests), `npm run build`, and Playwright (`9/9` E2E).
