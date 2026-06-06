# Database Backup

Snapshot of the `public` schema taken on 2026-06-06.

## Files

- `full_backup.sql` — schema + data (single-file restore)
- `schema.sql` — schema only (tables, functions, policies, grants)
- `data.sql` — data only as `INSERT` statements
- `*.csv` — one CSV per table (header row included)
- `_tables.txt` — list of tables in this snapshot

## Restore into another Supabase / Postgres project

Full restore:

```bash
psql "$DATABASE_URL" -f full_backup.sql
```

Schema first, then data:

```bash
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -f data.sql
```

Single table from CSV:

```bash
psql "$DATABASE_URL" -c "\COPY public.competitors FROM 'competitors.csv' WITH CSV HEADER"
```

## Notes

- `auth.*`, `storage.*` and other Supabase-managed schemas are NOT included.
  Users will need to sign up again or be migrated via Supabase Auth admin tools.
- RLS policies and grants ARE included in `schema.sql` / `full_backup.sql`.
- To refresh the snapshot, re-run the export commands from `db/backup/`
  (see project chat history for the exact `pg_dump` invocation).
