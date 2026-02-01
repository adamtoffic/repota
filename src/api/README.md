# API Layer Documentation

## Overview

The API abstraction layer allows Repota to seamlessly switch between **offline-first (local mode)** and **backend integration** without changing application code.

## Current Status

✅ **Local Mode Active** - All data stored in IndexedDB (offline-first)  
🚧 **Backend Mode Ready** - API layer prepared for server integration

## Quick Start

### Local Mode (Default)
No configuration needed. App works offline with IndexedDB storage.

### Backend Mode
1. Create `.env` file:
```env
VITE_API_MODE=backend
VITE_API_BASE_URL=https://api.repota.com
```

2. Restart dev server:
```bash
npm run dev
```

## Architecture

### Files
- `config.ts` - Environment configuration and mode detection
- `client.ts` - HTTP client with retry logic, timeouts, error handling
- `studentApi.ts` - Student CRUD operations
- `settingsApi.ts` - School settings operations  
- `analyticsApi.ts` - Event tracking and stats aggregation
- `index.ts` - Central export point

### Key Features

**Smart Mode Detection**
```typescript
import { isLocalMode, isBackendMode } from '@/api';

if (isLocalMode()) {
  // Use IndexedDB
} else {
  // Call backend API
}
```

**Automatic Retry Logic**
- Max 3 retries with exponential backoff
- 10-second timeout per request
- No retry on 4xx errors (client mistakes)

**Error Handling**
```typescript
try {
  const students = await fetchStudents();
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.status, error.code);
  }
}
```

**Analytics Offline Queue**
```typescript
// Events queued when offline, synced when online
await trackEvent('student_created', { id, name });
```

## Integration Example

### Current (Local Mode)
```typescript
// SchoolContext.tsx
const students = await loadFromStorage(IDB_KEYS.STUDENTS);
```

### Future (Backend Mode)
```typescript
// SchoolContext.tsx
import { fetchStudents } from '@/api';

const students = await fetchStudents(); // Automatically uses backend
```

## Backend API Contract

### Expected Endpoints

**Students**
- `GET /api/students` - List all students
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `POST /api/students/bulk` - Bulk create

**Settings**
- `GET /api/settings` - Fetch school settings
- `PUT /api/settings` - Update settings

**Analytics**
- `POST /api/analytics/events` - Batch event tracking
- `GET /api/analytics/stats` - Aggregated stats

### Response Format
```typescript
// Success
{
  "students": [...],
  "total": 45,
  "timestamp": "2026-02-01T10:30:00Z"
}

// Error
{
  "message": "Student not found",
  "code": "STUDENT_NOT_FOUND",
  "status": 404
}
```

## Migration Path

1. ✅ **Phase 1: API Layer** (DONE)
2. **Phase 2: Optimistic Updates** (Next)
   - Update UI immediately
   - Sync to backend in background
   - Handle conflicts

3. **Phase 3: Sync Queue** (Later)
   - Persist failed requests
   - Retry on reconnection
   - Background sync via Service Worker

4. **Phase 4: Real-time** (Optional)
   - WebSocket integration
   - Live updates across devices

## Testing

```bash
# Test local mode (default)
npm run dev

# Test backend mode
echo "VITE_API_MODE=backend" > .env
echo "VITE_API_BASE_URL=http://localhost:3000/api" >> .env
npm run dev
```

## Notes

- **Zero Breaking Changes** - Existing code unaffected
- **Offline-First Preserved** - Works without internet
- **Progressive Enhancement** - Backend optional, not required
- **Type Safety** - Full TypeScript support throughout
