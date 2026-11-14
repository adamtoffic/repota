# Repota UI/UX & Navigation Engineering Assessment

**Role:** Senior Front-End Engineer  
**Baseline:** `feat/navigation-shell` (`d08d7fa`)  
**Scope:** End-to-end audit of `src/` navigation architecture, mobile/desktop ergonomics, visual consistency, workflow continuity, accessibility, and dead code—grouped into logical, atomic-commit execution goals.

---

## Executive Summary & Product Lens

Repota serves busy Ghanaian basic school teachers (KG, Primary, JHS, SHS) working **offline-first** across two distinct contexts:
1. **Classroom & Staffroom (Mobile / Phone):** Quick bursts on 360px–430px Android phones and iOS Safari—recording attendance, continuous assessment (SBA) tasks, student details, and remarks one-handed.
2. **Term-End Production (Laptop / Desktop):** Bulk roster imports, SBA task configuration, analytics review, and batch A4 PDF/paper report card printing.

With Goal 2 (`AppShell`, `/sba`, `/settings/*`, and route exclusions) complete, the structural foundation is strong. The next highest-leverage improvements are **removing duplicate chrome**, **eliminating mobile scroll/overlay collisions**, **unifying fragmented student & save flows**, and **closing workflow dead-ends** between `/sba`, `Dashboard`, `ScoreEntryModal`, and `Analytics`.

---

## Part 1: What to KEEP (Architectural & UX Strengths)

### 1. Responsive Navigation Shell & Strict Route Exclusions
- **4-Tab Mobile Bottom Bar (`src/components/navigation/AppShell.tsx:142-145`):** `Home` (`/`), `SBA` (`/sba`), `Analytics` (`/analytics`), and `Settings` (`/settings`) with `md:hidden print:hidden safe-bottom` stays comfortably inside the 3–5 item ergonomic sweet spot without truncating labels on narrow viewports.
- **Persistent Desktop Sidebar (`src/components/navigation/AppShell.tsx:47-136`):** Fixed `w-64` sidebar with always-visible indented Settings quick-jump sub-links (`School & Staff`, `Class & Subjects`, `Report Style`, `Security & Backup`) and an anchored `Print Reports` CTA carrying a live student count badge.
- **Clean Exclusions (`src/router.tsx`, `src/components/DataGate.tsx`):** `/print` (`PrintPreview.tsx`) and `DataGate` load-error / incomplete-rollback recovery screens remain completely outside `AppShell`. Wrapping `AppShell` children in `<Suspense fallback={<PageLoader />}>` (`AppShell.tsx:139-141`) keeps navigation chrome visible while lazy chunks load.

### 2. Shared Settings Form State & Safety Invariants
- **`SettingsFormProvider` & `useSettingsForm` (`src/context/SettingsFormContext.tsx`, `src/hooks/useSettingsForm.ts`):** All `/sba` and `/settings/*` routes share one draft, one 500ms debounced auto-save timer (`baselineSeqRef`, `formGenerationRef`), `isPersistenceSuspended` read-only locks, Reset baseline protection, and the Class Name confirmation modal—with zero changes to `src/context/SchoolContext.tsx`.
- **Settings Hub (`src/pages/settings/SettingsHub.tsx:35-79`):** Scannable cards with live configuration metadata pills (`STANDARD`, `JHS • N subjects`, `50/50 • N tasks`, template name, `PIN Enabled` / `PIN Off`).

### 3. High-Craft Domain Workflows
- **Print Preview (`src/pages/PrintPreview.tsx:18-69, 136-187`):** Animated `Color` / `B&W` Ink Mode toggle and aggressive `@media print` A4 zero-margin isolation (`210mm × 297mm`) with missing-photo preflight warnings.
- **Continuous Grading Ergonomics (`src/components/ScoreEntryModal.tsx:36-74, 89-165`):** `Prev` / `Next` buttons, student dropdown switcher, mobile horizontal swipe navigation (`useSwipe`), and **Subject Focus Mode** (`filterSubject`) so a teacher can enter Mathematics scores for every student consecutively without losing subject context.
- **Offline Utilities:** Client-side image compression in `ImageUploader.tsx`, storage quota awareness in `StorageMonitor.tsx`, auto-fill remarks in `Dashboard.tsx`, and `Smart Generate` / `Shuffle` traits in `DetailsTab.tsx`.

---

## Part 2: What to CHANGE — Phased Execution Roadmap

Each goal below is scoped so it can be implemented, tested, verified (`npm run lint`, `npx tsc -b`, `npm test -- --run`), and committed as one clean atomic PR/commit series.

---

### Goal 3 (Phase A): Navigation Chrome Polish, Header Deduplication & Mobile Overlay Clearance

**Objective:** Eliminate redundant headers/back-links introduced when wrapping legacy full-page headers inside `AppShell`, update stale navigation copy, and lift floating UI above the mobile bottom bar.

#### Findings in Current Codebase
1. **Duplicate Brand Header on Desktop:**
   - `AppShell.tsx:51-73` renders the Repota logo, `REPOTA` wordmark, `{settings.schoolName}`, and `{settings.className}` pill at the top of the fixed `w-64` desktop sidebar.
   - `PageHeader.tsx:24-37` renders the exact same Repota logo, `REPOTA` wordmark, and `{schoolName}` immediately adjacent to the sidebar on desktop across `Dashboard.tsx`, `SbaPage.tsx`, `Analytics.tsx`, `SettingsHub.tsx`, `Settings.tsx`, and `SettingsSubPageLayout.tsx`.
2. **Double Back Navigation on Sub-Pages & Redundant Back Button on Primary Tab:**
   - `SettingsSubPageLayout.tsx:34-46` renders a `Back` link in `PageHeader` (via `SettingsHeaderActions.tsx:38-46`) **and** a second `"← Back to Settings"` link directly beneath the header.
   - `Analytics.tsx:237-244` and `267-274` render a `"← Back to Dashboard"` button even though `Analytics` is now a primary top-level destination in both the bottom bar and sidebar.
3. **Outdated Navigation Copy:**
   - `SubjectRow.tsx:427-438` still displays `"Components managed in Settings. Go to Settings → Subject Components"` with plain text instead of linking directly to `/sba`.
   - `Dashboard.tsx:415-433` (`WelcomeTour`) instructs new teachers to *"click the 'Settings' button (⚙️) at the top"* and *"click 'Analytics' button"* instead of referencing the navigation bar and dedicated `SBA` tab.
4. **Bottom-Bar Overlay Collisions on Mobile:**
   - `ToastContext.tsx:27` (`fixed right-4 bottom-4 z-50`), `PwaInstallPrompt.tsx:131,181` (`fixed right-4 bottom-4 left-4 z-50`), and `PwaUpdatePrompt.tsx:38` (`fixed right-4 bottom-4 left-4 z-50`) sit at `bottom-4`, overlapping the fixed mobile bottom bar (`AppShell.tsx:144`).

#### Recommended Changes
- **`PageHeader.tsx`:** Keep the full brand lockup visible on `< md` (`md:hidden`), and on `md+` render either a lightweight context title/breadcrumb slot or right-aligned page actions so desktop pages do not show `"REPOTA"` twice.
- **`SettingsSubPageLayout.tsx` & `SettingsHeaderActions.tsx`:** Remove the duplicate `Back` button from `PageHeader` on settings sub-pages (keep `"← Back to Settings"` breadcrumb above the `<h1>` title, plus mobile/desktop `Reset` action in the header), and remove `"← Back to Dashboard"` from `Analytics.tsx`.
- **`SubjectRow.tsx`:** Replace plain `"Settings → Subject Components"` text with a direct interactive `<Link to="/sba">` (closing the modal if needed via callback) so teachers aren't stranded.
- **`Dashboard.tsx` (`WelcomeTour`):** Update tour copy to describe the bottom bar / sidebar tabs (`Home`, `SBA`, `Analytics`, `Settings`) and header `Print` / `+ Actions`.
- **`ToastContext.tsx`, `PwaInstallPrompt.tsx`, `PwaUpdatePrompt.tsx`:** Update fixed bottom offsets to `bottom-20 md:bottom-4 print:hidden` (matching `AutoSaveIndicator.tsx` and `ScrollButton.tsx`) so toasts and install/update banners never cover mobile tabs or appear in print.

#### Verification & Commit
- **Verification:** `npm run lint`, `npx tsc -b`, `npm test -- --run` (updating `NavigationShell.test.tsx` to assert non-overlapping overlay positioning classes and SBA link presence).
- **Proposed Atomic Commit:** `feat(ui): deduplicate desktop header chrome and clear mobile bottom bar overlays`

---

### Goal 4 (Phase B): Dashboard De-Cluttering, Mobile Student Cards & Bulk Import Subject Fix

**Objective:** Remove mobile horizontal/nested scroll traps in the student roster, fix missing subjects on bulk-imported students, unify conflicting "Add Student" creation flows, and make stat/warning banners actionable.

#### Findings in Current Codebase
1. **Mobile Scroll Trap & Hidden Actions in `StudentList.tsx`:**
   - `StudentList.tsx:104-112` wraps `<table className="w-full min-w-176">` (`704px` wide) inside `<div style={{ maxHeight: "600px", overflow: "auto" }}>`. On phones, this creates a nested vertical scroll container inside the page scroll and forces horizontal panning to see `Avg. Score`, `Position`, or row `Actions`.
   - `StudentList.tsx:157-165`: Clicking a student's name or row does nothing; teachers must find the small `Edit` pencil icon at the far right of the 704px table.
   - `StudentList.tsx:185`: `md:opacity-0 md:group-hover:opacity-100` hides desktop row buttons for keyboard users until mouse hover (needs `md:group-focus-within:opacity-100`).
2. **Two Divergent "Add Student" Flows & Placeholder Pollution:**
   - `Dashboard.tsx:84-97` (`handleAddNew` from `+ Actions` / header `Add Student` button) immediately inserts `"New Student"` with `subjects: []` and opens `ScoreEntryModal`. If a teacher cancels immediately, `"New Student"` remains in the roster.
   - `StudentList.tsx:44-81, 253-341` (`Add Student` inside the roster card) opens a modal asking for `Full Name` + `Gender`, then populates `subjects` from `settings.defaultSubjects || DEFAULT_SUBJECTS[settings.level]`.
3. **Bulk Import Missing Subjects Bug (`BulkImportModal.tsx`):**
   - `BulkImportModal.tsx:47-54` creates every imported student with `subjects: []` and timestamp-based IDs (`${Date.now()}-${index}`) instead of initializing `defaultSubjects` (like `StudentList.tsx:50-67`) and `crypto.randomUUID()`. Every bulk-imported student lands with `0 Subjects` and triggers `ValidationWarnings`.
4. **Overlapping Action Menus, Static Alerts & Misaligned Search Spinner:**
   - `Dashboard.tsx:165-213` (`+ Actions` in `PageHeader`) duplicates `Add Student`, `Import Names`, `Export Full Data`, and `Auto-Fill Remarks` from `DashboardToolbar.tsx:105-175` (`Actions ⋮`).
   - `DashboardStats.tsx` (`Pending Entry` card) and `ValidationWarnings.tsx` show issues statically without letting teachers click to filter to `Incomplete` students or jump to Fix.
   - `Dashboard.tsx:296-300` positions `<LoadingSpinner>` at `top-2 left-80`, visually misaligned relative to the full-width search bar in `DashboardToolbar.tsx:56-67`.

#### Recommended Changes
- **Responsive Student Roster (`StudentList.tsx`):**
  - Render compact, one-thumb **mobile student cards (`md:hidden`)** displaying student name, average score / grade badge, subjects count, position badge, quick **Enter Scores**, **Print**, and **Delete** buttons—eliminating the `min-w-176` horizontal table and `maxHeight: "600px"` nested scroll trap on phones.
  - Keep the virtualized table on `md:block`, make the row/name clickable to open `ScoreEntryModal`, and add `md:group-focus-within:opacity-100` for keyboard accessibility.
- **Unified Student Creation & Shared Subject Factory:**
  - Extract a small helper `createStudentWithDefaultSubjects(name, gender, settings)` shared by `StudentList.tsx` and `BulkImportModal.tsx` (generating `crypto.randomUUID()` IDs and seeding `settings.defaultSubjects || DEFAULT_SUBJECTS[settings.level]`).
  - Route both `Dashboard`'s header `+ Add Student` button and `+ Actions → Add Student` to the clean `"Add New Student"` modal (adding a secondary `"Save & Enter Scores"` button so teachers can jump straight into grading without creating `"New Student"` ghosts).
- **Clarify Toolbar vs. Header Actions (`Dashboard.tsx` & `DashboardToolbar.tsx`):**
  - Keep `Print` and a focused `+ Create / Import` (`Add Student`, `Bulk Import`) action in `PageHeader`, while keeping data utilities (`Auto-Fill Remarks`, `Export CSV`, `Export Student List`, `Clear All Scores`, `Clean Empty Rows`) cleanly in `DashboardToolbar` so menus do not duplicate half their items.
- **Interactive Stats/Warnings & Spinner Alignment:**
  - Allow clicking `Pending Entry` in `DashboardStats.tsx` or warning banners in `ValidationWarnings.tsx` to toggle `activeFilter="PENDING"` (or open incomplete students).
  - Move the search debounce spinner inside `DashboardToolbar.tsx` at `right-3` inside the search input container instead of `left-80` in `Dashboard.tsx`.

#### Verification & Commit
- **Verification:** Add/update tests in `StudentCRUD.test.tsx` (bulk import seeds default subjects; unified add-student flow; mobile card rendering; `DashboardStats` pending filter trigger) and run `npm run lint`, `npx tsc -b`, `npm test -- --run`.
- **Proposed Atomic Commit:** `feat(dashboard): add mobile student cards, unify student creation, and fix bulk import subjects`

---

### Goal 5 (Phase C): Score Entry Modal & Assessment Ergonomics

**Objective:** Prevent silent data loss in `DetailsTab`, eliminate hidden score labels on larger screens, maximize mobile vertical space while typing scores, and fix CSS class typos.

#### Findings in Current Codebase
1. **Silent Data Loss Risk in `DetailsTab.tsx` (`ScoreEntryModal.tsx:209-221`):**
   - `AcademicTab.tsx` auto-saves score edits on every change/blur, and `DetailsTab.tsx:63-82` auto-saves `Gender` immediately on click.
   - However, `DetailsTab.tsx:23-60` buffers `Full Name`, `Date of Birth`, `Days Present`, `Promotion`, `Conduct`, `Interest`, and `Teacher's Remark` in local component state requiring an explicit click on `"Save Student Details"` (`lines 299-309`).
   - Because `ScoreEntryModal.tsx:220` mounts `<DetailsTab key={student.id} />`, clicking `Prev` / `Next`, selecting another student from the dropdown, switching back to `Academic Scores`, swiping, or closing the modal **unmounts `DetailsTab` and silently discards all unsaved edits** with no warning or auto-flush.
2. **Hidden Score Input Labels & Class Typos (`SubjectRow.tsx`, `ScoreEntryModal.tsx`, `AcademicTab.tsx`):**
   - `SubjectRow.tsx:232` and `280` mark `Class` and `Exam` input labels as `sm:hidden`. On tablet and desktop screens, teachers see two bare number inputs side by side—one expecting a direct class score (`0–${maxClassScore}` when no SBA components are active) and one expecting a raw exam percentage (`0–100`, automatically scaled to `/${maxExamScore}`). Without persistent column headers/labels, teachers frequently type raw 0–100 class scores into the bounded `/50` field and get unexpected clamping.
   - `ScoreEntryModal.tsx:171` has `<X className="tw-5" />` (typo for `h-5 w-5`, rendering at default SVG size).
   - `AcademicTab.tsx:136` has `active:scale-95\` (stray backslash in Tailwind class string).
3. **Cramped Mobile Viewport Height (`ScoreEntryModal.tsx:78-174`):**
   - Stacking `Prev`/`Next`, the student `<select>`, `{level} • {className}`, and the subject filter `<select>` inside `p-4` inside a `max-h-[90vh]` centered modal leaves tight scrolling room when the mobile soft keyboard rises.

#### Recommended Changes
- **Seamless Auto-Save / Auto-Flush in `DetailsTab.tsx`:**
  - Either persist `DetailsTab` field changes cleanly on blur / debounced change (matching `AcademicTab` and Settings auto-save), or expose an imperative flush/dirty guard when navigating (`Prev`/`Next`/dropdown/tab switch/close) so teacher remarks and attendance are never silently dropped.
- **Persistent Input Labels in `SubjectRow.tsx`:**
  - Always label `Class (/${maxClassScore})` (or `Auto SBA`) and `Exam (/100 → /${maxExamScore})` clearly across all breakpoints so the 0–100 raw-exam conversion rule is unmistakable.
- **Mobile Full-Height Sheet Layout & Typo Fixes:**
  - Make `ScoreEntryModal` full-viewport height on `< sm` (`h-dvh rounded-none sm:h-auto sm:max-h-[90vh] sm:rounded-xl`) with a sleeker compact mobile header so subjects fill the screen above the numeric keypad.
  - Fix `<X className="h-5 w-5" />` (`ScoreEntryModal.tsx:171`) and `active:scale-95` (`AcademicTab.tsx:136`).

#### Verification & Commit
- **Verification:** Add unit/integration tests covering `DetailsTab` edit persistence on student switch/close and `SubjectRow` label visibility, then run `npm run lint`, `npx tsc -b`, and `npm test -- --run`.
- **Proposed Atomic Commit:** `fix(assessment): prevent DetailsTab data loss and improve ScoreEntryModal ergonomics`

---

### Goal 6 (Phase D): SBA Workflow Completion (Bulk Task Assignment & Subject Grading Launcher)

**Objective:** Make the dedicated `/sba` destination genuinely fast for multi-subject classroom setup and connect SBA task configuration directly to score entry.

#### Findings in Current Codebase
1. **High-Friction Per-Subject Task Assignment (`SbaAssessmentSection.tsx:248-311`):**
   - Assigning 3–4 SBA tasks (`CAT 1`, `Group Work`, `Project`, `Homework`) across 9–10 GES subjects requires 30–40 individual pill clicks one subject at a time. There is no `"Assign All Tasks to All Subjects"` or per-task `"Apply to all subjects"` shortcut.
2. **No Direct Path from `/sba` to Grading (`SbaPage.tsx:33-131`):**
   - On `/sba`, teachers can configure SBA weights, define tasks, assign tasks to subjects, click `"Sync Tasks to Students"`, and export CSV, but there is no shortcut on `/sba` to launch into grading scores for a chosen subject (`ScoreEntryModal` with `filterSubject` pre-selected).

#### Recommended Changes
- **Bulk Task Assignment (`SbaAssessmentSection.tsx` & `SettingsFormContext.tsx`):**
  - Add `"Apply to all subjects"` on each task chip (or `"Assign All Library Tasks to All Subjects"` / `"Clear Subject"` controls) to turn 30+ repetitive taps into 1 tap.
- **Outdated Sync Callout & Direct Subject Grading Launcher (`SbaPage.tsx`):**
  - Surface a clear inline banner when `hasOutdated || hasMissing` is true explaining that existing students need `"Sync Tasks to Students"` for new SBA tasks to appear on their score sheets.
  - Add an `"Enter Scores by Subject"` quick-launcher card/action on `/sba` (opening a focused student/subject entry modal or navigating to `/` with the selected subject pre-focused).

#### Verification & Commit
- **Verification:** Extend `SettingsSubRoutes.test.tsx` (or add `SbaWorkflow.test.tsx`) to verify bulk task-to-subject assignment updates `subjectComponentMap` and syncs properly, then run `npm run lint`, `npx tsc -b`, and `npm test -- --run`.
- **Proposed Atomic Commit:** `feat(sba): add bulk subject task assignment and subject score entry launcher`

---

### Goal 7 (Phase E): Analytics Mobile Filter Drawer, SBA vs. Exam Insights & Actionable Cards

**Objective:** Fix Analytics mobile ergonomics and active-filter count bug, add SBA vs. Exam diagnostic metrics, and connect risk insights back to student editing.

#### Findings in Current Codebase
1. **Mobile Filter Panel Buried at Bottom & Filter Count Bug:**
   - `Analytics.tsx:344-353` places `<FilterPanel>` in `order-2 lg:order-1`, burying all filters below every chart and table on mobile viewports.
   - `FilterPanel.tsx:196-197` writes `(filters.scoreRange?.min || 0) > 0 || ((filters.scoreRange?.max || 100) < 100 && "Score Range")`. Because of JS operator precedence, when `max < 100` it correctly pushes `"Score Range"`, but when `min > 0` the boolean `true` itself enters the array (`1 active filter(s)`), while the combined condition is fragile if refactored. Also `FilterPanel.tsx:148, 166` treats `value={filters.scoreRange?.max || 100}` so typing `"0"` as max jumps to `100`.
2. **Missing SBA vs. Examination Performance Breakdown:**
   - Despite teachers tracking both Continuous Assessment (Class Score / SBA) and Examination scores, `Analytics.tsx` only analyzes combined totals (`averageScore`) and does not compare Class Score % vs. Exam Score % per subject to flag discrepancies (e.g., high SBA class scores vs. low exam scores).
3. **Static At-Risk Student Cards (`Analytics.tsx:1033-1064`):**
   - `AI Insights` highlights at-risk students with risk badges, but teachers cannot click a student card to inspect/edit their scores or attendance.

#### Recommended Changes
- **Mobile Collapsible Filter Drawer & `FilterPanel` Bug Fix:**
  - Add a compact collapsible `"Filters (N active)"` bar above the view tabs on `< lg` in `Analytics.tsx` while keeping the sticky desktop sidebar (`lg:col-span-1`), and fix `FilterPanel.tsx` nullish/precedence handling (`??` for `min`/`max` and grouped `((min > 0) || (max < 100)) && "Score Range"`).
- **SBA vs. Exam Analytics Breakdown (`analyticsCalculator.ts` & `Analytics.tsx`):**
  - Compute per-subject average Class Score % vs. Exam Score % and surface an SBA vs. Exam diagnostic view/chart in the `Subjects` or `Overview` tab.
- **Actionable Student Insight Cards:**
  - Allow clicking an at-risk or struggling student card to navigate/open that student's record in `ScoreEntryModal` on Dashboard (or inline quick modal).

#### Verification & Commit
- **Verification:** Add targeted tests for `FilterPanel` active filter count / `0` bounds and SBA vs. Exam metric calculation, then run `npm run lint`, `npx tsc -b`, and `npm test -- --run`.
- **Proposed Atomic Commit:** `feat(analytics): add SBA vs exam insights, mobile filter drawer, and actionable student cards`

---

### Goal 8 (Phase F): Visual Identity Alignment, Modal Accessibility & Dead-Code Cleanup

**Objective:** Unify legacy purple theme drift onto the Navy + Ghana Gold design system, add accessible dialog semantics/keyboard traps across modals, and remove dead legacy files.

#### Findings in Current Codebase
1. **Theme Drift in Security Flows (`PinSetup.tsx` vs `LockScreen.tsx` & `index.css`):**
   - `src/index.css:3-25` and `LockScreen.tsx:130-154` establish the Navy Blue (`#1e3a8a`) + Ghana Gold (`#fcd34d`) palette.
   - `PinSetup.tsx:160, 219, 294, 366, 432, 541` still uses inline legacy purple gradients (`linear-gradient(to bottom right, #3b82f6, #9333ea)`), and `src/theme/tokens.ts` defines an unused purple palette (`primary.600 = #9333ea`).
2. **Accessibility & Keyboard Semantics Gaps:**
   - `src/components/ui/Modal.tsx:26-38` lacks `role="dialog"`, `aria-modal="true"`, and an `Escape` key close listener (contrast with `ConfirmModal.tsx:43-50`, which does handle `Escape`).
   - `src/components/ImageUploader.tsx:61-80` attaches `onClick` to a `<div>` without `role="button"`, `tabIndex={0}`, `onKeyDown`, or an explicit visible upload action hint on touch devices where CSS `group-hover` never triggers.
3. **Unused Legacy Dead Code:**
   - `src/components/Layout.tsx` (76 lines — old pre-router 3-button fixed top bar): 0 imports in `src/`.
   - `src/components/SchoolSettingsForm.tsx` (444 lines — old monolithic manual-save settings form): 0 imports in `src/`.
   - `src/theme/tokens.ts` (226 lines — unused legacy purple tokens): 0 imports in `src/`.

#### Recommended Changes
- **Align Security Screens:** Update `PinSetup.tsx` gradients/accents to match `LockScreen.tsx`'s Navy + Gold palette (`#1e3a8a` -> `#2563eb` with amber accents) and ensure `PinRecovery.tsx` inherits consistent modal spacing/contrast.
- **Harden `Modal.tsx` & `ImageUploader.tsx`:** Add `role="dialog"`, `aria-modal="true"`, and `Escape` handling to `Modal.tsx`; give `ImageUploader.tsx` a focusable button trigger (`type="button"`) plus an always-accessible `"Change photo"` / `"Upload"` affordance on mobile touchscreens.
- **Remove Unused Legacy Files:** Delete `src/components/Layout.tsx`, `src/components/SchoolSettingsForm.tsx`, and `src/theme/tokens.ts` (after confirming zero test or runtime references).

#### Verification & Commit
- **Verification:** Verify modal `Escape`/ARIA behavior in unit tests, confirm zero orphan imports, and run `npm run lint`, `npx tsc -b`, `npm test -- --run`.
- **Proposed Atomic Commit:** `chore(ui): align security theme, improve modal accessibility, and remove legacy dead code`

---

## Suggested Execution Order & Priorities

| Order | Goal | User Impact | Risk |
|---|---|---|---|
| **1st** | **Goal 3 (Phase A):** Navigation Chrome & Mobile Overlay Clearance | Immediate visual polish + stops toasts/PWA prompts covering mobile tabs | Low |
| **2nd** | **Goal 4 (Phase B):** Mobile Student Cards, Unified Add Student & Bulk Import Fix | Fixes real data-entry bug (`subjects: []`) + removes mobile table horizontal scroll trap | Medium |
| **3rd** | **Goal 5 (Phase C):** `DetailsTab` Data-Loss Prevention & `SubjectRow` Labels | Eliminates silent remark/attendance loss + clarifies `/50` vs `/100` scoring | Medium |
| **4th** | **Goal 6 (Phase D):** SBA Bulk Assignment & Subject Grading Launcher | Turns 30+ SBA setup taps into 1 tap + connects `/sba` directly to grading | Low–Medium |
| **5th** | **Goal 7 (Phase E):** Analytics Mobile Filter Drawer & SBA vs. Exam Insights | Makes Analytics actionable on phones and adds SBA diagnostic value | Low–Medium |
| **6th** | **Goal 8 (Phase F):** Theme Alignment, Modal A11y & Dead-Code Cleanup | Consistent brand finish, keyboard accessibility, and leaner codebase | Low |

All goals keep `src/context/SchoolContext.tsx`, IndexedDB storage keys (`ges_v1_students`, `ges_v1_settings`), backup formats, and Privacy/PostHog `data-record="true"` rules intact.
