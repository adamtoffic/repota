# Settings Reset & Confirmation Guards Report (`fix/settings-reset-and-confirm-guards`)

Branched from `feat/navigation-shell` (`d276c3d`) following PR #67 (`feat/sba-redesign`). Per `AGENTS.md`, `src/templates/*`, storage keys (`ges_v1_students`, `ges_v1_settings`), IndexedDB store names (`repota-storage` v2), `.repota` backup formats, and zero-PII analytics rules were preserved untouched.

## Summary for reviewer

- Removed the flashing top-nav `Reset` button (`SettingsHeaderActions`), the `"Discard Changes?"` modal, and its 500ms-race plumbing in `SettingsFormContext` while preserving the `setUnsavedChanges("settings-draft", ...)` chunk-reload protection.
- Added two missing reset tiers alongside `"Restore Factory Defaults"` in a unified **Reset & Cleanup** card (`SecurityBackupSection`): **Remove All Students** (new class, same school) and **Reset Entire App** (full first-visit wipe gated by typing `RESET`).
- Closed confirmation/safety gaps audited across core workflows:
  - `/settings/academic` `Termly ↔ Mock Exam` switch now opens `SbaWeightsModal` when students exist (and uses level-aware `30/70` `SHS` defaults via `updateAssessmentWeights`).
  - Dashboard `Auto-Fill Teacher Remarks` prompts `"Overwrite Existing Remarks?"` when any student already has a saved `teacherRemark`.
  - Private School `"Reset Labels"` prompts confirmation when customized and preserves entered GH₵ amounts, cycles, and enabled flags.
  - `ImageUploader` `"Remove Image"` opens a `ConfirmModal` before clearing school crests, signatures, or student photos (with `ScoreEntryModal` Escape isolation wired through `DetailsTab`).
- Verification after final code edits: `npm run lint`, `npx tsc -b`, `npm test -- --run --maxWorkers=2` (`49` files, `492` tests), and `npm run build` all passed cleanly.

## What Changed

### 1. Removed Flashing Top-Nav `Reset` Button
- Deleted `src/components/settings/SettingsHeaderActions.tsx` and removed header action mounts from `src/pages/SbaPage.tsx`, `src/pages/settings/SettingsHub.tsx`, and `src/pages/settings/SettingsSubPageLayout.tsx`; replaced it with a direct Back link in legacy `src/pages/Settings.tsx`.
- Removed `openResetModal`, `handleResetMouseDown`, `closeResetModal`, `handleReset`, `suppressClassBlurRef`, `resetModalOpenRef`, `resetBaselineRef`, `pendingSavedBaselineRef`, and `"Discard Changes?"` from `src/context/SettingsFormContextDefinition.ts` and `src/context/SettingsFormContext.tsx`.
- Preserved `hasUnsavedChanges` and `setUnsavedChanges("settings-draft", hasUnsavedChanges)` so `preloadErrorHandler` reload protection remains intact during the 500ms debounce window.

### 2. Three-Tier Reset & Cleanup Workflows
- Extracted shared `DEFAULT_FACTORY_SETTINGS` into `src/constants/defaultSettings.ts`.
- Enhanced `src/components/ConfirmModal.tsx` with optional `confirmKeyword` (case-insensitive trimmed typed confirmation), `isLoading` lock state, and `keepOpenOnConfirm` for async wipe flows.
- Added `clearAllStudents` (clears students/scores/photos while preserving `SchoolSettings`) and `resetAllAppData` (writes empty `[]` students and `DEFAULT_FACTORY_SETTINGS` through `saveToStorage` to purge IDB `media-blobs`, clears PIN/biometrics, tour/backup/theme/analytics-ledger local keys, session flags, and resets live React/theme state) to `src/context/SchoolContextDefinition.ts` and `src/context/SchoolContext.tsx`.
- Added `showClearStudentsModal`, `showFullAppResetModal`, and synchronous `syncCommittedSettings(DEFAULT_FACTORY_SETTINGS)` on `Restore Factory Defaults` (replacing the 1s `window.location.reload()` race) in `src/context/SettingsFormContext.tsx`.
- Updated `src/components/settings/SecurityBackupSection.tsx` with the 3-tier **Reset & Cleanup** card right below `DataBackup`.

### 3. Core Action Confirmation Guards
- **Exam Type (`Termly ↔ Mock Exam`):** Added `initialExamType` prop to `src/components/sba/SbaWeightsModal.tsx` and updated `src/components/settings/AcademicSessionSection.tsx` to route switches through `updateAssessmentWeights` (with `SbaWeightsModal` confirmation whenever `students.length > 0` and level-aware `30/70` `SHS` defaults when empty).
- **Dashboard Auto-Remarks:** Updated `src/pages/Dashboard.tsx` to check `s.teacherRemark?.trim()` across students and prompt `"Overwrite Existing Remarks?"` before replacing existing teacher remarks.
- **Private Fee Labels:** Fixed `src/components/settings/SchoolIdentitySection.tsx` `"Reset Labels"` so it preserves slot amounts/cycles/enabled flags and asks confirmation when labels differ from defaults.
- **Image Removal:** Added `ConfirmModal` confirmation to `src/components/ImageUploader.tsx` and threaded `onConfirmOpenChange` / `onNestedModalChange` through `src/components/tabs/DetailsTab.tsx` and `src/components/ScoreEntryModal.tsx`.

### 4. Tests
- Updated `SchoolContextType` test mocks in `FeatureAdoptionAnalytics.test.tsx`, `FunnelAndReliabilityAnalytics.test.tsx`, `PrintPreviewAnalytics.test.tsx`, and `ScoreEntryUX.test.tsx`.
- Updated/added regression tests in `SettingsColdStart.test.tsx`, `SettingsSubRoutes.test.tsx`, `SchoolContextActions.test.tsx`, `NavigationShell.test.tsx`, and `ModalAndOverlayUX.test.tsx`.

## Why
Because Settings auto-saves every 500ms, the top-nav `"Reset"` discard button flashed briefly on edits and disappeared before users could interact with it, while several truly high-impact actions (`Exam Type`, `Auto-Fill Teacher Remarks`, Private School `"Reset Labels"`, and `"Remove Image"`) lacked confirmation or silently reset amounts. Replacing global Undo with targeted pre-action confirmation modals avoids holding duplicate base64 media snapshots in mobile RAM or fighting IndexedDB blob cleanup, while the 3-tier Reset & Cleanup options cover real class turnover and fresh-device restart workflows safely.

## What Was Verified
After all source and test edits:
- `npm run lint` — passed (`0` errors, `0` warnings).
- `npx tsc -b` — passed (`0` errors).
- `npm test -- --run --maxWorkers=2` — passed (**49** test files, **492** tests passed, `0` failed, `0` skipped).
- `npm run build` — passed (`2857` modules transformed, PWA service worker generated cleanly).

## What Could NOT Be Verified
- Live mobile/desktop browser verification of full-page `window.location.assign("/")` reload behavior after `Reset Entire App` and visual touch inspection of the `/settings/security` Reset & Cleanup card (`happy-dom` stubs navigation).
