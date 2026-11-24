# Settings Reset, Confirmation Guards & UX Polish Report (`fix/settings-reset-and-confirm-guards`)

Branched from `feat/navigation-shell` (`d276c3d`) following PR #67 (`feat/sba-redesign`). Per `AGENTS.md`, `src/templates/*`, storage keys (`ges_v1_students`, `ges_v1_settings`), IndexedDB store names (`repota-storage` v2), `.repota` backup formats, and zero-PII analytics rules were preserved untouched.

## Summary for reviewer

- Removed the flashing top-nav `Reset` button (`SettingsHeaderActions`), `"Discard Changes?"` modal, and its 500ms-race plumbing in `SettingsFormContext` while preserving the `setUnsavedChanges("settings-draft", ...)` chunk-reload protection.
- Added two missing reset tiers alongside `"Restore Factory Defaults"` in a progressive **Reset & Cleanup** card (`SecurityBackupSection`): **Remove All Students** (new class, same school) and **Reset Entire App** (full first-visit wipe gated by typing `RESET`).
- Closed confirmation/safety gaps across `/settings/academic` (`Termly ↔ Mock Exam` via `SbaWeightsModal` with `SHS` `30/70` resume default), Dashboard (`Auto-Fill Teacher Remarks` overwrite confirm), Private School (`"Reset Labels"` keeping amounts), and `ImageUploader` (`"Remove Image"` confirm).
- Streamlined `AddStudentModal` by replacing the fake read-only `Class` box with a header context line, a direct `/settings/academic` shortcut when unconfigured, `User` gender icons, iOS `text-base` input sizing, and a batch `"Save & Add Another"` action.
- Polished `ConfirmModal` mobile button stacking/iOS input sizing, Security button hierarchy/alignment, `"Remove Image"` touch target, and active split readout in `AcademicSessionSection`.
- Verification after final code edits: `npm run lint`, `npx tsc -b`, `npm test -- --run --maxWorkers=2` (`49` files, `493` tests), and `npm run build` all passed cleanly.

## What Changed

### 1. Removed Flashing Top-Nav `Reset` Button (`61a9c2e`)
- Deleted `src/components/settings/SettingsHeaderActions.tsx` and removed its header slot from `src/pages/SbaPage.tsx`, `src/pages/settings/SettingsHub.tsx`, and `src/pages/settings/SettingsSubPageLayout.tsx`; replaced it with a direct Back link in `src/pages/Settings.tsx`.
- Removed `openResetModal`, `handleResetMouseDown`, `closeResetModal`, `handleReset`, `suppressClassBlurRef`, `resetModalOpenRef`, `resetBaselineRef`, `pendingSavedBaselineRef`, and `"Discard Changes?"` from `src/context/SettingsFormContextDefinition.ts` and `src/context/SettingsFormContext.tsx`.
- Preserved `hasUnsavedChanges` and `setUnsavedChanges("settings-draft", hasUnsavedChanges)` so `preloadErrorHandler` reload protection remains intact during the 500ms debounce window.

### 2. Three-Tier Reset & Cleanup Workflows (`61a9c2e`, UI polish commit)
- Extracted shared `DEFAULT_FACTORY_SETTINGS` into `src/constants/defaultSettings.ts`.
- Enhanced `src/components/ConfirmModal.tsx` with optional `confirmKeyword`, `isLoading`, and `keepOpenOnConfirm` props, plus responsive mobile padding (`p-5 sm:p-6`), full-width mobile stacked button layout (`flex-col-reverse sm:flex-row`), and `text-base sm:text-sm` keyword input for iOS zoom prevention.
- Added `clearAllStudents` (clears students/scores/photos while preserving `SchoolSettings`) and `resetAllAppData` (writes empty `[]` students and `DEFAULT_FACTORY_SETTINGS` through `saveToStorage` to purge IDB `media-blobs`, clears PIN/biometrics, tour/backup/theme/analytics-ledger local keys, session flags, and resets live React/theme state) to `src/context/SchoolContextDefinition.ts` and `src/context/SchoolContext.tsx`.
- Added `showClearStudentsModal`, `showFullAppResetModal`, and synchronous `syncCommittedSettings(DEFAULT_FACTORY_SETTINGS)` on `Restore Factory Defaults` (replacing the 1s `window.location.reload()` race) in `src/context/SettingsFormContext.tsx`.
- Updated `src/components/settings/SecurityBackupSection.tsx` with the **Reset & Cleanup** card right below `DataBackup`, pairing uniform `sm:w-52` outlined buttons for `Remove All Students` / `Restore Factory Defaults` with a solid `danger` button reserved for `Reset Entire App`.

### 3. Core Action Confirmation Guards (`61a9c2e`, UI polish commit)
- **Exam Type (`Termly ↔ Mock Exam`):** Added `initialExamType` prop to `src/components/sba/SbaWeightsModal.tsx` and updated `src/components/settings/AcademicSessionSection.tsx` to route switches through `updateAssessmentWeights` (with `SbaWeightsModal` confirmation whenever `students.length > 0` and level-aware `30/70` `SHS` defaults when empty), add `aria-pressed` state, and display the active grading split (`{classScoreMax}/{examScoreMax}`) inline.
- **Dashboard Auto-Remarks:** Updated `src/pages/Dashboard.tsx` to check `s.teacherRemark?.trim()` across students and prompt `"Overwrite Existing Remarks?"` before replacing existing teacher remarks.
- **Private Fee Labels:** Fixed `src/components/settings/SchoolIdentitySection.tsx` `"Reset Labels"` so it preserves slot amounts/cycles/enabled flags and asks confirmation when labels differ from defaults.
- **Image Removal:** Added `ConfirmModal` confirmation and a padded touch target to `src/components/ImageUploader.tsx` and threaded `onConfirmOpenChange` / `onNestedModalChange` through `src/components/tabs/DetailsTab.tsx` and `src/components/ScoreEntryModal.tsx`.

### 4. `AddStudentModal` Redesign (UI polish commit)
- Updated `src/components/AddStudentModal.tsx`:
  - Removed the fake read-only `Class` `<label>`/`<p>` box and misleading `"Based on School Level"` text.
  - Added a clean `Adding to {className} · {level}` header subtitle when configured (keeping user-entered class names free of `data-record="true"`) or an inline `"Set class name →"` link to `/settings/academic` when blank.
  - Added a `"Save & Add Another"` batch-entry workflow with a `+{count} added` badge, name clearing, input refocus, `text-base sm:text-sm` input sizing, and `<User />` gender toggle icons (`aria-pressed`).

### 5. Tests
- Updated `SchoolContextType` test mocks in `FeatureAdoptionAnalytics.test.tsx`, `FunnelAndReliabilityAnalytics.test.tsx`, `PrintPreviewAnalytics.test.tsx`, and `ScoreEntryUX.test.tsx`.
- Updated/added regression tests in `SettingsColdStart.test.tsx`, `SettingsSubRoutes.test.tsx`, `SchoolContextActions.test.tsx`, `NavigationShell.test.tsx` (including `AddStudentModal` configured subtitle, `"Save & Add Another"`, and missing-class `/settings/academic` navigation), and `ModalAndOverlayUX.test.tsx`.

## Why
Settings auto-saves every 500ms, so the top-nav `"Reset"` button flickered transiently instead of providing meaningful recovery, while high-impact actions (`Exam Type`, `Auto-Fill Teacher Remarks`, Private `"Reset Labels"`, and `"Remove Image"`) lacked confirmation or silently reset data. Replacing global Undo with targeted pre-action confirmation avoids keeping duplicate base64 images in mobile RAM or conflicting with IndexedDB blob cleanup, the 3-tier Reset & Cleanup card supports real class turnover and fresh restarts safely, and removing the fake read-only Class input in `AddStudentModal` simplifies student entry while linking unconfigured classes straight to Settings.

## What Was Verified
After all source and test edits:
- `npm run lint` — passed (`0` errors, `0` warnings).
- `npx tsc -b` — passed (`0` errors).
- `npm test -- --run --maxWorkers=2` — passed (**49** test files, **493** tests passed, `0` failed, `0` skipped).
- `npm run build` — passed (`2857` modules transformed, PWA service worker built cleanly).

## What Could NOT Be Verified
- Live mobile/desktop browser verification of full-page `window.location.assign("/")` reload behavior after `Reset Entire App` (`happy-dom` stubs navigation) and manual touch check on the updated `AddStudentModal` and polished UI spacing on a phone screen.
