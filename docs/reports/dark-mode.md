# Design Tokens, Obsidian Dark Mode, Frosted Scroll Navigator & Liquid Glass Mobile Nav Report

Branch: `feat/dark-mode` (branched from `feat/navigation-shell`, targeting PR #65)

## What Changed

### 1. Device-Local Theme Engine & Zero-FOUC Boot
- Updated `index.html` with `<meta name="theme-color" content="#FFFFFF" />` and a synchronous inline boot script reading `repota_theme` from `localStorage` (`"system" | "light" | "dark"`) to apply `.dark`, `color-scheme`, `dataset.theme`, and matching `theme-color` (`#FFFFFF` light / `#090C12` Obsidian dark) before first paint.
- Added `src/utils/theme.ts` (`THEME_STORAGE_KEY`, `THEME_CHANGE_EVENT`, `LIGHT_THEME_COLOR = "#FFFFFF"`, `DARK_THEME_COLOR = "#090C12"`, `readStoredThemePreference`, `getSystemTheme`, `resolveTheme`, `applyThemeToDocument`, `saveThemePreference`, `getChartThemeColors`, `normalizeChartSvgForLightExport`).
- Added `src/context/ThemeContextDefinition.ts`, `src/context/ThemeContext.tsx`, and fallback-safe `src/hooks/useTheme.ts` (`ThemeProvider` + `useTheme()`) subscribing to `prefers-color-scheme: dark` changes and storage/theme events, wrapped in `src/App.tsx` with Sonner `<Toaster theme={resolvedTheme} />`.

### 2. Dual-Mode Semantic Design Tokens & White-Paper Isolation
- Updated `src/index.css` with `@custom-variant dark (&:where(.dark, .dark *));`, cool slate-mist `:root` light tokens (`#f1f5f9` canvas, `#ffffff` cards, `#eef2f6` subtle, `#e2e8f0`/`#edf2f7`/`#cbd5e1` borders so white cards lift cleanly off the page), and `:root.dark` Obsidian Slate variables (`#090c12` canvas, `#111620` card, `#171e2b` subtle, `#1d2636` elevated, `#0c1018` input, `#20293a`/`#2f3c54` borders, `#2f6feb` primary, `#f59e0b` accent, `#8b98b0` muted), `@theme inline` Tailwind mappings, thin dark scrollbars under `:root.dark`, `.report-page, [data-paper-surface="true"]` paper locks (`#f9fafb` canvas / `#ffffff` sheets), and `@media print` resets.
- Isolated report sheets and exports to crisp light paper while keeping dark mode active on screen: `[data-paper-surface="true"]` on `PrintPreview` (`[data-pdf-card="true"]`), `LazyReportCard`, `ReportTemplateSection` live header preview, `pdfPrint.ts` (`generateReportsPdfFile` & `generateBlocksPdfFile` staging + `html2canvas` `onclone` stripping `.dark` + `normalizeChartSvgForLightExport`), and `analyticsExport.ts`.

### 3. UI Controls, Hierarchy Polish & Component Migration
- Added a compact 3-way `System / Light / Dark` switcher in the `src/components/navigation/AppShell.tsx` desktop sidebar footer above `Print Reports` and an **Appearance** card on `src/pages/settings/SettingsHub.tsx`, keeping `data-record="true"` strictly on static labels/controls.
- Migrated shared UI primitives (`src/components/ui/*`), pages (`Dashboard`, `Analytics`, `PrintPreview`, `SbaPage`, `SettingsHub`, `SettingsSubPageLayout`, `router`), Recharts wrappers (`BarChart`, `ComposedChart`, `LineChart`, `PieChart`, `RadarChart`), tabs, settings sections, and dialogs (`AddStudentModal`, `BulkAttendanceModal`, `BulkImportModal`, `BulkPromotionModal`, `ConfirmModal`, `ProgressModal`, `AboutModal`, `PdfExportModal`, `ScoreImportModal`, plus `ImageUploader`) to semantic tokens and `.dark` contrast variants.
- Applied a cross-theme polish pass (`DashboardStats`, `StatCard`, `PageHeader`, `Card`, `Modal`, `ValidationWarnings`, `AppShell`, `DashboardToolbar`, `Dashboard`, `StudentList`, `QuickGradebook`): neutral `#ffffff` / `#111620` KPI cards with soft tinted icon wells in both Light and Dark modes, seamless frosted `PageHeader` (`bg-white/85` / `dark:bg-[#111620]/85` `backdrop-blur-xl` across `.safe-top`), top specular highlights, `xl:grid-cols-4` KPI breakpoints preventing mid-width icon overlap, sleek `border-l-[3px]` accent warnings, elevated neutral active pills reserving primary blue for primary CTAs, muted `md:opacity-50` desktop table action icons, and `tabular-nums` alignment.

### 4. Frosted Dual-Action Scroll Navigator (`src/components/ScrollButton.tsx`)
- Rebuilt `ScrollButton` into a sleek translucent vertical capsule (`ArrowUp` | live micro-progress bar | `ArrowDown`) with idle dimming (`opacity-75`), `requestAnimationFrame`-throttled scroll/resize tracking, `prefers-reduced-motion` handling, and `triggerHaptic("light")`.
- Added capture-phase `scrollTargetSelector` support wired to `[data-scroll-region="student-list"]` in `src/components/StudentList.tsx` + `src/pages/Dashboard.tsx`, plus `hasBottomNav={false}` edge placement and a live `.report-wrapper` card counter (`statusLabel="${active} / ${total}"`) in `src/pages/PrintPreview.tsx`.

### 5. Floating Liquid Glass Mobile Bottom Navigation (`AppShell.tsx`, `src/index.css`)
- Upgraded `<nav aria-label="Mobile bottom navigation">` from a docked `bg-surface/95` bar to a floating `max-w-[380px]` `h-[60px]` `rounded-full` Liquid Glass capsule (`backdrop-blur-2xl backdrop-saturate-[180%]` with specular borders and inner highlights) and a gliding `translateX` active lens pill (`motion-reduce:transition-none`), preserving `md:hidden print:hidden safe-bottom` and `data-record="true"`.
- Added `.safe-bottom-floating` (`padding-bottom: max(0.625rem, calc(env(safe-area-inset-bottom, 0px) - 0.875rem))`) and updated mobile `.bottom-safe-nav` / `.pb-safe-nav` clearance so Face ID iPhones tighten bottom spacing from ~`44px` to ~`20px` while non-notch/browser tabs keep a `10px` float.

### 6. Automated Tests
- Added `src/test/ThemeAndDarkMode.test.tsx` (8 tests: theme defaults, `#FFFFFF`/`#090C12` `theme-color` syncing without `ges_v1_settings` mutation, `matchMedia` listener + provider fallback, `SettingsHub` Appearance & `data-record="true"` privacy boundary, `/print` paper isolation, SVG export normalization, and PDF `onclone` light isolation).
- Added `src/test/ScrollButton.test.tsx` (4 tests: idle/non-scrollable gating, dual top/bottom jumping + near-bottom disabling + reduced motion, `scrollTargetSelector` capture tracking, `hasBottomNav` + `statusLabel`).
- Updated `PwaInstallPrompt` token assertions in `src/test/ModalAndOverlayUX.test.tsx` from banning `dark:` to asserting semantic surface tokens (`bg-elevated`, `text-main`) without legacy `bg-white`/`dark:bg-gray-900`.

## Why
- Deliver a polished Light and Obsidian Dark experience tailored for Ghanaian teachers without breaking `SchoolSettings`, IndexedDB schemas (`ges_v1_students`, `ges_v1_settings`), `.repota` encrypted backups, or light-paper A4 GES report templates (`src/templates/*`, `src/components/reports/*`, `ReportTemplate.tsx`).
- Upgrade scroll navigation and mobile tab ergonomics so long class rosters, Quick Gradebook entry, and multi-card Print Previews feel cohesive and native on iOS/Android PWAs.

## What Was Verified
- `npm run lint` (`eslint .`): exited `0`.
- `npx tsc -b`: exited `0`.
- `npm test -- --run --maxWorkers=2`: exited `0` — `Test Files  48 passed (48)`, `Tests  441 passed (441)` (0 skipped), including `ThemeAndDarkMode.test.tsx` (8 passed), `ScrollButton.test.tsx` (4 passed), `NavigationShell.test.tsx`, and `ModalAndOverlayUX.test.tsx` (with `html2canvas-pro` / `jspdf` mocked in PDF unit tests).
- `npm run build` (`tsc -b && vite build` + PWA v1.3.0): exited `0` (`dist/sw.js`, `precache 32 entries`).
- Protected-file diff check (`git diff --name-only feat/navigation-shell..HEAD`): zero changes to report templates, `backupValidation.ts`, `fileEncryption.ts`, `types/index.ts`, `idbStorage.ts`, or PostHog analytics utilities.
- Live Vite visual verification against `http://127.0.0.1:5173/` across branch milestones: confirmed Obsidian dark surfaces at `1440x900` (`final_step_20.png`), `xl:grid-cols-4` / `2x2` KPI layouts, `ScrollButton` dual capsule + `4 / 10` `/print` counter beside white A4 sheets (`final_step_16.png`), floating Liquid Glass mobile capsule + `ScrollButton` clearance at `390x844` in Dark Mode, and Direction A Light Mode at `1440x900` & `390x844` (`final_step_18.png`: `#f1f5f9` canvas vs `#ffffff` cards, pastel-well KPIs, seamless frosted `PageHeader`, and frosted white floating bottom dock).
- User device check on physical iPhone 16 Pro Max confirmed the tightened `.safe-bottom-floating` gap sits naturally beside the home indicator.

## What Could Not Be Verified
- Physical iPhone iOS Safari bounce/status-bar rendering of the final Light-mode `theme-color="#FFFFFF"` update (`LIGHT_THEME_COLOR`) outside headless tests (`ThemeAndDarkMode.test.tsx` verified DOM attribute updates).
- Native OS print dialog PDF output and non-mocked `html2canvas-pro` / `jspdf` pixel output in `happy-dom`.

## Summary for reviewer
- Added opt-in class-based Dark Mode (`@custom-variant dark`), Obsidian Slate dark tokens, and Slate Mist light tokens (`#f1f5f9` canvas) in `src/index.css` with device-local `repota_theme` storage and zero-FOUC `#FFFFFF` / `#090C12` `theme-color` syncing (`index.html`).
- Isolated `PrintPreview`, `LazyReportCard`, `ReportTemplateSection` header preview, `@media print`, `pdfPrint.ts`, and `analyticsExport.ts` to white paper while leaving all report templates and storage/backup schemas untouched.
- Added sidebar and `/settings` Appearance controls (`data-record="true"` strictly on static UI labels/buttons) and migrated all views, Recharts charts, settings forms, and modals.
- Refined light/dark visual hierarchy with seamless frosted `PageHeader`, pure-white/Obsidian KPI cards with tinted icon wells, `xl:grid-cols-4` breakpoints, `tabular-nums`, and muted desktop row actions.
- Upgraded `ScrollButton` into a frosted dual-action capsule (`↑` | progress | `↓`) with `[data-scroll-region="student-list"]` inner-scroll support and a live `X / N` card counter on `/print`.
- Rebuilt mobile bottom navigation (`AppShell.tsx`) into a floating Liquid Glass capsule with a sliding active lens and Face ID `.safe-bottom-floating` gap tuning (`20px` inset).
- Verified with `npm run lint` (0), `npx tsc -b` (0), `npm test -- --run --maxWorkers=2` (48 files / 441 tests passed), `npm run build` (0), desktop/mobile light & dark browser checks, and iPhone 16 Pro Max preview testing.
