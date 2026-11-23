# Quick Gradebook Stable Ordering, iOS Navigation & Broadsheet Export Ranking Report

Branch: `fix/gradebook-stable-order` (merged latest `feat/navigation-shell` `15b4b26` via merge commit `c04c700`)

## What Changed

- Merged `feat/navigation-shell` (`15b4b26`) into `fix/gradebook-stable-order`, resolving `src/components/QuickGradebook.tsx` and `src/pages/Dashboard.tsx` so Obsidian Slate Dark Mode / Slate Mist Light Mode tokens, `ScrollButton`, and PR #64 gradebook stability are unified.
- `src/utils/gradeCalculator.ts`: Refactored `assignPositions()` to compute competition-ranked `classPosition` ordinals (`1st`, `1st`, `3rd`) in `O(n log n)` via an `ordinalByScore` lookup map and map back over the input array, preserving input roll order (matching `assignSubjectPositions()`). Updated the `assignPositions` JSDoc contract.
- `src/utils/export.ts`: Added `parsePositionRank` and `sortStudentsByClassPosition` so `exportToCSV()` and `exportDetailedBroadsheetCSV()` explicitly export rows ordered by `classPosition` (`1st` → last) without mutating the caller's `students` array, and updated their JSDoc contracts. Register/template exports and `PrintPreview` remain in Roll Order.
- `src/hooks/useEditableInputFocused.ts`: Added `isEditableFormControl` (excluding `<select>`, disabled/readOnly controls, and non-keyboard input types) and `useEditableInputFocused` (with a `180ms` debounced `focusout` settle window so `input A -> input B` transitions remain continuously active without flicker).
- Removed WebKit `isObscuredElement` center-point hit-test obstructions over score inputs during mobile entry:
  - `src/components/AutoSaveIndicator.tsx`: Added `pointer-events-none` on the fixed wrapper (`fixed left-4 bottom-safe-nav z-30`) so toast mount/updates on typing never intercept hit-tests over left-aligned inputs.
  - `src/components/navigation/AppShell.tsx`: Extracted an isolated `MobileBottomNav` leaf subscribing to `useEditableInputFocused()`, applying `invisible translate-y-6 opacity-0`, `aria-hidden`, and inner `pointer-events-none` while an editable control is focused so route children never re-render and fixed bottom chrome steps out of WebKit's hit-test tree.
  - `src/components/ScrollButton.tsx`: Added `invisible` when `!isVisible` and `max-md:pointer-events-none max-md:invisible max-md:opacity-0` while `isEditableFocused` is active.
  - `src/components/PwaInstallPrompt.tsx`: Applied `pointer-events-none invisible opacity-0` and `aria-hidden` on both iOS Safari and Chromium prompt banners while an editable control is focused.
  - `src/components/ui/PageHeader.tsx` & `src/pages/Dashboard.tsx`: Added optional `sticky?: boolean` (default `true`) to `PageHeader` and passed `sticky={entryViewMode !== "GRADEBOOK"}` so Quick Gradebook removes the sticky top hit-test bar and reveals more rows above the keyboard.
- `src/components/QuickGradebook.tsx`:
  - Preserved the two-tier synchronous `OrderSnapshot` (`scopeSnapshot` + `visibleSnapshot`), `allStudents`/`sessionKey`/`onClearParentFilters`, `Order locked · Re-apply`, `student.id` focus/paste indexing, `CLASS_ONLY` / `EXAM_ONLY` focus modes, and `type="text" inputMode="numeric" pattern="[0-9]*"`.
  - Removed `overflow-hidden` from the outer card container, wrapped rows in a semantic `<form onSubmit={(e) => e.preventDefault()} noValidate>`, separated `<label htmlFor={id}>` outside every `<input id={id} name={id}>` using `useId()`, added `scroll-mt-24 scroll-mb-40`, added fixed header `min-w-[6.75rem] tabular-nums` sizing for the `Avg:` pill, cleared pending blur timers on `onFocus`, and extended `examDrafts` `onBlur` cleanup deferral to `180ms`.
- `src/components/DashboardStats.tsx`: Added `isActionable` to `StatCard` so Pending Entry and Pass Rate stay mounted as the same `<button>` DOM node when `pending`/`failing` crosses `0` (using `disabled` instead of swapping `<button>` ↔ `<div>` and re-running `animate-fade-in`).
- `src/pages/Dashboard.tsx`: Preserved `ScoreEntryModal`'s snapshotted `modalStudentQueueIds`, `QuickGradebook` persistence on empty parent filters, `AddStudentModal` availability, `ValidationWarnings` suppression in `GRADEBOOK`, and non-sticky `PageHeader` in `GRADEBOOK`.
- Regression tests added across `src/test/gradeCalculator.test.ts`, `src/test/export.test.ts`, `src/test/ClassTools.test.tsx`, `src/test/ScoreEntryUX.test.tsx`, and `src/test/NavigationShell.test.tsx`.

## Why

1. On iOS 27 Safari and installed iOS PWAs, `QuickGradebook` keyboard Form Assistant `▼`/`▲` still skipped a student (even in single-column `Exam only (/100)`) after visible row reordering was fixed because WebKit's `WebPageIOS.mm::nextAssistableElement()` calls `isObscuredElement()`, running a document center-point hit-test (`hitTestResultAtPoint` with `IgnoreClipping`). Active `fixed`/`sticky` overlays (`AutoSaveIndicator` mounting on first keystroke at `left-4`, `AppShell` bottom nav pill, `ScrollButton`, `PwaInstallPrompt`, and sticky `PageHeader`) intercepted center-point hit-tests on mobile inputs, causing WebKit to skip obscured rows.
2. Nesting `<input>` inside `<label>` without `<form>`/`htmlFor`/`id`, `overflow-hidden` on the card container, `<button>` ↔ `<div>` element swaps in `DashboardStats` when `pending`/`failing` crosses `0`, and `0ms` post-blur `examDrafts` resets introduced secondary WebKit traversal and timing hazards.
3. Previously, `assignPositions()` also mutated order away from Roll Order and live sorts/filters could reorder or unmount students mid-entry.

## What Was Verified

- `npm run lint` (`eslint .`): exited `0` with zero warnings or errors after final code/test edits.
- `npx tsc -b`: exited `0` after final code/test edits.
- `npm test -- --run --maxWorkers=2`: exited `0` — `Test Files  48 passed (48)`, `Tests  454 passed (454)` (0 skipped).
- `npm run build` (`tsc -b && vite build`): exited `0` (`2853` modules transformed, `dist/sw.js` + `dist/workbox-d8d3a357.js`, `32` precache entries).

## What Could Not Be Verified

- No physical iPhone / iOS 27 Safari or installed iOS PWA runtime is available in this environment to directly tap the hardware/software Form Assistant `▼`/`▲` buttons after the overlay hit-test and WebKit form-structure fixes; DOM/event/timer invariants are covered by Vitest + `happy-dom` and await verification on the updated PR #64 Vercel preview.

## Summary for reviewer

- Merged `feat/navigation-shell` (`15b4b26`) into `fix/gradebook-stable-order` with Obsidian Slate Dark Mode / Slate Mist Light Mode tokens and `ScrollButton` preserved across `QuickGradebook.tsx` and `Dashboard.tsx`.
- Eliminated iOS WebKit `isObscuredElement` hit-test skips by making `AutoSaveIndicator` `pointer-events-none`, extracting `MobileBottomNav` in `AppShell`, hiding mobile `fixed` overlays (`MobileBottomNav`, `ScrollButton`, `PwaInstallPrompt`) via `useEditableInputFocused` (`180ms` debounced `focusout`, excluding `<select>`), and disabling `PageHeader` sticky mode in `GRADEBOOK`.
- Hardened `QuickGradebook.tsx` with a `<form>`, separate `<label htmlFor>` + `id`/`name`, no outer `overflow-hidden`, `scroll-mt-24 scroll-mb-40`, `180ms` blur deferral, and stable `<button>` identity on actionable `DashboardStats` cards across `0` crossings.
- Retained Roll Order preservation in `assignPositions()`, position-ranked CSV exports (`src/utils/export.ts`), two-tier `OrderSnapshot` row locking, and `CLASS_ONLY`/`EXAM_ONLY` focus modes.
- Verified in full after final edits: `npm run lint` (0), `npx tsc -b` (0), `npm test -- --run --maxWorkers=2` (`48` files / `454` tests passed), and `npm run build` (0).
