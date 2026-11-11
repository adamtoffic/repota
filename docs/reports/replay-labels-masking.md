# PostHog Session Replay Static Labels Masking Report

## What Changed

- Extended the static label visibility pattern introduced in commit `039d41d` to the remaining pages: **Dashboard** and **Analytics**.
- Added `data-record="true"` to static user-interface labels, table headers, action buttons, tab triggers, and section titles:
  - **Dashboard components**:
    - `src/components/DashboardStats.tsx`: Stat card labels (`{label}`) and capacity warning title.
    - `src/components/DashboardToolbar.tsx`: Filter buttons and action dropdown menu items.
    - `src/components/StudentList.tsx`: Section heading, "Add Student" button, table `<th>` headers (Name, Class, Subjects, Avg. Score, Position, Actions), Add Student modal headers/labels.
    - `src/components/EmptyState.tsx`: Empty state title, description, and action buttons.
    - `src/components/ScoreEntryModal.tsx`: Navigation buttons and tab triggers ("Academic Scores", "Student Details").
    - `src/components/tabs/AcademicTab.tsx`: "Clear All Scores", sync alerts, and cleanup buttons.
    - `src/components/tabs/DetailsTab.tsx`: Section headings, Gender options, Days Present, Promotion, and Save buttons.
    - `src/components/BulkImportModal.tsx`: Modal title, instructions, and workflow buttons.
    - `src/components/ConfirmModal.tsx`: Modal title and confirm/cancel button text.
    - `src/components/ValidationWarnings.tsx`: Warning labels and remediation tips.
    - `src/pages/Dashboard.tsx`: Header navigation links, WhatsApp help card, and search empty state text.
  - **Analytics components & page**:
    - `src/components/analytics/StatCard.tsx`: Metric title (`{title}`) and trend comparison labels.
    - `src/components/analytics/ChartCard.tsx`: Card title (`{title}`) and subtitle.
    - `src/components/analytics/InsightCard.tsx`: Card title (`{title}`) and empty state message.
    - `src/components/analytics/FilterPanel.tsx`: Filter section title, clear button, and filter dropdown labels (Gender, Performance Level, Subject Focus, Score Range).
    - `src/pages/Analytics.tsx`: "Back to Dashboard" buttons, page title, export buttons ("Export CSV", "Export PDF"), view toggle tabs, and table `<th>` headers for Subject Performance Consistency, Detailed Subject Statistics, and Gender Breakdown by Age.
- Kept all dynamic and sensitive student data unmarked and masked:
  - Student names (`student.name`), class scores, exam scores, averages, ranks/positions, remarks, and individual attendance records never receive `data-record="true"` nor have an ancestor with `data-record="true"`.
- Added unit tests in `src/test/PostHogConfig.test.tsx` ensuring:
  - Static labels in Dashboard and Analytics carry `data-record="true"` and are preserved by `maskTextFn`.
  - Dynamic student scores and values do not match `[data-record="true"]` and are masked with asterisks.

## Why

PostHog session replays masked all text content by default, making UI interactions and page context indecipherable during product analytics and debugging. By marking static labels with `data-record="true"`, replays show recognizable navigation and structure while strictly preserving student privacy in compliance with data safety standards.

## What Was Verified

- `PostHogConfig.test.tsx`: Verified that `maskTextFn` unmasks text within elements carrying `data-record="true"` (including nested text/icons) while strictly masking text in elements lacking `data-record="true"`.
- Verified component hierarchy: `StatCard`, `ChartCard`, `InsightCard`, `DashboardStats`, and `StudentList` ensure that dynamic scores and student identifiers are rendered outside `data-record="true"` containers.
- Verification commands:
  - `pnpm lint` (ESLint clean)
  - `pnpm exec tsc -b` (TypeScript build/typecheck clean)
  - `pnpm test run` (Vitest test suite passing)

## What Could NOT Be Verified

- Direct visual rendering inside PostHog Cloud's session replay web player (requires capturing live sessions sent to PostHog cloud servers).

## Summary for reviewer

- Added `data-record="true"` to static labels across Dashboard, modals, and Analytics.
- Table headers, filter buttons, stat titles, and modal headers are visible in replays.
- Student names, scores, positions, remarks, and attendance numbers remain masked.
- Reuses the `maskTextFn` pattern and privacy boundary established in commit `039d41d`.
- No schemas, stored keys, or backup formats were modified.
- No new dependencies were added.
- Comprehensive unit tests added to `src/test/PostHogConfig.test.tsx`.
