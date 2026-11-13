# Ground truth audit

## Key findings

- Print itself does not call the lock setter; a print-related `visibilitychange` lock is only an inferred cause.
- App reads auto-lock from provider settings, which SchoolContext writes under `"ges_v1_settings"`.
- DataGate covers Dashboard, Settings, Print, and Analytics and includes backup recovery on load error.
- Dashboard pending logic treats zero scores as incomplete, including class score zero in MOCK mode.
- `"New Student"` is persisted if its modal is closed without saving.
- Report templates consume both `academicYear` and `nextTermStarts`.
- The implemented student photo field is `pictureUrl`.
- Backup validation permits non-empty non-UUID IDs for compatibility.
- Duplicate student IDs are accepted without uniqueness validation.
- Provider saves swallow write failures; only quota failures alert.
- PostHog autocapture and pageview are enabled despite contradictory comments.
- Modal primitive has no focus trap, Escape handling, ARIA role, or internal scroll lock.
- Browser/PWA print, service-worker activation, and device-specific behavior remain open questions.

## 7. Lock + print loop

| Area | Finding | Evidence |
|---|---|---|
| React lock state | `isLocked` is App-local React state, initialized from `isPinConfigured()`. It is not stored in sessionStorage/localStorage. | CONFIRMED — [App.tsx](../src/App.tsx#L17-L18) |
| Idle trigger | `useIdleTimer` calls `handleIdle`; it locks only when a PIN is configured and the app is currently unlocked. | CONFIRMED — [App.tsx](../src/App.tsx#L28-L39); [useIdleTimer.ts](../src/hooks/useIdleTimer.ts#L1-L80) |
| Hidden-tab trigger | `visibilitychange` sets locked when `document.hidden` and a PIN is configured. | CONFIRMED — [App.tsx](../src/App.tsx#L42-L54) |
| Other triggers | No `blur`, `pagehide`, `freeze`, or route-change lock handler was found in `src`. | CONFIRMED — search of `src` |
| Print button | Print Preview captures `Printed_Reports`, then calls `window.print()` directly. | CONFIRMED — [PrintPreview.tsx](../src/pages/PrintPreview.tsx#L82-L89) |
| Alternate print helper | `createPrintHandler` dispatches `beforeprint`, waits 100 ms, then calls `window.print()`. | CONFIRMED — [printHandler.ts](../src/utils/printHandler.ts#L12-L31) |
| LockScreen mount | After 500 ms it enables/focuses PIN input and checks biometric enrollment; on non-iOS it automatically attempts biometric unlock. | CONFIRMED — [LockScreen.tsx](../src/components/LockScreen.tsx#L27-L45); [LockScreen.tsx](../src/components/LockScreen.tsx#L67-L78) |
| Re-trigger after unlock | A successful biometric/PIN attempt calls `onUnlock` after 400 ms. App then unmounts LockScreen because `isLocked` becomes false; a later lock remounts it and repeats the mount attempt. | CONFIRMED — [LockScreen.tsx](../src/components/LockScreen.tsx#L40-L44); [App.tsx](../src/App.tsx#L57-L63) |
| App remount during print/navigation | The router changes route content, but App remains the owner of `isLocked`; no code explicitly remounts App for `/print` or `window.print()`. | CONFIRMED — [App.tsx](../src/App.tsx#L1-L111); [router.tsx](../src/router.tsx#L1-L75) |
| Browser events | `window.print()` dispatches `beforeprint` and `PRINT_STARTED_EVENT`; App sets print suppression which clears only after `PRINT_LOCK_SUPPRESSION_MS` (with no `afterprint` listener). | CONFIRMED — [App.tsx](../src/App.tsx#L44-L96); [printHandler.ts](../src/utils/printHandler.ts#L6-L37) |

**Best-evidence loop explanation:** The repository directly proves that printing itself does not call `setIsLocked`; the only in-repo lock trigger during print is `visibilitychange` if printing makes the document hidden. It is INFERRED that a platform print/PWA transition may emit a hidden visibility state, causing the immediate lock; this needs device/browser reproduction. After unlock, the same visibility transition or another idle event can lock again, producing the reported loop.  

**Current implementation:** `beforeprint` or `PRINT_STARTED_EVENT` sets `printInProgressRef`, blocking idle and visibility locks in `App.tsx`. Print suppression clears only when the `PRINT_LOCK_SUPPRESSION_MS` timer fires, with no `afterprint` handler. Note the remaining risk that an app switch during the 2-minute suppression window is not immediately locked; device validation is retained. CONFIRMED — [App.tsx](../src/App.tsx#L44-L96).

## 8. Auto-lock timeout

| Question | Finding | Evidence |
|---|---|---|
| App read key/backend | App reads `settings.autoLockTimeout` from the settings returned by `useSchoolData()`. | CONFIRMED — [App.tsx](../src/App.tsx#L21-L24); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L784-L810) |
| Provider write key/backend | SchoolContext persists settings through `saveToStorage(IDB_KEYS.SETTINGS, ...)`. | CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx#L153-L157); [idbStorage.ts](../src/utils/idbStorage.ts#L6-L22) |
| Match | App reads the provider settings written by SchoolContext; it does not call `loadFromStorage("app-data")`. | CONFIRMED — [App.tsx](../src/App.tsx#L21-L24); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L153-L157) |
| Missing default | `idleTimeout` starts at 5 minutes and remains there when the App read has no usable `autoLockTimeout`. | CONFIRMED — [App.tsx](../src/App.tsx#L20-L28) |
| Effect dependencies | The idle timer receives `idleTimeout` directly from reactive `settings.autoLockTimeout` via `useSchoolData()`; it re-evaluates reactively when settings change. | CONFIRMED — [App.tsx](../src/App.tsx#L23-L41); [useIdleTimer.ts](../src/hooks/useIdleTimer.ts#L12-L55) |
| Change without reload | A Settings edit updates `settings.autoLockTimeout` in SchoolContext, which reactively updates `idleTimeout` and `useIdleTimer` in `App.tsx` without requiring a reload. | CONFIRMED — [App.tsx](../src/App.tsx#L23-L41); [Settings.tsx](../src/pages/Settings.tsx#L1298) |

## 9. `nextTermStarts` and `academicYear`

| Field | Consumers | Evidence |
|---|---|---|
| `academicYear` | Settings input; ReportTemplate; ReportHeader; Classic, Minimal, Modern, and Original templates. | CONFIRMED — [Settings.tsx](../src/pages/Settings.tsx#L663-L668); [ReportTemplate.tsx](../src/components/ReportTemplate.tsx#L120); [ReportHeader.tsx](../src/components/reports/ReportHeader.tsx#L60); template matches in `src/templates/` |
| `nextTermStarts` | Settings input; ReportTemplate; StudentInfo; Classic, Minimal, Modern, and Original templates. Empty values are rendered as `TBA` in ReportTemplate/StudentInfo and hidden date text in templates using a conditional. | CONFIRMED — [Settings.tsx](../src/pages/Settings.tsx#L653-L657); [ReportTemplate.tsx](../src/components/ReportTemplate.tsx#L209-L219); [StudentInfo.tsx](../src/components/reports/StudentInfo.tsx#L69-L79); [ClassicTemplate.tsx](../src/templates/ClassicTemplate.tsx#L347-L351) |

No additional destructuring, alias, bracket access, Dashboard, Analytics, export, or test consumer was found beyond the listed settings/test fixtures. CONFIRMED — broad `src` search for field names and visible labels.

## 1. Student creation and analytics events

| Path | Creation details | `silent` / event | Evidence |
|---|---|---|
| Dashboard empty-state Add | Creates `Date.now().toString()` ID, name `"New Student"`, default Male, class from settings, no subjects; calls `addStudent(newStudent)` then opens ScoreEntryModal. | `silent` omitted (`false`), but `addStudent` suppresses `Added_Student` when name is `"New Student"`. CONFIRMED — [Dashboard.tsx](../src/pages/Dashboard.tsx#L83-L99); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L238-L247) |
| StudentList add | Creates UUID student ID and UUID subject IDs from settings/default-level subjects; name is typed input. | `silent` omitted; `Added_Student` fires for any non-`"New Student"` name. CONFIRMED — [StudentList.tsx](../src/components/StudentList.tsx#L44-L78); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L240-L245) |
| BulkImportModal | Creates timestamp-index IDs, typed names, default Male, class from settings, no subjects. | Calls `addStudent(newStudent, true)` for every row; no `Added_Student`. One `Bulk_Import_Success` event fires if at least one row was imported. CONFIRMED — [BulkImportModal.tsx](../src/components/BulkImportModal.tsx#L38-L72) |
| Demo data | Creates ten hard-coded demo students, IDs `demo-1` through `demo-10`, generated subjects/scores. | Direct `setStudents`; no `Added_Student`; one `Loaded_Demo_Data` event after insertion. CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx#L524-L542); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L725-L741) |
| Backup import | Writes the validated incoming array directly through `saveToStorage`; it does not call `addStudent`. | No student-added analytics event. CONFIRMED — [backupValidation.ts](../src/utils/backupValidation.ts#L55-L77) |

When a `"New Student"` placeholder is renamed and saved, `DetailsTab` calls `onUpdate`; it does not call `addStudent`, so `Added_Student` is never fired on that path. Closing the modal without saving does not delete the placeholder: Dashboard already inserted it into provider state, and the provider’s debounced student save persists it. CONFIRMED — [Dashboard.tsx](../src/pages/Dashboard.tsx#L95-L97); [DetailsTab.tsx](../src/components/tabs/DetailsTab.tsx#L31-L57); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L177-L187)

Every `posthog.capture` in `src`: `Added_Student` for non-silent, non-placeholder add; `Bulk_Import_Success` for a non-empty bulk import; `Loaded_Demo_Data` after demo insertion; `School_Level_Changed` after a level change; `Template_Changed` after template selection; `Printed_Reports` when Print Preview’s print handler is invoked; `Auto_Remarks_Generated` after auto-generating remarks. CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx#L240-L245); [BulkImportModal.tsx](../src/components/BulkImportModal.tsx#L66-L70); [Settings.tsx](../src/pages/Settings.tsx#L213); [Settings.tsx](../src/pages/Settings.tsx#L1122); [PrintPreview.tsx](../src/pages/PrintPreview.tsx#L77-L88); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L816-L819)

## 2. Definitions of incomplete

| Surface | Predicate | Evidence |
|---|---|---|
| Dashboard filter and DashboardStats pending | `subjects.length === 0` OR any subject has `classScore === 0` OR `examScore === 0`. Failing is the inverse of pending plus `averageScore < 50`. | CONFIRMED — [Dashboard.tsx](../src/pages/Dashboard.tsx#L63-L70); [DashboardStats.tsx](../src/components/DashboardStats.tsx#L16-L31) |
| `deletePendingStudents` | Keeps only students with at least one subject and at least one subject where class or exam score is `> 0`; removes all others. | CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx#L266-L281) |
| ValidationWarnings no-score | No subject has class or exam score `> 0`. | CONFIRMED — [ValidationWarnings.tsx](../src/components/ValidationWarnings.tsx#L9-L19) |
| ValidationWarnings incomplete | At least one scored subject, but count of subjects having either score `> 0` is less than `settings.defaultSubjects.length`. | CONFIRMED — [ValidationWarnings.tsx](../src/components/ValidationWarnings.tsx#L21-L29) |
| StudentList badges | Average displays `-` when `averageScore` is not `> 0`; class-position badge is hidden only when `classPosition === "Pending..."`. | CONFIRMED — [StudentList.tsx](../src/components/StudentList.tsx#L148-L158) |
| Print warning | Counts printable students with no `pictureUrl`; it does not classify scores as incomplete. | CONFIRMED — [PrintPreview.tsx](../src/pages/PrintPreview.tsx#L73-L74); [PrintPreview.tsx](../src/pages/PrintPreview.tsx#L203-L208) |
| CSV/export | Exports the processed fields; no independent incomplete predicate was found. | CONFIRMED — [export.ts](../src/utils/export.ts#L1-L60) |

MOCK handling is not consistent: the pending predicates still treat a zero class score as incomplete, even though MOCK settings use `classScoreMax === 0`; AcademicTab hides component-sync alerts for MOCK, but does not change these dashboard predicates. A legitimate score of `0` is therefore indistinguishable from missing in these predicates. `"New Student"` has no subjects and is pending. CONFIRMED — [AcademicTab.tsx](../src/components/tabs/AcademicTab.tsx#L35-L39); [settingsSchema.ts](../src/schemas/settingsSchema.ts#L138-L148)

`classScore === 0` is **not** true for every MOCK student as a language/runtime fact; it is only required by the Settings schema’s MOCK configuration (`classScoreMax === 0`), while stored subject records can still contain other values. The code does not normalize every student subject class score to zero. CONFIRMED — [settingsSchema.ts](../src/schemas/settingsSchema.ts#L138-L148); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L524-L542)

## 3. What reports print

| Template | Empty-field behavior found in code | Evidence |
|---|---|---|
| ReportTemplate | Photo is hidden if absent; attendance uses `-`; next term uses `TBA`; conduct and interest have defaults; generated headmaster remark always has text; signatures/names are conditional. | CONFIRMED — [ReportTemplate.tsx](../src/components/ReportTemplate.tsx#L149-L219); [ReportTemplate.tsx](../src/components/ReportTemplate.tsx#L439-L506) |
| ClassicTemplate | Photo has an alternate empty branch; conduct defaults to `Satisfactory`; headmaster remark defaults to `Keep it up.`; fees/signatures/next-term blocks are conditional. | CONFIRMED — [ClassicTemplate.tsx](../src/templates/ClassicTemplate.tsx#L90-L122); [ClassicTemplate.tsx](../src/templates/ClassicTemplate.tsx#L261-L368) |
| MinimalTemplate | Attendance/teacher details and fee/signature blocks use fallbacks or conditional blocks; next term is conditional on a value. | CONFIRMED — [MinimalTemplate.tsx](../src/templates/MinimalTemplate.tsx#L227-L313) |
| ModernTemplate | Photo conditional; attendance uses `0`/`-`; teacher remark has a default; fees and signatures are conditional; next term is conditional. | CONFIRMED — [ModernTemplate.tsx](../src/templates/ModernTemplate.tsx#L231-L234); [ModernTemplate.tsx](../src/templates/ModernTemplate.tsx#L299-L434) |
| OriginalTemplate | Photo `src` is rendered directly; fees are shown when any fee exists; conduct defaults, teacher remark does not visibly add a fallback; signatures and next-term sections are conditional. | CONFIRMED — [OriginalTemplate.tsx](../src/templates/OriginalTemplate.tsx#L10-L10); [OriginalTemplate.tsx](../src/templates/OriginalTemplate.tsx#L391-L466) |
| PrivateSchoolReport | Uses the shared report header/info plus fee block; conduct defaults, teacher remark is direct, and signatures/names are conditional. | CONFIRMED — [PrivateSchoolReport.tsx](../src/components/reports/PrivateSchoolReport.tsx#L223-L246); [PrivateSchoolReport.tsx](../src/components/reports/PrivateSchoolReport.tsx#L262-L362) |

Across the shared report components, academic year and term render directly; class teacher/head teacher names and both signatures are conditional; `nextTermStarts` is `TBA` in shared info or omitted in template-specific conditional blocks. CONFIRMED — [ReportHeader.tsx](../src/components/reports/ReportHeader.tsx#L37-L79); [StudentInfo.tsx](../src/components/reports/StudentInfo.tsx#L13-L79)

A missing photo, signature, optional fee, next-term date, or staff name is visibly blank/hidden (or replaced by a fallback) rather than structurally invalid. Missing student scores, required identity/year/term values, or a teacher remark where a template has no fallback can make a report visibly incomplete. The last sentence is an inference from the conditional/direct expressions. INFERRED — cited template expressions above.

## 4. Page gating and one-time state

| Page | Before loaded | `loadError` | Loaded |
|---|---|---|---|
| Dashboard | `PageLoader` from route-level DataGate | DataGate error screen | Dashboard body |
| Settings | `PageLoader` | DataGate error screen; Settings body is not mounted | Settings body |
| PrintPreview | `PageLoader` | DataGate error screen | Print body |
| Analytics | `PageLoader` | DataGate error screen | Analytics body |

All four routes are wrapped by DataGate. The error screen offers Try again, Start fresh, and recovery-only DataBackup import; therefore it does offer a backup restore path even though Settings itself is gated. CONFIRMED — [router.tsx](../src/router.tsx#L28-L72); [DataGate.tsx](../src/components/DataGate.tsx#L11-L40)

The provider initializes default settings and empty students before asynchronous loading, but persistence effects return while `isDataLoaded` is false and also guard failed keys. CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx#L40-L43); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L180-L199)

One-time settings/student-derived local state that can become stale after hydration/import/restore: App reactively reads settings.autoLockTimeout from useSchoolData() and updates useIdleTimer without becoming stale; Settings draft refs/state initialize from provider settings once; DetailsTab initializes its form from the selected student once per keyed student; SubjectRow initializes component visibility from `hasComponents`; `useDebounce` initializes from its first value; LazyReportCard initializes visibility from print mode. CONFIRMED — [App.tsx](../src/App.tsx#L23-L41); [Settings.tsx](../src/pages/Settings.tsx#L110-L119); [DetailsTab.tsx](../src/components/tabs/DetailsTab.tsx#L20-L35); [SubjectRow.tsx](../src/components/SubjectRow.tsx#L32-L38); [useDebounce.ts](../src/hooks/useDebounce.ts#L1-L18); [LazyReportCard.tsx](../src/components/LazyReportCard.tsx#L19-L20)

## 5. Backup under failure

| Operation | Current behavior | Evidence |
|---|---|---|
| Export loader | Uses `loadFromStorageResult` for students and settings. Any `error`, or provider `loadError`, aborts before file creation and `recordBackup`; empty students require explicit `window.confirm`. | CONFIRMED — [DataBackup.tsx](../src/components/DataBackup.tsx#L73-L91) |
| Null/empty reads | `empty` becomes `[]`/`{}`; empty student export is confirmation-gated. | CONFIRMED — [DataBackup.tsx](../src/components/DataBackup.tsx#L82-L86) |
| Import validation | Plain and decrypted imports both call `validateBackup` before confirmation or writes. | CONFIRMED — [DataBackup.tsx](../src/components/DataBackup.tsx#L171-L184); [DataBackup.tsx](../src/components/DataBackup.tsx#L208-L225) |
| Import atomicity | Reads current values, writes students then settings, and attempts to restore both if the settings write fails. It reports separately if restoration also fails. | CONFIRMED — [backupValidation.ts](../src/utils/backupValidation.ts#L55-L83) |
| `loadError` import | Recovery mode passes `allowUnreadableCurrent`, allowing a validated backup to bypass unreadable-current checks; provider persistence is suspended before the first write. | CONFIRMED — [DataBackup.tsx](../src/components/DataBackup.tsx#L256-L267); [backupValidation.ts](../src/utils/backupValidation.ts#L58-L63) |
| Successful import | Shows a blocking overlay and reloads after about one second; manual Reload now is available. | CONFIRMED — [DataBackup.tsx](../src/components/DataBackup.tsx#L271-L283) |

`restoreDefaults` only updates provider settings and shows a toast; it has no confirm step and relies on the debounced provider save. `startFresh` is reached through the DataGate button, whose label is not itself a confirmation; the provider then opens its `ConfirmModal`, so confirmation occurs before defaults/empty state are applied. CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx#L82-L111); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L207-L211); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L856-L862)

## 12. Data model as implemented

| Type | Fields | Evidence |
|---|---|---|
| `ClassScoreComponent` | Required `id`, `name`, `score`, `maxScore`; optional `category`. |
| `SavedSubject` | Required `id`, `name`, `classScore`, `examScore`; optional `classScoreComponents`. |
| `StudentRecord` | Required `id`, `name`, `className`, `gender`, `subjects`; optional DOB, attendance, remarks, promotion status, and `pictureUrl`. |
| `SchoolSettings` | Required `schoolName`, `academicYear`, `term`, `level`, `schoolType`, score maxima, and `defaultSubjects`; all other identity, staff, date, class-size, component, fee, template, exam, and lock fields are optional. |

The photo field is `pictureUrl`, not `image`. CONFIRMED — [types/index.ts](../src/types/index.ts#L24-L58)

Student IDs are generated with `crypto.randomUUID()` in StudentList, AcademicTab, and demo subject/component creation; Dashboard uses `Date.now().toString()`, BulkImport uses `${Date.now()}-${index}`, and demo students use fixed `demo-1`…`demo-10`. Backup compatibility validation requires only non-empty IDs, so it does not enforce uniqueness or UUID format. CONFIRMED — [StudentList.tsx](../src/components/StudentList.tsx#L59-L72); [Dashboard.tsx](../src/pages/Dashboard.tsx#L84-L88); [BulkImportModal.tsx](../src/components/BulkImportModal.tsx#L42-L53); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L647-L674); [backupValidation.ts](../src/utils/backupValidation.ts#L6-L21)

Required for a structurally correct printed report: student identity/name/class, subject records for academic rows, and settings school identity/year/term/score maxima/default subjects. Optional photo, attendance, remarks, fees, dates, staff names, signatures, and next-term date alter content or fallbacks but are not required by the TypeScript model. The “required for printed report” statement is INFERRED from direct template access and schema requirements. CONFIRMED/INFERRED — [types/index.ts](../src/types/index.ts#L24-L104); [ReportTemplate.tsx](../src/components/ReportTemplate.tsx#L97-L252)

## 13. UI primitives and consistency

The `src/components/ui` barrel exports Button, Badge, Alert, IconButton, Container, Input, Select, Textarea, Modal, PageHeader, FormLabel, Card, LoadingSpinner, Skeleton, and Tooltip. Button variants are primary/danger/secondary/ghost/outline and sizes sm/md/lg; Input/Select/Textarea accept label/error helpers; Modal accepts `isOpen`, `onClose`, children, className, and `closeOnBackdrop`. CONFIRMED — [ui/index.ts](../src/components/ui/index.ts#L1-L45); [Button.tsx](../src/components/ui/Button.tsx#L1-L55); [Modal.tsx](../src/components/ui/Modal.tsx#L1-L42)

Raw controls remain common: DashboardToolbar uses raw input and buttons; StudentList and ScoreEntryModal use raw buttons/selects; Settings and report pages mix raw controls with Input/Select/Textarea. Exact per-page counts are not stable from static JSX alone because conditional branches and child components contribute controls; no runtime DOM count was performed. UNVERIFIED — representative [DashboardToolbar.tsx](../src/components/DashboardToolbar.tsx#L56-L176); [StudentList.tsx](../src/components/StudentList.tsx#L70-L180)

Modal primitive behavior: conditional render, backdrop click only when `closeOnBackdrop` and target is the backdrop. It has no focus trap, no Escape listener, no ARIA role/label, and no internal scroll-lock effect. Custom fixed overlays are used by ScoreEntryModal, ProgressModal, StudentList’s add/delete UI, DataBackup password/reload UI, LockScreen, and WelcomeTour. CONFIRMED — [Modal.tsx](../src/components/ui/Modal.tsx#L11-L40); [ScoreEntryModal.tsx](../src/components/ScoreEntryModal.tsx#L67-L76)

Icon-only buttons without an `aria-label` include several close/menu/edit/delete/print controls in StudentList, ScoreEntryModal, BulkImportModal, DataBackup, PwaUpdatePrompt, and Settings. Some have `title` but not `aria-label`; a complete accessibility count was not runtime-verified. CONFIRMED/UNVERIFIED — examples [StudentList.tsx](../src/components/StudentList.tsx#L162-L184); [ScoreEntryModal.tsx](../src/components/ScoreEntryModal.tsx#L174-L185); [PwaUpdatePrompt.tsx](../src/components/PwaUpdatePrompt.tsx#L76-L82)

## 14. Motion and styling plumbing

`animate-fade-in`, `animate-slide-in-up`, and `animate-shimmer` are defined in `index.css`; `fadeIn`, `slideUp`, and `shimmer` keyframes are also defined there. `animate-in`, `zoom-in-95`, `slide-in-from-*`, and `animate-pulse/spin/ping` are used but are not custom-defined in `index.css`; Tailwind may provide some, while their actual generated CSS was not inspected. No `tailwindcss-animate` or `tw-animate-css` package was found in package manifests. CONFIRMED/UNVERIFIED — [index.css](../src/index.css#L104-L170); [package.json](../package.json#L1-L120)

Transitions/animations are broadly used via Tailwind `transition-*`, custom fade/slide/shimmer, and utility animation classes in components. Reduced motion is handled globally by shortening animations/transitions to `0.01ms`. CONFIRMED — [index.css](../src/index.css#L172-L180)

Theme tokens `bg-background`, `text-main`, `text-muted`, `text-success`, `bg-primary`, and related colors are defined in the Tailwind `@theme` block in index.css. `src/theme/tokens.ts` is a separate purple token object and is not the source of those utility classes. No dark-mode strategy was found in index.css; dark classes appear in PwaUpdatePrompt. Font stack is Inter/system-ui; no external font import was found. CONFIRMED — [index.css](../src/index.css#L3-L31); [tokens.ts](../src/theme/tokens.ts#L20-L74); [PwaUpdatePrompt.tsx](../src/components/PwaUpdatePrompt.tsx#L45-L46)

Viewport meta is supplied by the Vite HTML entry (not inspected in `src`); safe-area utilities and PageHeader’s `safe-top` are defined. Primary actions commonly use roughly `py-2` to `py-3`; exact device touch-target adequacy is UNVERIFIED. CONFIRMED/UNVERIFIED — [index.css](../src/index.css#L57-L93); [PageHeader.tsx](../src/components/ui/PageHeader.tsx#L19-L23)

## 15. PWA update and offline behavior

VitePWA is configured with `registerType: "autoUpdate"` and automatic registration. Workbox precaches HTML/JS/CSS/assets under 3 MB, uses `/index.html` navigation fallback, `NetworkFirst` for JS/CSS runtime assets, and `CacheFirst` for images/CDN assets. The generated service worker calls `skipWaiting`, `clientsClaim`, and `cleanupOutdatedCaches`. CONFIRMED — [vite.config.ts](../vite.config.ts#L21-L77)

`PwaUpdatePrompt` exposes an Update Now button that calls `updateServiceWorker(true)` and dismisses the prompt; Later only clears the prompt. Whether activation reloads every open tab is controlled by the Workbox/runtime implementation and is not verified by repository code. CONFIRMED/UNVERIFIED — [PwaUpdatePrompt.tsx](../src/components/PwaUpdatePrompt.tsx#L26-L42)

An in-progress edit can be lost or interrupted when an update activates: provider saves are debounced at 500 ms, Settings has its own delayed draft autosave, and no update handler snapshots/flushes those edits. This is INFERRED from the debounce paths; exact browser activation timing is UNVERIFIED. CONFIRMED/INFERRED — [useDebounce.ts](../src/hooks/useDebounce.ts#L1-L18); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L180-L199)

Service-worker build configuration is defined in [vite.config.ts](../vite.config.ts#L21-L77) and dev artifacts are ignored by ESLint in [eslint.config.js](../eslint.config.js#L1-L9). CONFIRMED — [vite.config.ts](../vite.config.ts#L21-L77); [eslint.config.js](../eslint.config.js#L1-L9)

## 16. Storage and quota

Primary data writes go through provider debounced `saveToStorage` for students/settings; direct API writes exist in settings/student API modules; DataBackup writes both keys atomically through its helper. localStorage writes include PIN/security/biometric state, PWA prompt state, welcome-tour state, backup markers, and the storage fallback. CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx#L180-L199); [idbStorage.ts](../src/utils/idbStorage.ts#L83-L105); [pinSecurity.ts](../src/utils/pinSecurity.ts#L35-L42)

`saveToStorage` catches quota errors and other write errors, logs them, alerts only for recognized quota names, and returns `false`; provider save effects do not inspect that boolean or show a toast. CONFIRMED — [idbStorage.ts](../src/utils/idbStorage.ts#L83-L105); [SchoolContext.tsx](../src/context/SchoolContext.tsx#L185-L199)

`getStorageWarningLevel` is defined but no caller was found. `StorageMonitor` is rendered only in Settings and reports storage type/photo counts; its cleanup calls provider photo removal. ImageUploader alone calls `getStorageWarningLevel` to block uploads at critical level. CONFIRMED — [storageMonitor.ts](../src/utils/storageMonitor.ts#L100-L106); [StorageMonitor.tsx](../src/components/StorageMonitor.tsx#L1-L17); [ImageUploader.tsx](../src/components/ImageUploader.tsx#L20-L29); [Settings.tsx](../src/pages/Settings.tsx#L1296)

## 17. Security facts as implemented

PIN and recovery code use unsalted SHA-256 digests in localStorage keys `app_pin_hash` and `recovery_code_hash`; security answers use the same SHA-256 helper and are stored as JSON under `security_questions`. No PIN attempt counter or lockout was found. CONFIRMED — [pinSecurity.ts](../src/utils/pinSecurity.ts#L8-L22); [pinSecurity.ts](../src/utils/pinSecurity.ts#L35-L42); [pinSecurity.ts](../src/utils/pinSecurity.ts#L146-L158)

PIN reset accepts a valid recovery code or two of three security answers; disabling PIN removes PIN/recovery/security-question and biometric localStorage keys. CONFIRMED — [pinSecurity.ts](../src/utils/pinSecurity.ts#L87-L119); [pinSecurity.ts](../src/utils/pinSecurity.ts#L180-L202); [pinSecurity.ts](../src/utils/pinSecurity.ts#L127-L140)

Biometric enrollment uses WebAuthn platform credentials with `userVerification: "required"` and stores only the credential ID plus an enabled flag locally. Verification calls `navigator.credentials.get`; it verifies possession of the local platform credential, not a server identity. CONFIRMED — [biometricAuth.ts](../src/utils/biometricAuth.ts#L105-L160); [biometricAuth.ts](../src/utils/biometricAuth.ts#L170-L225)

Student/settings data is stored as ordinary IndexedDB values or JSON in localStorage fallback; backup encryption is optional file encryption, not at-rest database encryption. CONFIRMED — [idbStorage.ts](../src/utils/idbStorage.ts#L83-L105); [DataBackup.tsx](../src/components/DataBackup.tsx#L99-L110)

## 18. Score entry and list flow

ScoreEntryModal has Academic and Details tabs, previous/next navigation, a student selector, and keyboard/swipe navigation. AcademicTab updates subjects immediately through provider state; SubjectRow clamps direct class and exam inputs to configured maxima, converts exam percentage input to the configured maximum, and component scores to class-score totals. Provider persistence remains debounced. CONFIRMED — [ScoreEntryModal.tsx](../src/components/ScoreEntryModal.tsx#L25-L66); [AcademicTab.tsx](../src/components/tabs/AcademicTab.tsx#L58-L72); [SubjectRow.tsx](../src/components/SubjectRow.tsx#L63-L151)

MOCK hides class-component UI and component-sync alerts, but exam entry still uses `maxExamScore`; direct class input is clamped to `maxClassScore` (zero in valid MOCK settings). Grade calculation still uses total score and level, not exam type. CONFIRMED — [AcademicTab.tsx](../src/components/tabs/AcademicTab.tsx#L35-L39); [SubjectRow.tsx](../src/components/SubjectRow.tsx#L63-L112); [gradeCalculator.ts](../src/utils/gradeCalculator.ts#L183-L205)

StudentList uses TanStack virtualizer for every list; no explicit length threshold is present. It shows subject count, average or `-`, class position unless `"Pending..."`, and edit/print/delete actions. CONFIRMED — [StudentList.tsx](../src/components/StudentList.tsx#L29-L38); [StudentList.tsx](../src/components/StudentList.tsx#L135-L184)

DashboardToolbar actions: search/filter; auto-fill remarks; import names; export full CSV; export student list; clear all scores; clean empty rows. The last two are destructive and are confirmation-gated by Dashboard. CONFIRMED — [DashboardToolbar.tsx](../src/components/DashboardToolbar.tsx#L90-L176); [Dashboard.tsx](../src/pages/Dashboard.tsx#L250-L330)

EmptyState appears when `students.length === 0`; Add First Student creates the placeholder path and Load Demo opens a confirmation modal. WelcomeTour appears after an 800 ms delay when its localStorage key is absent; Skip and completion persist `"true"`. CONFIRMED — [Dashboard.tsx](../src/pages/Dashboard.tsx#L164-L169); [Dashboard.tsx](../src/pages/Dashboard.tsx#L270-L285); [WelcomeTour.tsx](../src/components/WelcomeTour.tsx#L20-L49)

## 19. Validator versus what the app lets users store

| Constraint | UI/app behavior | Result |
|---|---|---|
| Student ID UUID in base schema | Dashboard and BulkImport generate non-UUID IDs; backup compatibility replaces UUID with non-empty string. | Not rejected by backup validator; base `studentRecordSchema` itself would reject with `Invalid student ID`. CONFIRMED — [Dashboard.tsx](../src/pages/Dashboard.tsx#L84-L88); [BulkImportModal.tsx](../src/components/BulkImportModal.tsx#L42-L43); [backupValidation.ts](../src/utils/backupValidation.ts#L6-L8) |
| Subject ID UUID | Settings/AcademicTab generate UUIDs; imported legacy subjects may be non-UUID. | Backup validator permits any non-empty subject ID; base schema would say `Invalid subject ID`. CONFIRMED — [AcademicTab.tsx](../src/components/tabs/AcademicTab.tsx#L49-L55); [backupValidation.ts](../src/utils/backupValidation.ts#L8) |
| Student name 2–100 letters/punctuation | StudentList and DetailsTab do not enforce min length or regex before provider update. | A one-character or special-character name may be stored and accepted by `validateBackup` via `compatibleStudentSchema`, while stricter `studentRecordSchema` checks contribute to `warningCount` rather than rejecting the backup. CONFIRMED — [studentSchema.ts](../src/schemas/studentSchema.ts#L28-L42); [DetailsTab.tsx](../src/components/tabs/DetailsTab.tsx#L31-L57); [backupValidation.ts](../src/utils/backupValidation.ts) |
| Student class name 1–50 chars | DetailsTab accepts empty/overlong text; Dashboard fallback only applies on creation. | Backup error: `Student at index N is invalid: Class name required` or `Class name too long`. CONFIRMED — [studentSchema.ts](../src/schemas/studentSchema.ts#L52-L56); [DetailsTab.tsx](../src/components/tabs/DetailsTab.tsx#L31-L35) |
| Student gender enum | StudentList and bulk import select/use Male/Female; DetailsTab casts the form string without schema validation. | A malformed imported/current value could be stored by direct state/API paths; backup error is `Student at index N is invalid: Invalid input` for the enum. CONFIRMED/INFERRED — [types/index.ts](../src/types/index.ts#L24-L39); [DetailsTab.tsx](../src/components/tabs/DetailsTab.tsx#L43-L50) |
| Subject name letters/`&'-`, 1–100 | Settings subject input is free text and subject additions use the typed name. | Names such as `Math 101` or `Science123` can be stored; backup error: `Student at index N is invalid: Invalid characters in subject name`. CONFIRMED — [studentSchema.ts](../src/schemas/studentSchema.ts#L9-L16); [Settings.tsx](../src/pages/Settings.tsx#L980-L990) |
| School name 3–150 chars | Settings text input has no visible min/max validation. | Backup error: `Settings are invalid: School name must be at least 3 characters`, `School name too long`, or a transform-trimmed equivalent. CONFIRMED — [settingsSchema.ts](../src/schemas/settingsSchema.ts#L40-L45); [Settings.tsx](../src/pages/Settings.tsx#L404-L410) |
| Academic year `YYYY/YYYY` with consecutive years | Settings uses a plain text input and does not validate before provider save. | Backup errors: `Settings are invalid: Academic year must be in format YYYY/YYYY` or `End year must be start year + 1`. CONFIRMED — [settingsSchema.ts](../src/schemas/settingsSchema.ts#L75-L85); [Settings.tsx](../src/pages/Settings.tsx#L663-L668) |
| Email format, optional field limits, fees 0–10000, component max/name limits | UI uses browser input types/min attributes but provider save does not run the schema. | Values bypassing browser UI or typed beyond UI constraints can be stored and later rejected with the schema’s exact first issue, e.g. `Settings are invalid: Invalid email`, `...Max score cannot exceed 100`, or `...Max score must be at least 1`. CONFIRMED/INFERRED — [settingsSchema.ts](../src/schemas/settingsSchema.ts#L47-L71); [Settings.tsx](../src/pages/Settings.tsx#L505-L555) |
| Exam type/level/term/school type enums | Settings selects/buttons constrain normal UI values. | Direct/API/import values outside enums are rejected with `Settings are invalid: Invalid option`. CONFIRMED — [settingsSchema.ts](../src/schemas/settingsSchema.ts#L6-L18); [Settings.tsx](../src/pages/Settings.tsx#L680-L709) |

ScoreEntryModal/SubjectRow clamp score inputs to the configured maxima, so normal score entry should satisfy numeric bounds; the validator still rejects malformed direct storage or older payloads. CONFIRMED — [SubjectRow.tsx](../src/components/SubjectRow.tsx#L63-L151); [backupValidation.ts](../src/utils/backupValidation.ts#L17-L21)

## 6. Routes and navigation

Routes are `/`, `/settings`, `/print` with optional `id` search, and `/analytics`; Settings, PrintPreview, and Analytics are lazy-loaded, Dashboard is eager. Entry links are Dashboard header links, StudentList’s per-student print link, Print’s Back links, Analytics navigate-to-dashboard buttons, and Settings’ Back link. CONFIRMED — [router.tsx](../src/router.tsx#L8-L72); [Dashboard.tsx](../src/pages/Dashboard.tsx#L101-L132); [StudentList.tsx](../src/components/StudentList.tsx#L168-L176)

PageHeader is used by Dashboard, Analytics, and Settings. It has no Back button; it only renders branding and caller-provided actions. PrintPreview uses its own toolbar/back links. CONFIRMED — [PageHeader.tsx](../src/components/ui/PageHeader.tsx#L9-L48); [Analytics.tsx](../src/pages/Analytics.tsx#L234-L265); [Settings.tsx](../src/pages/Settings.tsx#L343-L365)

No manifest shortcut entries or explicit unknown-route/catch-all route were found. Browser Back is left to TanStack Router/browser history; installed-PWA-specific behavior is UNVERIFIED. CONFIRMED/UNVERIFIED — [router.tsx](../src/router.tsx#L58-L72); [vite.config.ts](../vite.config.ts#L79-L126)

## 10. PostHog configuration

`posthog.init` uses `capture_pageview: true`, `autocapture: true`, `mask_all_text: true`, `mask_all_element_attributes: true`, and a `session_recording` block that masks inputs/text and blocks images. CONFIRMED — [main.tsx](../src/main.tsx#L7-L25)

The configured masking and session-recording options contradict the old audit claim that they are absent. Repository code still cannot establish whether specific student names or scores appear in replays. CONFIRMED/UNVERIFIED — [main.tsx](../src/main.tsx#L10-L25)

## 11. Repo conventions

Tests use Vitest globals, happy-dom, `src/test/setup.ts`, Testing Library cleanup, jest-dom matchers, and manual browser API mocks such as `matchMedia` and `IntersectionObserver`. Existing tests mock storage, router, PostHog, and encryption modules with `vi.mock` where needed. CONFIRMED — [vite.config.ts](../vite.config.ts#L10-L20); [setup.ts](../src/test/setup.ts#L1-L35); [DataBackup.test.tsx](../src/test/DataBackup.test.tsx#L1-L30)

Lint is ESLint flat config with TypeScript recommended rules, React Hooks recommended rules, React Refresh, and Prettier compatibility. The repository has encountered React Hooks immutability/incompatible-library warnings and rules/errors around useless assignments and preserving caught errors during prior work; exact rule names are not explicitly configured here beyond the recommended presets. CONFIRMED/UNVERIFIED — [eslint.config.js](../eslint.config.js#L1-L31)

Required package scripts before a commit are `npm run lint`, `npx tsc -b`, and `npm test -- --run`; `npm run build` additionally runs TypeScript and Vite build. CONFIRMED — [package.json](../package.json#L20-L29)

## Surprises

- The old inventory’s student photo name `image` is wrong: the implemented field is `pictureUrl`. CONFIRMED — [types/index.ts](../src/types/index.ts#L34)
- The earlier assumption that `nextTermStarts` and `academicYear` have no report consumers is wrong; all four templates and shared report components consume them. CONFIRMED — [ClassicTemplate.tsx](../src/templates/ClassicTemplate.tsx#L75-L75); [ModernTemplate.tsx](../src/templates/ModernTemplate.tsx#L77-L77); [ReportHeader.tsx](../src/components/reports/ReportHeader.tsx#L60-L62)
- The App auto-lock timeout reactively reads from SchoolContext settings via useSchoolData() rather than an isolated storage key read. CONFIRMED — [App.tsx](../src/App.tsx#L23-L24)
- DataGate now provides backup recovery while load-error is displayed, rather than leaving Settings as the only recovery route. CONFIRMED — [DataGate.tsx](../src/components/DataGate.tsx#L23-L37)
- PostHog enables pageview/autocapture and configures text, attribute, input, and session-recording masking. CONFIRMED — [main.tsx](../src/main.tsx#L10-L25)

## Open questions

- Does the target desktop Chrome and iOS Safari PWA emit a visibilitychange that locks App around `window.print()`?
- Does activating the current service-worker update reload all open tabs, and how much of a Settings/score debounce window is lost in practice?
- Is `dev-dist` intentionally tracked and deployed, or only a generated local artifact?
- Do production PostHog settings add masking/session-recording behavior outside this repository?
- Do browser-native validation and user typing constraints prevent all schema-invalid values in real devices?

## Needs a human with a device

- Reproduce Print → lock → biometric unlock → Print on desktop Chrome and iOS Safari installed PWA.
- Verify `visibilitychange`, print dialog return, and biometric prompt timing on iOS/Android.
- Verify PWA update activation behavior with an unsaved edit and with an in-flight backup import.
- Verify viewport/safe-area layout and actual touch-target sizes on notched phones.
