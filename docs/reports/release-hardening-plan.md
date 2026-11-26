# Repota Pre-`main` Release Hardening Plan (4 Waves)

Baseline branch audited: `feat/navigation-shell` (`47fb543`) vs `main` (`a50d359`).
Target: Resolve all 12 **P0 Blockers**, 27 **P1 High** items, and high-value P2/P3 polish across 4 focused, reviewable branches merged cleanly via `--no-ff` into `feat/navigation-shell` before final `main` release.

---

## Wave 1 — Data Safety, Backup/Encryption, Sync & PIN Security (`fix/release-data-security`)
- [x] **P0-1** Invalidate `blobMemoryCache` on cross-tab sync & evict missing/unreferenced blob keys (`src/utils/idbStorage.ts`)
- [x] **P0-2** Replace IDB write probe (`put("test","idb_test")`) with read-only probe + refuse silent `localStorage` fallback when `repota_idb_migrated === "v2"` (`src/utils/idbStorage.ts`)
- [x] **P1-1** Sync `SettingsFormContext` on external / cross-tab `settings` updates so stale tabs never clobber edits/backups (`src/context/SettingsFormContext.tsx`)
- [x] **P1-2** Capture `flushPendingWrites()` return value in `DataBackup.handleExport` and fall back to exporting live memory snapshot with clear notice (`src/components/DataBackup.tsx`)
- [x] **P1-3** Catch `StorageBatchRollbackError` in `startFresh`, `resetAllAppData`, and `flushPendingWrites` and invoke `markIncompleteRollback()` (`src/context/school/useSchoolStorageLifecycle.ts`)
- [x] **P1-4** Guard legacy SHA-256 → PBKDF2 `localStorage.setItem` upgrades so quota-full devices do not lock out valid credentials (`src/utils/pinSecurity.ts`)
- [x] **P1-5** Broadcast `PIN_CONFIG_CHANGED_EVENT` on PIN configure/disable/reset so `AppContent` arms `useIdleTimer` immediately without reload (`src/utils/pinSecurity.ts`, `src/App.tsx`)
- [x] **P1-6** Read `app-data` + `media-blobs` in a single atomic `readonly` IDB transaction + export `flushStorageWriteQueue()` for backup import drain (`src/utils/idbStorage.ts`, `src/components/DataBackup.tsx`)
- [x] **P1-7** Add exponential lockout throttling (`app_recovery_lockout`) in `PinRecovery`, remove exact `correctCount` oracle, and add in-flight submit guards (`src/utils/pinSecurity.ts`, `src/components/PinRecovery.tsx`)
- [x] **P2-10** Sequence BroadcastChannel hydration in `useSchoolStorageLifecycle` to prevent out-of-order stale overwrites
- [x] **P2-11** Clear unsaved changes (`setUnsavedChanges(false)`) before `DataBackup` post-import reload (`src/components/DataBackup.tsx`)
- [x] **P2-12** Flush pending `SettingsFormContext` draft on `pagehide` / `visibilitychange` (`hidden`)
- [x] **P2-13** Persist security questions & biometrics in `PinSetup` only after `setupPin()` succeeds
- [x] **P2-14** Track & cancel `LockScreen` 100ms auto-verify timer on change/pause/unmount
- [x] **P2-15** Fix `fileEncryption` decrypt error classification (app-sealed corruption vs wrong password) & `DataBackup.handleFileSelect` error surfacing; `salt as BufferSource`
- [x] **P3-16 / P3-18** Guard `localStorage` in `dataProtection.ts` and clean up `DataBackup` status timeout

## Wave 2 — Grading Math, SBA, CSV/Paste & Analytics Integrity (`fix/release-grading-csv-analytics`)
- [x] **P0-3** Fix `parseOptionalNumber` (`"Absent"`/`"Gender"`/`"N/A"` → `undefined`, reject `"12/15"` fractions) (`src/utils/csv/tabularParser.ts`)
- [x] **P0-4** Preserve blank lines & subject-missing row offset on Excel paste (`gradebookHelpers.ts`, `sbaGridHelpers.ts`)
- [x] **P0-5** Fix CSV formula injection & header escaping in `exportAnalyticsData` and `exportToCSV`, plus async `downloadBlob` (`src/utils/analyticsExport.ts`, `src/utils/export.ts`)
- [x] **P1-8** Fix IEEE-754 division-before-multiplication drift on `50/50` split (`scoreConversion.ts`, `sbaReconciliation.ts`, `sbaCsvParser.ts`)
- [x] **P1-9** Fix `ScoreImportModal` preview-vs-apply `classScore` mismatch & guard direct `classScore` transitions (`src/components/import/scoreImportApply.ts`)
- [x] **P1-10** Clear `savedDirectClassScore`, `savedDirectClassScoreMax`, `examRawScore` in `clearStudentSubjectScores`
- [x] **P1-11** Enforce `classScoreMax >= 1 && examScoreMax >= 10` bounds in `SbaWeightsModal` & `normalizeAssessmentWeightSettings`
- [x] **P1-12** Preserve students with stashed Termly `savedDirectClassScore` or `classScoreComponents` in `deletePendingStudents` / `hasNoScoresEntered`
- [x] **P1-13** Fix GES core subject matching (`Literature in English`, slot caps) & `< 6` subject aggregate guard (`gradeCalculator.ts`, `insightsAndSba.ts`)
- [x] **P1-14** Exclude incomplete students from `assignPositions` and unscored `0` rows from `assignSubjectPositions`
- [x] **P1-15** Fix unreachable empty-score guard in `classStoryGenerator.ts` for all-ungraded rosters
- [x] **P1-16** Scope subject metrics & charts to `filters.subjectFilter` in `Analytics.tsx`
- [x] **P1-17** Require both genders (`maleCount > 0 && femaleCount > 0`) before reporting gender performance gaps
- [x] **P1-18** Require `classScore > 0 && examScore > 0` in `calculateSbaVsExamAnalysis`
- [x] **P1-19** Preserve `attendancePresent: undefined` across `BulkImportModal`, `scoreImportApply`, `DetailsTab`, and `remarksBatch`
- [x] **P1-20** Guard `settings.classScoreMax > 0` in `createDemoStudents` (`0 / 0 = NaN`)
- [x] **P1-21** Trigger confirmation check on `"All Subjects"` task deletion when subjects have divergent task lists (`SbaTaskManagerModal.tsx`)
- [x] **P1-22** Deduplicate duplicate rows in `ScoreImportModal` & `BulkImportModal` and fix `KEEP_EXISTING` snapshot drift
- [x] **P2-19..24** Fix decimal input swallowing (`SubjectRow`, `QuickGradebookRow`, `SbaMarkbookGrid`), floating-point sum display, stale `examRawScore` in `clamp` mode, `normalizeTaskKey` / `examRawScore` in `QuickGradebook`, Analytics KPI/quartile/age-chart polish, and CSV parser quote/TSV hardening

## Wave 3 — Print Engine, PDF Memory & Cross-Template Parity (`fix/release-print-templates`)
- [x] **P0-6** Pass `ignoreElements` + dynamic scale cap + cancellation awareness in `pdfPrint.ts` ($O(N^2)$ cloning & iOS OOM fix)
- [x] **P0-7** Add `relative` to `OriginalTemplate` root so watermarks stay scoped per A4 page
- [x] **P0-8** Add 3-tier A4 density scaling to `ClassicTemplate`, `ModernTemplate`, and `MinimalTemplate`
- [x] **P0-9** Move `.report-page` screen/print rules into clean `@layer` without overriding padding or forcing serif font on `font-sans` templates (`src/index.css`, `src/pages/PrintPreview.tsx`)
- [x] **P0-10** Fix exact `297mm` blank-page subpixel overflow and reset `min-h-screen`/`100dvh` inside `@media print`
- [x] **P0-11** Move `OriginalTemplate` `density.padding` from `<tr>` to `<td>` cells
- [x] **P0-12** Harden iOS 27+ standalone PWA fallback detection (including `navigator.standalone` without `Version/`), `visibilitychange` watchdog, and persistent recovery fallback (`iosInteraction.ts`, `usePdfShareFlow.ts`, `useToast.ts`)
- [x] **P1-23 / P2-1..8** Fix `nextTermStarts` UTC off-by-one formatter, `attendancePresent` `?? "-"` across all templates, `bw` red arrears leaks, `Heritage`/`Scholar` fixed A4 columns (remove `sm:`), `isIslamic` & Arabic font fallback, blank `teacherRemark` (no fake praise), `fee.cycle` + `feePaymentNote` + `className` parity, KG header position gating, `reportTheme` `0.179` WCAG luminance + `ModernTemplate` `text-white`, `PrintPreview` `contentKey`/`markPrintStarted`/invalid `?id=`/`blob:` iOS download trap, double signature lines, watermark z-index, and `templatePreviewData` live weights/fees

## Wave 4 — Privacy, Mobile/iOS Polish, A11y & Hosting Cleanup (`fix/release-a11y-mobile-polish`)
- [ ] **P1-24** Fail CLOSED to `"preview"` for unknown hosts in `analyticsEnv.ts:88`
- [ ] **P1-25** Add `safe-top` clearance to `/print` sticky header (`src/pages/PrintPreview.tsx`)
- [ ] **P1-26** Fix invisible active `B&W` toggle in Dark Mode (`ReportTemplateSection.tsx`)
- [ ] **P1-27** Keyboard-accessible file inputs (`DataBackup`, `BulkImportModal`, `ScoreImportConfigAndInput`), `ariaLabelledBy` on all 9 modals, focus traps on `ProgressModal`/`showReloadOverlay`, labels on search/textarea inputs, `DashboardToolbar` `sm:`→`md:` z-index fix, iOS landscape anti-zoom rule, guarded `PwaInstallPrompt`/`OfflineDetector` storage + `navigator.standalone`
- [ ] **P2/P3 Polish** Strip `data-record="true"` from dynamic metrics (`AnalyticsInsightsTab`, `DashboardToolbar`, `AppShell`, `SbaPage`, `QuickGradebookHeader`, `SbaMarkbookGrid`, `SbaTaskManagerModal`), exclude `posthog-*.js` from Workbox precache (`vite.config.ts`), add security headers to `vercel.json`, `useKeyboard`/`AutoSaveIndicator`/`WelcomeTour`/`dvh` modals, AA contrast fixes, and remove orphaned `src/components/reports/*`, empty `src/App.css`, and dead CSS in `src/index.css`.
