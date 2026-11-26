# Release Preparation Report — Repota v2.0.0

**Branch:** `chore/release-2.0.0-prep` -> merged `--no-ff` into `feat/navigation-shell`  
**Target Release:** `v2.0.0` (`2026-11-29`)  
**Compatibility:** Preserves `v1.0.0` storage keys (`ges_v1_students`, `ges_v1_settings`), IndexedDB (`repota-storage` v2 with `idb-blob://`), JSON backups, and encrypted `.repota` archives with zero data loss.

---

## 1. What Changed

1. **Non-breaking Dependency & Security Updates (`package-lock.json`, `src/components/StudentList.tsx`, `src/test/NavigationShell.test.tsx`)**
   - Ran `npm update` and `npm audit fix` (without `--force`), keeping all major toolchain baselines intact (Vite `7.3.8`, React `19.2.x`, TypeScript `~5.9.3`, ESLint `9.x`, Vitest `4.1.12`, `vite-plugin-pwa` `1.x`, `happy-dom` `20.14.6`).
   - Eliminated all 3 production/runtime audit advisories (`zod`, `seroval` via `@tanstack/react-router`, and `dompurify`). `npm audit --omit=dev` now reports `found 0 vulnerabilities`.
   - Fixed a post-update `@tanstack/react-virtual@3.14.28` (`@tanstack/virtual-core@3.19.13`) regression where `defaultObserveElementRect` immediately reported Happy-DOM's `0x0` bounding rect and overwrote `initialRect` on the desktop table `rowVirtualizer` (causing `<tbody />` to render 0 rows in headless tests and hidden breakpoints). Generalized `observeMobileElementRect` into `createObserveElementRect` in `src/components/StudentList.tsx` and applied `observeDesktopElementRect` (`{ width: 960, height: 600 }`) to `rowVirtualizer`.
   - Scoped card assertions in `src/test/NavigationShell.test.tsx` (`filters dashboard students directly from warning cards and deep-links missing photo to Details tab`) to `within(getMobileList())` now that desktop virtualized rows also render consistently alongside mobile cards in Happy-DOM.

2. **Version Bump & Single-Source Build Injection (`package.json`, `package-lock.json`, `vite.config.ts`, `src/vite-env.d.ts`, `src/components/Footer.tsx`)**
   - Bumped `package.json` and `package-lock.json` from `1.0.0` to `2.0.0`.
   - Read `version` from `package.json` in `vite.config.ts` and injected `__APP_VERSION__` via `define` (typed in `src/vite-env.d.ts`), replacing hardcoded `v1.0.0` in `src/components/Footer.tsx` with `v{__APP_VERSION__}`.

3. **Changelog & Version-Sync Verification (`CHANGELOG.md`, `src/test/ReleasePeakPolish.test.tsx`)**
   - Promoted `## [Unreleased]` in `CHANGELOG.md` to `## [2.0.0] - 2026-11-29` with an explicit `### Compatibility` note documenting automatic zero-data-loss migration from `v1.0.0` storage and backups, plus updated tag/compare links (`v1.0.0...v2.0.0`, `v2.0.0...HEAD`).
   - Added a `Footer version sync` unit test in `src/test/ReleasePeakPolish.test.tsx` asserting `<Footer />` renders `v2.0.0`.

4. **Documentation Cleanup (`docs/archive/`)**
   - Archived 10 historical one-off analysis documents from `docs/` into `docs/archive/` (`ANDROID-DATA-PROTECTION.md`, `DRY-SOLID-REFACTORING.md`, `IOS-PRINT-FIX.md`, `PR-data-safety.md`, `PRIVATE-SCHOOL-IMPLEMENTATION.md`, `PWA-AND-UI-POLISH-ANALYSIS.md`, `SESSION-SUMMARY.md`, `UI-UX-ANALYSIS.md`, `schoolcontext-analysis.md`, `settings-analysis.md`) while keeping living docs (`AGENTS.md`, `analytics-events.md`, `architecture.md`, `codebase-inventory.md`, `ground-truth.md`, `jsdoc-conventions.md`) and `docs/reports/` intact.

---

## 2. Why

- Resolve runtime security advisories (`npm audit --omit=dev` -> `0 vulnerabilities`) without taking risky major toolchain bumps (Vite 8, TypeScript 7, ESLint 10, `lucide-react` 1.x) immediately before launch.
- Eliminate drift between `package.json` version metadata and the rendered UI footer (`v2.0.0`).
- Separate completed milestone audits into `docs/archive/` so contributors and reviewers see only living documentation and structured wave/release reports at `docs/` root.

---

## 3. What Was Verified

All checks were run after the final code/test/config edits:

- `npm run lint` -> passed (`0` errors).
- `.\node_modules\.bin\tsc.cmd -b` -> passed (exit `0`).
- `.\node_modules\.bin\vitest.cmd run --maxWorkers=1` -> `66` passed (`66`), `612` tests passed (`612`) in `255.79s` (note: an earlier `--maxWorkers=2` run saw 1 worker-contention flake in `SbaWorkflow.test.tsx:721`, which passed both individually (`11/11`) and inside the full `--maxWorkers=1` run).
- `npm run build` (`vite v7.3.8`) -> built in `31.19s` (`2711` modules transformed), `PWA v1.3.0`, `60` precache entries (`2957.32 KiB`); `recharts-B7QUKAab.js` emitted at `439.94 kB` (`120.13 kB` gzip, above the `400 kB` warning limit).
- `dist/sw.js` check -> verified `posthog-` chunks are excluded from Workbox precache.
- `npm run test:e2e` -> `12 passed (1.2m)` across all Chromium Playwright suites (`pin-print-offline.spec.ts`, `repota-core.spec.ts`, `responsive-modals-and-theme.spec.ts`).
- `npm audit --omit=dev` -> `found 0 vulnerabilities`. Full `npm audit` reports `5 vulnerabilities (4 moderate, 1 high)` solely inside dev tooling (`glob`/`minimatch` via `vite-plugin-pwa`/`workbox-build`, and `happy-dom`), which require breaking `--force` major changes intentionally deferred post-v2.0.0.

---

## 4. What Could NOT Be Verified

- Physical iOS (Safari 27+ standalone PWA Share Sheet & PDF fallback) and physical Android WebView/Chrome print/file-picker hardware testing.
- Live Vercel production deployment headers (`vercel.json` CSP/security headers) and PostHog production host gating after merge to `main`.
- GitHub `v2.0.0` release tag creation and merge into `main` (intentionally held until final reviewer approval).

---

## Summary for reviewer

- Prepared the `v2.0.0` release on `chore/release-2.0.0-prep` and merged `--no-ff` into `feat/navigation-shell` (`main` untouched).
- Applied non-breaking `npm update` + `npm audit fix`, bringing `npm audit --omit=dev` to **0 vulnerabilities** (5 dev-only advisories deferred).
- Fixed a `@tanstack/react-virtual@3.14.28` desktop table empty-tbody regression in Happy-DOM via `createObserveElementRect` in `src/components/StudentList.tsx` and scoped mobile-card assertions in `src/test/NavigationShell.test.tsx`.
- Bumped version to `2.0.0`, injected `__APP_VERSION__` from `package.json` into `Footer.tsx`, updated `CHANGELOG.md` with `v1.0.0` compatibility guarantees, added a `Footer` version-sync test, and archived 10 legacy docs into `docs/archive/`.
- Verified after final edits: `eslint` (0 errors), `tsc -b` (0 errors), Vitest `--maxWorkers=1` (**66/66 files, 612/612 tests**), Vite + Workbox build (`dist/sw.js` excludes `posthog-`), and Playwright E2E (**12/12 passed**).
