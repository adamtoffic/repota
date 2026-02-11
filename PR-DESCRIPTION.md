# PR: Add SBA task categories in Settings and preserve category in student records

## Summary

This PR introduces SBA task categories (e.g., CAT, Group Work, Project, Homework) into settings configuration and ensures those categories are preserved when score components are created for students.

It also updates Settings page language from generic "components" to clearer "tasks/SBA" terminology, improves related UI labeling, and includes a small demo-toast copy cleanup.

## Branch / Comparison

- **Branch:** `chore-SBA`
- **Compared against:** `main`
- **Commits:**
  - `7cba018` feat(settings): add SBA task categories and improve mobile layout
  - `46b1a73` chore: remove Ghanaian names from Demo toast

## Files Changed

- `src/types/index.ts`
- `src/pages/Settings.tsx`
- `src/context/SchoolContext.tsx`

## What Changed

### 1) Type updates for SBA categories

In `src/types/index.ts`:

- Added `AssessmentCategory` type:
  - `"CAT" | "GROUP" | "PROJECT" | "HOMEWORK"`
- Extended score-related interfaces with optional `category`:
  - `ClassScoreComponent.category?: AssessmentCategory`
  - `ClassScoreComponentConfig.category?: AssessmentCategory`

### 2) Settings page: SBA task category support and UX copy updates

In `src/pages/Settings.tsx`:

- Added category state for new tasks:
  - `newComponentCategory` defaulting to `"CAT"`
- When adding to `componentLibrary`, new entries now include:
  - `name`, `maxScore`, and `category`
- Reset category back to `"CAT"` after successful add.
- Updated validation and confirmation copy from **component** to **task** language.
- Updated key labels and helper text to SBA-focused wording, including:
  - “SBA Task Library”
  - “Subject Assessment Config”
  - task/category badges in task chips and subject assignments
- General cleanup/reduction of noisy inline comments in the file.

### 3) Preserve category in generated student score components

In `src/context/SchoolContext.tsx`:

- When components are created from config, now also sets:
  - `category: config.category`
- This ensures task categorization survives from settings into student data.

### 4) Minor copy cleanup

In `src/context/SchoolContext.tsx`:

- Updated demo toast message:
  - From: `"...loaded with Ghanaian names!"`
  - To: `"...loaded!"`

## Why this change

- Makes SBA configuration more explicit and structured.
- Preserves category metadata for downstream grading/reporting logic.
- Improves terminology clarity for users managing assessment setup.

## Scope / Risk

- No API, DB, or migration changes.
- Changes are localized to types, Settings UI behavior/copy, and context mapping.
- Main functional risk area: task creation/assignment flows in Settings.

## Suggested QA checklist

- [ ] In Settings, add a new SBA task with each category and confirm it appears correctly in the library.
- [ ] Assign tasks to subjects and verify category label is displayed.
- [ ] Create/open students and confirm generated score components retain the configured category.
- [ ] Remove a task and confirm delete messaging and behavior are correct.
- [ ] Trigger demo student load and verify updated toast wording.
