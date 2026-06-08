import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Store as StoreIcon, Loader2, Copy, ExternalLink, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/store")({
  component: StorePage,
});

const STORE_DOMAIN = "market-eye.otmane.net";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function storeUrl(slug: string) {
  return `https://${slug}.${STORE_DOMAIN}`;
}

function StorePage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [brandId, setBrandId] = useState<string>("none");
  const [generating, setGenerating] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const effectiveSlug = slugDirty ? slug : slugify(name);

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brand_assets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_assets")
        .select("*")
        .order("generated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: previousStores = [], isLoading: storesLoading, isError: storesError } = useQuery({
    queryKey: ["generated_stores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_stores")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const preview = useMemo(() => {
    if (!lastUrl) return null;
    const store = previousStores.find((s: any) => storeUrl(s.slug) === lastUrl);
    if (!store) return null;
    const palette = (store.palette as string[]) ?? [];
    return {
      name: store.name,
      desc: store.description,
      palette: palette.length ? palette : ["#1F2A24", "#3E7C5A", "#A8C3A0", "#E9F0E6"],
      url: lastUrl,
    };
  }, [lastUrl, previousStores]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !desc.trim()) return toast.error("Fill in name and description");
    if (!effectiveSlug) return toast.error("Slug is required");

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    setGenerating(true);

    const brand = brands.find((b: any) => b.id === brandId);
    const palette =
      (brand?.color_palette as string[]) ?? ["#1F2A24", "#3E7C5A", "#A8C3A0", "#E9F0E6"];

    const { data: inserted, error } = await supabase
      .from("generated_stores")
      .insert({
        user_id: user.user.id,
        slug: effectiveSlug,
        name: name.trim(),
        description: desc.trim(),
        brand_asset_id: brand?.id ?? null,
        palette,
        content: {},
        published: true,
      })
      .select()
      .single();

    setGenerating(false);

    if (error) {
      if (error.code === "23505") {
        toast.error(`Slug "${effectiveSlug}" is already taken — pick another.`);
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Also log a task entry for the task log page.
    await supabase.from("background_tasks").insert({
      user_id: user.user.id,
      task_type: "Generate Store",
      status: "Completed",
      details: { store: name.trim(), slug: effectiveSlug, url: storeUrl(effectiveSlug) },
    });

    const url = storeUrl(inserted.slug);
    setLastUrl(url);
    qc.invalidateQueries({ queryKey: ["generated_stores"] });
    qc.invalidateQueries({ queryKey: ["badge", "tasks"] });
    toast.success("Store published", { description: url });
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied");
    } catch {
      toast.error("Failed to copy — try selecting the URL manually.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Store Generator</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Generate a complete, self-contained storefront and publish it instantly at a unique
          subdomain on{" "}
          <span className="font-mono text-foreground">{STORE_DOMAIN}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* Left column: form + notice + history */}
        <div className="space-y-5">
          <form onSubmit={generate} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="store-name" className="text-sm font-semibold">Store name</label>
              <Input
                id="store-name"
                placeholder="e.g. Driftwood Coffee Co."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugDirty) setSlug(slugify(e.target.value));
                }}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="store-slug" className="text-sm font-semibold">Subdomain</label>
              <div className="flex items-center rounded-md border bg-background overflow-hidden">
                <Input
                  id="store-slug"
                  className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="driftwood"
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugDirty(true);
                    setSlug(slugify(e.target.value));
                  }}
                />
                <span className="px-3 py-2 text-xs text-muted-foreground bg-muted/40 font-mono whitespace-nowrap">
                  .{STORE_DOMAIN}
                </span>
              </div>
              {effectiveSlug && (
                <p className="text-xs text-muted-foreground font-mono">
                  → {storeUrl(effectiveSlug)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="store-desc" className="text-sm font-semibold">Product / niche description</label>
              <Textarea
                id="store-desc"
                placeholder="Describe what the store sells…"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="min-h-[96px]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="store-brand" className="text-sm font-semibold">Apply brand asset</label>
              <Select value={brandId} onValueChange={setBrandId} disabled={brandsLoading}>
                <SelectTrigger id="store-brand">
                  <SelectValue placeholder={brandsLoading ? "Loading brands…" : "None — use defaults"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — use defaults</SelectItem>
                  {brands.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.brand_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optional — pulls palette, type &amp; voice
              </p>
            </div>
            <Button type="submit" disabled={generating} className="w-full h-11 gap-2">
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <StoreIcon className="h-4 w-4" />
              )}
              {generating ? "Publishing…" : "Generate &amp; publish store"}
            </Button>
          </form>

          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/60 p-4 flex gap-3">
            <div className="h-9 w-9 rounded-[10px] grid place-items-center bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
              <StoreIcon className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <div className="font-semibold text-amber-900 dark:text-amber-200">
                DNS setup required
              </div>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Add a wildcard <span className="font-mono">CNAME *.market-eye → {STORE_DOMAIN}</span>{" "}
                in Cloudflare and connect <span className="font-mono">*.{STORE_DOMAIN}</span> as
                a custom domain on this project. Until then, stores publish but their subdomain
                won't resolve.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-sm font-semibold">Published stores</div>
              <span className="text-xs font-mono text-muted-foreground">
                {storesLoading ? "…" : previousStores.length}
              </span>
            </div>
            {storesError ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span>Failed to load stores — check your connection.</span>
              </div>
            ) : storesLoading ? (
              <div className="divide-y">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-3 w-48 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : previousStores.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No stores published yet.
              </div>
            ) : (
              previousStores.map((s: any) => {
                const url = storeUrl(s.slug);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {s.slug}.{STORE_DOMAIN}
                      </div>
                      <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                        {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => copyUrl(url)}
                        className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted"
                        title="Copy URL"
                        aria-label="Copy URL"
                        type="button"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 w-8 grid place-items-center rounded-md hover:bg-muted"
                        title="Open"
                        aria-label="Open store"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: preview */}
        <div className="rounded-xl border bg-card min-h-[560px] p-8 flex flex-col items-center justify-center text-center">
          {preview ? (
            <div className="w-full max-w-2xl space-y-6">
              <div className="flex items-center gap-1.5">
                {preview.palette.slice(0, 5).map((c: string, i: number) => (
                  <div
                    key={i}
                    className="h-8 flex-1 rounded-md border"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{preview.name}</h2>
                <p className="text-muted-foreground mt-2">{preview.desc}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between gap-3">
                <div className="text-left min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Live URL
                  </div>
                  <div className="font-mono text-sm truncate">{preview.url}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => copyUrl(preview.url)}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
                  </Button>
                  <Button size="sm" asChild>
                    <a href={preview.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open
                    </a>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square rounded-lg bg-muted" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="h-16 w-16 rounded-2xl bg-muted grid place-items-center mb-5">
                <StoreIcon className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Store preview</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Fill in the form and publish to see your live storefront URL here.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
