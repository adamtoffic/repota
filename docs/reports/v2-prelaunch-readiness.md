# v2.0.0 Pre-Launch Readiness Report

**Branch:** `fix/v2-prelaunch-readiness` -> merged `--no-ff` into `feat/navigation-shell`  
**Scope:** Mobile `<input type="date">` & Settings Academic layout fixes, strict `Content-Security-Policy`, truthful security/contributing documentation, CI & package hardening, Recharts chunk split, stale doc archival, expanded Playwright coverage, and v2.0.0 PWA screenshot / OG refresh.

---

## 1. What Changed

1. **Mobile `<input type="date">` & Settings Academic Layout (`src/index.css`, `src/components/ui/Input.tsx`, `src/components/ui/Select.tsx`, `src/components/settings/AcademicSessionSection.tsx`, `src/pages/settings/SettingsHub.tsx`, `src/pages/settings/SettingsSubPageLayout.tsx`)**
   - Normalized native WebKit `<input type="date">` rendering in `src/index.css` (`display: block`, `width: 100%`, `max-width: 100%`, `min-width: 0`, `-webkit-appearance: none`, `appearance: none`, `text-align: left`, `::-webkit-date-and-time-value` reset, and mobile-scoped `min-height: 2.75rem`) alongside `min-w-0` grid wrappers in `Input.tsx`, `Select.tsx`, and `AcademicSessionSection.tsx`.
   - Unified `AcademicSessionSection` labels and controls (`Class Name` label matched to `<Input>`, raw `<select>` for `Term / Semester` replaced with `<Select>`), and replaced remaining `min-h-screen` wrappers in `SettingsHub.tsx` and `SettingsSubPageLayout.tsx` with `min-h-dvh`.
   - Removed the visible `*` text inside `Class Name`'s manual `<label>` (keeping `required` on the `<Input>` and `aria-hidden="true"` on `*` inside `Input`/`Select`) so accessible label queries (`getByLabelText("Class Name")`) resolve cleanly.

2. **Content Security Policy & Truthful Docs (`vercel.json`, `SECURITY.md`, `CONTRIBUTING.md`)**
   - Added a production `Content-Security-Policy` header in `vercel.json` matching both LF (`sha256-KTnl2oaQyjkglicjCfPQaMddS6zlhy38CiAzK3TTcaY=`) and CRLF (`sha256-HE2SI0cenrDXTDSqCVchuyozHom4MhRlchtO80zP+go=`) hashes of `index.html`'s inline theme boot script while permitting `self`, `data:`/`blob:` images and PDF captures, and PostHog ingest/assets.
   - Updated `SECURITY.md` (`2.x.x` support, honest zero-PII PostHog analytics & masked replay disclosure, accurate CSP summary) and `CONTRIBUTING.md` (`Node.js 20+`, current directory tree without `src/api`, accurate zero-PII privacy statement).

3. **CI, Package & Recharts Chunk Optimization (`.github/workflows/ci.yml`, `package.json`, `package-lock.json`, `.gitignore`, `.env.example`, `vite.config.ts`)**
   - Upgraded `.github/workflows/ci.yml` to run `npx tsc -b`, `npm audit --omit=dev`, `dist/sw.js` `posthog-` exclusion check, and Playwright Chromium E2E tests (`npm run test:e2e`).
   - Marked `package.json` `"private": true`, synced `package-lock.json`, unignored `!.env.example` in `.gitignore`, and replaced dead Supabase vars in `.env.example` with optional `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`.
   - Split Recharts' runtime vendor tree (`@reduxjs/toolkit`, `react-redux`, `redux`, `immer`, `reselect`, `es-toolkit`, `decimal.js-light`, `eventemitter3`, `tiny-invariant`, `use-sync-external-store`) into `recharts-vendor` in `vite.config.ts`, dropping the `recharts` chunk from `439.94 kB` down to `376.17 kB` (`95.96 kB` gzip) with zero chunk-size or circular warnings.

4. **Architecture Docs & Legacy Cleanup (`docs/architecture.md`, `docs/archive/`)**
   - Archived stale v1.0.0 snapshots (`docs/ground-truth.md`, `docs/codebase-inventory.md`) into `docs/archive/` and rewrote `docs/architecture.md` for Repota v2.0.0.

5. **Unit Tests, E2E Settings Sub-Page Coverage & Refreshed Assets (`src/test/PreLaunchReadiness.test.tsx`, `e2e/responsive-modals-and-theme.spec.ts`, `public/screenshot-*.png`, `public/og-image.png`)**
   - Added `PreLaunchReadiness.test.tsx` (4 tests) verifying date input classes, CSS normalization, `AcademicSessionSection` accessibility, and `vercel.json` CSP hash parity.
   - Expanded `e2e/responsive-modals-and-theme.spec.ts` across `/settings/school`, `/settings/academic`, `/settings/templates`, and `/settings/security`, asserting mobile `390x844` zero overflow plus `Next Term Begins` horizontal alignment with `Total Attendance Days` and mobile `Date of Birth` bounds.
   - Regenerated all 8 `public/screenshot-*.png` PWA store assets and `public/og-image.png` from the live `v2.0.0` production build.

---

## 2. Why

- Native mobile `<input type="date">` lacked WebKit `appearance: none` and `min-w-0` grid constraints, misaligning `Next Term Begins` on mobile viewports, and Settings sub-pages lacked E2E responsive assertions.
- Security documentation previously contradicted live PostHog telemetry and claimed unimplemented CSP headers.
- Splitting `recharts-vendor` cleared the Vite 400 kB chunk warning safely before launch without touching chart rendering behavior.

---

## 3. What Was Verified

All checks passed after the final edit in a single unbroken run:

- `npm run lint` -> passed (`0` errors)
- `.\node_modules\.bin\tsc.cmd -b` -> passed (exit `0`)
- `.\node_modules\.bin\vitest.cmd run --maxWorkers=1` -> **67 passed (67 files)**, **616 passed (616 tests)** in `150.91s`
- `npm run build` -> built in `17.01s` (`2711` modules transformed), **0 chunk-size warnings** (`recharts-CTJh3Ybq.js 376.17 kB / 95.96 kB gzip`, `recharts-vendor-BN5cVL5Q.js 65.66 kB / 24.55 kB gzip`), `PWA v1.3.0`, `61` precache entries (`2959.55 KiB`), `posthog-` verified excluded from `dist/sw.js`
- `npm run test:e2e` -> **12 passed (1.2m)** (Chromium desktop & `390x844` mobile across all routes including all 4 `/settings/*` sub-pages and `Next Term Begins` alignment)
- `npm audit --omit=dev` -> `found 0 vulnerabilities`

---

## 4. What Could NOT Be Verified

- Physical iOS Safari WebKit hardware rendering of `<input type="date">` and standalone PWA Print/Share Sheet (Playwright E2E verifies Chromium `390x844`; physical Apple hardware cannot run in CI/Windows).
- Live Vercel deployment response headers (`Content-Security-Policy`) against `repota.app` after merge to `main`.
- GitHub Actions CI run on Linux (`ubuntu-latest`) until pushed/PR'd against `main`.

---

## Summary for reviewer

- Fixed mobile `<input type="date">` layout & right-shift across `Settings → Class & Subjects` (`Next Term Begins`) and `DetailsTab` (`Date of Birth`) via WebKit normalization in `src/index.css` + `min-w-0` in `Input.tsx`, `Select.tsx`, and `AcademicSessionSection.tsx`.
- Added strict `Content-Security-Policy` headers in `vercel.json` and aligned `SECURITY.md`, `CONTRIBUTING.md`, `docs/architecture.md` (archiving v1 snapshots), `.env.example`, and `.github/workflows/ci.yml`.
- Marked `package.json` `"private": true` and split `recharts-vendor` (`65.66 kB`), bringing `recharts` down to `376.17 kB` (`95.96 kB` gzip) with zero Vite chunk warnings.
- Regenerated all 8 `v2.0.0` PWA screenshots + `og-image.png` and expanded Playwright E2E across all 4 `/settings/*` sub-pages + mobile date bounds.
- Final verification: `lint` (0), `tsc -b` (0), Vitest (**67/67 files, 616/616 tests**), `build` (0 warnings, `dist/sw.js` excludes `posthog-`), E2E (**12/12 passed**), and `npm audit --omit=dev` (**0 vulnerabilities**).
