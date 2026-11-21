# PostHog Analytics Hardening, Report Deduplication & Event Audit Report

Branch: `feat/posthog-report-analytics` (branched from `feat/navigation-shell` at `c6e9097`)

## Audit Findings & Event Inclusion Decisions

### Included Fixes & Events
- **Production-only gating (`src/utils/analyticsEnv.ts`, `src/main.tsx`, `vite.config.ts`)**: Exposes `__VERCEL_ENV__` at build time, classifies localhost/LAN/loopback as `"development"`, Vercel PR/deployment-hash URLs (`*.vercel.app` other than `repota.vercel.app`) as `"preview"`, and live production hosts (`repota.app`, `www.repota.app`, `repota.vercel.app`) as `"production"`. Drops non-production events in `before_send` and disables session recording outside production.
- **Deduplicated report generation (`src/utils/reportAnalytics.ts`, `src/pages/PrintPreview.tsx`, `src/hooks/usePdfShareFlow.ts`, `src/components/BulkImportModal.tsx`)**: Separates unique output (`Report_Card_Generated` + `COUNT(DISTINCT report_key)`) from activity telemetry (`Printed_Reports`), excludes `demo-*` and unscored students, persists a zero-PII 128-bit SHA-256 ledger in `localStorage` (with in-memory fallback), supports a one-time `"partial"` → `"ready"` upgrade, confirms print dialogs across `native_print`, `keyboard_print`, `ios_pdf_share`, and `ios_pdf_download`, and upgrades `BulkImportModal` IDs to `crypto.randomUUID()`.
- **Global SPA & privacy hardening (`src/main.tsx`, `src/utils/analytics.ts`)**: Enables `capture_pageview: "history_change"` and `capture_pageleave: "if_capture_pageview"` for TanStack Router transitions, strips `?id=` on `/print` URLs inside `before_send`, adds zero-PII runtime context (`is_standalone_pwa`, `is_offline`, `storage_type`), and adds `captureEvent` so telemetry errors never disrupt app flows.
- **Planned next commits**:
  - Existing event hardening (`Added_Student`, `Bulk_Import_Success`, `Loaded_Demo_Data`, `Auto_Remarks_Generated`, `School_Level_Changed`, `Template_Changed`, `Report_Card_Generated`/`Printed_Reports` branding flags, and `ScoreImportModal` `crypto.randomUUID()`).
  - Tier 1 funnel & offline reliability (`Print_Preview_Opened`, `Scores_Imported`, `Score_Entry_Session`, `Data_Loss_Detected`, `Storage_Quota_Exceeded`, `Backup_Exported`, `Backup_Restored`, `Ios_Pdf_Fallback_Used`).
  - Tier 2 selective feature adoption (`School_Type_Changed`, `Pwa_Install_Prompt_Action`, unified `Class_Tool_Used`, `Pin_Lock_Configured`).

### Deliberately Held Back (Noise vs. Signal)
- **Per-keystroke / per-cell score edits**: High event volume with low decision value; replaced by session-deduped `Score_Entry_Session` (`entry_mode` + `used_column_paste`) and batch `Scores_Imported`.
- **Per-filter / search / sort clicks on Dashboard & Analytics**: High noise; autocapture and session replay already capture UI friction.
- **Separate micro-events per settings field** (e.g., fee slot edits, brand color hex edits, class name blur): Replaced by low-volume boolean adoption properties (`has_custom_colors`, `has_school_logo`, `has_fee_schedule_enabled`) on report prints and `School_Type_Changed`.

---

## What Changed (Commits 1–4)

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
- **Commit 4 (Global SPA pageviews, `/print?id=` sanitization & `captureEvent` wrapper)**
  - Created `src/utils/analytics.ts` (`captureEvent`, `isStandalonePwa`, `getRuntimeAnalyticsContext`, `sanitizePostHogUrl`, `trackScoreEntrySessionOnce`, `resetSessionAnalyticsGuards`).
  - Updated `src/main.tsx` (`capture_pageview: "history_change"`, `capture_pageleave: "if_capture_pageview"`, `before_send` runtime context + URL sanitization).
  - Updated `src/test/PostHogInitialization.test.ts` and added `src/test/analytics.test.ts`.

---

## Why

- Repeated clicks, single-vs-class prints, demo data, unscored rosters, silent iOS `window.print()` no-ops, cancelled iOS PDF shares, and PR previews inflated report counts on PostHog.
- `capture_pageview: true` missed client-side TanStack Router navigations after initial boot, and `/print?id=<id>` fragmented report-preview URLs.
- Centralizing capture behind `captureEvent` ensures analytics errors never block teacher workflows.

---

## What Was Verified

- Commit 4 targeted run:
  - `npm run lint`: exited `0`.
  - `npx vitest run src/test/PostHogConfig.test.tsx src/test/PostHogInitialization.test.ts src/test/analytics.test.ts`: exited `0` (`3` test files, `7` tests passed).
- Earlier full verification after Commit 3 (`17490ad`):
  - `npm run lint`, `npm run build` (`tsc -b && vite build`), and `npx vitest run` (`42` test files, `413` tests passed).

## What Could Not Be Verified

- Live PostHog ingestion on production `repota.app` / `repota.vercel.app` vs. Vercel preview deployments (verified via unit tests against `resolveAppEnv` and `before_send` under `happy-dom` `localhost`).

---

## Summary for reviewer

- Added `feat/posthog-report-analytics` off `feat/navigation-shell` with environment gating (`d2e5917`), zero-PII deduplicated report counting (`98203ec`), docs (`17490ad`), and global SPA history pageview + `/print?id=` URL sanitization + runtime context + `captureEvent` wrapper.
- Remaining commits in this branch will harden the existing 8 events, add Tier 1 funnel/reliability telemetry, and add selective Tier 2 feature adoption events.
