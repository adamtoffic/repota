# Class Tools, SBA Import, AI Story Analytics, Templates & Private School Controls Report

Branch: `feat/class-tools-sba-analytics-templates` (branched cleanly from `feat/navigation-shell` at `18a10f7`; `feat/navigation-shell` remains clean at `origin/feat/navigation-shell`)

---

## What Changed (8 Atomic Commits)

### Batch A — Report Templates, School Brand Colors, Position Toggles & Private School Controls (Goals 4 & 5)

1. **`06fda0c` — Schema, Theme & Private Fee Model**
   - Extended `src/types/index.ts`, `src/schemas/settingsSchema.ts`, `src/schemas/studentSchema.ts`, and `src/utils/backupValidation.ts` with:
     - `privateFeeItems` (max 3 slots: `{ id, label, amount, cycle, enabled }`), `showFeeSchedule`, `feePaymentNote`, `showStudentFeeArrearsOnReport`
     - Independent ranking toggles: `showClassPosition`, `showSubjectPosition`
     - School brand colors: `useCustomTemplateColor`, `primaryColor`, `accentColor`
     - Private school student admin fields: `admissionNumber`, `feeStatus` (`PAID | PART_PAID | OWING | SCHOLARSHIP`), `feeArrears`, `guardianPhone`
   - Added `src/utils/privateSchoolFees.ts` (3-slot A4 budget enforcement + backward-compatible migration from `schoolGift`, `canteenFees`, `firstAidFees` + `resolvePositionVisibility`) and `src/utils/reportTheme.ts` (contrast-safe solid hex blending, 8 heritage color presets, and strict monochrome `printMode === "bw"` overrides).

2. **`a44325e` — Existing Templates Upgraded Without Breaking Defaults**
   - Updated `src/templates/OriginalTemplate.tsx`, `src/templates/ClassicTemplate.tsx`, `src/templates/ModernTemplate.tsx`, `src/templates/MinimalTemplate.tsx`, `src/components/reports/StudentInfo.tsx`, and `src/components/reports/PrivateSchoolReport.tsx`:
     - Honors `showClassPosition` and `showSubjectPosition` independently, dynamically adjusting grid columns (`OriginalTemplate` switches `grid-cols-[1fr_100px_80px_80px]` to `grid-cols-[1fr_100px_80px]`, `ClassicTemplate` spans roll row cleanly, `ModernTemplate` fixes its KG/Total Score card swap, `MinimalTemplate` hides rank lines cleanly).
     - Renders the 3 customizable private-school fee slots (plus optional inline arrears when `showStudentFeeArrearsOnReport` is enabled).
     - Applies custom school colors when `useCustomTemplateColor` is enabled, reverting to strict B&W when `printMode === "bw"`.

3. **`3a3e11a` — `Executive Crest` Template (`executive_v1`) & Settings / Student Detail UI**
   - Added `src/templates/ExecutiveTemplate.tsx` and registered it in `src/templates/registry.ts` as **Executive Crest** (`executive_v1`) — works across all school levels (`KG`, `PRIMARY`, `JHS`, `SHS`) and types (`STANDARD`, `ISLAMIC`, `PRIVATE`) with 3-tier A4 row density.
   - Upgraded `src/components/settings/ReportTemplateSection.tsx` with Heritage color presets, custom primary/accent hex + color pickers, live mini-preview, and independent `Show Overall Class Position` & `Show Subject Positions` toggles.
   - Upgraded `src/components/settings/SchoolIdentitySection.tsx` with the 3-slot fee schedule editor (toggle, label, amount, cycle, master toggle, arrears-on-report toggle, payment note) and `src/components/tabs/DetailsTab.tsx` with the Private School Admin & Fee Tracking card.
   - Updated `src/pages/PrintPreview.tsx` PDF cache key (`contentKey`) to invalidate when colors, position toggles, or fee items change.

---

### Batch B — SBA Import, Power-User Student Setup & Class Tools (Goals 1 & 2)

4. **`66bdecc` — Zero-Dependency CSV/TSV Parser, Templates & Component-Aware Student Setup**
   - Created `src/utils/csvImport.ts`:
     - RFC-4180 CSV + tab-separated Excel/Google Sheets clipboard paste parser (`parseTabularText`)
     - Roster & Student Details parser (`parseRosterImport`) supporting plain names, shorthand rows, and headered sheets (`Name, Gender, DateOfBirth, AttendancePresent, Conduct, Interest, AdmissionNumber, FeeStatus, FeeArrears, GuardianPhone`), matching existing students without duplication
     - Dynamic template generators (`buildRosterTemplateCsv`, `buildSbaScoreTemplateCsv`) with formula-injection neutralization
     - `buildDefaultSubjectsForStudent` attaching `settings.subjectComponentMap` SBA tasks automatically
   - Updated `src/components/AddStudentModal.tsx` and `src/components/BulkImportModal.tsx` with CSV upload, downloadable roster template, rich preview table, existing-student update support, and one-tap Male/Female toggle for rows missing gender.

5. **`de1607e` — Scored SBA Import Modal & `QuickGradebook` Column Paste**
   - Created `src/components/ScoreImportModal.tsx` and wired it into `src/pages/SbaPage.tsx`:
     - Download pre-filled `<Subject>_SBA_Template.csv` containing the subject's configured SBA tasks + `Exam (/100)`
     - Upload CSV or paste directly from Excel/Google Sheets, preview matched/new students and clamped score warnings, and apply scores (`updateComponentAndRecalculateClassScore` + `convertExamRawToWeighted`)
   - Upgraded `src/components/QuickGradebook.tsx` with multi-row Excel/Google Sheets clipboard column paste (`onPaste`) and `ArrowUp` / `ArrowDown` keyboard navigation.

6. **`6479013` — Class Tools Menu Expansion**
   - Created `src/components/BulkAttendanceModal.tsx` (batch attendance sheet with "Set All" fill and Enter-to-next) and `src/components/BulkPromotionModal.tsx` (threshold-based auto-promotion with per-student overrides).
   - Added `exportDetailedBroadsheetCSV` in `src/utils/export.ts` (includes Gender, Attendance, Class/Exam split per subject, Average, Position, Aggregate, Promotion Status, Remark, and Private fee columns).
   - Updated `src/components/DashboardToolbar.tsx` and `src/pages/Dashboard.tsx` to expose `Import Student Roster`, `Import SBA / Exam Scores`, `Bulk Attendance Entry`, `Sync Subjects & SBA Tasks`, `Bulk Promotion Status`, `Export Detailed Broadsheet`, live pending count on `Remove Incomplete Students`, and `Escape` key closing.

---

### Batch C — Analytics Fixes & Offline AI Class Story (Goal 3)

7. **`f893f23` — Analytics Engine Fixes & New Calculators**
   - Updated `src/utils/analyticsCalculator.ts`:
     - Fixed `calculateAtRiskStudents` so unrecorded attendance (`undefined`) no longer triggers `"Poor Attendance"`
     - Upgraded `calculateAttendanceInsights` from unscaled covariance to Pearson correlation ($r$)
     - Added `partitionGradedStudents`, `calculateSbaVsExamAnalysis`, `calculateSbaCategoryMastery`, `calculateBorderlineStudents` (`42%–54.9%`), `calculateCoreVsElectiveStats`, and `calculatePrivateFeeSummary`.

8. **`941ec05` — Offline AI Class Story & Analytics UI**
   - Created `src/utils/classStoryGenerator.ts` (`generateClassStory`) producing an offline executive headline, 3-part narrative, Strengths vs. Watchouts, prioritized Next-Week Action Plan, and copyable Staff Meeting Brief.
   - Updated `src/pages/Analytics.tsx` with the ungraded-student exclusion notice, `Class Pulse Story` card, `Core vs. Elective Health`, `Aggregate Distribution Bands`, `Private School Fee Tracking`, `SBA Classwork vs. Exam` & `SBA Task Category Mastery` charts, `Borderline Cohort`, `SBA vs. Exam Discrepancy Spotlight`, and `Copy Staff Brief` button.

---

## Automated Verification Results

All automated checks ran cleanly after the final code commit (`941ec05`):
- **Vitest (`npx vitest run`):** `39` test files passed, `361` tests passed, `0` failed, `0` skipped.
  - New test files added: `src/test/reportThemeAndFees.test.ts`, `src/test/ReportTemplates.test.tsx`, `src/test/csvImport.test.ts`, `src/test/ScoreImportAndGradebook.test.tsx`, `src/test/ClassTools.test.tsx`, `src/test/ClassStoryAndAnalytics.test.tsx`, plus expanded `src/test/analyticsCalculator.test.ts`.
- **ESLint (`npm run lint`):** Passed (`exit code 0`).
- **TypeScript + Vite PWA Build (`npm run build`):** Passed (`exit code 0`).

---

## Manual Testing Checklist (Before Merging)

Run `npm run dev` on branch `feat/class-tools-sba-analytics-templates` and verify these real-browser behaviors that `happy-dom` cannot fully simulate:

1. **Templates, Custom Colors & Print/PDF Layout (`/settings/templates` -> `/print`)**
   - Switch across all 5 templates (`Original`, `Classic`, `Modern`, `Minimal`, `Executive Crest`) with 12–13 subjects and confirm every card fits on a **single A4 sheet** in print preview and PDF export (`html2canvas-pro`).
   - Enable **Use School Custom Colors**, test both a dark preset (e.g., Royal Burgundy) and a bright custom color, then toggle `B&W` in Print Preview to verify strict monochrome ink-saving.
   - Toggle **Show Overall Class Position** off while keeping **Show Subject Positions** on (and vice versa), checking that `OriginalTemplate`, `ClassicTemplate`, `ModernTemplate`, `MinimalTemplate`, and `ExecutiveTemplate` show no broken borders or blank column gaps.
2. **Private School 3-Slot Fee Schedule & Student Tracking (`/settings/school`, Student `DetailsTab`)**
   - Set School Type to **Private School**, rename the 3 slots (e.g., `Tuition`, `Bus`, `ICT`), toggle one slot off, enable inline arrears, and verify A4 spacing in `/print`.
   - Open a student's `Details` tab and set `Admission No.`, `Fee Status`, `Fee Arrears`, and `Guardian Phone`; confirm values persist after refresh.
3. **Class Tools & Power-User Import (`/` Dashboard, `/sba`, `Quick Gradebook`)**
   - Open `Class Tools` on both desktop dropdown and mobile bottom sheet; test `Bulk Attendance Entry`, `Sync Subjects & SBA Tasks`, `Bulk Promotion Status`, and `Export Detailed Broadsheet`.
   - In `/sba` -> `Import Scores (CSV)`, download the subject's SBA CSV template, fill values in Excel/Google Sheets, and test both CSV upload and direct `Ctrl+C` -> `Ctrl+V` paste.
   - In `Quick Gradebook`, copy a vertical column of 5 numbers from Excel/Sheets and paste into the first student's score input; confirm consecutive rows auto-fill.
4. **Analytics & AI Class Story (`/analytics`)**
   - Inspect `Overview`, `Subjects` (SBA vs Exam + SBA Category Mastery charts), and `AI Insights` (`Class Story`, `Borderline Cohort`, `Copy Staff Brief`, `Inspect Subject →` filter jump) with real Recharts dimensions and Export PDF.
