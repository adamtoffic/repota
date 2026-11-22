# PostHog Analytics Hardening, Report Deduplication & Event Audit Report

Branch: `feat/posthog-report-analytics` (branched from `feat/navigation-shell` at `c6e9097`)

## Audit Findings & Event Inclusion Decisions

### Included Fixes & Events
- **Production-only gating (`src/utils/analyticsEnv.ts`, `src/main.tsx`, `vite.config.ts`)**: Exposes `__VERCEL_ENV__` at build time, classifies localhost/LAN/loopback as `"development"`, Vercel PR/deployment-hash URLs (`*.vercel.app` other than `repota.vercel.app`) as `"preview"`, and live production hosts (`repota.app`, `www.repota.app`, `repota.vercel.app`) as `"production"`. Drops non-production events in `before_send` and disables session recording outside production.
- **Deduplicated report generation (`src/utils/reportAnalytics.ts`, `src/pages/PrintPreview.tsx`, `src/hooks/usePdfShareFlow.ts`, `src/components/BulkImportModal.tsx`)**: Separates unique output (`Report_Card_Generated` + `COUNT(DISTINCT report_key)`) from activity telemetry (`Printed_Reports`), excludes `demo-*` and unscored students, persists a zero-PII 128-bit SHA-256 ledger in `localStorage` (with in-memory fallback), supports a one-time `"partial"` → `"ready"` upgrade, confirms print dialogs across `native_print`, `keyboard_print`, `ios_pdf_share`, and `ios_pdf_download`, and upgrades `BulkImportModal` IDs to `crypto.randomUUID()`.
- **Global SPA & privacy hardening (`src/main.tsx`, `src/utils/analytics.ts`)**: Enables `capture_pageview: "history_change"` and `capture_pageleave: "if_capture_pageview"` for TanStack Router transitions, strips `?id=` on `/print` URLs inside `before_send`, adds zero-PII runtime context (`is_standalone_pwa`, `is_offline`, `storage_type`), and adds `captureEvent` so telemetry errors never disrupt app flows.
- **Hardened existing events (`Added_Student`, `Bulk_Import_Success`, `Loaded_Demo_Data`, `Auto_Remarks_Generated`, `School_Level_Changed`, `Template_Changed`, `Report_Card_Generated`, `Printed_Reports`)**: Guarded no-op level/template clicks, skipped empty remark runs, added demo vs. real separation, added branding/fee adoption booleans on report prints, and unified `ScoreImportModal` new-student IDs onto `crypto.randomUUID()`.
- **Tier 1 funnel & offline reliability (`Print_Preview_Opened`, `Scores_Imported`, `Score_Entry_Session`, `Data_Loss_Detected`, `Storage_Quota_Exceeded`, `Backup_Exported`, `Backup_Restored`, `Ios_Pdf_Fallback_Used`)**: Captures teacher workflow progression and offline storage/backup health without per-keystroke noise.
- **Tier 2 selective feature adoption (`School_Type_Changed`, `Pwa_Install_Prompt_Action`, unified `Class_Tool_Used`, `Pin_Lock_Configured`)**: Tracks curriculum type adoption, PWA installs/dismissals, class tool usage across 8 tools under one event, and PIN/biometric security adoption.

### Deliberately Held Back (Noise vs. Signal)
- **Per-keystroke / per-cell score edits**: High event volume with low decision value; replaced by session-deduped `Score_Entry_Session` (`entry_mode` + `used_column_paste`) and batch `Scores_Imported`.
- **Per-filter / search / sort clicks on Dashboard & Analytics**: High noise; autocapture and session replay already capture UI friction.
- **Separate micro-events per settings field** (e.g., fee slot edits, brand color hex edits, class name blur): Replaced by low-volume boolean adoption properties (`has_custom_colors`, `has_school_logo`, `has_fee_schedule_enabled`) on report prints and `School_Type_Changed`.

---

## What Changed (Commits 1–7)

- **Commit 1 (`d2e5917`) — Production-only PostHog gating**
  - Added `src/utils/analyticsEnv.ts` (`resolveAppEnv`, `shouldSendAnalytics`, `isLocalHostname`, `PRODUCTION_HOSTS`).
  - Added `__VERCEL_ENV__` Vite define in `vite.config.ts` and declaration in `src/vite-env.d.ts`.
  - Updated `src/main.tsx` with `disable_session_recording` and `before_send` gating + `app_env`.
- **Commit 2 (`98203ec`) — Deduplicated zero-PII report counting & confirmed print channels**
  - Added `src/utils/reportAnalytics.ts` (`sha256Hex`, `hashReportKey`, `trackReportPrint`, `clearReportAnalyticsLedger`).
  - Added `onPdfCompleted` and `isGenerating` to `src/hooks/usePdfShareFlow.ts`.
  - Wired confirmed print channels (`native_print`, `keyboard_print`, `ios_pdf_share`, `ios_pdf_download`) and `1500ms` cooldown into `src/pages/PrintPreview.tsx`.
  - Upgraded `src/components/BulkImportModal.tsx` new-student IDs to `crypto.randomUUID()`.
  - Added `src/test/reportAnalytics.test.ts` and `src/test/PrintPreviewAnalytics.test.tsx`.
- **Commit 3 (`17490ad`) — Analytics inventory & PostHog insights docs**
  - Updated `docs/analytics-events.md` with deduplicated `Report_Card_Generated`, enriched `Printed_Reports`, environment gating, and PostHog Insight formulas.
- **Commit 4 (`8a9e4b7`) — Global SPA pageviews, `/print?id=` sanitization & `captureEvent` wrapper**
  - Created `src/utils/analytics.ts` (`captureEvent`, `isStandalonePwa`, `getRuntimeAnalyticsContext`, `sanitizePostHogUrl`, `trackScoreEntrySessionOnce`, `resetSessionAnalyticsGuards`).
  - Updated `src/main.tsx` (`capture_pageview: "history_change"`, `capture_pageleave: "if_capture_pageview"`, `before_send` runtime context + URL sanitization).
  - Updated `src/test/PostHogInitialization.test.ts` and added `src/test/analytics.test.ts`.
- **Commit 5 (`c090728`) — Hardened existing events, no-op guards & `ScoreImportModal` UUIDs**
  - Routed `src/utils/reportAnalytics.ts` through `captureEvent` and added `has_custom_colors`, `has_school_logo`, and `has_fee_schedule_enabled` to `Report_Card_Generated` and `Printed_Reports`.
  - Updated `src/context/SchoolContext.tsx`: `Added_Student` adds `exam_type`, `is_first_student`, and `total_students_count` (excluding `demo-*` students); `Loaded_Demo_Data` adds `school_type`, `demo_students_count`, `existing_students_count`, and `is_empty_workspace`; `Auto_Remarks_Generated` skips empty classes and adds `real_students_count`, `demo_students_count`, `is_demo`, `school_level`, and `term`.
  - Updated `src/components/BulkImportModal.tsx`: tracks `import_source` (`"paste"` vs `"file"`), `school_level`, `school_type`, and `had_missing_gender` on `Bulk_Import_Success`.
  - Updated `src/context/SettingsFormContext.tsx` and `src/components/settings/ReportTemplateSection.tsx`: guarded no-op clicks on active school level or active template and enriched `School_Level_Changed` (`previous_level`, `students_count`) and `Template_Changed` (`previous_template_id`, `school_level`, `school_type`, `uses_custom_color`).
  - Upgraded new-student IDs in `src/components/ScoreImportModal.tsx` to `crypto.randomUUID()` (with fallback).
  - Added `src/test/ExistingEventsAnalytics.test.tsx` and branding-flag coverage in `src/test/reportAnalytics.test.ts`.
- **Commit 6 (`ccc698e`) — Core funnel & offline reliability telemetry (Tier 1)**
  - Added `analyticsSource` and `Ios_Pdf_Fallback_Used` outcome tracking (`"shared" | "downloaded" | "aborted" | "error"` with `trigger_reason`) in `src/hooks/usePdfShareFlow.ts`, wired from `src/pages/PrintPreview.tsx` (`"report_cards"`) and `src/pages/Analytics.tsx` (`"analytics"`).
  - Added `Print_Preview_Opened` (once per `/print` mount when students exist) in `src/pages/PrintPreview.tsx`.
  - Added `Scores_Imported` in `src/components/ScoreImportModal.tsx`, and session-deduped `Score_Entry_Session` in `src/components/QuickGradebook.tsx` (distinguishing manual entry vs. column paste) and `src/components/ScoreEntryModal.tsx`.
  - Added `Data_Loss_Detected` in `src/context/SchoolContext.tsx`, `Storage_Quota_Exceeded` in `src/App.tsx`, and `Backup_Exported` / `Backup_Restored` in `src/components/DataBackup.tsx`.
  - Updated `src/test/PrintPreviewAnalytics.test.tsx` and added `src/test/FunnelAndReliabilityAnalytics.test.tsx`.
- **Commit 7 — Selective feature adoption (Tier 2) & final analytics documentation**
  - Added no-op-guarded `School_Type_Changed` in `src/components/settings/SchoolIdentitySection.tsx`.
  - Added `Pwa_Install_Prompt_Action` (`"accepted" | "dismissed"`, `"chromium" | "ios_instructions"`) in `src/components/PwaInstallPrompt.tsx`.
  - Added unified `Class_Tool_Used` across `src/components/BulkAttendanceModal.tsx` (`bulk_attendance`), `src/components/BulkPromotionModal.tsx` (`bulk_promotion`), `src/pages/Dashboard.tsx` (`broadsheet_csv_export`, `detailed_broadsheet_csv_export`), `src/pages/SbaPage.tsx` (`broadsheet_csv_export`), `src/components/QuickGradebook.tsx` (`gradebook_csv_export`), and `src/pages/Analytics.tsx` (`analytics_csv_export`, `analytics_pdf_export`, `class_story_copied`).
  - Added `Pin_Lock_Configured` (`is_change`, `biometric_enabled`, `security_questions_configured`) in `src/components/PinSetup.tsx`.
  - Added `src/test/FeatureAdoptionAnalytics.test.tsx` and updated `docs/analytics-events.md` with all 20 events, global properties, excluded events, and PostHog Insight formulas.

---

## Why

- Repeated clicks, single-vs-class prints, demo data, unscored rosters, silent iOS `window.print()` no-ops, cancelled iOS PDF shares, and PR previews inflated report counts on PostHog.
- `capture_pageview: true` missed client-side TanStack Router navigations after initial boot, and `/print?id=<id>` fragmented report-preview URLs.
- Centralizing capture behind `captureEvent` ensures analytics errors never block teacher workflows.

---

## What Was Verified

- Commit 7 final full verification:
  - `npm run lint`: exited `0`.
  - `npm run build` (`tsc -b && vite build`): exited `0` (dist PWA build succeeded, 32 precache entries).
  - `npx vitest run --maxWorkers=2`: exited `0` (`46` test files passed, `429` tests passed; an initial default-concurrency `npx vitest run` experienced Windows worker-pool startup timeouts on 4 workers and 5s test timeouts under CPU contention, resolved cleanly with `--maxWorkers=2` and verified via isolated `FeatureAdoptionAnalytics.test.tsx` + `pinSecurity.test.tsx` + `PinRecovery.test.tsx` passing `14/14` in `6.95s`).
- Commit 6 targeted run (`ccc698e`):
  - `npm run lint`: exited `0`.
  - `npx vitest run src/test/PrintPreviewAnalytics.test.tsx src/test/FunnelAndReliabilityAnalytics.test.tsx src/test/DataBackup.test.tsx src/test/AppAutoLock.test.tsx src/test/ScoreImportAndGradebook.test.tsx src/test/ScoreEntryUX.test.tsx`: exited `0` (`6` test files, `67` tests passed).
- Commit 5 targeted run (`c090728`):
  - `npm run lint`: exited `0`.
  - `npx vitest run src/test/ExistingEventsAnalytics.test.tsx src/test/reportAnalytics.test.ts src/test/SchoolContextActions.test.tsx src/test/SettingsSubRoutes.test.tsx src/test/SettingsIntegration.test.tsx src/test/StudentCRUD.test.tsx`: exited `0` (`6` test files, `49` tests passed).
- Commit 4 targeted run (`8a9e4b7`):
  - `npm run lint`: exited `0`.
  - `npx vitest run src/test/PostHogConfig.test.tsx src/test/PostHogInitialization.test.ts src/test/analytics.test.ts`: exited `0` (`3` test files, `7` tests passed).
- Earlier full verification after Commit 3 (`17490ad`):
  - `npm run lint`, `npm run build` (`tsc -b && vite build`), and `npx vitest run` (`42` test files, `413` tests passed).

## What Could Not Be Verified

- Live PostHog ingestion on production `repota.app` / `repota.vercel.app` vs. Vercel preview deployments (verified via unit tests against `resolveAppEnv` and `before_send` under `happy-dom` `localhost`).

---

## Summary for reviewer

- Added `feat/posthog-report-analytics` off `feat/navigation-shell` across 7 logical commits:
  1. Production-only environment gating for `repota.app`, `www.repota.app`, and live `repota.vercel.app` while filtering out `localhost`, LAN, and Vercel previews.
  2. Zero-PII SHA-256 deduplicated `Report_Card_Generated` + confirmed multi-channel `Printed_Reports` + `BulkImportModal` UUID upgrade.
  3. Updated PostHog insights & events documentation (`docs/analytics-events.md`).
  4. SPA `history_change` pageviews, `/print?id=` URL sanitization, global runtime context (`is_standalone_pwa`, `is_offline`, `storage_type`), and error-safe `captureEvent` wrapper.
  5. Hardened all 8 existing events, guarded no-op level/template clicks, added report branding/fee booleans, and upgraded `ScoreImportModal` IDs to `crypto.randomUUID()`.
  6. Added Tier 1 funnel & offline reliability events (`Print_Preview_Opened`, `Scores_Imported`, `Score_Entry_Session`, `Data_Loss_Detected`, `Storage_Quota_Exceeded`, `Backup_Exported`, `Backup_Restored`, `Ios_Pdf_Fallback_Used`).
  7. Added Tier 2 selective adoption events (`School_Type_Changed`, `Pwa_Install_Prompt_Action`, `Class_Tool_Used`, `Pin_Lock_Configured`), finalized `docs/analytics-events.md`, and verified `npm run lint`, `npm run build`, and `npx vitest run --maxWorkers=2` (`46` files, `429` tests passed).
