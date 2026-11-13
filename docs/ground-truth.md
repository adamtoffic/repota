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
| React lock state | `isLocked` is App-local React state, initialized from `isPinConfigured()`. It is not stored in sessionStorage/localStorage. | CONFIRMED — [App.tsx](../src/App.tsx:17-18) |
| Idle trigger | `useIdleTimer` calls `handleIdle`; it locks only when a PIN is configured and the app is currently unlocked. | CONFIRMED — [App.tsx](../src/App.tsx:28-39); [useIdleTimer.ts](../src/hooks/useIdleTimer.ts:1-80) |
| Hidden-tab trigger | `visibilitychange` sets locked when `document.hidden` and a PIN is configured. | CONFIRMED — [App.tsx](../src/App.tsx:42-54) |
| Other triggers | No `blur`, `pagehide`, `freeze`, or route-change lock handler was found in `src`. | CONFIRMED — search of `src` |
| Print button | Print Preview captures `Printed_Reports`, then calls `window.print()` directly. | CONFIRMED — [PrintPreview.tsx](../src/pages/PrintPreview.tsx:82-89) |
| Alternate print helper | `createPrintHandler` dispatches `beforeprint`, waits 100 ms, then calls `window.print()`. | CONFIRMED — [printHandler.ts](../src/utils/printHandler.ts:12-31) |
| LockScreen mount | After 500 ms it enables/focuses PIN input and checks biometric enrollment; on non-iOS it automatically attempts biometric unlock. | CONFIRMED — [LockScreen.tsx](../src/components/LockScreen.tsx:27-45); [LockScreen.tsx](../src/components/LockScreen.tsx:67-78) |
| Re-trigger after unlock | A successful biometric/PIN attempt calls `onUnlock` after 400 ms. App then unmounts LockScreen because `isLocked` becomes false; a later lock remounts it and repeats the mount attempt. | CONFIRMED — [LockScreen.tsx](../src/components/LockScreen.tsx:40-44); [App.tsx](../src/App.tsx:57-63) |
| App remount during print/navigation | The router changes route content, but App remains the owner of `isLocked`; no code explicitly remounts App for `/print` or `window.print()`. | CONFIRMED — [App.tsx](../src/App.tsx:1-111); [router.tsx](../src/router.tsx:1-75) |
| Browser events | `window.print()` can cause browser print lifecycle events, and App clears print suppression on `afterprint`; exact desktop Chrome/iOS PWA event behavior remains UNVERIFIED. | CONFIRMED/UNVERIFIED — [App.tsx](../src/App.tsx:41-91) |

**Best-evidence loop explanation:** The repository directly proves that printing itself does not call `setIsLocked`; the only in-repo lock trigger during print is `visibilitychange` if printing makes the document hidden. It is INFERRED that a platform print/PWA transition may emit a hidden visibility state, causing the immediate lock; this needs device/browser reproduction. After unlock, the same visibility transition or another idle event can lock again, producing the reported loop.  

**Minimal fix proposal:** Ignore transient visibility changes while a print operation is active, using a short-lived print-in-progress ref/flag cleared after print returns (or `afterprint` where supported), and avoid treating the print dialog/PWA transition as an app switch. Risk: a real backgrounding event during printing could be temporarily exempted from locking; device-specific validation is required. PROPOSAL, not implemented.

## 8. Auto-lock timeout

| Question | Finding | Evidence |
|---|---|---|
| App read key/backend | App reads `settings.autoLockTimeout` from the settings returned by `useSchoolData()`. | CONFIRMED — [App.tsx](../src/App.tsx:21-24); [SchoolContext.tsx](../src/context/SchoolContext.tsx:784-810) |
| Provider write key/backend | SchoolContext persists settings through `saveToStorage(IDB_KEYS.SETTINGS, ...)`. | CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx:153-157); [idbStorage.ts](../src/utils/idbStorage.ts:6-22) |
| Match | App reads the provider settings written by SchoolContext; it does not call `loadFromStorage("app-data")`. | CONFIRMED — [App.tsx](../src/App.tsx:21-24); [SchoolContext.tsx](../src/context/SchoolContext.tsx:153-157) |
| Missing default | `idleTimeout` starts at 5 minutes and remains there when the App read has no usable `autoLockTimeout`. | CONFIRMED — [App.tsx](../src/App.tsx:20-28) |
| Effect dependencies | The settings-read effect has `[]`; the idle timer receives `idleTimeout`, but the effect that loads it does not rerun after settings changes. | CONFIRMED — [App.tsx](../src/App.tsx:21-29); [useIdleTimer.ts](../src/hooks/useIdleTimer.ts:12-55) |
| Change without reload | A Settings edit cannot update App’s timeout through this code path without a reload; it may never update even after reload because the keys differ. | CONFIRMED — [App.tsx](../src/App.tsx:21-29); [Settings.tsx](../src/pages/Settings.tsx:1222-1229) |

## 9. `nextTermStarts` and `academicYear`

| Field | Consumers | Evidence |
|---|---|---|
| `academicYear` | Settings input; ReportTemplate; ReportHeader; Classic, Minimal, Modern, and Original templates. | CONFIRMED — [Settings.tsx](../src/pages/Settings.tsx:663-668); [ReportTemplate.tsx](../src/components/ReportTemplate.tsx:120); [ReportHeader.tsx](../src/components/reports/ReportHeader.tsx:60); template matches in `src/templates/` |
| `nextTermStarts` | Settings input; ReportTemplate; StudentInfo; Classic, Minimal, Modern, and Original templates. Empty values are rendered as `TBA` in ReportTemplate/StudentInfo and hidden date text in templates using a conditional. | CONFIRMED — [Settings.tsx](../src/pages/Settings.tsx:653-657); [ReportTemplate.tsx](../src/components/ReportTemplate.tsx:209-219); [StudentInfo.tsx](../src/components/reports/StudentInfo.tsx:69-79); [ClassicTemplate.tsx](../src/templates/ClassicTemplate.tsx:347-351) |

No additional destructuring, alias, bracket access, Dashboard, Analytics, export, or test consumer was found beyond the listed settings/test fixtures. CONFIRMED — broad `src` search for field names and visible labels.

## 1. Student creation and analytics events

| Path | Creation details | `silent` / event | Evidence |
|---|---|---|
| Dashboard empty-state Add | Creates `Date.now().toString()` ID, name `"New Student"`, default Male, class from settings, no subjects; calls `addStudent(newStudent)` then opens ScoreEntryModal. | `silent` omitted (`false`), but `addStudent` suppresses `Added_Student` when name is `"New Student"`. CONFIRMED — [Dashboard.tsx](../src/pages/Dashboard.tsx:83-99); [SchoolContext.tsx](../src/context/SchoolContext.tsx:238-247) |
| StudentList add | Creates UUID student ID and UUID subject IDs from settings/default-level subjects; name is typed input. | `silent` omitted; `Added_Student` fires for any non-`"New Student"` name. CONFIRMED — [StudentList.tsx](../src/components/StudentList.tsx:44-78); [SchoolContext.tsx](../src/context/SchoolContext.tsx:240-245) |
| BulkImportModal | Creates timestamp-index IDs, typed names, default Male, class from settings, no subjects. | Calls `addStudent(newStudent, true)` for every row; no `Added_Student`. One `Bulk_Import_Success` event fires if at least one row was imported. CONFIRMED — [BulkImportModal.tsx](../src/components/BulkImportModal.tsx:38-72) |
| Demo data | Creates ten hard-coded demo students, IDs `demo-1` through `demo-10`, generated subjects/scores. | Direct `setStudents`; no `Added_Student`; one `Loaded_Demo_Data` event after insertion. CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx:524-542); [SchoolContext.tsx](../src/context/SchoolContext.tsx:725-741) |
| Backup import | Writes the validated incoming array directly through `saveToStorage`; it does not call `addStudent`. | No student-added analytics event. CONFIRMED — [backupValidation.ts](../src/utils/backupValidation.ts:55-77) |

When a `"New Student"` placeholder is renamed and saved, `DetailsTab` calls `onUpdate`; it does not call `addStudent`, so `Added_Student` is never fired on that path. Closing the modal without saving does not delete the placeholder: Dashboard already inserted it into provider state, and the provider’s debounced student save persists it. CONFIRMED — [Dashboard.tsx](../src/pages/Dashboard.tsx:95-97); [DetailsTab.tsx](../src/components/tabs/DetailsTab.tsx:31-57); [SchoolContext.tsx](../src/context/SchoolContext.tsx:177-187)

Every `posthog.capture` in `src`: `Added_Student` for non-silent, non-placeholder add; `Bulk_Import_Success` for a non-empty bulk import; `Loaded_Demo_Data` after demo insertion; `School_Level_Changed` after a level change; `Template_Changed` after template selection; `Printed_Reports` when Print Preview’s print handler is invoked; `Auto_Remarks_Generated` after auto-generating remarks. CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx:240-245); [BulkImportModal.tsx](../src/components/BulkImportModal.tsx:66-70); [Settings.tsx](../src/pages/Settings.tsx:213); [Settings.tsx](../src/pages/Settings.tsx:1122); [PrintPreview.tsx](../src/pages/PrintPreview.tsx:77-88); [SchoolContext.tsx](../src/context/SchoolContext.tsx:816-819)

## 2. Definitions of incomplete

| Surface | Predicate | Evidence |
|---|---|---|
| Dashboard filter and DashboardStats pending | `subjects.length === 0` OR any subject has `classScore === 0` OR `examScore === 0`. Failing is the inverse of pending plus `averageScore < 50`. | CONFIRMED — [Dashboard.tsx](../src/pages/Dashboard.tsx:63-70); [DashboardStats.tsx](../src/components/DashboardStats.tsx:16-31) |
| `deletePendingStudents` | Keeps only students with at least one subject and at least one subject where class or exam score is `> 0`; removes all others. | CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx:266-281) |
| ValidationWarnings no-score | No subject has class or exam score `> 0`. | CONFIRMED — [ValidationWarnings.tsx](../src/components/ValidationWarnings.tsx:9-19) |
| ValidationWarnings incomplete | At least one scored subject, but count of subjects having either score `> 0` is less than `settings.defaultSubjects.length`. | CONFIRMED — [ValidationWarnings.tsx](../src/components/ValidationWarnings.tsx:21-29) |
| StudentList badges | Average displays `-` when `averageScore` is not `> 0`; class-position badge is hidden only when `classPosition === "Pending..."`. | CONFIRMED — [StudentList.tsx](../src/components/StudentList.tsx:148-158) |
| Print warning | Counts printable students with no `pictureUrl`; it does not classify scores as incomplete. | CONFIRMED — [PrintPreview.tsx](../src/pages/PrintPreview.tsx:73-74); [PrintPreview.tsx](../src/pages/PrintPreview.tsx:203-208) |
| CSV/export | Exports the processed fields; no independent incomplete predicate was found. | CONFIRMED — [export.ts](../src/utils/export.ts:1-60) |

MOCK handling is not consistent: the pending predicates still treat a zero class score as incomplete, even though MOCK settings use `classScoreMax === 0`; AcademicTab hides component-sync alerts for MOCK, but does not change these dashboard predicates. A legitimate score of `0` is therefore indistinguishable from missing in these predicates. `"New Student"` has no subjects and is pending. CONFIRMED — [AcademicTab.tsx](../src/components/tabs/AcademicTab.tsx:35-39); [settingsSchema.ts](../src/schemas/settingsSchema.ts:138-148)

`classScore === 0` is **not** true for every MOCK student as a language/runtime fact; it is only required by the Settings schema’s MOCK configuration (`classScoreMax === 0`), while stored subject records can still contain other values. The code does not normalize every student subject class score to zero. CONFIRMED — [settingsSchema.ts](../src/schemas/settingsSchema.ts:138-148); [SchoolContext.tsx](../src/context/SchoolContext.tsx:524-542)

## 3. What reports print

| Template | Empty-field behavior found in code | Evidence |
|---|---|---|
| ReportTemplate | Photo is hidden if absent; attendance uses `-`; next term uses `TBA`; conduct and interest have defaults; generated headmaster remark always has text; signatures/names are conditional. | CONFIRMED — [ReportTemplate.tsx](../src/components/ReportTemplate.tsx:149-219); [ReportTemplate.tsx](../src/components/ReportTemplate.tsx:439-506) |
| ClassicTemplate | Photo has an alternate empty branch; conduct defaults to `Satisfactory`; headmaster remark defaults to `Keep it up.`; fees/signatures/next-term blocks are conditional. | CONFIRMED — [ClassicTemplate.tsx](../src/templates/ClassicTemplate.tsx:90-122); [ClassicTemplate.tsx](../src/templates/ClassicTemplate.tsx:261-368) |
| MinimalTemplate | Attendance/teacher details and fee/signature blocks use fallbacks or conditional blocks; next term is conditional on a value. | CONFIRMED — [MinimalTemplate.tsx](../src/templates/MinimalTemplate.tsx:227-313) |
| ModernTemplate | Photo conditional; attendance uses `0`/`-`; teacher remark has a default; fees and signatures are conditional; next term is conditional. | CONFIRMED — [ModernTemplate.tsx](../src/templates/ModernTemplate.tsx:231-234); [ModernTemplate.tsx](../src/templates/ModernTemplate.tsx:299-434) |
| OriginalTemplate | Photo `src` is rendered directly; fees are shown when any fee exists; conduct defaults, teacher remark does not visibly add a fallback; signatures and next-term sections are conditional. | CONFIRMED — [OriginalTemplate.tsx](../src/templates/OriginalTemplate.tsx:10-10); [OriginalTemplate.tsx](../src/templates/OriginalTemplate.tsx:391-466) |
| PrivateSchoolReport | Uses the shared report header/info plus fee block; conduct defaults, teacher remark is direct, and signatures/names are conditional. | CONFIRMED — [PrivateSchoolReport.tsx](../src/components/reports/PrivateSchoolReport.tsx:223-246); [PrivateSchoolReport.tsx](../src/components/reports/PrivateSchoolReport.tsx:262-362) |

Across the shared report components, academic year and term render directly; class teacher/head teacher names and both signatures are conditional; `nextTermStarts` is `TBA` in shared info or omitted in template-specific conditional blocks. CONFIRMED — [ReportHeader.tsx](../src/components/reports/ReportHeader.tsx:37-79); [StudentInfo.tsx](../src/components/reports/StudentInfo.tsx:13-79)

A missing photo, signature, optional fee, next-term date, or staff name is visibly blank/hidden (or replaced by a fallback) rather than structurally invalid. Missing student scores, required identity/year/term values, or a teacher remark where a template has no fallback can make a report visibly incomplete. The last sentence is an inference from the conditional/direct expressions. INFERRED — cited template expressions above.

## 4. Page gating and one-time state

| Page | Before loaded | `loadError` | Loaded |
|---|---|---|---|
| Dashboard | `PageLoader` from route-level DataGate | DataGate error screen | Dashboard body |
| Settings | `PageLoader` | DataGate error screen; Settings body is not mounted | Settings body |
| PrintPreview | `PageLoader` | DataGate error screen | Print body |
| Analytics | `PageLoader` | DataGate error screen | Analytics body |

All four routes are wrapped by DataGate. The error screen offers Try again, Start fresh, and recovery-only DataBackup import; therefore it does offer a backup restore path even though Settings itself is gated. CONFIRMED — [router.tsx](../src/router.tsx:28-72); [DataGate.tsx](../src/components/DataGate.tsx:11-40)

The provider initializes default settings and empty students before asynchronous loading, but persistence effects return while `isDataLoaded` is false and also guard failed keys. CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx:40-43); [SchoolContext.tsx](../src/context/SchoolContext.tsx:180-199)

One-time settings/student-derived local state that can become stale after hydration/import/restore: App reads auto-lock from storage only once; Settings draft refs/state initialize from provider settings once; DetailsTab initializes its form from the selected student once per keyed student; SubjectRow initializes component visibility from `hasComponents`; `useDebounce` initializes from its first value; LazyReportCard initializes visibility from print mode. CONFIRMED — [App.tsx](../src/App.tsx:21-29); [Settings.tsx](../src/pages/Settings.tsx:110-119); [DetailsTab.tsx](../src/components/tabs/DetailsTab.tsx:20-35); [SubjectRow.tsx](../src/components/SubjectRow.tsx:32-38); [useDebounce.ts](../src/hooks/useDebounce.ts:1-18); [LazyReportCard.tsx](../src/components/LazyReportCard.tsx:19-20)

## 5. Backup under failure

| Operation | Current behavior | Evidence |
|---|---|---|
| Export loader | Uses `loadFromStorageResult` for students and settings. Any `error`, or provider `loadError`, aborts before file creation and `recordBackup`; empty students require explicit `window.confirm`. | CONFIRMED — [DataBackup.tsx](../src/components/DataBackup.tsx:73-91) |
| Null/empty reads | `empty` becomes `[]`/`{}`; empty student export is confirmation-gated. | CONFIRMED — [DataBackup.tsx](../src/components/DataBackup.tsx:82-86) |
| Import validation | Plain and decrypted imports both call `validateBackup` before confirmation or writes. | CONFIRMED — [DataBackup.tsx](../src/components/DataBackup.tsx:171-184); [DataBackup.tsx](../src/components/DataBackup.tsx:208-225) |
| Import atomicity | Reads current values, writes students then settings, and attempts to restore both if the settings write fails. It reports separately if restoration also fails. | CONFIRMED — [backupValidation.ts](../src/utils/backupValidation.ts:55-83) |
| `loadError` import | Recovery mode passes `allowUnreadableCurrent`, allowing a validated backup to bypass unreadable-current checks; provider persistence is suspended before the first write. | CONFIRMED — [DataBackup.tsx](../src/components/DataBackup.tsx:256-267); [backupValidation.ts](../src/utils/backupValidation.ts:58-63) |
| Successful import | Shows a blocking overlay and reloads after about one second; manual Reload now is available. | CONFIRMED — [DataBackup.tsx](../src/components/DataBackup.tsx:271-283) |

`restoreDefaults` only updates provider settings and shows a toast; it has no confirm step and relies on the debounced provider save. `startFresh` is reached through the DataGate button, whose label is not itself a confirmation; the provider then opens its `ConfirmModal`, so confirmation occurs before defaults/empty state are applied. CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx:82-111); [SchoolContext.tsx](../src/context/SchoolContext.tsx:207-211); [SchoolContext.tsx](../src/context/SchoolContext.tsx:856-862)

## 12. Data model as implemented

| Type | Fields | Evidence |
|---|---|---|
| `ClassScoreComponent` | Required `id`, `name`, `score`, `maxScore`; optional `category`. |
| `SavedSubject` | Required `id`, `name`, `classScore`, `examScore`; optional `classScoreComponents`. |
| `StudentRecord` | Required `id`, `name`, `className`, `gender`, `subjects`; optional DOB, attendance, remarks, promotion status, and `pictureUrl`. |
| `SchoolSettings` | Required `schoolName`, `academicYear`, `term`, `level`, `schoolType`, score maxima, and `defaultSubjects`; all other identity, staff, date, class-size, component, fee, template, exam, and lock fields are optional. |

The photo field is `pictureUrl`, not `image`. CONFIRMED — [types/index.ts](../src/types/index.ts:24-58)

Student IDs are generated with `crypto.randomUUID()` in StudentList, AcademicTab, and demo subject/component creation; Dashboard uses `Date.now().toString()`, BulkImport uses `${Date.now()}-${index}`, and demo students use fixed `demo-1`…`demo-10`. Backup compatibility validation requires only non-empty IDs, so it does not enforce uniqueness or UUID format. CONFIRMED — [StudentList.tsx](../src/components/StudentList.tsx:59-72); [Dashboard.tsx](../src/pages/Dashboard.tsx:84-88); [BulkImportModal.tsx](../src/components/BulkImportModal.tsx:42-53); [SchoolContext.tsx](../src/context/SchoolContext.tsx:647-674); [backupValidation.ts](../src/utils/backupValidation.ts:6-21)

Required for a structurally correct printed report: student identity/name/class, subject records for academic rows, and settings school identity/year/term/score maxima/default subjects. Optional photo, attendance, remarks, fees, dates, staff names, signatures, and next-term date alter content or fallbacks but are not required by the TypeScript model. The “required for printed report” statement is INFERRED from direct template access and schema requirements. CONFIRMED/INFERRED — [types/index.ts](../src/types/index.ts:24-104); [ReportTemplate.tsx](../src/components/ReportTemplate.tsx:97-252)

## 13. UI primitives and consistency

The `src/components/ui` barrel exports Button, Badge, Alert, IconButton, Container, Input, Select, Textarea, Modal, PageHeader, FormLabel, Card, LoadingSpinner, Skeleton, and Tooltip. Button variants are primary/danger/secondary/ghost/outline and sizes sm/md/lg; Input/Select/Textarea accept label/error helpers; Modal accepts `isOpen`, `onClose`, children, className, and `closeOnBackdrop`. CONFIRMED — [ui/index.ts](../src/components/ui/index.ts:1-45); [Button.tsx](../src/components/ui/Button.tsx:1-55); [Modal.tsx](../src/components/ui/Modal.tsx:1-42)

Raw controls remain common: DashboardToolbar uses raw input and buttons; StudentList and ScoreEntryModal use raw buttons/selects; Settings and report pages mix raw controls with Input/Select/Textarea. Exact per-page counts are not stable from static JSX alone because conditional branches and child components contribute controls; no runtime DOM count was performed. UNVERIFIED — representative [DashboardToolbar.tsx](../src/components/DashboardToolbar.tsx:56-176); [StudentList.tsx](../src/components/StudentList.tsx:70-180)

Modal primitive behavior: conditional render, backdrop click only when `closeOnBackdrop` and target is the backdrop. It has no focus trap, no Escape listener, no ARIA role/label, and no internal scroll-lock effect. Custom fixed overlays are used by ScoreEntryModal, ProgressModal, StudentList’s add/delete UI, DataBackup password/reload UI, LockScreen, and WelcomeTour. CONFIRMED — [Modal.tsx](../src/components/ui/Modal.tsx:11-40); [ScoreEntryModal.tsx](../src/components/ScoreEntryModal.tsx:67-76)

Icon-only buttons without an `aria-label` include several close/menu/edit/delete/print controls in StudentList, ScoreEntryModal, BulkImportModal, DataBackup, PwaUpdatePrompt, and Settings. Some have `title` but not `aria-label`; a complete accessibility count was not runtime-verified. CONFIRMED/UNVERIFIED — examples [StudentList.tsx](../src/components/StudentList.tsx:162-184); [ScoreEntryModal.tsx](../src/components/ScoreEntryModal.tsx:174-185); [PwaUpdatePrompt.tsx](../src/components/PwaUpdatePrompt.tsx:76-82)

## 14. Motion and styling plumbing

`animate-fade-in`, `animate-slide-in-up`, and `animate-shimmer` are defined in `index.css`; `fadeIn`, `slideUp`, and `shimmer` keyframes are also defined there. `animate-in`, `zoom-in-95`, `slide-in-from-*`, and `animate-pulse/spin/ping` are used but are not custom-defined in `index.css`; Tailwind may provide some, while their actual generated CSS was not inspected. No `tailwindcss-animate` or `tw-animate-css` package was found in package manifests. CONFIRMED/UNVERIFIED — [index.css](../src/index.css:104-170); [package.json](../package.json:1-120)

Transitions/animations are broadly used via Tailwind `transition-*`, custom fade/slide/shimmer, and utility animation classes in components. Reduced motion is handled globally by shortening animations/transitions to `0.01ms`. CONFIRMED — [index.css](../src/index.css:172-180)

Theme tokens `bg-background`, `text-main`, `text-muted`, `text-success`, `bg-primary`, and related colors are defined in the Tailwind `@theme` block in index.css. `src/theme/tokens.ts` is a separate purple token object and is not the source of those utility classes. No dark-mode strategy was found in index.css; dark classes appear in PwaUpdatePrompt. Font stack is Inter/system-ui; no external font import was found. CONFIRMED — [index.css](../src/index.css:3-31); [tokens.ts](../src/theme/tokens.ts:20-74); [PwaUpdatePrompt.tsx](../src/components/PwaUpdatePrompt.tsx:45-46)

Viewport meta is supplied by the Vite HTML entry (not inspected in `src`); safe-area utilities and PageHeader’s `safe-top` are defined. Primary actions commonly use roughly `py-2` to `py-3`; exact device touch-target adequacy is UNVERIFIED. CONFIRMED/UNVERIFIED — [index.css](../src/index.css:57-93); [PageHeader.tsx](../src/components/ui/PageHeader.tsx:19-23)

## 15. PWA update and offline behavior

VitePWA is configured with `registerType: "autoUpdate"` and automatic registration. Workbox precaches HTML/JS/CSS/assets under 3 MB, uses `/index.html` navigation fallback, `NetworkFirst` for JS/CSS runtime assets, and `CacheFirst` for images/CDN assets. The generated service worker calls `skipWaiting`, `clientsClaim`, and `cleanupOutdatedCaches`. CONFIRMED — [vite.config.ts](../vite.config.ts:21-77); [dev-dist/sw.js](../dev-dist/sw.js:70-110)

`PwaUpdatePrompt` exposes an Update Now button that calls `updateServiceWorker(true)` and dismisses the prompt; Later only clears the prompt. Whether activation reloads every open tab is controlled by the Workbox/runtime implementation and is not verified by repository code. CONFIRMED/UNVERIFIED — [PwaUpdatePrompt.tsx](../src/components/PwaUpdatePrompt.tsx:26-42)

An in-progress edit can be lost or interrupted when an update activates: provider saves are debounced at 500 ms, Settings has its own delayed draft autosave, and no update handler snapshots/flushes those edits. This is INFERRED from the debounce paths; exact browser activation timing is UNVERIFIED. CONFIRMED/INFERRED — [useDebounce.ts](../src/hooks/useDebounce.ts:1-18); [SchoolContext.tsx](../src/context/SchoolContext.tsx:180-199)

`dev-dist` contains generated service-worker artifacts and is ignored by ESLint; its Git tracking status was not changed during this audit. CONFIRMED/UNVERIFIED — [eslint.config.js](../eslint.config.js:1-9); [dev-dist/sw.js](../dev-dist/sw.js:1-3)

## 16. Storage and quota

Primary data writes go through provider debounced `saveToStorage` for students/settings; direct API writes exist in settings/student API modules; DataBackup writes both keys atomically through its helper. localStorage writes include PIN/security/biometric state, PWA prompt state, welcome-tour state, backup markers, and the storage fallback. CONFIRMED — [SchoolContext.tsx](../src/context/SchoolContext.tsx:180-199); [idbStorage.ts](../src/utils/idbStorage.ts:83-105); [pinSecurity.ts](../src/utils/pinSecurity.ts:35-42)

`saveToStorage` catches quota errors and other write errors, logs them, alerts only for recognized quota names, and returns `false`; provider save effects do not inspect that boolean or show a toast. CONFIRMED — [idbStorage.ts](../src/utils/idbStorage.ts:83-105); [SchoolContext.tsx](../src/context/SchoolContext.tsx:185-199)

`getStorageWarningLevel` is defined but no caller was found. `StorageMonitor` is rendered only in Settings and reports storage type/photo counts; its cleanup calls provider photo removal. ImageUploader alone calls `getStorageWarningLevel` to block uploads at critical level. CONFIRMED — [storageMonitor.ts](../src/utils/storageMonitor.ts:100-106); [StorageMonitor.tsx](../src/components/StorageMonitor.tsx:1-17); [ImageUploader.tsx](../src/components/ImageUploader.tsx:20-29); [Settings.tsx](../src/pages/Settings.tsx:1296)

## 17. Security facts as implemented

PIN and recovery code use unsalted SHA-256 digests in localStorage keys `app_pin_hash` and `recovery_code_hash`; security answers use the same SHA-256 helper and are stored as JSON under `security_questions`. No PIN attempt counter or lockout was found. CONFIRMED — [pinSecurity.ts](../src/utils/pinSecurity.ts:8-22); [pinSecurity.ts](../src/utils/pinSecurity.ts:35-42); [pinSecurity.ts](../src/utils/pinSecurity.ts:146-158)

PIN reset accepts a valid recovery code or two of three security answers; disabling PIN removes PIN/recovery/security-question and biometric localStorage keys. CONFIRMED — [pinSecurity.ts](../src/utils/pinSecurity.ts:87-119); [pinSecurity.ts](../src/utils/pinSecurity.ts:180-202); [pinSecurity.ts](../src/utils/pinSecurity.ts:127-140)

Biometric enrollment uses WebAuthn platform credentials with `userVerification: "required"` and stores only the credential ID plus an enabled flag locally. Verification calls `navigator.credentials.get`; it verifies possession of the local platform credential, not a server identity. CONFIRMED — [biometricAuth.ts](../src/utils/biometricAuth.ts:105-160); [biometricAuth.ts](../src/utils/biometricAuth.ts:170-225)

Student/settings data is stored as ordinary IndexedDB values or JSON in localStorage fallback; backup encryption is optional file encryption, not at-rest database encryption. CONFIRMED — [idbStorage.ts](../src/utils/idbStorage.ts:83-105); [DataBackup.tsx](../src/components/DataBackup.tsx:99-110)

## 18. Score entry and list flow

ScoreEntryModal has Academic and Details tabs, previous/next navigation, a student selector, and keyboard/swipe navigation. AcademicTab updates subjects immediately through provider state; SubjectRow clamps direct class and exam inputs to configured maxima, converts exam percentage input to the configured maximum, and component scores to class-score totals. Provider persistence remains debounced. CONFIRMED — [ScoreEntryModal.tsx](../src/components/ScoreEntryModal.tsx:25-66); [AcademicTab.tsx](../src/components/tabs/AcademicTab.tsx:58-72); [SubjectRow.tsx](../src/components/SubjectRow.tsx:63-151)

MOCK hides class-component UI and component-sync alerts, but exam entry still uses `maxExamScore`; direct class input is clamped to `maxClassScore` (zero in valid MOCK settings). Grade calculation still uses total score and level, not exam type. CONFIRMED — [AcademicTab.tsx](../src/components/tabs/AcademicTab.tsx:35-39); [SubjectRow.tsx](../src/components/SubjectRow.tsx:63-112); [gradeCalculator.ts](../src/utils/gradeCalculator.ts:183-205)

StudentList uses TanStack virtualizer for every list; no explicit length threshold is present. It shows subject count, average or `-`, class position unless `"Pending..."`, and edit/print/delete actions. CONFIRMED — [StudentList.tsx](../src/components/StudentList.tsx:29-38); [StudentList.tsx](../src/components/StudentList.tsx:135-184)

DashboardToolbar actions: search/filter; auto-fill remarks; import names; export full CSV; export student list; clear all scores; clean empty rows. The last two are destructive and are confirmation-gated by Dashboard. CONFIRMED — [DashboardToolbar.tsx](../src/components/DashboardToolbar.tsx:90-176); [Dashboard.tsx](../src/pages/Dashboard.tsx:250-330)

EmptyState appears when `students.length === 0`; Add First Student creates the placeholder path and Load Demo opens a confirmation modal. WelcomeTour appears after an 800 ms delay when its localStorage key is absent; Skip and completion persist `"true"`. CONFIRMED — [Dashboard.tsx](../src/pages/Dashboard.tsx:164-169); [Dashboard.tsx](../src/pages/Dashboard.tsx:270-285); [WelcomeTour.tsx](../src/components/WelcomeTour.tsx:20-49)

## 19. Validator versus what the app lets users store

| Constraint | UI/app behavior | Result |
|---|---|---|
| Student ID UUID in base schema | Dashboard and BulkImport generate non-UUID IDs; backup compatibility replaces UUID with non-empty string. | Not rejected by backup validator; base `studentRecordSchema` itself would reject with `Invalid student ID`. CONFIRMED — [Dashboard.tsx](../src/pages/Dashboard.tsx:84-88); [BulkImportModal.tsx](../src/components/BulkImportModal.tsx:42-43); [backupValidation.ts](../src/utils/backupValidation.ts:6-8) |
| Subject ID UUID | Settings/AcademicTab generate UUIDs; imported legacy subjects may be non-UUID. | Backup validator permits any non-empty subject ID; base schema would say `Invalid subject ID`. CONFIRMED — [AcademicTab.tsx](../src/components/tabs/AcademicTab.tsx:49-55); [backupValidation.ts](../src/utils/backupValidation.ts:8) |
| Student name 2–100 letters/punctuation | StudentList and DetailsTab do not enforce min length or regex before provider update. | A one-character or special-character name can be stored, then backup validation rejects it: `Student at index N is invalid: Student name must be at least 2 characters` or `...Only letters, spaces, periods, hyphens, and apostrophes allowed`. CONFIRMED — [studentSchema.ts](../src/schemas/studentSchema.ts:28-42); [DetailsTab.tsx](../src/components/tabs/DetailsTab.tsx:31-57) |
| Student class name 1–50 chars | DetailsTab accepts empty/overlong text; Dashboard fallback only applies on creation. | Backup error: `Student at index N is invalid: Class name required` or `Class name too long`. CONFIRMED — [studentSchema.ts](../src/schemas/studentSchema.ts:52-56); [DetailsTab.tsx](../src/components/tabs/DetailsTab.tsx:31-35) |
| Student gender enum | StudentList and bulk import select/use Male/Female; DetailsTab casts the form string without schema validation. | A malformed imported/current value could be stored by direct state/API paths; backup error is `Student at index N is invalid: Invalid input` for the enum. CONFIRMED/INFERRED — [types/index.ts](../src/types/index.ts:24-39); [DetailsTab.tsx](../src/components/tabs/DetailsTab.tsx:43-50) |
| Subject name letters/`&'-`, 1–100 | Settings subject input is free text and subject additions use the typed name. | Names such as `Math 101` or `Science123` can be stored; backup error: `Student at index N is invalid: Invalid characters in subject name`. CONFIRMED — [studentSchema.ts](../src/schemas/studentSchema.ts:9-16); [Settings.tsx](../src/pages/Settings.tsx:980-990) |
| School name 3–150 chars | Settings text input has no visible min/max validation. | Backup error: `Settings are invalid: School name must be at least 3 characters`, `School name too long`, or a transform-trimmed equivalent. CONFIRMED — [settingsSchema.ts](../src/schemas/settingsSchema.ts:40-45); [Settings.tsx](../src/pages/Settings.tsx:404-410) |
| Academic year `YYYY/YYYY` with consecutive years | Settings uses a plain text input and does not validate before provider save. | Backup errors: `Settings are invalid: Academic year must be in format YYYY/YYYY` or `End year must be start year + 1`. CONFIRMED — [settingsSchema.ts](../src/schemas/settingsSchema.ts:75-85); [Settings.tsx](../src/pages/Settings.tsx:663-668) |
| Email format, optional field limits, fees 0–10000, component max/name limits | UI uses browser input types/min attributes but provider save does not run the schema. | Values bypassing browser UI or typed beyond UI constraints can be stored and later rejected with the schema’s exact first issue, e.g. `Settings are invalid: Invalid email`, `...Max score cannot exceed 100`, or `...Max score must be at least 1`. CONFIRMED/INFERRED — [settingsSchema.ts](../src/schemas/settingsSchema.ts:47-71); [Settings.tsx](../src/pages/Settings.tsx:505-555) |
| Exam type/level/term/school type enums | Settings selects/buttons constrain normal UI values. | Direct/API/import values outside enums are rejected with `Settings are invalid: Invalid option`. CONFIRMED — [settingsSchema.ts](../src/schemas/settingsSchema.ts:6-18); [Settings.tsx](../src/pages/Settings.tsx:680-709) |

ScoreEntryModal/SubjectRow clamp score inputs to the configured maxima, so normal score entry should satisfy numeric bounds; the validator still rejects malformed direct storage or older payloads. CONFIRMED — [SubjectRow.tsx](../src/components/SubjectRow.tsx:63-151); [backupValidation.ts](../src/utils/backupValidation.ts:17-21)

## 6. Routes and navigation

Routes are `/`, `/settings`, `/print` with optional `id` search, and `/analytics`; Settings, PrintPreview, and Analytics are lazy-loaded, Dashboard is eager. Entry links are Dashboard header links, StudentList’s per-student print link, Print’s Back links, Analytics navigate-to-dashboard buttons, and Settings’ Back link. CONFIRMED — [router.tsx](../src/router.tsx:8-72); [Dashboard.tsx](../src/pages/Dashboard.tsx:101-132); [StudentList.tsx](../src/components/StudentList.tsx:168-176)

PageHeader is used by Dashboard, Analytics, and Settings. It has no Back button; it only renders branding and caller-provided actions. PrintPreview uses its own toolbar/back links. CONFIRMED — [PageHeader.tsx](../src/components/ui/PageHeader.tsx:9-48); [Analytics.tsx](../src/pages/Analytics.tsx:234-265); [Settings.tsx](../src/pages/Settings.tsx:343-365)

No manifest shortcut entries or explicit unknown-route/catch-all route were found. Browser Back is left to TanStack Router/browser history; installed-PWA-specific behavior is UNVERIFIED. CONFIRMED/UNVERIFIED — [router.tsx](../src/router.tsx:58-72); [vite.config.ts](../vite.config.ts:79-126)

## 10. PostHog configuration

`posthog.init` uses `capture_pageview: true`, `autocapture: true`, `mask_all_text: true`, `mask_all_element_attributes: true`, and a `session_recording` block that masks inputs/text and blocks images. CONFIRMED — [main.tsx](../src/main.tsx:7-25)

The configured masking and session-recording options contradict the old audit claim that they are absent. Repository code still cannot establish whether specific student names or scores appear in replays. CONFIRMED/UNVERIFIED — [main.tsx](../src/main.tsx:10-25)

## 11. Repo conventions

Tests use Vitest globals, happy-dom, `src/test/setup.ts`, Testing Library cleanup, jest-dom matchers, and manual browser API mocks such as `matchMedia` and `IntersectionObserver`. Existing tests mock storage, router, PostHog, and encryption modules with `vi.mock` where needed. CONFIRMED — [vite.config.ts](../vite.config.ts:10-20); [setup.ts](../src/test/setup.ts:1-35); [DataBackup.test.tsx](../src/test/DataBackup.test.tsx:1-30)

Lint is ESLint flat config with TypeScript recommended rules, React Hooks recommended rules, React Refresh, and Prettier compatibility. The repository has encountered React Hooks immutability/incompatible-library warnings and rules/errors around useless assignments and preserving caught errors during prior work; exact rule names are not explicitly configured here beyond the recommended presets. CONFIRMED/UNVERIFIED — [eslint.config.js](../eslint.config.js:1-31)

Required package scripts before a commit are `npm run lint`, `npx tsc -b`, and `npm test -- --run`; `npm run build` additionally runs TypeScript and Vite build. CONFIRMED — [package.json](../package.json:20-29)

## Surprises

- The old inventory’s student photo name `image` is wrong: the implemented field is `pictureUrl`. CONFIRMED — [types/index.ts](../src/types/index.ts:34)
- The earlier assumption that `nextTermStarts` and `academicYear` have no report consumers is wrong; all four templates and shared report components consume them. CONFIRMED — [ClassicTemplate.tsx](../src/templates/ClassicTemplate.tsx:75-75); [ModernTemplate.tsx](../src/templates/ModernTemplate.tsx:77-77); [ReportHeader.tsx](../src/components/reports/ReportHeader.tsx:60-62)
- The App auto-lock read key does not match the provider settings key. CONFIRMED — [App.tsx](../src/App.tsx:22); [idbStorage.ts](../src/utils/idbStorage.ts:8-9)
- DataGate now provides backup recovery while load-error is displayed, rather than leaving Settings as the only recovery route. CONFIRMED — [DataGate.tsx](../src/components/DataGate.tsx:23-37)
- PostHog enables pageview/autocapture and configures text, attribute, input, and session-recording masking. CONFIRMED — [main.tsx](../src/main.tsx:10-25)

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
