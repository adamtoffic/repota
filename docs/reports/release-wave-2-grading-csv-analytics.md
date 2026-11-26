# Release Hardening Wave 2 — Grading Math, SBA, CSV/Paste & Analytics Integrity

Branch: `fix/release-grading-csv-analytics` (merged `--no-ff` into `feat/navigation-shell`)  
Audit coverage: **P0-3, P0-4, P0-5, P1-8 through P1-22, and P2-19 through P2-24**

---

## What Changed

### 1. CSV Parser, Excel Paste & Export Security (P0-3, P0-4, P0-5, P2-24)
- [tabularParser.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/csv/tabularParser.ts): Replaced lossy digit stripping in `parseOptionalNumber` with strict numeric/currency/percentage matching so strings like `"Absent"`, `"N/A"`, `"Gender"`, `"12/15"`, and `"2015-03-14"` return `undefined`; restricted `inQuotes` activation in `parseTabularText` to cell-start quotes so mid-cell quotes do not swallow subsequent rows.
- [gradebookHelpers.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/components/gradebook/gradebookHelpers.ts), [QuickGradebookRow.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/gradebook/QuickGradebookRow.tsx), and [sbaGridHelpers.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/components/sba/sbaGridHelpers.ts): Preserved internal blank lines and missing-subject row offsets during multi-line Excel paste while trimming only trailing blank lines; unified SBA task matching on `normalizeTaskKey` and used `resolveExamRawScore` for `EXAM_ONLY` averages.
- [analyticsExport.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/analyticsExport.ts) and [export.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/export.ts): Escaped all CSV headers and cells against formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`) and switched `exportAnalyticsData` to deferred cleanup via `downloadBlob`.

### 2. Score Precision, SBA Weight Bounds & Entry UX (P1-8, P1-10, P1-11, P1-12, P1-20, P1-21, P2-19..21)
- [scoreConversion.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/scoreConversion.ts), [sbaReconciliation.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/sbaReconciliation.ts), [sbaCsvParser.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/csv/sbaCsvParser.ts), and [scoreImportApply.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/components/import/scoreImportApply.ts): Switched scaling arithmetic to multiply-before-divide to avoid IEEE-754 drift (`29/100 * 50 -> 15`, `57/100 * 50 -> 29`), rounded raw component sums to 2 decimal places, and always cleared stale `examRawScore` in `clamp` mode.
- [studentValidation.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/studentValidation.ts) and [schoolStudentMutations.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/context/school/schoolStudentMutations.ts): Preserved students with stashed Termly `savedDirectClassScore` or `classScoreComponents` in `hasNoScoresEntered` / `filterActiveNonPendingStudents`; stripped `savedDirectClassScore`, `savedDirectClassScoreMax`, and `examRawScore` in `clearStudentSubjectScores`; clamped `TERMLY` weights to `1..90` Class / `10..99` Exam.
- [SbaWeightsModal.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/sba/SbaWeightsModal.tsx), [SbaTaskManagerModal.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/sba/SbaTaskManagerModal.tsx), and [demoData.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/demoData.ts): Added `TERMLY` weight split validation in `SbaWeightsModal`; checked `replace_all` impact when deleting a task in `"All Subjects"` scope across divergent subject configs; guarded `settings.classScoreMax > 0` in `createDemoStudents`.
- [SubjectRow.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/SubjectRow.tsx), [QuickGradebookRow.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/gradebook/QuickGradebookRow.tsx), and [SbaMarkbookGrid.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/sba/SbaMarkbookGrid.tsx): Added blur-settled decimal draft states (`"12."`, `"12.0"`) and switched score inputs to `inputMode="decimal"`.

### 3. Score/Roster Import Deduplication & Attendance Semantics (P1-9, P1-19, P1-22)
- [scoreImportApply.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/components/import/scoreImportApply.ts), [sbaCsvParser.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/csv/sbaCsvParser.ts), and [BulkImportModal.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/BulkImportModal.tsx): Protected direct-mode `classScore` values from being zeroed by SBA sync/import rows without SBA entries, synchronized preview vs apply math, deduplicated duplicate CSV rows, honored live `KEEP_EXISTING` across duplicates, and kept `attendancePresent` `undefined` when omitted.
- [DetailsTab.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/tabs/DetailsTab.tsx), [remarkGenerator.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/remarkGenerator.ts), and [remarksBatch.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/remarksBatch.ts): Kept unentered `attendancePresent` as `undefined` without penalizing `EXCELLENT` teacher remarks.

### 4. GES Grading & Analytics Integrity (P1-13..P1-18, P2-23)
- [gradeCalculator.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/gradeCalculator.ts), [SchoolContext.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/context/SchoolContext.tsx), and [insightsAndSba.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/analytics/insightsAndSba.ts): Exported `isCoreSubject` excluding elective lookalikes (`Literature in English`, `Computer Science`, `Agricultural Science`, `Additional/Elective Math`), deduplicated canonical core slots, required 6 subjects for aggregate calculation, kept incomplete/unscored students at `"Pending..."` in `assignPositions`, left unscored `0` subject positions `undefined` in `assignSubjectPositions`, and scoped `calculateSbaVsExamAnalysis` to `classScore > 0 && examScore > 0`.
- [classStoryGenerator.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/classStoryGenerator.ts), [Analytics.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/pages/Analytics.tsx), [AnalyticsOverviewTab.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/analytics/AnalyticsOverviewTab.tsx), [AnalyticsInsightsTab.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/analytics/AnalyticsInsightsTab.tsx), [demographicsAndDistribution.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/analytics/demographicsAndDistribution.ts), and [AnalyticsDemographicsTab.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/analytics/AnalyticsDemographicsTab.tsx): Returned empty-score stories for all-ungraded rosters, projected `filteredStudents` subjects when filtering Analytics by subject, passed exact pass/excellence counts to Overview stat cards, required both genders before surfacing gender gap comparisons/recommendations, fixed small-class quartile classification, and un-nested `Performance by Age Group`.

---

## Why
Audit tracks identified silent zero-coercion on text cells, clipboard row shifting across absent/missing-subject students, CSV formula injection vectors, IEEE-754 half-mark rounding drops, over-broad GES core subject substring matching, inflated aggregates on fewer than 6 subjects, misleading gender gap cards on single-sex cohorts, and un-scoped subject analytics.

---

## Verification
All checks ran after final code and test edits:
- `npm run lint`: **Passed** (0 errors, 0 warnings).
- `npx tsc -b`: **Passed** (0 errors).
- `npx vitest run --maxWorkers=2`: **63 test files / 580 tests passed**, including new regression suites [ReleaseWave2GradingAndCsv.test.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/test/ReleaseWave2GradingAndCsv.test.ts) and [ReleaseWave2AnalyticsAndUi.test.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/test/ReleaseWave2AnalyticsAndUi.test.tsx).
- `npm run build`: **Passed** (`15.92s`, 60 precache entries).
- `npm run test:e2e`: **9 / 9 Playwright Chromium tests passed** (`43.3s`).

## What Could Not Be Verified
- Physical iOS Safari soft-keyboard decimal key rendering (`inputMode="decimal"`) was verified via DOM attribute & event tests rather than a physical iPhone device (desktop Playwright Chromium used for E2E).

---

## Summary for reviewer
Wave 2 resolves P0-3..P0-5, P1-8..P1-22, and P2-19..P2-24 across CSV parsing/exports, Excel paste alignment, IEEE-754 grading math, SBA weight/task bounds, import deduplication, GES core/aggregate rules, ranking completeness, attendance semantics, and Analytics scoping. Existing assertions in `GoldenGradingAndCsvFuzz.test.ts`, `analyticsCalculator.test.ts`, and `ScoreEntryUX.test.tsx` were aligned with strict 6-subject aggregates, `Pending...` unscored ranks, and `inputMode="decimal"`, and 15 new regression tests verify every bug fix. Full `eslint`, `tsc -b`, Vitest (63 files, 580 tests), Vite build, and Playwright E2E (9/9) pass cleanly.
