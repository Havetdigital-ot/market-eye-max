# Make the dashboard dynamic (Supabase-backed)

The `/dash` view is currently a static iframe loading `public/mf/index.html` with in-memory mock data. To make what you see reflect real database data, I'll replace it with React routes that read from Supabase and write through Firecrawl-backed server functions already in place.

## What you'll get

- **Auth gate**: email/password sign-in + sign-up page at `/auth`. On first sign-in, the existing `seed_demo_data()` runs once so the new account has the same demo content you see today.
- **Authenticated shell** at `/app/*`: sidebar nav + topbar with realtime badges (unread alerts + running tasks), powered by Supabase Realtime on `alerts` and `background_tasks`.
- **Pages, all reading live from Supabase**:
  - `/app` — Dashboard: KPI cards, recent alerts, active tasks, recent competitor changes.
  - `/app/competitors` — list, add, pause/resume, delete; "Recrawl" button calls `startCompetitorCrawl` (Firecrawl).
  - `/app/discovery` — keyword + platform form; "Scan trends" calls `startTrendScan` (Firecrawl); table of `trends` with save toggle.
  - `/app/brand` — list of `brand_assets`; create new (form-only, no AI yet).
  - `/app/seo` — list of `seo_content`; create/edit drafts; publish toggle.
- **Data flow**: TanStack Query for reads (loaders prime, components subscribe). Mutations through Supabase client with `auth.uid()` scoping. Realtime subscriptions invalidate the relevant query keys.
- **Old iframe**: `/dash` becomes a redirect to `/app`; `public/mf/*` stays in repo but is no longer rendered.

## Out of scope (ask if you want them too)

- Store generator page (no `generated_stores` table in current schema).
- Actual AI generation for brand/SEO (placeholders only — wire to Lovable AI Gateway in a follow-up).
- Google sign-in (email/password only for now per your earlier choice).

## Technical notes

- New routes under `src/routes/_authenticated/app.*.tsx` using the integration-managed `_authenticated` layout (auto-redirects to `/auth` when signed out).
- New `/auth` route (public) with email/password forms calling `supabase.auth.signUp` / `signInWithPassword`; after sign-in invokes `supabase.rpc('seed_demo_data', { p_user })`.
- Realtime: single subscription wired in the `_authenticated` layout, filtered by `user_id`, invalidating `['alerts']` and `['tasks']` query keys.
- Sidebar badge counts come from two lightweight queries kept fresh by realtime invalidation.
- Existing `crawlCompetitor` / `scanTrends` server fns already write to the right tables — UI just triggers them and observes results.

After approval I'll ship this in one pass.
