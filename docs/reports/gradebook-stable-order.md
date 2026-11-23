# Quick Gradebook Stable Ordering, iOS Navigation & Broadsheet Export Ranking Report

Branch: `fix/gradebook-stable-order` (merged latest `feat/navigation-shell` `15b4b26` via merge commit `c04c700`)

## What Changed

- Merged `feat/navigation-shell` (`15b4b26`) into `fix/gradebook-stable-order`, resolving `src/components/QuickGradebook.tsx` and `src/pages/Dashboard.tsx` cleanly so Obsidian Slate Dark Mode / Slate Mist Light Mode tokens, `ScrollButton`, and PR #64 gradebook stability are unified.
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

## Root Cause (What Was Wrong)

1. **Row Swapping (`assignPositions` & Unlocked Sorts/Filters):** `SchoolContext.tsx` recomputes `processedStudents` on every score change using `assignPositions()`, which previously sorted `[...students]` descending by `averageScore`. Whenever Student B overtook Student A, DOM rows visibly reordered behind the cursor and reversed arrow/Enter order; active Dashboard filters/sorts also evicted or re-sorted rows and `ScoreEntryModal`'s queue mid-entry.
2. **iOS 27 `⌄` Student Skipping (Even in `Exam only (/100)`):** In iOS WebKit (`WebPageIOS.mm::nextAssistableElement()`), tapping the Form Assistant `⌄`/`⌃` buttons calls `isObscuredElement()` (`hitTestResultAtPoint` with `IgnoreClipping` at the candidate `<input>` center point). While typing on mobile (`< 640px`), left-aligned score inputs sit beneath active `fixed`/`sticky` overlays (`AutoSaveIndicator` mounting at `left-4` on first keystroke, `AppShell` bottom nav pill, `ScrollButton`, `PwaInstallPrompt`, and sticky `PageHeader`). WebKit hit-test collision flagged the next student's input as obscured and skipped over it (`Student A -> Student C`). Secondary WebKit hazards compounded traversal instability: nesting `<input>` inside `<label>` without `<form>`/`htmlFor`/`id`, outer `overflow-hidden` clipping, `DashboardStats` swapping `<button>` ↔ `<div>` when `pending`/`failing` crossed `0`, and `0ms` post-blur `examDrafts` resets racing WebKit's async `blur -> focus` transition.

## Architecture & Performance (Zero Typing Slowdown)

This is a structural WebKit fix with **zero input/typing debounce** and no added keystroke latency:

- **Instant Keystrokes (`0ms`):** Every digit typed in `QuickGradebook` still updates student state, subject totals, and grades synchronously in `onChange` (no typing debounce was added).
- **Focus-Transition Settle Windows Only (`180ms`):**
  - `useEditableInputFocused()` uses its `180ms` timer **only after `focusout`** to delay re-showing the hidden bottom nav/scroll overlays when the keyboard is dismissed. When stepping `Student A -> Student B` via `⌄`, `Enter`, or `ArrowDown`, `focusin` cancels the timer immediately, producing **0 re-renders** of `AppShell`, `MobileBottomNav`, and `ScrollButton` between rows.
  - `QuickGradebook` uses its `180ms` post-blur timer **only for cosmetic `examDrafts` string normalization** (e.g., rounding `89` -> `90`) after focus has already left the previous Exam field; the underlying weighted score is already saved synchronously on `onChange`.
- **Isolated Subscriptions:** Subscribing to `useEditableInputFocused()` inside the `MobileBottomNav` leaf keeps `AppShell` and page trees completely un-rerendered on input focus/blur.

## What Was Verified

- `npm run lint` (`eslint .`): exited `0` with zero warnings or errors.
- `npx tsc -b`: exited `0`.
- `npm test -- --run --maxWorkers=2`: exited `0` — `Test Files  48 passed (48)`, `Tests  454 passed (454)` (0 skipped).
- `npm run build` (`tsc -b && vite build`): exited `0` (`2853` modules transformed, `dist/sw.js` + `dist/workbox-d8d3a357.js`, `32` precache entries).
- **Physical device verification:** Confirmed on physical iPhone 16 Pro Max (iOS 27) via PR #64 Vercel preview (`8f1113a`) that Quick Gradebook keyboard `⌄` navigation now steps cleanly student-by-student without skipping.

## What Could Not Be Verified

- Automated iOS WebKit Playwright/E2E runs are not configured in CI.
- Physical Android Chrome virtual keyboard and iPadOS hardware keyboard flows were not directly exercised in this session.

## Summary for reviewer

- Root causes fixed: `assignPositions()` no longer breaks Roll Order on score entry, and iOS 27 WebKit `isObscuredElement` hit-test skips are eliminated across `AutoSaveIndicator`, `MobileBottomNav`, `ScrollButton`, `PwaInstallPrompt`, and `PageHeader`.
- Zero typing slowdown: no input debounce was added; `180ms` timers apply only after `focusout`/`onBlur` (re-showing bottom chrome after keyboard dismissal and post-blur `examDrafts` formatting) and cancel immediately on `Student A -> Student B` transitions.
- Hardened `QuickGradebook.tsx` with `<form>`, separate `<label htmlFor>` + `id`/`name`, no outer `overflow-hidden`, `scroll-mt-24 scroll-mb-40`, `OrderSnapshot` locking, `CLASS_ONLY`/`EXAM_ONLY` modes, and stable `<button>` identity on `DashboardStats`.
- Added position-ranked CSV exports (`src/utils/export.ts`) and regression tests across `gradeCalculator.test.ts`, `export.test.ts`, `ClassTools.test.tsx`, `ScoreEntryUX.test.tsx`, and `NavigationShell.test.tsx`.
- Verified: `npm run lint` (0), `npx tsc -b` (0), `npm test -- --run --maxWorkers=2` (`48` files / `454` tests passed), `npm run build` (0), plus physical iPhone 16 Pro Max (iOS 27) confirmation on PR #64 preview.
