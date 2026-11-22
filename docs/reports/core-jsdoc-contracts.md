# Core JSDoc Contracts & Repo Conventions Report

Branch: `docs/core-jsdoc-contracts` (branched from `feat/navigation-shell`)

## What Changed

### Commit 1 (`81fc359`) — `docs(conventions): add signal-only JSDoc guidelines for contributors and agents`

- Created `docs/jsdoc-conventions.md` defining Repota's signal-only JSDoc standard: document non-obvious domain invariants, score units, preconditions, `@throws` failure modes, `@deprecated` compatibility fields, and _why_, without duplicating TypeScript types or adding `eslint-plugin-jsdoc` boilerplate.
- Updated `docs/AGENTS.md` and `CONTRIBUTING.md` with concise pointers to `docs/jsdoc-conventions.md`.

### Commit 2 (`b24e7df`) — `docs(types): document domain units, invariants, and legacy fields`

- Added contract JSDoc in `src/types/index.ts` covering `ClassScoreComponent.score` scaling, `SavedSubject.classScore` and weighted `examScore` (stored on `0..examScoreMax` rather than raw `0..100`), `StudentRecord.id` (`demo-` prefix convention) and `pictureUrl` IndexedDB offloading (`idb-blob://`), `SchoolSettings` media fields/weighting/SBA mapping/`@deprecated` fee fields (`schoolGift`, `canteenFees`, `firstAidFees`), `showClassPosition` / `showSubjectPosition` `true` defaults, and `ProcessedSubject` / `ProcessedStudent` (`classPosition: "pending..."`, `aggregate: null` for KG).

### Commit 3 (`9f04ed1`) — `docs(domain): add contract JSDoc to grading, validation, score conversion, remarks, and export utils`

- `src/utils/gradeCalculator.ts`: documented `calculateGrade`, `isCoreSubject` (strict SHS Core Math / Integrated Science rules), `calculateAggregate`, `processStudent`, `assignPositions`, and `assignSubjectPositions` (competition tie-breaking and non-mutation).
- `src/utils/studentValidation.ts`: documented `hasNoScoresEntered`, `isStudentPending` (`0` treated as unentered), `hasPartialScores`, `isStudentFailing` (excludes pending students), `getScoredSubjectCounts`, `sortStudents` (`"DEFAULT"` returns original reference), and formatted existing union/filter wrapping to pass Prettier.
- `src/utils/scoreConversion.ts`: expanded JSDoc on non-finite coercion, `wasClamped` (`>` upper bound only), `formatExamWeightedAsRaw` returning `""` for `0` / `maxExamScore <= 0`, and SBA component proportional scaling.
- `src/utils/export.ts`: documented formula-prefix neutralization (`=`, `+`, `-`, `@`, `\t`, `\r`), `MOCK` vs `TERMLY` column collapsing, `PRIVATE` fee columns, and `@throws` preconditions.
- `src/utils/remarkGenerator.ts`: documented `generateTeacherRemark`, `generateHeadmasterRemark` promotional term rules, and `generateAttendanceRating` thresholds.

### Commit 4 — `docs(state): document backup rollback, context lifecycle, hook slices, print events, and report`

- `src/utils/backupValidation.ts`: documented `.passthrough()` schemas (`compatibleStudentSchema`, `structuralSettingsSchema`), `mergeSettings`, `IncompleteRollbackError`, two-tier `validateBackup`, and `importBackupAtomically` suspension/migration preconditions.
- `src/context/SchoolContextDefinition.ts`, `src/context/SchoolContext.tsx`, `src/hooks/useSchoolData.ts`: documented `SchoolActionsType` (`silent` flags, zero-score-only `deletePendingStudents`, persistence suspension, rollback markers, migration wait), `SchoolLifecycleType` flags, split-context isolation vs. `SchoolContext`, `SchoolProvider` startup/auto-lock/debounce behavior, and React 19 `use(SchoolContext)` fallback hooks.
- `src/context/SettingsFormContext.tsx` & `src/components/DataGate.tsx`: documented the `DataGate`-before-`SettingsFormProvider` mount-order invariant.
- `src/utils/printHandler.ts`: documented `PRINT_STARTED_EVENT` / `markPrintStarted` coordination with `AppContent` (`src/App.tsx`) and keyboard print timing.
- `src/utils/fileEncryption.ts`: removed the redundant type-repeating comment above internal `base64ToArray`.
- `docs/reports/core-jsdoc-contracts.md`: added this task report.

## Why

TypeScript enforces signatures cleanly, but critical bugs in Repota come from contracts outside the type system: weighted vs. raw `0–100` exam scores, `isStudentPending` treating `0` as unentered, `DataGate` needing to hydrate settings before `SettingsFormProvider` mounts, `importBackupAtomically` suspension/rollback requirements, and IndexedDB `idb-blob://` offloading. Documenting only these non-obvious invariants keeps signal high for engineers and AI agents without adding boilerplate comment debt.

## What Was Verified

- Diff audit (`git diff -U0 feat/navigation-shell -- src/`): confirmed zero runtime logic, Zod schema, storage key, or TypeScript signature changes across all 14 touched `src/` files (pure comment/JSDoc changes plus Prettier line-wrapping on pre-existing unions in `src/utils/studentValidation.ts`).
- `npx prettier --end-of-line auto --check` passed on `docs/jsdoc-conventions.md`, `docs/AGENTS.md`, `CONTRIBUTING.md`, `docs/reports/core-jsdoc-contracts.md`, and the 11 Prettier-clean `src/` files (`src/types/index.ts`, `gradeCalculator.ts`, `studentValidation.ts`, `scoreConversion.ts`, `export.ts`, `remarkGenerator.ts`, `SchoolContextDefinition.ts`, `SettingsFormContext.tsx`, `DataGate.tsx`, `useSchoolData.ts`, `printHandler.ts`).
- `npm run lint` (`eslint .`): exited `0` with no errors or warnings.
- `npx tsc -b`: exited `0`.
- `npm test -- --run --maxWorkers=2`: exited `0` — `Test Files  40 passed (40)`, `Tests  398 passed (398)` (0 skipped).

## What Could Not Be Verified

- `npx prettier --check` without `--end-of-line auto` flags CRLF working-tree checkouts on Windows (`core.autocrlf=true`) against `.prettierrc` (`endOfLine: "lf"`).
- Pre-existing unformatted code lines in `src/utils/backupValidation.ts`, `src/context/SchoolContext.tsx`, and `src/utils/fileEncryption.ts` were intentionally left untouched so diffs in those files remain strictly comment-only (`.github/workflows/ci.yml` does not run Prettier).
- No live browser session was launched because zero runtime code was modified.

## Summary for Reviewer

- Cut clean branch `docs/core-jsdoc-contracts` from `feat/navigation-shell` with 4 logical commits and zero runtime changes.
- Added signal-only JSDoc guidelines in `docs/jsdoc-conventions.md`, linked from `docs/AGENTS.md` and `CONTRIBUTING.md` (no `eslint-plugin-jsdoc` spam).
- Documented core score units, `demo-` / `idb-blob://` conventions, and `@deprecated` fee fields in `src/types/index.ts`.
- Documented GES grading/aggregate rules, pending/failing definitions, score clamping edge cases, CSV formula neutralization, and remark rules across core `src/utils/`.
- Documented two-tier backup validation, atomic rollback recovery, `SchoolProvider` lifecycle, `DataGate` -> `SettingsFormProvider` mount order, slice hooks, and `PRINT_STARTED_EVENT`.
- Verified `npm run lint` (0), `npx tsc -b` (0), and `npm test -- --run --maxWorkers=2` (`40` files / `398` tests passed).
