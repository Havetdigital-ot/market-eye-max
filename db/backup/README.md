# Database Backup — Market Eye Pro

Full snapshot of the `public` schema (structure + data). Refreshed 2026-06-06.

Use this to rebuild the backend on ANY other Supabase / Postgres project and
get back to exactly the current state — no data loss.

## What's in here

| File | What it is |
|---|---|
| `full_backup.sql` | Complete `pg_dump`: tables, types, functions, triggers, indexes, constraints + all rows. **Single-file restore.** |
| `schema.sql` | Schema only (no rows). |
| `data.sql` | Data only, as `INSERT` statements (safe to re-run on an empty schema). |
| `<table>.csv` | One CSV per table with header row, for spreadsheet / partial restore. |
| `_tables.txt` | List of every table included in this snapshot. |

RLS policies, grants, indexes, triggers and the `seed_demo_data` function are
all included in `schema.sql` / `full_backup.sql`.

## Restore into a new Supabase project

1. Create a new Supabase project.
2. Get its connection string from **Project Settings → Database → Connection string** (use the `postgres` URI, not the pooler, for restore).
3. Restore everything in one shot:

   ```bash
   psql "$DATABASE_URL" -f db/backup/full_backup.sql
   ```

   Or in two steps:

   ```bash
   psql "$DATABASE_URL" -f db/backup/schema.sql
   psql "$DATABASE_URL" -f db/backup/data.sql
   ```

4. Point the app at the new project by updating `.env`:

   ```
   VITE_SUPABASE_URL=https://<new-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<new anon key>
   SUPABASE_URL=https://<new-ref>.supabase.co
   SUPABASE_PUBLISHABLE_KEY=<new anon key>
   SUPABASE_SERVICE_ROLE_KEY=<new service role key>   # server only
   FIRECRAWL_API_KEY=<your firecrawl key>             # server only
   LOVABLE_API_KEY=<optional, for AI Gateway>
   ```

5. (Optional) Re-enable Google OAuth in **Authentication → Providers**.

That's it — the app works against the new backend.

## Restore a single table from CSV

```bash
psql "$DATABASE_URL" -c "\COPY public.competitors FROM 'db/backup/competitors.csv' WITH CSV HEADER"
```

## What's NOT in here (and why)

- **`auth.*` users** — managed by Supabase Auth. To migrate users, use
  Supabase Auth admin API / dashboard "Export users". The `profiles` table IS
  included, but rows reference `auth.users(id)` — re-create those users (same
  UUIDs) first or the FK will fail.
- **`storage.*` buckets/objects** — no storage buckets are used by this project.
- **Edge Function secrets** — re-add via Lovable Cloud / Supabase Dashboard
  (`FIRECRAWL_API_KEY`, `LOVABLE_API_KEY`, etc.).
- **Auth provider config** (Google OAuth client id/secret) — re-configure in
  the new project's Auth settings.

## Refresh this snapshot

From a shell with `PGHOST` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` set to
the current Supabase project (Lovable's sandbox already has these):

```bash
B=db/backup
pg_dump --schema=public --no-owner --no-privileges --quote-all-identifiers -f $B/full_backup.sql
pg_dump --schema=public --no-owner --no-privileges --schema-only --quote-all-identifiers -f $B/schema.sql
pg_dump --schema=public --no-owner --no-privileges --data-only --column-inserts --quote-all-identifiers -f $B/data.sql
psql -At -c "select tablename from pg_tables where schemaname='public' order by 1" > $B/_tables.txt
while read t; do
  psql -c "\COPY (SELECT * FROM public.\"$t\") TO '$B/${t}.csv' WITH CSV HEADER"
done < $B/_tables.txt
```

## Snapshot stats (2026-06-06)

- 11 tables, ~171 rows total
- `full_backup.sql` ≈ 64 KB
