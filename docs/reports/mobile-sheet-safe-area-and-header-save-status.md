# Mobile Modal Safe-Area & Header/Sidebar Save Status Report

**Branch:** `fix/mobile-sheet-safe-area-and-header-save-status` -> merged `--no-ff` into `feat/navigation-shell`  
**Scope:** Prevent mobile `ScoreEntryModal` & centered `Modal` sheets from overlapping the top status/notch safe area, and implement Option A by docking auto-save / offline status into the mobile sticky `PageHeader` and desktop `AppShell` sidebar footer (eliminating the floating bottom-left overlay pill).

---

## 1. What Changed

1. **Mobile `ScoreEntryModal` & `Modal` Top Safe-Area Fixes (`src/hooks/useDialogA11y.ts`, `src/components/ScoreEntryModal.tsx`, `src/components/ui/Modal.tsx`)**
   - Updated `useDialogA11y.ts` to focus the initial dialog target and restore trigger focus with `{ preventScroll: true }`, preventing mobile Safari from auto-scrolling `<select aria-label="Switch student">` flush to `y = 0` past the safe-area padding on modal open.
   - Replaced the detached `<div className="safe-top ... sm:hidden" />` spacer in `ScoreEntryModal.tsx` with a dedicated `MobileModalHeader` leaf component that bakes `pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]` directly into the header, pins `max-sm:sticky max-sm:top-0 max-sm:z-20` when idle, and switches to `relative` while editable inputs are focused (without re-rendering form rows).
   - Settled mobile open scroll resets across `requestAnimationFrame` in `ScoreEntryModal.tsx` and added `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` backdrop padding in `Modal.tsx`.

2. **Option A: Docked Save & Offline Status (`src/hooks/useSchoolData.ts`, `src/components/AutoSaveIndicator.tsx`, `src/components/ui/PageHeader.tsx`, `src/components/navigation/AppShell.tsx`)**
   - Exported `useOptionalSchoolLifecycle()` in `src/hooks/useSchoolData.ts` so shared chrome like `PageHeader` reads lifecycle status cleanly without breaking standalone component tests rendered outside `SchoolProvider`.
   - Extended `AutoSaveIndicator` with inline `variant="header"` and `variant="sidebar"` modes (preserving `"floating"` defaults for direct tests): hides completely when online & idle after 3.5s, surfaces `"Saving..."` → `"Saved"` transiently (even while offline), shows a calm offline pill (`"Offline"` in `PageHeader`, `"Offline · Saved locally"` in sidebar), and keeps save errors visible via `role="alert"`.
   - Docked `HeaderSaveStatus` into `PageHeader` (`compact={Boolean(actions)}` + `md:hidden`) right next to the theme toggle, docked `SidebarSaveStatus` into the desktop sidebar footer above theme controls in `AppShell.tsx`, and removed the fixed `bottom-safe-nav` overlay from `AppShell.tsx`.

3. **Verification Updates (`src/test/MobileSafeAreaAndSaveStatus.test.tsx`, `e2e/repota-core.spec.ts`)**
   - Added 5 unit tests covering `focus({ preventScroll: true })`, `Modal` safe-area padding, `ScoreEntryModal` sticky/focus header inset, inline `AutoSaveIndicator` header/sidebar states, and `AppShell` removal of `.bottom-safe-nav`.
   - Updated mobile viewport test 2 in `e2e/repota-core.spec.ts` to assert `<header>` save status visibility via `title` (`Saved just now`) instead of the desktop sidebar's hidden text node.

---

## 2. Why

- On mobile WebKit/PWA viewports, initial dialog `.focus()` without `preventScroll` and an unattached `.safe-top` spacer allowed `ScoreEntryModal`'s top bar to shift upward into the top safe area / notch.
- An offline-first app should not keep a permanent floating pill anchored over student lists above the bottom navigation bar while offline; docking it inline into `PageHeader` (mobile) and the persistent sidebar footer (desktop) keeps status visible without covering content.

---

## 3. What Was Verified

All checks passed cleanly:

- `npm run lint` -> passed (`0` errors).
- `.\node_modules\.bin\tsc.cmd -b` -> passed (exit `0`).
- `.\node_modules\.bin\vitest.cmd run --maxWorkers=1` -> **68 passed (68 files)**, **621 passed (621 tests)** in `171.55s` (run on all final `src/` files; only `e2e/repota-core.spec.ts` changed afterwards, which is excluded from Vitest).
- `npm run build` -> built in `32.16s` (`2711` modules transformed), `0` chunk-size warnings, `PWA v1.3.0`, `61` precache entries (`2962.35 KiB`), `posthog-` excluded from `dist/sw.js`.
- `npm run test:e2e` -> **12 passed (1.0m)** after final edit across all Playwright Chromium specs (`pin-print-offline.spec.ts`, `repota-core.spec.ts`, `responsive-modals-and-theme.spec.ts`).

---

## 4. What Could NOT Be Verified

- Physical iPhone Safari / iOS standalone PWA notch & Dynamic Island visual overlap with a live hardware virtual keyboard and Vercel preview deployment.

---

## Summary for reviewer

- Fixed mobile `ScoreEntryModal` & `Modal` top safe-area shift by adding `{ preventScroll: true }` in `useDialogA11y`, settling mobile open scroll via `requestAnimationFrame`, adding safe-area backdrop padding in `Modal.tsx`, and baking `env(safe-area-inset-top)` directly into a sticky/focus-aware `MobileModalHeader`.
- Implemented Option A: docked `AutoSaveIndicator` inline into mobile `PageHeader` (`variant="header"`) and desktop `AppShell` sidebar footer (`variant="sidebar"`), removing the floating `bottom-safe-nav` pill from `AppShell`.
- Added 5 unit tests in `MobileSafeAreaAndSaveStatus.test.tsx` and updated mobile E2E assertion in `e2e/repota-core.spec.ts`.
- Verified cleanly: `lint` (0 errors), `tsc -b` (exit 0), Vitest (**68/68 files, 621/621 tests**), Vite + Workbox build (`0` warnings, `posthog-` excluded from `dist/sw.js`), and Playwright E2E (**12/12 passed**).
