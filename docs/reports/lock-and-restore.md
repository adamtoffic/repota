# Lock and restore reliability

## Goal 1: auto-lock timeout

App now reads `settings.autoLockTimeout` from the existing `SchoolContext` instead of reading the unrelated `"app-data"` record. The provider already owns the loaded settings, so keeping App’s shell inside `SchoolProvider` gives the idle timer the current value and lets the timer effect react to changes without a reload. Missing values use five minutes.

Tests cover a saved 12-minute value, the five-minute default, and changing the value from 12 to 2 minutes without remounting App.

Validation:

- `npm run lint` — passed
- `npx tsc -b` — passed
- `npm test -- --run` — passed (15 files, 191 tests)
