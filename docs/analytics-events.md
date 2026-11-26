# PostHog analytics events inventory

This repo uses PostHog via `posthog-js`, lazy-loaded from `src/main.tsx` alongside environment gating (`src/utils/analyticsEnv.ts`) and event/context configuration (`src/utils/analytics.ts`).

## Tracking setup, SPA pageviews & privacy gating

- **Config (`src/utils/analytics.ts`, initialized via `src/main.tsx`)**:
  - `api_host` from `VITE_POSTHOG_HOST`
  - `person_profiles: "identified_only"`
  - `capture_pageview: "history_change"` & `capture_pageleave: "if_capture_pageview"` (tracks TanStack Router client-side route transitions as well as initial load)
  - `autocapture: true` with `mask_all_text: true`, `mask_all_element_attributes: true`, `maskAllInputs: true`, `blockSelector: "img"`, and `data-record="true"` static-label allowlisting
  - `persistence: "localStorage"` (queues events while offline)
  - `disable_session_recording: !isAnalyticsEnabled`
- **`before_send` pipeline (`src/utils/analytics.ts`)**:
  - Drops all events (`return null`) unless `app_env === "production"`
  - Sanitizes `$current_url` via `sanitizePostHogUrl()` in `src/utils/analytics.ts` (removes `?id=` on `/print` so single-student previews do not fragment URLs or leak IDs)
  - Stamps every event with zero-PII global context:
    - `app_env`: `"production"` | `"preview"` | `"development"`
    - `is_standalone_pwa`: boolean
    - `is_offline`: boolean
    - `storage_type`: `"indexeddb"` | `"localstorage"`
- **Environment resolution (`src/utils/analyticsEnv.ts`)**:
  - Localhost, loopback, `.local`, and RFC1918 LAN IPv4 hosts always resolve to `"development"` (never sent).
  - Vercel preview deployments (`VERCEL_ENV === "preview"` or `*.vercel.app` subdomains other than `repota.vercel.app`) resolve to `"preview"` (never sent).
  - Live production hosts (`repota.app`, `www.repota.app`, and `repota.vercel.app`) resolve to `"production"` (`shouldSendAnalytics` returns `true`); non-allowlisted hosts fail closed to `"preview"`.

---

## Event inventory (20 events)

### Core Student & Configuration Events (Hardened)

#### 1) Added_Student
- Trigger: `addStudent` in `src/context/SchoolContext.tsx` (skips silent calls, `"New Student"` placeholders, and `demo-*` students).
- Properties: `school_level`, `school_type`, `exam_type`, `is_first_student`, `total_students_count`.

#### 2) Bulk_Import_Success
- Trigger: `BulkImportModal` (`src/components/BulkImportModal.tsx`) when at least 1 student is added or updated.
- Properties: `students_imported`, `students_updated`, `import_source` (`"file" | "paste"`), `school_level`, `school_type`, `had_missing_gender`.

#### 3) Loaded_Demo_Data
- Trigger: `loadDemoData` in `src/context/SchoolContext.tsx`.
- Properties: `school_level`, `school_type`, `demo_students_count`, `existing_students_count`, `is_empty_workspace`.

#### 4) Auto_Remarks_Generated
- Trigger: `autoGenerateRemarks` in `src/context/SchoolContext.tsx` (skipped when `students_count === 0`).
- Properties: `students_count`, `real_students_count`, `demo_students_count`, `is_demo`, `school_level`, `term`.

#### 5) School_Level_Changed
- Trigger: `applyLevelChange` in `src/context/SettingsFormContext.tsx` (guarded against no-op clicks on the active level).
- Properties: `previous_level`, `new_level`, `students_count`.

#### 6) Template_Changed
- Trigger: `ReportTemplateSection` (`src/components/settings/ReportTemplateSection.tsx`, guarded against no-op clicks on the active template).
- Properties: `template_id`, `previous_template_id`, `school_level`, `school_type`, `uses_custom_color`.

---

### Report Generation & Print Telemetry

#### 7) Report_Card_Generated (Headline Metric)
- Trigger: `trackReportPrint` (`src/utils/reportAnalytics.ts`) after confirmed print (`beforeprint` / `matchMedia("print")` / armed `blur` or `visibilitychange`) or completed iOS PDF Share/Download from `src/pages/PrintPreview.tsx`.
- Deduplication & filtering:
  - Excludes `demo-*` students and unscored students (`hasNoScoresEntered`).
  - Persists a zero-PII ledger (`repota_analytics_report_ledger_v1`, 365-day TTL, 5,000-entry cap, in-memory fallback) keyed by a 128-bit SHA-256 `report_key` from normalized `academicYear|term|examType|studentId`.
  - Allows a single one-time `"partial"` → `"ready"` upgrade event (`is_readiness_upgrade: true`).
- Properties: `report_key`, `readiness` (`"ready" | "partial"`), `is_readiness_upgrade`, `template_id`, `print_mode`, `print_scope` (`"single" | "ready_filter" | "all"`), `print_channel` (`"native_print" | "keyboard_print" | "ios_pdf_share" | "ios_pdf_download"`), `school_level`, `school_type`, `exam_type`, `term`, `has_custom_colors`, `has_school_logo`, `has_fee_schedule_enabled`.

#### 8) Printed_Reports (Print Activity & Reprint Telemetry)
- Trigger: emitted alongside confirmed prints (`src/utils/reportAnalytics.ts`) with a `1,500ms` button cooldown.
- Properties: `students_count`, `real_students_count`, `ready_students_count`, `demo_students_count`, `unscored_students_count`, `new_unique_reports_count`, `new_unique_ready_reports_count`, `is_reprint`, `is_demo`, `print_scope`, `print_channel`, `print_mode`, `template_id`, `school_level`, `school_type`, `exam_type`, `has_custom_colors`, `has_school_logo`, `has_fee_schedule_enabled`.

---

### Tier 1 — Funnel & Offline Reliability Telemetry

#### 9) Print_Preview_Opened
- Trigger: once per `/print` mount when `printableStudents.length > 0` (`src/pages/PrintPreview.tsx`).
- Properties: `students_count`, `real_students_count`, `ready_count`, `missing_photos_count`, `print_scope`, `is_demo`, `template_id`, `school_level`, `school_type`.

#### 10) Scores_Imported
- Trigger: `ScoreImportModal` (`src/components/ScoreImportModal.tsx`) when `students_updated + students_created > 0`.
- Properties: `mode`, `students_updated`, `students_created`, `new_tasks_created`, `school_level`, `exam_type`.

#### 11) Score_Entry_Session
- Trigger: session-deduped (`trackScoreEntrySessionOnce` in `src/utils/analytics.ts`) on first edit per mode + paste style in `src/components/QuickGradebook.tsx`, `src/components/ScoreEntryModal.tsx`, and `src/components/sba/SbaMarkbookGrid.tsx`.
- Properties: `entry_mode` (`"quick_gradebook" | "score_modal" | "sba_markbook"`), `used_column_paste`, `school_level`, `exam_type`.

#### 12) Data_Loss_Detected
- Trigger: `useSchoolStorageLifecycle` (`src/context/school/useSchoolStorageLifecycle.ts`) when `detectDataLoss()` returns `true` on startup.
- Properties: `storage_type`.

#### 13) Storage_Quota_Exceeded
- Trigger: `App.tsx` listener on `STORAGE_QUOTA_EXCEEDED_EVENT`.
- Properties: `storage_type`.

#### 14) Backup_Exported
- Trigger: `DataBackup` (`src/components/DataBackup.tsx`) after successful `.repota` export.
- Properties: `password_protected`, `delivery_method` (`"os_share" | "download"`), `students_count`, `is_demo`.

#### 15) Backup_Restored
- Trigger: `DataBackup` (`src/components/DataBackup.tsx`) after successful `.repota` import.
- Properties: `students_count`, `from_recovery_mode`, `had_warnings`.

#### 16) Ios_Pdf_Fallback_Used
- Trigger: `usePdfShareFlow` (`src/hooks/usePdfShareFlow.ts`) when invoked from report cards (`"report_cards"`) or analytics (`"analytics"`).
- Properties: `trigger_reason` (`"ios27_auto" | "watchdog_recovery"`), `outcome` (`"shared" | "downloaded" | "aborted" | "error"`), `source` (`"report_cards" | "analytics"`).

---

### Tier 2 — Feature Adoption Telemetry

#### 17) School_Type_Changed
- Trigger: `SchoolIdentitySection` (`src/components/settings/SchoolIdentitySection.tsx`, guarded against no-ops).
- Properties: `previous_type`, `new_type` (`"STANDARD" | "ISLAMIC" | "PRIVATE"`), `school_level`.

#### 18) Pwa_Install_Prompt_Action
- Trigger: `PwaInstallPrompt` (`src/components/PwaInstallPrompt.tsx`).
- Properties: `outcome` (`"accepted" | "dismissed"`), `platform` (`"chromium" | "ios_instructions"`).

#### 19) Class_Tool_Used
- Trigger: unified event across class management & export utilities (`BulkAttendanceModal.tsx`, `BulkPromotionModal.tsx`, `Dashboard.tsx`, `SbaPage.tsx`, `QuickGradebook.tsx`, `Analytics.tsx`).
- Properties: `tool` (`"bulk_attendance" | "bulk_promotion" | "broadsheet_csv_export" | "detailed_broadsheet_csv_export" | "gradebook_csv_export" | "sba_sheet_csv_export" | "analytics_csv_export" | "analytics_pdf_export" | "class_story_copied"`), `students_count`, `school_level`.

#### 20) Pin_Lock_Configured
- Trigger: `PinSetup` (`src/components/PinSetup.tsx`) when `setupPin` succeeds.
- Properties: `is_change`, `biometric_enabled`, `security_questions_configured`.

---

## Intentionally Excluded / Held Back

- **Per-keystroke score edits** (covered cleanly by `Score_Entry_Session` + `Scores_Imported` without event bloat).
- **Dashboard/Analytics filter, search, and sort clicks** (high noise; autocapture and replay cover UX exploration).
- **Per-field settings micro-events** (brand colors, individual fee slots, class name blur — instead captured via boolean adoption flags on reports and `School_Type_Changed`).

## Recommended PostHog Insights

- **Unique Reports Generated (Headline)**: Event `Report_Card_Generated` → Aggregation: **Unique values of property `report_key`**.
- **Complete Reports Only (Strict)**: Same query filtered to `readiness = "ready"`.
- **Teacher Activation Funnel**: `Added_Student` / `Bulk_Import_Success` → `Score_Entry_Session` / `Scores_Imported` → `Print_Preview_Opened` → `Report_Card_Generated`.
- **Print Activity & Reprint Rate**: Count of `Printed_Reports` broken down by `is_reprint`, `is_demo`, and `print_channel`.
- **Live Domain Breakdown**: Filter `app_env = "production"` and break down by `$host` (`repota.app` vs `repota.vercel.app`).

## What is not being sent (Zero PII)

- Student names or raw student IDs
- Student scores, grades, remarks, or attendance figures
- School name, address, email, or phone number
