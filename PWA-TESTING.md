# PWA Testing Guide

## What Was Fixed

### Previous Issues

- ❌ Service worker not registered properly
- ❌ No install prompt shown to users
- ❌ Offline functionality not working after closing/reopening
- ❌ No update notification for new versions

### Current Implementation

- ✅ Automatic service worker registration via vite-plugin-pwa
- ✅ Custom install prompt with user-friendly UI
- ✅ Full offline support with proper caching strategies
- ✅ Auto-update notifications when new versions are available
- ✅ Proper TypeScript support for PWA modules

## How to Test PWA Installation

### Testing Locally (Development)

1. **Start dev server**: `npm run dev`
2. **Open in browser**: http://localhost:5173
3. **Open DevTools** → Application tab → Service Workers
4. **Verify**: Service worker should be registered and running

### Testing Production Build

1. **Build the app**: `npm run build`
2. **Preview production**: `npm run preview`
3. **Open in browser**: http://localhost:4173
4. **Test installation**:
   - Chrome/Edge: Look for install prompt or click the install icon in address bar
   - Mobile: "Add to Home Screen" option should appear

### Testing Offline Functionality

1. **Install the app** (follow steps above)
2. **Go offline**:
   - Chrome DevTools → Network tab → Check "Offline"
   - Or turn off your internet connection
3. **Close the browser/app completely**
4. **Reopen the app** → Should load and work offline ✅

### Testing on Mobile

1. **Deploy to production** (Vercel, Netlify, etc.)
2. **Open site on mobile browser**
3. **After a few seconds**, install prompt should appear
4. **Tap "Install"** → App will be added to home screen
5. **Open from home screen** → Runs like native app
6. **Turn off data/wifi** → App still works offline

## PWA Features Implemented

### 1. Install Prompt

- Appears automatically after visiting the site
- Can be dismissed (won't show again for 7 days)
- Custom UI matching app design
- Shows download icon and clear messaging

### 2. Offline Support

- **Precaching**: HTML, CSS, JS, fonts, and essential images
- **Runtime Caching**:
  - JS/CSS: NetworkFirst (tries network, falls back to cache)
  - Images: CacheFirst (cache first, then network)
  - CDN resources: CacheFirst with 30-day expiration
- **Navigation Fallback**: Shows app even when offline

### 3. Auto-Update

- Checks for updates automatically
- Shows update prompt when new version available
- Users can update immediately or later
- Smooth refresh after update

### 4. Manifest Configuration

- Name: "Repota - GES Report Generator"
- Standalone display mode (no browser UI)
- Custom theme color (#1E3A8A)
- Multiple icon sizes (64x64, 192x192, 512x512)
- Portrait orientation lock
- Properly categorized (education, productivity)

## Verifying PWA Installability

### Using Lighthouse (Chrome DevTools)

1. Open DevTools → Lighthouse tab
2. Select "Progressive Web App" category
3. Click "Analyze page load"
4. Should score 90+ with all PWA criteria passing:
   - ✅ Installable
   - ✅ PWA optimized
   - ✅ Fast and reliable
   - ✅ Works offline

### Manual Checks

- [ ] Service worker registered
- [ ] Manifest.json present and valid
- [ ] HTTPS (required for PWA - automatic on Vercel)
- [ ] Icons in multiple sizes
- [ ] Start URL defined
- [ ] Display mode set to standalone
- [ ] Theme color defined
- [ ] Works offline after installation

## Troubleshooting

### Install prompt not showing?

- **Chrome/Edge**: Install button appears in address bar (right side)
- **Already installed**: Check if app is already in app drawer
- **Dismissed**: Clear localStorage or wait 7 days
- **Requirements not met**: Check Lighthouse PWA audit

### Offline not working?

1. Open DevTools → Application → Service Workers
2. Verify service worker is "activated and running"
3. Check Cache Storage → Should see workbox caches
4. Try hard refresh (Ctrl+Shift+R) then go offline

### Update not appearing?

- Updates only show when new version is deployed
- Try: DevTools → Application → Service Workers → "Update"
- Or: Clear service worker and revisit

## Key Files

- `vite.config.ts` - PWA configuration
- `src/components/PwaInstallPrompt.tsx` - Install prompt UI
- `src/components/PwaUpdatePrompt.tsx` - Update prompt UI (if needed)
- `src/vite-env.d.ts` - TypeScript declarations
- `public/manifest.webmanifest` - PWA manifest (auto-generated)
- `dist/sw.js` - Service worker (auto-generated)

## Deployment Checklist

Before deploying:

- [x] Build succeeds without errors
- [x] Service worker generates properly
- [x] Manifest is valid
- [x] Icons exist in public folder
- [x] HTTPS enabled (automatic on most hosts)
- [x] Test offline functionality locally

After deploying:

- [ ] Visit deployed URL
- [ ] Check DevTools for any errors
- [ ] Verify install prompt appears
- [ ] Install and test offline
- [ ] Test on mobile device
- [ ] Run Lighthouse PWA audit

## Browser Support

- ✅ Chrome/Edge (full support)
- ✅ Safari (iOS 16.4+)
- ✅ Firefox (partial support)
- ✅ Samsung Internet
- ✅ Opera

## Next Steps

1. **Deploy to production**
2. **Test on actual mobile devices**
3. **Monitor service worker errors** in analytics
4. **Consider adding**:
   - Push notifications (if needed)
   - Background sync for data
   - Periodic background sync
   - Share target API
