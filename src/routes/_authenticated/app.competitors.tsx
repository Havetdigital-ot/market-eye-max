import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { startCompetitorCrawl } from "@/lib/api/firecrawl";
import {
  Trash2, RefreshCw, Pause, Play, Plus,
  Loader2, AlertCircle, ChevronDown, ChevronRight,
  ExternalLink, Package, Check, Search, Zap, Database, Radar,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

// ── Live crawl log panel ──────────────────────────────────────────────────────

const STAGE_ORDER = ["mapping", "extracting", "saving", "done"] as const;
type Stage = (typeof STAGE_ORDER)[number];

const STAGE_META: Record<Stage, { icon: React.FC<any>; label: (d: any) => string }> = {
  mapping:    { icon: Search,   label: (d) => `Discovering pages on ${d?.domain ?? "site"}…` },
  extracting: { icon: Zap,      label: (d) => `Extracting products from ${d?.urlCount ?? "?"} pages…` },
  saving:     { icon: Database, label: (d) => `Saving ${d?.found ?? "?"} products to database…` },
  done:       { icon: Check,    label: (d) => `Done — ${d?.found ?? 0} products found` },
};

function CrawlLogPanel({
  task,
  onRetry,
}: {
  task: { status: string; error_message?: string | null; details: any };
  onRetry?: () => void;
}) {
  const details = task.details ?? {};
  const currentStage = (details.stage ?? "mapping") as Stage;
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const urls: string[] = details.urls ?? [];

  if (task.status === "Failed") {
    return (
      <div className="px-6 py-6 bg-red-50/50 dark:bg-red-950/20 border-t flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">Crawl failed</p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5 font-mono break-all">
            {task.error_message ?? "Unknown error"}
          </p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry crawl
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="border-t bg-[#0d1117] dark:bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
        </div>
        <span className="text-[11px] text-white/40 font-mono ml-2">firecrawl — live scraping</span>
        {task.status !== "Completed" && (
          <Loader2 className="h-3 w-3 text-white/30 animate-spin ml-auto" />
        )}
      </div>

      <div className="px-5 py-4 space-y-3 font-mono text-[12px]">
        {/* Stage steps */}
        {STAGE_ORDER.map((stage, idx) => {
          const meta = STAGE_META[stage];
          const Icon = meta.icon;
          const isDone = idx < currentIdx || (stage === "done" && task.status === "Completed");
          const isCurrent = idx === currentIdx && task.status !== "Completed";
          const isPending = idx > currentIdx;

          return (
            <div key={stage} className={`flex items-start gap-3 ${isPending ? "opacity-25" : ""}`}>
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                  </div>
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-white/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className={
                  isDone ? "text-emerald-400" :
                  isCurrent ? "text-blue-300" :
                  "text-white/30"
                }>
                  {meta.label(details)}
                </span>

                {/* Show URLs being scraped during extracting stage */}
                {isCurrent && stage === "extracting" && urls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {urls.map((u, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-white/50">
                        <span className="text-blue-500/60">→</span>
                        <span className="truncate">{u}</span>
                      </div>
                    ))}
                    {(details.urlCount ?? 0) > urls.length && (
                      <div className="text-[11px] text-white/30 pl-4">
                        +{details.urlCount - urls.length} more pages
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Completion message */}
        {task.status === "Completed" && (
          <div className="pt-2 border-t border-white/10 text-emerald-400">
            ✓ Crawl complete — scroll down to see products
          </div>
        )}
      </div>
    </div>
  );
}

// ── Product grid ──────────────────────────────────────────────────────────────

function ProductGrid({ competitorId, isActive }: { competitorId: string; isActive?: boolean }) {
  const { data: products = [], isLoading, isError: productsError } = useQuery({
    queryKey: ["competitor-products", competitorId],
    queryFn: async () => {
      const { data } = await supabase
        .from("competitor_products")
        .select(`id, name, description, image_url, category, sku, url, price_history ( price, currency, timestamp )`)
        .eq("competitor_id", competitorId)
        .order("name");
      return (data ?? []).map((p) => {
        const sorted = [...(p.price_history ?? [])].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        return { ...p, latestPrice: sorted[0] ?? null };
      });
    },
    refetchInterval: isActive ? 4000 : false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-6 py-6 bg-muted/20 border-t text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading products…
      </div>
    );
  }

  if (productsError) {
    return (
      <div className="px-6 py-10 flex flex-col items-center gap-2 bg-muted/20 border-t text-sm text-muted-foreground">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span>Failed to load products — check your connection.</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="px-6 py-10 flex flex-col items-center gap-2 bg-muted/20 border-t text-sm text-muted-foreground">
        <Package className="h-8 w-8 opacity-30" />
        <span>No products scraped yet — trigger a crawl to populate this.</span>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 bg-muted/20 border-t">
      {products.map((p) => (
        <div key={p.id} className="group flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
          {/* Image */}
          <div className="relative aspect-square bg-muted overflow-hidden">
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="absolute inset-0 items-center justify-center text-muted-foreground/40"
              style={{ display: p.image_url ? "none" : "flex" }}
            >
              <Package className="h-10 w-10" />
            </div>
            {p.category && (
              <span className="absolute top-2 left-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/50 text-white backdrop-blur-sm">
                {p.category}
              </span>
            )}
            {p.url && (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 h-6 w-6 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: competitors = [], isLoading: competitorsLoading, isError: competitorsError } = useQuery({
    queryKey: ["competitors"],
    queryFn: async () => {
      const { data } = await supabase.from("competitors").select("*").order("display_name");
      return data ?? [];
    },
  });

  const { data: productCounts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("competitor_products").select("id, competitor_id");
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
    refetchInterval: (q) => {
      const tasks = q.state.data as any[] | undefined;
      const hasRunning = tasks?.some((t) => t.status === "Running" || t.status === "Pending");
      return hasRunning ? 3000 : false;
    },
  });

  // Realtime: watch background_tasks for crawl progress updates
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
            toast.success(`Crawl complete — ${row?.details?.found ?? 0} products found`);
          }
          if (row?.status === "Failed") {
            toast.error(`Crawl failed: ${row?.error_message ?? "unknown error"}`);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  // When polling detects a completed task, invalidate the products queries
  // (realtime handles this too, but polling is the fallback when WS drops)
  const prevTaskStatuses = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    for (const task of crawlTasks) {
      const prev = prevTaskStatuses.current.get(task.id);
      const curr = task.status;
      if (prev === "Running" && curr === "Completed") {
        const cid = (task.details as any)?.competitorId;
        qc.invalidateQueries({ queryKey: ["competitors"] });
        qc.invalidateQueries({ queryKey: ["products"] });
        if (cid) qc.invalidateQueries({ queryKey: ["competitor-products", cid] });
      }
      prevTaskStatuses.current.set(task.id, curr);
    }
  }, [crawlTasks, qc]);

  // Latest task per competitor
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
    // Auto-expand so user sees the live crawl panel immediately
    setExpanded((prev) => new Set([...prev, inserted.id]));
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
    const { error } = await supabase.from("competitors").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["competitors"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("competitors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["competitors"] });
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next; });
    toast.success("Removed");
  }

  async function recrawl(id: string) {
    try {
      // Auto-expand to show live crawl panel
      setExpanded((prev) => new Set([...prev, id]));
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
            Click any row to browse products and see live crawl progress.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add competitor
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_0.5fr_1fr_0.8fr] gap-4 px-6 py-3 text-xs font-medium text-muted-foreground border-b bg-muted/30">
          <div>Competitor</div>
          <div>Status</div>
          <div>Products</div>
          <div>Last crawled</div>
          <div className="text-right">Actions</div>
        </div>

        {competitorsError ? (
          <div className="px-6 py-12 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span>Failed to load competitors — check your connection.</span>
          </div>
        ) : competitorsLoading ? (
          <div className="divide-y">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_0.5fr_1fr_0.8fr] gap-4 px-6 py-4 items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                  <div className="space-y-1 min-w-0">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-36 rounded" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-8 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <div className="flex justify-end gap-1">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : competitors.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="w-12 h-12 rounded-full bg-muted grid place-items-center mx-auto mb-3">
              <Radar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="font-medium text-sm">No competitors yet</div>
            <div className="text-xs text-muted-foreground mt-0.5 mb-4">
              Add a competitor URL to start tracking products and prices.
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add competitor
            </Button>
          </div>
        ) : (
          competitors.map((c) => {
            const count = productCounts.filter((p) => p.competitor_id === c.id).length;
            const activeTask = taskByCompetitor.get(c.id);
            const isCrawling = activeTask?.status === "Running";
            const isExpanded = expanded.has(c.id);

            return (
              <div key={c.id} className="border-b last:border-b-0">
                {/* Row */}
                <div
                  className="grid grid-cols-[2fr_1fr_0.5fr_1fr_0.8fr] gap-4 px-6 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer select-none"
                  onClick={() => toggleExpand(c.id)}
                >
                  {/* Name + chevron */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 text-muted-foreground/40">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </span>
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
                  <div>
                    {isCrawling ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/40">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Crawling…
                      </span>
                    ) : (
                      <StatusPill status={c.status} />
                    )}
                  </div>

                  {/* Count */}
                  <div className="font-mono font-semibold text-sm">
                    {isCrawling ? <span className="text-muted-foreground animate-pulse">…</span> : count}
                  </div>

                  {/* Last crawled */}
                  <div className="text-xs text-muted-foreground">
                    {isCrawling
                      ? <span className="text-blue-500 text-xs animate-pulse">crawling now</span>
                      : c.last_crawled_at
                        ? formatDistanceToNow(new Date(c.last_crawled_at), { addSuffix: true })
                        : "never"}
                  </div>

                  {/* Actions — stop propagation so row click doesn't interfere */}
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {c.status === "Active" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => recrawl(c.id)}
                        disabled={isCrawling}
                        title={isCrawling ? "Crawl in progress" : "Recrawl"}
                      >
                        <RefreshCw className={`h-4 w-4 ${isCrawling ? "animate-spin opacity-40" : ""}`} />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => toggleStatus(c.id, c.status)}
                      disabled={isCrawling}
                      title={c.status === "Active" ? "Pause" : "Resume"}
                    >
                      {c.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-500"
                      onClick={() => setPendingDeleteId(c.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <>
                    {/* Show live terminal while crawling, product grid when done */}
                    {activeTask && activeTask.status !== "Completed" ? (
                      <CrawlLogPanel
                        task={activeTask}
                        onRetry={activeTask.status === "Failed" ? () => recrawl(c.id) : undefined}
                      />
                    ) : null}

                    {/* Product grid — always show if not currently crawling */}
                    {(!activeTask || activeTask.status === "Completed") && (
                      <ProductGrid competitorId={c.id} isActive={false} />
                    )}

                    {/* While crawling: also show product grid below terminal if there are already products */}
                    {isCrawling && count > 0 && (
                      <div className="border-t bg-muted/10">
                        <div className="px-6 py-2 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                          Previous crawl — {count} products
                        </div>
                        <ProductGrid competitorId={c.id} isActive={true} />
                      </div>
                    )}
                  </>
                )}
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

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(v) => { if (!v) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove competitor?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const c = competitors.find((x) => x.id === pendingDeleteId);
                return c
                  ? `This will permanently delete "${c.display_name}" and all its crawl history. This action cannot be undone.`
                  : "This will permanently delete the competitor and all its crawl history. This action cannot be undone.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId) remove(pendingDeleteId);
                setPendingDeleteId(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
