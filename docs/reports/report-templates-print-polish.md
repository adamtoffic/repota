# Branch 7: Report Templates & Print Polish (`feat/report-templates-print-polish`)

## What Changed

- **Ink-smart monochrome & print-calibrated color presets (`src/utils/reportTheme.ts`):**
  - Expanded `SCHOOL_COLOR_PRESETS` from 8 to 10 uncoated-A4-safe academic palettes (`royal-navy`, `oxford-indigo`, `forest-emerald`, `cathedral-pine`, `deep-teal`, `burgundy-maroon`, `imperial-purple` with `#d97706` gold accent instead of `#ec4899`, `heritage-gold` Cocoa & Gold, `crimson-red`, and `slate-charcoal` Ink-Saver Slate).
  - Extended `ReportPalette` and `getReportPalette()` with `bannerBg`, `bannerText`, `highlightBg`, `highlightText`, `tableHeaderBg`, `tableHeaderText`, and `barFill`. In `bw` mode, full-width header bands stay light (`#f3f4f6` + black rules) to avoid full-width toner slabs, table headers use bold `#e5e7eb`/`#000000` shading, while compact title pills, `Position`/`Aggregate` boxes, and mastery bars use crisp dark `#111827`/`#ffffff` ink matching `Repota Original`'s strong B&W contrast.
- **Crisp B&W ink punch (`src/templates/ExecutiveTemplate.tsx`, `src/templates/HeritageTemplate.tsx`, `src/templates/ScholarTemplate.tsx`):**
  - Updated `ExecutiveTemplate` header band (`border-t-4 border-b-2 border-black`), `HeritageTemplate` title pill (`highlightBg`/`highlightText`) + table header (`tableHeaderBg`/`tableHeaderText`) + `border-2 border-black` B&W ledger/table borders, and `ScholarTemplate` masthead badge (`highlightBg`/`highlightText`) + `tableHeaderBg`/`tableHeaderText` + `border-2 border-black` frame + higher-contrast mastery track (`bg-gray-300` / `#111827`).
- **Two new single-A4 print-grade templates & registry (`src/templates/HeritageTemplate.tsx`, `src/templates/ScholarTemplate.tsx`, `src/templates/registry.ts`):**
  - Added `Heritage Framed` (`heritage_v1`): double-rule institutional collegiate frame with corner accents, centered crest header, bordered bio ledger, compact academic table, qualitative remarks, and fee schedule.
  - Added `Editorial Scholar` (`scholar_v1`): modern Swiss editorial masthead with left accent spine, KPI strip, subject performance table with proportional mastery progress bars, and clean signatures/fees footer.
- **Real live scaled A4 previews in Settings → Report Style (`src/utils/templatePreviewData.ts`, `src/components/settings/ReportTemplateSection.tsx`):**
  - Replaced synthetic wireframe thumbnails with `ScaledTemplatePreview`, rendering all 7 actual template components inside `aspect-[210/297]` responsive `ResizeObserver`-scaled containers (`794px` A4 canvas) using synthetic `TEMPLATE_PREVIEW_STUDENT` data and `buildTemplatePreviewSettings(formData)`.
  - Added a `Color` / `B&W` preview toggle in the `Report Card Design` header synchronized with `Report Header Preview`, plus `sm:grid-cols-5` dual-dot preset swatches.
- **Unit test coverage (`src/test/ReportTemplates.test.tsx`, `src/test/reportThemeAndFees.test.ts`):**
  - Added `HeritageTemplate` and `ScholarTemplate` to all parameterized contracts, verified balanced light B&W headers + `#111827` dark ink badges, `ScholarTemplate` mastery bars & `MOCK` mode, all 10 `SCHOOL_COLOR_PRESETS`, and all new `ReportPalette` tokens.

## Why

Before the November 29 launch, schools needed richer, print-calibrated report designs plus a Settings selector whose template cards show the true A4 layout (instead of approximate wireframes) and whose Black & White mode balances light-toner full-width bands against strong `#111827` badges and black borders like `Repota Original`.

## What Was Verified

- `npm run lint` — passed (`eslint .`, exit `0`).
- `npx tsc -b` — passed (exit `0`).
- `npx vitest run --maxWorkers=2` — `59` test files passed, `558` tests passed (`0` failed/skipped).
- `npm run build` — production Vite + PWA build succeeded in `33.96s` (`60` precache entries).
- `npm run test:e2e` — `9/9` Playwright Chromium E2E tests passed (`1.0m`).

## What Could Not Be Verified

- Physical ink output on an actual laser/inkjet A4 printer and visual inspection inside iOS Safari Print / AirPrint sheet (not connected in this headless test environment; verified via DOM styling and automated headless Chromium).

## Summary for reviewer

- Added `Heritage Framed` (`heritage_v1`) and `Editorial Scholar` (`scholar_v1`) single-A4 templates in `src/templates/registry.ts`.
- Updated `src/utils/reportTheme.ts` with `bannerBg`/`tableHeaderBg`/`highlightBg`/`barFill` tokens so wide B&W banners save toner (`#f3f4f6`/`#e5e7eb`) while compact pills/KPI boxes/bars stay sharp `#111827` black ink.
- Replaced wireframe cards in `src/components/settings/ReportTemplateSection.tsx` with real `ResizeObserver`-scaled A4 renders (`ScaledTemplatePreview` + `src/utils/templatePreviewData.ts`) and a shared `Color`/`B&W` preview toggle.
- Expanded `SCHOOL_COLOR_PRESETS` to 10 print-safe palettes with dual-dot swatches and upgraded B&W framing in `ExecutiveTemplate`, `HeritageTemplate`, and `ScholarTemplate`.
- Verified with `lint`, `tsc -b`, Vitest (`59` files, `558` tests), `npm run build`, and Playwright (`9/9` E2E).
