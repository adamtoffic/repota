# Repota v2 Architecture Plan

## Vision: From Single-Teacher Tool → Collaborative School Platform

---

## 🎯 The Vision

**v1 (Current):** Free offline tool for individual teachers  
**v2 (Future):** Collaborative platform with school/district/national analytics

### The Problem We're Solving

1. **No Collaboration** - Multiple teachers can't work on same class simultaneously
2. **Manual Handoffs** - File sharing between class teacher → subject teachers → headteacher
3. **No Analytics** - Schools can't see performance trends across classes
4. **Offline Limitation** - Changes don't sync when teachers work offline

### The Solution

**Multi-tier collaborative system:**

- **Free Tier**: Solo teachers (current local mode) - unlimited forever
- **School Tier**: Multiple teachers collaborate on shared classes
- **District/Regional/National**: Analytics dashboards (future)

---

## 👥 User Roles & Permissions

### Role Hierarchy

```
School Admin (Principal/Admin Staff)
  ├─ Headteacher
  ├─ Class Teachers
  └─ Subject Teachers
```

### Permissions Matrix

| Action                    | School Admin | Headteacher | Class Teacher     | Subject Teacher            |
| ------------------------- | ------------ | ----------- | ----------------- | -------------------------- |
| Add/Remove Teachers       | ✅           | ❌          | ❌                | ❌                         |
| Create Classes            | ✅           | ✅          | ❌                | ❌                         |
| Manage Students           | ✅           | ✅          | ✅ (own class)    | ❌                         |
| Enter Scores              | ✅           | ✅          | ✅ (all subjects) | ✅ (assigned subject only) |
| Write Teacher Remarks     | ✅           | ✅          | ✅ (own class)    | ❌                         |
| Write Headteacher Remarks | ✅           | ✅          | ❌                | ❌                         |
| Mark Attendance           | ✅           | ✅          | ✅ (own class)    | ❌                         |
| Approve Reports           | ✅           | ✅          | ❌                | ❌                         |
| View School Analytics     | ✅           | ✅          | ✅ (own class)    | ✅ (assigned subjects)     |
| Export Reports            | ✅           | ✅          | ✅ (own class)    | ✅ (assigned students)     |

---

## 🗄️ Database Schema (Supabase)

### Core Tables

```sql
-- Organizations (Schools)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  motto TEXT,
  logo_url TEXT,
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,
  level TEXT NOT NULL, -- KG, PRIMARY, JHS, SHS
  subscription_tier TEXT DEFAULT 'free', -- free, school, district
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers/Users
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal Info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Role & Status
  role TEXT NOT NULL, -- 'admin', 'headteacher', 'class_teacher', 'subject_teacher'
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'pending'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,

  UNIQUE(school_id, email)
);

-- Classes
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Class Info
  name TEXT NOT NULL, -- "Class 6A", "Primary 3"
  class_teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  class_size INTEGER DEFAULT 30,

  -- Academic Period
  academic_year TEXT NOT NULL,
  term TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(school_id, name, academic_year, term)
);

-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,

  -- Personal Info
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
  date_of_birth TEXT,
  picture_url TEXT,

  -- Academic Info
  attendance_present INTEGER DEFAULT 0,
  conduct TEXT,
  interest TEXT,
  teacher_remark TEXT,
  headteacher_remark TEXT,
  promotion_status TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(school_id, class_id, name)
);

-- Subjects (School-wide subject catalog)
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  code TEXT, -- "MATH", "ENG", "SCI"
  level TEXT, -- "PRIMARY", "JHS", etc.

  UNIQUE(school_id, name, level)
);

-- Subject Assignments (Which teacher teaches which subject in which class)
CREATE TABLE subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(class_id, subject_id)
);

-- Student Scores (Granular score tracking)
CREATE TABLE student_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,

  -- Scores
  class_score DECIMAL(5,2) DEFAULT 0,
  exam_score DECIMAL(5,2) DEFAULT 0,
  class_score_components JSONB, -- Breakdown: [{"name": "Quiz 1", "score": 10, "max": 10}]

  -- Tracking
  entered_by UUID REFERENCES teachers(id),
  last_modified_by UUID REFERENCES teachers(id),
  last_modified_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, subject_id)
);

-- Activity Log (Audit trail)
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Who & What
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  teacher_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'created_student', 'updated_score', 'approved_report'

  -- Context
  entity_type TEXT, -- 'student', 'score', 'class'
  entity_id UUID,
  changes JSONB, -- Before/after data

  -- When
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes for Performance

```sql
-- Students
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_class ON students(class_id);
CREATE INDEX idx_students_name ON students(name);

-- Teachers
CREATE INDEX idx_teachers_school ON teachers(school_id);
CREATE INDEX idx_teachers_role ON teachers(role);

-- Scores
CREATE INDEX idx_scores_student ON student_scores(student_id);
CREATE INDEX idx_scores_subject ON student_scores(subject_id);

-- Activity
CREATE INDEX idx_activity_school ON activity_log(school_id);
CREATE INDEX idx_activity_teacher ON activity_log(teacher_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
```

### Row Level Security (RLS)

```sql
-- Teachers can only see their school's data
CREATE POLICY "Teachers see own school data"
  ON students FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM teachers
      WHERE auth_user_id = auth.uid()
    )
  );

-- Subject teachers can only update scores for assigned subjects
CREATE POLICY "Subject teachers update assigned subjects"
  ON student_scores FOR UPDATE
  USING (
    subject_id IN (
      SELECT subject_id FROM subject_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Class teachers can update students in their class
CREATE POLICY "Class teachers update own class"
  ON students FOR UPDATE
  USING (
    class_id IN (
      SELECT id FROM classes
      WHERE class_teacher_id IN (
        SELECT id FROM teachers WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Headteachers and admins have full access
CREATE POLICY "Headteachers full access"
  ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE auth_user_id = auth.uid()
      AND role IN ('headteacher', 'admin')
      AND school_id = students.school_id
    )
  );
```

---

## 🔐 Authentication Strategy (Cost-Optimized)

### Problem: Email-based auth is expensive

- Email verification sends emails (costs scale with users)
- Forgot password = more emails
- Most teachers don't have/check email regularly

### Solution: School-Managed Accounts

**Flow:**

1. **School Admin Signs Up** (One-time, email-based)

   ```
   Admin → Creates school account → Pays (if needed)
   ```

2. **Admin Creates Teacher Accounts** (No email required!)

   ```sql
   -- Admin creates teacher with simple credentials
   INSERT INTO teachers (school_id, name, role)
   VALUES ('school-123', 'Mr. Mensah', 'class_teacher');

   -- Generate simple login: teacher phone + PIN
   -- Example: 0241234567 + PIN: 1234
   ```

3. **Teacher First Login**

   ```
   Teacher enters: Phone + Initial PIN (given by admin)
   Teacher sets: New PIN + Security Question
   System creates: auth.users entry (no email!)
   ```

4. **Subsequent Logins**
   ```
   Phone + PIN → Access granted
   Can enable biometric after first login
   ```

### Implementation with Supabase

```typescript
// Admin creates teacher account
async function createTeacherAccount(
  schoolId: string,
  teacherData: {
    name: string;
    phone: string;
    role: "class_teacher" | "subject_teacher" | "headteacher";
  },
) {
  // Generate initial PIN
  const initialPIN = generateRandomPIN(); // 4-digit

  // Create teacher record (pending status)
  const { data: teacher } = await supabase
    .from("teachers")
    .insert({
      school_id: schoolId,
      name: teacherData.name,
      phone: teacherData.phone,
      role: teacherData.role,
      status: "pending",
    })
    .select()
    .single();

  // Store initial PIN securely (hashed)
  await supabase.from("teacher_credentials").insert({
    teacher_id: teacher.id,
    phone: teacherData.phone,
    pin_hash: await hashPIN(initialPIN),
    requires_setup: true,
  });

  // Return credentials for admin to share
  return {
    teacherId: teacher.id,
    phone: teacherData.phone,
    initialPIN, // Admin shares this with teacher
  };
}

// Teacher first-time setup
async function claimTeacherAccount(phone: string, initialPIN: string, newPIN: string) {
  // Verify initial PIN
  const valid = await verifyInitialPIN(phone, initialPIN);
  if (!valid) throw new Error("Invalid credentials");

  // Create auth.users entry (no email!)
  const { data: authUser } = await supabase.auth.signUp({
    email: `${phone}@internal.repota.com`, // Fake email for Supabase
    password: newPIN + phone, // Derived password
    options: {
      data: {
        phone: phone,
        is_teacher: true,
      },
    },
  });

  // Link teacher record to auth user
  await supabase
    .from("teachers")
    .update({
      auth_user_id: authUser.user.id,
      status: "active",
    })
    .eq("phone", phone);

  return authUser;
}
```

### Cost Analysis

**Email-based (expensive):**

- Email verification: ~$1 per 1000 emails
- Forgot password: ~$0.50 per reset
- 100 teachers = $100-200/year just for emails

**Phone + PIN (cheap):**

- No emails sent
- Admin creates accounts
- Simple PIN recovery via admin
- **Cost: $0** 🎉

---

## 📊 Analytics Architecture

### Hierarchy Levels

```
National Dashboard
  ├─ Regional Dashboards (Multiple regions)
  │   ├─ District Dashboards (Multiple districts)
  │   │   ├─ School Dashboards (Multiple schools)
  │   │   │   ├─ Class Dashboards (Multiple classes)
  │   │   │   │   └─ Individual Students
```

### Data Aggregation Strategy

**Option 1: Real-time Calculation** (Simple, slower for large datasets)

```typescript
// Calculate on-demand
const schoolStats = await calculateSchoolStats(schoolId);
```

**Option 2: Materialized Views** (Fast, Supabase-native)

```sql
-- Pre-computed school statistics
CREATE MATERIALIZED VIEW school_analytics AS
SELECT
  school_id,
  COUNT(DISTINCT students.id) as total_students,
  AVG((class_score + exam_score)) as average_score,
  COUNT(CASE WHEN (class_score + exam_score) >= 70 THEN 1 END) as top_performers
FROM students
JOIN student_scores ON students.id = student_scores.student_id
GROUP BY school_id;

-- Refresh daily via cron
REFRESH MATERIALIZED VIEW school_analytics;
```

**Option 3: Aggregation Tables** (Recommended)

```sql
-- Daily aggregation job
CREATE TABLE school_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  date DATE NOT NULL,

  total_students INTEGER,
  total_classes INTEGER,
  average_score DECIMAL(5,2),
  top_performers INTEGER,
  needs_improvement INTEGER,

  UNIQUE(school_id, date)
);

-- Triggered after score updates
CREATE OR REPLACE FUNCTION update_school_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate stats for affected school
  INSERT INTO school_daily_stats (school_id, date, ...)
  VALUES (NEW.school_id, CURRENT_DATE, ...)
  ON CONFLICT (school_id, date)
  DO UPDATE SET ...;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Dashboard Components

**School Dashboard:**

- Total students across all classes
- Average performance by class
- Subject-wise performance
- Attendance trends
- Top/bottom performers
- Teacher activity log

**District Dashboard:**

- Schools ranked by performance
- Inter-school comparisons
- Resource allocation insights
- Trend analysis

**National Dashboard:**

- Regional comparisons
- Policy impact analysis
- Curriculum effectiveness
- Long-term trends

---

## 💰 Pricing & Cost Structure

### Supabase Costs

**Free Tier (Current v1 users):**

- ✅ Unlimited local-only usage
- ✅ 500MB database
- ✅ 50,000 MAU (monthly active users)
- ✅ Perfect for solo teachers

**Pro Tier ($25/month - For schools):**

- 8GB database (~10,000 students)
- 100,000 MAU
- Daily backups
- Email support

**Estimated School Costs:**

```
Small School (20 teachers, 500 students):
  - Database: ~50MB
  - Storage: ~500MB (if using photos)
  - MAU: 20 teachers
  - Cost: FREE tier ✅

Medium School (50 teachers, 1500 students):
  - Database: ~150MB
  - Storage: ~2GB
  - MAU: 50 teachers
  - Cost: FREE tier ✅

Large School (100 teachers, 3000 students):
  - Database: ~300MB
  - Storage: ~5GB
  - MAU: 100 teachers
  - Cost: Pro ($25/month) or FREE if no photos

District (500 teachers, 50 schools):
  - Database: ~2GB
  - Storage: ~20GB
  - MAU: 500 teachers
  - Cost: Pro ($25/month)
```

### Revenue Model

**Freemium:**

- Free: Solo teachers (unlimited forever)
- School: $10-20/month or $100-150/year per school
- District: $50-100/month or $500-800/year
- Regional/National: Custom enterprise pricing

**Cost Structure:**

- Supabase: $25/month (covers 10-20 schools)
- Gross profit margin: 60-80%
- Break-even: 2-3 paying schools

---

## 🚀 Migration Plan

### Phase 1: Foundation (Week 1-2)

- ✅ Supabase schema (DONE - in SUPABASE-SETUP.md)
- ✅ Authentication flow (DONE - in supabase.ts)
- ✅ Student API (DONE - in studentApiSupabase.ts)
- 🔄 Settings API for schools
- 🔄 Teacher management API
- 🔄 Class management API

### Phase 2: Multi-User (Week 3-4)

- Role-based permissions
- Subject assignments
- Granular score tracking
- Real-time collaboration
- Conflict resolution

### Phase 3: Dashboard (Week 5-6)

- School analytics
- Class analytics
- Subject analytics
- Activity logs
- Export/reports

### Phase 4: Onboarding (Week 7-8)

- School signup flow
- Teacher invitation system
- Data migration from v1
- Billing integration

### Phase 5: Advanced (Week 9-12)

- District dashboards
- Offline sync improvements
- Mobile optimizations
- Performance tuning

---

## 🎨 UX Flow Changes

### Current (v1):

```
Teacher → Dashboard → Add Students → Enter Scores → Print
```

### Future (v2):

**School Admin:**

```
Sign Up → Create School → Add Teachers → Assign Classes → View Analytics
```

**Class Teacher:**

```
Login → Select Class → View Students → Enter Scores → Write Remarks → Request Approval
```

**Subject Teacher:**

```
Login → View Assigned Subjects → Enter Scores (Subject only) → Done
```

**Headteacher:**

```
Login → View Pending Reports → Add Final Remarks → Approve → Print
```

---

## 🔧 Technical Stack

**Frontend (No changes):**

- React + TypeScript
- TanStack Router
- Tailwind CSS
- IndexedDB (offline cache)

**Backend:**

- Supabase (PostgreSQL + Auth + Realtime + Storage)
- Row Level Security
- Database functions
- Triggers for analytics

**Infrastructure:**

- Vercel (frontend hosting)
- Supabase (backend)
- Cloudflare (CDN for assets)

---

## 📈 Success Metrics

**v1 Metrics (Current):**

- Number of downloads
- Reports generated

**v2 Metrics (Future):**

- Schools onboarded
- Active teachers (MAU)
- Reports generated per school
- Average scores entered per teacher
- Retention rate
- Churn rate
- MRR (Monthly Recurring Revenue)
- Customer acquisition cost

---

## ❓ Open Questions to Resolve

1. **Ghana Education System Integration:**
   - Do we need GES approval/certification?
   - Can we integrate with existing GES systems?
   - What data privacy laws apply?

2. **Offline Sync Strategy:**
   - How to handle conflicts when 2 teachers edit same student offline?
   - Queue size limits?
   - Sync frequency?

3. **Report Approval Workflow:**
   - Linear (Teacher → Headteacher) or flexible?
   - Can headteacher edit scores or just remarks?
   - Version history for auditing?

4. **Data Ownership:**
   - Can schools export all data?
   - What happens when subscription ends?
   - Data retention policy?

5. **Multi-School Teachers:**
   - Can a teacher belong to multiple schools?
   - How to switch between schools?
   - Separate logins or unified?

---

## 🎯 Next Steps

1. **Validate Assumptions:**
   - Interview 3-5 school admins
   - Test role permissions with real teachers
   - Confirm pricing willingness

2. **Build MVP:**
   - Complete Supabase schema
   - Implement role-based access
   - Basic school dashboard
   - Teacher management

3. **Beta Test:**
   - Onboard 2-3 pilot schools
   - Gather feedback
   - Iterate quickly

4. **Launch:**
   - Marketing to schools
   - GES outreach
   - Scale infrastructure

---

**This architecture supports your vision while keeping costs low and user experience simple.**

Let's start implementing! Which phase should we tackle first?
