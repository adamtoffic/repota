# Release Peak Polish Report (`polish/release-peak-a-plus`)

## What Changed

- **Privacy, Mobile Focus Trap & Live PIN Reactivity (`src/components/ConfirmModal.tsx`, `src/components/DashboardToolbar.tsx`, `src/components/settings/SecurityBackupSection.tsx`):**
  - Made `ConfirmModal` mask generic `title` headings by default (`data-record={recordTitle ? "true" : undefined}`) so dynamic caller titles never unmask PII in PostHog session replay unless explicitly opted in.
  - Wired `useDialogA11y` focus trapping, scroll locking, and `document.documentElement.dataset.mobileSheetOpen = "true"` onto `DashboardToolbar` when rendered as a `<768px` (`useMediaQuery("(max-width: 767px)")`) mobile bottom sheet, while preserving desktop dropdown behavior.
  - Subscribed `SecurityBackupSection` to `PIN_CONFIG_CHANGED_EVENT` and `storage` events — fixing a real bug discovered by E2E Test 1 where `SecurityBackupSection` stayed stale showing `"Enable PIN Lock"` right after completing `PinSetup` because `SettingsFormContext` memoizes its value without `showPinSetup`.
- **Bundle Splitting, JSDoc & Repo Hygiene (`vite.config.ts`, `src/utils/pdfPrint.ts`, `src/components/ui/index.ts`, `CHANGELOG.md`, `README.md`):**
  - Split `d3-*` and `victory-vendor` into a separate `"d3"` chunk (`63.17 kB`) from `"recharts"` (`377.41 kB`), eliminating all Vite `>400 kB` chunk-size warnings.
  - Added JSDoc on `resolvePdfCaptureScale` and `buildStageIgnoreElements` in `src/utils/pdfPrint.ts`.
  - Removed unused UI primitives (`Container.tsx`, `LoadingSpinner.tsx`, `Skeleton.tsx`) from disk and `src/components/ui/index.ts`, deleted stale `V1-PRODUCTION-READY.md`, and updated `CHANGELOG.md` and `README.md` for launch readiness.
- **Tests (`src/test/pinSecurity.test.tsx`, `src/test/ReleasePeakPolish.test.tsx`, `e2e/pin-print-offline.spec.ts`):**
  - Eliminated React `act(...)` warnings in `pinSecurity.test.tsx`'s `LockScreen` cooldown test.
  - Added `ReleasePeakPolish.test.tsx` (3 unit specs for `ConfirmModal`, `DashboardToolbar` mobile trap, and `SecurityBackupSection` live PIN updates).
  - Added `e2e/pin-print-offline.spec.ts` (3 Playwright E2E specs for PIN setup/lock/unlock, template + `B&W` Ink Mode + invalid `?id=`, and offline Service Worker reload).

## Why

- Close every remaining polish item identified during the pre-merge review (modal privacy defaults, mobile bottom-sheet focus trap, live PIN settings reactivity, chunk-size warnings, dead files, release docs, and end-to-end PIN/print/offline coverage).

## What Was Verified

- `npm run lint` — 0 errors, 0 warnings.
- `.\node_modules\.bin\tsc.cmd -b` — exited 0.
- `.\node_modules\.bin\vitest.cmd run --maxWorkers=1` — **66 / 66** test files passed, **611 / 611** tests passed (zero `LockScreen` `act(...)` warnings).
- `npm run build` — succeeded (`15.26s`, **0** chunk-size warnings, `60` precache entries / `2840.41 KiB`); verified `dist/sw.js` excludes `posthog-` chunks.
- `npm run test:e2e` — **12 / 12** Playwright Chromium tests passed (`54.0s`).

## What Could NOT Be Verified

- Physical hardware A4 printer output, a real iPhone Home Screen PWA session, and live Vercel HTTP response headers on the deployed preview host still require a quick manual check after deployment.
- Legacy `act(...)` warnings inside `src/test/DataBackup.test.tsx` were intentionally left untouched to avoid refactoring 28 existing passing tests.

## Summary for reviewer

- Fixed a real UI reactivity bug caught by the new E2E suite: `SecurityBackupSection` now listens to `PIN_CONFIG_CHANGED_EVENT` and updates immediately when PIN Setup completes.
- Masked `ConfirmModal` titles by default in session replay, added `useDialogA11y` focus/scroll trapping to `DashboardToolbar`'s mobile bottom sheet, and documented `pdfPrint` helpers.
- Split `d3`/`victory-vendor` (`63.17 kB`) from `recharts` (`377.41 kB`) for zero Vite chunk warnings, removed unused UI primitives + `V1-PRODUCTION-READY.md`, and updated `CHANGELOG.md` & `README.md`.
- Verified cleanly with `lint`, `tsc -b`, 66/66 Vitest files (611 tests), build + SW precache check, and 12/12 Playwright E2E tests.
