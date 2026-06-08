# Task Milestones

## Current Task

_Scanning for next issue…_

### Completed this session
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
