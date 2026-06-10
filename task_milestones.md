# Task Milestones

## Current Task

### Issue #177 — External links missing noopener on target="_blank" (COMPLETED)
- Files: `app.index.tsx`, `app.discovery.tsx`, `app.store.tsx`
- Fix: Change `rel="noreferrer"` to `rel="noopener noreferrer"` on all target="_blank" links for defense-in-depth
- Status: COMPLETED (commit 4c517b6)

### Issue #176 — Brand generate() missing re-entrancy guard (COMPLETED)
- File: `src/routes/_authenticated/app.brand.tsx`
- Fix: Add `if (phase === "generating") return;` guard at the top of `generate()` for defense-in-depth
- Status: COMPLETED (commit 4c517b6)

### Issue #175 — addCompetitor URL validation skipped when display name is provided (COMPLETED)
- File: `src/routes/_authenticated/app.competitors.tsx`
- Fix: Always parse URL with `new URL()` and validate protocol is http/https regardless of whether a display name was entered
- Status: COMPLETED (commit 4c517b6)

### Issue #174 — Cmd+K global shortcut fires inside form inputs, interrupting typing (COMPLETED)
- File: `src/routes/_authenticated/app.tsx`
- Fix: In the keydown handler, return early if `e.target` is an INPUT, TEXTAREA, or contenteditable element
- Status: COMPLETED (commit 0d98368)

### Issue #173 — Store preview copy button missing type="button" (COMPLETED)
- File: `src/routes/_authenticated/app.store.tsx`
- Fix: Add `type="button"` to the copy URL Button in the store preview panel
- Status: COMPLETED (commit eee5819)

### Issue #172 — SEO generate button not disabled when topic is empty (COMPLETED)
- File: `src/routes/_authenticated/app.seo.tsx`
- Fix: Add `|| !topic.trim()` to the generate button's `disabled` prop for immediate visual feedback
- Status: COMPLETED (commit eee5819)

### Issue #171 — Discovery platforms toggle group missing accessible group label (COMPLETED)
- File: `src/routes/_authenticated/app.discovery.tsx`
- Fix: Add `id="platforms-label"` to the `<p>` label and `role="group" aria-labelledby="platforms-label"` to the button group div
- Status: COMPLETED (commit eee5819)

### Issue #170 — Notifications popover alert buttons missing aria-labels (COMPLETED)
- File: `src/components/app/notifications-popover.tsx`
- Fix: Add `aria-label={\`\${a.type} from \${a.competitor_name}: \${a.product_name}\`}` to each alert button
- Status: COMPLETED (commit 2ef58ae)

### Issue #169 — Bulk delete in competitors missing loading/disabled guard (COMPLETED)
- File: `src/routes/_authenticated/app.competitors.tsx`
- Fix: Add `bulkDeleting` state + try/finally to `bulkDelete()`; disable AlertDialogAction while in-flight
- Status: COMPLETED (commit 2ef58ae)

### Issue #168 — Brand closeLibraryView() doesn't clear desc/nicheKey form fields (COMPLETED)
- File: `src/routes/_authenticated/app.brand.tsx`
- Fix: Add `setDesc("")` and `setNicheKey("")` to `closeLibraryView()` for consistent field cleanup
- Status: COMPLETED (commit 2ef58ae)

### Issue #167 — SEO deleteItem missing double-submit guard + dialog action not disabled (COMPLETED)
- File: `src/routes/_authenticated/app.seo.tsx`
- Fix: Add `deleting` state + try/finally to `deleteItem()`; disable AlertDialogAction while deleting
- Status: COMPLETED (commit 595ebeb)

### Issue #166 — Tasks filter SelectTriggers missing aria-labels (COMPLETED)
- File: `src/routes/_authenticated/app.tasks.tsx`
- Fix: Add `aria-label="Filter by task type"` and `aria-label="Filter by status"` to the two SelectTriggers
- Status: COMPLETED (commit 595ebeb)

### Issue #165 — SEO content item role="button" div missing aria-label (COMPLETED)
- File: `src/routes/_authenticated/app.seo.tsx`
- Fix: Add `aria-label={\`Open \${s.title}\`}` to the clickable content item div
- Status: COMPLETED (commit 595ebeb)

### Issue #164 — crawlTasks queryFn silently swallows Supabase errors (COMPLETED)
- File: `src/routes/_authenticated/app.competitors.tsx`
- Fix: Destructure `error` and add `if (error) throw error` to crawl-tasks queryFn
- Status: COMPLETED (commit 595ebeb)

### Issue #163 — productCounts queryFn silently swallows Supabase errors (COMPLETED)
- File: `src/routes/_authenticated/app.competitors.tsx`
- Fix: Destructure `error` and add `if (error) throw error` to products queryFn
- Status: COMPLETED (commit 595ebeb)

### Issue #162 — Discovery scan() doesn't clear keyword input after successful submission (COMPLETED)
- File: `src/routes/_authenticated/app.discovery.tsx`
- Fix: Add `setKeywords("")` after `toast.success(...)` in `scan()` so the form is ready for a new query
- Status: COMPLETED (commit df0b158)

### Issue #161 — Brand builder buttons use hardcoded bg-blue-600 instead of semantic tokens (COMPLETED)
- File: `src/routes/_authenticated/app.brand.tsx`
- Fix: Replace `bg-blue-600 hover:bg-blue-700 text-white` with `bg-primary hover:bg-primary/90 text-primary-foreground` on both generate and accept buttons
- Status: COMPLETED (commit df0b158)

### Issue #160 — brand_assets queryFn silently swallows Supabase errors (COMPLETED)
- File: `src/routes/_authenticated/app.store.tsx`
- Fix: Destructure `error` from the brand_assets query and `if (error) throw error` so isError becomes reachable
- Status: COMPLETED (commit df0b158)

### Issue #159 — CrawlLogPanel uses hardcoded hex color #0d1117 (COMPLETED)
- File: `src/routes/_authenticated/app.competitors.tsx`
- Fix: Replace `bg-[#0d1117] dark:bg-[#0d1117]` with Tailwind `bg-zinc-950`
- Status: COMPLETED (commit df0b158)

### Issue #158 — Alerts markRead() missing per-row loading/disabled guard (COMPLETED)
- File: `src/routes/_authenticated/app.alerts.tsx`
- Fix: Add `readingId` state; guard markRead with try/finally; fade row while in-flight with `opacity-50 pointer-events-none`
- Status: COMPLETED (commit df0b158)

### Issue #157 — ProductGrid in competitors has no search/filter for products (COMPLETED)
- File: `src/routes/_authenticated/app.competitors.tsx`
- Fix: Add a local text search state to ProductGrid; filter displayed products by name/description/category/SKU; show match count in header
- Status: COMPLETED (commit d9bed08)

### Issue #156 — Brand library loadFromLibrary doesn't pre-fill description form (COMPLETED)
- File: `src/routes/_authenticated/app.brand.tsx`
- Fix: When loading a library brand for review, also set `desc = b.source_description` and `nicheKey = "other"` so after closing the review panel the form is ready to regenerate
- Status: COMPLETED (commit cfab91f)

### Issue #155 — Alerts page "Mark all read" missing loading state guard (COMPLETED)
- File: `src/routes/_authenticated/app.alerts.tsx`
- Fix: Add `marking` state + `Loader2` spinner to prevent double-click on "Mark all read" AlertDialogAction
- Status: COMPLETED (commit a1cffce)

### Issue #154 — Store generator right panel shows empty state on page load even when stores exist (COMPLETED)
- File: `src/routes/_authenticated/app.store.tsx`
- Fix: When `previousStores` loads and `lastUrl` is null, auto-set `lastUrl` to the most recent store's URL so the preview panel populates on first visit
- Status: COMPLETED (commit 75b6658)

### Issue #153 — DeltaHint missing currency sign on average price change (COMPLETED)
- File: `src/routes/_authenticated/app.index.tsx`
- Fix: Add `$` prefix to the average price delta so it reads "+$5.00" / "-$5.00" instead of "+5.00" / "-5.00"
- Status: COMPLETED (commit 53a80af)

### Issue #152 — Competitor search aria-label + dismissible store DNS notice (COMPLETED)
- Files: `src/routes/_authenticated/app.competitors.tsx`, `src/routes/_authenticated/app.store.tsx`
- Fix: Add `aria-label` to the unlabeled competitor search input; add a "Got it" dismiss button on the DNS notice that persists to localStorage
- Status: COMPLETED (commit a1b9ac3)

### Issue #151 — Sidebar branding "Market Eye" → "Market Eye Pro" + user chip title attrs (COMPLETED)
- Files: `src/routes/_authenticated/app.tsx`
- Fix: Update sidebar header text from "Market Eye" to "Market Eye Pro"; add `title` to truncated fullName and company in user chip
- Status: COMPLETED (commit 2cbdb50)

### Issue #150 — Missing type="button" on error boundary and Clear selection buttons (COMPLETED)
- Files: `src/routes/__root.tsx`, `src/routes/_authenticated/app.competitors.tsx`
- Fix: Add `type="button"` to the "Try again" button in ErrorComponent; add `type="button"` to the "Clear selection" button in bulk-action bar
- Status: COMPLETED (commit ef3e778)

### Issue #149 — Unicode arrow in auth page + missing title on tasks summary column (COMPLETED)
- Files: `src/routes/auth.tsx`, `src/routes/_authenticated/app.tasks.tsx`
- Fix: Replace `←` Unicode char with `ArrowLeft` icon; add `title={summaryText(t)}` to the truncated summary `<div>` in the tasks table
- Status: COMPLETED (commit 6375773)

### Issue #148 — Emoji in CrawlLogPanel + missing title attributes on truncated text (COMPLETED)
- Files: `src/routes/_authenticated/app.competitors.tsx`, `src/components/app/notifications-popover.tsx`
- Fix: Replace `✓` emoji in CrawlLogPanel with `<Check>` icon; add `title` on product name/description `line-clamp-2` elements in ProductGrid; add `title` on truncated competitor name and product name spans in notifications popover
- Status: COMPLETED (commit 106805b)

### Issue #147 — Dashboard stat tiles silently show 0 when counts query fails (COMPLETED)
- File: `src/routes/_authenticated/app.index.tsx`
- Fix: throw on any Supabase error in Promise.all; add isError to destructure; show "—" in tiles on error
- Status: COMPLETED (already in codebase)

### Completed this session
- Issue #145 (PR #146 merged) — SEO items + notifications popover queryFns now throw on Supabase error (isError branches reachable)
- Issue #138 (PR #139 merged) — Character count indicators on Store and SEO bounded text fields
- Issue #131 (PR #132 merged) — Store Generator form retains stale values after successful publish
- Issue #129 (PR #130 merged) — brand_assets query key mismatch: Store page brand selector never refreshed
- Issue #127 (PR #128 merged) — title attributes on truncated text cells across 6 pages
- Issue #125 (PR #126 merged) — Loading spinners on Tasks Dismiss + Notifications Mark-all-read
- Issue #123 (merged to main) — Alerts query: `.limit(250)` + cache key `["alerts"]`
- Issue #121 (PR #122 merged) — Global search: skeleton rows + error notice suppress false "No results" during in-flight queries

### Completed this session
- Issue #116 (PR #117 merged) — Add throw to 9 queryFns so isError UI branches are reachable
- Issue #114 (PR #115 merged) — Competitor product card external link aria-label
- Issue #112 (PR #113 merged) — Auth mode-switch buttons type="button"
- Issue #110 (PR #111 merged) — SEO body textarea aria-label; focus rings on delete buttons
- Issue #108 (PR #109 merged) — Competitors toggleStatus togglingId guard against double-click
- Issue #106 (PR #107 merged) — Store generate() try/finally fix + re-entrancy guard
- Issue #104 (PR #105 merged) — Alerts unread rows: tabIndex + onKeyDown + aria-label for keyboard a11y
- Issue #102 (PR #103 merged) — Tasks refresh disabled during fetch; SEO unsaved changes AlertDialog guard
- Issue #100 (PR #101 merged) — Delete buttons for published stores and saved brand assets
- Issue #73 closed (already fixed in commit 98efd88 / PR #24)
- Issue #79 (PR merged) — Competitors add-form double-submit + Brand Builder generate disabled state
- Issue #81 (PR merged) — Storefront hero button type + palette-aware product card background
- Issue #83 (PR merged) — Discovery toggleSave per-row loading/disabled guard
- Issue #98 (PR #99 merged) — SEO content delete + title editor maxLength & aria-label
- Issue #96 (PR #97 merged) — Brand library items clickable — load into review panel
- Issue #94 (PR #95 merged) — money0() toFixed(2) fix in alerts + dashboard
- Issue #92 (PR #93 merged) — Competitor search filter + stale row indicator
- Issue #90 (PR #91 merged) — Dashboard table cell truncation + storefront Shop Now scroll
- Issue #88 (PR #89 merged) — Competitors row keyboard a11y, SEO publish spinner, brand desc maxLength
- Issue #84 (PR #87 merged) — Price toFixed(2), dark-mode unread bg, button text entity, platform ⌘K
- Issue #75 (PR #76 merged) — Tasks dismiss loading state + Discovery keywords validation
- Issue #77 (PR #78 merged) — Alerts per-row click-to-read + Dashboard store preview placeholder

### Task 20 — Supabase write error handling: dismiss/toggleSave/togglePublish (Issue #55, PR #56)
- Added missing `import { toast } from "sonner"` to app.tasks.tsx
- Error handling added to dismiss(), toggleSave(), togglePublish()
- Fixed "product(s)"/"alert(s)" pluralization in summaryText()

### Task 21 — Supabase write error handling: markAllRead/toggleStatus/remove (Issue #57, PR #58)
- markAllRead() in app.alerts.tsx: destructure { error }, toast on failure
- toggleStatus() + remove() in app.competitors.tsx: same pattern

### Task 22 — Accessibility: aria-label on icon-only buttons (Issue #59, PR #60)
- app.tsx: sign-out button
- app.competitors.tsx: Recrawl, Pause/Resume, Delete buttons
- app.store.tsx: Copy URL button + Open link; also added type="button"

### Task 23 — Dark mode: hardcoded oklch values in app.tsx (Issue #61, PR #62)
- Nav active indicator + badge bg: oklch literal → var(--sidebar-primary)
- Badge fg: text-white → text-sidebar-primary-foreground
- Avatar: dropped gradient inline style → bg-sidebar-primary

### Task 24 — HTML: missing type="button" on filter/nav buttons (Issue #63, PR #64)
- app.alerts.tsx: type-filter (×3) + read-filter (×2) buttons
- notifications-popover.tsx: bell trigger, mark-all-read, alert rows, "View all alerts"

### Task 25 — openAlert error handling + SEO saving guard (Issues #65 #66, PR #67)
- notifications-popover.tsx: openAlert() now checks { error }, skips navigation on failure
- app.seo.tsx: saving state + try/finally on saveEdits/togglePublish; buttons disabled during save

### Task 26 — Hardcoded domain string cleanup (Issue #68, PR #69)
- app.store.tsx: CNAME instruction uses {STORE_DOMAIN} not hardcoded literal
- s.$slug.tsx: "Powered by" footer href extracted to APP_URL constant

---

## Completed Tasks

### Session 2 — Completed

### Task 10 — SEO page skeleton loader (Issue #29, PR #30)
- Added `isLoading` to SEO items query; 3 skeleton rows; count badge shows "…"

### Task 11 — Store page skeleton loaders (Issue #31, PR #32)
- `storesLoading` skeleton for Published stores list
- `brandsLoading` disables brand Select + shows "Loading brands…" placeholder

### Task 12 — Brand Builder skeleton loader (Issue #33, PR #34)
- `assetsLoading` skeleton (swatch dots + name + timestamp shape) for brand library

### Task 13 — Competitors table skeleton + missing Radar import (Issue #35, PR #36)
- `competitorsLoading` skeleton (4 rows matching 5-col grid)
- Fixed runtime bug: `Radar` icon used but missing from lucide import

### Task 14 — Branding inconsistency (Issue #37, PR #38)
- Auth `<h1>` "Market Eye" → "Market Eye Pro"
- TITLES fallback "Market Eye" → "Market Eye Pro"

### Task 15 — Error states for 5 pages (Issue #39, PR #40)
- Added `isError` + error branch to: Competitors, Discovery, SEO, Store, Brand Builder

### Task 16 — Label accessibility (Issue #41, PR #42)
- Added `htmlFor`/`id` to 11 `<label>` elements across 4 pages
- Discovery "Platforms" label → `<p>` (no single target ID possible)

### Task 17 — Delete confirmation dialog (Issue #43, PR #44)
- Competitors delete button now opens AlertDialog with competitor name + warning
- Uses `pendingDeleteId` state; AlertDialog has destructive "Remove" button

### Task 18 — Tasks + notifications error states (Issue #45, PR #46)
- Tasks: `isError` + "Try again" button wired to `refetch`
- Notifications popover: `isLoading` skeleton (3 rows) + `isError` error notice

### Task 19 — Dashboard error states (Issue #47, PR #48)
- Added `isError` to alerts, trends, and store queries
- Error notices for 3 dashboard sections that previously showed false empty states

---

### Session 1 — Completed

### Task 1 — Alerts Page UX Overhaul (Issue #3, PR #4 — merged)
- Type filter pills, read-status filter, pagination, skeleton loader, error state, AlertDialog for mark-all-read

### Task 2 — Tasks Page UX (Issue #5, PR #6 — merged)
- `useNow()` hook for live timer; skeleton loader; improved empty state

### Task 3 — Dashboard Skeletons + Emoji Removal (Issue #7, PR #8 — merged)
- Skeleton tiles for all 4 stat queries; removed 👋 emoji

### Task 4 — Notifications Popover Fixes (Issue #9, PR #10 — merged)
- `timeAgo()` precision fix; badge cap 9+ → 99+; removed hardcoded border colors

### Task 5 — SEO Page (Issue #11, PR #12 — merged)
- Removed `font-mono` from body textarea; added word/char count

### Task 6 — Global Search (Issue #11, PR #12 — merged)
- `CommandEmpty` shows query string; trend primary label fallback

### Task 7 — Discovery Page (Issue #13, PR #14 — merged)
- Fixed Check icon conditional render; replaced + span with `<Plus>` icon; skeleton loader

### Task 8 — App Shell Dark Mode (Issue #15, PR #16 — merged)
- Removed hardcoded `oklch()` border colors; `bg-white` → `bg-background`; sidebar section label uses `{company}`

### Task 9 — Competitors Page (Issue #17, PR #18 — merged)
- "Retry crawl" button for failed crawls; empty state with Radar icon; sentence-case headers

### Task 10 — Brand Builder (Issue #19, PR #20 — merged)
- Removed dead `useQuery` for templates; removed unused seed state; `border-white` → `border-background`

### Task 11 — Meta Tags + Store Debug Code (Issue #23, PR #24 — merged)
- Replaced Lovable scaffold meta; removed simulateFail debug checkbox

### Task 12 — Auth + Storefront (Issue #25, PR #26 — merged)
- Auth page title; removed dead #about/#contact nav links

### Task 13 — Dead Scaffold File (Issue #27, PR #28 — merged)
- Deleted `src/lib/api/example.functions.ts`
