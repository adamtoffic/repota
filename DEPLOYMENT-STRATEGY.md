# Deployment Strategy: v1 vs v2

## Dual-Version Architecture for Seamless Launch

---

## 🌐 Domain Structure

```
repota.app
  ├─ Landing Page (Homepage/Marketing)
  ├─ /app → v1 Free Version (Offline-first, no backend)
  └─ /docs → Documentation

app.repota.app
  └─ v2 Collaborative Version (Supabase-backed, multi-tenant)
```

### Why This Works

✅ **Clear Separation**

- Free users: `repota.app/app` (stable, unchanged)
- Paying schools: `app.repota.app` (new features)
- Marketing: `repota.app` (landing page)

✅ **Independent Development**

- v1 repo: Public (current)
- v2 repo: Private (new)
- No interference

✅ **Easy Migration**

- Users can export from v1
- Import to v2 when ready
- Both versions live simultaneously

✅ **Cost Control**

- Free tier stays free forever
- Backend costs only for paying customers
- Gradual scaling

---

## 📁 Repository Structure

### Current Setup (v1 - Public)

```
adamtoffic/repota (Public)
  ├─ Landing page at root
  ├─ App at /app or redirect to repota.app
  ├─ Free, offline-first version
  └─ No Supabase dependency
```

**Deployment:**

- Vercel project: `repota`
- Domain: `repota.app`
- No environment variables needed
- Free Vercel plan

### New Setup (v2 - Private)

```
adamtoffic/repota-v2 (Private)
  ├─ Multi-tenant SaaS
  ├─ Supabase backend
  ├─ Role-based access
  └─ School/district dashboards
```

**Deployment:**

- Vercel project: `repota-v2`
- Domain: `app.repota.app`
- Environment variables:
  ```env
  VITE_API_MODE=supabase
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=xxx
  ```
- Vercel Pro plan (for better performance)

---

## 🚀 Vercel Configuration

### 1. Landing Page (repota.app)

**Project: `repota-landing`**

```json
// vercel.json
{
  "routes": [
    {
      "src": "/app",
      "dest": "https://repota.app/app"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### 2. v1 Free App (repota.app/app)

**Current repo - No changes needed!**

```json
// vercel.json (keep as is)
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 3. v2 Paid App (app.repota.app)

**New private repo**

```json
// vercel.json
{
  "env": {
    "VITE_API_MODE": "supabase"
  },
  "build": {
    "env": {
      "VITE_SUPABASE_URL": "@supabase-url",
      "VITE_SUPABASE_ANON_KEY": "@supabase-key"
    }
  },
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Environment Variables in Vercel:**

- `VITE_SUPABASE_URL` → Encrypted
- `VITE_SUPABASE_ANON_KEY` → Encrypted
- `VITE_API_MODE` → `supabase`

---

## 🔧 DNS Configuration

### Cloudflare/Namecheap Settings

```
Type    Name    Value                      TTL
A       @       76.76.21.21 (Vercel)       Auto
CNAME   app     cname.vercel-dns.com       Auto
CNAME   www     repota.app                 Auto
```

### Vercel Domain Settings

**Project: repota (v1)**

- Primary: `repota.app`
- Aliases: `www.repota.app`

**Project: repota-v2**

- Primary: `app.repota.app`

---

## 📋 Step-by-Step Setup

### Phase 1: Prepare v2 Repository

```bash
# 1. Clone current repo as base
git clone https://github.com/adamtoffic/repota.git repota-v2
cd repota-v2

# 2. Create new private repo on GitHub
# Go to github.com/new → Name: repota-v2 → Private ✅

# 3. Update remote
git remote remove origin
git remote add origin https://github.com/adamtoffic/repota-v2.git

# 4. Clean up (remove landing page stuff if you want)
# Keep only the app code

# 5. Push to new private repo
git push -u origin main
```

### Phase 2: Setup Supabase

```bash
# 1. Go to supabase.com
# 2. Create new project: "repota-v2-prod"
# 3. Run SQL migration from ARCHITECTURE-V2.md
# 4. Copy credentials:
#    - Project URL
#    - Anon/Public key
```

### Phase 3: Deploy v2 to Vercel

```bash
# 1. Connect GitHub repo to Vercel
# - Go to vercel.com/new
# - Import repota-v2 (private repo)

# 2. Configure build settings:
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install

# 3. Add environment variables:
VITE_API_MODE=supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here

# 4. Add custom domain:
app.repota.app
```

### Phase 4: Update Landing Page

Update `repota.app` to have CTAs:

```html
<!-- Hero Section -->
<section>
  <h1>Generate Report Cards in Minutes</h1>

  <!-- Free Version -->
  <a href="/app" class="btn-secondary">
    Try Free Version
    <span>Solo teachers • Offline • No signup</span>
  </a>

  <!-- Paid Version -->
  <a href="https://app.repota.app" class="btn-primary">
    School Edition →
    <span>Multi-teacher • Cloud sync • Analytics</span>
  </a>
</section>

<!-- Feature Comparison -->
<table>
  <thead>
    <tr>
      <th>Feature</th>
      <th>Free</th>
      <th>School</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Report Cards</td>
      <td>✅</td>
      <td>✅</td>
    </tr>
    <tr>
      <td>Offline Mode</td>
      <td>✅</td>
      <td>✅</td>
    </tr>
    <tr>
      <td>Multiple Teachers</td>
      <td>❌</td>
      <td>✅</td>
    </tr>
    <tr>
      <td>Cloud Sync</td>
      <td>❌</td>
      <td>✅</td>
    </tr>
    <tr>
      <td>Analytics Dashboard</td>
      <td>❌</td>
      <td>✅</td>
    </tr>
    <tr>
      <td>Price</td>
      <td>Free Forever</td>
      <td>$15/month</td>
    </tr>
  </tbody>
</table>
```

---

## 🔄 Migration Flow

### User Journey: Free → Paid

```
1. Teacher uses repota.app/app (free version)
2. School admin discovers School Edition
3. Signs up at app.repota.app
4. Creates school account
5. Invites teachers
6. Teachers export from v1, import to v2
7. Continue using both or switch fully
```

### Export/Import Flow

**v1 (Export):**

```typescript
// Already have DataBackup component
// Users can export JSON with all students/settings
```

**v2 (Import):**

```typescript
// New import flow in app.repota.app
async function importFromV1(jsonFile: File) {
  const data = await parseV1Export(jsonFile);

  // Convert to v2 schema
  const students = data.students.map(convertToV2Student);
  const settings = convertToV2Settings(data.settings);

  // Save to Supabase
  await bulkCreateStudents(students);
  await updateSettings(settings);
}
```

---

## 💰 Cost Breakdown

### v1 (repota.app)

- **Hosting:** Free (Vercel Hobby)
- **Storage:** Free (Browser IndexedDB)
- **Bandwidth:** Free (Vercel 100GB/month)
- **Total:** $0/month

### v2 (app.repota.app)

- **Hosting:** $20/month (Vercel Pro for better performance)
- **Database:** $25/month (Supabase Pro - optional, can start free)
- **Storage:** $0 (included in Supabase)
- **Total:** $20-45/month

### Revenue Target

- **Break-even:** 2-3 schools at $15/month
- **Profitable:** 5+ schools = $75/month revenue

---

## 🎯 Rollout Strategy

### Week 1: Setup Infrastructure

- ✅ Create private v2 repo
- ✅ Setup Supabase project
- ✅ Deploy to app.repota.app
- ✅ Test basic functionality

### Week 2: Beta Testing

- Onboard 1-2 pilot schools
- Gather feedback
- Fix critical bugs
- Refine UX

### Week 3: Landing Page Update

- Update repota.app with comparison
- Add "School Edition" CTA
- Create demo video
- Write documentation

### Week 4: Soft Launch

- Announce on social media
- Email existing users (if any)
- GES outreach
- Monitor metrics

### Month 2-3: Iterate & Scale

- Add requested features
- Improve analytics
- Build district dashboards
- Scale infrastructure

---

## 📊 Analytics Tracking

### v1 Metrics (repota.app/app)

```javascript
// Simple analytics (no backend needed)
import { trackEvent } from "@vercel/analytics";

trackEvent("report_generated", {
  students_count: students.length,
  school_level: settings.level,
});
```

### v2 Metrics (app.repota.app)

```typescript
// Full analytics via Supabase
await trackEvent("score_entered", {
  school_id,
  teacher_id,
  subject_id,
  class_id,
});

// Dashboard shows:
// - Daily active teachers
// - Reports generated
// - Average scores entered
// - Feature usage
```

---

## 🔒 Security Considerations

### v1 (Public)

- No backend = No security concerns
- Data stays local
- No PII transmitted

### v2 (Private)

- Row Level Security (RLS) via Supabase
- HTTPS only
- API keys encrypted in Vercel
- Teacher data protected
- Audit logs for compliance

---

## 🚨 Disaster Recovery

### v1 Backup Strategy

```typescript
// Users responsible for own backups
// Export feature already built
```

### v2 Backup Strategy

```sql
-- Supabase automatic backups (Pro plan)
-- Daily snapshots
-- Point-in-time recovery
-- Can restore to any point in last 7 days
```

### Manual Backup Script

```typescript
// Run weekly via GitHub Actions
async function backupAllSchools() {
  const schools = await supabase.from("schools").select("*");

  for (const school of schools) {
    const backup = await exportSchoolData(school.id);
    await uploadToS3(backup); // Optional external backup
  }
}
```

---

## 📱 Mobile Considerations

### v1

- PWA works perfectly
- Offline-first already
- No changes needed

### v2

- Same PWA approach
- Add push notifications for:
  - "Teacher X entered scores"
  - "Report approved by headteacher"
  - "New student added to your class"

---

## 🎓 User Documentation

### Landing Page (repota.app)

- What is Repota?
- Free vs School comparison
- Video tutorials
- FAQs

### v1 Help (repota.app/help)

- How to add students
- How to enter scores
- How to print reports
- How to export data

### v2 Help (app.repota.app/help)

- School signup guide
- Teacher onboarding
- Role permissions
- Analytics guide
- Billing FAQ

---

## ✅ Launch Checklist

### Pre-Launch

- [ ] v2 repo created and private
- [ ] Supabase project setup
- [ ] Database schema deployed
- [ ] RLS policies tested
- [ ] app.repota.app deployed
- [ ] DNS configured
- [ ] SSL certificates active
- [ ] Environment variables set
- [ ] Backup strategy tested

### Launch Day

- [ ] Update repota.app with v2 CTA
- [ ] Social media announcement
- [ ] Email campaign (if applicable)
- [ ] Monitor error logs
- [ ] Customer support ready

### Post-Launch

- [ ] Daily metric reviews
- [ ] Weekly feedback collection
- [ ] Monthly feature updates
- [ ] Quarterly pricing review

---

## 🎉 Benefits of This Approach

1. **Zero Disruption**
   - v1 users unaffected
   - Both versions co-exist
   - Gradual migration

2. **Clean Separation**
   - Private v2 code
   - Independent deployments
   - No merge conflicts

3. **Cost Efficiency**
   - Free users cost $0
   - Paid users cover infrastructure
   - Scalable pricing

4. **Easy Testing**
   - Test v2 without breaking v1
   - Beta users isolated
   - Rollback if needed

5. **Marketing Clarity**
   - Clear value proposition
   - Feature comparison visible
   - Easy upgrade path

---

**Next Step:** Create the private `repota-v2` repository and deploy to `app.repota.app`?

I can help you:

1. Set up the new repository structure
2. Configure Vercel deployment
3. Update the landing page with CTAs
4. Create the migration guide for users
