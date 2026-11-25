# Bundle Split, ES2020 Build & Playwright E2E Hardening Report

**Branch:** `feat/navigation-shell` (2 branches merged `--no-ff` atop `6526ef7`)  
**Merge sequence:**
1. `e8193a7` / `f38f1a2` — `perf: split heavy routes/modals/posthog, set es2020 target, and deduplicate html2canvas` (`perf/bundle-split-and-es2020`)
2. `30c7de1` / `14ac5a9` — `test: add Playwright Chromium E2E suite and golden GES grading/CSV fuzz tests` (`test/playwright-e2e-and-golden-grading`)

---

## 1. What Changed

### Branch 1 — Bundle Splitting, Deferred Analytics & `es2020` Build (`e8193a7` / `f38f1a2`)
- **`src/utils/lazyWithRetry.ts` (new) & `src/router.tsx`:** Extracted `lazyWithRetry` cleanly into its own module (re-exported from `src/router.tsx`) to avoid circular imports when splitting Dashboard modals and recovery UI; moved `SbaPage`, `SettingsHub`, and `SettingsFormLayout` (`src/components/settings/SettingsFormLayout.tsx`, new) behind `lazyWithRetry`, keeping `/` (`Dashboard`) eager.
- **`src/utils/analytics.ts` & `src/main.tsx`:** Removed top-level static `import posthog from "posthog-js"`. Added `initPostHogAnalytics()` (skips loading `posthog-js` completely off production hosts unless `forceInTest`), `registerPostHogClient()`, and a bounded 50-event queue for early events captured before lazy PostHog initialization completes; deferred `main.tsx` analytics bootstrap via `requestIdleCallback` / `1500ms` timeout outside tests. Scoped `registerPostHogClient(...)` cleanly to analytics-asserting test specs (`analytics.test.ts`, `reportAnalytics.test.ts`, `ExistingEventsAnalytics.test.tsx`, `FeatureAdoptionAnalytics.test.tsx`, `FunnelAndReliabilityAnalytics.test.tsx`, `PrintPreviewAnalytics.test.tsx`, `SbaWorkflow.test.tsx`, `ScoreEntryUX.test.tsx`) and awaited dynamic `main` init in `PostHogInitialization.test.ts` and `PostHogConfig.test.tsx`.
- **`src/pages/Dashboard.tsx` & `src/components/DataGate.tsx`:** Converted `QuickGradebook`, `ScoreEntryModal`, `BulkImportModal`, `ScoreImportModal`, `BulkAttendanceModal`, `BulkPromotionModal`, and recovery `DataBackup` to `lazyWithRetry` + `<Suspense>`, conditionally mounting modals only when open and preloading `SbaPage` alongside `Analytics` when idle outside test mode.
- **`src/context/SchoolContext.tsx` & `src/context/SchoolContextDefinition.ts`:** Replaced static imports of `applyAutoRemarksToStudents` (`remarksBatch.ts`, pulling in 1,838-line `src/constants/remarks.ts`) and `createDemoStudents` (`demoData.ts`) with dynamic `import(...)` inside `autoGenerateRemarks` and `loadDemoData`.
- **`vite.config.ts`:** Bumped `build.target` from `"es2015"` to `"es2020"`, aliased `html2canvas` -> `html2canvas-pro` so `jsPDF` reuses `html2canvas-pro` without emitting a duplicate `html2canvas.esm` chunk, and added a `"posthog"` `manualChunks` entry.

### Branch 2 — Real-Browser Playwright E2E & Golden/Fuzz Verification (`30c7de1` / `14ac5a9`)
- **`package.json`, `package-lock.json`, `.gitignore`, `eslint.config.js`, `vite.config.ts`, `playwright.config.ts`:** Added `@playwright/test` (`devDependency`) + Chromium, added `"test:e2e": "playwright test"`, excluded `e2e/**` from Vitest (`vite.config.ts`), ignored `playwright-report/` / `test-results/`, configured ESLint globals/overrides for Playwright specs, and targeted `npx vite preview --host 127.0.0.1 --port 4173 --strictPort`.
- **`e2e/repota-core.spec.ts` (6 real Chromium flows):**
  1. Cold start -> add student -> save class & lossless odd raw exam score (`73`) -> wait for save -> full browser reload -> verify real IndexedDB persistence.
  2. Mobile viewport (`390x844`) `/sba` markbook -> confirm mobile card input mounts cleanly with `0` desktop table inputs -> enter score -> persist across reload.
  3. Edit student -> navigate & trigger immediate `.repota` export -> delete all students -> re-import downloaded `.repota` -> verify full restoration across reload.
  4. Two-tab `BroadcastChannel` sync in a shared browser context without reloading tab 2.
  5. `/print` route renders report cards cleanly with `0` `AppShell` sidebar/bottom-nav chrome.
  6. Lazy `/analytics` route loads cleanly and switches across Overview, Subjects, Demographics, and AI Insights tabs.
- **`src/test/GoldenGradingAndCsvFuzz.test.ts` (new, 3 tests):** Verified golden grading/aggregate/age/tie-position/backup round-trips across `KG`, `PRIMARY`, `JHS`, `SHS`, `MOCK`, and `PRIVATE`, pending vs failing isolation, and messy CSV/TSV/semicolon paste fuzz inputs (`UTF-8 BOM`, mixed `CRLF`/`LF`, quoted commas, missing/non-numeric/`NaN`/out-of-range scores).

---

## 2. Why
- **Performance B+ -> A/A+:** Eliminated `posthog-js` (`282.44 kB`), `remarkGenerator`/`remarks.ts` (`97.02 kB`), secondary routes (`SbaPage`, `SettingsHub`, `SettingsFormLayout`), closed Dashboard modals, and duplicate `html2canvas` (`201.36 kB` eliminated) from the initial cold-start entry chunk—cutting `dist/assets/index-*.js` from **1,076.73 kB** (`306.00 kB` gzip) down to **374.94 kB** (`110.17 kB` gzip, a 65.2% reduction).
- **Persistence & Domain A- -> A:** Replaced mock-only confidence on critical IndexedDB/cross-tab/export/viewport paths with real Chromium E2E tests running against the compiled production preview bundle, plus multi-mode golden grading and adversarial CSV fuzz coverage.

---

## 3. What Was Verified
- **`npm run lint`:** Passed (`exit 0`, zero warnings/errors).
- **`npx tsc -b`:** Passed (`exit 0`).
- **`npx vitest run --maxWorkers=2`:** Passed — **55 test files passed (55), 515 tests passed (515)**, duration `70.74s`.
- **`npm run build`:** Passed (`exit 0`, `2869` modules transformed in `16.57s`, PWA `generateSW` precached `55` entries / `3166.76 KiB`, down from `3393.69 KiB`):
  - `dist/assets/index-CAZTTHct.js`: `374.94 kB` (`110.17 kB` gzip) — under the `400 kB` limit (down from `1,076.73 kB` / `306.00 kB` gzip).
  - `dist/assets/posthog-DTxG0DZb.js`: `282.44 kB` (`94.23 kB` gzip, lazy-loaded in prod only).
  - Duplicate `html2canvas.esm` chunk eliminated (reuses `html2canvas-pro.esm-DjEJzFqU.js`, `283.26 kB`).
  - Only chunk >400 kB remaining is `dist/assets/recharts-7ytfmgPG.js` (`440.42 kB` / `124.63 kB` gzip), which is lazy-loaded on `/analytics`.
- **`npm run test:e2e` (Chromium against `vite preview`):** Passed — **6/6 Playwright E2E specs passed (`23.2s`)** with zero uncaught `pageerror` events.

---

## 4. What Could NOT Be Verified
- Physical mobile hardware testing (Android budget Chrome CPU/RAM timing, physical iOS Safari blob download sheet, and native print dialog output) and live Vercel HTTPS Service Worker updates (`repota.app`) cannot run in local headless Chromium (`http://127.0.0.1:4173`).

---

## Summary for reviewer
- Split heavy routes (`SbaPage`, `SettingsHub`, `SettingsFormLayout`), Dashboard modals (`QuickGradebook`, `ScoreEntryModal`, `Bulk*`, `ScoreImportModal`), `remarksBatch`/`demoData`, and `posthog-js` out of the critical entry bundle, aliased `html2canvas` -> `html2canvas-pro`, and bumped build target to `es2020`.
- Entry chunk shrank by 65.2% from `1,076.73 kB` (`306.00 kB` gzip) to `374.94 kB` (`110.17 kB` gzip), while total PWA precache dropped from `3393.69 KiB` to `3166.76 KiB`.
- Added `@playwright/test` (`e2e/repota-core.spec.ts`) covering 6 real-browser Chromium flows against `vite preview` (real IndexedDB reload, mobile SBA viewport, immediate `.repota` export/reset/re-import, two-tab `BroadcastChannel` sync, `/print` chrome isolation, lazy `/analytics` tabs).
- Added `src/test/GoldenGradingAndCsvFuzz.test.ts` validating `KG`/`PRIMARY`/`JHS`/`SHS`/`MOCK`/`PRIVATE` grading round-trips and messy CSV/paste sanitization.
- All automated gates passed cleanly (`npm run lint`, `npx tsc -b`, 55/55 Vitest files / 515 tests, `npm run build`, and 6/6 Playwright Chromium E2E specs).
