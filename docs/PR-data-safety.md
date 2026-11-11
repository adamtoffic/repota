# Data-safety PR review

Compared with `main`, the current branch is `fix/lock-backup-reliability`. The branch contains 29 commits. The working tree already had unrelated changes before this read-only review: `.gitignore`, an untracked `dev-dist/` directory, and `docs/reports/task-2g.md`; none were modified.

## Commit inventory by theme

### Data safety

| Hash | Message |
|---|---|
| `dd3a73b` | fix: enhance storage loading functions to return detailed status results |
| `6d77323` | fix: wrap components in DataGate for improved data handling |
| `5bad1be` | feat: add DataGate component for improved data loading and error handling |
| `31bb5c9` | fix: enhance SchoolProvider with improved data loading and error handling |
| `634b512` | fix: enhance SchoolContextType with additional load status and error handling properties |
| `1acc4d3` | fix: improve class name handling and modal behavior in settings |
| `3d9bf98` | fix: improve cancel button handling and escape key behavior in ConfirmModal |
| `a402bfc` | refactor: restructure Settings component to separate SettingsContent function |

### Backup and restore

| Hash | Message |
|---|---|
| `8383a97` | feat: implement backup validation and import functionality |
| `11548c5` | fix: enhance DataBackup component with improved error handling and validation for backup operations |
| `2f1c0f6` | fix: make backup restore compatible with app data |

### Lock and print

| Hash | Message |
|---|---|
| `b4022fe` | refactor: reorganize biometric prompt and input focus logic for improved clarity |
| `d2a0a7b` | fix: apply saved auto-lock timeout |
| `5dd96b3` | fix: prevent relock during print and transient hiding |

### PostHog privacy

| Hash | Message |
|---|---|
| `4a23852` | fix: harden PostHog data masking |

### Tests

| Hash | Message |
|---|---|
| `c7b2f6c` | test: add SettingsColdStart tests for initial load and persistence behavior |
| `6b7d4cb` | test: add comprehensive DataBackup tests for backup functionality and error handling |

### Documentation

| Hash | Message |
|---|---|
| `1ceb5a6` | Add architecture and codebase inventory documentation |
| `6e2c6a0` | feat: add settings page split analysis documentation |
| `cf2c8aa` | docs: add guidelines for task rules and documentation requirements |
| `336b58c` | feat: add ground truth audit documentation with key findings and analysis |
| `4638da2` | docs: complete lock and restore report |

### Chore and supporting fixes

| Hash | Message |
|---|---|
| `bcb61ad` | chore: update eslint and related dependencies to latest versions |
| `c7653c7` | fix: improve manual chunking configuration in Vite for better code splitting |
| `232109c` | fix: specify type for success variable in PinRecovery component |
| `7252fa3` | fix: specify type for ageRange variable in calculatePerformanceByAge function |
| `cc04600` | fix: enhance error handling in encryption and decryption functions |
| `9afc80f` | fix: specify type for pool variable in generateHeadmasterRemark function |
| `8b8868d` | perf: defer developer image precaching |
| `7124574` | chore: remove redundant Vercel Analytics |

## Diff and PR hygiene

`git diff --stat main..HEAD` reports 37 changed paths, 5,415 insertions, and 12,918 deletions. The large deletion count is mostly historical `dev-dist` generated service-worker files and dependency-lockfile churn.

These branch-diff paths should **not** be included in a PR:

| Path | Reason |
|---|---|
| `dev-dist/registerSW.js` | Generated development service-worker output; deleted by the branch. |
| `dev-dist/sw.js` | Generated development service-worker output; deleted by the branch. |
| `dev-dist/workbox-80c8c1d8.js` | Generated Workbox output; deleted by the branch. |
| `dev-dist/workbox-ca84f546.js` | Generated Workbox output; deleted by the branch. |

No `.env` files, backup/export files, images, PDFs, CSVs, JSON data fixtures, `dist/`, `stats.html`, or large binary files were found in `main..HEAD`. `package-lock.json` is large textual dependency metadata, not student data; its churn should nevertheless be reviewed separately.

The current untracked `dev-dist/` and `docs/reports/task-2g.md` are pre-existing worktree items and were not staged or changed. The production build created ignored `dist/` output only.

## Validation

| Command | Result |
|---|---|
| `npm run lint` | Passed |
| `npx tsc -b` | Passed |
| `npm test -- --run` | Passed: 16 files, 199 tests |
| `npm run build` | Passed: Vite production build and PWA generation completed |
| Post-build tracked-change check | No change from the pre-build tracked worktree state |

The build emitted existing/non-blocking warnings: Zod pure-annotation comments were removed by Rollup, and some chunks exceeded the configured 400 kB warning threshold.

## What changed and why

- IndexedDB hydration now distinguishes empty data from read failure, gates editable pages until loading completes, and prevents defaults or edits from overwriting data while loading has failed.
- DataBackup validates structure before writing, supports recovery from the load-error screen, performs rollback on a failed second write, and accepts app-generated content while warning about unusual values.
- Auto-lock now follows the saved Settings timeout. Returning from a short background/print transition does not immediately lock the app.
- PostHog remains enabled with text, element-attribute, input, and session-replay masking; report images are blocked from replay. Redundant Vercel Analytics was removed.
- The developer profile image was removed from PWA upfront precaching so it does not delay installation.

## Risk areas

- **Startup persistence guards:** incorrect hydration ordering could still save transient defaults or empty student state if future persistence paths bypass the provider guards.
- **Load-error gating:** users must retry, start fresh, or restore a backup before editing gated pages; recovery import intentionally writes directly and then requires reload.
- **Import validation:** structural checks protect writes, while content-format anomalies are warnings; old files with unexpected structure can still be rejected.
- **Lock grace period:** the 30-second hidden-page grace and print suppression reduce false locks but depend on native lifecycle events on iOS.
- **PostHog masking:** configuration masks ordinary text and attributes, masks inputs, and blocks images; replay behavior should be checked with DEMO data, not real student records.

## Vercel preview manual test plan

Use DEMO data only. Do not enter real student names, scores, photos, school identifiers, or backup files.

1. **Reload persistence:** open the Vercel preview, load or create DEMO data, edit a school name and a score, wait for autosave, reload, and confirm both edits remain.
2. **Load-error recovery:** simulate IndexedDB read failure in a test build or browser environment, confirm the load-error screen appears, choose the recovery import control, load a DEMO backup, confirm the incoming school and student count, and verify the app reloads with the restored data.
3. **Export/import round-trip:** export DEMO data, confirm the file is generated, import that same file, confirm the replacement count, reload, and verify the students/settings match.
4. **Class-name modal:** with DEMO students present, edit the class name, confirm the modal appears, choose “No, keep old name” and verify the edit remains pending without losing other edits; repeat and choose the confirm path.
5. **Installed iPhone PWA print:** install the preview to the iPhone Home Screen, open Print, tap Print, and verify the print/share flow does not immediately show LockScreen or enter a relock loop after returning. Compare with the same flow in Safari. Native iOS print behavior is not covered by automated tests.
6. **PostHog replay masking:** using DEMO data only, trigger navigation, form edits, and Print Preview. In PostHog, verify visible text is masked unless explicitly opted in with `data-record="true"`, input values are masked, and report/student images are blocked. Do not inspect or upload real personal data.

## Summary for reviewer

- Data loading failures no longer look like empty data and overwrite saved state.
- Gated routes provide retry, start-fresh, and backup recovery paths.
- Backup import is structurally validated and rollback-protected.
- Auto-lock follows Settings and avoids immediate print/background relocks.
- PostHog replay masking and image blocking are configured and tested.
- Vercel Analytics was removed as redundant.
- Lint, TypeScript, 199 tests, and production build passed.
- Generated `dev-dist` deletions should be excluded from the PR.
