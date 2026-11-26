# Branch 6 Task Report: Bundle & Performance Trim (`perf/bundle-trim`)

## What Changed
- **Removed Idle `Analytics` / `SbaPage` Preload (`src/components/DataGate.tsx`):**
  - Removed the post-load `useEffect` that eagerly downloaded `../pages/Analytics` (pulling `recharts` ~440 kB) and `../pages/SbaPage` on every Home screen load. TanStack Router (`defaultPreload: "intent"` in [src/router.tsx](../../src/router.tsx)) already preloads routes smoothly on hover/touch intent without spending cold-boot bandwidth/CPU.
- **Code-Split Rarely Used Modals (`src/App.tsx`, `src/context/SettingsFormContext.tsx`, `src/pages/Dashboard.tsx`):**
  - Lazy-loaded [PinRecovery.tsx](../../src/components/PinRecovery.tsx) in both [src/App.tsx](../../src/App.tsx) and [SettingsFormContext.tsx](../../src/context/SettingsFormContext.tsx) behind `<Suspense fallback={null}>`, keeping [LockScreen.tsx](../../src/components/LockScreen.tsx) eager for instant PIN pad rendering.
  - Lazy-loaded [PinSetup.tsx](../../src/components/PinSetup.tsx) inside [SettingsFormContext.tsx](../../src/context/SettingsFormContext.tsx) behind `<Suspense fallback={null}>`.
  - Lazy-loaded [WelcomeTour.tsx](../../src/components/WelcomeTour.tsx) in [Dashboard.tsx](../../src/pages/Dashboard.tsx) and gated its mount on `localStorage.getItem("repota_welcome_tour_v2") !== "true"` so returning teachers never fetch or parse tour UI.
- **Stubbed Unused Optional `jsPDF.html()` Dependencies (`src/utils/emptyModule.ts`, `vite.config.ts`):**
  - Added [src/utils/emptyModule.ts](../../src/utils/emptyModule.ts) and aliased `canvg` and `dompurify` in [vite.config.ts](../../vite.config.ts) alongside the existing `html2canvas` -> `html2canvas-pro` alias, since [pdfPrint.ts](../../src/utils/pdfPrint.ts) renders A4 PDFs exclusively via `html2canvas-pro` + `pdf.addImage()`.

## Why
Eliminate unused `jsPDF` chunks from `dist/` and the offline service worker precache, prevent idle mobile data/CPU downloads of `recharts` on cold boot, and keep cold-start entry JS lean while preserving every backup schema, IDB store, and test contract.

## Before vs. After Build Metrics
- **Main entry chunk (`dist/assets/index-*.js`):** `369.17 kB` (`108.01 kB` gzip) -> **`355.04 kB` (`105.17 kB` gzip)**
- **`SettingsFormContext` chunk:** `28.63 kB` (`7.17 kB` gzip) -> **`9.23 kB` (`3.66 kB` gzip)** (`PinSetup` `20.22 kB` & `PinRecovery` `10.14 kB` split cleanly)
- **Eliminated unused `jsPDF.html()` chunks:** `index.es-*.js` (`canvg`, `159.03 kB` / `53.10 kB` gzip) & `purify.es-*.js` (`dompurify`, `28.74 kB` / `11.02 kB` gzip) removed completely
- **Workbox SW precache:** `3244.52 KiB` (`57 entries`) -> **`3062.13 KiB` (`60 entries`, `-182.39 KiB`)**

## What Was Verified
- `npm run lint` (`eslint .`) — passed (exit `0`).
- `npx tsc -b` — passed (exit `0`).
- `npx vitest run --maxWorkers=2` — **`59` test files passed (`59`), `540` tests passed (`540`)** (includes `pdfPrint` dark/light tests and PIN recovery/auto-lock tests).
- `npm run build` — passed (`23.66s`).
- `npm run test:e2e` (`playwright test`, real Chromium) — **`9` passed (`54.4s`)**.

## What Could Not Be Verified
- Cold-boot TTI and cellular data transfer measurements on low-end Android hardware or throttled 3G networks in Lighthouse mobile emulation.

## Summary for Reviewer
- Removed idle `Analytics` (`recharts`) / `SbaPage` preloading from `DataGate`, relying on TanStack Router's `defaultPreload: "intent"`.
- Lazy-loaded `PinRecovery`, `PinSetup`, and `WelcomeTour` (skipped for returning teachers), trimming `index-*.js` to `355.04 kB` (`105.17 kB` gzip) and `SettingsFormContext` from `28.63 kB` to `9.23 kB`.
- Stubbed unused optional `canvg` and `dompurify` dependencies via `src/utils/emptyModule.ts`, eliminating `187.77 kB` raw (`64.12 kB` gzip) of dead JS and cutting Workbox precache by `182.39 KiB` (`3062.13 KiB` total).
- Verified cleanly with `npm run lint`, `npx tsc -b`, `npx vitest run --maxWorkers=2` (59 files / 540 tests), `npm run build`, and Playwright E2E (9/9 passing).
