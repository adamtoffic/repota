# Floating Liquid Glass Mobile Navigation Report

Branch: `feat/dark-mode` (extending Draft PR #65)

## What Changed
- Upgraded the mobile bottom navigation bar in `src/components/navigation/AppShell.tsx` from a docked top-rounded surface (`bg-surface/95 backdrop-blur-sm`) to an iOS 26/27-inspired floating Liquid Glass capsule (`max-w-[380px]`, `h-[60px]`, `rounded-full`, `backdrop-blur-2xl backdrop-saturate-[180%]`, specular light/dark borders and inner edge highlights) while preserving `md:hidden`, `print:hidden`, and `safe-bottom` landmarks.
- Added a gliding translucent active tab lens (`translateX(${activePrimaryIndex * 100}%)` with `cubic-bezier(0.32,1.18,0.42,1)` spring easing and `motion-reduce:transition-none`) across the 4 primary tabs (`Home`, `SBA`, `Analytics`, `Settings`), keeping `aria-current`, `triggerHaptic("light")`, and `data-record="true"`.
- Unified floating frosted glass styling across `src/components/ScrollButton.tsx` (`statusLabel` badge and dual scroll capsule using matching `backdrop-blur-2xl backdrop-saturate-[180%]` surface, border, and specular highlights).
- Added `.safe-bottom-floating` (`padding-bottom: max(0.625rem, calc(env(safe-area-inset-bottom, 0px) - 0.875rem))`) in `src/index.css`, applied on the mobile `<nav>` in `AppShell.tsx` (without extra `mb-2.5` on the capsule), and updated mobile `.bottom-safe-nav` and `.pb-safe-nav` clearance so Face ID iPhones tighten from ~`44px` to ~`20px` bottom gap while non-notch viewports retain a clean `10px` float.

## Why
- Eliminate the material mismatch between the frosted `ScrollButton` navigator and the previously near-opaque mobile bottom bar.
- Give PWA users on iOS/Android an uncluttered floating glass dock that keeps scrolled content subtly visible underneath while maintaining crisp tab contrast in both light and Obsidian dark themes.

## What Was Verified
- `npm run lint` (`eslint .`): exited `0`.
- `npx tsc -b`: exited `0`.
- `npm test -- --run --maxWorkers=2`: exited `0` — `Test Files  48 passed (48)`, `Tests  441 passed (441)` (0 skipped), including `NavigationShell.test.tsx`, `ScrollButton.test.tsx`, and `ThemeAndDarkMode.test.tsx`.
- `npm run build` (`tsc -b && vite build` + PWA v1.3.0): exited `0` in `17.40s` (`dist/sw.js`, 32 precache entries).
- Live Vite visual verification before the safe-area gap tweak (`http://127.0.0.1:5173/` at `390x844` mobile viewport; `BROWSER_HOST_FACTS` verified visited origin `http://127.0.0.1:5173`, `blocked_origins: none`, and inspected `final_step_18.png`): verified light and Obsidian dark frosted glass capsules over scrolled student cards, zero label truncation across all 4 tabs, active lens sliding (`translateX(0%)`..`300%`), and clean vertical clearance + flush right alignment with `ScrollButton`.

## What Could Not Be Verified
- Physical iPhone iOS 27 standalone PWA home-indicator inset (`env(safe-area-inset-bottom)`) and WebKit live backdrop-filter frame rate on a physical handset.
- Spring transition frame timing over real multi-tab swipe/tap navigation (`NavigationShell` renders in `happy-dom`; desktop Chromium rendered the target transform state).

## Summary for reviewer
- Rebuilt mobile bottom navigation in `AppShell.tsx` into a floating frosted Liquid Glass capsule (`rounded-full`, `h-[60px]`, `backdrop-blur-2xl backdrop-saturate-[180%]`).
- Added a hardware-accelerated sliding active lens (`translateX(${activePrimaryIndex * 100}%)`) with `motion-reduce:transition-none` and light haptic feedback.
- Preserved `NavigationShell` landmarks (`md:hidden print:hidden safe-bottom`), `aria-current`, and `data-record="true"` strictly on static tab controls.
- Harmonized `ScrollButton.tsx` to matching translucent glass borders, blur, and inner highlights.
- Tightened Face ID iPhone bottom gap via `.safe-bottom-floating` + matched `.bottom-safe-nav` / `.pb-safe-nav` in `src/index.css` (~20px gap on 34px-inset devices vs ~44px before).
- Verified with `lint` (0), `tsc -b` (0), Vitest (48 files / 441 tests passed), `build` (0), and mobile `390x844` browser inspection.
