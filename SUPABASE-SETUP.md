# Supabase Integration Guide

## ✅ Perfect Fit!

Your Repota project is **100% compatible** with Supabase! The offline-first architecture you already have works perfectly with Supabase's features.

## Quick Setup (5 minutes)

### 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key

### 3. Configure Environment

Create `.env` file:

```env
VITE_API_MODE=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Database Migration

```sql
-- Create students table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  date_of_birth TEXT,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
  attendance_present INTEGER,
  teacher_remark TEXT,
  conduct TEXT,
  interest TEXT,
  picture_url TEXT,
  promotion_status TEXT,
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  level TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students
CREATE POLICY "Users can view their own students"
  ON students FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own students"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own students"
  ON students FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own students"
  ON students FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for settings
CREATE POLICY "Users can view their own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_name ON students(name);
CREATE INDEX idx_settings_user_id ON settings(user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
```

### 5. Update Import Statements

Replace:
```typescript
import { fetchStudents, createStudent } from '@/api/studentApi';
```

With:
```typescript
import { fetchStudents, createStudent } from '@/api/studentApiSupabase';
```

## Features You Get

### ✅ Already Built

1. **Offline-First** - Your IndexedDB layer stays, syncs when online
2. **Type Safety** - Database types defined in `supabase.ts`
3. **Row Level Security** - Users only see their data
4. **Real-time Sync** - `subscribeToStudents()` for live updates
5. **Authentication** - Can integrate with your PIN/biometric

### 🚀 What Supabase Adds

1. **Cloud Backup** - Data safe in PostgreSQL
2. **Multi-Device Sync** - Access from phone, tablet, laptop
3. **Real-time Collaboration** - Multiple teachers can work together
4. **File Storage** - Upload profile pictures, signatures, logos
5. **Analytics** - Built-in metrics and monitoring

## Authentication Flow

### Option 1: Anonymous Auth (Simplest)
```typescript
// User clicks "Start Using App"
const { data, error } = await supabase.auth.signInAnonymously();
// Their data is private, tied to device
```

### Option 2: PIN + Supabase Auth
```typescript
// Keep your PIN screen
// After PIN verified, sign in to Supabase
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'teacher@school.com',
  password: derivedFromPIN, // Derive from PIN
});
```

### Option 3: Magic Links
```typescript
// Email-based login, no password
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'teacher@school.com',
});
```

## Real-time Sync Example

```typescript
// In your SchoolContext
useEffect(() => {
  const unsubscribe = subscribeToStudents((updatedStudents) => {
    setStudents(updatedStudents);
    // Cache locally for offline
    saveStudentsLocal(updatedStudents);
  });

  return unsubscribe;
}, []);
```

## Hybrid Mode (Best of Both Worlds)

```typescript
// Load from IndexedDB first (instant UI)
const cachedStudents = await loadFromStorage(IDB_KEYS.STUDENTS);
setStudents(cachedStudents || []);

// Then sync with Supabase in background
if (isBackendMode()) {
  const freshStudents = await fetchStudents();
  setStudents(freshStudents);
  saveStudentsLocal(freshStudents); // Update cache
}
```

## File Upload (Profile Pictures)

```typescript
// Upload student picture
const file = event.target.files[0];
const { data, error } = await supabase.storage
  .from('student-photos')
  .upload(`${userId}/${studentId}.jpg`, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('student-photos')
  .getPublicUrl(`${userId}/${studentId}.jpg`);

// Save to student record
updateStudent(studentId, { pictureUrl: publicUrl });
```

## Migration Strategy

### Phase 1: Install & Test (1 hour)
- Install Supabase client
- Run SQL migration
- Test with 1-2 demo students

### Phase 2: Auth Integration (2-3 hours)
- Choose auth method (anonymous/email/PIN hybrid)
- Add sign-in flow
- Test multi-device sync

### Phase 3: Full Migration (1-2 hours)
- Import existing data
- Switch all users to Supabase mode
- Monitor for issues

### Phase 4: Advanced Features (optional)
- Real-time subscriptions
- File storage for images
- Collaborative editing
- Analytics dashboard

## Cost Estimate

**Free Tier (Perfect for testing):**
- 500MB database
- 1GB file storage
- 2GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

**Pro ($25/month):**
- 8GB database
- 100GB file storage
- 50GB bandwidth
- 100,000 MAU

For most teachers/schools, **free tier is more than enough**!

## What Changes in Your Code

### Before (Local Only)
```typescript
// SchoolContext.tsx
const students = await loadFromStorage(IDB_KEYS.STUDENTS);
setStudents(students || []);
```

### After (Supabase)
```typescript
// SchoolContext.tsx
import { fetchStudents } from '@/api/studentApiSupabase';

const students = await fetchStudents(); // Auto-syncs!
setStudents(students);
```

That's it! Everything else stays the same.

## Questions?

Your project is **already architected perfectly** for Supabase:
- ✅ Proper types (StudentRecord, SchoolSettings)
- ✅ Async operations everywhere
- ✅ Offline-first mindset
- ✅ IndexedDB for caching
- ✅ React Context for state

You just need to:
1. Run SQL migration
2. Set environment variables
3. Enjoy cloud sync! 🎉
