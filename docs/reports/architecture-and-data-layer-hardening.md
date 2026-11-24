# Architecture & Core Data-Layer Hardening Report

**Branch:** `feat/navigation-shell` (5 incremental topic branches merged `--no-ff` atop `e68f22b`, plus lockfile sync `3679ae8`)  
**Merge sequence:**
1. `0809b6e` / `b743fbf` — `fix(persistence): ensure honest save status, flush lifecycle, atomic resets, and storage-aware checks` (Branch 1; followed by `3679ae8` syncing `package-lock.json` for `zod`)
2. `1e4157a` / `159cfec` — `fix(domain): harden mock readiness, atomic batching, boundary sanitization, and analytics intervals` (Branch 2)
3. `384c613` / `697c530` — `refactor(storage): serialize IDB writes, add cross-tab sync, preserve raw exam precision, and unify task keys` (Branch 3)
4. `16967a1` / `2b29c9e` — `refactor(context): adopt slice hooks, fast settings equality, shared blob download, and extract helpers` (Branch 4)
5. `c2de72b` / `149a883` — `refactor(perf): lazy-load and decompose Analytics, optimize ranking and SBA grid, remove dead code` (Branch 5)

---

## 1. What Changed

### Branch 1 — Persistence Honesty, Flush Lifecycle & Storage-Aware Capacity
- **`src/context/SchoolContextDefinition.ts` & `src/context/SchoolContext.tsx`:** Added `saveError` to `SchoolLifecycleType` and `flushPendingWrites` to `SchoolActionsType` so persistence failures surface honestly instead of marking failed writes as saved, and routes/exports can flush debounced edits synchronously on unmount, page lifecycle transitions, or backup export. Hardened reset/clear/recovery transitions against partial writes and timer races.
- **`src/context/SettingsFormContext.tsx`:** Synchronized form flush lifecycle with persistence checks.
- **`src/components/navigation/AppShell.tsx` & `src/components/ScoreEntryModal.tsx`:** Wired `saveError` from `useSchoolLifecycle()` into `AutoSaveIndicator` and `ModalSaveStatus`.
- **`src/components/DataBackup.tsx`:** Flushes `settingsFormCtx?.flushPendingSave()` and `await flushPendingWrites?.()` prior to reading storage for export.
- **`src/utils/dataProtection.ts` & `src/utils/storageMonitor.ts` & `src/components/ImageUploader.tsx`:** Made `detectDataLoss()` and `getStorageWarningLevel()` storage-type aware (`indexeddb` vs `localstorage`) and added `getAsyncStorageWarningLevel()` using `navigator.storage.estimate()`, eliminating bogus 5 MB `localStorage` capacity blocks/false positives under IndexedDB.
- **`src/utils/idbStorage.ts`:** Checked both `STUDENTS` and `SETTINGS` during `migrateFromLocalStorage()`, cleaned up legacy `localStorage` keys after IndexedDB migration, and recorded `repota_idb_migrated`.
- **`package.json` (`0809b6e`) & `package-lock.json` (`3679ae8`):** Fixed a pre-existing phantom runtime dependency where `src/schemas/studentSchema.ts` imported `"zod"` while `zod@4.5.4` was only present in `package-lock.json` as a transitive `"dev": true` dependency via `eslint-plugin-react-hooks`. Declared `"zod": "^4.5.4"` in `package.json` `dependencies`, synced `package-lock.json` (`packages[""].dependencies`), and cleared `"dev": true` on `packages["node_modules/zod"]`.
- **Tests added/updated:** `src/test/PersistenceIntegrity.test.tsx`, `src/test/DataProtectionAndStorageMonitor.test.ts`, and updates across existing context/workflow tests.

### Branch 2 — Domain Integrity, Atomic Batching & Analytics Correctness
- **`src/utils/studentSanitizer.ts` (new):** Centralized boundary student sanitization (clamping scores, normalizing IDs/fields, removing invalid subject structures) enforced across CSV import (`src/utils/csvImport.ts`), bulk import/UI mutations (`src/context/SchoolContext.tsx`), and score import (`src/components/ScoreImportModal.tsx`).
- **`src/utils/studentValidation.ts` & `src/components/StudentList.tsx`:** Hardened mock readiness and pending/failing edge-case checks (`isStudentPending`).
- **`src/utils/gradeCalculator.ts` & `src/utils/analyticsCalculator.ts`:** Replaced rough age approximation with exact `calculateAgeFromDob`, switched analytics score/average buckets to half-open float intervals without double rounding, and reused `ProcessedStudent` calculations across analytics aggregations.
- **`src/utils/remarkGenerator.ts` & report templates (`ClassicTemplate.tsx`, `ExecutiveTemplate.tsx`, `MinimalTemplate.tsx`, `ModernTemplate.tsx`, `OriginalTemplate.tsx`, `PrivateSchoolReport.tsx`):** Made `generateHeadmasterRemark` deterministic/seeded cleanly and wrapped templates with `React.memo`.
- **`src/context/SchoolContext.tsx`, `src/components/BulkAttendanceModal.tsx`, `src/components/BulkPromotionModal.tsx`, `src/components/BulkImportModal.tsx`, `src/pages/Dashboard.tsx`:** Added `batchUpdateStudents` and `syncClassSubjectsAndSba` so multi-student edits and subject/SBA synchronizations execute atomically in a single state/persistence pass instead of cascading N separate updates.
- **Tests added:** `src/test/DomainIntegrity.test.tsx` (6 tests).

### Branch 3 — Serialized IndexedDB Queue, Cross-Tab Sync, Raw Score Precision & Task Keys
- **`src/utils/idbStorage.ts` & `src/context/SchoolContext.tsx`:** Added a serialized `enqueueWrite` promise queue, single-open `initStorage` connection deduplication with automatic `InvalidStateError` reconnect (`runWithIdbReconnect`), and `BroadcastChannel("repota-storage-sync")` + `subscribeToStorageSync` wired into `SchoolContext.tsx` (plus test mock updates across test suites).
- **`src/types/index.ts`, `src/schemas/studentSchema.ts`, `src/utils/scoreConversion.ts`, `src/components/SubjectRow.tsx`, `src/components/QuickGradebook.tsx`, `src/components/ScoreImportModal.tsx`:** Preserved lossless raw exam entry (`SavedSubject.examRawScore`) and unscaled direct class overrides (`savedDirectClassScore`, `savedDirectClassScoreMax`), adding `resolveExamRawScore` and `getExamRawDisplayValue` to stop weighted->raw->weighted conversion drift.
- **`src/utils/componentRegistry.ts`, `src/utils/sbaReconciliation.ts`, `src/components/sba/SbaMarkbookGrid.tsx`:** Unified task matching onto whitespace-normalized `normalizeTaskKey`.
- **Tests added/updated:** `src/test/StorageAndScorePrecision.test.ts` (3 tests), `src/test/ScoreImportAndGradebook.test.tsx`, `src/test/ScoreEntryUX.test.tsx`.

### Branch 4 — Slice Hooks, Fast Equality, Decomposition & Safe Blob Download
- **`src/components/DataGate.tsx`, `src/components/DataBackup.tsx`, `src/context/SettingsFormContext.tsx`:** Migrated consumers from broad `useSchoolData()` subscriptions to granular slice hooks (`useSchoolStudents`, `useSchoolSettings`, `useSchoolActions`, `useSchoolLifecycle`) and memoized `SettingsFormContext.Provider` value.
- **`src/utils/settingsEquality.ts` (new):** Replaced brittle `JSON.stringify` dirty-state comparisons with structural `areSettingsEqual`.
- **`src/utils/demoData.ts` & `src/utils/remarksBatch.ts` (new):** Extracted demo student fixture generation and batch remark computation out of `SchoolContext.tsx`.
- **`src/utils/fileDownload.ts` (new) & `src/utils/export.ts` & `src/components/DataBackup.tsx`:** Consolidated CSV/backup exports through `downloadBlob` with a 1000ms deferred `URL.revokeObjectURL` cleanup to prevent premature revocation on iOS Safari/WKWebView.
- **`src/pages/Dashboard.tsx`:** Removed `data-record="true"` from dynamic `{settings.className}` to comply with zero-PII replay masking rules.
- **Tests added/updated:** `src/test/SettingsEqualityAndDownload.test.ts` (3 tests), `src/test/export.test.ts`.

### Branch 5 — Bundle Split, Algorithm/Render Optimization & Dead Code Removal
- **`src/router.tsx` & `src/components/DataGate.tsx`:** Converted `Analytics` to `lazyWithRetry` so Recharts + analytics UI stay out of the main entry chunk, with a one-time `requestIdleCallback`/1500ms idle preload guarded outside tests.
- **`src/pages/Analytics.tsx` & `src/components/analytics/{analyticsShared.ts, AnalyticsOverviewTab.tsx, AnalyticsSubjectsTab.tsx, AnalyticsDemographicsTab.tsx, AnalyticsInsightsTab.tsx}`:** Split 1,979-line `Analytics.tsx` into 4 focused tab components + shared config.
- **`src/utils/gradeCalculator.ts`:** Replaced quadratic per-student subject ranking inside `assignSubjectPositions()` with $O(S \cdot N \log N)$ bucketing and $O(1)$ score-ordinal lookup.
- **`src/hooks/useMediaQuery.ts` (new) & `src/components/sba/SbaMarkbookGrid.tsx`:** Extracted memoized `DesktopSbaRow` and `MobileSbaRow`, gated viewport DOM mounting with `useMediaQuery("(min-width: 768px)")` so hidden mobile/desktop inputs no longer duplicate DOM nodes, and replaced render-time `crypto.randomUUID()` keys with deterministic IDs (`draft-${student.id}:${task.name}`).
- **Dead code deleted (verified zero live references):** Removed legacy `src/pages/Settings.tsx`, `src/components/settings/SbaAssessmentSection.tsx`, `src/components/LazyReportCard.tsx`, `src/components/ReportTemplate.tsx`, `src/context/ToastContext.tsx`, `src/context/ToastContextDefinition.ts`, dead component library fields from `SettingsFormContext`, and obsolete `ToastContext.Provider` / `<Settings />` wrappers from test files (`SettingsColdStart.test.tsx`, `SbaWorkflow.test.tsx`, etc.).
- **Tests updated:** Updated `src/test/SettingsColdStart.test.tsx` to use a local `SettingsTestHarness` composing the live settings modular components, and added a mobile-viewport test in `src/test/SbaWorkflow.test.tsx`.

---

## 2. Why
- **Data durability & user trust:** Prevented silent data loss from debounced writes staying un-flushed before exports/unmounts, stopped false "Saved" badges when IDB writes fail, fixed `localStorage`-centric quota/data-loss false positives when running on IndexedDB, and prevented concurrent IDB write/open races and multi-tab staleness.
- **Domain precision:** Eliminated rounding drift on exam raw scores (`examRawScore`) and unscaled SBA direct class inputs, normalized task key matching, enforced schema/range sanitization across import paths, fixed analytics interval boundaries, and replaced `O(S * N^2)` ranking with $O(S \cdot N \log N)$.
- **Maintainability & runtime responsiveness:** Split monolithic `Analytics.tsx` and `SchoolContext.tsx`, eliminated duplicate hidden SBA DOM subtrees on narrow/wide viewports, code-split Recharts/Analytics out of the initial entry chunk (`dist/assets/Analytics-BZbgY5tv.js`: 84.59 kB / `dist/assets/recharts-ClNlQ_i3.js`: 444.15 kB), and removed dead legacy UI/context modules cleanly.

---

## 3. What Was Verified
- **`npm run lint`:** Passed (`exit 0`, zero warnings, zero errors).
- **`npx tsc -b`:** Passed (`exit 0`).
- **`npx vitest run --maxWorkers=2`:** Passed — **54 test files passed (54), 512 tests passed (512)**, duration `74.23s`, zero skipped or failed tests.
- **`npm run build` (at `149a883`):** Passed (`exit 0`, `2868 modules transformed`, built in `18.95s`, PWA `generateSW` precached 34 entries / `3393.69 KiB`), confirming `Analytics` (`dist/assets/Analytics-BZbgY5tv.js`, 84.59 kB) and `recharts` (`dist/assets/recharts-ClNlQ_i3.js`, 444.15 kB) split out of `dist/assets/index-KqQ6LkEM.js`.
- **`npm ls zod` & `npm ci --dry-run` (at `3679ae8`):** Passed (`exit 0`, `zod@4.5.4` resolved directly and `npm ci --dry-run` clean with 169 packages).
- **`git diff --stat e68f22b..149a883` (+ `3679ae8`):** Verified persisted keys (`ges_v1_students`, `ges_v1_settings`) and IndexedDB store schema (`repota-storage` v2) remain intact across 83 source/test files plus synced `package-lock.json`.

---

## 4. What Could NOT Be Verified
- Interactive browser/device smoke testing (real IndexedDB persistence across tabs, print-preview PDF layout, and physical iOS Safari blob download timing) was not executed manually because only CLI lint, TypeScript compilation, Vitest (`happy-dom`), and production bundling ran in this session.
- `dist/assets/index-KqQ6LkEM.js` remains `1,076.73 kB` minified (`306.00 kB` gzip) alongside `recharts` (`444.15 kB`), triggering Vite's >400 kB chunk warning; further vendor/PDF chunk tuning was out of scope.

---

## Summary for reviewer
- Hardened persistence guarantees (`saveError`, `flushPendingWrites`, storage-aware capacity/data-loss checks, serialized IDB writes, reconnect recovery, cross-tab sync, and `package.json`/`package-lock.json` `zod` dependency sync).
- Fixed domain edge cases: lossless `examRawScore`, unified `normalizeTaskKey`, centralized boundary sanitization (`studentSanitizer.ts`), exact DOB ages, half-open analytics buckets, and atomic batch updates.
- Reduced unnecessary renders & bundle bloat via slice hooks, structural `areSettingsEqual`, `lazyWithRetry` Analytics + 4 tab modules, $O(S \cdot N \log N)$ ranking, and `useMediaQuery`-gated SBA rows.
- Deleted 6 verified dead files (`Settings.tsx`, `SbaAssessmentSection.tsx`, `LazyReportCard.tsx`, `ReportTemplate.tsx`, `ToastContext*`) and stripped unused context fields/test wrappers.
- Verified cleanly with `npm run lint`, `npx tsc -b`, Vitest (`54` files / `512` tests), `npm run build` (`2868` modules), and `npm ci --dry-run`; manual multi-tab browser / iOS device QA remains unverified.
