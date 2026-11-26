# Release Hardening Wave 3 — Print Engine, PDF Memory & Cross-Template Parity

## What Changed

- **PDF Export Memory & iOS PWA Download (`src/utils/pdfPrint.ts`, `src/hooks/useToast.ts`, `src/hooks/usePdfShareFlow.ts`, `src/utils/iosInteraction.ts`):**
  - Exported and wired `buildStageIgnoreElements(stage)` in `html2canvas` calls to ignore `#root` and sibling `body` elements ($O(N)$ capture instead of $O(N^2)$ DOM cloning) alongside dynamic page-count scaling (`resolvePdfCaptureScale`: `1.75`/`1.5`/`1.25` on iOS, `2`/`1.5` on desktop) and mid-capture `AbortSignal` checks.
  - Replaced standalone iOS PWA `blob:` anchor-navigation trap in `downloadPdfFile` with `window.open(..., "_blank", "noopener,noreferrer")` and 60s `revokeObjectURL` deferral.
  - Updated `shouldUseIOSPdfPrintFallback()` so standalone iOS PWAs whose user-agent omits `Version/XX` (`safariMajor === null`) safely trigger PDF fallback, added `visibilitychange` (`document.hidden`) watchdog cancellation, `markPrintStarted()` protection during Share Sheet generation, 15s toast action duration, and persistent fallback notice banner state (`showFallbackNotice`, `dismissFallbackNotice`, `openPdfFallback`).
- **A4 Print CSS & `/print` Page (`src/index.css`, `src/pages/PrintPreview.tsx`):**
  - Added `.font-arabic` utility, scoped screen `.report-page` / `.watermark` rules inside `@layer components` without overriding template padding, removed duplicate inline `<style>` injection and conflicting serif overrides from `PrintPreview`, and hardened `@media print` with subpixel-safe `296.5mm` page height and `html, body` height/overflow resets.
  - Expanded `PrintPreview` `contentKey`, invoked `markPrintStarted()` in `beforeprint`, added `"Student Report Not Found"` recovery UI for stale/invalid `?id=` links, and wired persistent iOS print fallback recovery banner.
- **Cross-Template Parity (`Original`, `Classic`, `Modern`, `Minimal`, `Executive`, `Heritage`, `Scholar`, `src/utils/reportTheme.ts`, `src/utils/privateSchoolFees.ts`, `src/utils/templatePreviewData.ts`, `src/components/settings/ReportTemplateSection.tsx`):**
  - Added `relative` page containment and moved `density.padding` from `<tr>` to `<td>` cells in `OriginalTemplate`.
  - Added 3-tier A4 vertical density scaling to `ClassicTemplate`, `ModernTemplate`, and `MinimalTemplate`.
  - Standardized all 7 templates to `print:h-[296.5mm]`, local calendar `formatReportDate` (no UTC shift or `"Invalid Date"`), `attendancePresent ?? "-"`, non-fabricated blank `teacherRemark`, monochrome B&W arrears, Islamic Bismillah support, `fee.cycle` + `DEFAULT_PAYMENT_NOTE` + `className` fallback order, non-duplicated signature lines, and fixed A4 columns without `sm:grid-cols-` responsive overrides on `Heritage`/`Scholar`.
  - Updated `getContrastTextColor` WCAG luminance crossover to `0.179`, conditionalized `text-white` in `ModernTemplate`, gated `KG` header class positions via `resolvePositionVisibility`, and passed `buildTemplatePreviewStudent(settings)` into `ScaledTemplatePreview`.
- **Tests (`src/test/reportThemeAndFees.test.ts`, `src/test/ReleaseWave3PrintAndTemplates.test.tsx`):**
  - Added 19 Wave 3 regression specs covering PDF scale/stage isolation, iOS PWA download & watchdog, A4 density, cross-template parity, contrast, Islamic headers, preview scaling, and invalid `?id=` handling.

## Why

- Prevent multi-page PDF capture OOM/freezes and standalone `blob:` navigation traps on iOS Safari PWAs.
- Eliminate trailing blank A4 pages, watermark bleed across pages, clipped rows with >12 subjects, and inconsistent school/fee/remark rendering across the 7 report templates.

## What Was Verified

- `npm run lint` — 0 errors, 0 warnings.
- `.\node_modules\.bin\tsc.cmd -b` — exited 0.
- `.\node_modules\.bin\vitest.cmd run --maxWorkers=1` — 64/64 test files passed, 600/600 tests passed.
- `npm run build` — succeeded (`precache 60 entries`, `dist/sw.js` generated).
- `npm run test:e2e` — 9/9 Playwright Chromium tests passed (`repota-core.spec.ts` and `responsive-modals-and-theme.spec.ts`).

## What Could NOT Be Verified

- Physical hardware A4 printer margins and Apple iOS 27 standalone Share Sheet / AirPrint UI (verified via unit tests, CSS print rules, and desktop Chromium Playwright E2E instead).

## Summary for reviewer

- Hardened `pdfPrint.ts` (`ignoreElements`, dynamic scale cap, `AbortSignal`, iOS PWA `window.open` viewer) and `usePdfShareFlow` (`safariMajor === null` standalone detection, `visibilitychange` watchdog, fallback banner).
- Fixed `@media print` `296.5mm` height resets, removed duplicate `<style>` injection in `PrintPreview.tsx`, and added `"Student Report Not Found"` recovery UI.
- Brought all 7 report templates to A4 density, B&W arrears, local date (`formatReportDate`), `attendancePresent ?? "-"`, blank remark, Bismillah, fee cycle, contrast (`0.179`), and signature-line parity.
- Verified with `lint`, `tsc -b`, 64/64 Vitest files (600 tests), production PWA build, and 9/9 Playwright E2E tests.
