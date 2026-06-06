# Market Eye → Supabase migration plan

## Phase 1 — Backend foundation
1. Enable Lovable Cloud (Supabase).
2. Migration creating all 9 tables exactly per your schema, plus:
   - `profiles` auto-created via `handle_new_user` trigger on `auth.users` insert.
   - RLS enabled on every table; all policies scoped to `auth.uid() = user_id` (and for `competitor_products`/`price_history`, via parent `competitors.user_id`).
   - Required GRANTs to `authenticated` and `service_role`.
   - Realtime publication includes `alerts` and `background_tasks` (REPLICA IDENTITY FULL).
3. Per-table indexes on FKs and `(user_id, created_at)` where needed.

## Phase 2 — Auth + app shell
4. Add `/auth` route (email + password sign-in/sign-up, no email confirmation in dev).
5. Replace landing page `Login` button to link to `/auth`.
6. Move `/dash` under `_authenticated/` route gate (integration-managed layout).
7. Add sign-out in topbar.

## Phase 3 — Rewrite dashboard from iframe to React
8. Delete iframe. Recreate the dashboard as TanStack routes under `/dash` with the existing visual design (port `public/mf/styles.css` to a `mf.css` imported by the dash layout; keep look/feel identical).
9. Pages ported:
   - `/dash` Overview (KPIs, recent alerts, active tasks)
   - `/dash/competitors` (list + add + recrawl + delete + product detail w/ price history)
   - `/dash/discovery` (trends list + scan)
   - `/dash/brand` (brand assets)
   - `/dash/seo` (SEO content list + editor)
   - `/dash/store` (generated stores)
   - `/dash/settings` (profile)
10. Shared shell: sidebar + topbar with unread-alerts badge and active-task counter.

## Phase 4 — Data layer
11. `createServerFn` modules per resource (competitors, products, trends, brand, seo, stores, alerts, tasks) using `requireSupabaseAuth`. All inserts stamp `user_id = auth.uid()`.
12. React Query hooks (`useCompetitors`, `useAlerts`, etc.) using `ensureQueryData` + `useSuspenseQuery`.
13. Mutations invalidate the right keys.

## Phase 5 — Realtime + seeding
14. Realtime: a `useRealtimeBadges` hook subscribed to `alerts` and `background_tasks` filtered by `user_id`; updates a Zustand/Query store driving sidebar badges (<5s, typically <500ms).
15. First-login seeding: a `seed_demo_data(user_id)` SQL function called by a `seedIfEmpty` server fn, ported from `public/mf/data.js` (competitors, products, price history, alerts, trends, brand asset, SEO drafts, background tasks).

## Phase 6 — Cleanup
16. Remove `public/mf/*` once parity is verified.

## Technical notes
- Realtime: `supabase.channel('user-badges').on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: 'user_id=eq.<uid>' }, …)` and same for `background_tasks`.
- RLS for child tables uses `EXISTS (SELECT 1 FROM competitors c WHERE c.id = competitor_id AND c.user_id = auth.uid())`.
- `seo_content.product_id` will reference `competitor_products(id)` (nullable).
- Mock "crawler"/"trend scan" actions stay client-side — they insert rows directly (no edge functions), simulating async via `setTimeout` then updating the task row.

## Scope warning
This is roughly 30–50 files of changes. I recommend executing **one phase per turn** so you can review at each step. If you approve, I'll start with **Phase 1 (Cloud + schema + RLS + realtime + seed function)** in this turn and stop for your review before rewriting the UI.
