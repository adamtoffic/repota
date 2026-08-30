# PostHog analytics events inventory

This repo uses PostHog via `posthog-js` and initializes it in `src/main.tsx:8-14`. The app then emits a small set of explicit event names with custom properties. I did not find any other `posthog.capture(...)` calls beyond the ones below.

## Tracking setup

- PostHog is initialized in `src/main.tsx:8-14`.
- Config includes:
  - API host from `VITE_POSTHOG_HOST`
  - `person_profiles: "identified_only"`
  - `capture_pageview: true`
  - `autocapture: true` (the inline comment says “Disable autocapture to prevent heavy DOM tracking,” but the setting is true)
  - `persistence: "localStorage"`

This means the app is configured to send both explicit custom events and browser-level/autocapture data in addition to manually tracked events.

## Event inventory

### 1) Added_Student
- Trigger: when a student is added via the provider’s `addStudent` action, unless the call is made in silent mode or the new student is named `New Student` (`src/context/SchoolContext.tsx:172-181`).
- Captured properties:
  - `school_level` — the current school level from settings (`settings.level`)
  - `school_type` — the current school type from settings (`settings.schoolType`)
- Sensitivity assessment: low-risk behavioral/usage data only; no student names, scores, or raw grade content are sent.
- Citation: `src/context/SchoolContext.tsx:172-181`

### 2) Loaded_Demo_Data
- Trigger: when demo data is loaded into the school dataset after the app creates mock student records and pushes them into state (`src/context/SchoolContext.tsx:670-676`).
- Captured properties:
  - `school_level` — current school level
- Sensitivity assessment: low-risk usage data; no student names or performance values are included in the event payload.
- Citation: `src/context/SchoolContext.tsx:670-676`

### 3) Auto_Remarks_Generated
- Trigger: after the app generates a batch of auto-generated remarks for all students in `autoGenerateRemarks` (`src/context/SchoolContext.tsx:690-754`).
- Captured properties:
  - `students_count` — the number of students considered in the batch
- Sensitivity assessment: low-risk aggregate usage data; the event does not send actual remark text, student names, grades, or attendance numbers.
- Citation: `src/context/SchoolContext.tsx:748-754`

### 4) Bulk_Import_Success
- Trigger: after the bulk import flow adds multiple students and the import completes successfully (`src/components/BulkImportModal.tsx:39-75`).
- Captured properties:
  - `students_imported` — number of students imported in that batch
- Sensitivity assessment: low-risk aggregate usage data. The import modal reads names from the pasted text (`preview` array) and stores them locally, but the analytics payload only includes the count, not names.
- Citation: `src/components/BulkImportModal.tsx:60-69`

### 5) Printed_Reports
- Trigger: when the user clicks the print action from the report preview page before calling `window.print()` (`src/pages/PrintPreview.tsx:75-88`).
- Captured properties:
  - `students_count` — number of printable students selected for the report
  - `template_id` — configured report template ID (`settings.templateId || "original_v1"`)
  - `print_mode` — current print mode (`color` or `bw`)
  - `school_level` — current school level
  - `school_type` — current school type
- Sensitivity assessment: mixed but mostly behavioral/usage metadata. It includes school-level metadata and template selection, but not raw student names, marks, or class scores.
- Citation: `src/pages/PrintPreview.tsx:75-88`

### 6) School_Level_Changed
- Trigger: when the user applies a new school level from the settings page (`src/pages/Settings.tsx:162-188`).
- Captured properties:
  - `new_level` — the newly selected level value (e.g., `PRIMARY`, `JHS`, etc.)
- Sensitivity assessment: low-risk configuration/usage metadata; it does not include any student or performance data.
- Citation: `src/pages/Settings.tsx:175-188`

### 7) Template_Changed
- Trigger: when the user clicks a report template card in Settings (`src/pages/Settings.tsx:1088-1097`).
- Captured properties:
  - `template_id` — the selected template ID
- Sensitivity assessment: low-risk configuration metadata; it does not include any student data or scores.
- Citation: `src/pages/Settings.tsx:1088-1097`

## What is not being sent

From the code paths above, the app does not appear to send the following to PostHog:

- Student names (e.g., `student.name` values)
- Student scores or grade marks (`classScore`, `examScore`, component marks, average scores)
- Student remarks or conduct/interest text
- Attendance counts or raw per-student attendance numbers
- School name, address, email, phone number, or other identity data for the institution

The closest thing to potentially sensitive operational metadata is the presence of `school_level`, `school_type`, `template_id`, and counts like `students_count` or `students_imported`, which are more like product-usage/configuration analytics than personal student data.

## Bottom line

The repo is tracking mostly product/feature usage and configuration events rather than detailed academic data. The most notable risk is not the explicit event payloads themselves but the broader PostHog config in `src/main.tsx:8-14`: pageview and autocapture are enabled, so browser-level behavior/data collection can occur in addition to the custom events above.
