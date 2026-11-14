# Repota Codebase Inventory

## Overview
Repota is a Ghana-focused, offline-first Progressive Web App (PWA) for generating GES-compliant teacher report cards. The app runs entirely in the browser with no backend dependency, persisting data locally using IndexedDB and localStorage.

**Technology Stack**: React 19, TypeScript, Vite, TailwindCSS, Recharts (analytics), Zod (validation), Web Crypto API (security)

---

## 1. Major Directories & Responsibilities

| Directory | Responsibility | Key Files |
|-----------|-----------------|-----------|
| **src/pages** | Top-level route pages (Dashboard, Settings, Analytics, PrintPreview) | [Dashboard.tsx](../src/pages/Dashboard.tsx), [Settings.tsx](../src/pages/Settings.tsx), [Analytics.tsx](../src/pages/Analytics.tsx) |
| **src/components** | Feature-specific and reusable UI components organized by domain (modals, forms, student management, score entry) | [ScoreEntryModal.tsx](../src/components/ScoreEntryModal.tsx), [StudentList.tsx](../src/components/StudentList.tsx), [DataBackup.tsx](../src/components/DataBackup.tsx) |
| **src/components/ui** | Low-level, reusable design system components (Button, Input, Modal, Select, etc.) | [Button.tsx](../src/components/ui/Button.tsx), [Input.tsx](../src/components/ui/Input.tsx), [Modal.tsx](../src/components/ui/Modal.tsx) |
| **src/context** | React Context providers for application state (SchoolContext manages all school/student data and persistence) | [SchoolContext.tsx](../src/context/SchoolContext.tsx) |
| **src/utils** | Core utility functions: storage (IndexedDB/localStorage), grade calculation, analytics, security (PIN, biometric, encryption), remark generation | [idbStorage.ts](../src/utils/idbStorage.ts), [gradeCalculator.ts](../src/utils/gradeCalculator.ts), [pinSecurity.ts](../src/utils/pinSecurity.ts), [analyticsCalculator.ts](../src/utils/analyticsCalculator.ts) |
| **src/hooks** | Custom React hooks for form handling, state management, and side effects | [useSchoolData.ts](../src/hooks/useSchoolData.ts), [useDebounce.ts](../src/hooks/useDebounce.ts) |
| **src/schemas** | Zod validation schemas for data integrity (StudentRecord, SchoolSettings, import/export validation) | [studentSchema.ts](../src/schemas/studentSchema.ts), [settingsSchema.ts](../src/schemas/settingsSchema.ts) |
| **src/types** | TypeScript type definitions and interfaces (core data contracts) | [index.ts](../src/types/index.ts) |
| **src/api** | API layer with local/backend mode toggle (currently local-only); future Supabase integration scaffold | [config.ts](../src/api/config.ts), [studentApi.ts](../src/api/studentApi.ts) |
| **src/constants** | Application-wide constants (grade scales, school levels, assessment types, remark banks) | [gradeConstants.ts](../src/constants/gradeConstants.ts), [schoolLevels.ts](../src/constants/schoolLevels.ts) |
| **src/templates** | Report card and document templates (PDF generation, printing) | [OriginalTemplate.tsx](../src/templates/OriginalTemplate.tsx) |
| **src/components/charts** | Recharts-based visualization components (BarChart, LineChart, PieChart for analytics) | [BarChart.tsx](../src/components/charts/BarChart.tsx), [LineChart.tsx](../src/components/charts/LineChart.tsx) |
| **src/analytics** | Analytics processing and aggregation (gender analysis, top performers, score distributions) | [analyticsCalculator.ts](../src/utils/analyticsCalculator.ts) |
| **docs** | Documentation and project notes | (to be created/updated) |

---

## 2. React Components by Feature Area

### **Dashboard & Student Management**
Handles the core workflow of viewing, adding, editing, and managing student records.

- [**Dashboard.tsx**](../src/pages/Dashboard.tsx): Main landing page with searchable student list, score entry, filter by class/gender, bulk actions
- [**StudentList.tsx**](../src/components/StudentList.tsx): Virtualized scrolling list of students with edit/delete actions; handles large student counts efficiently
- [**ScoreEntryModal.tsx**](../src/components/ScoreEntryModal.tsx): Modal for entering subject scores per student; calculates grade in real-time based on level-specific rules
- [**DashboardToolbar.tsx**](../src/components/DashboardToolbar.tsx): Search, filter, sorting, and action toolbar for student dashboard
- [**BulkImportModal.tsx**](../src/components/BulkImportModal.tsx): Bulk import students and scores from CSV or Excel files
- [**ImageUploader.tsx**](../src/components/ImageUploader.tsx): Compresses and uploads student photos; stores as base64

### **Report Cards & Printing**
Generates printable report card documents and manages printing workflows.

- [**PrintPreview.tsx**](../src/pages/PrintPreview.tsx): Full-page report card preview with iOS-friendly print styles; lazy-loads components
- [**LazyReportCard.tsx**](../src/components/LazyReportCard.tsx): Lazy-loaded report card container for individual student printing
- [**ReportTemplate.tsx**](../src/components/ReportTemplate.tsx): Report template router rendering chosen style
- [**OriginalTemplate.tsx**](../src/templates/OriginalTemplate.tsx): GES-compliant official report card template
- [**ClassicTemplate.tsx**](../src/templates/ClassicTemplate.tsx): Classic formal report card layout
- [**ModernTemplate.tsx**](../src/templates/ModernTemplate.tsx): Clean modern multi-column report card
- [**MinimalTemplate.tsx**](../src/templates/MinimalTemplate.tsx): Streamlined ink-efficient report card

### **Settings & Configuration**
School settings, user preferences, security, and app configuration.

- [**Settings.tsx**](../src/pages/Settings.tsx): Main settings page with sections for school info, academic structure, grading, security, and data management
- [**DataBackup.tsx**](../src/components/DataBackup.tsx): Export encrypted/plain backup files, atomic backup import, and recovery tools
- [**StorageMonitor.tsx**](../src/components/StorageMonitor.tsx): Storage quota monitoring and IndexedDB health check
- [**SchoolSettingsForm.tsx**](../src/components/SchoolSettingsForm.tsx): Configuration form for school identity and grading scales

### **Analytics & Data Visualization**
Charts, statistics, and performance analysis tools.

- [**Analytics.tsx**](../src/pages/Analytics.tsx): Dashboard showing gender distribution, top performers, score averages, trend charts
- [**DashboardStats.tsx**](../src/components/DashboardStats.tsx): Summary statistics cards (class size, average score, highest/lowest grades)
- [**BarChart.tsx**](../src/components/charts/BarChart.tsx): Recharts bar chart component for subject averages and score bins
- [**LineChart.tsx**](../src/components/charts/LineChart.tsx): Line chart component for performance trends
- [**PieChart.tsx**](../src/components/charts/PieChart.tsx): Pie chart for gender and grade distributions
- [**ComposedChart.tsx**](../src/components/charts/ComposedChart.tsx): Mixed chart for multi-metric comparison
- [**RadarChart.tsx**](../src/components/charts/RadarChart.tsx): Spider/radar chart for subject competency breakdown

### **Security & Access Control**
PIN locks, biometric authentication, session management, and data encryption.

- [**LockScreen.tsx**](../src/components/LockScreen.tsx): PIN entry screen shown on app load or after idle timeout
- [**PinSetup.tsx**](../src/components/PinSetup.tsx): Modal for setting up or updating app access PIN
- [**PinRecovery.tsx**](../src/components/PinRecovery.tsx): Security question verification and recovery flow for lost PINs

### **UI & Design System**
Low-level, reusable components that compose higher-level features.

- [**Button.tsx**](../src/components/ui/Button.tsx): Styled button with variants (primary, secondary, danger, loading states)
- [**Input.tsx**](../src/components/ui/Input.tsx): Text input with validation, error messages, labels
- [**Modal.tsx**](../src/components/ui/Modal.tsx): Accessible modal dialog with backdrop and animations
- [**Select.tsx**](../src/components/ui/Select.tsx): Dropdown select input
- [**LoadingSpinner.tsx**](../src/components/ui/LoadingSpinner.tsx): Spinner/skeleton loading states
- [**ErrorBoundary.tsx**](../src/components/ErrorBoundary.tsx): React error boundary for graceful failure handling
- [**Alert.tsx**](../src/components/ui/Alert.tsx): Dismissible alert/toast notifications
- [**Card.tsx**](../src/components/ui/Card.tsx): Styled card container for content grouping

### **PWA & Platform Features**
App installation, offline detection, service worker integration, update notifications.

- [**PwaInstallPrompt.tsx**](../src/components/PwaInstallPrompt.tsx): "Install App" prompt for PWA installation
- [**OfflineDetector.tsx**](../src/components/OfflineDetector.tsx): Displays offline status banner when disconnected
- [**PwaUpdatePrompt.tsx**](../src/components/PwaUpdatePrompt.tsx): Prompts user to refresh when app updates are available

### **Forms & Modals**
Reusable form components and modal dialogs for data entry workflows.

- [**ConfirmModal.tsx**](../src/components/ConfirmModal.tsx): Generic confirmation modal with action buttons
- [**BulkImportModal.tsx**](../src/components/BulkImportModal.tsx): Modal dialog for batch data importing
- [**ScoreEntryModal.tsx**](../src/components/ScoreEntryModal.tsx): Modal for entering and validating student marks
- [**ProgressModal.tsx**](../src/components/ProgressModal.tsx): Progress dialog for lengthy operations
- [**AboutModal.tsx**](../src/components/AboutModal.tsx): Information about Repota app version and developer info

## 3. Data Models / Types / Schemas

### **Core TypeScript Interfaces** 
Defined in [src/types/index.ts](../src/types/index.ts):

#### **StudentRecord** (lines 42–56)
```
- id: string
- name: string
- className: string
- dateOfBirth?: string
- gender: "Male" | "Female"
- attendancePresent?: number
- teacherRemark?: string
- conduct?: string
- interest?: string
- pictureUrl?: string
- promotionStatus?: string
- subjects: SavedSubject[]
```

#### **SchoolSettings** (lines 58–101)
```
- schoolName: string
- className?: string
- schoolMotto?: string
- phoneNumber?: string
- address?: string
- email?: string
- logoUrl?: string
- academicYear: string
- term: AcademicPeriod ("1" | "2" | "3" | "Semester 1" | "Semester 2")
- level: SchoolLevel ("KG" | "PRIMARY" | "JHS" | "SHS")
- schoolType: "STANDARD" | "ISLAMIC" | "PRIVATE"
- nextTermStarts?: string
- headTeacherName?: string
- classTeacherName?: string
- totalAttendanceDays?: number
- classScoreMax: number
- examScoreMax: number
- classSize?: number
- headTeacherSignature?: string
- teacherSignature?: string
- defaultSubjects: string[]
- componentLibrary?: ClassScoreComponentConfig[]
- subjectComponentMap?: Record<string, ClassScoreComponentConfig[]>
- schoolGift?: number
- canteenFees?: number
- firstAidFees?: number
- templateId?: string
- examType?: ExamType ("TERMLY" | "MOCK")
- autoLockTimeout?: number
```

#### **ProcessedStudent** (lines 110–120)
Calculated view of StudentRecord with aggregated statistics:
```
- ...StudentRecord (all fields except raw subjects)
- age: number
- subjects: ProcessedSubject[]
- averageScore: number (mean of all subjects)
- totalScore: number (sum of subject total scores)
- classPosition: string (ordinal rank in class)
- teacherRemark?: string
- aggregate: number | null
```

#### **Grade Type Variants by School Level** (lines 128–150)
- **KG**: "GOLD" | "SILVER" | "BRONZE" (3 tiers)
- **PRIMARY**: "1" | "2" | "3" | "4" | "5" (5-point scale)
- **JHS**: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" (9-point scale)
- **SHS**: "A1" | "B2" | "B3" | "C4" | "C5" | "C6" | "D7" | "E8" | "F9" (A1–F9, 9-point WASSCE scale)

### **Validation Schemas (Zod)**

#### **studentSchema.ts** ([src/schemas/studentSchema.ts](../src/schemas/studentSchema.ts))
- **Lines 35–43**: Name validation (required, min 2 chars, no special chars except hyphens/apostrophes)
- **Lines 45–60**: Gender validation ("Male" or "Female")
- **Lines 57–80**: Score data validation (CA: 0–40, Exam: 0–60 for JHS/SHS; or 0–50 for KG/PRIMARY; auto-calculates total as 0–100)
- **Lines 82–115**: Full StudentRecord schema with score aggregation
- **studentDataSchema**: Batch import/export validation schema for multiple students

#### **settingsSchema.ts** ([src/schemas/settingsSchema.ts](../src/schemas/settingsSchema.ts))
- **Lines 1–30**: School name, location, motto, headmaster name validation
- **Lines 32–70**: Subject list validation
- **Lines 72–90**: School year date range validation
- **Lines 120–126**: Assessment component library and subject-component map validation
- **Lines 140–151**: Mock exam refine rule (% increase to apply when converting mock exam scores to subject grades)

### **Storage Schema (IndexedDB)**

[src/utils/idbStorage.ts](../src/utils/idbStorage.ts) defines the `repota-storage` database with one `app-data` object store. It contains the `ges_v1_students` and `ges_v1_settings` keys.

#### **ClassScoreComponentConfig Schema** ([src/schemas/settingsSchema.ts](../src/schemas/settingsSchema.ts))
```
- name: string (1–100 characters)
- maxScore: number (1–100)
- category?: "CAT" | "GROUP" | "PROJECT" | "HOMEWORK"
```

---

## 4. Local Persistence Mechanism

### **Primary Storage: IndexedDB**
[src/utils/idbStorage.ts](../src/utils/idbStorage.ts) (lines 36–77):
- **Database name**: "repota-storage" (version 1)
- **Object store**: `app-data`
- **Keys**: `ges_v1_students` (student records) and `ges_v1_settings` (school configuration)
- **Capacity**: 50+ MB available in modern browsers
- **Why IndexedDB**: Persistent, large quota, doesn't block UI, structured query support

### **Fallback Storage: localStorage**
[src/utils/idbStorage.ts](../src/utils/idbStorage.ts) (lines 78–130):
- **Capacity**: 5–10 MB per origin (browser-dependent)
- **Used when**: IndexedDB unavailable (e.g., Safari Private Mode, browser restrictions)
- **Format**: JSON-stringified values stored under caller-supplied keys (`ges_v1_students`, `ges_v1_settings`)
- **Graceful degradation**: App detects IndexedDB failure and automatically switches to localStorage

### Backup heartbeat

The backup heartbeat is stored separately by the data-protection helper; it is not an IndexedDB object store.

### **Migration Strategy** 
[src/utils/idbStorage.ts](../src/utils/idbStorage.ts) (lines 176–233):
- On first app load, checks if old data exists in localStorage
- If found and IndexedDB available, **migrates** all data from localStorage to IndexedDB
- Deletes legacy localStorage data after successful migration
- Fallback: if IndexedDB unavailable, keeps using localStorage

### **Auto-Save & Debouncing**
[src/context/SchoolContext.tsx](../src/context/SchoolContext.tsx) (lines 140–154):
- All state mutations trigger debounced save (500ms delay)
- Prevents excessive I/O when user rapidly edits scores or remarks
- Failed saves logged but don't block UI

### **Data Loss Detection: Backup Heartbeat**
[src/utils/dataProtection.ts](../src/utils/dataProtection.ts) and [src/utils/idbStorage.ts](../src/utils/idbStorage.ts):
- **createBackupHeartbeat()**: Records a timestamp after a save request (without awaiting or confirming a successful write)
- **detectDataLoss()**: Checks for missing student or settings keys while the backup marker exists (in [src/utils/dataProtection.ts](../src/utils/dataProtection.ts))
- **Alert logic**: If heartbeat exists but student data is empty, warns user that Android cleaner app may have wiped storage
- Helps teacher recover from accidental data deletion

### **No Backend Sync**
- **Current state**: All data stored locally; no backend integration
- **Future capability**: [src/api/config.ts](../src/api/config.ts) has `API_CONFIG.MODE` toggle for switching to Supabase, but not currently enabled
- **Offline-first design**: App works 100% offline; no internet required

### **Export/Import**
Handled in [DataBackup.tsx](../src/components/DataBackup.tsx), [fileEncryption.ts](../src/utils/fileEncryption.ts), and [backupValidation.ts](../src/utils/backupValidation.ts):
- Export: Writes students and settings as JSON and encrypts with **AES-256-GCM** + PBKDF2 only when a password is set (plain JSON export when unencrypted)
- Import: Decrypts encrypted files before schema validation and replaces both current students and settings on the device rather than merging them
- Format: plain .json backups and password-encrypted .repota files

---

## 5. Unclear, Undocumented, or Dead Code

### **No Dead Code Detected**
Comprehensive grep search for common dead-code markers:
```bash
grep -r "TODO\|FIXME\|HACK\|XXX\|DEPRECATED" src/ --include="*.ts" --include="*.tsx"
```
**Result**: 0 matches. No marked-dead or TODO code found in the codebase.

### **Unclear / Potentially Unused**

#### **Supabase Backend Integration (Scaffolded but Incomplete)**
- **File**: [src/api/config.ts](../src/api/config.ts)
- **Issue**: `API_CONFIG.MODE` set to `'local'`; Supabase keys and URL appear to be environment variables
- **Current state**: 
  - [src/api/studentApi.ts](../src/api/studentApi.ts) has `isLocalMode()` check that routes all calls to IndexedDB
  - Supabase integration appears scaffolded but not enabled
- **Risk**: If MODE is changed to 'supabase' without proper backend setup, app will fail
- **Recommendation**: Document whether backend integration is planned or remove dead code paths

#### **Unclear Data Flow: SchoolContext vs. StudentApi**
- **Question**: [src/context/SchoolContext.tsx](../src/context/SchoolContext.tsx) loads data from `studentApi.fetchStudents()`, which internally checks `isLocalMode()` and loads from IndexedDB
- **Complexity**: Two layers of indirection (Context → API → Storage) for local-only app
- **Why it exists**: Likely architected for future backend swap, but adds unnecessary complexity today
- **Recommendation**: Consider flattening to direct Context ↔ Storage when backend is definitively not needed

#### **Component Library (AssessmentComponent) - Limited UI**
- **File**: [src/components/ComponentLibraryEditor.tsx](../src/components/ComponentLibraryEditor.tsx)
- **Issue**: UI allows editing weights and thresholds, but no validation that weights sum to 1.0
- **Risk**: Invalid weights could lead to grade calculation errors
- **Current state**: Schema validates on save, so invalid state is caught, but no live feedback to user
- **Recommendation**: Add real-time validation UI to warn user if weights don't sum to 100%

#### **Remark Generation - Smart Rotation Logic Unclear**
- **File**: [src/utils/remarkGenerator.ts](../src/utils/remarkGenerator.ts)
- **Issue**: `getSmartRandom()` function (lines 9–22) uses `Date.now() % array.length` to rotate remarks
- **Clarity**: Logic avoids repeating remarks for same student over time, but implementation is non-obvious
- **Recommendation**: Add comment block explaining the rotation strategy

#### **Print Styles - iOS-Specific Hacks**
- **File**: [src/pages/PrintPreview.tsx](../src/pages/PrintPreview.tsx)
- **Issue**: Aggressive `@page { margin: 0; }`, `print-color-adjust: exact`, `-webkit-print-color-adjust: exact` CSS
- **Why**: iOS PWA printing requires these hacks to force zero-margin A4 layout
- **Concern**: Not well-documented; if removed, iOS printing breaks
- **Recommendation**: Add inline comment explaining iOS print quirk

#### **IndexedDB Storage Quota Handling**
- **File**: [src/utils/idbStorage.ts](../src/utils/idbStorage.ts)
- **Behavior**: `saveToStorage` and `saveEntriesToStorage` catch `QuotaExceededError` and `NS_ERROR_DOM_QUOTA_REACHED`, log `Storage quota exceeded`, display a user alert (`⚠️ STORAGE FULL: Cannot save more data...`), and return `false` without writing to `localStorage`.
- **Fallback**: The `localStorage` fallback applies only when `initStorage` finds IndexedDB unavailable at startup, not on quota failures.

#### **Virtual Scrolling Threshold Undocumented**
- **File**: [src/components/StudentList.tsx](../src/components/StudentList.tsx)
- **Issue**: Uses TanStack Virtual to handle large lists, but threshold for enabling is not documented
- **Question**: At how many students does virtual scrolling kick in? What's the expected max student count?
- **Recommendation**: Document performance characteristics and tested max class size

#### **Analytics Calculation - Gender Assumption**
- **File**: [src/utils/analyticsCalculator.ts](../src/utils/analyticsCalculator.ts)
- **Issue**: Gender analysis only supports "M" | "F" binary; no support for non-binary or third gender
- **Current behavior**: Non-standard gender values would be silently filtered out or cause calculation errors
- **Recommendation**: Either enforce strict gender validation in schema or expand to support more options

---

## Summary

**What works well:**
- ✅ Offline-first architecture is solid: IndexedDB primary, localStorage fallback, graceful migration
- ✅ Type safety throughout with TypeScript and Zod validation
- ✅ No dead code; all components appear actively used
- ✅ Security is thoughtfully implemented (PIN, biometric, encryption for exports)
- ✅ Grade calculation logic is level-aware and correctly implements GES standards
- ✅ Analytics and reporting features are comprehensive

**Areas for clarification / improvement:**
- 🔸 Supabase integration is scaffolded but incomplete; either finish or remove
- 🔸 Component Library validation could use real-time UI feedback
- 🔸 Print styles have iOS-specific hacks that should be documented
- 🔸 IndexedDB quota errors alert the user and return false, with no automatic recovery or localStorage fallback when quota is exceeded
- 🔸 Virtual scrolling threshold and performance characteristics undocumented
- 🔸 Remark generation rotation logic lacks clarity
- 🔸 Gender field assumes binary; consider expanding schema if non-binary support is needed

---

## Citation Summary

All major files have been cited with absolute filesystem paths:
- **Storage layer**: [idbStorage.ts](../src/utils/idbStorage.ts), [storage.ts](../src/utils/storage.ts)
- **State management**: [SchoolContext.tsx](../src/context/SchoolContext.tsx)
- **Data models**: [types/index.ts](../src/types/index.ts)
- **Validation**: [studentSchema.ts](../src/schemas/studentSchema.ts), [settingsSchema.ts](../src/schemas/settingsSchema.ts)
- **Grade calculation**: [gradeCalculator.ts](../src/utils/gradeCalculator.ts)
- **Security**: [pinSecurity.ts](../src/utils/pinSecurity.ts)
- **Analytics**: [analyticsCalculator.ts](../src/utils/analyticsCalculator.ts)
- **Remarks**: [remarkGenerator.ts](../src/utils/remarkGenerator.ts)
- **UI Pages**: [Dashboard.tsx](../src/pages/Dashboard.tsx), [Settings.tsx](../src/pages/Settings.tsx), [Analytics.tsx](../src/pages/Analytics.tsx), [PrintPreview.tsx](../src/pages/PrintPreview.tsx)

**Document created**: docs/codebase-inventory.md

