# Repota Agent Instructions

Repota is an offline-first, privacy-first PWA for Ghanaian GES report cards built with React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4, TanStack Router, TanStack Virtual, `idb`, `jsPDF` + `html2canvas-pro`, Recharts, and Vitest + `happy-dom`.

## Hard Rules (Every Task)

- **Never break stored data:** Never change persisted keys (`ges_v1_students`, `ges_v1_settings`), IndexedDB store names (`repota-storage` v2: `app-data`, `media-blobs`, `idb-blob://` media refs), backward-compatible backup validation schemas (`src/utils/backupValidation.ts`), or `.repota` encrypted backup formats (`src/utils/fileEncryption.ts`).
- **Package manager:** Use `npm` and `npx` ONLY. Never use `pnpm`, `yarn`, or `bun`.
- **Dependencies:** Do not add new dependencies unless the task explicitly asks for them.
- **Privacy / Zero PII:** Never send student names, scores, photos, phone numbers, or school names in telemetry or logs. PostHog session replay (`src/main.tsx`) masks all text/inputs and blocks images by default; `data-record="true"` may only be placed on static UI chrome or labels, **never** on containers rendering student or school data.
- **JSDoc:** Follow [docs/jsdoc-conventions.md](docs/jsdoc-conventions.md) — document non-obvious invariants, units, preconditions, `@throws`, and `@deprecated` fields on exported types, core utilities, context contracts, and boundary providers; never restate TypeScript types or add boilerplate on self-evident helpers or presentational UI.

## Architecture & Critical Invariants

- **Provider & Route Hierarchy (`src/App.tsx`, `src/router.tsx`):**
  - `SchoolProvider` wraps `AppContent` (PIN auto-lock, idle timer, `PRINT_STARTED_EVENT` lock suppression, `STORAGE_QUOTA_EXCEEDED_EVENT` toast) and `RouterProvider`.
  - `shellRoute` (`DataGate` -> `AppShell`) wraps `/`, `/analytics`, and `settingsFormRoute` (`SettingsFormProvider` for `/sba` and `/settings/*`).
  - `/print` (`PrintPreview`) sits directly under `rootRoute` inside `DataGate` and intentionally **outside** `AppShell`.
  - **Mount order:** `DataGate` must always wrap `SettingsFormProvider` because `SettingsFormProvider` snapshots `SchoolContext.settings` on mount; `DataGate` blocks child rendering until startup hydration settles and renders recovery UI on `loadError` or `isRollbackIncomplete`.
- **State & Persistence (`src/context/SchoolContext.tsx`, `src/hooks/useSchoolData.ts`, `src/utils/backupValidation.ts`):**
  - Prefer granular slice hooks (`useSchoolStudents`, `useSchoolSettings`, `useSchoolActions`, `useSchoolLifecycle`) over `useSchoolData()` in leaf components to avoid unnecessary re-renders.
  - Before replacing storage during backup import or recovery, call `waitForMigration()` and `suspendPersistence()`; on `IncompleteRollbackError`, call `markIncompleteRollback()`.
  - `deletePendingStudents()` removes **only** students with zero scores entered (`hasNoScoresEntered`), preserving partially scored pending students.
- **Domain Data Units (`src/types/index.ts`, `src/utils/scoreConversion.ts`, `src/utils/studentValidation.ts`):**
  - `SavedSubject.examScore` is stored **weighted** (`0..SchoolSettings.examScoreMax`), not raw `0–100`. Convert UI and CSV inputs via `convertExamRawToWeighted` / `formatExamWeightedAsRaw`.
  - `isStudentPending` treats `classScore === 0 || examScore === 0` (or fewer subjects than `settings.defaultSubjects`) as incomplete; `isStudentFailing` excludes pending students.
  - Sample students inserted by `loadDemoData` use a `demo-` ID prefix.
  - Legacy private-school fee fields (`schoolGift`, `canteenFees`, `firstAidFees`) are `@deprecated` for backup compatibility only; use `privateFeeItems`.

## Commands, Commits & Reports

- **Before finishing every task, run:**
  - `npm run lint`
  - `npx tsc -b`
  - `npm test -- --run` (on Windows, pass `--maxWorkers=2` if Vitest worker startup times out)
- **Commits:** Commit each logical goal when done using Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- **Task Report:** Write `docs/reports/<task>.md` covering: what changed, why, what you verified, what you could NOT verify, and a `Summary for reviewer` of max 10 lines.
