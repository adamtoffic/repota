# Code Patterns & Architecture Audit - Repota

## 🔴 CRITICAL: Deprecated Pattern Found

### 1. **React.FormEvent is Deprecated**

**Locations Found**:

- `src/pages/Settings.tsx` line 210
- `src/components/StudentList.tsx` line 44

**Current (WRONG)**:

```typescript
const handleSave = (e: React.FormEvent) => {
  e.preventDefault();
  // ...
};
```

**Should Be (CORRECT)**:

```typescript
const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // ...
};
```

**Why it matters**:

- `React.FormEvent` without generic is deprecated
- TypeScript will show warnings
- The type doesn't actually exist in newer React versions
- Should use `FormEvent<HTMLFormElement>` for form submissions
- Should use `ChangeEvent<HTMLInputElement>` for input changes

---

## ✅ CURRENT FORM HANDLING PATTERNS

### 1. **Form State Management**

**Pattern: Controlled Components with useState**

```typescript
// ✅ GOOD: Settings.tsx
const [formData, setFormData] = useState<SchoolSettings>(settings);

const handleFormChange = (field: keyof SchoolSettings, value: string | number) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
};

// ✅ GOOD: Detects unsaved changes
const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(settings);
```

**Pros**:

- ✅ Simple and straightforward
- ✅ Works well for small-medium forms
- ✅ Good TypeScript support
- ✅ Easy to understand

**Cons**:

- ❌ Manual state management
- ❌ No built-in validation
- ❌ Verbose for complex forms
- ❌ No field-level dirty tracking

### 2. **Input Handling Pattern**

**Current Pattern**:

```typescript
<Input
  label="School Name"
  value={formData.schoolName}
  onChange={(e) => handleFormChange({ schoolName: e.target.value })}
/>
```

**Analysis**:

- ✅ Clean and readable
- ✅ Type-safe
- ✅ Component-based (reusable Input component)
- ✅ Consistent across codebase

### 3. **Form Validation**

**Current State**: MINIMAL

```typescript
// SubjectRow.tsx - Only validation found
if (rawScore > 100) {
  setExamScoreError(`Exam score cannot exceed 100`);
  return;
}
```

**Missing**:

- ❌ No schema-based validation
- ❌ No field-level validation
- ❌ No async validation
- ❌ No validation libraries (zod, yup, etc.)

---

## 📊 FORM LIBRARY COMPARISON

### Option 1: Keep Current Pattern (useState)

**Use When**:

- Simple forms (< 10 fields)
- No complex validation needed
- No field dependencies
- Read-heavy, write-light use cases

**Your Current Forms**:

- ✅ Settings page: 15 fields - borderline
- ✅ Student Details: 8 fields - good
- ✅ Add Student modal: 2 fields - perfect
- ❌ Score Entry: Complex nested data - needs improvement

### Option 2: React Hook Form

```bash
npm install react-hook-form @hookform/resolvers zod
```

**Best For**:

- Complex forms
- Field-level validation
- Performance (no re-renders on every keystroke)
- Form arrays (like your subjects array!)

**Example**:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, "Name required"),
  dateOfBirth: z.string().optional(),
  attendancePresent: z.number().min(0).max(365)
});

function DetailsTab() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: student
  });

  return (
    <form onSubmit={handleSubmit(onUpdate)}>
      <Input
        label="Full Name"
        {...register("name")}
        error={errors.name?.message}
      />
      <Input
        label="Days Present"
        type="number"
        {...register("attendancePresent", { valueAsNumber: true })}
        error={errors.attendancePresent?.message}
      />
    </form>
  );
}
```

**Pros**:

- ✅ Minimal re-renders
- ✅ Built-in validation
- ✅ Field arrays support (perfect for subjects!)
- ✅ TypeScript support
- ✅ 8.5KB gzipped

**Cons**:

- ❌ Learning curve
- ❌ Different API from useState
- ❌ Refactoring effort

### Option 3: Formik

**Verdict**: ❌ DON'T USE

- Heavier than React Hook Form
- More re-renders
- Older API
- Being replaced by React Hook Form in most projects

---

## 🎯 TANSTACK QUERY ASSESSMENT

### Current State: Pure Client-Side (IndexedDB)

```typescript
// SchoolContext.tsx
const [students, setStudents] = useState<StudentRecord[]>([]);

useEffect(() => {
  const loadStudents = async () => {
    const data = await loadFromStorage(IDB_KEYS.STUDENTS);
    setStudents(data || []);
  };
  loadStudents();
}, []);

useEffect(() => {
  saveToStorage(IDB_KEYS.STUDENTS, debouncedStudents);
}, [debouncedStudents]);
```

### TanStack Query (React Query) Analysis

#### ❌ DON'T USE NOW (V1)

**Reasons**:

1. **No Backend API**: You're using IndexedDB locally
   - TanStack Query is designed for HTTP requests
   - Your data is already local
   - No server to query

2. **Different Use Case**:
   - TanStack Query: Caching SERVER data
   - Your App: Managing LOCAL state
   - No network requests = no caching needed

3. **Unnecessary Complexity**:

   ```typescript
   // Current (Simple)
   const students = await loadFromStorage(IDB_KEYS.STUDENTS);

   // With TanStack Query (Overkill for local storage)
   const { data: students } = useQuery({
     queryKey: ["students"],
     queryFn: () => loadFromStorage(IDB_KEYS.STUDENTS),
     staleTime: Infinity,
   });
   ```

#### ✅ USE IN V2 (When Backend is Ready)

**Perfect For**:

```typescript
// V2 with Supabase/Backend
import { useQuery, useMutation } from "@tanstack/react-query";

function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents, // Calls backend API
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStudent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

// Usage
function Dashboard() {
  const { data: students, isLoading } = useStudents();
  const updateMutation = useUpdateStudent();

  const handleUpdate = (student) => {
    updateMutation.mutate(student);
  };
}
```

**Benefits in V2**:

- ✅ Automatic caching
- ✅ Background refetching
- ✅ Optimistic updates
- ✅ Request deduplication
- ✅ Offline support with retries
- ✅ Invalidation strategies

---

## 🏗️ RECOMMENDED ARCHITECTURE FOR V1→V2 TRANSITION

### Phase 1: V1 (Current - Local Only) ✅ CORRECT

```typescript
// Keep current pattern
const [students, setStudents] = useState<StudentRecord[]>([]);
const [settings, setSettings] = useState<SchoolSettings>(defaultSettings);

// Load from IndexedDB
useEffect(() => {
  loadFromStorage(IDB_KEYS.STUDENTS).then(setStudents);
}, []);

// Save to IndexedDB (debounced)
useEffect(() => {
  saveToStorage(IDB_KEYS.STUDENTS, debouncedStudents);
}, [debouncedStudents]);
```

**Status**: ✅ **PERFECT** - Don't change this

### Phase 2: Prepare for V2 (Add API Layer)

**Create abstraction now, implement later**:

```typescript
// src/api/students.ts (create this)
export async function fetchStudents(): Promise<StudentRecord[]> {
  if (import.meta.env.VITE_USE_BACKEND) {
    // V2: Call backend
    const response = await fetch("/api/students");
    return response.json();
  } else {
    // V1: Use IndexedDB
    return loadFromStorage(IDB_KEYS.STUDENTS) || [];
  }
}

export async function saveStudents(students: StudentRecord[]): Promise<void> {
  if (import.meta.env.VITE_USE_BACKEND) {
    // V2: Call backend
    await fetch("/api/students", {
      method: "PUT",
      body: JSON.stringify(students),
    });
  } else {
    // V1: Use IndexedDB
    await saveToStorage(IDB_KEYS.STUDENTS, students);
  }
}

// SchoolContext.tsx - Use abstraction
useEffect(() => {
  fetchStudents().then(setStudents);
}, []);
```

**Check** `src/api/` - **YOU ALREADY HAVE THIS!** ✅

```typescript
// src/api/studentApi.ts (EXISTS)
export async function fetchStudents(): Promise<StudentRecord[]> {
  if (isLocalMode()) {
    return loadFromStorage(IDB_KEYS.STUDENTS) || [];
  }
  // Backend mode
  const endpoint = getEndpoint("/students");
  const response = await httpClient.get<StudentApiResponse>(endpoint);
  return response.students;
}
```

**Action**: ✅ **ALREADY PREPARED FOR V2** - Just needs backend URL

### Phase 3: V2 (Add TanStack Query)

```bash
npm install @tanstack/react-query
```

```typescript
// app.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <SchoolProvider>
    {/* app */}
  </SchoolProvider>
</QueryClientProvider>

// hooks/useStudents.ts
export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: fetchStudents, // Uses API abstraction
    staleTime: 5 * 60 * 1000,
  });
}

// SchoolContext.tsx
const { data: students, isLoading } = useStudents();
```

---

## 📋 IMMEDIATE ACTION ITEMS

### 1. Fix Deprecated FormEvent ⚠️ CRITICAL

**Files to update**:

- [ ] `src/pages/Settings.tsx` line 210
- [ ] `src/components/StudentList.tsx` line 44

**Change**:

```typescript
// BEFORE
const handleSave = (e: React.FormEvent) => {

// AFTER
const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
```

### 2. Add Form Validation (Optional but Recommended)

**For complex forms only** (Settings page, Score Entry):

```bash
npm install react-hook-form @hookform/resolvers zod
```

**Start with Settings page** (most complex form):

- Create schema in `src/schemas/settingsSchema.ts`
- Refactor Settings to use React Hook Form
- Get validation for free

### 3. Keep Current Patterns for Simple Forms ✅

**Don't change these**:

- ✅ Add Student modal (2 fields)
- ✅ Student List search (1 field)
- ✅ Any form < 5 fields

---

## 📊 DECISION MATRIX

| Pattern             | When to Use                                                                | When NOT to Use                                            |
| ------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **useState**        | Simple forms (< 5 fields)<br>No validation needed<br>Quick prototypes      | Complex forms<br>Field arrays<br>Cross-field validation    |
| **React Hook Form** | Complex forms<br>Performance critical<br>Field arrays<br>Schema validation | Simple forms<br>Tight deadlines<br>Team unfamiliar with it |
| **TanStack Query**  | Backend API exists<br>Server data caching<br>Real-time sync                | Local-only apps<br>No backend<br>Simple CRUD               |

---

## 🎯 RECOMMENDATIONS

### For V1 (Current)

1. ✅ **Fix FormEvent deprecation** (30 min)
2. ✅ **Keep useState for simple forms**
3. ❌ **Don't add TanStack Query** (no backend yet)
4. ⚠️ **Consider React Hook Form for Settings page** (optional, 2-3 hours)

### For V2 (Future)

1. ✅ **Use existing API layer** (already prepared!)
2. ✅ **Add TanStack Query** when backend is ready
3. ✅ **Add Zod validation** for all forms
4. ✅ **Implement optimistic updates**

---

## 🔍 CODE QUALITY SUMMARY

### ✅ What You're Doing RIGHT

1. **Component Library**: Input, Button, Alert - DRY ✅
2. **TypeScript**: Strong typing everywhere ✅
3. **API Abstraction**: Already prepared for backend ✅
4. **IndexedDB**: Using `idb` library correctly ✅
5. **Debouncing**: Saves performance ✅
6. **Controlled Components**: Proper React patterns ✅

### ⚠️ Areas for Improvement

1. **FormEvent Type**: Need generic parameter
2. **Validation**: Add schema validation for complex forms
3. **Error Handling**: More consistent error UI
4. **Loading States**: Add loading indicators for async operations

### 🚀 Your Architecture Score: **8.5/10**

**Strong Points**:

- Already abstracted data layer
- Clean component structure
- Performance optimizations in place
- Prepared for scaling

**Room for Growth**:

- Form validation
- Error boundaries
- Type deprecation fixes

---

## 📖 FINAL VERDICT

**Don't add TanStack Query now.** Your current architecture is:

1. ✅ Correct for local-only app
2. ✅ Already prepared for backend (API layer exists)
3. ✅ Using IndexedDB efficiently
4. ✅ Will work seamlessly with TanStack Query in V2

**Just fix the FormEvent deprecation and you're golden!** 🌟
