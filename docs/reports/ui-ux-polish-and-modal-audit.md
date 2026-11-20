# UI/UX Polish & Full-App Modal / Overlay Audit Report

- **Branch:** `feat/ui-ux-polish`
- **Target Base Branch:** `feat/navigation-shell` (branched from `13783ba`)
- **Pull Request:** [PR #60](https://github.com/adamtoffic/repota/pull/60)
- **Codebase Scope (at `3e61ff7`, prior to this report update):** `62 files changed, 2,308 insertions(+), 916 deletions(-)` (`5d4877b`..`3e61ff7`)

---

## 1. Executive Summary

Work on `feat/ui-ux-polish` proceeded across three focused stages:

1. **Cross-Page UI/UX Polish & `"Home"` Naming Standardization (`5d4877b`..`9916c60`):** Streamlined mobile Settings navigation and hub metadata, upgraded Home desktop/mobile density and quick gradebook filters, improved SBA totals and per-subject CSV import triggers, unified Analytics header/filter visibility, decoupled Print Preview banner layout, and standardized user-facing `"Home"` naming.
2. **Full-App Modal, LockScreen, Overlay & Route Audit Fixes + Dead Code Cleanup (`46d1d2f`..`ee2a7f7`):** Fixed the `WelcomeTour` close-button text overlap, rebuilt LockScreen masked PIN entry, fixed Tailwind v3 backdrop opacity bugs and missing `Step X of 4` / `Skip` UX on PIN setup/recovery, scoped mobile `16px` input zoom rules, hardened `ScoreEntryModal` mobile ergonomics and `Escape` dismissal across modals, ensured bulk modals reset draft state on reopen, centered `DataGate` error recovery, added a proper router 404 screen, refined form alignment, and removed the unused `PwaUpdatePrompt` component and module shim.
3. **LockScreen Vault Redesign, Lightweight Motion Cleanup & Tab-Switch Performance Fixes (`22399fd`..`3e61ff7`):** Added a built-in `0–9` tactile keypad and matte deep navy framing + crisp white card across `LockScreen` and `PinSetup`, kept `LockScreen` mounted behind `PinRecovery` for real backdrop blur, replaced dead `animate-in` utilities with GPU keyframes (while dropping the `AppShell` route-reflow wrapper that flickered sticky headers), and eliminated 4 main-thread mount bottlenecks across `Analytics`, `Settings`, `SBA`, and `Home`.

All automated checks passed cleanly after the final code commit (`3e61ff7`): `eslint .` exited `0`, `tsc -b` exited `0`, Vitest passed **40 test files / 398 tests** (`47.06s`), and the Vite + PWA production build succeeded (`25.62s`; `44` precache entries, `5397.60 KiB`).

---

## 2. Cross-Page Polish & `"Home"` Naming Recap (`5d4877b`..`9916c60`)

- **`5d4877b` — `ui(settings): streamline mobile sub-page navigation and chrome`**  
  Refined sub-page headers, unsaved-change banners, and hub layout across [SettingsHeaderActions.tsx](../../src/components/settings/SettingsHeaderActions.tsx), [SettingsStatusBanners.tsx](../../src/components/settings/SettingsStatusBanners.tsx), [SbaPage.tsx](../../src/pages/SbaPage.tsx), [Settings.tsx](../../src/pages/Settings.tsx), [SettingsHub.tsx](../../src/pages/settings/SettingsHub.tsx), and [SettingsSubPageLayout.tsx](../../src/pages/settings/SettingsSubPageLayout.tsx).
- **`40deedc` — `ui(settings): enrich hub metadata and add print preview shortcut`**  
  Updated [ReportTemplateSection.tsx](../../src/components/settings/ReportTemplateSection.tsx) and [SettingsHub.tsx](../../src/pages/settings/SettingsHub.tsx), with test coverage added in [NavigationShell.test.tsx](../../src/test/NavigationShell.test.tsx) and [SettingsSubRoutes.test.tsx](../../src/test/SettingsSubRoutes.test.tsx).
- **`877bfaa` — `ui(dashboard): add desktop context header and improve empty state onboarding`**  
  Updated desktop header context and onboarding guidance in [EmptyState.tsx](../../src/components/EmptyState.tsx) and [Dashboard.tsx](../../src/pages/Dashboard.tsx).
- **`373e292` — `ui(dashboard): tighten mobile card density and add quick gradebook filters`**  
  Refined mobile card spacing and gradebook filter UX across [DashboardStats.tsx](../../src/components/DashboardStats.tsx), [DashboardToolbar.tsx](../../src/components/DashboardToolbar.tsx), [QuickGradebook.tsx](../../src/components/QuickGradebook.tsx), [StudentList.tsx](../../src/components/StudentList.tsx), and [ValidationWarnings.tsx](../../src/components/ValidationWarnings.tsx), with assertions added in [ScoreEntryUX.test.tsx](../../src/test/ScoreEntryUX.test.tsx).
- **`b7950cb` — `ui(sba): clarify export labels, show raw mark totals, and add per-subject import`**  
  Updated [SbaAssessmentSection.tsx](../../src/components/settings/SbaAssessmentSection.tsx) and [SbaPage.tsx](../../src/pages/SbaPage.tsx), verified in [SbaWorkflow.test.tsx](../../src/test/SbaWorkflow.test.tsx).
- **`8131335` — `ui(analytics): unify header styling, mobile export labels, and filter visibility`**  
  Unified Analytics page controls and responsive filter/export layout in [Analytics.tsx](../../src/pages/Analytics.tsx), verified in [ClassStoryAndAnalytics.test.tsx](../../src/test/ClassStoryAndAnalytics.test.tsx).
- **`b81a9ec` — `ui(print): decouple warning banner from sticky toolbar and refine mobile layout`**  
  Separated validation warning banner flow from the sticky print toolbar in [PrintPreview.tsx](../../src/pages/PrintPreview.tsx), with coverage added in [ScoreEntryUX.test.tsx](../../src/test/ScoreEntryUX.test.tsx).
- **`9916c60` — `ui(copy): standardize user-facing Home naming across pages`**  
  Aligned user-facing back/navigation copy (`Home`) across [EmptyState.tsx](../../src/components/EmptyState.tsx), [PageLoader.tsx](../../src/components/PageLoader.tsx), [Analytics.tsx](../../src/pages/Analytics.tsx), [Dashboard.tsx](../../src/pages/Dashboard.tsx), [PrintPreview.tsx](../../src/pages/PrintPreview.tsx), and [SettingsColdStart.test.tsx](../../src/test/SettingsColdStart.test.tsx).

---

## 3. Modal, LockScreen, Overlay, Motion & Tab-Switch Audit Fixes (`46d1d2f`..`3e61ff7`)

### 3.1 Security, LockScreen, PIN Setup/Recovery & CSS Input Clamping (`46d1d2f`)
- **[src/index.css](../../src/index.css):** Scoped the mobile iOS zoom-prevention `font-size: 16px !important` rule strictly inside `@media (max-width: 767px)` with `:not([data-large-input="true"])` on `input`, preventing desktop `<select>` elements and intentionally oversized PIN/recovery fields from being clamped to `16px`.
- **[LockScreen.tsx](../../src/components/LockScreen.tsx):** Replaced plain `type="tel"` PIN text display and redundant 4-dot row with a 4-slot masked visual box grid layered over `<input type="password" inputMode="numeric" ... placeholder="••••" aria-label="4-digit PIN" />`. Added `overflow-y-auto safe-y` scrolling and tighter vertical spacing for smaller viewports, moved the verifying spinner below the PIN boxes, and stopped re-throwing inside `attemptBiometricUnlock`.
- **[PinSetup.tsx](../../src/components/PinSetup.tsx):** Replaced legacy Tailwind v3 `bg-opacity-95` backdrop classes across steps with `safe-y overflow-y-auto z-100` (`role="dialog"`), added explicit `Step 1`–`Step 4 of 4` progress labels, cancel `X` controls across steps, Enter-to-submit + `data-large-input="true"` on PIN inputs, safe async clipboard copy + responsive recovery code display, and a **Skip** button (`handleSkipSecurityQuestions`) on the optional Security Questions step.
- **[PinRecovery.tsx](../../src/components/PinRecovery.tsx):** Replaced `bg-opacity-50` with `bg-black/50 backdrop-blur-sm`, raised layer priority to `z-100` with `role="dialog"`, added `aria-label="Close PIN recovery"`, and marked PIN/code inputs with `data-large-input="true"`.
- **[pinSecurity.test.tsx](../../src/test/pinSecurity.test.tsx):** Added regression assertions covering masked `type="password"` entry on `LockScreen`, the `PinSetup` Skip flow, and `bg-black/50` backdrop classes on `PinRecovery`.

### 3.2 WelcomeTour, PWA Install Prompt, AutoSave & Offline Overlays (`eb2255f`)
- **[WelcomeTour.tsx](../../src/components/WelcomeTour.tsx):** Resolved the close button overlapping the tour heading/progress bar by placing the progress bar and `X` close button (`aria-label="Close tour"`) in a dedicated flex header row above the step title. Added a `Back` navigation button, `Escape` key closing, `role="dialog"`, `z-100`, and unmount timer cleanup.
- **[PwaInstallPrompt.tsx](../../src/components/PwaInstallPrompt.tsx):** Removed stray `dark:*` utility overrides from iOS and Chrome/Edge install prompt cards and added `aria-label="Dismiss install prompt"` to close buttons.
- **[AutoSaveIndicator.tsx](../../src/components/AutoSaveIndicator.tsx):** Updated offline indicator text from `"Offline - changes will sync"` to `"Offline · Saved locally"` so offline teachers are not misled into expecting remote sync.
- **[OfflineDetector.tsx](../../src/components/OfflineDetector.tsx):** Scoped the `"💾 Remember to backup your data regularly"` offline toast to sessions where prior data exists (`localStorage.getItem("repota_had_data") === "true"`) and suppressed duplicates beyond once per session (`sessionStorage` `"repota_backup_reminder_shown"`).
- **[ModalAndOverlayUX.test.tsx](../../src/test/ModalAndOverlayUX.test.tsx):** Created new test suite covering `WelcomeTour`, `AutoSaveIndicator`, and `PwaInstallPrompt`.

### 3.3 `ScoreEntryModal` Mobile Ergonomics & Unified Modal UX (`ddcb26b`)
- **[Modal.tsx](../../src/components/ui/Modal.tsx):** Added `closeOnEscape = true` prop so keyboard `Escape` dismissal stays independent from `closeOnBackdrop={false}`.
- **[ScoreEntryModal.tsx](../../src/components/ScoreEntryModal.tsx):** Wired `Escape` key dismissal (`useEffect`), raised overlay z-index to `z-100`, added a mobile `safe-top` spacer, hid duplicate top `Prev`/`Next` navigation buttons below `sm` (`hidden sm:flex`), constrained student switcher pickers with `w-full max-w-xs`, and aligned internal spacing (`p-4 sm:p-6`).
- **[AcademicTab.tsx](../../src/components/tabs/AcademicTab.tsx):** Removed conflicting sticky bar margins on larger breakpoints (`sm:mx-0 sm:mt-0`).
- **[AddStudentModal.tsx](../../src/components/AddStudentModal.tsx), [ProgressModal.tsx](../../src/components/ProgressModal.tsx), [BulkImportModal.tsx](../../src/components/BulkImportModal.tsx), [BulkAttendanceModal.tsx](../../src/components/BulkAttendanceModal.tsx), [BulkPromotionModal.tsx](../../src/components/BulkPromotionModal.tsx):**
  - Migrated `AddStudentModal` onto shared `<Modal>` and styled its read-only class display box (`bg-gray-50`).
  - Added `p-4` padding and `z-100` to `ProgressModal`.
  - Added `handleClose` form reset and `overflow-x-auto` preview table wrapping in `BulkImportModal`.
  - Split `BulkAttendanceModal` and `BulkPromotionModal` into outer open gates + inner `*Content` components so draft state resets cleanly every time each modal opens.
- **[DataBackup.tsx](../../src/components/DataBackup.tsx):** Fixed missing space before `<strong>Do not work` (`"teacher. <strong>Do not work"`), and migrated both password Export and Import prompts onto shared `<Modal>` with `X` close controls and inline password-mismatch error feedback.
- **[ModalAndOverlayUX.test.tsx](../../src/test/ModalAndOverlayUX.test.tsx):** Added `Modal`/`ScoreEntryModal` Escape dismissal tests and `BulkAttendanceModal` fresh-reopen draft reset verification.

### 3.4 `DataGate` Recovery Layout, 404 Route Fallback & Form Alignment (`82f1456`)
- **[DataGate.tsx](../../src/components/DataGate.tsx):** Centered the storage load-error recovery screen (`min-h-screen flex items-center justify-center`) and clarified recovery copy (`"Changes will not be saved while storage is unavailable. Try again, or restore a backup below."`).
- **[router.tsx](../../src/router.tsx):** Added `RouteNotFound` (`"Page not found"` + `<Link to="/">Back to Home</Link>`) and wired `defaultNotFoundComponent: RouteNotFound` on `createAppRouter`, while keeping existing `RouteErrorFallback` copy intact.
- **[AcademicSessionSection.tsx](../../src/components/settings/AcademicSessionSection.tsx), [DetailsTab.tsx](../../src/components/tabs/DetailsTab.tsx), [StorageMonitor.tsx](../../src/components/StorageMonitor.tsx), [SecurityBackupSection.tsx](../../src/components/settings/SecurityBackupSection.tsx), [AboutModal.tsx](../../src/components/AboutModal.tsx):**
  - Centered the `Users` input icon and attendance `/ {totalAttendanceDays}` suffix with `top-1/2 -translate-y-1/2`.
  - Removed the stray `"Auto-saved"` caption under Gender in `DetailsTab`.
  - Normalized `StorageMonitor` card border radius to `rounded-xl`.
  - Updated `SecurityBackupSection` PIN card heading/copy dynamically (`"PIN Lock Active"` vs `"PIN Lock (Optional)"` and updated recovery description referencing the 6-digit recovery code or security questions).
  - Added `type="button"` and `aria-label="Close modal"` in `AboutModal`.
- **[ModalAndOverlayUX.test.tsx](../../src/test/ModalAndOverlayUX.test.tsx):** Added test navigating `createAppRouter` to `/unknown-page` and asserting `"Page not found"` plus the `"Back to Home"` link (`href="/"`).

### 3.5 Dead Code Cleanup — Unused `PwaUpdatePrompt` (`ee2a7f7`)
- **Why it existed:** `src/components/PwaUpdatePrompt.tsx` (introduced in PR #10 / `645e338`) called `vite-plugin-pwa`'s `useRegisterSW()` (`needRefresh`) to show a manual `"Update"` / `"Later"` reload banner.
- **Why it was removed:** [vite.config.ts](../../vite.config.ts#L31-L44) configures `VitePWA` with `registerType: "autoUpdate"`, `injectRegister: "auto"`, and `workbox: { skipWaiting: true, clientsClaim: true }`. Because new service workers activate automatically without holding in a `needRefresh` state and `PwaUpdatePrompt` was never imported anywhere in `src/`, the unused component (`src/components/PwaUpdatePrompt.tsx`), its unused `virtual:pwa-register/react` module declaration in [src/vite-env.d.ts](../../src/vite-env.d.ts), and its entry in [docs/codebase-inventory.md](../codebase-inventory.md) were removed.

### 3.6 LockScreen & PinSetup Matte Navy Redesign, Tactile Keypad & Layered `PinRecovery` (`22399fd`, `3e61ff7`)
- **[LockScreen.tsx](../../src/components/LockScreen.tsx):** Replaced the bright electric-blue gradient/pulsing blobs (and intermediate all-light canvas) with a matte deep institutional navy canvas (`linear-gradient(160deg, #0B152B 0%, #0F1D3A 55%, #162647 100%)`) framing a crisp white `rounded-3xl` card with subtle `"REPOTA"` eyebrow and `bg-primary` lock emblem. Added a built-in tactile `0–9` numeric keypad with Backspace (`Delete digit`) and conditional biometric key, kept the accessible hidden `inputMode="none"` password input (suppressing mobile virtual keyboard jumps) alongside guarded desktop `window` `keydown` support, added `dotPop` dot fill micro-animation, and added a `paused` prop so focus/biometrics/keystrokes stay inactive when overlaid.
- **[PinSetup.tsx](../../src/components/PinSetup.tsx):** Unified all 6 PIN setup steps onto the same matte deep navy canvas and elevated white `rounded-3xl` card framing with `bg-primary` CTA buttons.
- **[PinRecovery.tsx](../../src/components/PinRecovery.tsx) & [App.tsx](../../src/App.tsx):** Added `animate-fade-in` / `animate-sheet-up` styling across all 3 recovery steps, and kept `<LockScreen paused={showRecovery} ... />` mounted behind `<PinRecovery />` in `App.tsx` so clicking **Forgot your PIN?** blurs smoothly over the LockScreen instead of an empty page.
- **[pinSecurity.test.tsx](../../src/test/pinSecurity.test.tsx):** Added regression test verifying keypad digit unlock, Backspace (`Delete digit`), and ignored global `keydown` events while `paused={true}`.

### 3.7 Lightweight CSS Motion Cleanup & Sticky Header Flicker Fix (`cb80585`, `bc5c557`)
- **[src/index.css](../../src/index.css), [Modal.tsx](../../src/components/ui/Modal.tsx), [ScoreEntryModal.tsx](../../src/components/ScoreEntryModal.tsx), [AboutModal.tsx](../../src/components/AboutModal.tsx), [ConfirmModal.tsx](../../src/components/ConfirmModal.tsx), [DashboardStats.tsx](../../src/components/DashboardStats.tsx), [PwaInstallPrompt.tsx](../../src/components/PwaInstallPrompt.tsx), [SubjectRow.tsx](../../src/components/SubjectRow.tsx):** Added GPU keyframes (`scaleIn`, `slideDown`, `dotPop`, `shake`), wired `animate-fade-in` backdrop fades on `Modal` and `ScoreEntryModal`, replaced dead `animate-in` / `zoom-in-95` / `slide-in-from-*` classes across all 8 call sites (`0` remaining in `src/`), and disabled screen entrance animations inside `@media print`.
- **[AppShell.tsx](../../src/components/navigation/AppShell.tsx) & [src/index.css](../../src/index.css) (`bc5c557`):** Removed the temporary `useEffect` forced-reflow (`void el.offsetWidth`) route wrapper around `{children}` and dropped `animation-fill-mode: both` from utility classes after device testing showed sticky `PageHeader` flicker and sluggish transitions when switching bottom tabs.

### 3.8 Tab-Switch Mount Performance Fixes (`3578f59`)
- **[SettingsFormContextDefinition.ts](../../src/context/SettingsFormContextDefinition.ts), [SettingsFormContext.tsx](../../src/context/SettingsFormContext.tsx) & [SecurityBackupSection.tsx](../../src/components/settings/SecurityBackupSection.tsx):** Eliminated 4× eager mount-time `JSON.stringify(settings)` calls via `Object.is` reference checks and lazy `getLastAutoSaveString()`, and moved `isBiometricAvailable()` probing into lazy `checkBiometric()` triggered only when `SecurityBackupSection` mounts (eliminating extra WebAuthn probes and second renders on `/sba` and `/settings`).
- **[classStoryGenerator.ts](../../src/utils/classStoryGenerator.ts), [Analytics.tsx](../../src/pages/Analytics.tsx) & [ClassStoryAndAnalytics.test.tsx](../../src/test/ClassStoryAndAnalytics.test.tsx):** Extracted `generateClassPulseHeadline()` (2 calculators instead of all 12) reusing already-computed `classMetrics` on Overview, deferred full `generateClassStory()` strictly to the `insights` tab, and changed Analytics `<PageHeader>` from `variant="transparent"` (`backdrop-blur-sm`) to solid; added headline-equivalence assertions in `ClassStoryAndAnalytics.test.tsx`.
- **[ScoreImportModal.tsx](../../src/components/ScoreImportModal.tsx), [BulkImportModal.tsx](../../src/components/BulkImportModal.tsx) & [SbaPage.tsx](../../src/pages/SbaPage.tsx):** Split both modals into zero-cost `if (!props.isOpen) return null;` guards + inner `*Content` components so closed modals run no hooks or student/subject scans on `Home` and `SBA` mounts; switched `SbaPage` to slice hooks (`useSchoolStudents`, `useSchoolSettings`, `useSchoolActions`) and memoized `detectComponentMismatches()` keyed on `[detectComponentMismatches, students, settings.subjectComponentMap]`.
- **[Dashboard.tsx](../../src/pages/Dashboard.tsx) & [AppShell.tsx](../../src/components/navigation/AppShell.tsx):** Consolidated `filterCounts` from 5 separate `students.filter(...)` loops into a single pass over `students`, and tuned mobile bottom navigation blur from `bg-white/90 backdrop-blur-xl` to `bg-white/95 backdrop-blur-sm`.

---

## 4. Verified Automated Checks (`HEAD` = `3e61ff7`)

All verification commands ran directly after the LockScreen & PinSetup matte navy update (`3e61ff7`); the subsequent commit only updates this markdown report under `docs/reports/`.

| Check | Command | Observed Result |
|---|---|---|
| **Linting** | `npm run lint` (`eslint .`) | **Passed** (exit code `0`) |
| **Type Check** | `npx tsc -b` | **Passed** (exit code `0`) |
| **Test Suite** | `npx vitest run` | **Passed** — **40 test files passed, 398 tests passed**, `0` failed (`47.06s`) |
| **Production Build** | `npm run build` (`tsc -b && vite build`) | **Passed** (`built in 25.62s`; `PWA v1.3.0`, `mode generateSW`, `44` precache entries / `5397.60 KiB`) |

---

## 5. Preview / Real-Device QA Checklist

1. **LockScreen & PIN Flows (Mobile + Desktop):**
   - Verify the matte deep navy backdrop frames the crisp white card cleanly, `0–9` keypad + Backspace work smoothly without popping the mobile virtual keyboard, biometric unlock appears on the bottom-left key when enrolled, and physical keyboard typing still works on desktop.
   - Tap **Forgot your PIN?** on LockScreen and verify `PinRecovery` blurs cleanly over the paused LockScreen behind it.
   - Open Settings -> Security -> **Set Up PIN**, verify matching matte navy framing, `Step 1..4 of 4` labels, close `X` controls, recovery code layout on narrow screens, and **Skip** on Security Questions.
2. **Navigation Speed & Bottom Tabs:**
   - Switch repeatedly between **Home**, **SBA**, **Analytics**, and **Settings** on mobile to confirm instant tab switching with zero top-bar flicker and smooth scrolling over the frosted bottom nav.
3. **Overlays (`WelcomeTour`, `PwaInstallPrompt`, Offline status):**
   - Trigger Welcome Tour on Home and confirm progress bar + `X` sit cleanly above the heading without overlapping text, `Back` steps backward, and `Escape` dismisses.
   - Verify PWA install banners render without conflicting dark styling and offline indicator shows `"Offline · Saved locally"`.
4. **Modals & Forms:**
   - Open `ScoreEntryModal` on mobile to verify top safe-area clearance, hidden duplicate top `Prev`/`Next` buttons, bounded student picker width, and `Escape` dismissal on desktop.
   - Open `BulkAttendanceModal` / `BulkPromotionModal`, edit values, close without saving, and reopen to verify clean draft reset.
   - Open Export/Import `.repota` password prompts in Backup settings and test password mismatch inline error message.
5. **Routing Fallback:**
   - Visit `/unknown-page` and verify `"Page not found"` renders cleanly with a working **Back to Home** link.
