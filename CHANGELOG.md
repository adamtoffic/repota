# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-11-29

### Added

- Responsive navigation shell (`AppShell`) with desktop sidebar, mobile liquid-glass dock, and light/dark/system theme switching
- 7 A4 print-grade report templates (`Repota Original`, `Classic GES Plus`, `Modern Dashboard`, `University Minimal`, `Executive Crest`, `Heritage Framed`, `Editorial Scholar`) with Color and toner-saving `B&W` modes plus custom school brand colors
- Multi-task SBA markbook, Quick Gradebook single-screen score entry, and CSV/spreadsheet student & score import/export
- Expanded Analytics suite (`Overview`, `Subjects`, `Demographics`, `AI Insights`) with class pulse narratives and PDF export
- Password-encrypted `.repota` backup/restore with atomic rollback guards and isolated offline media blob storage (`idb-blob://`)
- iOS 27+ standalone PWA multi-page A4 PDF Share Sheet & print fallback with automatic `visibilitychange` watchdog
- Zero-PII, host-gated PostHog analytics and privacy-masked session replay infrastructure

### Fixed & Hardened

- Offline-first storage integrity across tabs (`BroadcastChannel` blob cache invalidation, read-only IDB probes, PBKDF2 PIN cooldowns)
- GES core subject & aggregate rules, incomplete/unscored position exclusions, and raw-to-weighted exam rounding parity
- WCAG AA keyboard/screen-reader parity (accessible file uploads, named dialogs, focus traps, `md:` toolbar breakpoints, `dvh` sizing) and HTTP security headers in `vercel.json`

### Compatibility

- Automatic zero-data-loss migration from `v1.0.0` local storage (`ges_v1_students`, `ges_v1_settings`), IndexedDB (`repota-storage`), and JSON/`.repota` backups

## [1.0.0] - 2026-02-03

### Added

- Initial public release
- GES-compliant grading system (KG, Primary, JHS, SHS)
- Offline-first PWA architecture with IndexedDB storage
- Professional A4 print-ready report cards
- Bulk student import functionality
- Smart remark generator
- Analytics dashboard with performance insights
- PIN protection with biometric unlock support
- Data backup and restore via JSON
- Support for Government, Private, and Islamic schools
- Cross-platform install prompts (Chrome, iOS Safari)
- Service worker caching for offline functionality

### Security

- No backend - all data stays on device
- Optional PIN protection
- No tracking or telemetry

[Unreleased]: https://github.com/adamtoffic/repota/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/adamtoffic/repota/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/adamtoffic/repota/releases/tag/v1.0.0
