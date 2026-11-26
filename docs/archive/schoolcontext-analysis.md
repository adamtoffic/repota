# SchoolContext analysis

This is a read-only analysis of [`SchoolContext.tsx`](../src/context/SchoolContext.tsx). No behavior, storage key, persistence guard, or `SchoolContext.tsx` code should be changed as part of this analysis.

## Responsibilities and line ranges

| Responsibility | Lines | Count | What it owns | Move without behavior change? | Dependencies | Risk |
|---|---:|---:|---|---|---|---:|
| State and defaults | 37-71 | 35 | Provider state, shared default settings, debounce state, `isSaving`, restore-defaults action | Mostly. Default construction and `isSaving` are candidates for a pure helper; state setters must remain in a hook/provider. | React state, `DEFAULT_SETTINGS`, `useDebounce`, toast for restore | 3 |
| Load/hydration | 72-134 | 63 | Timeout, init, local-storage migration, students/settings reads, stale-attempt protection, hydration status | Not as a casual move. It can become a dedicated hook only with the same attempt, timeout, and late-resolution guards. | IndexedDB, migration, React state, timeout refs | 5 |
| Persistence and guards | 135-194 | 60 | Debounced student/settings writes, heartbeat, retry, Start Fresh, suspend/resume, persistent-storage/data-loss checks | Persistence effects can move to a hook, but only with the same dependencies and refs. | IndexedDB, heartbeat, load status, debounce values, sessionStorage, toast | 5 |
| Student actions | 196-318 | 123 | Add/delete/undo, pending deletion, update, score clearing, photo removal, class rename | Most handlers can move to a domain hook; undo/toast and current-state dependencies must remain equivalent. | Students setter/state, settings for add analytics, toast, PostHog | 3 |
| Component sync and mismatch detection | 319-481 | 163 | Detect settings/student component drift and synchronize component instances/scores | Yes as a domain hook or pure functions, after explicitly passing settings/students and setters. | Students/settings, `crypto.randomUUID`, toast | 4 |
| Demo data | 482-701 | 220 | Randomized demo subjects, component scores, ten demo students, analytics event | Pure generation can move; the action still needs settings, student setter, toast, and PostHog. | Settings, `crypto.randomUUID`, `Math.random`, toast, PostHog | 3 |
| Remarks | 714-779 | 66 | Batch remark generation, attendance rating, progress callbacks, persistence through student state, analytics | Generation can move to a pure function; orchestration remains stateful. | Students/settings, remark utilities, toast, PostHog, callback queueing | 4 |
| Derived data | 702-712 | 11 | Duplicate-name check and processed students with positions | `processedStudents` is a good pure selector/useMemo hook; duplicate-name check is a small selector. | Students/settings level, grade calculator | 2 |
| Context value | 780-824 | 45 | Public API assembly and Start Fresh confirmation modal | Provider assembly must remain, but the value object can be factored into a named builder only if function identity and dependencies are preserved. | Every action/state value, `ConfirmModal` | 4 |

Line counts are inclusive and include comments/blank lines in each range.

## Duplicated logic and constants

| Finding | Evidence | Impact |
|---|---|---|
| Default settings have a shared constant plus a factory-reset extension | [`defaultSettings.ts`](../src/constants/defaultSettings.ts#L4) defines `DEFAULT_SETTINGS`; [`SchoolContext.tsx`](../src/context/SchoolContext.tsx#L60) spreads it and adds `examType`, `componentLibrary`, and `subjectComponentMap` for reset. | This is intentional variation, but future default fields must be checked in both the base default and reset result. |
| `startFresh` calls `restoreDefaults` and separately clears students/status | [`SchoolContext.tsx`](../src/context/SchoolContext.tsx#L165) | This is a coordinated flow, not a duplicate implementation. Moving either half independently could break the load-error recovery contract. |
| Student score clearing is duplicated for all students and one student | [`SchoolContext.tsx`](../src/context/SchoolContext.tsx#L252), [`SchoolContext.tsx`](../src/context/SchoolContext.tsx#L273) | A shared pure `clearSubjectScores` helper could reduce duplication, but it is not required for extraction. |
| Component settings are traversed in both mismatch detection and synchronization | [`SchoolContext.tsx`](../src/context/SchoolContext.tsx#L323), [`SchoolContext.tsx`](../src/context/SchoolContext.tsx#L371) | The operations have different outputs and should not be merged without tests for missing, outdated, and removed components. |
| The demo generator and remark generator both update all students in one batch | [`SchoolContext.tsx`](../src/context/SchoolContext.tsx#L482), [`SchoolContext.tsx`](../src/context/SchoolContext.tsx#L714) | Both rely on one state replacement and debounce persistence; splitting them must preserve atomic user-visible updates. |

## Extraction assessment and existing test coverage

| Area | Safe extraction shape | Tests that exercise it | Main risk |
|---|---|---|---|
| Defaults and selectors | Pure constants/selectors | [`SettingsColdStart.test.tsx`](../src/test/SettingsColdStart.test.tsx#L1), [`AppAutoLock.test.tsx`](../src/test/AppAutoLock.test.tsx#L1) | Defaults can accidentally diverge from reset behavior. |
| Student actions | `useStudentActions` hook receiving state/setters and side-effect services | [`SettingsColdStart.test.tsx`](../src/test/SettingsColdStart.test.tsx#L117), [`DataBackup.test.tsx`](../src/test/DataBackup.test.tsx#L1), [`StudentCRUD.test.tsx`](../src/test/StudentCRUD.test.tsx#L1) | Toast text, silent flags, undo behavior, and PostHog event conditions. |
| Component sync | Pure comparison/sync functions plus a thin stateful hook | [`SettingsColdStart.test.tsx`](../src/test/SettingsColdStart.test.tsx#L1), [`SettingsIntegration.test.tsx`](../src/test/SettingsIntegration.test.tsx#L1) | Score conversion, generated component IDs, and settings-dependent max scores. |
| Demo generation | Pure `createDemoStudents(settings, random, uuid)` plus action wrapper | [`SettingsColdStart.test.tsx`](../src/test/SettingsColdStart.test.tsx#L1) | Random ranges, component assignments, and `Loaded_Demo_Data` analytics. |
| Remarks | Pure batch generator plus stateful progress/toast wrapper | No dedicated remarks test was found; [`SchoolContext.tsx`](../src/context/SchoolContext.tsx#L774) captures the event. | Remark uniqueness, attendance fallback, and progress callback timing. |
| Derived processing | Pure selector/hook | [`gradeCalculator.test.ts`](../src/test/gradeCalculator.test.ts#L1) | Position assignment order and settings level dependency. |
| Load/hydration | Dedicated hook only after characterization tests | [`SettingsColdStart.test.tsx`](../src/test/SettingsColdStart.test.tsx#L200), [`DataBackup.test.tsx`](../src/test/DataBackup.test.tsx#L1) | Highest risk: cold start, timeout, late promise resolution, migration, and default-write prevention. |
| Persistence | Dedicated persistence hook only after characterization tests | [`SettingsColdStart.test.tsx`](../src/test/SettingsColdStart.test.tsx#L200), [`DataBackup.test.tsx`](../src/test/DataBackup.test.tsx#L200) | Highest risk: debounces, per-key error gates, heartbeat, and import suspension. |

## Required extraction order

1. Extract pure score-clearing and duplicate-name helpers. This has low state risk and can be covered with focused unit tests.
2. Extract pure processed-student and mismatch comparison helpers, keeping the provider callbacks unchanged.
3. Extract demo data construction behind injected settings/random/UUID inputs; leave the action and side effects in the provider.
4. Extract remarks generation as a pure batch function; leave progress scheduling, toast, state replacement, and PostHog capture in the provider.
5. Extract student action handlers into a hook that receives setters, current students, settings, toast, and analytics.
6. Only after the existing cold-start/persistence tests are green, extract hydration into a hook without changing attempt IDs, timeout behavior, or late-result rejection.
7. Only after hydration is characterized, extract persistence effects and suspension into a hook. Keep per-key error checks, debounce identity guards, and backup heartbeat conditions exactly equivalent.
8. Finally simplify provider assembly/context value wiring; do not combine this with a behavioral change.

The load/hydration and persistence sections **must not be touched without the SettingsColdStart coverage** for pending load, seeded hydration, post-load edits, read failure, timeout, retry, and default-write prevention. `suspendPersistence`/`resumePersistence` must remain coordinated with DataBackup’s first import write and reload overlay; their semantics must not change.

## Context member consumers

The public members are declared in [`SchoolContextDefinition.ts`](../src/context/SchoolContextDefinition.ts#L7). Consumers below use `useSchoolData` unless noted.

| Context member(s) | Consumers |
|---|---|
| `students`, `settings` | [`Dashboard.tsx`](../src/pages/Dashboard.tsx#L26), [`Settings.tsx`](../src/pages/Settings.tsx#L58), [`PrintPreview.tsx`](../src/pages/PrintPreview.tsx#L12), [`Analytics.tsx`](../src/pages/Analytics.tsx#L67), [`StudentList.tsx`](../src/components/StudentList.tsx#L26), [`DetailsTab.tsx`](../src/components/tabs/DetailsTab.tsx#L19), [`AcademicTab.tsx`](../src/components/tabs/AcademicTab.tsx#L21), [`BulkImportModal.tsx`](../src/components/BulkImportModal.tsx#L17), [`StorageMonitor.tsx`](../src/components/StorageMonitor.tsx#L12), [`DataBackup.tsx`](../src/components/DataBackup.tsx#L37), [`App.tsx`](../src/App.tsx#L23) |
| `setSettings`, `updateClassNameForAll`, `restoreDefaults`, `isSaving`, `lastSaved` | [`Settings.tsx`](../src/pages/Settings.tsx#L58) |
| Student CRUD/actions: `addStudent`, `deleteStudent`, `updateStudent`, `loadDemoData`, `deletePendingStudents`, `autoGenerateRemarks`, `clearAllScores` | [`Dashboard.tsx`](../src/pages/Dashboard.tsx#L26) |
| `clearStudentScores`, `detectComponentMismatches`, `syncSubjectComponentsFromSettings` | [`AcademicTab.tsx`](../src/components/tabs/AcademicTab.tsx#L21) |
| `removeAllStudentPhotos` | [`StorageMonitor.tsx`](../src/components/StorageMonitor.tsx#L12) |
| `addStudent`, `settings` | [`BulkImportModal.tsx`](../src/components/BulkImportModal.tsx#L17); the import passes `silent=true` at [`BulkImportModal.tsx`](../src/components/BulkImportModal.tsx#L56) |
| `loadError`, `suspendPersistence`, `resumePersistence` | [`DataBackup.tsx`](../src/components/DataBackup.tsx#L37) |
| `isDataLoaded`, `loadError`, `retryLoad`, `startFresh` | [`DataGate.tsx`](../src/components/DataGate.tsx#L12) |
| `settings` | [`App.tsx`](../src/App.tsx#L23), [`StudentList.tsx`](../src/components/StudentList.tsx#L26), [`DetailsTab.tsx`](../src/components/tabs/DetailsTab.tsx#L19), [`AcademicTab.tsx`](../src/components/tabs/AcademicTab.tsx#L21) |
| `isSaving`, `lastSaved` | Provider values are consumed by [`Dashboard.tsx`](../src/pages/Dashboard.tsx#L334) and [`Settings.tsx`](../src/pages/Settings.tsx#L1406), which pass them to [`AutoSaveIndicator.tsx`](../src/components/AutoSaveIndicator.tsx#L10). |
| `loadStatus` | No non-provider runtime consumer was found; it is exposed in the context type and value but only the provider uses it to gate persistence. |
| `restoreDefaults` | Settings invokes it from the factory-reset flow at [`Settings.tsx`](../src/pages/Settings.tsx#L1368). |
| `checkDuplicateName` | No runtime consumer was found outside the provider; it is exposed but not currently called by a page/component. |
| `updateClassNameForAll` | Settings invokes it after the class-name confirmation at [`Settings.tsx`](../src/pages/Settings.tsx#L329). |
| `autoGenerateRemarks` | Dashboard invokes it from the toolbar flow at [`Dashboard.tsx`](../src/pages/Dashboard.tsx#L203). |
| Context provider itself | [`App.tsx`](../src/App.tsx#L154) wraps the application; tests mount it directly in [`SettingsColdStart.test.tsx`](../src/test/SettingsColdStart.test.tsx#L41). |

## Constraints for future work

- Do not change storage keys, schemas, backup format, or the meaning of `isDataLoaded`/`loadError`.
- Do not move `setSettings` or student setters away from the hydration/persistence guards until tests prove no default or transient state can be saved.
- Keep `suspendPersistence` active through successful import until the reload overlay completes.
- Preserve PostHog event names and properties for `Added_Student`, `Loaded_Demo_Data`, and `Auto_Remarks_Generated`.
- Prefer pure extraction with explicit inputs before introducing new context layers or changing provider ownership.

## Summary for reviewer

- SchoolContext combines state, hydration, persistence, actions, derived data, and UI confirmation.
- Hydration and persistence are the highest-risk extraction areas.
- Student actions and pure derived helpers are lower-risk first steps.
- Default settings are centralized, with reset-specific fields added in the provider.
- Existing tests cover cold start, backup flow, and auto-lock, but remarks lack dedicated tests.
- Every context member’s runtime consumer is listed above.
- No SchoolContext code or data-safety behavior was changed for this analysis.
