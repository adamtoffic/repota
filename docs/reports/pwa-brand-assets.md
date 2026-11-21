# PWA Brand Mark, OG Card, & Store Assets Report

Branch: `feat/pwa-brand-assets` (branched from `feat/navigation-shell` at `c9064c2`)

## What Changed

- **Master Brand & Optical Favicon SVGs (`public/logo.svg`, `public/favicon.svg`, `src/components/ui/RepotaLogo.tsx`)**
  - Replaced the March 2026 document-with-text SVG with the refined **D3 (Folded A4 Stack)** vector mark in Royal Navy (`#2549B0` → `#1E3A8A` → `#112257`) and Ghana Gold (`#FDE047` → `#FACC15` → `#F59E0B`).
  - Added a two-tone folded corner gradient (`#DBEAFE` → `#93C5FD`) with a subtle inner crease (`#1E3A8A` at `10%` opacity), strengthened secondary header bar (`#94A3B8`, height `14`), pure-vector offset shadows (zero `<filter>` rasterization), explicit `512×512` SVG dimensions, and `<g id="repota-artwork">` for maskable scaling.
  - Built a dedicated optical small-size `public/favicon.svg` (`rx="96"` clipped squircle, `1.12×` bold bars and dog-ear fold, no shadows or thin lines) for `16px`/`32px` browser tabs.
  - Added inline `<RepotaLogo />` (`useId()`-scoped gradients) and mounted it in `src/components/navigation/AppShell.tsx` and `src/components/ui/PageHeader.tsx` (removing `p-1` and adding `overflow-hidden`) so mobile Retina displays and zoom render GPU-crisp vectors.
- **Zero-Dependency Asset Pipeline (`scripts/lib/cdp-browser.mjs`, `scripts/generate-icons.mjs`, `scripts/generate-og.mjs`, `scripts/generate-screenshots.mjs`, `package.json`, `eslint.config.js`)**
  - Extracted shared headless Chromium CDP & PNG validation helpers into `scripts/lib/cdp-browser.mjs` (Node 22 built-ins only; zero added npm dependencies).
  - Updated `scripts/generate-icons.mjs` (`npm run generate:icons`) to export cache-busted desktop `"any"` squircle PNGs (`public/pwa-any-64x64.png`, `public/pwa-any-192x192.png`, `public/pwa-any-512x512.png` with `428×428` `rx="94"` tile + subtle grounded shadow), full-bleed `public/maskable-icon-512x512.png` (`0.86×` artwork), `public/apple-touch-icon.png` (`180×180`), `public/favicon-96x96.png`, and multi-size `public/favicon.ico` (`16`/`32`/`48`).
  - Deleted superseded `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png` plus stale unused `public/site.webmanifest`, `public/web-app-manifest-192x192.png`, and `public/web-app-manifest-512x512.png`.
  - Added `scripts/generate-og.mjs` (`npm run generate:og`) to generate `public/og-image.png` (`1200×630`) using the refined **OG-1** editorial split layout with a floating 5-column GES terminal report card.
  - Upgraded `scripts/generate-screenshots.mjs` (`npm run generate:screenshots`) to seed 10 synthetic Ghanaian students (with deterministic SVG initial avatars, SBA components, and a school crest for `Ahibenso Anglican Basic`), capture supersampled raw app screens (`390×844 @ 2×` mobile & `1440×754 @ 1.5×` desktop) with welcome tour/prompts/backup toasts suppressed, and composite **4 cohesive App-Store showcase pairs (8 slides total)** in Royal Navy + Ghana Gold device frames:
    - Home Dashboard: `public/screenshot-mobile.png` (`780×1688`), `public/screenshot-desktop.png` (`1280×720`)
    - Printable A4 GES Report Card (`/print`): `public/screenshot-report-mobile.png` (`780×1688`), `public/screenshot-report-desktop.png` (`1280×720`)
    - Quick Gradebook & SBA Entry: `public/screenshot-gradebook-mobile.png` (`780×1688`), `public/screenshot-gradebook-desktop.png` (`1280×720`)
    - Class Analytics (`/analytics`): `public/screenshot-analytics-mobile.png` (`780×1688`), `public/screenshot-analytics-desktop.png` (`1280×720`)
  - Resized `public/developer.jpg` to crisp `256×256` (`432,122 B` → `12,753 B`).
  - Updated `eslint.config.js` to lint `scripts/**/*.{js,mjs}` with `globals.node`.
- **PWA Manifest & Offline Cache Optimization (`vite.config.ts`)**
  - Removed `og-image.png` from `VitePWA.includeAssets` and added `workbox.globIgnores: ["og-image.png", "screenshot-*.png"]` so marketing/install PNGs are not precached offline.
  - Wired `pwa-any-{64,192,512}.png` (`purpose: "any"`), `maskable-icon-512x512.png` (`purpose: "maskable"`), and all 8 labeled App-Store showcase screenshots (`4` `narrow`, `4` `wide`) in `VitePWA.manifest`.

## Why

- Eliminated mobile/zoom `<filter>` rasterization blur in top-nav/sidebar branding, shipped properly inset rounded squircle icons for Windows/macOS desktop shortcuts, replaced the clipped March 2026 OG card, upgraded raw cramped screenshots into a cohesive 4-slide App-Store showcase covering Dashboard, Printable A4 Report Card, Quick Gradebook, and Class Analytics, cut `developer.jpg` by 97%, and excluded social/store PNGs from the Workbox offline precache.

## What Was Verified

- `npm run generate:icons`: exited `0`; generated `pwa-any-64x64.png` (4,193 B), `pwa-any-192x192.png` (22,705 B), `pwa-any-512x512.png` (130,224 B), `maskable-icon-512x512.png` (142,174 B), `apple-touch-icon.png` (19,704 B), `favicon-96x96.png` (7,275 B), and `favicon.ico` (5,105 B).
- `npm run generate:og`: exited `0`; generated `og-image.png` (`1200×630`, `409,446 B`).
- `npm run generate:screenshots`: exited `0`; generated `screenshot-mobile.png` (`780×1688`, `379,925 B`), `screenshot-desktop.png` (`1280×720`, `218,086 B`), `screenshot-report-mobile.png` (`780×1688`, `448,290 B`), `screenshot-report-desktop.png` (`1280×720`, `245,265 B`), `screenshot-gradebook-mobile.png` (`780×1688`, `366,192 B`), `screenshot-gradebook-desktop.png` (`1280×720`, `213,254 B`), `screenshot-analytics-mobile.png` (`780×1688`, `339,988 B`), and `screenshot-analytics-desktop.png` (`1280×720`, `243,635 B`).
- Visual inspection via `read_file` of `public/pwa-any-512x512.png`, `public/og-image.png`, `public/developer.jpg`, and all 8 showcase slides confirmed crisp headlines, unclipped device frames, complete A4 report cards and Recharts graphs, and zero toast/tour/photo-warning overlays.
- `npm run lint`: exited `0`.
- `npx tsc -b`: exited `0`.
- `npm run build`: exited `0` (`41` precached entries, `5037.12 KiB`). Verified `dist/manifest.webmanifest` lists `pwa-any-*.png`, `maskable-icon-512x512.png`, and all 8 labeled screenshots, while `dist/sw.js` excludes `og-image.png` and `screenshot-*.png`.
- `npm test -- --run`: exited `0` (`40` test files passed, `398` tests passed).

## What Could Not Be Verified

- Live WhatsApp, X/Twitter, and Facebook link-preview scraper rendering of `og-image.png`.
- Real Android Chrome and Desktop Chrome Rich PWA Install sheet carousel rendering with the 8 new `780×1688` / `1280×720` showcase slides on PR #61 preview.

## Summary for reviewer

- Redesigned brand/PWA mark (`public/logo.svg`, `public/favicon.svg`, inline `<RepotaLogo />`) with pure-vector D3 Royal Navy geometry for crisp mobile Retina & zoomed rendering.
- Split desktop `"any"` icons into cache-busted optical squircles (`pwa-any-{64,192,512}.png`) while keeping `maskable-icon-512x512.png` and `apple-touch-icon.png` full-bleed opaque.
- Added zero-dependency Node 22 + headless Chromium CDP scripts (`scripts/lib/cdp-browser.mjs`, `generate:icons`, `generate:og`, `generate:screenshots`).
- Shipped refined **OG-1** `public/og-image.png` (`1200×630`), 8 App-Store showcase slides (Dashboard, A4 Report, Quick Gradebook, Analytics across mobile & desktop), and optimized `public/developer.jpg` (`432 KB` → `12.5 KB`).
- Deleted stale `site.webmanifest`, `web-app-manifest-*.png`, and `pwa-{64,192,512}.png`, and excluded `og-image.png` / `screenshot-*.png` from Workbox precache (`globIgnores`).
- Verified `npm run lint`, `npx tsc -b`, `npm run build` (`41` SW entries), `dist/manifest.webmanifest`, visual PNG checks, and `npm test -- --run` (`40` files, `398` tests passed).
- Live social link-preview scraping and Chrome Rich PWA Install carousel rendering remain to be tested on PR #61 preview.
