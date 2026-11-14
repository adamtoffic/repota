# Responsive Navigation Shell & Settings Sub-Routes Report

Branch: `feat/navigation-shell` (branched from `main`)

## What Changed

### Phase 1 (`ed40e5b`) — Shared Settings Form Extraction
- Created `src/context/SettingsFormContextDefinition.ts`, `src/context/SettingsFormContext.tsx`, and `src/hooks/useSettingsForm.ts` to share one draft state, 500ms debounced auto-save (`baselineSeqRef` and `formGenerationRef`), `isPersistenceSuspended` read-only lock handling, Reset baseline logic, and Class Name confirmation state across routes without duplicating save timers.
- Extracted modular UI sections in `src/components/settings/`: `SettingsStatusBanners.tsx`, `SettingsHeaderActions.tsx`, `SchoolIdentitySection.tsx`, `AcademicSessionSection.tsx`, `SbaAssessmentSection.tsx`, `ReportTemplateSection.tsx`, and `SecurityBackupSection.tsx`.
- Refactored `src/pages/Settings.tsx` to wrap `SettingsContent` in idempotent `SettingsFormProvider` and compose the section components.

### Phase 2 (`4daaeab`) — Responsive Shell, SBA Page, and Settings Sub-Routes
- Created `src/components/navigation/AppShell.tsx` with a 4-tab mobile bottom bar (`Home`, `SBA`, `Analytics`, `Settings`; `md:hidden print:hidden safe-bottom`) and persistent desktop sidebar (`hidden md:flex print:hidden`) featuring indented Settings quick-jump sub-links (`School & Staff`, `Class & Subjects`, `Report Style`, `Security & Backup`) and a `Print Reports` CTA (`/print`).
- Created lazy-loaded routes via `lazyWithRetry` in `src/router.tsx`: `src/pages/SbaPage.tsx`, `src/pages/settings/SettingsHub.tsx` (4 Settings cards plus an `SBA & Grading` card linking to `/sba`), `src/pages/settings/SettingsSubPageLayout.tsx`, `src/pages/settings/SettingsSchoolPage.tsx`, `src/pages/settings/SettingsAcademicPage.tsx`, `src/pages/settings/SettingsTemplatesPage.tsx`, and `src/pages/settings/SettingsSecurityPage.tsx`.
- Updated `src/router.tsx` to wrap shell routes in `shellRoute` (`DataGate` -> `SettingsFormProvider` -> `AppShell` -> `Outlet`), leave `/print` (`PrintPreview`) directly under `rootRoute`, and export `routeTree` and `createAppRouter`.
- Updated `src/pages/Dashboard.tsx` top-right `PageHeader` actions to a `Print` button and `Quick actions` dropdown (`Add Student`, `Import Names`, `Export Full Data`, `Auto-Fill Remarks`).
- Updated `src/components/AutoSaveIndicator.tsx` and `src/components/ScrollButton.tsx` (`bottom-20 md:bottom-6 print:hidden`) for mobile bottom-bar clearance, and rendered `AutoSaveIndicator` on Settings/SBA views instead of inside `Dashboard`.

### Phase 3 — Shell Suspense Persistence, Integration Tests, & Report
- Wrapped `{children}` inside `src/components/navigation/AppShell.tsx` in `<Suspense fallback={<PageLoader />}>` with `print:pb-0 print:pl-0` so lazy sub-route transitions do not suspend at root and hide `AppShell`.
- Added `src/test/NavigationShell.test.tsx` (5 tests covering responsive landmarks, cross-route navigation, Dashboard header quick actions, `/print` exclusion, and `DataGate` load-error / incomplete-rollback shell exclusions).
- Added `src/test/SettingsSubRoutes.test.tsx` (4 tests covering shared form drafts and 500ms debounced auto-save across `/settings/*` sub-routes, Class Name modal propagation, Reset baseline cancellation/restoration across routes, and persistence suspension locks).

## Why
Teachers need one-thumb mobile navigation (`Home`, `SBA`, `Analytics`, `Settings`), direct desktop quick-jumps to Settings sections and printing, and smaller focused pages in place of a single long Settings page—while keeping `src/context/SchoolContext.tsx`, storage schemas, `/print`, and `DataGate` recovery flows completely untouched and shell-free.

## What Was Verified
- `npm run lint` (`eslint .`): exited `0`.
- `npx tsc -b`: exited `0`.
- `npm test -- --run`: exited `0` — `Test Files  20 passed (20)`, `Tests  260 passed (260)`, including:
  - `src/test/NavigationShell.test.tsx` (5 passed)
  - `src/test/SettingsSubRoutes.test.tsx` (4 passed)
  - `src/test/SettingsColdStart.test.tsx` (28 passed)
  - `src/test/PostHogConfig.test.tsx` (2 passed)
- `git diff main -- src/context/SchoolContext.tsx`: empty (0 changes to `SchoolContext.tsx`).
- `git branch --show-current`: `feat/navigation-shell`.

## What Could Not Be Verified
- Physical iOS Safari safe-area inset behavior (`env(safe-area-inset-bottom)` / `safe-bottom`) and real mobile touch/viewport layout at phone widths (`Vitest` runs in `happy-dom`).
- Browser print preview output and `@media print` suppression of fixed shell padding/bars in an actual print dialog.
- Real visual chart rendering dimensions for Recharts (`Analytics`) and virtualized student row rendering inside a zero-height `happy-dom` scroll container.

## Summary for Reviewer
- Added responsive `AppShell` (mobile 4-tab bottom bar + desktop sidebar with Settings quick-jumps & `Print Reports` CTA) on `feat/navigation-shell`.
- Extracted shared `SettingsFormProvider` / `useSettingsForm` and 7 section components, keeping all cold-start, debounced save, Reset, and Class Name modal invariants intact.
- Promoted `/sba` (`SbaPage`) and split Settings into `/settings` (`SettingsHub`) plus `/settings/{school,academic,templates,security}` using `lazyWithRetry`.
- Replaced Dashboard header nav links with `Print` + `Quick actions` dropdown and adjusted `AutoSaveIndicator`/`ScrollButton` mobile bottom clearance.
- Excluded `AppShell` completely on `/print` and on `DataGate` load-error/incomplete-rollback recovery screens; `src/context/SchoolContext.tsx` is untouched.
- Wrapped `AppShell` children in `<Suspense fallback={<PageLoader />}>` so lazy route chunks keep the shell visible during transitions.
- Verification after final code edits passed: `npm run lint` (0), `npx tsc -b` (0), and `npm test -- --run` (20 files, 260 tests passed, 0 skipped).
- Physical iOS Safari safe-area padding, real print dialog output, and phone viewport ergonomics still need manual preview testing before merge.
