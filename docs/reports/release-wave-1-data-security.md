# Wave 1 Report: Data Safety, Backup/Encryption, Sync & PIN Security (`fix/release-data-security`)

## What Changed

- **IDB Media Blob Cache & Atomic Storage (`src/utils/idbStorage.ts`):**
  - Attached module-level BroadcastChannel cache invalidation (`clearBlobCacheForKeys`) and unreferenced/missing blob eviction inside `hydrateValueFromMediaStore` so stale cross-tab `blobMemoryCache` entries never create dangling `idb-blob://` pointers.
  - Replaced `put("test", "idb_test")` + `delete` in `initStorage()` with a read-only `get(STORE_NAME, "idb_test")` probe and added `hasMigratedToIndexedDB()` (`repota_idb_migrated === "v2"`) so quota-full / migrated devices surface recovery UI rather than silently booting empty `localStorage`.
  - Consolidated `loadFromStorageResult()` into a single atomic `readonly` `[app-data, media-blobs]` transaction and exported `flushStorageWriteQueue()`.
- **Storage Lifecycle & Draft Sync (`src/context/school/useSchoolStorageLifecycle.ts`, `src/context/SettingsFormContext.tsx`):**
  - Caught `StorageBatchRollbackError` in `flushPendingWrites`, `startFresh`, and `resetAllAppData`, triggering `markIncompleteRollback()` and preserving suspension.
  - Added monotonic `syncSeqRef` and local write-sequence checks to BroadcastChannel sync hydration to drop stale out-of-order reads.
  - Added external `settings` reconciliation (`syncCommittedSettings`) and `pagehide`/`visibilitychange` draft flushing in `SettingsFormContext`.
- **Backup, Crypto & Data Protection (`src/components/DataBackup.tsx`, `src/utils/fileEncryption.ts`, `src/utils/dataProtection.ts`):**
  - Checked `flushPendingWrites()` return value during `handleExport`, falling back cleanly to live in-memory snapshot export with toast notice if storage fails; drained `flushStorageWriteQueue()` on import; called `setUnsavedChanges(false)` before reload; cleared timeout ref on unmount; surfaced specific file parse/decryption errors.
  - Fixed `decryptBackupFile` error classification (`requiresPassword` guard before wrong-password mapping, preserved password-required error) and passed `salt as BufferSource` in `deriveKey`.
  - Wrapped `localStorage` access in `dataProtection.ts` in `try/catch`.
- **PIN Security & LockScreen (`src/utils/pinSecurity.ts`, `src/App.tsx`, `src/components/PinRecovery.tsx`, `src/components/PinSetup.tsx`, `src/components/LockScreen.tsx`):**
  - Guarded legacy SHA-256 → PBKDF2 `localStorage.setItem` upgrades against quota errors; emitted `PIN_CONFIG_CHANGED_EVENT` on setup/disable/reset so `AppContent` arms `useIdleTimer` immediately without page reload.
  - Added exponential `app_recovery_lockout` throttling, removed the `Only X/3 correct` oracle, added double-submit guards in `PinRecovery`/`PinSetup`, deferred security-question persistence until after `setupPin()` succeeds, and cancelled `LockScreen`'s 100ms auto-verify timer on edit/pause/unmount.
- **Verification & Checklist:** Added `src/test/ReleaseWave1Storage.test.ts` and `src/test/ReleaseWave1SecurityAndSync.test.tsx`; updated `PinRecovery.test.tsx`, `DataBackup.test.tsx`, `AppAutoLock.test.tsx`, `FunnelAndReliabilityAnalytics.test.tsx`, and `docs/reports/release-hardening-plan.md`.

## Why

Resolves every P0/P1 persistence, cross-tab media cache, quota fallback, backup fidelity, PIN upgrade lockout, idle-lock arming, and PIN recovery oracle defect found in the pre-`main` adversarial audit of `feat/navigation-shell`.

## What Was Verified

- `npm run lint` — passed (`eslint .`, exit `0`).
- `npx tsc -b` — passed (exit `0`).
- `npx vitest run --maxWorkers=2` — `61` test files passed, `565` tests passed (`0` failed/skipped).
- `npm run build` — succeeded in `16.37s` (`60` PWA precache entries).
- `npm run test:e2e` — `9/9` Playwright Chromium E2E tests passed (`44.7s`).

## What Could Not Be Verified

- Multi-tab physical iOS Safari Jetsam/storage-quota eviction on device (storage quota paths verified via unit-level `Storage.prototype.setItem` / `openDB` rejection mocks).

## Summary for reviewer

- Fixed cross-tab `blobMemoryCache` invalidation, read-only IDB startup probing, migrated-device fallback refusal, and atomic single-tx media reads in `src/utils/idbStorage.ts`.
- Escalated `StorageBatchRollbackError` via `markIncompleteRollback()` and sequenced BroadcastChannel hydration in `useSchoolStorageLifecycle.ts`.
- Synced external `settings` into `SettingsFormContext`, flushed drafts on `pagehide`/`visibilitychange`, and exported in-memory snapshots in `DataBackup` when storage writes fail.
- Fixed `fileEncryption.ts` app-sealed vs password error mapping and guarded `dataProtection.ts` storage writes.
- Hardened `pinSecurity.ts`/`PinRecovery`/`PinSetup`/`LockScreen`/`App.tsx` (quota-safe PIN upgrade, reactive idle timer event, recovery exponential lockout, oracle removal, timer cleanup).
- Verified with `lint`, `tsc -b`, Vitest (`61` files, `565` tests), `npm run build`, and Playwright (`9/9` E2E).
