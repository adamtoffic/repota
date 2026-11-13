# Settings page split analysis

## Evidence conventions

This is a read-only analysis of the current tree. Citations use `path:line`. **INFERRED**
means the conclusion follows from the cited code but is not stated explicitly. **UNVERIFIED**
means the repository does not provide enough evidence to confirm it.

## 1. Section inventory

The page is one `Settings` component. The cards below are rendered in this order; all edits
write the same `formData` object and are therefore covered by the same debounce effect
(`src/pages/Settings.tsx:65-125`).

| Block | `SchoolSettings` fields read / written | Local state | Modals / conditional rendering | Child components | PostHog |
|---|---|---|---|---|---|
| Header and autosave | reads `settings.schoolName`; reset compares the whole `formData` | `showResetModal`, `lastSavedSettings`, `lastAutoSaveRef` | Reset appears only when whole-object JSON differs (`src/pages/Settings.tsx:92-99`, `316-349`) | `PageHeader`, `Link`, `AutoSaveIndicator` | None |
| School identity | `logoUrl`, `schoolName`, `schoolMotto`, `address`, `phoneNumber`, `email`, `schoolType`; private block writes `schoolGift`, `canteenFees`, `firstAidFees` | none specific beyond shared draft | Fee block only for `schoolType === "PRIVATE"` (`src/pages/Settings.tsx:440-493`) | `ImageUploader`, `Input` | None |
| Academic session | `level`, `className`, `classSize`, `totalAttendanceDays`, `nextTermStarts`, `academicYear`, `term`, `examType`, `classScoreMax`, `examScoreMax` | `pendingLevel`, `showLevelChangeModal` | level change confirmation when changing level with existing default subjects; SBA weights and task library hidden for `MOCK`; mock notice shown for `MOCK` (`src/pages/Settings.tsx:162-190`, `535-900`) | `Input` | `School_Level_Changed` with `{new_level}` (`src/pages/Settings.tsx:181-187`) |
| Staff details | `headTeacherName`, `headTeacherSignature`, `classTeacherName`, `teacherSignature` | none specific | none | two `ImageUploader`s, `Input`s (`src/pages/Settings.tsx:901-942`) | None |
| Subjects | `defaultSubjects` | `newSubject`, `showDeleteSubjectModal`, `subjectToDelete` | delete confirmation; card always renders (empty list is possible) (`src/pages/Settings.tsx:943-993`, `1368-1381`) | `Input`, `IconButton` | None |
| Subject assessment config | reads `defaultSubjects`, `componentLibrary`, `subjectComponentMap`; writes `subjectComponentMap` | `showDeleteComponentModal`, `componentToDelete` (library input state is in the preceding assessment block) | rendered only when subjects and library are both non-empty; **not** gated by `examType` (`src/pages/Settings.tsx:994-1073`) | `Input`, buttons | None |
| Assessment task library | `componentLibrary` | `newComponentName`, `newComponentMax`, `newComponentCategory`, delete modal state | task library is inside the academic assessment area and hidden for mock; delete confirmation (`src/pages/Settings.tsx:757-900`, `1368-1402`) | `Input`, native controls, `IconButton` | None |
| Report template | `templateId` | none specific | selected template styling; available templates come from registry (`src/pages/Settings.tsx:1074-1118`) | buttons, `TEMPLATE_REGISTRY` | `Template_Changed` with `{template_id}` (`src/pages/Settings.tsx:1095-1097`) |
| Security and privacy | `autoLockTimeout` is in the draft; PIN and biometric state are not `SchoolSettings` fields | `biometricAvailable`, `biometricType`, `enrollingBiometric`, `showPinSetup`, `showPinRecovery`, `showDisablePinModal` | PIN controls only when `isPinConfigured()`; biometric block additionally requires availability; enrollment/disable state is read synchronously from localStorage (`src/pages/Settings.tsx:1119-1267`) | `Alert`, `Button`, `PinSetup`, `PinRecovery`, `ConfirmModal` | None |
| Storage monitor | no `SchoolSettings` field | child-owned state | always rendered | `StorageMonitor` (`src/pages/Settings.tsx:1268-1270`) | None |
| Backup/import | reads settings indirectly from IndexedDB; does not update `formData` | all state is inside `DataBackup` | import confirmation and password modal; successful import reloads the window (`src/components/DataBackup.tsx:35-236`) | `DataBackup` | None |
| Factory reset | all settings are replaced by `restoreDefaults` | `showFactoryResetModal` | confirmation, then reload after one second (`src/pages/Settings.tsx:1271-1350`) | `Alert`, `Button`, `ConfirmModal` | None |

The component also owns the class-name confirmation flow. Confirming calls
`updateClassNameForAll` and immediately saves the complete draft (`src/pages/Settings.tsx:298-305`,
`1290-1308`).

## 2. Field classification and consumers

Frequency is a product-use classification, not a measured telemetry value. “One-time setup” and
similar labels are **INFERRED** from the field label and downstream use.

| Field edited here | Likely frequency | Consumers elsewhere in `src` |
|---|---|---|
| `schoolName` | one-time setup / rarely | `Dashboard` header and exports (`src/pages/Dashboard.tsx:102`, `223`); `PrintPreview` and templates (`src/pages/PrintPreview.tsx:127`, `src/templates/OriginalTemplate.tsx:90`); `PageHeader` also receives it in analytics (`src/pages/Analytics.tsx:234`, `259`). |
| `logoUrl`, `schoolMotto`, `address`, `phoneNumber`, `email` | one-time setup / rarely | Report templates render logo, address and motto (`src/templates/OriginalTemplate.tsx:75-97`); other template variants consume the corresponding report settings. Phone/email consumers are **UNVERIFIED** by grep beyond the settings schema and template-specific uses. |
| `schoolType` | one-time setup / rarely | Report templates select Islamic/private behavior (`src/templates/OriginalTemplate.tsx:6-10`; same pattern in `ClassicTemplate.tsx:6-9`, `ModernTemplate.tsx:6-9`, `MinimalTemplate.tsx:6-9`); analytics events include it when students are added (`src/context/SchoolContext.tsx:205-209`). |
| `schoolGift` | per term (private-school fee schedule) | All four report templates print it (`src/templates/OriginalTemplate.tsx:9-10`, `390-397`; `ClassicTemplate.tsx:304-321`; `ModernTemplate.tsx:368-383`; `MinimalTemplate.tsx:264-270`). The input label says “Per Term” (`src/pages/Settings.tsx:452-471`), while the type comment says daily; the semantic conflict is documented, not resolved. |
| `canteenFees` | per term or daily, depending on intended fee policy; **INFERRED** | All four report templates print it (`src/templates/OriginalTemplate.tsx:393-397`; `ClassicTemplate.tsx:312-321`; `ModernTemplate.tsx:374-383`; `MinimalTemplate.tsx:265-270`). The settings label says daily (`src/pages/Settings.tsx:472-485`) and the type comment also says daily (`src/types/index.ts:91-93`). |
| `firstAidFees` | per term | All four report templates print it (`src/templates/OriginalTemplate.tsx:393-397`; `ClassicTemplate.tsx:316-321`; `ModernTemplate.tsx:380-383`; `MinimalTemplate.tsx:267-270`). |
| `level` | one-time setup, then per class/year | Grade processing and analytics use it (`src/context/SchoolContext.tsx:685-688`; `src/pages/Analytics.tsx:82`, `203`; `src/utils/analyticsCalculator.ts:74-75`); `StudentList` chooses fallback subjects (`src/components/StudentList.tsx:50-53`); reports choose level-specific layout (`src/templates/OriginalTemplate.tsx:8-9`). |
| `className` | per class / per academic year | Dashboard, analytics, backup names, bulk import and reports consume it (`src/pages/Dashboard.tsx:89`, `223`; `src/pages/Analytics.tsx:214`, `277`; `src/components/DataBackup.tsx:84-89`; `src/components/BulkImportModal.tsx:51`; `src/pages/PrintPreview.tsx:127`). It also copies to every student when explicitly confirmed (`src/context/SchoolContext.tsx:300-302`). |
| `classSize` | per class | Dashboard statistics use it (`src/components/DashboardStats.tsx:13`, `50`). |
| `totalAttendanceDays` | per term | analytics, remark generation, and reports consume it (`src/pages/Analytics.tsx:814`; `src/context/SchoolContext.tsx:716-725`; `src/utils/analyticsCalculator.ts:464-473`). |
| `nextTermStarts` | per term | A consumer outside Settings is **UNVERIFIED**; it is part of the schema/type and edited at `src/pages/Settings.tsx:574-579`. |
| `academicYear` | per year | Report/template consumers are not found by exact field grep; direct downstream use is **UNVERIFIED**. |
| `term` | per term | remark generation and report templates use it (`src/context/SchoolContext.tsx:706-711`; `src/templates/OriginalTemplate.tsx:11`). |
| `examType` | per term / exam cycle | Every report template and `ReportTemplate` switch mock rendering (`src/templates/OriginalTemplate.tsx:9`; `src/components/ReportTemplate.tsx:24`); schema validation applies mock rules (`src/schemas/settingsSchema.ts:135-151`). |
| `classScoreMax`, `examScoreMax` | per exam setup | grade calculation uses the maxima (`src/utils/gradeCalculator.ts`); Settings keeps them complementary when editing weights and forces `0/100` for mock (`src/pages/Settings.tsx:668-767`). Exact line for the calculator’s maxima is **UNVERIFIED** because the symbol occurs through helper calls rather than a concise field access. |
| `defaultSubjects` | per class / per year | new students are created from it (`src/context/SchoolContext.tsx:533-659`); `StudentList` and validation warnings consume it (`src/components/StudentList.tsx:50-53`; `src/components/ValidationWarnings.tsx:22`); subject assignment UI and report data depend on it (`src/pages/Settings.tsx:794-949`). |
| `componentLibrary` | per assessment setup / per year | only Settings, schema, registry helpers and the subject map workflow consume it (`src/pages/Settings.tsx:206-285`, `851-1014`; `src/schemas/settingsSchema.ts:120-126`; `src/utils/componentRegistry.ts:40-78`). A direct runtime consumer of the library outside Settings is **UNVERIFIED**. |
| `subjectComponentMap` | per class / assessment setup | manual student synchronization and demo-data creation consume it (`src/context/SchoolContext.tsx:301-420`, `461-500`); Settings edits it (`src/pages/Settings.tsx:274-293`, `994-1073`). |
| `templateId` | per report design, rarely | print preview chooses the template and records it in analytics (`src/pages/PrintPreview.tsx:73-82`); registry definitions are in `src/templates/registry.ts`. |
| `headTeacherName`, `classTeacherName`, `headTeacherSignature`, `teacherSignature` | one-time setup / per staff change | report templates print both names and signatures (`src/templates/OriginalTemplate.tsx:439-466`; analogous fields in all templates). |
| `autoLockTimeout` | rarely / when security policy changes | `App` reads it once from IndexedDB and converts minutes to milliseconds (`src/App.tsx:22-27`); the settings select writes it into `formData` (`src/pages/Settings.tsx:1120-1135`). |

`SchoolSettings` also declares the optional fields above in one persisted object
(`src/types/index.ts:48-100`). No source consumer was found for `nextTermStarts`, `academicYear`,
or a direct `componentLibrary` runtime lookup outside Settings; those absences are **UNVERIFIED**
rather than proof that no dynamically accessed consumer exists.

## 3. Save-flow trace

1. A controlled input handler creates a new object with `setFormData({...formData, field})`;
   representative handlers are at `src/pages/Settings.tsx:350-440` and `493-579`.
2. `formData` is local state initialized once from the provider’s current `settings`;
   `lastSavedSettings` and `lastAutoSaveRef` are initialized from the same snapshot
   (`src/pages/Settings.tsx:65-67`).
3. `useDebounce(formData, 500)` delays the draft snapshot (`src/pages/Settings.tsx:101`).
4. The autosave effect stringifies the debounced whole object. If its JSON equals
   `lastAutoSaveRef`, it returns (`src/pages/Settings.tsx:104-107`).
5. If the class name differs from `lastSavedSettings.className` while students exist, it
   returns before calling `setSettings` (`src/pages/Settings.tsx:108-112`). This skips the
   entire snapshot, not merely `className`.
6. Otherwise it calls the context setter, updates the ref, and schedules
   `lastSavedSettings` on the next animation frame (`src/pages/Settings.tsx:114-120`).
7. `SchoolContext` separately debounces provider `settings` by 500ms (`src/context/SchoolContext.tsx:65-71`).
   Once initial loading has completed, that effect writes `IDB_KEYS.SETTINGS`, calls
   `createBackupHeartbeat`, and updates `lastSaved` (`src/context/SchoolContext.tsx:150-156`).
8. The provider’s load effect initializes IndexedDB, migrates local storage, loads students and
   settings, then sets `isDataLoaded` (`src/context/SchoolContext.tsx:104-134`).

The direct `setSettings` side effects are therefore React state propagation, a second debounced
IndexedDB write, and a backup heartbeat. `setSettings` does **not** automatically synchronize
student subject components; that operation is an explicit provider action
(`src/context/SchoolContext.tsx:349-420`). `finalizeSave` additionally updates all student
class names only when the user confirms (`src/pages/Settings.tsx:298-305`).

The following behaviors depend on one component’s shared draft: whole-object JSON dirty
detection (`src/pages/Settings.tsx:92`), one shared debounce (`src/pages/Settings.tsx:101`),
one class-name gate (`src/pages/Settings.tsx:108-112`), and Reset restoring the whole
`lastSavedSettings` snapshot (`src/pages/Settings.tsx:308-312`). Splitting routes without
preserving these invariants is **INFERRED** to change behavior.

## 4. Cross-section coupling map

| Change | Current behavior | If separate routes |
|---|---|---|
| `level` -> subjects/class | `applyLevelChange` replaces `level`, `defaultSubjects`, and `className`, then emits `School_Level_Changed` (`src/pages/Settings.tsx:174-190`). | A level route must update the subjects/class draft atomically or the user can navigate away with only part of the preset applied. **INFERRED** |
| `level` -> grade/report processing | Provider recalculates processed students from `settings.level` (`src/context/SchoolContext.tsx:685-688`), and templates branch on level (`src/templates/OriginalTemplate.tsx:8-9`). | A split must commit level before score/report routes render; otherwise stale level-dependent output is possible. **INFERRED** |
| `className` -> students | The change is held while students exist; confirmation calls `updateClassNameForAll` (`src/pages/Settings.tsx:108-112`, `1290-1308`; `src/context/SchoolContext.tsx:300-302`). | The modal and the draft must be shared or a route transition can strand the pending name. **INFERRED** |
| `defaultSubjects` -> new students | Provider creation paths map the current defaults into new student subjects (`src/context/SchoolContext.tsx:533-659`). | Subject edits must be persisted before leaving if the next student-entry route is expected to see them. **INFERRED** |
| subjects -> component assignment | Assignment rows are generated from `defaultSubjects`; available tasks come from `componentLibrary`; map is keyed by subject name (`src/pages/Settings.tsx:994-1073`). | Separate subject/task routes need a shared draft or explicit commit ordering. |
| task library -> subject assignment | Deleting a library task removes it from `componentLibrary` but does not remove matching entries from `subjectComponentMap` (`src/pages/Settings.tsx:257-274`). | A split would not fix this; it could make the stale-map window more visible. Downstream student sync reads only the map (`src/context/SchoolContext.tsx:349-420`). |
| `subjectComponentMap` -> student records | Student component synchronization is manual and can remove/reset student component scores (`src/context/SchoolContext.tsx:349-420`). | A route must not silently invoke this action; preserve the current explicit boundary. |
| `examType` -> maxima/SBA UI | Selecting mock sets `classScoreMax=0`, `examScoreMax=100`; weights and the task-library block are hidden for mock (`src/pages/Settings.tsx:668-767`). | Exam route and assessment route must share draft state so a route switch does not restore stale weights. **INFERRED** |
| `examType` -> subject assessment card | The subject assessment card checks only subject/library lengths, not exam type (`src/pages/Settings.tsx:851-856`). | A separate assessment route could accidentally expose the same configuration in mock mode unless it preserves current rendering rules. |
| `schoolType` -> fee block/report | Private fee inputs render only for `PRIVATE`; templates render fee lines when values exist (`src/pages/Settings.tsx:440-493`; `src/templates/OriginalTemplate.tsx:6-10`, `390-397`). | Identity and fees should share committed school type or fee visibility can lag. **INFERRED** |
| template -> print | `templateId` is selected locally then consumed by `PrintPreview` via the provider (`src/pages/Settings.tsx:1078-1097`; `src/pages/PrintPreview.tsx:73-82`). | Template route must save before print navigation. **INFERRED** |
| PIN -> auto-lock/biometric | PIN presence gates timer and biometric UI; disabling PIN also removes biometric localStorage keys (`src/pages/Settings.tsx:1119-1267`; `src/utils/pinSecurity.ts:112-120`). | Security routes need shared live PIN status or the UI can be stale after a modal closes. **INFERRED** |
| backup/import -> all settings | Import writes students and settings directly to IndexedDB then reloads (`src/components/DataBackup.tsx:204-236`). | A route-local draft can be overwritten by reload; a mounted sibling route cannot assume its draft survives import. |

## 5. Suspected issues

### a) Class-name gate and Cancel

**Confirmed.** When students exist and the debounced class name differs, the autosave effect
returns for the complete JSON snapshot (`src/pages/Settings.tsx:104-112`). A second effect opens
the modal after one second when the mismatch remains (`src/pages/Settings.tsx:126-140`).

**Confirmed.** Cancellation restores `lastSavedSettings.className` and closes the modal.
The cancellation flow does not reopen it (`src/pages/Settings.tsx:194-197`,
`src/components/ConfirmModal.tsx:26-39`).

**Confirmed.** The user can get out by choosing “Yes, Update Everyone” (which saves and updates
students) or by Reset, which restores `lastSavedSettings` (`src/pages/Settings.tsx:1299-1308`,
`308-312`). There is also a browser reload/navigation escape, but it discards the local draft;
this is **INFERRED** from local state initialization and no persistence of the draft
(`src/pages/Settings.tsx:65-67`).

### b) Level change and stale component data

**Confirmed.** `applyLevelChange` replaces `defaultSubjects` and `className`, but spreads the
previous object and does not clear `componentLibrary` or `subjectComponentMap`
(`src/pages/Settings.tsx:174-183`). Thus stale entries can remain in the draft.

**Confirmed.** The subject map is read downstream by mismatch detection, manual synchronization,
and demo-data creation (`src/context/SchoolContext.tsx:301-420`, `461-500`). The library is read
by Settings’ assignment UI and schema/registry utilities (`src/pages/Settings.tsx:206-285`,
`994-1073`; `src/utils/componentRegistry.ts:40-78`). Whether a stale map key for a subject no
longer in `defaultSubjects` affects existing student records depends on their subject names; the
repository does not provide a level-change cleanup path. **UNVERIFIED** for production data
impact beyond those reads.

### c) Subject Assessment Config and mock mode

**Confirmed.** The card condition is only `defaultSubjects.length > 0 &&
componentLibrary.length > 0`; there is no `examType` test (`src/pages/Settings.tsx:851-856`).
Weights and the task-library block are conditionally hidden for mock in the academic block, but
the assignment card is not (`src/pages/Settings.tsx:704-767`, `994-1073`).

**Impact:** the mock explanatory text says SBA components are disabled, yet users can still
assign them in this card. Provider synchronization and grade calculations can read the map
(`src/context/SchoolContext.tsx:349-420`; `src/utils/gradeCalculator.ts`). Whether this creates
visible mock scores for every report path is **UNVERIFIED**; the inconsistency itself is confirmed.

### d) One-time initialization, import/reset, and cold start

**Confirmed.** `formData`, `lastSavedSettings`, and `lastAutoSaveRef` initialize from `settings`
only once; there is no effect resynchronizing them when provider settings later change
(`src/pages/Settings.tsx:65-67`).

Other settings changes while mounted include provider `restoreDefaults` (`src/context/SchoolContext.tsx:72-101`), which is called by the factory reset flow before reload (`src/pages/Settings.tsx:1310-1323`), and `DataBackup.executeImport`, which writes IndexedDB directly and reloads (`src/components/DataBackup.tsx:204-236`). A parent/provider caller can also call `setSettings`; the only source call sites found are Settings and provider initialization (`src/pages/Settings.tsx:124`, `299`; `src/context/SchoolContext.tsx:100`, `131`). A same-tab external mutation without reload is **UNVERIFIED**.

**Cold start:** The `/settings` route is wrapped by `DataGate`, which renders `PageLoader` until
`isDataLoaded` is true. Settings is not mounted while the provider is loading persisted data
(`src/router.tsx:35-38`; `src/components/DataGate.tsx:11-40`).

### e) Fee names and consumers

The “School Fees (Per Term)” control writes `formData.schoolGift` (`src/pages/Settings.tsx:452-471`).
The stored key is `schoolGift`, typed as “Daily school fees” (`src/types/index.ts:91`), and all four
templates consume it as a displayed “School” fee (`src/templates/OriginalTemplate.tsx:390-397`;
`ClassicTemplate.tsx:304-321`; `ModernTemplate.tsx:368-383`; `MinimalTemplate.tsx:264-270`).
`canteenFees` is labeled daily in Settings and typed daily; `firstAidFees` is labeled and typed
termly (`src/pages/Settings.tsx:472-493`; `src/types/index.ts:91-93`). No other consumer of
these three exact keys was found. The label/type mismatch for `schoolGift` is confirmed; its
business meaning is **UNVERIFIED**.

### f) PIN, biometric, and auto-lock

**Confirmed.** `isPinConfigured()` and `isBiometricEnrolled()` are called during render, not
stored in React state (`src/pages/Settings.tsx:1119-1267`). Both utilities read localStorage
synchronously (`src/utils/pinSecurity.ts:45-48`; biometric equivalent is in
`src/utils/biometricAuth.ts`).

`autoLockTimeout` is draft state in Settings and is persisted through the normal settings path
(`src/pages/Settings.tsx:1120-1135`). `App` independently reads the `"app-data"` storage record
once on mount and sets the idle timer in milliseconds (`src/App.tsx:22-27`). The provider writes
the settings record under `IDB_KEYS.SETTINGS` after its own debounce (`src/context/SchoolContext.tsx:150-156`);
the exact string value of `IDB_KEYS.SETTINGS` is **UNVERIFIED** from the inspected excerpt. A
changed timer therefore takes effect on the next App mount/reload, not immediately in the
already-mounted App; **INFERRED** from the one-run effect dependency list (`src/App.tsx:22-28`).

### g) Reachability of Reset

**Confirmed.** Reset is shown only while whole-object JSON differs
(`src/pages/Settings.tsx:92-99`). Normal edits are autosaved after the page debounce and then
provider debounce (`src/pages/Settings.tsx:101-120`; `src/context/SchoolContext.tsx:65-71`), so
the visible dirty state is usually brief. It is reachable during either debounce window, while
an asynchronous/animation-frame update has not caught up, after an autosave is blocked by the
class-name gate, or after a modal flow changes `formData` without saving. The class-name gate is
the confirmed durable path; the other timing windows are **INFERRED** from the effects.

## 6. Navigation and entry points

| Entry point | Evidence |
|---|---|
| Router | `/settings` is a route whose component is the lazy `Settings` import (`src/router.tsx:8-10`, `35-38`). |
| Dashboard card/action | Two links navigate to `/settings` (`src/pages/Dashboard.tsx:121-130`). |
| Settings Back | `Link to="/"` is the header Back action (`src/pages/Settings.tsx:327-344`), not browser history. |
| Programmatic navigation | No `navigate` call targeting `/settings` was found by repository grep. **UNVERIFIED** for dynamically constructed URLs. |
| `href` links | No `/settings` href was found. **UNVERIFIED** for runtime-generated links. |
| PWA manifest shortcuts | The checked source manifest path does not exist; Vite generates the manifest and its configured manifest has no `shortcuts` entry (`vite.config.ts:80-124`). No settings shortcut is configured. |
| Tests | `SettingsIntegration.test.tsx` tests generic `Input` behavior, not the `Settings` page (`src/test/SettingsIntegration.test.tsx:1-75`). |

`PageHeader` is a sticky branded `<nav>` with optional actions; it has no built-in Back behavior
(`src/components/ui/PageHeader.tsx:3-47`). It is used by Settings, Dashboard, and Analytics
(`src/pages/Settings.tsx:50`, `316`; `src/pages/Dashboard.tsx:25`, `101`;
`src/pages/Analytics.tsx:29`, `234`, `259`). The Settings Back button is therefore page-owned.

## 7. Test coverage

| Existing test | What it covers | What it does not cover |
|---|---|---|
| `src/test/SettingsIntegration.test.tsx:1-75` | Generic text, number, date, required, min/max, maxLength, controlled Input behavior | No Settings render, provider, IndexedDB, autosave, modal, field coupling, analytics, or navigation |
| `src/test/FormValidation.test.tsx` | Form/component validation behavior; exact Settings coverage is **UNVERIFIED** without a Settings import | Settings persistence and cross-section behavior |
| `src/test/ComponentComposition.test.tsx` | Component composition; exact Settings coverage is **UNVERIFIED** | Settings route and save flow |
| `src/components/ui/*.test.tsx` | UI primitives | Settings orchestration |

No test was found that exercises the class-name gate, level preset reset, mock-mode assignment
visibility, import/reset reload, PIN/biometric render gating, `autoLockTimeout`, route deep links,
PostHog event properties, service-worker update behavior, or persistence after reload. These are
coverage gaps evidenced by the absence of a Settings render in the named integration test and by
repository test file inventory; complete negative proof is **UNVERIFIED**.

## 8. Proposed grouping

### Recommended: four destinations

| Destination | Sections / fields | Rationale |
|---|---|---|
| **School & staff** | identity, logo/contact, `schoolType` and fees, staff/signatures | Mostly one-time/rare changes; identity, fee visibility, and report header/signature output are coupled (`src/pages/Settings.tsx:350-493`; `src/templates/OriginalTemplate.tsx:75-97`, `439-466`). |
| **Class & term setup** | `level`, `className`, `classSize`, `defaultSubjects`, `academicYear`, `term`, `nextTermStarts`, `totalAttendanceDays`, `examType`, score maxima | Keeps the level preset, class-name modal, subjects, and exam-weight invariants together (`src/pages/Settings.tsx:162-190`, `535-767`; `src/context/SchoolContext.tsx:533-659`). |
| **Assessment** | `componentLibrary`, `subjectComponentMap`, assignment UI | These three structures form one task-to-subject workflow; provider synchronization reads the map (`src/pages/Settings.tsx:206-285`, `851-1014`; `src/context/SchoolContext.tsx:349-420`). |
| **Reports, security & data** | `templateId`, PIN/biometric/`autoLockTimeout`, storage monitor, backup/import, factory reset | These are operational tools rather than class setup; keep security and data destructive actions visually separated within the destination (`src/pages/Settings.tsx:1015-1325`). |

This grouping follows the teacher flow **setup -> enter scores -> print -> analyze**: setup is
the first two destinations, assessment supports score entry, reports supports print, and
analytics is already a separate route (`src/router.tsx:39-43`). Repeated per-term actions
(`term`, `totalAttendanceDays`, `examType`, and likely `nextTermStarts`) may not belong under a
rarely visited “Settings” label; they are the strongest candidates for a “Current term” setup
surface. This is a product recommendation, not current behavior.

### Alternative A: five destinations

Split **School identity**, **Staff & signatures**, **Class setup**, **Assessment**, and
**Security & data/reporting**. This makes staff changes discoverable and keeps identity fields
shorter, but adds navigation and still needs an atomic class setup route because level,
subjects, class name, and exam weights interact (`src/pages/Settings.tsx:535-767`).

### Alternative B: three destinations

Use **Setup** (identity, staff, class, subjects), **Assessment & reports** (weights, tasks,
template), and **Security & data**. This minimizes navigation and preserves broad shared
contexts, but mixes rare branding with per-term setup and puts the task-map/template coupling
behind a larger page.

The recommended four-way split is the lowest cognitive-load option while retaining the two
highest-risk atomic groups: class/term setup and assessment. These tradeoffs are **INFERRED**.

## 9. State architecture options

| Option | Pros | Cons / class gate / dirty state / cold start | Risk |
|---|---|---|---|
| (a) Shared `useSettingsDraft` context/hook above all settings routes | Preserves one `formData`, one `lastSavedSettings`, one debounce, whole-object Reset and the class-name gate; can expose a loading-ready flag | Must explicitly initialize after provider IndexedDB load or retain current startup semantics; route unmounts must not destroy the draft; context complexity | **Lowest** if implemented as a pure extraction of `Settings` state/effects |
| (b) Each route owns a field slice and autosaves itself | Small routes and local ownership | Loses whole-object JSON diff and can produce multiple writes; class gate must coordinate with students across routes; deep links still face provider cold start; partial preset updates are likely | High |
| (c) Keep one draft in a route layout, render child section components | Minimal new state model; children receive setters and modal callbacks; preserves current behavior closely | Requires a settings layout route and careful modal placement; deep-link readiness still needs the provider contract | Low-to-medium |
| (d) Remove draft and write directly through a shared settings reducer/store | Centralized actions and testability | Behavior changes from object replacement/whole snapshot; harder rollback and higher migration surface | Medium-high |

Recommendation: **(a), implemented first as (c)**—extract the existing state/effects into a shared
settings layout/hook without changing setter semantics. Keep the class-name gate around the
whole snapshot, keep Reset whole-object, and do not make route components independently save.
The provider currently has no load-ready value in its public context (`src/context/SchoolContextDefinition.ts:5-24`);
adding one may be necessary for a safe cold-start design, but doing so is a behavior change that
needs separate verification.

## 10. Migration plan

Each step is intended to be independently shippable and to move code without changing behavior.

| Step | Files touched | Risk / why | Verify | Rollback |
|---|---|---|---|---|
| 1. Characterize current behavior | Tests plus no production source change | Low; creates evidence, but missing current integration coverage is a risk | Add tests around existing Settings through provider; run `npm test -- --run` | Revert tests only |
| 2. Extract draft/autosave logic into a hook without splitting UI | `src/pages/Settings.tsx`, new hook/test | Medium; effect dependencies and animation-frame timing are sensitive (`src/pages/Settings.tsx:101-120`) | Test keystroke -> provider setter -> IndexedDB; class gate; Reset | Restore inline state/effects |
| 3. Extract each card into child components but render in the same route/order | `Settings.tsx`, new `src/components/settings/*` | Medium; props and modal callbacks can alter closure behavior | Manual checklist below; compare PostHog calls and all field values | Recombine cards |
| 4. Add a settings layout route with shared draft context and a desktop/mobile nav | `src/router.tsx`, layout/context, Settings children | High; route unmount/deep-link and modal ownership risks | Direct-load each destination, switch routes with unsaved edits, test mobile/desktop | Keep `/settings` rendering old monolith |
| 5. Preserve `/settings` as the entry point and deep-link old URL | `src/router.tsx` and navigation links | Medium; existing Dashboard links must continue working (`src/pages/Dashboard.tsx:121-130`) | Open `/settings` cold and from Dashboard; verify Back to `/` | Remove child routes and retain old route |
| 6. Move backup/security/report blocks only after shared draft is proven | Settings layout/children | High for data loss and auth gating | Import/export, factory reset, PIN recovery/disable, biometric, timer | Revert moved block only |
| 7. Update PWA build and rollout | `vite.config.ts`, generated deployment output, service-worker release process | Medium/high for cached returning users; Vite precaches hashed assets and uses `autoUpdate` (`vite.config.ts:10`, `43-78`) | Install/update test on an existing PWA, offline navigation, reload after update | Redeploy prior build and let old cache serve |
| 8. Add navigation analytics | settings navigation components only | Low if payload is route label only; do not include school/student data | Confirm event name/properties in PostHog and preserve existing `School_Level_Changed` and `Template_Changed` calls exactly (`src/pages/Settings.tsx:181-187`, `1088-1097`) | Remove new navigation events |

For rollout, a service-worker update can leave returning users on the old precache until the
registration/update lifecycle completes; the repository config says `autoUpdate`, but exact
browser activation timing is **UNVERIFIED**. Do not change IndexedDB keys or settings field names.
Keep existing event names and properties byte-for-byte; only add navigation events such as
`Settings_Menu_Opened` with `{section: "school"}` and no school/student identifiers. The proposed
event is a recommendation, not current behavior.

## 11. Behaviors that MUST be preserved

- The `/settings` URL and Dashboard links continue to work (`src/router.tsx:35-38`;
  `src/pages/Dashboard.tsx:121-130`).
- Settings initialize from provider settings and save through the existing two-stage debounce
  into `IDB_KEYS.SETTINGS` (`src/pages/Settings.tsx:65-120`; `src/context/SchoolContext.tsx:150-156`).
- The class-name gate blocks the complete snapshot until the user chooses update or Reset
  (`src/pages/Settings.tsx:108-112`, `1290-1308`).
- Level changes load the same default subjects/class and emit the same PostHog event
  (`src/pages/Settings.tsx:174-190`).
- Mock mode sets `0/100`, hides weight controls, and retains current assignment-card behavior
  unless a deliberate behavior change is separately approved (`src/pages/Settings.tsx:668-767`,
  `851-856`).
- School type controls fee visibility and report fee output (`src/pages/Settings.tsx:440-493`;
  `src/templates/OriginalTemplate.tsx:6-10`, `390-397`).
- Existing `School_Level_Changed` and `Template_Changed` names/properties remain unchanged
  (`src/pages/Settings.tsx:181-187`, `1088-1097`).
- PIN/biometric localStorage behavior and disable cleanup remain unchanged
  (`src/utils/pinSecurity.ts:45-48`, `112-120`; `src/pages/Settings.tsx:1119-1267`).
- Backup import/export and factory reset continue to reload after replacement
  (`src/components/DataBackup.tsx:204-236`; `src/pages/Settings.tsx:1310-1323`).
- `subjectComponentMap` synchronization remains explicit, not an implicit side effect of saving
  settings (`src/context/SchoolContext.tsx:349-420`).

### Manual regression checklist

Run after every migration step:

1. Open Dashboard -> Settings; edit **School Name**, wait for the save indicator, reload, and
   confirm the name persists in the header/report.
2. With existing students, change **School Level**; verify the confirmation, choose the level,
   verify default subjects and class preset, and confirm the `School_Level_Changed` event payload.
3. With existing students, change **Class Name**; choose “No, Keep Old Name” and verify the
   modal behavior; then choose Reset and confirm the old draft returns; repeat and choose “Yes,
   Update Everyone,” then verify all students changed.
4. Add and remove a subject; reload and verify new-student defaults and existing student records.
5. Add an SBA task with max/category; assign it to a subject; remove it from the subject; delete
   the library task; verify the current behavior of any remaining map entry.
6. Switch **Exam Type** to Mock and back; verify `0/100`, hidden weights, mock message, and the
   current Subject Assessment Config visibility.
7. Select each report template; print preview and confirm the selected template and
   `Template_Changed` property.
8. Enable PIN, change PIN, use recovery, disable PIN; verify lock/unlock and that disabling also
   removes biometric enrollment state.
9. Enable/disable biometric when available; verify the synchronous status display after each
   action.
10. Change auto-lock timeout; reload the app and verify the new idle period is used.
11. Export an unencrypted backup, export an encrypted backup, import each, cancel once, confirm
    replacement once, and verify reload/persistence.
12. Run factory reset, confirm the warning, verify defaults and preserved student-data promise.
13. Reload after every representative edit and verify IndexedDB-backed persistence.

## 12. Out-of-scope observations

- The page mixes UI primitives (`Input`, `Button`) with raw `button`, `select`, and `input`
  elements (`src/pages/Settings.tsx:327-344`, `350-742`).
- `PageHeader` is a `<nav>` rather than a semantic page header (`src/components/ui/PageHeader.tsx:13-17`).
- The `schoolGift` name and displayed “School Fees” label disagree about frequency
  (`src/types/index.ts:91`; `src/pages/Settings.tsx:452-471`).
- `DataBackup` and factory reset reload the whole window after completion
  (`src/components/DataBackup.tsx:228-236`; `src/pages/Settings.tsx:1310-1323`).
- The repository contains generated `dev-dist` service-worker artifacts; their deployment status
  is not treated as source behavior (**UNVERIFIED**).

## Top 5 risks

1. **High likelihood × high impact:** losing or partially saving the shared draft when routes
   unmount, especially during the class-name gate and debounce windows
   (`src/pages/Settings.tsx:104-120`).
2. **Medium likelihood × high impact:** cold-start deep links rendering defaults before IndexedDB
   settings arrive because there is no route loading gate (`src/context/SchoolContext.tsx:104-134`;
   `src/context/SchoolContextDefinition.ts:5-24`).
3. **Medium likelihood × high impact:** level, subject, task-map, and exam-type changes becoming
   non-atomic across routes (`src/pages/Settings.tsx:174-190`, `638-949`).
4. **Medium likelihood × high impact:** security state becoming stale or auto-lock changes
   appearing saved but taking effect only after reload (`src/App.tsx:22-27`;
   `src/pages/Settings.tsx:1033-1135`).
5. **Medium likelihood × medium impact:** service-worker/PWA cache skew leaving returning users
   on an older route shell after a split (`vite.config.ts:43-78`).
