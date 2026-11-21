# PWA Brand Mark, OG Card, & Store Assets Report

Branch: `feat/pwa-brand-assets` (branched from `feat/navigation-shell` at `c9064c2`)

## What Changed

- **Master Brand & Optical Favicon SVGs (`public/logo.svg`, `public/favicon.svg`, `src/components/ui/RepotaLogo.tsx`)**
  - Replaced the March 2026 document-with-text SVG with the refined **D3 (Folded A4 Stack)** vector mark in Royal Navy (`#2549B0` → `#1E3A8A` → `#112257`) and Ghana Gold (`#FDE047` → `#FACC15` → `#F59E0B`).
  - Added a two-tone folded corner gradient (`#DBEAFE` → `#93C5FD`) with a subtle inner crease (`#1E3A8A` at `10%` opacity), strengthened secondary header bar (`#94A3B8`, height `14`), pure-vector offset shadows (zero `<filter>` rasterization), explicit `512×512` SVG dimensions, and `<g id="repota-artwork">` for maskable scaling.
  - Built a dedicated optical small-size `public/favicon.svg` (`rx="96"` clipped squircle, `1.12×` bold bars and dog-ear fold, no shadows or thin lines) for `16px`/`32px` browser tabs.
  - Added inline `<RepotaLogo />` (`useId()`-scoped gradients) and mounted it in `src/components/navigation/AppShell.tsx` and `src/components/ui/PageHeader.tsx` (removing `p-1` and adding `overflow-hidden`) so mobile Retina displays and zoom render GPU-crisp vectors without runtime `logo.svg` fetches. Keep `public/logo.svg` (generator master) and `src/components/ui/RepotaLogo.tsx` (runtime vector) in sync on any future brand mark update.
- **Zero-Dependency Asset Pipeline (`scripts/lib/cdp-browser.mjs`, `scripts/generate-icons.mjs`, `scripts/generate-og.mjs`, `scripts/generate-screenshots.mjs`, `package.json`, `eslint.config.js`)**
  - Extracted shared headless Chromium CDP & PNG validation helpers into `scripts/lib/cdp-browser.mjs` (Node 22 built-ins only; zero added npm dependencies).
  - Updated `scripts/generate-icons.mjs` (`npm run generate:icons`) to export cache-busted desktop `"any"` squircle PNGs (`public/pwa-any-64x64.png`, `public/pwa-any-192x192.png`, `public/pwa-any-512x512.png` with `428×428` `rx="94"` tile + subtle grounded shadow), full-bleed `public/maskable-icon-192x192.png` & `public/maskable-icon-512x512.png` (`0.86×` artwork), `public/apple-touch-icon.png` (`180×180`), `public/favicon-96x96.png`, and multi-size `public/favicon.ico` (`16`/`32`/`48`).
  - Deleted superseded `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png` plus stale unused `public/site.webmanifest`, `public/web-app-manifest-192x192.png`, and `public/web-app-manifest-512x512.png`.
  - Added `scripts/generate-og.mjs` (`npm run generate:og`) to generate `public/og-image.png` (`1200×630`) using the refined **OG-1** editorial split layout with a floating 5-column GES terminal report card.
  - Upgraded `scripts/generate-screenshots.mjs` (`npm run generate:screenshots`) to seed 10 synthetic Ghanaian students (with deterministic SVG initial avatars, SBA components, and a school crest for `Ahibenso Anglican Basic`), capture supersampled raw app screens (`390×844 @ 2×` mobile & `1440×754 @ 1.5×` desktop) with welcome tour/prompts/backup toasts suppressed, and composite **4 cohesive App-Store showcase pairs (8 slides total)** in Royal Navy + Ghana Gold device frames:
    - Home Dashboard: `public/screenshot-mobile.png` (`780×1688`), `public/screenshot-desktop.png` (`1280×720`)
    - Printable A4 GES Report Card (`/print`): `public/screenshot-report-mobile.png` (`780×1688`), `public/screenshot-report-desktop.png` (`1280×720`)
    - Quick Gradebook & SBA Entry: `public/screenshot-gradebook-mobile.png` (`780×1688`), `public/screenshot-gradebook-desktop.png` (`1280×720`)
    - Class Analytics (`/analytics`): `public/screenshot-analytics-mobile.png` (`780×1688`), `public/screenshot-analytics-desktop.png` (`1280×720`)
  - Resized `public/developer.jpg` to crisp `256×256` (`432,122 B` → `12,753 B`).
  - Updated `eslint.config.js` to lint `scripts/**/*.{js,mjs}` with `globals.node`.
- **PWA Manifest, Offline Precache, & Caching Optimization (`vite.config.ts`, `index.html`, `vercel.json`)**
  - Moved `rollup-plugin-visualizer` output from `./dist/stats.html` (`1.58 MB`) to gitignored `./.cache/stats.html` so bundle analysis never ships or precaches in `dist/`.
  - Deduplicated Workbox precache (`globPatterns` narrowed to `["index.html", "**/*.{js,css,woff,woff2}", "assets/**/*.{png,svg}"]`; `includeAssets` narrowed to non-manifest assets + `developer.jpg`; `logo.svg` dropped from precache), eliminating 9 duplicate icon entries and cutting precache payload from `41` entries (`5037.12 KiB`) to `32` unique entries (`3166.81 KiB`, `-37.1%`).
  - Excluded `og-image.png`, `screenshot-*.png`, and `stats.html` via `workbox.globIgnores`.
  - Wired explicit `id: "/"`, unlocked `orientation` (removed `"portrait"` lock for landscape gradebook/report tables), added `maskable-icon-192x192.png` alongside `maskable-icon-512x512.png`, and wired all 8 labeled showcase screenshots in `VitePWA.manifest`.
  - Switched `images-cache` runtime strategy to `StaleWhileRevalidate`, removed unused `cdnjs.cloudflare.com` preconnect (`index.html`) and dead `cdn-cache` rule (`vite.config.ts`), and added `Cache-Control: public, max-age=0, must-revalidate` for `/manifest.webmanifest` in `vercel.json`.

## Why

- Eliminated mobile/zoom `<filter>` rasterization blur in top-nav/sidebar branding, shipped inset rounded squircle desktop shortcuts plus right-sized `192×192`/`512×512` Android maskable icons, replaced the clipped March 2026 OG card, upgraded raw cramped screenshots into a cohesive 4-slide App-Store showcase, cut `developer.jpg` by 97%, unlocked landscape orientation, and cut offline first-visit precache download size by ~1.87 MB (`37.1%`) while fixing duplicate SW entries and stale manifest caching.

## What Was Verified

- `npm run generate:icons`: exited `0`; generated `pwa-any-64x64.png` (4,193 B), `pwa-any-192x192.png` (22,705 B), `pwa-any-512x512.png` (130,224 B), `maskable-icon-192x192.png` (22,640 B), `maskable-icon-512x512.png` (142,174 B), `apple-touch-icon.png` (19,704 B), `favicon-96x96.png` (7,275 B), and `favicon.ico` (5,105 B).
- `npm run generate:og`: exited `0`; generated `og-image.png` (`1200×630`, `409,446 B`).
- `npm run generate:screenshots`: exited `0`; generated all 8 showcase PNGs (`780×1688` mobile `339–448 KB`, `1280×720` desktop `213–245 KB`) matching Chrome's Richer Install UI limits (`2.164` / `1.778` uniform aspect ratios `<= 2.3`).
- Visual inspection via `read_file` of `public/pwa-any-512x512.png`, `public/maskable-icon-192x192.png`, `public/og-image.png`, `public/developer.jpg`, and all 8 showcase slides confirmed crisp geometry, unclipped frames, complete reports/charts, and zero unintended overlays.
- Clean build (`npm run build` after wiping `dist` and `.cache`): exited `0` (`32` precache entries, `3166.81 KiB`); automated audit confirmed `0` duplicate URLs in `dist/sw.js`, `.cache/stats.html` generated outside `dist/`, `stats.html`/`og-image.png`/`screenshot-*.png`/`logo.svg` absent from `dist/sw.js`, `developer.jpg` & all 5 manifest icons present once, `manifest.webmanifest` (`id: "/"`, no `orientation` lock, 5 icons, 8 dimension-matched screenshots), `StaleWhileRevalidate`, and zero `cdnjs` references.
- User verification on Vercel preview deployment: confirmed crisp mobile/desktop nav logo, rounded desktop PWA icon, live `/og-image.png`, desktop PWA install screenshots, and Chrome DevTools **Application → Manifest** screenshot rendering.
- `npm run lint`: exited `0`.
- `npx tsc -b`: exited `0`.
- `npm test -- --run`: exited `0` (`40` test files passed, `398` tests passed).

## What Could Not Be Verified

- Production social link-preview scraping on `https://repota.app/` (WhatsApp/Facebook/X crawlers target the production canonical `og:image` URL and require Meta Sharing Debugger "Scrape Again" after merging to `repota.app`).
- Swiping through the 4-slide `narrow` Richer PWA Install carousel on a physical Android phone.

## Summary for reviewer

- Redesigned brand/PWA mark (`public/logo.svg`, `public/favicon.svg`, inline `<RepotaLogo />`) with pure-vector D3 Royal Navy geometry for crisp mobile Retina & zoomed rendering.
- Split desktop `"any"` icons into inset rounded squircles (`pwa-any-{64,192,512}.png`), added `maskable-icon-192x192.png` alongside `512×512`, and kept `apple-touch-icon.png` full-bleed opaque.
- Added zero-dependency Node 22 + headless Chromium CDP scripts (`scripts/lib/cdp-browser.mjs`, `generate:icons`, `generate:og`, `generate:screenshots`) and linted them cleanly.
- Shipped refined **OG-1** `public/og-image.png` (`1200×630`), 8 App-Store showcase slides (Dashboard, A4 Report, Gradebook, Analytics), and optimized `public/developer.jpg` (`432 KB` → `12.5 KB`).
- Cut Workbox precache from `41` entries (`5037.12 KiB`) to `32` unique entries (`3166.81 KiB`, `-37.1%`) by moving `stats.html` to `.cache/`, deduplicating icon entries, caching `developer.jpg`, and ignoring marketing PNGs.
- Hardened `manifest` (`id: "/"`, unlocked `orientation`, `StaleWhileRevalidate` images), removed dead `cdnjs` preconnect/cache, added `/manifest.webmanifest` revalidation in `vercel.json`, and deleted stale `site.webmanifest` / old PNGs.
- Updated `docs/architecture.md`, `docs/codebase-inventory.md`, and `docs/reports/pwa-brand-assets.md`.
- Verified `npm run lint`, `npx tsc -b`, clean `npm run build`, automated SW/manifest audit, and `npm test -- --run` (`40` files, `398` tests passed).
- Preview checks confirmed crisp nav branding, rounded desktop icon, live `/og-image.png`, and DevTools Manifest screenshots; production social card scrape & physical Android install swipe remain post-merge.
