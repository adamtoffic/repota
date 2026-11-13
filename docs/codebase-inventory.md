# Repota Codebase Inventory

## Overview
Repota is a Ghana-focused, offline-first Progressive Web App (PWA) for generating GES-compliant teacher report cards. The app runs entirely in the browser with no backend dependency, persisting data locally using IndexedDB and localStorage.

**Technology Stack**: React 19, TypeScript, Vite, TailwindCSS, Recharts (analytics), Zod (validation), Web Crypto API (security)

---

## 1. Major Directories & Responsibilities

| Directory | Responsibility | Key Files |
|-----------|-----------------|-----------|
| **src/pages** | Top-level route pages (Dashboard, Settings, Analytics, PrintPreview) | [Dashboard.tsx](../src/pages/Dashboard.tsx), [Settings.tsx](../src/pages/Settings.tsx), [Analytics.tsx](../src/pages/Analytics.tsx) |
| **src/components** | Feature-specific and reusable UI components organized by domain (modals, forms, student management, score entry) | [ScoreEntryModal.tsx](../src/components/ScoreEntryModal.tsx), [StudentList.tsx](../src/components/StudentList.tsx), [ClassForm.tsx](../src/components/ClassForm.tsx) |
| **src/ui** | Low-level, reusable design system components (Button, Input, Dialog, Dropdown, etc.) | [Button.tsx](../src/ui/Button.tsx), [Input.tsx](../src/ui/Input.tsx), [Dialog.tsx](../src/ui/Dialog.tsx) |
| **src/context** | React Context providers for application state (SchoolContext manages all school/student data and persistence) | [SchoolContext.tsx](../src/context/SchoolContext.tsx) |
| **src/utils** | Core utility functions: storage (IndexedDB/localStorage), grade calculation, analytics, security (PIN, biometric, encryption), remark generation | [idbStorage.ts](../src/utils/idbStorage.ts), [gradeCalculator.ts](../src/utils/gradeCalculator.ts), [pinSecurity.ts](../src/utils/pinSecurity.ts) |
| **src/hooks** | Custom React hooks for form handling, state management, and side effects | [useForm.ts](../src/hooks/useForm.ts), [useIndexedDB.ts](../src/hooks/useIndexedDB.ts) |
| **src/schemas** | Zod validation schemas for data integrity (StudentRecord, SchoolSettings, import/export validation) | [studentSchema.ts](../src/schemas/studentSchema.ts), [settingsSchema.ts](../src/schemas/settingsSchema.ts) |
| **src/types** | TypeScript type definitions and interfaces (core data contracts) | [index.ts](../src/types/index.ts) |
| **src/api** | API layer with local/backend mode toggle (currently local-only); future Supabase integration scaffold | [config.ts](../src/api/config.ts), [studentApi.ts](../src/api/studentApi.ts) |
| **src/constants** | Application-wide constants (grade scales, school levels, assessment types, remark banks) | [gradeConstants.ts](../src/constants/gradeConstants.ts), [schoolLevels.ts](../src/constants/schoolLevels.ts) |
| **src/templates** | Report card and document templates (PDF generation, printing) | [ReportCardTemplate.tsx](../src/templates/ReportCardTemplate.tsx) |
| **src/charts** | Recharts-based visualization components (ScatterPlot, BarChart, LineChart for analytics) | [ScatterPlot.tsx](../src/charts/ScatterPlot.tsx), [PerformanceChart.tsx](../src/charts/PerformanceChart.tsx) |
| **src/analytics** | Analytics processing and aggregation (gender analysis, top performers, score distributions) | [analyticsCalculator.ts](../src/analytics/analyticsCalculator.ts) |
| **docs** | Documentation and project notes | (to be created/updated) |

---

## 2. React Components by Feature Area

### **Dashboard & Student Management**
Handles the core workflow of viewing, adding, editing, and managing student records.

- [**Dashboard.tsx**](../src/pages/Dashboard.tsx): Main landing page with searchable student list, score entry, filter by class/gender, bulk actions
- [**StudentList.tsx**](../src/components/StudentList.tsx): Virtualized scrolling list of students with edit/delete actions; handles large student counts efficiently
- [**ScoreEntryModal.tsx**](../src/components/ScoreEntryModal.tsx): Modal for entering subject scores per student; calculates grade in real-time based on level-specific rules
- [**StudentForm.tsx**](../src/components/StudentForm.tsx): Form to add/edit student details (name, ID, gender, image)
- [**ClassForm.tsx**](../src/components/ClassForm.tsx): Form to create/edit class (level, arm, teacher, students)
- [**ImageUploader.tsx**](../src/components/ImageUploader.tsx): Compresses and uploads student photos; stores as base64

### **Report Cards & Printing**
Generates printable report card documents and manages printing workflows.

- [**PrintPreview.tsx**](../src/pages/PrintPreview.tsx): Full-page report card preview with iOS-friendly print styles; lazy-loads components
- [**ReportCardTemplate.tsx**](../src/templates/ReportCardTemplate.tsx): Renders GES-compliant report card layout with student info, scores, grades, teacher remarks, headmaster remarks
- [**BatchPrintModal.tsx**](../src/components/BatchPrintModal.tsx): Print multiple report cards with pagination
- [**Tabs** (various): Tab-based UI for navigating report sections (Scores, Remarks, Headmaster Comments, etc.)

### **Settings & Configuration**
School settings, user preferences, security, and app configuration.

- [**Settings.tsx**](../src/pages/Settings.tsx): Main settings page with tabs for school info, user account, backup/restore, security
- [**SchoolInfoForm.tsx**](../src/components/SchoolInfoForm.tsx): Edit school name, address, motto, headmaster name, etc.
- [**UserSecurityForm.tsx**](../src/components/UserSecurityForm.tsx): PIN setup/change, recovery codes, security questions, biometric auth toggle
- [**BackupRestorePanel.tsx**](../src/components/BackupRestorePanel.tsx): Export encrypted backup file, import from file, delete all data
- [**ComponentLibraryEditor.tsx**](../src/components/ComponentLibraryEditor.tsx): Configure custom assessment breakdown (CAT, GROUP, PROJECT, HOMEWORK weights/scales)

### **Analytics & Data Visualization**
Charts, statistics, and performance analysis tools.

- [**Analytics.tsx**](../src/pages/Analytics.tsx): Dashboard showing gender distribution, top performers, score averages, trend charts
- [**DashboardStats.tsx**](../src/components/DashboardStats.tsx): Summary statistics cards (class size, average score, highest/lowest grades)
- [**ScatterPlot.tsx**](../src/charts/ScatterPlot.tsx): Recharts scatter plot of students by gender vs. performance
- [**PerformanceChart.tsx**](../src/charts/PerformanceChart.tsx): Line/area chart showing score distribution across class
- [**GenderDistributionChart.tsx**](../src/charts/GenderDistributionChart.tsx): Pie chart of male/female student counts

### **Security & Access Control**
PIN locks, biometric authentication, session management, and data encryption.

- [**PINLock.tsx**](../src/components/PINLock.tsx): PIN entry screen shown on app load; prevents unauthorized access
- [**BiometricAuth.tsx**](../src/components/BiometricAuth.tsx): WebAuthn biometric prompt (Face ID, Touch ID, Windows Hello, fingerprint)
- [**RecoveryCodeModal.tsx**](../src/components/RecoveryCodeModal.tsx): Display/copy recovery codes if PIN is lost
- [**SecurityQuestionsModal.tsx**](../src/components/SecurityQuestionsModal.tsx): Set and verify security questions for PIN recovery

### **UI & Design System**
Low-level, reusable components that compose higher-level features.

- [**Button.tsx**](../src/ui/Button.tsx): Styled button with variants (primary, secondary, danger, loading states)
- [**Input.tsx**](../src/ui/Input.tsx): Text input with validation, error messages, labels
- [**Dialog.tsx**](../src/ui/Dialog.tsx): Modal dialog wrapper with backdrop
- [**Dropdown.tsx**](../src/ui/Dropdown.tsx): Accessible dropdown select
- [**Loading.tsx**](../src/ui/Loading.tsx): Spinner/skeleton loading states
- [**ErrorBoundary.tsx**](../src/ui/ErrorBoundary.tsx): React error boundary for graceful failure handling
- [**Alert.tsx**](../src/ui/Alert.tsx): Dismissible alert/toast notifications
- [**Card.tsx**](../src/ui/Card.tsx): Styled card container for content grouping

### **PWA & Platform Features**
App installation, offline detection, service worker integration, update notifications.

- [**PWAPrompt.tsx**](../src/components/PWAPrompt.tsx): "Install App" button/modal (shows on iOS, Android, and desktop browsers)
- [**OfflineIndicator.tsx**](../src/components/OfflineIndicator.tsx): Displays offline status and syncs queue
- [**UpdateNotification.tsx**](../src/components/UpdateNotification.tsx): Prompts user to refresh when app updates are available

### **Forms & Modals**
Reusable form components and modal dialogs for data entry workflows.

- [**RemarkModal.tsx**](../src/components/RemarkModal.tsx): Edit teacher remarks with auto-generation suggestions
- [**HeadmasterRemarkModal.tsx**](../src/components/HeadmasterRemarkModal.tsx): Edit headmaster comment with suggestions
- [**FilterPanel.tsx**](../src/components/FilterPanel.tsx): Advanced search/filter for students (by class, gender, score range)
- [**ImportDataModal.tsx**](../src/components/ImportDataModal.tsx): Import student data from Excel or encrypted backup file

---

## 3. Data Models / Types / Schemas

### **Core TypeScript Interfaces** 
Defined in [src/types/index.ts](../src/types/index.ts):

#### **StudentRecord** (lines 42–80)
```
- id: string (UUID)
- name: string
- gender: "M" | "F"
- dateOfBirth: string (ISO date)
- registrationNumber: string (student ID)
- pictureUrl?: string (optional URL)
- className: string
- subjects: SavedSubject[]
- teacherRemark: string (overall teacher comment)
- headmasterRemark: string (headmaster comment)
- createdAt: string (ISO timestamp)
- updatedAt: string (ISO timestamp)
```

#### **SchoolSettings** (lines 83–110)
```
- id: string
- schoolName: string
- location: string (town/district)
- motto: string
- headmasterName: string
- schoolLevel: "KG" | "PRIMARY" | "JHS" | "SHS"
- subjects: string[] (list of taught subjects)
- schoolYearStart: string (ISO date)
- schoolYearEnd: string (ISO date)
- componentLibrary: AssessmentComponent[] (custom CAT/GROUP/PROJECT/HOMEWORK weights)
```

#### **ProcessedStudent** (lines 113–125)
Calculated view of StudentRecord with aggregated statistics:
```
- ...StudentRecord (all fields)
- averageScore: number (mean of all subjects)
- totalGrade: string (overall class grade)
- percentile: number (% of class scoring below this student)
- gradeDistribution: Map<string, number> (grade → count of subjects with that grade)
```

#### **Grade Type Variants by School Level** (lines 128–150)
- **KG**: "GOLD" | "SILVER" | "BRONZE" (3 tiers)
- **PRIMARY**: "1" | "2" | "3" | "4" | "5" (5-point scale)
- **JHS**: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" (9-point scale)
- **SHS**: "A1" | "A2" | "B1" | "B2" | "B3" | "C4" | "C5" | "C6" | "D7" | "D8" | "E8" | "F9" (A1–F9, 12-point WASSCE scale)

### **Validation Schemas (Zod)**

#### **studentSchema.ts** ([src/schemas/studentSchema.ts](../src/schemas/studentSchema.ts))
- **Lines 35–43**: Name validation (required, min 2 chars, no special chars except hyphens/apostrophes)
- **Lines 45–55**: Gender validation ("M" or "F")
- **Lines 57–80**: Score data validation (CA: 0–40, Exam: 0–60 for JHS/SHS; or 0–50 for KG/PRIMARY; auto-calculates total as 0–100)
- **Lines 82–115**: Full StudentRecord schema with score aggregation
- **studentDataSchema**: Batch import/export validation schema for multiple students

#### **settingsSchema.ts** ([src/schemas/settingsSchema.ts](../src/schemas/settingsSchema.ts))
- **Lines 1–30**: School name, location, motto, headmaster name validation
- **Lines 32–70**: Subject list validation
- **Lines 72–90**: School year date range validation
- **Lines 92–138**: AssessmentComponent library validation (weights, minimum thresholds for each component)
- **Lines 140–151**: Mock exam refine rule (% increase to apply when converting mock exam scores to subject grades)

### **Storage Schema (IndexedDB)**

[src/utils/idbStorage.ts](../src/utils/idbStorage.ts) defines the `repota-storage` database with one `app-data` object store. It contains the `ges_v1_students` and `ges_v1_settings` keys.

#### **AssessmentComponent Type** (lines 18–25 of settingsSchema.ts)
```
- name: "CAT" | "GROUP" | "PROJECT" | "HOMEWORK"
- weight: number (0–1, must sum to 1.0 across all components)
- threshold: number (minimum score needed in this component to pass overall)
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
- **Format**: JSON stringified object stored under key "repota_data"
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
[src/utils/idbStorage.ts](../src/utils/idbStorage.ts) (lines 235–250):
- **createBackupHeartbeat()**: Stores timestamp of each successful save
- **detectDataLoss()**: Compares stored heartbeat with current time
- **Alert logic**: If heartbeat exists but student data is empty, warns user that Android cleaner app may have wiped storage
- Helps teacher recover from accidental data deletion

### **No Backend Sync**
- **Current state**: All data stored locally; no backend integration
- **Future capability**: [src/api/config.ts](../src/api/config.ts) has `API_CONFIG.MODE` toggle for switching to Supabase, but not currently enabled
- **Offline-first design**: App works 100% offline; no internet required

### **Export/Import**
[src/utils/fileExport.ts](../src/utils/fileExport.ts) (if exists):
- Export: Encrypts entire app state with **AES-256-GCM** using password-derived key (PBKDF2)
- Import: Decrypts file and validates schema before merging into IndexedDB
- Format: `.repota` (encrypted JSON binary)

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

#### **Missing Error Handling: IndexedDB Quota Exceeded**
- **File**: [src/utils/idbStorage.ts](../src/utils/idbStorage.ts)
- **Issue**: No explicit handling for `QuotaExceededError` when saving large datasets (e.g., many high-res student photos)
- **Current fallback**: Likely reverts to localStorage (5–10 MB), but doesn't warn user
- **Recommendation**: Add quota detection and user alert before exceeding limits

#### **Virtual Scrolling Threshold Undocumented**
- **File**: [src/components/StudentList.tsx](../src/components/StudentList.tsx)
- **Issue**: Uses TanStack Virtual to handle large lists, but threshold for enabling is not documented
- **Question**: At how many students does virtual scrolling kick in? What's the expected max student count?
- **Recommendation**: Document performance characteristics and tested max class size

#### **Analytics Calculation - Gender Assumption**
- **File**: [src/analytics/analyticsCalculator.ts](../src/analytics/analyticsCalculator.ts)
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
- 🔸 IndexedDB quota exceeded error handling is missing
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
- **Analytics**: [analyticsCalculator.ts](../src/analytics/analyticsCalculator.ts)
- **Remarks**: [remarkGenerator.ts](../src/utils/remarkGenerator.ts)
- **UI Pages**: [Dashboard.tsx](../src/pages/Dashboard.tsx), [Settings.tsx](../src/pages/Settings.tsx), [Analytics.tsx](../src/pages/Analytics.tsx), [PrintPreview.tsx](../src/pages/PrintPreview.tsx)

**Document created**: docs/codebase-inventory.md

