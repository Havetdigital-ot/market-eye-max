import { createFileRoute } from "@tanstack/react-router";

const BUCKET = "db-backups";
const RETENTION_DAYS = 30;

// Public schema tables to snapshot. Keep in sync with db/backup/_tables.txt.
const TABLES = [
  "profiles",
  "competitors",
  "competitor_products",
  "price_history",
  "alerts",
  "trends",
  "brand_assets",
  "brand_generation_templates",
  "seo_content",
  "background_tasks",
  "generated_stores",
] as const;

function isoDateFolder(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`
  );
}

async function runBackup() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const startedAt = new Date();
  const folder = isoDateFolder(startedAt);

  const manifest: {
    started_at: string;
    finished_at?: string;
    folder: string;
    tables: Array<{ name: string; rows: number; error?: string }>;
    retention_days: number;
    pruned: string[];
  } = {
    started_at: startedAt.toISOString(),
    folder,
    tables: [],
    retention_days: RETENTION_DAYS,
    pruned: [],
  };

  for (const table of TABLES) {
    try {
      const { data, error } = await supabaseAdmin.from(table).select("*");
      if (error) throw error;
      const rows = data ?? [];
      const body = JSON.stringify(rows, null, 2);
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(`snapshots/${folder}/${table}.json`, body, {
          contentType: "application/json",
          upsert: true,
        });
      if (upErr) throw upErr;
      manifest.tables.push({ name: table, rows: rows.length });
    } catch (e) {
      manifest.tables.push({
        name: table,
        rows: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  try {
    const { data: folders, error: listErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .list("snapshots", { limit: 1000 });
    if (listErr) throw listErr;

    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const entry of folders ?? []) {
      const m = entry.name.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})$/);
      if (!m) continue;
      const folderDate = Date.UTC(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
      );
      if (folderDate >= cutoff) continue;

      const { data: files } = await supabaseAdmin.storage
        .from(BUCKET)
        .list(`snapshots/${entry.name}`, { limit: 1000 });
      const paths = (files ?? []).map((f) => `snapshots/${entry.name}/${f.name}`);
      if (paths.length) {
        await supabaseAdmin.storage.from(BUCKET).remove(paths);
      }
      manifest.pruned.push(entry.name);
    }
  } catch (e) {
    manifest.pruned.push(
      `prune-error: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  manifest.finished_at = new Date().toISOString();

  await supabaseAdmin.storage
    .from(BUCKET)
    .upload(
      `snapshots/${folder}/manifest.json`,
      JSON.stringify(manifest, null, 2),
      { contentType: "application/json", upsert: true },
    );

  await supabaseAdmin.storage
    .from(BUCKET)
    .upload(`latest.json`, JSON.stringify(manifest, null, 2), {
      contentType: "application/json",
      upsert: true,
    });

  return manifest;
}

export const Route = createFileRoute("/api/public/hooks/db-backup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected =
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_ANON_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const manifest = await runBackup();
          return new Response(JSON.stringify({ ok: true, manifest }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () => {
        return new Response(
          JSON.stringify({
            ok: true,
            tables: TABLES.length,
            retention_days: RETENTION_DAYS,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
