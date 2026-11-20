# PWA Brand Mark & Icon Assets Report

Branch: `feat/pwa-brand-assets` (branched from `feat/navigation-shell` at `c9064c2`)

## What Changed

- **Master Brand & Optical Favicon SVGs (`public/logo.svg`, `public/favicon.svg`)**
  - Replaced the March 2026 document-with-text SVG with the refined **D3 (Folded A4 Stack)** vector mark in Royal Navy (`#2549B0` → `#1E3A8A` → `#112257`) and Ghana Gold (`#FDE047` → `#FACC15` → `#F59E0B`).
  - Added a two-tone folded corner gradient (`#DBEAFE` → `#93C5FD`) with a subtle inner crease (`#1E3A8A` at `9%` opacity), strengthened secondary header bar (`#94A3B8`, height `14`), and wrapped the foreground in `<g id="repota-artwork">` for deterministic maskable scaling.
  - Built a dedicated optical small-size `public/favicon.svg` (`rx="96"` clipped squircle, `1.12×` bold bars and dog-ear fold, no drop-shadow filters or thin header lines) for crisp `16px`/`32px` browser tab legibility.
- **Zero-Dependency Icon Build Script (`scripts/generate-icons.mjs`, `package.json`, `eslint.config.js`)**
  - Added `scripts/generate-icons.mjs` (`npm run generate:icons`) using Node 22 built-ins and headless Chrome/Edge CDP to export verified PNGs and multi-size `favicon.ico` without adding npm dependencies.
  - Regenerated `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/apple-touch-icon.png` (180×180), `public/favicon-96x96.png`, `public/favicon.ico` (16/32/48 PNG-in-ICO), and added `public/maskable-icon-512x512.png` (`0.86×` centered artwork on full-bleed Royal Navy).
  - Updated `eslint.config.js` to lint `scripts/**/*.{js,mjs}` with `globals.node`.
- **PWA Manifest Wiring, Cleanup, and In-App Header Framing (`vite.config.ts`, `AppShell.tsx`, `PageHeader.tsx`)**
  - Deleted unused stale leftovers `public/site.webmanifest`, `public/web-app-manifest-192x192.png`, and `public/web-app-manifest-512x512.png`.
  - Updated `VitePWA.includeAssets` (`favicon-96x96.png`, `maskable-icon-512x512.png`) and split `manifest.icons` into explicit `"purpose": "any"` entries (`pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`) plus `"purpose": "maskable"` (`maskable-icon-512x512.png`).
  - Removed `p-1` inner padding and added `overflow-hidden` on the `40×40` `/logo.svg` container in `src/components/navigation/AppShell.tsx` and `src/components/ui/PageHeader.tsx`.
  - Note: `public/og-image.png`, `public/screenshot-mobile.png`, and `public/screenshot-desktop.png` were kept as-is per confirmed asset scope.

## Why

- The March 2026 logo embedded `"REPOTA"` text inside a faint cream circle and became dark-on-dark inside the `bg-primary` `40×40` header tile; on Android it also reused a transparent-corner icon as `"any maskable"`.
- Full-bleed Royal Navy + tilted Ghana Gold behind a folded A4 grade sheet stays unmistakable across home screens, passes Android adaptive safe-zone crops, eliminates `p-1` double-boxing in headers, and cleans up stale manifest files.

## What Was Verified

- `npm run generate:icons`: exited `0`; generated `pwa-64x64.png` (4,765 B), `pwa-192x192.png` (28,112 B), `pwa-512x512.png` (164,343 B), `maskable-icon-512x512.png` (142,174 B), `apple-touch-icon.png` (19,704 B), `favicon-96x96.png` (7,275 B), and `favicon.ico` (5,105 B).
- Visual PNG inspection via `read_file` on `public/pwa-512x512.png`, `public/pwa-192x192.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon.png`, and `public/favicon-96x96.png` confirmed transparent-corner rounded squircles (`rx="112"`) for `"any"` desktop/browser icons and full-bleed opaque Royal Navy squares for Android maskable (`0.86×` centered artwork) and Apple touch icons.
- Binary inspection of `public/favicon.ico` verified valid ICO header (`000001000300`, 3 entries at `16`, `32`, `48`).
- `npm run lint` (`eslint .`): exited `0`.
- `npx tsc -b`: exited `0`.
- `npm run build`: exited `0` (VitePWA precached 45 entries); `dist/manifest.webmanifest` verified with separated `any` and `maskable` icon entries, and `dist/site.webmanifest` plus `dist/web-app-manifest-*.png` confirmed absent.
- `npm test -- --run`: exited `0` (`40` test files passed, `398` tests passed).

## Preview Testing Fixes (Post-PR #61)

- **Fixed blurry mobile top-nav logo & zoom rasterization (`public/logo.svg`, `public/favicon.svg`, `src/components/ui/RepotaLogo.tsx`, `AppShell.tsx`, `PageHeader.tsx`)**
  - Replaced nested SVG `<filter>` (`feDropShadow`) shadows in `public/logo.svg` with pure-vector translucent offset shadow shapes and added explicit `width="512" height="512"` on both `public/logo.svg` and `public/favicon.svg`.
  - Created inline `<RepotaLogo />` (`useId()`-prefixed gradient IDs) and replaced `<img src="/logo.svg">` in `AppShell.tsx` and `PageHeader.tsx` so mobile Retina devices and OS zoom render GPU-crisp vector shapes instead of low-res `40×40` offscreen filter bitmaps.
- **Rounded desktop `"any"` PWA icons (`scripts/generate-icons.mjs`)**
  - Updated `scripts/generate-icons.mjs` (`buildSquircleSvg`) to export `pwa-64x64.png`, `pwa-192x192.png`, and `pwa-512x512.png` as transparent-corner rounded squircles (`rx="112"` with a subtle `4px` inner white rim at `14%` opacity) so Windows/macOS desktop installs show rounded squircles instead of sharp square boxes, while keeping `maskable-icon-512x512.png` and `apple-touch-icon.png` full-bleed opaque.

## What Could Not Be Verified

- Real device re-testing after the preview fixes on physical iOS Safari, Android launchers, and Windows/macOS desktop PWA install windows (waiting on PR #61 preview rebuild).
- Live browser tab rendering of `favicon.svg` / `favicon.ico` across Safari, Chrome, and Firefox desktop windows.

## Summary for reviewer

- Redesigned `public/logo.svg` and `public/favicon.svg` using the refined D3 Royal Navy folded-A4-stack mark with pure-vector offset shadows (zero SVG `<filter>` rasterization).
- Added inline `<RepotaLogo />` (`useId()`-scoped gradients) in `AppShell.tsx` and `PageHeader.tsx` for razor-sharp mobile Retina and zoomed top-nav/sidebar rendering.
- Added zero-dependency `scripts/generate-icons.mjs` (`npm run generate:icons`) using headless Chromium CDP to export squircle `"any"` desktop PNGs, full-bleed Android maskable (`0.86×`) and Apple touch PNGs, and 16/32/48 `favicon.ico`.
- Separated `any` vs `maskable` manifest icon entries in `vite.config.ts` and deleted stale `site.webmanifest` and `web-app-manifest-*.png`.
- Verified `npm run generate:icons`, `npm run lint`, `npx tsc -b`, `npm run build`, regenerated PNG visuals, and `npm test -- --run` (40 files, 398 tests passed).
- Physical iOS/Android/desktop PWA re-test on the updated PR #61 preview remains to be checked manually.
