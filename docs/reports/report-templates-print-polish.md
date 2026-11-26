# Branch 7: Report Templates & Print Polish (`feat/report-templates-print-polish`)

## What Changed

- **Ink-smart monochrome & print-calibrated color presets (`src/utils/reportTheme.ts`):**
  - Expanded `SCHOOL_COLOR_PRESETS` from 8 to 10 uncoated-A4-safe academic palettes (`royal-navy`, `oxford-indigo`, `forest-emerald`, `cathedral-pine`, `deep-teal`, `burgundy-maroon`, `imperial-purple` with `#d97706` gold accent instead of `#ec4899`, `heritage-gold` Cocoa & Gold, `crimson-red`, and `slate-charcoal` Ink-Saver Slate).
  - Extended `ReportPalette` and `getReportPalette()` with `bannerBg`, `bannerText`, `highlightBg`, `highlightText`, `tableHeaderBg`, `tableHeaderText`, and `barFill` so wide header bands stay ink-saving (`#f3f4f6` + black rules) in `bw` mode, table headers stay legible (`#e5e7eb`/`#000000`), and compact pills, `Position`/`Aggregate` boxes, and mastery bars print with crisp `#111827`/`#ffffff` ink matching `Repota Original`.
- **Crisp B&W ink punch (`src/templates/ExecutiveTemplate.tsx`, `src/templates/HeritageTemplate.tsx`, `src/templates/ScholarTemplate.tsx`):**
  - Updated `ExecutiveTemplate`, `HeritageTemplate`, and `ScholarTemplate` to pair light B&W header bands with sharp `#111827` pills/highlight boxes, `border-2 border-black` tables/frames, and high-contrast `bg-gray-300`/`#111827` mastery bars.
- **Two new single-A4 print-grade templates & registry (`src/templates/HeritageTemplate.tsx`, `src/templates/ScholarTemplate.tsx`, `src/templates/registry.ts`):**
  - Added `Heritage Framed` (`heritage_v1`): double-rule collegiate frame with corner accents, centered crest, bordered bio ledger, compact table, qualitative remarks, and fee schedule.
  - Added `Editorial Scholar` (`scholar_v1`): editorial masthead with left accent spine, KPI strip, proportional mastery progress bars, and clean signatures/fees footer.
- **Live scaled A4 previews & mobile snap carousel (`src/utils/templatePreviewData.ts`, `src/components/settings/ReportTemplateSection.tsx`):**
  - Replaced approximate wireframe cards with `ScaledTemplatePreview` rendering all 7 real template components at `794px` A4 scaled dynamically via `ResizeObserver` and driven by `useDeferredValue` so typing hex colors and toggling `Color` / `B&W` stay responsive.
  - Converted `< 640px` mobile layout from a tall vertical stack into a horizontal snap carousel (`w-[205px] shrink-0 snap-start`), paired with an `Active: <Template>` + `Swipe • 7 layouts` status bar and horizontal auto-scroll to the active card on mount, while preserving `sm:grid-cols-2 lg:grid-cols-3` on tablet/desktop.
- **Unit test coverage (`src/test/ReportTemplates.test.tsx`, `src/test/reportThemeAndFees.test.ts`, `src/test/ResponsiveAndUxBugs.test.tsx`):**
  - Covered all 7 templates, B&W toner-saving vs crisp `#111827` tokens, 10 `SCHOOL_COLOR_PRESETS`, `ScholarTemplate` mastery bars + `MOCK` mode, and gave `/settings/templates` lazy route hydration `{ timeout: 5000 }` in `ResponsiveAndUxBugs.test.tsx`.

## Why

Before the November 29 launch, schools needed richer print-calibrated report designs, balanced Black & White contrast without full-width toner slabs, accurate Settings cards showing real scaled A4 templates, and a compact swipeable mobile carousel instead of a ~4,000px vertical wall of A4 thumbnails.

## What Was Verified

- `npm run lint` — passed (`eslint .`, exit `0`).
- `npx tsc -b` — passed (exit `0`).
- `npx vitest run --maxWorkers=2` — `59` test files passed, `558` tests passed (`0` failed/skipped).
- `npm run build` — production Vite + PWA build succeeded in `32.46s` (`60` precache entries).
- `npm run test:e2e` — `9/9` Playwright Chromium E2E tests passed (`58.7s`), confirming zero horizontal document overflow across Desktop and Mobile (`390x844`).

## What Could Not Be Verified

- Physical ink output on an actual laser/inkjet A4 printer and interactive swipe feel on a physical iPhone/iOS AirPrint sheet (not connected in this headless test environment; verified via DOM styling and automated headless Chromium).

## Summary for reviewer

- Added `Heritage Framed` (`heritage_v1`) and `Editorial Scholar` (`scholar_v1`) single-A4 templates in `src/templates/registry.ts`.
- Updated `src/utils/reportTheme.ts` and banner templates with `bannerBg`/`tableHeaderBg`/`highlightBg`/`barFill` so wide B&W banners save toner while compact badges/bars stay crisp `#111827`.
- Replaced wireframe cards in `src/components/settings/ReportTemplateSection.tsx` with `useDeferredValue`-driven live scaled A4 previews (`ScaledTemplatePreview` + `src/utils/templatePreviewData.ts`).
- Upgraded mobile (`< 640px`) template cards to a horizontal snap carousel (`205px` cards, active indicator, horizontal auto-scroll) while preserving the desktop/tablet grid.
- Expanded `SCHOOL_COLOR_PRESETS` to 10 print-safe palettes with dual-dot swatches and a shared `Color`/`B&W` preview toggle.
- Verified with `lint`, `tsc -b`, Vitest (`59` files, `558` tests), `npm run build`, and Playwright (`9/9` E2E).
