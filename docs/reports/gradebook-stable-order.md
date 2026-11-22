# Quick Gradebook Stable Ordering & Broadsheet Export Ranking Report

Branch: `fix/gradebook-stable-order` (branched off `feat/navigation-shell` at `8c7cf46`)

## What Changed

- `src/utils/gradeCalculator.ts`: Refactored `assignPositions()` to compute competition-ranked `classPosition` ordinals (`1st`, `1st`, `3rd`) in `O(n log n)` via an `ordinalByScore` lookup map and map back over the input array, preserving input roll order (matching `assignSubjectPositions()`). Updated the `assignPositions` JSDoc contract.
- `src/utils/export.ts`: Added `parsePositionRank` and `sortStudentsByClassPosition` so `exportToCSV()` and `exportDetailedBroadsheetCSV()` explicitly export rows ordered by `classPosition` (`1st` → last) without mutating the caller's `students` array, and updated their JSDoc contracts. Register/template exports (`Export Student Roll (.txt)`, Quick Gradebook subject/task CSV exports, `ScoreImportModal` templates) and `PrintPreview` remain in Roll Order.
- `src/components/QuickGradebook.tsx`: Replaced `pinnedStudentIds` with a unified two-tier synchronous render-time `OrderSnapshot` (`scopeSnapshot` + `visibleSnapshot`), added optional `allStudents`, `sessionKey`, and `onClearParentFilters` props, surfaced a conditional `Order locked · Re-apply` header action only when live sort/filter diverges from the locked snapshot, resolved keyboard `Enter`/`ArrowDown`/`ArrowUp` focus and vertical Excel paste by `student.id`, and added a clean parent-filter empty state.
- `src/pages/Dashboard.tsx`: Snapshotted `ScoreEntryModal`'s `Prev`/`Next` navigation queue (`modalStudentQueueIds`) on open while resolving live student records via `studentsById`, passed `allStudents`, `sessionKey`, and `onClearParentFilters` to `QuickGradebook`, prevented unmounting `QuickGradebook` mid-entry when `filteredStudents.length === 0`, and kept `AddStudentModal` mounted in `GRADEBOOK` mode.
- Regression tests added across `src/test/gradeCalculator.test.ts` (roll-order preservation in `assignPositions`), `src/test/export.test.ts` (`exportToCSV` ranking without mutation), `src/test/ClassTools.test.tsx` (`exportDetailedBroadsheetCSV` ranking without mutation), and `src/test/ScoreEntryUX.test.tsx` (Roll Order arrow/Enter focus navigation, `AVG_DESC` lock + `Order locked · Re-apply`, multi-digit typing under `NO_SCORES`, multi-column Excel paste alignment, and `Dashboard` integration with `ScoreEntryModal` `Next` + `QuickGradebook`).

## Why

`SchoolContext.tsx` computes `processedStudents` on every keystroke by calling `assignPositions()`, which previously sorted and returned `[...students]` descending by `averageScore`. That silently defeated `"Sort: Roll Order"` (`DEFAULT`), reversed student row indices mid-entry (causing `ArrowDown`/`Enter` after Student B overtook Student A to jump back to Student A), and risked misaligning consecutive Excel column pastes. Separately, active score-dependent Dashboard sorts (`AVG_DESC`, `AVG_ASC`, `INCOMPLETE_FIRST`) and filters (`PENDING`, `NO_SCORES`, `PARTIAL_SCORES`, `FAILING`) could jump or unmount rows mid-keystroke and shift `ScoreEntryModal`'s `Prev`/`Next` queue. Separating rank calculation from array order, sorting broadsheets explicitly at export time, and locking interactive entry order via session snapshots fixes all three failure modes without altering report card positions or adding re-render lag.

## What Was Verified

- `npm run lint` (`eslint .`): exited `0` with zero warnings or errors after final code/test edits.
- `npx tsc -b`: exited `0` after final code/test edits.
- `npm test -- --run --maxWorkers=2`: exited `0` — `Test Files  46 passed (46)`, `Tests  436 passed (436)` (0 skipped), including all new unit and `Dashboard` integration tests.

## What Could Not Be Verified

- No live browser or manual interactive UI session was run; all DOM focus, paste, sorting, filtering, and modal navigation flows were verified under Vitest + `happy-dom`.

## Summary for reviewer

- Root cause fixed: `assignPositions()` (`src/utils/gradeCalculator.ts`) now populates competition-ranked `classPosition` in `O(n log n)` while preserving input roll order, matching `assignSubjectPositions()`.
- Individual report card `classPosition` and `subjectPosition` values are completely untouched; broadsheet CSV exports (`exportToCSV`, `exportDetailedBroadsheetCSV`) explicitly rank rows `1st` → last without mutating inputs.
- `QuickGradebook` freezes row membership and order across score edits via a synchronous two-tier `OrderSnapshot`, resolves keyboard arrows/`Enter` and column paste by `student.id`, and shows `Order locked · Re-apply` only when an active sort/filter diverges.
- `Dashboard` keeps `QuickGradebook` mounted if a parent filter empties mid-typing and snapshots `ScoreEntryModal`'s `Prev`/`Next` queue on open.
- Verified with `npm run lint` (0), `npx tsc -b` (0), and `npm test -- --run --maxWorkers=2` (`46` test files / `436` tests passed).
