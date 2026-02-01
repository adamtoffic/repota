# DRY Refactoring Progress

## Settings.tsx Refactoring

### Completed ✅

- [x] School name, motto, address inputs (3)
- [x] Phone and email inputs (2)
- [x] Private school fees inputs (3) - Just completed

**Total Done: 8/14 inputs**

### Remaining Inputs (6)

- [ ] Class name input (with icon)
- [ ] Class size input
- [ ] Total attendance days input
- [ ] Next term begins (date input)
- [ ] Academic year input
- [ ] Class score max input
- [ ] Exam score max input
- [ ] Head teacher name input
- [ ] Class teacher name input
- [ ] Subject input (inline + button)

### Component Inputs (special cases)

- [ ] New component name input (inline styling)
- [ ] New component max score input (inline styling)

### Buttons to Refactor

- [ ] Add subject button (inline blue button)
- [x] Add component button (already uses Button ✓)
- [ ] Remove subject buttons (X buttons in tags)

### Labels to Refactor

- [ ] Replace all `<Label>` with Input's label prop
- [ ] Remove Label component definition after all replaced

## Approach

1. ✅ Replace inputs in logical groups
2. Test after each group
3. Commit working state
4. Move to next group

## Estimated Time

- Settings.tsx remaining: 30-45 minutes
- DetailsTab.tsx: 20 minutes
- StudentList.tsx: 15 minutes
- Modal components: 45 minutes

**Total: ~2 hours**
