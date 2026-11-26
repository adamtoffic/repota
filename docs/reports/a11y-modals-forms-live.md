# Branch 2 Report: Interactive Accessibility (`fix/a11y-modals-forms-live`)

Merged Branch 1 (`fix/a11y-contrast-landmarks`) into `feat/navigation-shell` (`--no-ff`) and branched `fix/a11y-modals-forms-live`.

## What Changed

1. **Shared Dialog Accessibility Stack (`src/hooks/useDialogA11y.ts`)**
   - Added `useDialogA11y` managing a module-level dialog stack so only the topmost dialog intercepts `Escape` (stopping propagation), trapping `Tab` / `Shift+Tab` across visible focusable descendants, placing initial focus cleanly, restoring trigger focus on unmount/close when no newer dialog is open, and maintaining reference-counted `document.body.style.overflow` locking.

2. **Accessible Modals & Custom Dialogs**
   - `src/components/ui/Modal.tsx`: added `createPortal(..., document.body)`, `ariaLabelledBy` / `ariaDescribedBy` / `ariaLabel` wiring, `tabIndex={-1}`, and `useDialogA11y`.
   - `src/components/ConfirmModal.tsx`: removed the duplicate window `keydown` listener, fixed backdrop dismissal (`closeOnBackdrop={!isLoading}` even without `onCancel`), and wired `useId()` `ariaLabelledBy`/`ariaDescribedBy` onto the title (`<h2>`) and message.
   - `src/components/PdfExportModal.tsx`: portaled to `document.body`, added `useDialogA11y` (`closeOnEscape: status !== "generating"`), backdrop click dismiss, `role="status"` progress, and `role="alert"` error text.
   - `src/components/WelcomeTour.tsx`: moved `role="dialog"` onto the inner dialog surface with `useDialogA11y`.
   - `src/components/PinRecovery.tsx` & `src/components/PinSetup.tsx`: integrated `useDialogA11y`, `aria-labelledby`, input/select `id`/`htmlFor`/`aria-label` associations, `role="alert"` error banners, and converted `PinRecovery`'s method toggle to a keyboard-navigable ARIA `tablist`/`tab`/`tabpanel`.
   - `src/components/ScoreEntryModal.tsx`: integrated `useDialogA11y` (`closeOnEscape: !hasNestedModal`, `lockScroll: false` to keep responsive mobile behavior) and upgraded the section switcher to a keyboard-navigable ARIA `tablist`/`tab`/`tabpanel`.

3. **Form Semantics & Group Labels**
   - `src/components/ui/Input.tsx`: added `labelAction` slot rendered outside `<label>` plus `aria-invalid`, `aria-describedby` (`error` or `helperText`), and `role="alert"` error messages.
   - `src/components/ui/Select.tsx` & `src/components/ui/Textarea.tsx`: added `useId()` `htmlFor`/`id` label association, `aria-invalid`, `aria-describedby`, and `role="alert"` error messages.
   - `src/components/tabs/DetailsTab.tsx`: moved Conduct and Interest `Shuffle` buttons into `Input`'s `labelAction` with explicit `aria-label`s and added `role="status"` on attendance clamp hints.
   - `src/components/settings/AcademicSessionSection.tsx`: linked `<label htmlFor>` to `Class Name` and the `Term / Semester` `<select>` (fixing the Lighthouse mobile `<select>` failure on `/settings/academic`), replaced orphan `<label>`s on button grids with `<span id>` + `role="group"` + `aria-pressed`, and labeled the new subject input.
   - `src/components/analytics/FilterPanel.tsx` & `src/components/backup/BackupModals.tsx`: linked all filter `<select>` and modal password `<label htmlFor>` elements, plus grouped Score Range inputs cleanly.
   - `src/components/AddStudentModal.tsx`, `src/components/settings/SchoolIdentitySection.tsx`, `src/components/sba/SbaWeightsModal.tsx`: replaced orphan `<label>` headings above button/radio groups with `<span id>` + `aria-labelledby`.

4. **`Alert`, WCAG 1.4.13 `Tooltip`, Live Regions, Tablists, & Keyboard Rows**
   - `src/components/ui/Alert.tsx`: defaults ARIA roles by variant (`note` for `info`, `status` for `success`, `alert` for `warning`/`error`, overridable via `role` prop).
   - `src/components/ui/Tooltip.tsx`: hoverable wrapper with close delay so pointer movement onto the popup keeps it open, `Escape` dismissal, trigger `aria-describedby`, and `role="tooltip"` on the popup.
   - `src/components/AutoSaveIndicator.tsx`, `src/components/LockScreen.tsx`, `src/pages/Dashboard.tsx`: added `role="status"` / `role="alert"` live regions (plus a polite filtered-count announcement on Dashboard).
   - `src/pages/Analytics.tsx` & `src/components/sba/SbaMarkbookMobileView.tsx`: implemented `role="tablist"`, `role="tab"`, `role="tabpanel"`, and `ArrowLeft`/`ArrowRight`/`Home`/`End` keyboard navigation.
   - `src/components/StudentList.tsx`: rendered each desktop student name as a native `<button type="button">` with `e.stopPropagation()` for keyboard access.

5. **Tests**
   - Added `src/test/AccessibilityInteractive.test.tsx` (6 tests covering modal portaling/focus-trap/scroll-lock/stacked-Escape/backdrop-dismiss, `Input`/`Select`/`Textarea`/`DetailsTab`/`AcademicSessionSection`/`FilterPanel` label & error associations, `Alert` roles, `Tooltip` hover/`Escape`, live regions, `Analytics` & `SbaMarkbookMobileView` ARIA tablists, and `StudentList` keyboard name button).
   - Updated portal queries (`container` -> `baseElement`) in `src/test/ExistingEventsAnalytics.test.tsx` and `src/test/ScoreImportAndGradebook.test.tsx`, and updated `PinRecovery` `role="tab"` queries in `src/test/PinRecovery.test.tsx`.

## Why

To satisfy WCAG 2.1 Level AA interactive widget requirements across dialogs (focus management, stacking, scroll lock), forms (label/error associations including the Lighthouse `/settings/academic` `<select>` issue), hoverable/dismissible tooltips, live status/error announcements, ARIA tablists, and keyboard-accessible student rows without changing persisted keys, storage formats, or `.report-page` styles.

## What Was Verified

All checks passed after the final edit:

- `npm run lint` (`eslint .`): passed (exit code `0`)
- `npx tsc -b`: passed (exit code `0`)
- `npx vitest run --maxWorkers=2`: passed — **`57` test files passed (`57`), `527` tests passed (`527`)**

## What Could NOT Be Verified

- Live assistive-technology testing with NVDA, VoiceOver, or TalkBack.
- Re-running browser DevTools Lighthouse on `/settings/academic` and visual browser tab-trap/hover verification on mobile and desktop.

## Summary for reviewer

- **Branch 2 (`fix/a11y-modals-forms-live`)** builds on merged Branch 1 and delivers WCAG 2.1 AA interactive dialog, form, tooltip, live-region, tablist, and keyboard-table accessibility.
- Added shared [useDialogA11y](file:///c:/Users/Flash/Documents/Projects/repota/src/hooks/useDialogA11y.ts) hook for focus trapping, stacked `Escape`, trigger focus restoration, and reference-counted body scroll lock across `Modal`, `ConfirmModal`, `PdfExportModal`, `WelcomeTour`, `PinRecovery`, `PinSetup`, and `ScoreEntryModal`.
- Portaled `Modal` and `PdfExportModal` to `document.body`, fixed `ConfirmModal` backdrop dismissal/duplicate Escape, and linked `Input`/`Select`/`Textarea`, `DetailsTab`, `FilterPanel`, `BackupModals`, and `/settings/academic` (`Term / Semester` `<select>`) labels and `aria-describedby` alerts.
- Upgraded `Alert` semantic roles, made `Tooltip` hoverable and `Escape`-dismissible (WCAG 1.4.13), added live regions on save/PIN/filter status, added keyboard ARIA tablists on `Analytics`, `SbaMarkbookMobileView`, `ScoreEntryModal`, and `PinRecovery`, and made `StudentList` desktop names keyboard buttons.
- Verified after the last edit: `npm run lint` (0 errors), `npx tsc -b` (0 errors), and `npx vitest run --maxWorkers=2` (**57/57 files, 527/527 tests passed**).
