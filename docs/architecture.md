# Architecture (Repota v2.0.0)

Repota is a browser-only, offline-first Progressive Web App for generating GES-aligned report cards. All authoritative school, student, score, and media data stay on the user's device with zero school-data backend.

## 1. Runtime & Provider Hierarchy

- **Entry (`src/main.tsx`)**: Registers the chunk-preload failure recovery handler, schedules optional host-gated PostHog initialization outside critical render (`requestIdleCallback` / `setTimeout`), and mounts `App`.
- **Root & Lock Guard (`src/App.tsx`)**: `SchoolProvider` wraps `AppContent` (idle auto-lock, hidden-tab grace lock, `PRINT_STARTED_EVENT` / `beforeprint` lock suppression, and `STORAGE_QUOTA_EXCEEDED_EVENT` toast) and renders `RouterProvider`.
- **Route Hierarchy (`src/router.tsx`)**:
  - `rootRoute`: Top-level `Suspense` (`PageLoader`).
  - `shellRoute` (`DataGate` → `AppShell`): Wraps `/` (`Dashboard`), `/analytics` (`Analytics`), and `settingsFormRoute`.
  - `settingsFormRoute` (`SettingsFormLayout` → `SettingsFormProvider`): Isolates form draft state and debounced auto-save to `/sba` (`SbaPage`) and `/settings/*` (`SettingsHub`, `/settings/school`, `/settings/academic`, `/settings/templates`, `/settings/security`).
  - `/print` (`PrintPreview`): Mounted directly under `rootRoute` inside `DataGate` and intentionally **outside** `AppShell`.
  - **Mount Invariant**: `DataGate` always wraps `SettingsFormProvider` because `SettingsFormProvider` snapshots `SchoolContext.settings` on initial mount; `DataGate` blocks rendering until startup hydration finishes and shows recovery controls on `loadError` or `isRollbackIncomplete`.

## 2. State Management & Persistence

- **Granular Context Slices (`src/context/SchoolContext.tsx`, `src/hooks/useSchoolData.ts`)**: Exposes `useSchoolStudents`, `useSchoolSettings`, `useSchoolActions`, and `useSchoolLifecycle` (alongside `useSchoolData()`) so leaf components avoid unnecessary re-renders.
- **IndexedDB Storage (`src/utils/idbStorage.ts`)**: Uses `repota-storage` (`v2`) with two object stores:
  - `app-data`: `ges_v1_students` and `ges_v1_settings`.
  - `media-blobs`: Out-of-band photo/crest binaries addressed by `idb-blob://` URIs, with cross-tab `BroadcastChannel` cache invalidation.
  - Migrated devices set `repota_idb_migrated = "v2"` and refuse silent `localStorage` fallback during transient IndexedDB failures so existing data is never overwritten.
- **Encrypted Backups & Security (`src/utils/backupValidation.ts`, `src/utils/fileEncryption.ts`, `src/utils/pinSecurity.ts`)**:
  - Supports plain JSON backups and password-encrypted `.repota` AES-GCM archives validated via Zod schemas (`src/schemas/`).
  - Imports call `waitForMigration()` and `suspendPersistence()`, execute atomically with rollback guards (`IncompleteRollbackError` → `markIncompleteRollback()`), and flush buffered settings edits before export.
  - Access control uses salted PBKDF2 PIN hashing (`app_pin_hash`), exponential recovery lockouts, and optional WebAuthn biometrics (`src/utils/biometricAuth.ts`).

## 3. Domain Grading & SBA Engine

- **Grading & Ranking (`src/utils/gradeCalculator.ts`, `src/utils/studentValidation.ts`)**: Computes level-specific scales (`KG`, `PRIMARY`, `JHS`, `SHS`), JHS/SHS core + elective aggregates, pending exclusions (`isStudentPending`), and class positions.
- **Weighted Exam Units & SBA Reconciliation (`src/utils/scoreConversion.ts`, `src/utils/sbaReconciliation.ts`)**: `SavedSubject.examScore` is persisted weighted (`0..SchoolSettings.examScoreMax`) and converted via `convertExamRawToWeighted` / `formatExamWeightedAsRaw` for UI entry and CSV import/export (`src/utils/csvImport.ts`, `src/utils/export.ts`).

## 4. Report Templates & Print/PDF Pipeline

- **Templates (`src/templates/registry.ts`, `src/templates/`)**: Renders 7 A4 templates (`original`, `classic`, `modern`, `minimal`, `executive`, `heritage`, `scholar`) with Color / monochrome `B&W` modes and custom brand colors.
- **Print & iOS PDF Fallback (`src/pages/PrintPreview.tsx`, `src/utils/pdfPrint.ts`, `src/utils/printHandler.ts`)**: Uses native `window.print()` on desktop/standard browsers and multi-page A4 `html2canvas-pro` + `jsPDF` capture with Web Share Sheet fallback on standalone iOS PWAs.

## 5. Offline PWA, Telemetry & Security Headers

- **PWA & Chunking (`vite.config.ts`)**: `vite-plugin-pwa` generates `dist/sw.js` precaching core app-shell assets, self-hosted Inter font, emblems, and icons while excluding `posthog-*` chunks, social `og-image.png`, and store screenshots; heavy optional dependencies (`recharts`, `recharts-vendor`, `d3`, `jspdf`, `html2canvas-pro`) are code-split into separate chunks.
- **Zero-PII Telemetry & CSP (`src/utils/analytics.ts`, `src/utils/analyticsEnv.ts`, `src/utils/reportAnalytics.ts`, `vercel.json`)**: Analytics run strictly through `captureEvent` with production host gating (`repota.app`, `www.repota.app`, `repota.vercel.app`), masked PostHog replay (`blockSelector: "img"`, `maskAllInputs: true`), SHA-256 deduplicated print metrics, and HTTP security + Content-Security-Policy headers enforced via `vercel.json`.
