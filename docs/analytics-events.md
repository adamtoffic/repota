# PostHog analytics events inventory

This repo uses PostHog via `posthog-js` and initializes it in `src/main.tsx`. Explicit product events are emitted alongside environment gating and privacy masking rules.

## Tracking setup & environment gating

- PostHog is initialized in `src/main.tsx` using helpers from `src/utils/analyticsEnv.ts`.
- Config includes:
  - API host from `VITE_POSTHOG_HOST`
  - `person_profiles: "identified_only"`
  - `capture_pageview: true`
  - `autocapture: true`
  - `persistence: "localStorage"` (queues events while offline)
  - `disable_session_recording: !isAnalyticsEnabled`
  - `before_send`: drops all events on non-production environments and stamps `app_env: "production"` on live production events
- Environment resolution (`resolveAppEnv()` in `src/utils/analyticsEnv.ts`):
  - Localhost, loopback, `.local`, and RFC1918 LAN IPv4 hosts always resolve to `"development"` (never sent).
  - Vercel preview deployments (`VERCEL_ENV === "preview"` or non-production `*.vercel.app` subdomains) resolve to `"preview"` (never sent).
  - Live production hosts (`repota.app`, `www.repota.app`, and `repota.vercel.app` when served from production `main`) resolve to `"production"` (`shouldSendAnalytics` returns `true`).

## Event inventory

### 1) Added_Student
- Trigger: when a student is added via the provider’s `addStudent` action, unless the call is made in silent mode or the new student is named `New Student` (`src/context/SchoolContext.tsx`).
- Captured properties:
  - `school_level` — the current school level from settings (`settings.level`)
  - `school_type` — the current school type from settings (`settings.schoolType`)
- Sensitivity assessment: low-risk behavioral/usage data only; no student names, scores, or raw grade content are sent.

### 2) Loaded_Demo_Data
- Trigger: when demo data is loaded into the school dataset (`src/context/SchoolContext.tsx`).
- Captured properties:
  - `school_level` — current school level
- Sensitivity assessment: low-risk usage data; no student names or performance values are included.

### 3) Auto_Remarks_Generated
- Trigger: after `autoGenerateRemarks` generates remarks for all students (`src/context/SchoolContext.tsx`).
- Captured properties:
  - `students_count` — the number of students considered in the batch
- Sensitivity assessment: low-risk aggregate usage data.

### 4) Bulk_Import_Success
- Trigger: after the bulk import flow completes (`src/components/BulkImportModal.tsx`).
- Captured properties:
  - `students_imported` — number of newly added students
  - `students_updated` — number of matched existing students updated
- Sensitivity assessment: low-risk aggregate usage data; no student names are sent.

### 5) Report_Card_Generated (Headline Report Metric)
- Trigger: emitted by `trackReportPrint` (`src/utils/reportAnalytics.ts`) only after a real print dialog (`beforeprint` / `matchMedia("print")` / armed `blur` or `visibilitychange`) or completed iOS PDF Share/Download (`usePdfShareFlow` `onPdfCompleted`) is confirmed from `src/pages/PrintPreview.tsx`.
- Deduplication & noise filtering:
  - Excludes demo students (`id` starting with `demo-`) and completely unscored students (`hasNoScoresEntered`).
  - Persists a zero-PII local ledger in `localStorage` (`repota_analytics_report_ledger_v1`, with in-memory fallback, 365-day TTL, and 5,000-entry cap) keyed by a truncated 128-bit SHA-256 `report_key` computed from normalized `academicYear|term|examType|studentId`.
  - Repeated prints in the same term/exam cycle do not re-emit `Report_Card_Generated`, except for a single one-time upgrade event (`is_readiness_upgrade: true`, `readiness: "ready"`) if a student was first printed as `"partial"` and later reprinted with all subjects scored.
- Captured properties:
  - `report_key` — 32-char SHA-256 hex digest of `academicYear|term|examType|studentId` (zero PII)
  - `readiness` — `"ready"` or `"partial"`
  - `is_readiness_upgrade` — `true` only on the first `"partial"` -> `"ready"` transition
  - `template_id` — configured report template ID (`settings.templateId || "original_v1"`)
  - `print_mode` — `"color"` or `"bw"`
  - `print_scope` — `"single"`, `"ready_filter"`, or `"all"`
  - `print_channel` — `"native_print"`, `"keyboard_print"`, `"ios_pdf_share"`, or `"ios_pdf_download"`
  - `school_level`, `school_type`, `exam_type`, `term`
- Sensitivity assessment: zero PII; no student names, raw student IDs, scores, grades, or school names are transmitted.

### 6) Printed_Reports (Print Activity & Reprint Telemetry)
- Trigger: emitted alongside confirmed prints (`src/utils/reportAnalytics.ts` / `src/pages/PrintPreview.tsx`) with a 1,500ms trigger cooldown against rapid double-clicks.
- Captured properties:
  - `students_count` — deduplicated student count in the print view
  - `real_students_count` — non-demo students in the print view
  - `ready_students_count` — non-demo scored students with complete scores
  - `demo_students_count` — demo students (`demo-*`) in the print view
  - `unscored_students_count` — non-demo students with zero scores
  - `new_unique_reports_count` — newly generated unique reports in this batch
  - `new_unique_ready_reports_count` — newly ready reports (first prints + upgrades)
  - `is_reprint` — `true` when real scored students exist and zero new reports or upgrades were emitted
  - `is_demo` — `true` when only demo students were printed
  - `print_scope`, `print_channel`, `print_mode`, `template_id`, `school_level`, `school_type`, `exam_type`

### 7) School_Level_Changed
- Trigger: when a new school level is applied in settings (`src/context/SettingsFormContext.tsx`).
- Captured properties:
  - `new_level` — selected school level (`KG`, `PRIMARY`, `JHS`, `SHS`)

### 8) Template_Changed
- Trigger: when a report template card is selected (`src/components/settings/ReportTemplateSection.tsx`).
- Captured properties:
  - `template_id` — selected template ID

## Recommended PostHog Insights

- **Unique Reports Generated (Headline)**: Event `Report_Card_Generated` -> Aggregation: **Unique values of property `report_key`** (automatically deduplicates both same-device retries and cross-device `.repota` print workflows).
- **Complete Reports Only (Strict)**: Same query filtered to `readiness = "ready"`.
- **Print Activity & Reprint Rate**: Count of `Printed_Reports` broken down by `is_reprint`, `is_demo`, and `print_channel`.
- **Live Domain Breakdown**: Breakdown by `app_env` (and `$host` if comparing `repota.app` vs `repota.vercel.app`).

## What is not being sent

- Student names or raw student IDs
- Student scores, grades, remarks, or attendance figures
- School name, address, email, or phone number
