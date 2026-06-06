## Goal
Turn the topbar's search bar and bell icon into real, working features wired to live data from the database.

## 1. Global Search (⌘K command palette)
- Convert `SearchBox` into a trigger button (keeps current pill look + ⌘K hint).
- Clicking it (or pressing ⌘K / Ctrl+K anywhere) opens a shadcn `CommandDialog`.
- The dialog searches across existing tables in parallel:
  - `competitors` → name / domain
  - `products` → name
  - `trends` → keyword / title
  - `alerts` → title / message
  - Static app pages (Dashboard, Discovery, SEO, Brand, Store, Tasks, Pricing, Trends, Competitors)
- Results grouped by type with an icon; selecting a result navigates to the relevant route (e.g. `/app/competitors`, `/app/trends`, etc.).
- Empty query shows "Quick navigation" with the static pages + recent alerts.
- Debounced query (200ms), uses `useQuery` per group, results capped at 5 each.

## 2. Notifications bell
- `NotificationButton` becomes a `Popover` trigger.
- Popover content (~360px wide) shows:
  - Header "Notifications" + "Mark all read" button
  - List of latest 10 rows from `alerts` table (title, message, created_at relative time, severity dot)
  - Unread badge count comes from `alerts.read = false` (already added field — if missing we'll add it in the migration step)
  - Empty state when none
  - Footer link "View all alerts" → `/app/pricing` (alerts live there)
- "Mark all read" updates `alerts.read = true` for the current user and invalidates the query.
- Clicking a single alert marks just that one read and navigates to `/app/pricing`.

## 3. Database
Check `alerts` schema — if no `read` boolean column exists, add migration:
- `ALTER TABLE alerts ADD COLUMN read boolean NOT NULL DEFAULT false;`
- Update existing RLS so users can UPDATE their own alerts.

## 4. Files touched
- `src/routes/_authenticated/app.tsx` — rewrite `SearchBox` + `NotificationButton`, add ⌘K listener.
- New: `src/components/app/global-search.tsx` (CommandDialog).
- New: `src/components/app/notifications-popover.tsx`.
- Migration only if `alerts.read` doesn't already exist.

## Out of scope
- Realtime push (will poll on focus via React Query).
- No visual restyle of topbar — same pill + bell look.

Confirm and I'll build it.