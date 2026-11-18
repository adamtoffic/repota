# iOS 27: Print button does nothing in the installed PWA

**Date:** 2026-11-18
**Status:** Root cause confirmed on device (`Version/27.2` standalone web app drops `window.print()` across all contexts; `navigator.share` with files works). Implementing PDF + Share Sheet fallback for testing on `feat/ios27-pwa-print-diagnostics`.
**Scope:** `/print` route (`PrintPreview`) running as a Home Screen web app on iOS 27 (`Version/27.2`), installed from Safari or from Chrome.

---

## Update 2026-11-18 (2): On-device diagnostics confirmed Finding B

Testing the diagnostics panel on an iPhone running `Version/27.2` (`Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1`) in standalone mode (`standalone=true`, `navigator.standalone=true`) produced the following results:

- **Pre-conditions were all valid** on every tap: `userActivation` was active (`isActive=true hasBeenActive=true`), `readyState=complete`, `visibility=visible`, `hasFocus=true`.
- **Option A (`direct` — `window.print()`):** Returned in `0ms`. Zero `beforeprint`, `afterprint`, or `matchMedia("print")` events fired; no print dialog appeared.
- **Option B (`pause-analytics`):** Pausing PostHog session recording before `window.print()` made no difference (`1–5ms`, zero print events, no dialog). Rules out network-in-flight / PostHog interference.
- **Option C (`iframe`):** `iframe.contentWindow.print()` returned in `0ms` (with only `blur`/`focus` from `win.focus()`), no print dialog appeared.
- **Option D (`new-window`):** `window.open("", "_blank")` opened a child view **inside** the standalone PWA container (without Safari chrome or a back button, requiring force-close to exit), and tapping "Tap to Print" (`window.print()`) inside that window also did nothing.
- **Option E (`share-file`):** `navigator.share({ files: [...] })` succeeded (`7ms`) and **opened the native iOS Share Sheet**.

### Conclusion & fix direction

1. **Why it fails:** In Apple's iOS 27 (`Version/27.2`) standalone Home Screen web-app container, `window.print()` is silently ignored across top-level windows, iframes, and `window.open` child windows — even with valid transient user activation and no network blockers.
2. **Why `x-safari-https://` is not viable:** iOS isolates IndexedDB/`localStorage` between the Home Screen PWA and Safari, so opening `/print` in Safari would show an empty school database.
3. **Why PDF + `navigator.share` is the fix:** Passing an `.html` file to `navigator.share` only offers file-saving actions, whereas passing a real **multi-page A4 `.pdf` file** (`application/pdf`) surfaces iOS's native Share Sheet with **Print** (AirPrint), **Save to Files**, **Markup**, and **Share**, while running **100% offline** using the PWA's own IndexedDB data.

---

## Update 2026-11-18: device results

The quick check on an iOS 27 device showed:

- Nothing overlaps the status bar.
- The Print button and the Color / B&W toggle both react visibly to taps.

**So Finding A (status-bar overlap) is ruled out.** The tap reaches `handlePrint`, which calls `window.print()`, and iOS 27's Home Screen container does not show the print sheet. **Finding B is now the working explanation.**

### Why the same setup works on iOS 26 but not iOS 27

Our print path does not change between tab and installed app, or between iOS versions. It never checks for standalone mode, uses no API that is new or changed in iOS 27, and keeps the user gesture intact. So the variables are:

| Setup | Our code | Result |
| --- | --- | --- |
| iOS 26, installed app | same | ✅ prints |
| iOS 27, Safari tab | same | ✅ prints |
| iOS 27, installed app (Safari or Chrome) | same | ❌ nothing |

The only thing that differs in the failing case is **the iOS 27 Home Screen web-app container**, the system process that hosts installed web apps and has to show the print sheet when `window.print()` is called. Something in how that container handles `window.print()` changed in iOS 27: it is dropped, delayed indefinitely, or never shown. **The codebase can't tell us exactly what changed.** That is Apple's code, and I found no official WebKit bug or release note confirming it. The diagnostics build is meant to pin down which step fails and to find a workaround that does work.

### What the test branch contains

The main Print button is **unchanged**, so it serves as the baseline. A new 🔧 button in the Print Preview toolbar opens an on-screen diagnostics panel ([PrintDiagnostics.tsx](../../src/components/PrintDiagnostics.tsx), [printStrategies.ts](../../src/utils/printStrategies.ts)) that:

- Logs the environment (UA, standalone flags, `navigator.userActivation`) and every print-related event (`beforeprint`, `afterprint`, `matchMedia('print')`, visibility, focus, errors), each with a timestamp. A **Copy log** button copies everything.
- Offers 5 ways to print. Each runs synchronously inside the tap:

| Option | What it tests |
| --- | --- |
| A. Direct print | Current behaviour (`window.print()`) |
| B. Pause analytics + print | Whether in-flight PostHog network traffic makes WebKit postpone the print |
| C. Hidden iframe print | A different WebKit print path (prints a pre-built copy with CSS inlined) |
| D. New window print | Opens the reports in a new window (an in-app Safari sheet in standalone mode, where printing works) and prints there; has its own "Tap to Print" button |
| E. Share sheet → Print | Shares an HTML file; the iOS share sheet's own Print action does not use `window.print()` |

Whichever option opens the sheet on iOS 27 becomes the fix. It would be wired into the main Print button for iOS standalone only, and the diagnostics panel would then be removed.

---

## TL;DR (original analysis)

- **We are not breaking any security rule.** The Print button calls `window.print()` directly inside the tap handler, with nothing async in between. There is no CSP, no Permissions-Policy, no iframe and no sandbox that could block printing. The same code works in a Safari tab, which also rules out a problem with the call itself.
- **Safari-installed and Chrome-installed copies fail the same way because they are the same app.** On iOS, every Home Screen web app runs in Apple's own WebKit web-app container, no matter which browser added it. Chrome is not involved after installation. So the bug is tied to **standalone mode on iOS 27**, not to the browser.
- **Most likely cause (from the code):** the Print Preview toolbar has **no safe-area top padding**. A commit in February 2026 removed it, so that screen now depends on `apple-mobile-web-app-status-bar-style="black"` to keep content below the status bar. If iOS 27 draws standalone apps edge-to-edge (we use `viewport-fit=cover`), the toolbar slides under the status bar. The Print button sits top-right, right under the battery and signal icons, so **iOS takes the tap and it never reaches our page.** Every other screen still works because `PageHeader` keeps its `safe-top` spacer.
- **Second possibility (platform):** if the tap does reach our handler, the iOS 27 web-app container is not showing the print sheet for `window.print()`. That would be a WebKit/iOS regression, not something we caused, and we need a fallback.

A 2-minute test on the phone tells the two apart (see [Verification](#verification-steps-on-device)).

---

## 1. How printing works today

[PrintPreview.tsx](../../src/pages/PrintPreview.tsx#L87-L101):

```tsx
const handlePrint = () => {
  try { posthog.capture("Printed_Reports", { ... }); } catch {}
  markPrintStarted();   // synchronous window.dispatchEvent
  window.print();       // synchronous, same tick as the tap
};
...
<button onClick={handlePrint} ...>   // line 255
```

- `markPrintStarted()` ([printHandler.ts](../../src/utils/printHandler.ts#L8-L10)) only fires a custom event. `App.tsx` listens for it to pause the auto-lock ([App.tsx](../../src/App.tsx#L74-L81), [App.tsx](../../src/App.tsx#L110-L111)). Nothing in that path is async and nothing calls `preventDefault`.
- So the user-gesture requirement ("transient activation") is met. This is the pattern Apple and the HTML spec expect.

### Security and policy checks (all clear)

| Possible blocker | Status in our code |
| --- | --- |
| `Content-Security-Policy` / `Permissions-Policy` headers | None. [vercel.json](../../vercel.json) only sets `Cache-Control`. No CSP `<meta>` in [index.html](../../index.html). |
| Sandboxed `<iframe>` (needs `allow-modals` to print) | Not used. We print the top-level document. |
| Async gap between tap and `print()` (loses the user gesture) | None on the main button. (One unused helper does have a gap, see §5.) |
| Service worker interference | The Workbox SW ([vite.config.ts](../../vite.config.ts#L31-L108)) only caches network requests. It cannot affect `window.print()`. |
| Automation or bot detection | Real tap, synchronous call. Nothing suspicious. |

**Conclusion:** nothing in our code breaks a browser security or permission rule.

---

## 2. Why "Safari install" and "Chrome install" fail the same way

On iOS, a site added to the Home Screen from **any** browser (Safari, Chrome, Edge…) opens in the **same system web-app runtime** (WebKit, standalone display mode). It does not open in Safari or Chrome. That is why both installs behave identically, and why the browser tab works while the installed app does not.

What changes between a tab and the installed app:

1. **Layout:** there is no browser toolbar above the page. The page reaches the top of the screen, and with `viewport-fit=cover` it can go under the status bar and Dynamic Island.
2. **Native host:** the print sheet is shown by whichever app hosts the page. In a tab that is Safari. In standalone mode it is the web-app container.

Each difference matches one of the findings below.

---

## 3. Finding A (most likely): the Print button sits under the iOS status bar

### Evidence from git history

1. **`e07efc4` (2026-01-29) "fix: iOS PWA safe area…"** added `safe-top` to the Print Preview toolbar. The commit message says it was there so that *"Settings, **Print**, and Analytics buttons now fully visible and **clickable** on iPhone with notch"*. So the team already hit "Print button is under the notch and can't be tapped" once.
2. **`1769e2b` (2026-02-01)** changed `apple-mobile-web-app-status-bar-style` from `black-translucent` to `black` in [index.html](../../index.html#L14) and **removed `safe-top` from the Print toolbar**:
   ```diff
   - <div className="safe-top sticky top-0 z-50 border-b ... bg-white p-4 print:hidden">
   + <div className="sticky top-0 z-50 border-b ... bg-white/80 p-4 backdrop-blur-md print:hidden">
   ```
   Up to iOS 26, `black` meant "start the page below the status bar", so the padding was redundant and dropping it was harmless.
3. **The current toolbar** ([PrintPreview.tsx](../../src/pages/PrintPreview.tsx#L142)) is `sticky top-0 ... p-3` with no safe-area handling at all. Compare [PageHeader.tsx](../../src/components/ui/PageHeader.tsx#L27-L28), used by Dashboard, Analytics and SBA, which still renders a `safe-top` spacer. **`/print` is the only full-screen route without it**: it lives outside `AppShell` ([router.tsx](../../src/router.tsx#L221-L228)) and never uses `PageHeader`.

### Why this breaks only on iOS 27 standalone

- `viewport-fit=cover` is still set ([index.html](../../index.html#L7)), so we have told iOS we will handle safe areas ourselves.
- If iOS 27's web-app container no longer honours `status-bar-style="black"` the old way (Apple has been moving web apps to edge-to-edge since "Open as Web App" became the default), the page starts at y=0, **behind** the status bar.
- Rough layout on a mobile screen: toolbar padding is 12px (`p-3`), then a 36px row of controls. **The Print button takes up about y = 12–48pt.** The status bar on Face ID and Dynamic Island iPhones is about 47–62pt tall. **The whole Print button is inside the status-bar strip, under the battery and signal icons on the right.**
- iOS handles taps on the status bar itself (scroll-to-top, Control Centre swipe), so **the web view never gets the tap**. The button looks "dead", with no error.
- In a Safari tab, the address bar and chrome sit above the page, so the button is reachable. **That matches what you saw exactly.**

### What else would show up if this is the cause

- The **Back arrow**, the **All/Ready** filter and the **Color / B&W** toggles are in the same row, so they would also be dead or hard to tap in the installed app.
- The toolbar would look like it overlaps the clock and battery icons.
- The Print button would **not** play its `active:scale-95` press animation when tapped.

---

## 4. Finding B (second possibility): iOS 27 web-app container doesn't show the print sheet

If on-device testing shows the tap **does** reach `handlePrint` (press animation plays, a debug log fires), then our code did its part and the container is failing to show the native print sheet.

- In a Safari tab, Safari's own code turns `window.print()` into the iOS print sheet. Standalone web apps are hosted by a different system process, and that path can break separately. iOS has a history of web-app-only regressions.
- Two known WebKit behaviours make `print()` fail silently:
  - WebKit **delays** `window.print()` while the page's document loader is still busy with network requests, and runs it when loading finishes. Our page has PostHog autocapture and session recording running ([main.tsx](../../src/main.tsx#L11-L28)), and `posthog.capture` runs right before `print()`. On a slow or offline network inside the PWA, a stuck request could hold up the print, and when it finally runs the user gesture may no longer count. **Lower likelihood**, but cheap to rule out (see test step 5).
  - If there's no `beforeprint` event at all, WebKit never started printing.
- I found community reports of `window.print()` silently doing nothing in iOS Home Screen web apps. I could **not** find an official WebKit bug or Apple release note specific to iOS 27, so treat this as unconfirmed until it reproduces on a device.

If this turns out to be the cause, the fix is a fallback (§6.2), plus a WebKit bug report with a minimal test page.

---

## 5. Other problems found while investigating (not the cause, but should be fixed)

1. **`createPrintHandler` / `createKeyboardPrintHandler` lose the user gesture.** [printHandler.ts](../../src/utils/printHandler.ts#L33-L36) calls `window.print()` inside `setTimeout(..., 100)`. iOS can treat that as an "automatic" print (*"This website has been blocked from automatically printing"*). Nothing uses these helpers right now, but they shouldn't be used as written.
2. **[docs/IOS-PRINT-FIX.md](../IOS-PRINT-FIX.md) is out of date.** It says "No setTimeout… print happens IMMEDIATELY", but `printHandler.ts` does the opposite. It also says Print Preview uses that helper, which it no longer does.
3. **[public/site.webmanifest](../../public/site.webmanifest) is broken and unused.** Its icon paths start with `/public/...`, which 404s in production. `index.html` links `/manifest.webmanifest` (generated by `vite-plugin-pwa`), so this file is just leftover. Delete it to avoid confusion.
4. **We fake a `beforeprint` event.** `createPrintHandler` dispatches a fake `beforeprint` event ([printHandler.ts](../../src/utils/printHandler.ts#L30)). That makes it impossible to tell from `beforeprint` whether a real print actually started, which we need for the fallback in §6.2.

---

## 6. Recommendations

### 6.1 Fix Finding A (small, low-risk change, do this first)

Add the safe area back to the Print Preview toolbar, the same way `PageHeader` does it:

```tsx
// PrintPreview.tsx line 142 – add a safe-area spacer (or pt-[env(safe-area-inset-top)])
<div className="sticky top-0 z-50 border-b ... print:hidden">
  <div className="safe-top" />
  <div className="mx-auto flex max-w-5xl ...">  {/* existing row, keeps p-3 */}
```

Longer term, every top-anchored bar should handle `env(safe-area-inset-top)` itself and **not** rely on `apple-mobile-web-app-status-bar-style`. That meta tag is legacy and Apple keeps changing how it behaves.

### 6.2 Defend against Finding B (fallback UX)

In standalone iOS only, after calling `window.print()`, wait about 1.5s for a **real** `beforeprint` event or `matchMedia('print')` change. If nothing fires, show a non-blocking toast:

> "Printing isn't opening in the installed app on this iOS version. Open Repota in Safari to print, or use the Share button."

Detection already exists in `isIOSPWA()` ([iosInteraction.ts](../../src/utils/iosInteraction.ts#L26-L32)). Log a PostHog event (for example `Print_Dialog_Not_Shown`) so we can see how many users this affects.

Longer term, a "Save as PDF" path that builds a PDF blob and hands it to the native share sheet (`navigator.share({ files })`) doesn't depend on `window.print()` at all.

### 6.3 Cleanup

- Remove the `setTimeout` from `createPrintHandler` / `createKeyboardPrintHandler`, or delete them.
- Update or retire `docs/IOS-PRINT-FIX.md`.
- Delete `public/site.webmanifest`.

---

## Verification steps (on device)

Run these on an iOS 27 device with the app installed to the Home Screen:

1. **Look:** open `/print`. Does the toolbar (Back arrow, Print button) overlap the clock and battery? → If yes, **Finding A**.
2. **Press animation:** tap Print. Does the button visibly shrink (`active:scale-95`)? No animation → the tap isn't reaching the page → **Finding A**.
3. **Same-row controls:** tap Color / B&W. If they don't switch either → **Finding A**.
4. **Landscape:** if the device allows rotation, turn it to landscape (iPhone hides the status bar there) and tap Print. Works in landscape but not portrait → **Finding A confirmed**.
5. **Safari Web Inspector** (Mac → Develop → [device] → Repota web app): add `console.log` / a `beforeprint` listener, then tap Print:
   - No log → tap blocked (**A**).
   - Log fires, `beforeprint` never fires, no sheet → container regression (**B**). Turn off Wi-Fi/cellular and try again to check the "delayed while loading" theory.
   - In the console, run `document.elementFromPoint(x, y)` with the button's coordinates to see what element is actually at that spot.
6. After applying §6.1, repeat steps 1–3 on iOS 27 **and** iOS 26, to make sure the extra padding doesn't create a double gap on iOS 26, where `black` still pushes content down (`env(safe-area-inset-top)` should be `0` there).

## Files referenced

- [src/pages/PrintPreview.tsx](../../src/pages/PrintPreview.tsx): print handler and toolbar (no safe area)
- [src/components/ui/PageHeader.tsx](../../src/components/ui/PageHeader.tsx): other pages' header (has a safe-area spacer)
- [index.html](../../index.html): `viewport-fit=cover`, `apple-mobile-web-app-status-bar-style="black"`
- [src/utils/printHandler.ts](../../src/utils/printHandler.ts): unused helpers with a `setTimeout` before printing
- [src/App.tsx](../../src/App.tsx): print-started / `beforeprint` listeners (auto-lock pause only)
- [vite.config.ts](../../vite.config.ts), [vercel.json](../../vercel.json): PWA manifest, SW and headers (no security policies)
- Commits `e07efc4` (added toolbar safe area), `1769e2b` (removed it, switched status bar to `black`)
