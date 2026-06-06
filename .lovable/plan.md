# Goal
When a user clicks **Generate store**, the app saves the generated storefront and makes it live at `https://{slug}.market-eye.otmane.net/` (e.g. `driftwood.market-eye.otmane.net`).

# Yes — this is possible
Your app is already deployed on `market-eye.otmane.net` (Lovable hosting, fronted by Cloudflare). We can serve every generated store from the **same app** by:
1. Pointing a **wildcard subdomain** `*.market-eye.otmane.net` to the same project.
2. Adding a **catch-all route** in the app that reads the incoming `Host` header, looks up the matching store in the database, and renders it.

No separate hosting, no Workers script per store, no Cloudflare Pages project per store.

---

## Step 1 — DNS (one-time, manual, ~5 min)
In Cloudflare DNS for `otmane.net`, add:

```text
Type:  CNAME
Name:  *.market-eye         (this becomes *.market-eye.otmane.net)
Value: market-eye.otmane.net
Proxy: Proxied (orange cloud)
TTL:   Auto
```

Then in Lovable → **Project Settings → Domains**, add `*.market-eye.otmane.net` as a custom domain (Cloudflare proxy mode enabled in Advanced). Lovable issues a wildcard SSL cert automatically.

> If wildcard custom domains aren't available on your current Lovable plan, fallback: keep Cloudflare's universal SSL + use a Cloudflare Worker that proxies `*.market-eye.otmane.net/*` → `market-eye.otmane.net/s/{subdomain}/*`. I'll only build this if needed.

---

## Step 2 — Database
Add columns to `background_tasks` (or a new `generated_stores` table — cleaner). New table:

```text
generated_stores
  id, user_id, slug (unique, lowercased), name, description,
  brand_asset_id (nullable), palette jsonb, content jsonb,
  published boolean default true, created_at, updated_at
```

- `slug` is auto-derived from store name (`Driftwood Coffee Co.` → `driftwood-coffee-co`), uniqueness enforced, user can edit it.
- RLS: owner can read/write their own rows; **anon can SELECT where `published = true`** (so public visitors can load the store).

## Step 3 — Generate flow (Store Generator page)
On submit:
1. Insert row into `generated_stores` with slug + content.
2. On success, show the live URL: `https://{slug}.market-eye.otmane.net` with a copy button and "Open" link.
3. "Previous stores" list shows the slug + live URL per row.

## Step 4 — Serving the store (catch-all route)
Add a root middleware / route that:
1. Reads `request.headers.get('host')`.
2. If host matches `^([a-z0-9-]+)\.market-eye\.otmane\.net$` AND subdomain is **not** `www` / `app` / reserved → treat it as a store slug.
3. Look up `generated_stores` by slug (using `supabaseAdmin`, anon-safe via RLS) — render the storefront component with that data.
4. If not found → 404 page styled as "Store not found".
5. Apex `market-eye.otmane.net` keeps rendering the existing app unchanged.

Implementation: TanStack Start `__root.tsx` `beforeLoad` checks host and conditionally renders `<StorefrontApp store={...} />` instead of the normal app shell — OR a dedicated route `src/routes/__store.tsx` triggered by host. I'll pick the cleanest approach during build.

## Step 5 — Storefront component
A standalone, self-contained React page rendering: hero (name + description + palette), product grid (placeholder for now — later wired to `competitor_products` or a real catalog), footer "Powered by Market Eye". No app sidebar / topbar.

---

## Reserved subdomains (won't be treated as stores)
`www`, `app`, `api`, `admin`, `preview`, `staging`, `id-preview`

## Out of scope (can add later)
- Custom domains per store (`shop.userdomain.com`)
- Shopify deploy (already noted in UI as coming soon)
- Real product catalog editor
- Analytics per store

---

## What I need from you to start
1. Confirm DNS — can you add the wildcard CNAME in Cloudflare? (or want me to walk you through it)
2. Confirm: store all generated stores in a new `generated_stores` table (recommended) vs reusing `background_tasks` details JSON
3. Slug rule OK: lowercase, dashes, auto from name, editable before publish

Once you confirm, I'll run the migration and build steps 2–5.