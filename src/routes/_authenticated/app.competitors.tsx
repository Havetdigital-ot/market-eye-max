import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { startCompetitorCrawl } from "@/lib/api/firecrawl";
import {
  Trash2, RefreshCw, Pause, Play, Plus,
  Loader2, AlertCircle, ChevronDown, ChevronRight,
  ExternalLink, Package,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/competitors")({
  component: CompetitorsPage,
});

function avatarGradient(name: string) {
  const hues = [262, 200, 300, 155, 25, 75];
  const hue = hues[name.charCodeAt(0) % hues.length];
  return `linear-gradient(150deg, oklch(0.6 0.13 ${hue}), oklch(0.52 0.15 ${hue + 30}))`;
}

function hostOf(u: string) {
  try { return new URL(u).hostname.replace("www.", ""); } catch { return u; }
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { dot: string; cls: string }> = {
    Active: { dot: "bg-emerald-500", cls: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40" },
    Paused: { dot: "bg-muted-foreground", cls: "text-muted-foreground bg-muted" },
    Error:  { dot: "bg-red-500",          cls: "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40" },
  };
  const s = map[status] ?? map.Paused;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function CrawlStatusBadge({ task }: { task: { status: string; error_message?: string | null; details?: any } }) {
  if (task.status === "Running") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/40">
        <Loader2 className="h-3 w-3 animate-spin" />
        Crawling…
      </span>
    );
  }
  if (task.status === "Failed") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-red-700 bg-red-50 cursor-help"
        title={task.error_message ?? "Crawl failed"}
      >
        <AlertCircle className="h-3 w-3" />
        Crawl failed
      </span>
    );
  }
  return null;
}

// ── Product grid shown when a competitor row is expanded ──────────────────────

function ProductGrid({ competitorId }: { competitorId: string }) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["competitor-products", competitorId],
    queryFn: async () => {
      // Fetch products + latest price in one round-trip via a join
      const { data } = await supabase
        .from("competitor_products")
        .select(`
          id, name, description, image_url, category, sku, url,
          price_history ( price, currency, timestamp )
        `)
        .eq("competitor_id", competitorId)
        .order("name");
      return (data ?? []).map((p) => {
        // price_history is an array; grab the most recent
        const sorted = [...(p.price_history ?? [])].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        return { ...p, latestPrice: sorted[0] ?? null };
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-6 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading products…
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="px-6 py-8 flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <Package className="h-8 w-8 opacity-30" />
        <span>No products scraped yet — trigger a crawl to populate this.</span>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 bg-muted/20 border-t">
      {products.map((p) => (
        <div
          key={p.id}
          className="group flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Image */}
          <div className="relative aspect-square bg-muted overflow-hidden">
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            {/* Fallback placeholder */}
            <div className={`absolute inset-0 flex items-center justify-center text-muted-foreground/40 ${p.image_url ? "hidden" : ""}`}>
              <Package className="h-10 w-10" />
            </div>
            {/* Category badge */}
            {p.category && (
              <span className="absolute top-2 left-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/50 text-white backdrop-blur-sm">
                {p.category}
              </span>
            )}
            {/* External link */}
            {p.url && (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 h-6 w-6 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3 text-white" />
              </a>
            )}
          </div>

          {/* Info */}
          <div className="p-3 flex flex-col gap-1 flex-1">
            <p className="text-xs font-medium line-clamp-2 leading-snug">{p.name}</p>
            {p.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">{p.description}</p>
            )}
            {p.latestPrice && (
              <p className="mt-auto pt-1 text-sm font-semibold">
                {p.latestPrice.currency === "USD" ? "$" : p.latestPrice.currency}
                {Number(p.latestPrice.price).toFixed(2)}
              </p>
            )}
            {p.sku && (
              <p className="text-[10px] text-muted-foreground/70 font-mono">SKU {p.sku}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function CompetitorsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: competitors = [] } = useQuery({
    queryKey: ["competitors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("competitors")
        .select("*")
        .order("display_name");
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("competitor_products")
        .select("id, competitor_id");
      return data ?? [];
    },
  });

  const { data: crawlTasks = [] } = useQuery({
    queryKey: ["crawl-tasks"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("background_tasks")
        .select("id, status, error_message, details, updated_at")
        .eq("task_type", "Crawl Competitor")
        .eq("dismissed", false)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("crawl-tasks-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "background_tasks", filter: "task_type=eq.Crawl Competitor" },
        (payload) => {
          qc.invalidateQueries({ queryKey: ["crawl-tasks"] });
          const row = payload.new as any;
          if (row?.status === "Completed") {
            const cid = row?.details?.competitorId;
            qc.invalidateQueries({ queryKey: ["competitors"] });
            qc.invalidateQueries({ queryKey: ["products"] });
            if (cid) qc.invalidateQueries({ queryKey: ["competitor-products", cid] });
            const found = row?.details?.found ?? 0;
            toast.success(`Crawl complete — ${found} product${found !== 1 ? "s" : ""} found`);
          }
          if (row?.status === "Failed") {
            toast.error(`Crawl failed: ${row?.error_message ?? "unknown error"}`);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const taskByCompetitor = new Map<string, (typeof crawlTasks)[number]>();
  for (const task of crawlTasks) {
    const cid = (task.details as any)?.competitorId;
    if (cid && !taskByCompetitor.has(cid)) taskByCompetitor.set(cid, task);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function addCompetitor(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    let display = name.trim();
    try {
      if (!display) display = new URL(url).hostname.replace("www.", "");
    } catch {
      return toast.error("Enter a valid URL");
    }
    const { data: inserted, error } = await supabase
      .from("competitors")
      .insert({ user_id: user.user.id, display_name: display, url, status: "Active" })
      .select("id")
      .single();
    if (error || !inserted) return toast.error(error?.message ?? "Failed");
    setName(""); setUrl(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["competitors"] });
    toast.success("Competitor added — crawl starting…");
    try {
      await startCompetitorCrawl(inserted.id);
      qc.invalidateQueries({ queryKey: ["crawl-tasks"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Crawl failed to start");
    }
  }

  async function toggleStatus(id: string, status: string) {
    const next = status === "Active" ? "Paused" : "Active";
    await supabase.from("competitors").update({ status: next }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["competitors"] });
  }

  async function remove(id: string) {
    await supabase.from("competitors").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["competitors"] });
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next; });
    toast.success("Removed");
  }

  async function recrawl(id: string) {
    try {
      toast.info("Starting crawl…");
      await startCompetitorCrawl(id);
      qc.invalidateQueries({ queryKey: ["crawl-tasks"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start crawl");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Competitor Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Track competitor catalogs and prices. Click a row to browse their products.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add competitor
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1.6fr_1fr_0.6fr_0.9fr_0.8fr] gap-4 px-6 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase border-b bg-muted/30">
          <div>Competitor</div>
          <div>Status</div>
          <div>Products</div>
          <div>Last crawled</div>
          <div className="text-right">Actions</div>
        </div>

        {competitors.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No competitors yet — add one to get started.
          </div>
        ) : (
          competitors.map((c) => {
            const count = products.filter((p) => p.competitor_id === c.id).length;
            const activeTask = taskByCompetitor.get(c.id);
            const isCrawling = activeTask?.status === "Running";
            const isExpanded = expanded.has(c.id);

            return (
              <div key={c.id} className="border-b last:border-b-0">
                {/* Competitor row — click to expand */}
                <div
                  className="grid grid-cols-[1.6fr_1fr_0.6fr_0.9fr_0.8fr] gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(c.id)}
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 text-muted-foreground/50">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </div>
                    <div
                      className="h-9 w-9 rounded-[10px] flex items-center justify-center text-white text-sm font-semibold shrink-0"
                      style={{ background: avatarGradient(c.display_name) }}
                    >
                      {c.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.display_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{hostOf(c.url)}</div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex flex-col gap-1">
                    {activeTask && activeTask.status !== "Completed"
                      ? <CrawlStatusBadge task={activeTask} />
                      : <StatusPill status={c.status} />}
                  </div>

                  {/* Products count */}
                  <div className="font-mono font-semibold text-sm">
                    {isCrawling ? <span className="text-muted-foreground">…</span> : count}
                  </div>

                  {/* Last crawled */}
                  <div className="text-xs text-muted-foreground">
                    {isCrawling
                      ? <span className="text-blue-500 animate-pulse">crawling now</span>
                      : c.last_crawled_at
                        ? formatDistanceToNow(new Date(c.last_crawled_at), { addSuffix: true })
                        : "never"}
                  </div>

                  {/* Actions — stop propagation so clicks don't toggle expand */}
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {c.status === "Active" && (
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => recrawl(c.id)}
                        disabled={isCrawling}
                        title={isCrawling ? "Crawl in progress" : "Recrawl"}
                      >
                        <RefreshCw className={`h-4 w-4 ${isCrawling ? "animate-spin opacity-40" : ""}`} />
                      </Button>
                    )}
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => toggleStatus(c.id, c.status)}
                      disabled={isCrawling}
                      title={c.status === "Active" ? "Pause" : "Resume"}
                    >
                      {c.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon" variant="ghost" className="h-8 w-8 hover:text-red-500"
                      onClick={() => remove(c.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expandable product grid */}
                {isExpanded && <ProductGrid competitorId={c.id} />}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add competitor</DialogTitle>
            <DialogDescription>
              We'll crawl this site and start tracking its products and prices.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addCompetitor} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Store URL</Label>
              <Input id="url" type="url" placeholder="https://competitor.com"
                value={url} onChange={(e) => setUrl(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" placeholder="Optional — defaults to the domain"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">Add & crawl</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
