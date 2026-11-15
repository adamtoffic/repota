# Repota PWA & UI/UX Polish Assessment

**Date:** November 15, 2026  
**Scope:** Read-only architectural & UX audit of 5 post-overhaul findings on `feat/navigation-shell`  
**Reviewer:** Senior Front-End Engineer  
**Files Audited:** [index.html](file:///c:/Users/Flash/Documents/Projects/repota/index.html), [index.css](file:///c:/Users/Flash/Documents/Projects/repota/src/index.css), [AppShell.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/navigation/AppShell.tsx), [AutoSaveIndicator.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/AutoSaveIndicator.tsx), [ScrollButton.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ScrollButton.tsx), [ToastContext.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/context/ToastContext.tsx), [PwaInstallPrompt.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/PwaInstallPrompt.tsx), [PwaUpdatePrompt.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/PwaUpdatePrompt.tsx), [Dashboard.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/pages/Dashboard.tsx), [DashboardToolbar.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/DashboardToolbar.tsx), [ValidationWarnings.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ValidationWarnings.tsx), [ScoreEntryModal.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ScoreEntryModal.tsx), [StudentList.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/StudentList.tsx)

---

## Executive Summary

Testing Repota as an installed PWA exposed a real iOS/Android safe-area bug and several UX friction points that desktop/emulator testing easily misses. Below is the root-cause diagnosis for each of your 5 findings, concrete UX recommendations, and a phased implementation plan ready to execute once you approve.

---

## Finding 1: Floating Save Indicator Drops Underneath Bottom Nav in Installed PWA

### Observed Symptom
In a mobile browser tab, [AutoSaveIndicator.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/AutoSaveIndicator.tsx) floats cleanly above the mobile bottom navigation bar. The moment Repota is installed as a PWA ("Add to Home Screen"), the indicator shifts downward underneath the bottom navigation bar.

### Exact Technical Root Cause
1. [index.html](file:///c:/Users/Flash/Documents/Projects/repota/index.html#L6-L14) sets `viewport-fit=cover` and `apple-mobile-web-app-capable="yes"`.
2. In [AppShell.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/navigation/AppShell.tsx#L145-L150), the mobile bottom `<nav>` uses `.safe-bottom` (`padding-bottom: env(safe-area-inset-bottom)` from [index.css](file:///c:/Users/Flash/Documents/Projects/repota/src/index.css#L94-L96)) on top of its `h-16` (`64px`) grid, at `z-40`:
   - **In a browser tab:** Safari/Chrome's bottom URL/tab bar absorbs the hardware safe area, so `env(safe-area-inset-bottom)` is `0px`. Total nav height = **`64px`**.
   - **In an installed standalone PWA:** The browser toolbar disappears and Repota renders edge-to-edge above the hardware home indicator, so `env(safe-area-inset-bottom)` becomes **`34px` on Face ID iPhones** (and `16–24px` on gesture Android devices). Total nav height expands to **`98px`** (`64px + 34px`).
3. [AutoSaveIndicator.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/AutoSaveIndicator.tsx#L58) uses hardcoded `fixed bottom-20 left-4 z-30` (`bottom: 5rem = 80px`). Because `80px < 98px` and `z-30 < z-40`, the bottom nav overlaps the indicator by ~`18px` when installed.

### Other Components With the Same Latent Bug
| Component | Current Positioning | Impact in Standalone PWA |
| :--- | :--- | :--- |
| [AutoSaveIndicator.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/AutoSaveIndicator.tsx#L58) | `bottom-20 z-30` | Bottom ~18px tucked behind `z-40` nav |
| [ScrollButton.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ScrollButton.tsx#L46) | `bottom-20 z-30` | Floating action button partially covered by bottom nav |
| [ToastContext.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/context/ToastContext.tsx#L27) | `bottom-20 z-50` | Renders at `80px` (`18px` overlapping the `98px` nav top edge) |
| [PwaInstallPrompt.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/PwaInstallPrompt.tsx#L131) | `bottom-20 z-50` | Sits flush against/overlapping the top of the bottom nav |
| [PwaUpdatePrompt.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/PwaUpdatePrompt.tsx#L38) | `bottom-20 z-50` | Same overlap risk on PWA standalone update |
| [AppShell.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/navigation/AppShell.tsx#L140) | `pb-20 md:pb-0` | Page footer and last student card can sit 18px too low behind nav |

### Recommended Fix (Phase 1)
1. **Add safe-area-aware bottom spacing utilities** in [index.css](file:///c:/Users/Flash/Documents/Projects/repota/src/index.css):
   - `.bottom-safe-nav`: `bottom: calc(5rem + env(safe-area-inset-bottom, 0px));` on mobile (`< md`), resetting to `bottom: 1.5rem` (`md:bottom-6`) on desktop.
   - `.pb-safe-nav`: `padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));` on `AppShell` main container (`< md`).
2. **Make `AutoSaveIndicator` transient instead of sticky-forever:** Currently, once `lastSaved` is set, the green `"Saved just now"` pill stays pinned to bottom-left permanently. Fading it out automatically 3 seconds after `"Saved"` settles (while keeping it visible whenever `isSaving`, `!isOnline`, or `error` is true) keeps mobile screens airy while preserving immediate offline/save reassurance.

---

## Finding 2: Top Nav `+` (`Actions`) & `Print` Buttons — Psychological Friction & Redundancy

### Current State Audit
On Home (`/`), [Dashboard.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/pages/Dashboard.tsx#L120-L219) renders `PageHeader` with two top-right controls when students exist:
1. **`Print` link** (`to="/print"`)
2. **`+` / `Actions` dropdown** (`aria-label="Quick actions"`) containing:
   - `Add Student`
   - `Import Names`
   - `Export Full Data`
   - `Auto-Fill Remarks`

Directly below in the workspace, [DashboardToolbar.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/DashboardToolbar.tsx#L93-L178) renders **another** dropdown also named **`Actions ⋮`** with 6 items — duplicating `Auto-Fill Remarks`, `Import Names`, and `Export Full Data`, plus `Export Student List`, `Clear All Scores`, and `Clean Empty Rows`. And [StudentList.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/StudentList.tsx#L92-L100) renders **a third** `Add Student` button.

### Psychological & UX Critique
- **Icon-label mismatch (`+` vs. `Actions`):** A `+` icon universally triggers one mental model: **"Create / Add new item."** Putting `Export Full Data` and `Auto-Fill Remarks` inside a `+` button violates that expectation. On mobile only the `+` icon shows (label `"Actions"` is `hidden sm:inline`), so a teacher taps `+` expecting "Add Student" and instead hits a mixed utility menu.
- **Same label twice:** Having `+ Actions` in the header AND `Actions ⋮` in the toolbar creates "which Actions menu was that in?" confusion.
- **Desktop duplication:** On desktop (`md+`), the left sidebar ([AppShell.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/navigation/AppShell.tsx#L122-L136)) already pins `Print Reports` permanently. Meanwhile `PageHeader` stays at the top of desktop Dashboard just to show a second `Print` button and `+ Actions`.

### Senior Front-End Verdict: Is "Class Tools" Good Practice, and How Should We Resolve the `+` Button?

1. **Top-Nav `+ Actions` vs. the `+` Mental Model — Why Current Setup Hurts UX:**
   - Using a `+` button to house `Export Full Data` and `Auto-Fill Remarks` violates a core mobile UX instinct: **users expect `+` to create or add records**. Mixing exports and batch generators under `+` makes the menu feel like an unorganized junk drawer.
   - Worse, **every item inside top-nav `+ Actions` already exists on Home right below it** (`+ Add Student` CTA and the toolbar `Actions ⋮` dropdown), creating two competing "Actions" menus on the exact same screen.
   - On desktop (`md+`), Dashboard `PageHeader` also duplicates the Brand logo and `Print Reports` CTA already pinned permanently in the left sidebar.

2. **Is Naming the Menu `Class Tools` (Instead of `Tools` or `Actions`) Good Practice?**
   - **Yes — `Class Tools` is a great name**, whereas generic `"Tools"` or `"Actions"` is vague. *"Class Tools"* tells a busy teacher immediately what scope it affects ("batch operations for my whole class").
   - It stays **good practice** so long as we keep *only* batch utilities/exports/cleanup inside `Class Tools` — and **never** use it as a dumping ground for unrelated features or primary creation buttons like `Add Student`.

### Recommended Architecture (Clean Separation of Duties)

| Surface | Recommended Design | Why It Feels Cleaner & More Intentional |
| :--- | :--- | :--- |
| **Mobile Top Header (`PageHeader`)** | Keep **Brand + `Print`** only — **remove `+ Actions` completely**. | Eliminates header clutter, ends menu duplication, and keeps `Print` effortless to spot with one thumb. |
| **Desktop (`md+`) Dashboard Header** | Hide Dashboard `PageHeader` on `md+` (`md:hidden`). | Removes redundant Brand + `Print` copies since the persistent sidebar already anchors both. |
| **Student Records Card Header** | Place a compact **`Import List`** button directly beside **`+ Add Student`** (and link bulk import in empty state / add modal). | Unifies 100% of "putting students into this class" actions in one unmistakable home without hiding import under `+` or `Class Tools`. |
| **Workspace Utility Menu (`Class Tools`)** | Rename toolbar dropdown `Actions` → **`Class Tools`** and organize into 3 labeled groups:<br>• **Smart Assistant:** `Auto-Fill Teacher Remarks`<br>• **Export & Share:** `Export Broadsheet (CSV)`, `Export Student Roll (.txt)`<br>• **Term Cleanup (Destructive):** `Clear All Scores`, `Remove Incomplete Students` | Clear, self-explanatory grouping. Every command operates strictly on the class as a whole. |
| **Mobile `Class Tools` Presentation** | Render **`Class Tools`** as a **slide-up Bottom Sheet** (`rounded-t-3xl`) on `< sm` mobile screens, and a grouped popover menu on desktop. | Replaces a cramped top-corner dropdown with comfortable, thumb-friendly mobile sheet rows and clear group headings. |

*(Note: Removing the header `Quick actions` menu in Phase 2 will also require updating the existing assertions in `src/test/NavigationShell.test.tsx` lines 196–205.)*

---

## Finding 3: How iOS / WhatsApp Style Their Rounded Bottom Nav & Animations

### Is It an Automatic iOS Feature?
**No — it is two things working together:**
1. **Screen hardware & OS safe area:** Modern iPhones physically mask the four outer screen corners, and in standalone PWAs iOS draws the Home Indicator bar inside the safe area. Apps must explicitly leave `.safe-bottom` space so tabs sit above that home indicator cleanly.
2. **Intentional UI styling & motion (what WhatsApp, Telegram, and native iOS apps do):**
   - **Floating Pill Dock vs. Curved Frosted Sheet:**
     - Native iOS 26 / modern WhatsApp & Telegram style the tab bar either as a **frosted translucent bar with subtle top corner radius and hairline border** (`rounded-t-2xl bg-white/85 backdrop-blur-xl`), OR as a **floating rounded capsule/island** (`mx-3 mb-[calc(env(safe-area-inset-bottom)+0.5rem)] rounded-3xl shadow-lg border border-gray-200/80`).
     - In [AppShell.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/navigation/AppShell.tsx#L145-L175), our bar currently uses a flat full-width edge (`border-t border-gray-200 bg-white/95 backdrop-blur-md`) with instant color swaps (`transition-colors`) and no scale/spring curve.
   - **Tab Tap & Active Indicator Animations:**
     - Native apps animate the **active pill/capsule** (`scale-x` expansion or soft `transition-all duration-200 cubic-bezier(0.22, 1, 0.36, 1)`), slightly scale up the active icon (`scale-110 -translate-y-0.5`), compress slightly on finger down (`active:scale-90` — the "rubbery" iOS feel), and fire subtle haptics (`triggerHaptic("light")`, which [iosInteraction.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/iosInteraction.ts) already provides!).

### Should We Add a 5th `Tools` Button to the Mobile Bottom Nav?
**Recommendation: No — keep the 4 destination tabs (`Home`, `SBA`, `Analytics`, `Settings`).**
- **Destinations vs. Context Actions (iOS HIG & Material 3 rule):** Bottom navigation tabs must switch *independent top-level screens* across the app. WhatsApp uses 5 tabs because *Updates*, *Calls*, *Communities*, *Chats*, and *Settings* are all standalone full-screen destinations. Repota's class tools (*Auto-Fill Remarks*, *Export Broadsheet*, *Clear Scores*) are *contextual utilities* anchored to the student records on `Home` — placing a global `Tools` tab in the bottom bar either forces an artificial utility screen with no clear scope when you're on `Settings`/`Analytics`, or turns a navigation tab into a confusing popup trigger.
- **Better Touch Ergonomics:** Four tabs give ~`90px+` wide tap targets with clean breathing room on narrow phones (`360px–390px`), whereas adding a 5th tab squeezes labels and adds cognitive overhead without adding a true destination.

### Which Bottom Nav Style Looks & Feels Most Premium?
**Recommendation: Curved-Top Frosted Glass Sheet (`rounded-t-3xl`) + Inner Capsule Spring Animations** (over a detached floating capsule dock).
- **Why Curved-Top Sheet Beats a Floating Island for Repota:**
  - A **detached floating island** (`mx-3 mb-safe rounded-3xl`) leaves transparent gaps at the bottom and corners where scrolled student rows bleed visually behind the iOS Home Indicator, creating visual noise and sacrificing vertical list height on compact phones.
  - A **Curved-Top Frosted Glass Sheet** (`rounded-t-3xl border-t border-gray-200/80 bg-white/90 backdrop-blur-xl shadow-[0_-8px_30px_rgba(15,23,42,0.08)]`) delivers the unmistakable soft WhatsApp/modern-iOS rounded contour *and* seamlessly seals all the way down through `.safe-bottom` behind the iOS Home Indicator so list content never leaks underneath.
- **Micro-Interactions (`AppShell.tsx`):** Pair the rounded frosted bar with a soft active capsule pill that eases in with a spring curve (`cubic-bezier(0.22, 1, 0.36, 1)`), subtle active icon lift (`scale-105 -translate-y-0.5`), rubbery press feedback (`active:scale-90`), and light haptics (`triggerHaptic("light")`) via [iosInteraction.ts](file:///c:/Users/Flash/Documents/Projects/repota/src/utils/iosInteraction.ts).

---

## Finding 4: Dashboard Warnings (`ValidationWarnings`) Should Filter Directly & Consistently

### Audit of Current Bugs & Friction
Inspecting [ValidationWarnings.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ValidationWarnings.tsx) alongside [Dashboard.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/pages/Dashboard.tsx#L58-L79) uncovered **four concrete flaws**:

1. **Cards are not actually clickable — only a tiny text link is:**
   In [ValidationWarnings.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ValidationWarnings.tsx#L91-L116), the outer banner is a plain `<div>`. Clicking anywhere on `"⚠️ 3 students have no scores entered"` does nothing unless the user hits the tiny `"Filter incomplete students →"` link inside.
2. **"Missing photos" is explicitly unclickable:**
   Line `105` checks `warning.icon !== Image` — completely disabling any click/filter action for `"students missing photos"`. The teacher sees the warning and has to hunt through the list manually.
3. **Warning counts contradict the filtered list (Formula Mismatch):**
   - [ValidationWarnings.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ValidationWarnings.tsx#L25-L32) defines incomplete scores as `subjectsWithScores > 0 && subjectsWithScores < totalSubjects` using `classScore > 0 || examScore > 0`.
   - [Dashboard.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/pages/Dashboard.tsx#L68-L72) defines `"PENDING"` as `subjects.length === 0 || subjects.some(sub => sub.classScore === 0 || sub.examScore === 0)`.
   - **Real failure example:** If all students have 9 subjects and entered *only* Class Scores (`examScore = 0` mid-term), `ValidationWarnings` reports **0** incomplete warnings (`9 < 9` is false), while `DashboardStats` shows **all students** as `Pending Entry`! Conversely, clicking `"has no scores entered"` dumps both unstarted and half-scored students together.
4. **No smart tab deep-linking:**
   Clicking a student filtered via `"Missing photos"` opens [ScoreEntryModal.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ScoreEntryModal.tsx#L29), which always defaults to `"ACADEMIC"` tab instead of `"DETAILS"` where [ImageUploader.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ImageUploader.tsx) actually lives.

### Recommended Flow Redesign (Phase 4)
1. **Make every warning card a whole-card interactive `<button>`** with clear visual affordance (`cursor-pointer`, hover lift, chevron/pill `"Filter"` vs. active state `"Filtering • Show all"`). Clicking again toggles back to `"ALL"`.
2. **Add dedicated filter pills & shared predicates (`"ALL" | "NO_SCORES" | "PENDING" | "MISSING_PHOTOS" | "FAILING"`):**
   - Extract shared helper functions so `DashboardStats`, `ValidationWarnings`, and `Dashboard` `filteredStudents` use **100% identical logic** — the count on the warning badge will always equal the filtered list count.
   - Make `ValidationWarnings` filter to the exact matching subset:
     - **No scores entered** → `"NO_SCORES"`
     - **Missing photos** → `"MISSING_PHOTOS"`
     - **Incomplete scores** → `"PENDING"`
   - Make the **Pass Rate / At-Risk** card in `DashboardStats` clickable to filter `"FAILING"` as well.
3. **Add `initialTab?: "ACADEMIC" | "DETAILS"` to `ScoreEntryModal`:**
   When `activeFilter === "MISSING_PHOTOS"`, opening a student from Dashboard jumps straight to the **Student Details** tab so the teacher can snap/upload the passport photo in 1 tap instead of 2!
4. **Optional Dismiss for Photo Warnings:** Some Ghanaian basic schools do not print student photos on report cards. Adding a compact `"Dismiss"` icon/option (persisted per session or localStorage preference) stops un-needed yellow noise for schools that print photo-free reports.

---

## Finding 5: Offline-First Premium Polish, Transitions & Visual Clarity

Because Repota runs offline from local IndexedDB with zero network latency, UI transitions should feel **instant and tactile** — crisp `150–220ms` motion, never slow `500ms` theatrical delays.

### High-Impact Polish Opportunities (Phase 5)
1. **Micro-Transitions Between Views & Modal Tabs:**
   - Currently routes and tabs (`ScoreEntryModal` `"Academic Scores"` / `"Student Details"`, `Analytics` views) snap abruptly with zero transition.
   - Add a GPU-accelerated `@keyframes pageEnter` (`opacity: 0 → 1`, `translateY(6px → 0)`, `180ms cubic-bezier(0.22, 1, 0.36, 1)`) respected by existing `@media (prefers-reduced-motion: reduce)` rules in [index.css](file:///c:/Users/Flash/Documents/Projects/repota/src/index.css#L178-L186).
2. **Mobile Sheet Slide-Up Entry (`animate-sheet-up`):**
   - [ScoreEntryModal.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ScoreEntryModal.tsx#L77-L85), [AddStudentModal.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/AddStudentModal.tsx), and [Modal.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/ui/Modal.tsx) appear instantaneously. Sliding mobile full-height/bottom sheets upward (`200ms ease-out`) makes the PWA feel indistinguishable from a native iOS/Android app.
3. **Actionable Score Progress Badges in `StudentList`:**
   - In [StudentList.tsx](file:///c:/Users/Flash/Documents/Projects/repota/src/components/StudentList.tsx), cards and rows currently show `"9 Subjects"` regardless of whether 0/9 or 9/9 subjects are scored.
   - Showing **`"4/9 Scored"`** (amber) vs. **`"9/9 Complete"`** (green) and a subtle missing-photo badge lets a teacher diagnose incomplete records at a glance without opening every student.
4. **Filter Chip Bar Active State Indicator:**
   - Add count badges on filter chips (`All (24)`, `Incomplete (5)`, `No Scores (2)`, `Missing Photos (3)`, `Failing (4)`) and show a dismissible `"Filtering: Missing Photos [× Clear]"` banner right above the list whenever a warning filter is active so teachers never forget why only 3 students are visible.

---

## Proposed Implementation Roadmap (After Your Review)

| Phase | Scope | Key Files |
| :--- | :--- | :--- |
| **Phase 1** | Fix PWA standalone bottom safe-area clearance (`AutoSaveIndicator`, `ScrollButton`, `Toast`, PWA prompts, `AppShell`) + auto-fade saved pill | `index.css`, `AppShell.tsx`, `AutoSaveIndicator.tsx`, `ScrollButton.tsx`, `ToastContext.tsx`, `PwaInstallPrompt.tsx`, `PwaUpdatePrompt.tsx` |
| **Phase 2** | Remove redundant header `+ Actions` (keep Brand + `Print` on mobile, hide Home `PageHeader` on `md+`), place `Import List` beside `+ Add Student`, rename toolbar menu → **`Class Tools`** (3 semantic groups + mobile bottom sheet) | `Dashboard.tsx`, `DashboardToolbar.tsx`, `NavigationShell.test.tsx` |
| **Phase 3** | Keep 4 destination tabs (`Home`, `SBA`, `Analytics`, `Settings`) and upgrade mobile bottom nav to curved-top frosted glass sheet (`rounded-t-3xl`) with spring capsule animations & light haptics | `AppShell.tsx`, `index.css` |
| **Phase 4** | Make all Dashboard warnings full-card clickable filters with matching counts, `Details` tab deep-linking for missing photos, and dismissible photo prompt | `ValidationWarnings.tsx`, `DashboardStats.tsx`, `DashboardToolbar.tsx`, `Dashboard.tsx`, `ScoreEntryModal.tsx`, new shared validation helper + tests |
| **Phase 5** | Add subtle GPU route/tab/sheet transitions and scored-subject progress pills in `StudentList` | `index.css`, `AppShell.tsx`, `ScoreEntryModal.tsx`, `Modal.tsx`, `StudentList.tsx` |

### Summary of Architectural Recommendations
- **Header & `Class Tools`:** Remove `+ Actions` from the top header (leaving Brand + `Print` on mobile, and hiding Home `PageHeader` on desktop), place **`Import List`** alongside **`+ Add Student`**, and rename the workspace toolbar menu to **`Class Tools`** grouped into *Smart Assistant*, *Export & Share*, and *Term Cleanup* (rendered as a thumb-friendly Bottom Sheet on mobile).
- **Bottom Nav Bar:** Keep the 4 clean destination tabs (`Home`, `SBA`, `Analytics`, `Settings` — do **not** add a 5th `Tools` tab) and style the dock as a **curved-top frosted glass sheet (`rounded-t-3xl`)** with spring capsule animations and subtle haptic feedback.

Reply when you've reviewed these recommendations and I'll begin implementing **Phase 1**.
