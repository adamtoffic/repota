# UI/UX Polish & Full-App Modal / Overlay Audit Report

- **Branch:** `feat/ui-ux-polish`
- **Target Base Branch:** `feat/navigation-shell` (branched from `13783ba`)
- **Pull Request:** [PR #60](https://github.com/adamtoffic/repota/pull/60)
- **Codebase Scope (at `ee2a7f7`, prior to this report commit):** `53 files changed, 1,726 insertions(+), 697 deletions(-)` across 13 commits (`5d4877b`..`ee2a7f7`)

---

## 1. Executive Summary

Work on `feat/ui-ux-polish` proceeded in two logical stages:

1. **Cross-Page UI/UX Polish & `"Home"` Naming Standardization (`5d4877b`..`9916c60`):** Streamlined mobile Settings navigation and hub metadata, upgraded Home desktop/mobile density and quick gradebook filters, improved SBA totals and per-subject CSV import triggers, unified Analytics header/filter visibility, decoupled Print Preview banner layout, and standardized user-facing `"Home"` naming.
2. **Full-App Modal, LockScreen, Overlay & Route Audit Fixes + Dead Code Cleanup (`46d1d2f`..`ee2a7f7`):** Fixed the `WelcomeTour` close-button text overlap, rebuilt LockScreen masked PIN entry, fixed Tailwind v3 backdrop opacity bugs and missing `Step X of 4` / `Skip` UX on PIN setup/recovery, scoped mobile `16px` input zoom rules, hardened `ScoreEntryModal` mobile ergonomics and `Escape` dismissal across modals, ensured bulk modals reset draft state on reopen, centered `DataGate` error recovery, added a proper router 404 screen, refined form alignment, and removed the unused `PwaUpdatePrompt` component and module shim.

All automated checks passed cleanly after the final code/cleanup commit (`ee2a7f7`): `eslint .` exited `0`, `tsc -b` exited `0`, Vitest passed **40 test files / 397 tests** (`26.06s`), and the Vite + PWA production build succeeded (`44` precache entries, `5395.50 KiB`).

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

## 3. Modal, LockScreen, Overlay & Route Audit Fixes (`46d1d2f`..`ee2a7f7`)

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

---

## 4. Verified Automated Checks (`HEAD` = `ee2a7f7`)

All verification commands ran directly after the `PwaUpdatePrompt` cleanup (`ee2a7f7`); the subsequent commit only adds this markdown file under `docs/reports/`.

| Check | Command | Observed Result |
|---|---|---|
| **Linting** | `npm run lint` (`eslint .`) | **Passed** (exit code `0`) |
| **Type Check** | `npx tsc -b` | **Passed** (exit code `0`) |
| **Test Suite** | `npx vitest run` | **Passed** — **40 test files passed, 397 tests passed**, `0` failed (`26.06s`) |
| **Production Build** | `npm run build` (`tsc -b && vite build`) | **Passed** (`built in 28.29s`; `PWA v1.3.0`, `mode generateSW`, `44` precache entries / `5395.50 KiB`) |

---

## 5. Preview / Real-Device QA Checklist

1. **LockScreen & PIN Flows (Mobile + Desktop):**
   - Verify 4-digit masked PIN boxes align centered over input, tapping opens numeric keypad on mobile, and biometric prompt/error scrolling works cleanly on small viewports.
   - Open Settings -> Security -> **Set Up PIN**, verify step labels (`Step 1..4 of 4`), close `X` controls, recovery code layout on narrow screens, and **Skip** on Security Questions.
2. **Overlays (`WelcomeTour`, `PwaInstallPrompt`, Offline status):**
   - Trigger Welcome Tour on Home and confirm progress bar + `X` sit cleanly above the heading without overlapping text, `Back` steps backward, and `Escape` dismisses.
   - Verify PWA install banners render without conflicting dark styling and offline indicator shows `"Offline · Saved locally"`.
3. **Modals & Forms:**
   - Open `ScoreEntryModal` on mobile to verify top safe-area clearance, hidden duplicate top `Prev`/`Next` buttons, bounded student picker width, and `Escape` dismissal on desktop.
   - Open `BulkAttendanceModal` / `BulkPromotionModal`, edit values, close without saving, and reopen to verify clean draft reset.
   - Open Export/Import `.repota` password prompts in Backup settings and test password mismatch inline error message.
4. **Routing Fallback:**
   - Visit `/unknown-page` and verify `"Page not found"` renders cleanly with a working **Back to Home** link.
