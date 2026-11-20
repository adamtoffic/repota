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
  - Added `scripts/generate-screenshots.mjs` (`npm run generate:screenshots`) serving `dist/`, seeding clean synthetic Ghanaian school data into IndexedDB (with welcome tour, install prompt, backup toast, and photo warning dismissed), and capturing 2 pairs (`1920×1080` desktop & `750×1334` mobile) for Home Dashboard (`screenshot-desktop.png`, `screenshot-mobile.png`) and Class Analytics (`screenshot-analytics-desktop.png`, `screenshot-analytics-mobile.png`).
  - Resized `public/developer.jpg` to crisp `256×256` (`432,122 B` → `12,753 B`).
  - Updated `eslint.config.js` to lint `scripts/**/*.{js,mjs}` with `globals.node`.
- **PWA Manifest & Offline Cache Optimization (`vite.config.ts`)**
  - Removed `og-image.png` from `VitePWA.includeAssets` and added `workbox.globIgnores: ["og-image.png", "screenshot-*.png"]` so marketing/install PNGs are not precached offline.
  - Wired `pwa-any-{64,192,512}.png` (`purpose: "any"`), `maskable-icon-512x512.png` (`purpose: "maskable"`), and all 4 labeled screenshots (`narrow` & `wide`) in `VitePWA.manifest`.

## Why

- Eliminated mobile/zoom `<filter>` rasterization blur in top-nav/sidebar branding, prevented Windows/Chrome desktop installs from using cached square icons, replaced the clipped March 2026 OG card and outdated screenshots, cut `developer.jpg` by 97%, and trimmed ~`653 KiB` of unused social/store PNGs out of the Workbox offline precache.

## What Was Verified

- `npm run generate:icons`: exited `0`; generated `pwa-any-64x64.png` (4,193 B), `pwa-any-192x192.png` (22,705 B), `pwa-any-512x512.png` (130,224 B), `maskable-icon-512x512.png` (142,174 B), `apple-touch-icon.png` (19,704 B), `favicon-96x96.png` (7,275 B), and `favicon.ico` (5,105 B).
- `npm run generate:og`: exited `0`; generated `og-image.png` (`1200×630`, `409,446 B`).
- `npm run generate:screenshots`: exited `0`; generated `screenshot-desktop.png` (`1920×1080`, `156,371 B`), `screenshot-mobile.png` (`750×1334`, `122,055 B`), `screenshot-analytics-desktop.png` (`1920×1080`, `217,161 B`), and `screenshot-analytics-mobile.png` (`750×1334`, `159,315 B`).
- Visual inspection via `read_file` of `public/pwa-any-512x512.png`, `public/og-image.png`, `public/developer.jpg`, and all 4 live screenshots confirmed crisp framing, transparent squircle margins, rendered Recharts analytics, and zero toast/tour overlays.
- `npm run lint`: exited `0`.
- `npx tsc -b`: exited `0`.
- `npm run build`: exited `0` (`41` precached entries, `5037.77 KiB` — down from `45` entries / `5690.78 KiB`). Verified `dist/manifest.webmanifest` lists `pwa-any-*.png`, `maskable-icon-512x512.png`, and all 4 labeled screenshots, while `dist/sw.js` excludes `og-image.png` and `screenshot-*.png` and `dist/pwa-{64,192,512}.png` are absent.
- `npm test -- --run`: exited `0` (`40` test files passed, `398` tests passed).

## What Could Not Be Verified

- Windows desktop PWA shortcut install behavior with the new `pwa-any-*.png` icons and `~8%` optical squircle padding on the live PR #61 Vercel preview (pending rebuild).
- Live WhatsApp, X/Twitter, and Facebook link-preview scraper rendering of `og-image.png`.
- Real mobile Rich PWA Install sheet carousel across Android Chrome and desktop Chrome.

## Summary for reviewer

- Redesigned brand/PWA mark (`public/logo.svg`, `public/favicon.svg`, inline `<RepotaLogo />`) with pure-vector D3 Royal Navy geometry for crisp mobile Retina & zoomed rendering.
- Split desktop `"any"` icons into cache-busted optical squircles (`pwa-any-{64,192,512}.png`) while keeping `maskable-icon-512x512.png` and `apple-touch-icon.png` full-bleed opaque.
- Added zero-dependency Node 22 + headless Chromium CDP scripts (`scripts/lib/cdp-browser.mjs`, `generate:icons`, `generate:og`, `generate:screenshots`).
- Shipped refined **OG-1** `public/og-image.png` (`1200×630`), 4 live populated screenshots (Home & Analytics, desktop & mobile), and optimized `public/developer.jpg` (`432 KB` → `12.5 KB`).
- Deleted stale `site.webmanifest`, `web-app-manifest-*.png`, and `pwa-{64,192,512}.png`, and excluded `og-image.png` / `screenshot-*.png` from Workbox precache (`globIgnores`).
- Verified `npm run lint`, `npx tsc -b`, `npm run build` (`41` SW entries), `dist/manifest.webmanifest`, visual PNG checks, and `npm test -- --run` (`40` files, `398` tests passed).
- Live desktop PWA install icon, Chrome Rich Install carousel, and social link-preview scraping remain to be tested on PR #61 preview.
