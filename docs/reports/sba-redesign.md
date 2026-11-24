# SBA Markbook Redesign & Bug Fixes Report (`feat/sba-redesign`)

Branched from `feat/navigation-shell` (`dc72ade`) after PR #66 (`feat/score-entry-modal-redesign`). Per scope decisions, A4 report card templates (`src/templates/*`), storage keys (`ges_v1_students`, `ges_v1_settings`), IndexedDB schemas, and `.repota` backup formats were left untouched.

## Summary for reviewer

- Rebuilt `/sba` (`SbaPage`) from a settings-only task mapper into an end-to-end **SBA Markbook** with multi-column desktop entry (plus 2D Excel paste), focused 1-thumb mobile task pills, GES onboarding presets, `SbaTaskManagerModal`, and `SbaWeightsModal`.
- Replaced manual two-step `"Sync Tasks to Students"` configuration with atomic `applySbaConfig` and `updateAssessmentWeights` context actions backed by `src/utils/sbaReconciliation.ts`.
- Fixed key SBA correctness bugs: per-subject `studentModified` spillover, unpropagated `category` edits/demo metadata, un-cascaded task library deletes, orphaned `detectComponentMismatches` misses, `calculateSbaCategoryMastery` zero-score inflation, Mock mode leakage, and missing weight-change rescaling.
- Aligned `QuickGradebook`, `SubjectRow`, `ScoreImportModal`, `SettingsHub`, `Dashboard`, and `docs/analytics-events.md` with the SBA Markbook flow.
- Verification after final edits: `npm run lint`, `npx tsc -b`, `npm run build`, and `npm test -- --run --maxWorkers=2` (`49` test files, `483` tests) all passed with zero errors.

## What Changed

### 1. SBA Reconciliation Engine, Presets, Weight Rescaling & Export (`3342643`)
- Added `src/utils/sbaReconciliation.ts`:
  - `SBA_PRESETS`, `WEIGHT_PRESETS`, `normalizeTaskKey`, `deriveLibraryFromSubjectMap`, `areSubjectsUsingUniformTasks`, `reconcileStudentsWithSbaConfig` (`renamedTasks` score preservation + `onClearTasks: "preserve_class_score" | "zero"`), `impactOfSbaTaskChange`, `countAffectedStudentsForWeightChange`, `rescaleStudentsForWeightChange`, `calculateSbaPaceStats`, and `isStudentUnscoredForSba`.
- Updated `src/utils/csvImport.ts`: added `"rawtotal"` and `"sbapace"` to `DERIVED_EXPORT_HEADERS` so re-importing SBA sheets does not create phantom SBA tasks, and added `buildSubjectSbaExportCsv`.
- Updated `src/utils/analyticsCalculator.ts`: `calculateSbaCategoryMastery` now skips `comp.score <= 0` so ungraded mid-term tasks do not skew category mastery percentages downward.
- Updated `src/utils/analytics.ts`: added `"sba_markbook"` to `ScoreEntryMode`.

### 2. Atomic `SchoolContext` & Settings Bug Fixes (`1e6f012`)
- `src/context/SchoolContextDefinition.ts` & `src/context/SchoolContext.tsx`:
  - Added atomic `applySbaConfig` and `updateAssessmentWeights` actions.
  - Fixed `detectComponentMismatches` (detects orphaned `classScoreComponents` when `subjectComponentMap` is empty, checks `category` drift, skips in `MOCK` mode).
  - Rewrote `syncSubjectComponentsFromSettings` via `reconcileStudentsWithSbaConfig` (fixing per-student modification spillover, React state batching reliance on closure counts, and preserving `classScore` when clearing tasks).
  - Preserved `category` metadata on SBA tasks in `loadDemoData`.
- `src/context/SettingsFormContextDefinition.ts` & `src/context/SettingsFormContext.tsx`:
  - Wired `removeFromLibrary` and `unassignFromSubject` (`src/utils/componentRegistry.ts`) into `confirmDeleteComponent` and `confirmDeleteSubject`.
  - Pruned `subjectComponentMap` when changing levels in `applyLevelChange`.
  - Updated `flushPendingSave()` to return committed `SchoolSettings`.
- `src/components/settings/SbaAssessmentSection.tsx` & `src/components/settings/AcademicSessionSection.tsx`:
  - Gated `showSubjectAssignment` under `showSbaSetup` (hidden in `MOCK` mode), clamped weight inputs cleanly to `0..100`, and linked Academic Settings directly to `/sba` (`"Open SBA Markbook →"`).

### 3. SBA Markbook UI on `/sba` (`26364fb`)
- Created `src/components/sba/SbaPresetOnboardingCard.tsx`, `SbaTaskManagerModal.tsx`, `SbaWeightsModal.tsx`, and `SbaMarkbookGrid.tsx`.
- Rebuilt `src/pages/SbaPage.tsx` with:
  - Compact `PageHeader` (`hideOnDesktop`, `sticky={false}`), `SettingsStatusBanners`, clickable weight/mode pill (`Termly · 50/50` / `Mock · 0/100`), `Manage Tasks`, `Import CSV`, and `Export SBA CSV`.
  - Dedicated `MOCK` mode paused state with one-click `Switch to Termly Mode` while keeping SBA configs and raw marks intact.
  - Safety-net legacy drift banner (`Reconcile Tasks`) without requiring a routine manual sync step.
  - Multi-column desktop markbook table (with live `Raw`, proportional `Class`, mid-term `pace`, vertical/2D Excel paste, inline `maxScore` clamp feedback, `Add Subject`) and responsive 1-thumb mobile task pills (`Summary` view included).

### 4. Cross-App Integrations & Documentation (`5b9ca70`)
- `src/components/QuickGradebook.tsx`: resolves SBA tasks via `resolveSubjectSbaTasks`, uses `crypto.randomUUID()` and preserves `category` on `Add Subject`, links to `/sba` (`SBA Markbook`), and adds a clickable `{classScore}/{maxClassScore} · SBA` control in `CLASS_EXAM` mode to focus the student's first SBA task input.
- `src/components/SubjectRow.tsx`: displays mid-term graded count & pace (`{gradedTasks}/{totalTasks} graded · {pacePercent}% pace`) in the SBA Breakdown drawer when partially graded.
- `src/components/sba/SbaMarkbookGrid.tsx`: added `scroll-mt-24 scroll-mb-40` on the mobile score input for iOS virtual keyboard clearance.
- `src/pages/settings/SettingsHub.tsx`, `src/components/ScoreImportModal.tsx`, `src/pages/Dashboard.tsx`, `docs/analytics-events.md`: updated SBA Markbook descriptions, `deriveLibraryFromSubjectMap` derivation, and documented `"sba_markbook"` and `"sba_sheet_csv_export"` analytics events.

### 5. Automated Tests & Post-QA Refinement
- Created `src/test/sbaReconciliation.test.ts` (`8` unit tests with multiple cases covering reconciliation, renames, clearing policies, weight rescaling vs clamping, impact counts, mid-term pace, task-scoped unscored resolution, registry cascade operations, and SBA CSV round-trip).
- Rewrote `src/test/SbaWorkflow.test.tsx` (`7` end-to-end integration tests covering preset onboarding, multi-column scoring & telemetry, 2D paste, Task Manager CRUD/rename/shrink confirmation/delete/per-subject override, weight clamping & `50/50 -> 30/70` rescaling + Mock toggle, SBA CSV export/import round-trip, and mid-term task-scoped `Unscored only` + `Refresh list`).
- Updated `src/test/NavigationShell.test.tsx`, `src/test/SettingsSubRoutes.test.tsx`, `src/test/analyticsCalculator.test.ts`, `src/test/SchoolContextActions.test.tsx`, `src/test/ScoreImportAndGradebook.test.tsx`, `src/test/FeatureAdoptionAnalytics.test.tsx`, `src/test/FunnelAndReliabilityAnalytics.test.tsx`, and `src/test/PrintPreviewAnalytics.test.tsx`.
- **Post-QA refinement (`Unscored only` mid-term filter):** Manual testing on Draft PR #67 caught that mid-term classes with only one task graded (`CAT 1`) saw zero rows filtered out when clicking `Unscored only`, because unstarted future tasks (`0`) matched every student. Added `targetTaskName` support + `resolveDefaultUnscoredTaskTarget` in `src/utils/sbaReconciliation.ts`, a `Filter unscored by task` selector (`Any missing task` or `Missing <Task>`) + `Refresh list` banner + mobile pill sync in `src/pages/SbaPage.tsx` and `src/components/sba/SbaMarkbookGrid.tsx`.

## Why
Teachers previously had to understand library vs per-subject mapping vs `"Sync Tasks to Students"` manually, which hid SBA entry behind configuration boilerplate and left edge cases (stale categories, leaked cross-subject dirty state, unscaled weights, and Mock-mode leakage). Consolidating SBA configuration and continuous score entry into one `/sba` markbook with automatic atomic reconciliation eliminates setup friction while keeping persisted schemas intact.

## Verification Results

All checks below ran cleanly after the final code & test edits:

| Check | Command | Result |
| --- | --- | --- |
| ESLint | `npm run lint` | Passed (exit `0`, 0 errors, 0 warnings) |
| TypeScript build check | `npx tsc -b` | Passed (exit `0`) |
| Production build | `npm run build` | Passed (`tsc -b && vite build`, exit `0`, 2858 modules transformed, PWA SW generated) |
| Full Vitest test suite | `npm test -- --run --maxWorkers=2` | Passed (`49` test files, `483` tests passed, `0` failed, `0` skipped) |
| User Vercel QA (PR #67) | Manual desktop/mobile QA | Passed `T1–T6`, `T7` (bar `Step 3` on `Analytics -> Subjects` pending re-check), `T8b–T8c`; `T8a` reported bug fixed cleanly |

## What Could Not Be Verified
- User re-verification of `T7` Step 3 (`Analytics -> Subjects -> SBA Task Category Mastery (%)`) and `T8a` (`Unscored only` mid-term task filter) on the updated Vercel preview deployment after this fix commit.
