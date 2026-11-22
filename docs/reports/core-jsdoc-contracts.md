# Core JSDoc Contracts & Repo Conventions Report

Branch: `docs/core-jsdoc-contracts` (rebased onto `feat/navigation-shell` at `b6ef863` after PR #62 merged)

## What Changed

### Commit 1 (`128809f`) — `docs(conventions): add signal-only JSDoc guidelines for contributors and agents`

- Created `docs/jsdoc-conventions.md` defining Repota's signal-only JSDoc standard: document non-obvious domain invariants, score units, preconditions, `@throws` failure modes, `@deprecated` compatibility fields, and _why_, without duplicating TypeScript types or adding `eslint-plugin-jsdoc` boilerplate.
- Updated `docs/AGENTS.md` and `CONTRIBUTING.md` with concise pointers to `docs/jsdoc-conventions.md`.

### Commit 2 (`c417909`) — `docs(types): document domain units, invariants, and legacy fields`

- Added contract JSDoc in `src/types/index.ts` covering `ClassScoreComponent.score` scaling, `SavedSubject.classScore` and weighted `examScore` (stored on `0..examScoreMax` rather than raw `0..100`), `StudentRecord.id` (`demo-` prefix convention) and `pictureUrl` IndexedDB offloading (`idb-blob://`), `SchoolSettings` media fields/weighting/SBA mapping/`@deprecated` fee fields (`schoolGift`, `canteenFees`, `firstAidFees`), `showClassPosition` / `showSubjectPosition` `true` defaults, and `ProcessedSubject` / `ProcessedStudent` (`classPosition: "pending..."`, `aggregate: null` for KG).

### Commit 3 (`19ce8c0`) — `docs(domain): add contract JSDoc to grading, validation, score conversion, remarks, and export utils`

- `src/utils/gradeCalculator.ts`: documented `calculateGrade`, `isCoreSubject` (strict SHS Core Math / Integrated Science rules), `calculateAggregate`, `processStudent`, `assignPositions`, and `assignSubjectPositions` (competition tie-breaking and non-mutation).
- `src/utils/studentValidation.ts`: documented `hasNoScoresEntered`, `isStudentPending` (`0` treated as unentered), `hasPartialScores`, `isStudentFailing` (excludes pending students), `getScoredSubjectCounts`, `sortStudents` (`"DEFAULT"` returns original reference), and formatted existing union/filter wrapping to pass Prettier.
- `src/utils/scoreConversion.ts`: expanded JSDoc on non-finite coercion, `wasClamped` (`>` upper bound only), `formatExamWeightedAsRaw` returning `""` for `0` / `maxExamScore <= 0`, and SBA component proportional scaling.
- `src/utils/export.ts`: documented formula-prefix neutralization (`=`, `+`, `-`, `@`, `\t`, `\r`), `MOCK` vs `TERMLY` column collapsing, `PRIVATE` fee columns, and `@throws` preconditions.
- `src/utils/remarkGenerator.ts`: documented `generateTeacherRemark`, `generateHeadmasterRemark` promotional term rules, and `generateAttendanceRating` thresholds.

### Commit 4 (`a1ce009`) — `docs(state): document backup rollback, context lifecycle, hook slices, print events, and report`

- `src/utils/backupValidation.ts`: documented `.passthrough()` schemas (`compatibleStudentSchema`, `structuralSettingsSchema`), `mergeSettings`, `IncompleteRollbackError`, two-tier `validateBackup`, and `importBackupAtomically` suspension/migration preconditions.
- `src/context/SchoolContextDefinition.ts`, `src/context/SchoolContext.tsx`, `src/hooks/useSchoolData.ts`: documented `SchoolActionsType` (`silent` flags, zero-score-only `deletePendingStudents`, persistence suspension, rollback markers, migration wait), `SchoolLifecycleType` flags, split-context isolation vs. `SchoolContext`, `SchoolProvider` startup/auto-lock/debounce behavior, and React 19 `use(SchoolContext)` fallback hooks.
- `src/context/SettingsFormContext.tsx` & `src/components/DataGate.tsx`: documented the `DataGate`-before-`SettingsFormProvider` mount-order invariant.
- `src/utils/printHandler.ts`: documented `PRINT_STARTED_EVENT` / `markPrintStarted` coordination with `AppContent` (`src/App.tsx`) and keyboard print timing.
- `src/utils/fileEncryption.ts`: removed the redundant type-repeating comment above internal `base64ToArray`.
- `docs/reports/core-jsdoc-contracts.md`: added this task report.

### Commit 5 (`3c4c07a`) — `docs(agents): add current root AGENTS.md with architecture and JSDoc invariants`

- Created `AGENTS.md` at repository root capturing current hard rules (storage keys/IDB stores/backup formats, `npm`/`npx`-only, zero-PII/session-replay boundary, JSDoc standard), verified provider/route hierarchy (`SchoolProvider` -> `AppContent` -> `RouterProvider`, `DataGate` -> `SettingsFormProvider` mount order, `/print` outside `AppShell`), domain units (`examScore` weighting, pending/failing definitions, `demo-` prefix, `@deprecated` fees), and test/commit/report workflow.
- Replaced duplicate rules in `docs/AGENTS.md` with a canonical pointer to `../AGENTS.md` and updated the link in `docs/jsdoc-conventions.md` so rules stay single-source-of-truth.

### Commit 6 — `docs(agents): add PostHog telemetry invariants to root AGENTS.md after PR #62`

- Rebased cleanly onto `feat/navigation-shell` (`b6ef863`, PR #62 merge commit) with zero conflicts.
- Added the **Analytics** hard rule to `AGENTS.md` documenting `captureEvent` (`src/utils/analytics.ts`), production host gating (`src/utils/analyticsEnv.ts`: `repota.app`, `www.repota.app`, `repota.vercel.app`), zero-PII SHA-256 report deduplication (`src/utils/reportAnalytics.ts`), and `docs/analytics-events.md` maintenance.

## Why

TypeScript enforces signatures cleanly, but critical bugs in Repota come from contracts outside the type system: weighted vs. raw `0–100` exam scores, `isStudentPending` treating `0` as unentered, `DataGate` needing to hydrate settings before `SettingsFormProvider` mounts, `importBackupAtomically` suspension/rollback requirements, IndexedDB `idb-blob://` offloading, and zero-PII production-only PostHog telemetry. Documenting only these non-obvious invariants — and placing the canonical `AGENTS.md` at repository root — ensures both engineers and future coding agents discover and follow these rules automatically.

## What Was Verified

- Diff audit (`git diff -U0 feat/navigation-shell -- src/`): confirmed zero runtime logic, Zod schema, storage key, or TypeScript signature changes across all 14 touched `src/` files (pure comment/JSDoc changes plus Prettier line-wrapping on pre-existing unions in `src/utils/studentValidation.ts`).
- `npx prettier --end-of-line auto --check` passed on `AGENTS.md`, `docs/jsdoc-conventions.md`, `docs/AGENTS.md`, `CONTRIBUTING.md`, `docs/reports/core-jsdoc-contracts.md`, and the 11 Prettier-clean `src/` files (`src/types/index.ts`, `gradeCalculator.ts`, `studentValidation.ts`, `scoreConversion.ts`, `export.ts`, `remarkGenerator.ts`, `SchoolContextDefinition.ts`, `SettingsFormContext.tsx`, `DataGate.tsx`, `useSchoolData.ts`, `printHandler.ts`).
- `npm run lint` (`eslint .`): exited `0` with no errors or warnings (re-run after PR #62 rebase and root `AGENTS.md` update).
- `npx tsc -b`: exited `0` (re-run after PR #62 rebase and root `AGENTS.md` update).
- `npm test -- --run --maxWorkers=2`: exited `0` — `Test Files  46 passed (46)`, `Tests  429 passed (429)` (0 skipped; re-run on rebased branch including PR #62 analytics tests).

## What Could Not Be Verified

- `npx prettier --check` without `--end-of-line auto` flags CRLF working-tree checkouts on Windows (`core.autocrlf=true`) against `.prettierrc` (`endOfLine: "lf"`).
- Pre-existing unformatted code lines in `src/utils/backupValidation.ts`, `src/context/SchoolContext.tsx`, and `src/utils/fileEncryption.ts` were intentionally left untouched so diffs in those files remain strictly comment-only (`.github/workflows/ci.yml` does not run Prettier).
- No live browser session was launched because zero runtime code was modified.

## Summary for Reviewer

- Rebased `docs/core-jsdoc-contracts` cleanly onto `feat/navigation-shell` (`b6ef863`, PR #62 merged) across 6 logical commits with zero runtime changes.
- Added signal-only JSDoc guidelines in `docs/jsdoc-conventions.md`, promoted canonical `AGENTS.md` to repository root (covering storage/backup safety, privacy/analytics, architecture/mount-order, and JSDoc rules), and updated `CONTRIBUTING.md` / `docs/AGENTS.md`.
- Documented core score units, `demo-` / `idb-blob://` conventions, and `@deprecated` fee fields in `src/types/index.ts`.
- Documented GES grading/aggregate rules, pending/failing definitions, score clamping edge cases, CSV formula neutralization, and remark rules across core `src/utils/`.
- Documented two-tier backup validation, atomic rollback recovery, `SchoolProvider` lifecycle, `DataGate` -> `SettingsFormProvider` mount order, slice hooks, and `PRINT_STARTED_EVENT`.
- Verified `npm run lint` (0), `npx tsc -b` (0), and `npm test -- --run --maxWorkers=2` (`46` files / `429` tests passed).
