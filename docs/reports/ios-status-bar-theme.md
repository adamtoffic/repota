# Task Report: iOS Status Bar & Safe-Area Theme Fix (`fix/ios-status-bar-theme`)

## What Changed
- **`index.html`:** Changed `<meta name="apple-mobile-web-app-status-bar-style" content="black" />` to `content="default"` so iOS standalone PWAs follow Light/Dark mode and `<meta name="theme-color">` (`#FFFFFF` in Light mode with dark status icons, `#0B101B` in Dark mode with white status icons) instead of locking the top Dynamic Island / safe-area strip to black.
- **`src/utils/theme.ts`:** Updated `applyThemeToDocument` so whenever `meta[name="theme-color"]` changes content, the same `<meta>` element is re-inserted into `document.head` via `removeChild` + `insertBefore` — reliably triggering iOS Safari / WebKit's chrome repaint (`themeColorChanged`) during live Light/Dark toggles.
- **`vite.config.ts`:** Updated PWA `manifest.theme_color` from `#1E3A8A` to `#FFFFFF` to match Light Mode launch chrome (`background_color: "#ffffff"`).
- **`src/test/ThemeAndDarkMode.test.tsx`:** Added regression assertions verifying `index.html` sets `apple-mobile-web-app-status-bar-style="default"` and `applyThemeToDocument` re-inserts `meta[name="theme-color"]` into `document.head` only when the theme color actually changes.

## Why
In iOS standalone Home Screen PWAs, `apple-mobile-web-app-status-bar-style="black"` forced a solid black safe-area bar above the white Light Mode `PageHeader`, and in-place `setAttribute("content", ...)` mutations on `<meta name="theme-color">` do not consistently repaint WebKit's top safe-area bar during live theme switches.

## What Was Verified
- `npm run lint` (`eslint .`) — passed (exit `0`).
- `npx tsc -b` — passed (exit `0`).
- `npx vitest run --maxWorkers=2` — **`59` test files passed (`59`), `541` tests passed (`541`)**.
- `npm run build` — passed (`16.67s`), PWA SW generated with `60 entries (3062.25 KiB)`.

## What Could Not Be Verified
- Visual status-bar and Dynamic Island safe-area rendering on physical iPhone 16 Pro Max (iOS 27) hardware after re-adding the Home Screen PWA icon.

## Summary for Reviewer
- Switched `apple-mobile-web-app-status-bar-style` in `index.html` from legacy `black` to `default`.
- Re-inserted `meta[name="theme-color"]` on color changes in `applyThemeToDocument` (`src/utils/theme.ts`) so iOS Safari / WebKit repaints the top safe area on live Light/Dark toggles.
- Aligned `vite.config.ts` PWA `manifest.theme_color` to `#FFFFFF`.
- Added regression tests in `src/test/ThemeAndDarkMode.test.tsx`; verified with lint, tsc, Vitest (59 files / 541 tests), and build.
