# Architecture

This document synthesizes the architecture evident in the current browser application. The statements below are grounded in source files and runtime logic. Where the code suggests a design intention but does not state it explicitly in comments or API contracts, the decision is marked as INFERRED rather than confirmed.

## 1. System scope and runtime model

The app is a browser-only, PWA-style client for generating GES-aligned report cards. The runtime is assembled in `src/main.tsx:1-21`, which initializes PostHog with localStorage persistence and renders the app root. The app shell is composed in `src/App.tsx:16-118`, where the router is wrapped in `SchoolProvider` and a PIN lock flow is enforced for the app session.

The overall architecture is not server-backed by default. The API configuration defaults to local-only mode in `src/api/config.ts:6-16`, and the HTTP client explicitly rejects backend calls in local mode in `src/api/client.ts:104-165`. The app therefore treats the browser as the authoritative runtime environment for data creation, processing, and presentation.

## 2. High-level data flow: user input → SchoolContext → local storage → report generation → export

### 2.1 User input and state capture

The authoritative application state is held in `SchoolProvider` in `src/context/SchoolContext.tsx:32-67`. The provider owns `students` and `settings`, exposes `useSchoolData()` via `src/hooks/useSchoolData.ts:1-12`, and exposes mutators such as `addStudent`, `updateStudent`, `deleteStudent`, `clearAllScores`, and `setSettings` in `src/context/SchoolContext.tsx:170-247` and subsequent sections.

The data contracts are defined in `src/types/index.ts:18-139`. `StudentRecord` includes subject arrays, demographics, attendance, and optional photo metadata; `SchoolSettings` includes academic year, term, level, subject lists, class metadata, and template configuration. These contracts anchor all UI, storage, and printing logic.

### 2.2 Persistence boundary

The persistence boundary is implemented in `src/utils/idbStorage.ts:11-233`.

- `IDB_KEYS` defines the primary keys: `ges_v1_students` and `ges_v1_settings` (`src/utils/idbStorage.ts:16-19`).
- `initStorage()` opens the `repota-storage` IndexedDB database and object store (`src/utils/idbStorage.ts:62-78`).
- `saveToStorage()` writes to IndexedDB when available and falls back to `localStorage` otherwise (`src/utils/idbStorage.ts:83-109`).
- `loadFromStorage()` reads the same keys back (`src/utils/idbStorage.ts:114-129`).
- `migrateFromLocalStorage()` moves legacy localStorage values into IndexedDB (`src/utils/idbStorage.ts:176-233`).

A compatibility wrapper also exists in `src/utils/storage.ts:1-38`, which keeps the older localStorage key names and guards writes against quota errors. The app therefore explicitly distinguishes between a modern IndexedDB-first flow and a constrained localStorage fallback.

### 2.3 Auto-save lifecycle

`SchoolProvider` loads data and then starts auto-save once the initial load is complete:

- Initial storage initialization and migration happen in `src/context/SchoolContext.tsx:104-138`.
- `students` and `settings` are then persisted through debounced writes in `src/context/SchoolContext.tsx:140-154`.
- The data-loss heartbeat is created in the same save path via `createBackupHeartbeat()` (`src/context/SchoolContext.tsx:143-145`, `src/utils/dataProtection.ts:38-48`).

This is a local, near-real-time persistence model: the provider keeps the current state in memory and writes a debounced snapshot to the browser store without a backend database or synchronization layer.

### 2.4 Report preparation and grade calculation

Raw stored data is not the same as final report data. It is processed into a display-ready form using `src/utils/gradeCalculator.ts:10-228`.

The flow is:

- `processStudent()` computes total subject marks, average score, derived grade/remark, aggregate, and provisional class position (`src/utils/gradeCalculator.ts:186-228`).
- `calculateGrade()` applies the level-specific grade scale (`KG`, `PRIMARY`, `JHS`, `SHS`) via the threshold tables in `src/utils/gradeCalculator.ts:28-64`.
- `calculateAggregate()` computes school-level aggregate logic by classifying core vs. elective subjects and ranking them by grade number (`src/utils/gradeCalculator.ts:66-183`).
- `assignPositions()` sorts students by average and assigns class rank (`src/utils/gradeCalculator.ts:230-308`, not fully shown in the earlier read but part of the same module).

The report pipeline is then triggered by route-level rendering in `src/pages/PrintPreview.tsx:10-88`, which loads students/settings from `useSchoolData()`, picks the relevant report template via the registry in `src/templates/registry.ts:8-40`, and executes `window.print()` when the user clicks print.

### 2.5 Template rendering and export

The template system is separated from the grade logic. `src/templates/registry.ts:8-40` maps template IDs to React components, and `src/templates/OriginalTemplate.tsx:5-52` demonstrates the rendered page model: school branding, student metadata, subject table, teacher/headmaster remarks, signature blocks, and print-mode styling.

Export paths are browser-native rather than server-backed:

- CSV export is generated in `src/utils/export.ts:3-75` by turning processed student data into a downloadable CSV.
- Backup/export is implemented in `src/components/DataBackup.tsx:58-135` and `src/components/DataBackup.tsx:175-220`. It reads data from IndexedDB, optionally encrypts the payload with a password, then triggers a file download.
- Import accepts plain JSON or encrypted `.repota` files and writes the restored `students`/`settings` objects back into storage using the same storage keys (`src/components/DataBackup.tsx:138-220`).

Thus the flow is explicitly: user input -> central state -> local IDB/localStorage -> report preparation -> browser print or file export.

## 3. Offline-first strategy

### 3.1 What the app does with no connectivity

The app is intentionally designed to continue functioning without a network connection.

- `src/api/config.ts:8-16` sets the default mode to `local` and explicitly describes the app as offline-first.
- `src/api/client.ts:104-165` disables backend calls in local mode by throwing `LOCAL_MODE` before any network request is made.
- `src/components/OfflineDetector.tsx:11-67` listens for `online` and `offline` browser events and shows status toasts, but the app does not block editing or report generation when the browser is offline.
- `vite.config.ts:28-153` configures `vite-plugin-pwa` to precache assets and provide offline navigation fallback with a service worker, including `navigateFallback: "/index.html"` and runtime caching for JS/CSS/image assets.

The evidence therefore supports a local-first runtime: the browser can use cached resources and local data even when the network is absent.

### 3.2 What queues or syncs when offline

There is no active multi-device synchronization queue for the main app data model.

- The app’s main data store is local browser storage, not a remote database (`src/utils/idbStorage.ts:83-109`, `src/context/SchoolContext.tsx:140-154`).
- `src/api/analyticsApi.ts:28-72` shows an offline event queue only for a hypothetical backend mode; in local mode it simply logs the event and exits without queueing or sync (`src/api/analyticsApi.ts:32-42`, `src/api/analyticsApi.ts:54-71`).
- `src/main.tsx:8-14` configures PostHog with `persistence: "localStorage"`, which allows analytics events to be queued locally when the app is offline, but this is not the school-data sync path.

In practical terms, the offline-first behavior is: keep the authoritative state on-device, avoid server dependency, and use browser-side caches plus optional export/import for portability. There is no evidence of a server-initiated sync pipeline for teacher data in the default runtime.

### 3.3 How data-loss detection works end to end

The data-loss protection logic is defined in `src/utils/dataProtection.ts:7-104` and is invoked from `SchoolProvider` (`src/context/SchoolContext.tsx:156-168`).

The end-to-end mechanism is:

1. `createBackupHeartbeat()` writes `repota_backup_check` and marks `repota_had_data` as `"true"` (`src/utils/dataProtection.ts:38-48`).
2. `SchoolProvider` calls `createBackupHeartbeat()` after each debounced save (`src/context/SchoolContext.tsx:143-145`).
3. `detectDataLoss()` checks whether the app previously had data and whether the student/settings storage keys are now missing while the backup check exists (`src/utils/dataProtection.ts:17-31`).
4. If the browser or a cleaner app appears to have wiped storage, `SchoolProvider` surfaces a warning toast (`src/context/SchoolContext.tsx:156-168`).
5. `requestPersistentStorage()` and `checkStoragePersistence()` ask the browser to keep storage persistent when supported (`src/utils/dataProtection.ts:68-104`).

This is a browser-local data-integrity mechanism, not a server backup system. It is designed to catch local storage loss on mobile devices and prompt the user to restore from backup.

## 4. Grading system: level-specific scales and component weighting

### 4.1 Level-specific grade scales

The level-specific grade system is declared in the type model (`src/types/index.ts:1-15`) and implemented in `src/utils/gradeCalculator.ts:10-64`.

- `KG`: `GOLD`, `SILVER`, `BRONZE` with thresholds at 80 and 60 (`src/utils/gradeCalculator.ts:28-31`).
- `PRIMARY`: numeric grades `1..5` with thresholds at 80, 75, 70, 65 (`src/utils/gradeCalculator.ts:34-39`).
- `JHS`: numeric grades `1..9` with thresholds at 90, 80, 70, 60, 55, 50, 40, 35 (`src/utils/gradeCalculator.ts:42-51`).
- `SHS`: WASSCE-style grades `A1..F9` with thresholds approximating Ghanaian grade boundaries (`src/utils/gradeCalculator.ts:54-63`).

`calculateGrade(total, level)` dispatches to the level-appropriate function (`src/utils/gradeCalculator.ts:10-25`), and `processStudent()` applies the chosen grade to each subject record (`src/utils/gradeCalculator.ts:186-200`).

### 4.2 Aggregate and ranking logic

The aggregate algorithm is defined in `calculateAggregate()` (`src/utils/gradeCalculator.ts:112-183`). It separates core and elective subjects via `isCoreSubject()` (`src/utils/gradeCalculator.ts:66-91`) and then adds graded points based on school level:

- `PRIMARY`: counts core subjects (English/Math/Science) and adds the best three electives (`src/utils/gradeCalculator.ts:126-143`).
- `JHS`: counts core subjects and adds the best two electives (`src/utils/gradeCalculator.ts:146-158`).
- `SHS`: selects English and Math as mandatory core contributors, adds the best third core, then adds the best three electives (`src/utils/gradeCalculator.ts:161-180`).

`assignPositions()` then sorts students by average performance and assigns class positions (`src/utils/gradeCalculator.ts:230-308`). The result is used in report templates and ranking displays.

### 4.3 Assessment component weighting (CAT/GROUP/PROJECT/HOMEWORK)

The assessment-component model is defined in `src/types/index.ts:18-39`:

- `ClassScoreComponent` has `id`, `name`, `score`, `maxScore`, and an optional `category` (`src/types/index.ts:18-24`).
- `AssessmentCategory` is `"CAT" | "GROUP" | "PROJECT" | "HOMEWORK"` (`src/types/index.ts:26-32`).
- `SchoolSettings` includes `componentLibrary` and `subjectComponentMap` as structured metadata (`src/types/index.ts:84-89`).

The UI allows settings to define configurable component templates and assign them to subjects in `src/pages/Settings.tsx:69-73` and the component-management logic in the same file. The category choices are surfaced in the settings form as CAT, GROUP, PROJECT, and HOMEWORK (`src/pages/Settings.tsx` earlier in the same file; exact lines vary but the category enum is used throughout the form state).

The actual weighting is performed when the user edits a subject row: `SubjectRow` sums all component scores and all component maxima, calculates a percentage, and converts it to the configured class score maximum (`src/components/SubjectRow.tsx:123-149`). In other words, the class score for a subject is not a flat input alone; it is computed by:

`classScore = round((sum(actual component scores) / sum(max component scores)) * settings.classScoreMax)`

The same conversion logic is reused when syncing student subject components from settings in `src/context/SchoolContext.tsx:346-456`. There, the app reconciles the configured component library with a student’s subject data and recalculates the subject’s `classScore` whenever component metadata changes.

This is a key architectural pattern: per-assessment components are treated as a weighted sub-model that contributes to a subject’s class score, which then contributes to the aggregated total used in the grade calculation.

## 5. Security model: PIN, biometric WebAuthn, and AES-256-GCM export encryption

### 5.1 App access: PIN lock and recovery

The PIN security module is `src/utils/pinSecurity.ts:1-220`.

- `hashString()` uses `crypto.subtle.digest("SHA-256", data)` to hash the PIN and recovery data (`src/utils/pinSecurity.ts:18-24`).
- `setupPin()` stores the PIN hash and recovery hash in localStorage (`src/utils/pinSecurity.ts:34-49`).
- `verifyPin()` and `verifyRecoveryCode()` compare a newly entered value against the stored hash (`src/utils/pinSecurity.ts:58-100`).
- `disablePinLock()` removes the PIN hashes and also disables biometric authentication (`src/utils/pinSecurity.ts:128-139`).

The app-level lock screen is enforced in `src/App.tsx:17-54`: the app checks `isPinConfigured()`, starts an idle timer from the stored settings, and locks on idle or when the document becomes hidden. The lock screen and recovery modal are presented in `src/App.tsx:64-86`.

### 5.2 Device biometric: WebAuthn

The biometric path is implemented in `src/utils/biometricAuth.ts:1-238`.

- `isBiometricAvailable()` checks `window.PublicKeyCredential` and `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` (`src/utils/biometricAuth.ts:13-88`).
- `enrollBiometric()` creates a WebAuthn credential with `navigator.credentials.create(...)` and stores the credential ID in localStorage (`src/utils/biometricAuth.ts:109-169`).
- `verifyBiometric()` uses `navigator.credentials.get(...)` to authenticate with the platform authenticator (`src/utils/biometricAuth.ts:172-231`).
- `isBiometricEnrolled()` and `disableBiometric()` rely on persisted local metadata (`src/utils/biometricAuth.ts:233-238`, plus related functions in the same file).

This is a local-device security layer: the app does not authenticate users against a server; instead, it relies on the browser/OS platform authenticator and the local credential ID stored in the browser.

### 5.3 Export encryption: AES-256-GCM with PBKDF2

The export encryption is implemented in `src/utils/fileEncryption.ts:1-177`.

- The module explicitly states that it uses AES-256-GCM with password-based key derivation (PBKDF2) (`src/utils/fileEncryption.ts:2-8`).
- `deriveKey()` imports the password as a PBKDF2 key and derives an `AES-GCM` key (`src/utils/fileEncryption.ts:24-49`).
- `encryptBackupFile()` generates a random salt and IV, derives the key, encrypts the JSON payload, and returns an `EncryptedFile` object with `salt`, `iv`, and encrypted `data` (`src/utils/fileEncryption.ts:73-107`).
- `decryptBackupFile()` reconstructs the key from the password and decrypts using `crypto.subtle.decrypt({ name: "AES-GCM", ... })` (`src/utils/fileEncryption.ts:112-149`).
- `isEncryptedFile()` detects the encrypted format by checking the metadata object (`src/utils/fileEncryption.ts:151-164`).

This file-level encryption is used for backups and file sharing only; the in-browser storage remains unencrypted for performance, as noted in the module comment (`src/utils/fileEncryption.ts:2-8`). The UI calls this path from `src/components/DataBackup.tsx:58-90` during export and `src/components/DataBackup.tsx:176-208` during import.

### 5.4 How the security layers fit together

The security model is layered and intentionally local:

- PIN and recovery code protect app access at browser/device level (`src/utils/pinSecurity.ts:18-139`, `src/App.tsx:17-86`).
- Biometric WebAuthn provides an alternate unlock mechanism when the platform authenticator is available (`src/utils/biometricAuth.ts:13-231`).
- AES-256-GCM export encryption protects data when it is moved outside the browser or shared as a file (`src/utils/fileEncryption.ts:24-149`, `src/components/DataBackup.tsx:58-90`).

These are separate layers: PIN/biometric controls app access; file encryption protects exported/imported copies; neither layer makes the browser storage itself encrypted by default.

## 6. Key architectural decisions evident from the code (INFERRED, not confirmed)

The following are not explicitly stated as intentions in comments; they are inferences from how the code is organized and what runtime behaviors are required.

1. INFERRED: the system is designed around a local-first client state model rather than a server-backed data model. The evidence is the default `local` API mode (`src/api/config.ts:8-16`), central `SchoolProvider` state (`src/context/SchoolContext.tsx:32-67`), and IndexedDB persistence (`src/utils/idbStorage.ts:62-109`).

2. INFERRED: IndexedDB is the preferred authoritative storage because the app stores a large, heterogeneous dataset (students, settings, optional photos) and the code expressly contrasts IndexedDB with the smaller localStorage quota (`src/utils/idbStorage.ts:1-5`, `src/utils/idbStorage.ts:83-109`).

3. INFERRED: debounced persistence is used to reduce storage churn and improve responsiveness; this is consistent with an interactive data-entry app where many changes occur quickly (`src/context/SchoolContext.tsx:63-67`, `src/context/SchoolContext.tsx:140-154`).

4. INFERRED: the architecture assumes mobile/standalone usage as a primary context. The implementation includes PWA install prompts, offline listeners, app lock behavior, and persistent storage requests (`src/App.tsx:88-116`, `src/components/OfflineDetector.tsx:11-67`, `src/utils/dataProtection.ts:68-104`, `vite.config.ts:28-153`).

5. INFERRED: the app separates business logic from presentation so that report card templates can vary without changing the data model. The grade logic is in `src/utils/gradeCalculator.ts`; the rendering logic is in `src/templates/*` and selected through `src/templates/registry.ts:8-40`.

6. INFERRED: because the app has no server sync model in the default runtime, portability is handled by explicit backup/export rather than by an online replication mechanism. The backup workflow and encryption path are strongly oriented toward file exchange and recovery (`src/components/DataBackup.tsx:58-220`, `src/utils/fileEncryption.ts:73-149`).

## 7. Architectural summary

The application is best characterized as a local-first PWA for teacher data management and report generation. The authoritative state lives in the browser, is persisted mainly in IndexedDB, and is transformed into report-ready data using school-level grade rules and component-based class-score weighting. Report generation is local and print-driven, while portability is handled by CSV export and encrypted backup files. App access is protected locally with PINs and optional WebAuthn biometric unlock, and exported data is separately encrypted at the file layer with AES-256-GCM.

This is a browser-centric architecture with explicit offline operation and a deliberately local trust boundary, rather than a traditional client-server application.
