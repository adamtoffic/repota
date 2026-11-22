# Quick Gradebook Stable Ordering, iOS Navigation & Broadsheet Export Ranking Report

Branch: `fix/gradebook-stable-order` (branched off `feat/navigation-shell` at `8c7cf46`)

## What Changed

- `src/utils/gradeCalculator.ts`: Refactored `assignPositions()` to compute competition-ranked `classPosition` ordinals (`1st`, `1st`, `3rd`) in `O(n log n)` via an `ordinalByScore` lookup map and map back over the input array, preserving input roll order (matching `assignSubjectPositions()`). Updated the `assignPositions` JSDoc contract.
- `src/utils/export.ts`: Added `parsePositionRank` and `sortStudentsByClassPosition` so `exportToCSV()` and `exportDetailedBroadsheetCSV()` explicitly export rows ordered by `classPosition` (`1st` → last) without mutating the caller's `students` array, and updated their JSDoc contracts. Register/template exports (`Export Student Roll (.txt)`, Quick Gradebook subject/task CSV exports, `ScoreImportModal` templates) and `PrintPreview` remain in Roll Order.
- `src/components/QuickGradebook.tsx`:
  - Replaced `pinnedStudentIds` with a unified two-tier synchronous render-time `OrderSnapshot` (`scopeSnapshot` + `visibleSnapshot`), added optional `allStudents`, `sessionKey`, and `onClearParentFilters` props, surfaced a conditional `Order locked · Re-apply` header action only when live sort/filter diverges from the locked snapshot, resolved keyboard `Enter`/`ArrowDown`/`ArrowUp` focus and vertical Excel paste by `student.id`, and added a clean parent-filter empty state.
  - Switched gradebook `<input>` fields from `type="number"` to `type="text" inputMode="numeric" pattern="[0-9]*"` with numeric input guards (`^\d*\.?\d*$`), only storing `examDrafts` when raw display differs from weighted round-trip and deferring `onBlur` cleanup via `window.setTimeout(..., 0)` so iOS Safari/PWA Form Assistant `▼`/`▲` transitions never drop focus mid-blur.
  - Added `CLASS_ONLY` (`Class only`) and `EXAM_ONLY` (`Exam only`) modes to the Termly score-column selector with per-column `Unscored only` filtering and `columnStats`, plus a permanent `Avg:` pill slot so scoring the first student never shifts layout.
- `src/pages/Dashboard.tsx`: Snapshotted `ScoreEntryModal`'s `Prev`/`Next` navigation queue (`modalStudentQueueIds`) on open while resolving live student records via `studentsById`, passed `allStudents`, `sessionKey`, and `onClearParentFilters` to `QuickGradebook`, prevented unmounting `QuickGradebook` mid-entry when `filteredStudents.length === 0`, kept `AddStudentModal` mounted in `GRADEBOOK` mode, and suppressed above-table `ValidationWarnings` banners in `GRADEBOOK` mode to avoid mid-entry vertical layout shifts.
- Regression tests added across `src/test/gradeCalculator.test.ts` (roll-order preservation in `assignPositions`), `src/test/export.test.ts` (`exportToCSV` ranking without mutation), `src/test/ClassTools.test.tsx` (`exportDetailedBroadsheetCSV` ranking without mutation), and `src/test/ScoreEntryUX.test.tsx` (Roll Order arrow/Enter focus navigation, `AVG_DESC` lock + `Order locked · Re-apply`, multi-digit typing under `NO_SCORES`, multi-column Excel paste alignment, `EXAM_ONLY` / `CLASS_ONLY` focus modes, `type="text"` + deferred post-blur Exam draft normalization, `ValidationWarnings` suppression in `GRADEBOOK`, and `Dashboard` `ScoreEntryModal` `Next` + `QuickGradebook` integration).

## Why

1. `SchoolContext.tsx` computes `processedStudents` on every keystroke via `assignPositions()`, which previously sorted `[...students]` descending by `averageScore`, defeating `"Sort: Roll Order"`, jumping rows mid-entry on `ArrowDown`/`Enter`, and risking multi-column Excel paste misalignment. Live score-dependent Dashboard sorts/filters also jumped/unmounted rows and shifted `ScoreEntryModal`'s `Prev`/`Next` queue.
2. On iOS 27 Safari/PWA, native Form Assistant `▼`/`▲` traversal skipped students during Exam entry because `Exam Score` previously triggered synchronous `setExamDrafts` state updates inside `onBlur` on `<input type="number">` while above-table `ValidationWarnings` / `Avg:` pills shifted Y-coordinates on the first entry; `EXAM_ONLY` / `CLASS_ONLY` modes also let iOS `▼`/`▲` step directly down one column per student like PC arrow keys.

## What Was Verified

- `npm run lint` (`eslint .`): exited `0` with zero warnings or errors after final code/test edits.
- `npx tsc -b`: exited `0` after final code/test edits.
- `npm test -- --run --maxWorkers=2`: exited `0` — `Test Files  46 passed (46)`, `Tests  439 passed (439)` (0 skipped).
- Desktop Chromium preview verification on PR #64 (`repota-git-fix-gradebook-stable-order-adam-toffics-projects.vercel.app`) prior to the iOS 27 patch confirmed `ArrowDown`/`ArrowUp`/`Enter` moved 1 row per press in Roll Order.

## What Could Not Be Verified

- No physical iOS 27 Safari / installed iOS PWA device is available in this environment to directly exercise the updated iOS keyboard `▼`/`▲` Form Assistant after the deferred-blur and `type="text"` patch; behavior is verified via Vitest + `happy-dom` unit/integration tests and awaits user testing on the updated Vercel preview.

## Summary for reviewer

- `assignPositions()` (`src/utils/gradeCalculator.ts`) computes competition-ranked `classPosition` in `O(n log n)` while preserving roll order; broadsheet CSV exports (`src/utils/export.ts`) rank `1st` → last without mutating inputs, and report card positions are untouched.
- `QuickGradebook` freezes row order/membership across edits via a synchronous two-tier `OrderSnapshot`, resolves keyboard/`Paste` by `student.id`, and surfaces `Order locked · Re-apply` only when live sort/filter diverges.
- Fixed iOS 27 Form Assistant `▼` row-skipping by switching gradebook inputs to `type="text" inputMode="numeric" pattern="[0-9]*"`, deferring `examDrafts` cleanup past `onBlur` via `setTimeout(..., 0)`, adding `Class only` / `Exam only` column-focus modes, stabilizing the header `Avg:` pill, and hiding `ValidationWarnings` in `GRADEBOOK` mode (`src/pages/Dashboard.tsx`).
- `Dashboard` keeps `QuickGradebook` mounted if a parent filter empties mid-entry and snapshots `ScoreEntryModal`'s `Prev`/`Next` queue on open.
- Verified after final edits: `npm run lint` (0), `npx tsc -b` (0), and `npm test -- --run --maxWorkers=2` (`46` files / `439` tests passed).
