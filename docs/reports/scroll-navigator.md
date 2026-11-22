# Frosted Dual-Action Scroll Navigator Report

Branch: `feat/dark-mode` (extending Draft PR #65)

## What Changed
- Rebuilt `src/components/ScrollButton.tsx` from a large single-direction `bg-primary` floating button into a slim frosted vertical capsule (`↑` | live scroll progress bar | `↓`) with:
  - Always-available **Scroll to top** and **Scroll to bottom** buttons (`disabled` at their respective edges, removing direction guesswork mid-page).
  - `requestAnimationFrame`-throttled scroll/resize tracking, capture-phase tracking of optional inner scrollable containers via `scrollTargetSelector`, smooth reveal/dismiss transitions, 2.2s idle auto-dim (`opacity-75`, full `100%` on scroll/hover/focus), `prefers-reduced-motion` handling, and light haptic feedback via `triggerHaptic("light")`.
  - Context-aware bottom spacing (`hasBottomNav` defaults to `true` using `.bottom-safe-nav`; `/print` passes `false` for bottom-edge placement without `AppShell` nav bar overlap) and an optional non-PII `statusLabel` pill.
- Added `data-scroll-region="student-list"` to both the mobile virtualized scroll container and desktop table container in `src/components/StudentList.tsx`, and passed `scrollTargetSelector='[data-scroll-region="student-list"]'` from `src/pages/Dashboard.tsx`.
- Added live report card index tracking (`activeCardIndex`, rAF-throttled over `.report-wrapper` nodes) to `src/pages/PrintPreview.tsx` and rendered `<ScrollButton hasBottomNav={false} statusLabel="${active} / ${total}" />`.
- Added unit tests in `src/test/ScrollButton.test.tsx` (4 tests covering initial hidden/not-scrollable gating, dual top/bottom jumping + near-bottom disabling + `prefers-reduced-motion`, `scrollTargetSelector` capture-phase inner container tracking, and `hasBottomNav` + `statusLabel` rendering).

## Why
- Eliminate the "wrong direction" trap where the old `ScrollButton` still pointed downward at 75% scroll depth.
- Keep bright primary blue reserved for real primary CTAs (`+ Add Student`, `Print Reports`) rather than competing with a `56px` solid blue FAB.
- Make quick navigation work on inner-scrolled `StudentList` tables/lists, improve `/print` batch inspection with a live `X / N` report card indicator, and place `/print`'s navigator neatly near the bottom edge on mobile.

## What Was Verified
- `npm run lint` (`eslint .`): exited `0`.
- `npx tsc -b`: exited `0`.
- `npm test -- --run --maxWorkers=2`: exited `0` — `Test Files  48 passed (48)`, `Tests  441 passed (441)` (0 skipped), including `src/test/ScrollButton.test.tsx` (4 passed).
- `npm run build` (`tsc -b && vite build` + PWA v1.3.0): exited `0` in `29.00s` (`dist/sw.js`, `precache 32 entries`).
- Live Vite visual verification (`http://127.0.0.1:5173/`, `BROWSER_HOST_FACTS` verified visited origin `http://127.0.0.1:5173`, `blocked_origins: none`, and inspected `final_step_16.png`): confirmed capsule appearance/disappearance on Quick Gradebook scroll, `↑`/`↓` edge disabling on `/print`, clean Obsidian glass contrast (`4 / 10` counter pill + frosted dual capsule beside white A4 paper with zero obstruction), and `hasBottomNav={false}` placement on `/print`.

## What Could Not Be Verified
- Physical iOS Safari standalone `env(safe-area-inset-bottom)` clearance and haptic motor feedback on an iPhone (`happy-dom` and desktop Chromium do not trigger Taptic Engine).
- Physical user touch-drag responsiveness when rapidly flick-scrolling an inner virtualized `StudentList` with >20 students.

## Summary for reviewer
- Rebuilt `ScrollButton` into a frosted vertical dual capsule (`↑` | micro progress bar | `↓`) with idle dimming and reduced-motion support.
- Removed direction guesswork by letting teachers jump straight to Top or Bottom anytime (disabling whichever edge is reached).
- Added capture-phase `scrollTargetSelector` support wired to `[data-scroll-region="student-list"]` in `StudentList` + `Dashboard`.
- Added `hasBottomNav={false}` bottom placement and a live `X / N` card counter (`statusLabel`) on `PrintPreview` (`/print`).
- Added 4 unit tests in `src/test/ScrollButton.test.tsx` and verified `lint` (0), `tsc -b` (0), Vitest (48 files / 441 tests passed), `build` (0), and Vite browser render.
