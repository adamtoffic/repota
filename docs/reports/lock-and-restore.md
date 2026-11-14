# Lock and restore reliability

## Goal 1: auto-lock timeout

App now reads `settings.autoLockTimeout` from the existing `SchoolContext` instead of reading the unrelated `"app-data"` record. The provider already owns the loaded settings, so keeping App’s shell inside `SchoolProvider` gives the idle timer the current value and lets the timer effect react to changes without a reload. Missing values use five minutes.

Tests cover a saved 12-minute value, the five-minute default, and changing the value from 12 to 2 minutes without remounting App.

Validation:

- `npm run lint` — passed
- `npx tsc -b` — passed
- `npm test -- --run` — passed (15 files, 191 tests)

## Goal 2: lock suppression during transient hiding and print

The visibility handler now records when the document becomes hidden and only locks a PIN-protected app when it returns after at least 30 seconds. Print starts are signaled immediately before `window.print()` from Print Preview and the shared print helper. App suppresses visibility locking until the named two-minute timeout (`PRINT_LOCK_SUPPRESSION_MS`) expires, with no `afterprint` handler (noting the remaining window risk).

Tests use fake timers and mocked visibility for the under-30-second grace period, the 30-second lock, active print suppression, and timeout expiry.

Manual verification:

1. Installed iPhone PWA: configure a PIN and biometric unlock, open a report, tap Print, allow the print sheet, return to the app, and verify it does not immediately show LockScreen. Background the PWA for less than 30 seconds and return; verify it remains unlocked. Background it for at least 30 seconds and return; verify it locks. Repeat after Face ID unlock and after opening a file picker.
2. Desktop Chrome: configure a PIN, open Print Preview, click Print, cancel/close the system print dialog, and verify no immediate lock. Wait at least 2 minutes for the print lock suppression window (`PRINT_LOCK_SUPPRESSION_MS`) to expire, then switch tabs for less than 30 seconds and return; verify no lock. Leave the tab hidden for at least 30 seconds and return; verify the lock screen appears.

The repository tests cannot verify native print-dialog visibility events, iOS PWA lifecycle behavior, Face ID timing, or file-picker behavior. Those require the listed devices/browsers.

## Goal 3: backup restore compatibility

Backup validation now separates structure from content format. It rejects wrong container types, missing/non-empty IDs, missing required student fields, wrong field types, and unsupported enum values before any write. It does not reject UI-storable content such as Unicode names, one-character names, hyphenated academic years, or spaces/digits in class names; the existing strict schemas are used only to count unusual values for the import confirmation.

Imported settings are merged over the shared application defaults, so older files with omitted optional settings remain loadable without changing stored keys or the backup format. The existing atomic write and rollback path remains in use, and encrypted payloads pass through the same validator after decryption.

Tests cover UI-shaped unusual values (`Ɔ`, `ɛ`, `2025-2026`, `Basic Science 2`, and a one-character name), structural rejection before writes, default merging, round-trip export validation, duplicate IDs, and encrypted-path validation reuse.

## Summary for reviewer

- Saved auto-lock settings now drive App immediately, with a five-minute fallback.
- Visibility locking has a 30-second return grace period.
- Print suppresses visibility locking until the two-minute timeout expires rather than on afterprint.
- Backup restore separates structural rejection from unusual-content warnings.
- Older backups merge missing settings over shared defaults.
- All 15 test files and 198 tests pass; lint and TypeScript build pass.
- Native iOS PWA and system print lifecycle behavior remain device-only checks.
