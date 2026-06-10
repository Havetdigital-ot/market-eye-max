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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { startCompetitorCrawl } from "@/lib/api/firecrawl";
import {
  Trash2, RefreshCw, Pause, Play, Plus,
  Loader2, AlertCircle, ChevronDown, ChevronRight,
  ExternalLink, Package, Check, Search, Zap, Database, Radar, AlertTriangle,
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
    <div className="border-t bg-zinc-950">
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
                {isCurrent && stage === "extracting" && urls.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {urls.map((u, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-white/50">
                        <span className="text-blue-500/60">→</span>
                        <span className="truncate" title={u}>{u}</span>
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
        {task.status === "Completed" && (
          <div className="pt-2 border-t border-white/10 text-emerald-400 flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 shrink-0" />
            Crawl complete — scroll down to see products
          </div>
        )}
      </div>
    </div>
  );
}

// ── Product grid ──────────────────────────────────────────────────────────────

function ProductGrid({ competitorId, isActive }: { competitorId: string; isActive?: boolean }) {
  const [productSearch, setProductSearch] = useState("");
  const { data: products = [], isLoading, isError: productsError } = useQuery({
    queryKey: ["competitor-products", competitorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitor_products")
        .select(`id, name, description, image_url, category, sku, url, price_history ( price, currency, timestamp )`)
        .eq("competitor_id", competitorId)
        .order("name")
        .limit(500);
      if (error) throw error;
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

  const q = productSearch.trim().toLowerCase();
  const visible = q
    ? products.filter((p) =>
        [p.name, p.description, p.category, p.sku]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q))
      )
    : products;

  return (
    <div className="bg-muted/20 border-t">
      <div className="flex items-center gap-3 px-6 pt-4 pb-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Filter products…"
            aria-label="Filter products"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {q ? `${visible.length} / ${products.length}` : `${products.length}`} products
        </span>
      </div>
      {visible.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          No products match <span className="font-medium">"{productSearch}"</span>
        </div>
      ) : (
      <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {visible.map((p) => (
        <div key={p.id} className="group flex flex-col rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
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
                aria-label={`View ${p.name} on competitor site`}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 h-6 w-6 rounded bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="h-3 w-3 text-white" />
              </a>
            )}
          </div>
          <div className="p-3 flex flex-col gap-1 flex-1">
            <p className="text-xs font-medium line-clamp-2 leading-snug" title={p.name}>{p.name}</p>
            {p.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug" title={p.description}>{p.description}</p>
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
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function CompetitorsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: competitors = [], isLoading: competitorsLoading, isError: competitorsError } = useQuery({
    queryKey: ["competitors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("competitors").select("*").order("display_name").limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: productCounts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase.from("competitor_products").select("id, competitor_id").limit(10000);
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

  const taskByCompetitor = new Map<string, (typeof crawlTasks)[number]>();
  for (const task of crawlTasks) {
    const cid = (task.details as any)?.competitorId;
    if (cid && !taskByCompetitor.has(cid)) taskByCompetitor.set(cid, task);
  }

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? competitors.filter((c: any) =>
        c.display_name.toLowerCase().includes(q) || hostOf(c.url).toLowerCase().includes(q)
      )
    : competitors;

  const CRAWL_TIMEOUT_MS = 90_000;
  const STALE_MS = 7 * 24 * 60 * 60 * 1000;
  function isStale(c: any, count: number, isCrawling: boolean) {
    if (isCrawling || c.status !== "Active" || count > 0) return false;
    const ref = c.last_crawled_at ?? c.created_at;
    return ref ? Date.now() - new Date(ref).getTime() > STALE_MS : false;
  }

  const visibleIds = filtered.map((c: any) => c.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id: string) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id: string) => selected.has(id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id: string) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...visibleIds]));
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
    if (!url || adding) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    let display = name.trim();
    try {
      if (!display) display = new URL(url).hostname.replace("www.", "");
    } catch {
      return toast.error("Enter a valid URL");
    }
    setAdding(true);
    try {
      const { data: inserted, error } = await supabase
        .from("competitors")
        .insert({ user_id: user.user.id, display_name: display, url, status: "Active" })
        .select("id")
        .single();
      if (error || !inserted) return toast.error(error?.message ?? "Failed");
      setName(""); setUrl(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["competitors"] });
      setExpanded((prev) => new Set([...prev, inserted.id]));
      toast.success("Competitor added — crawl starting…");
      try {
        await startCompetitorCrawl(inserted.id);
        qc.invalidateQueries({ queryKey: ["crawl-tasks"] });
      } catch (e: any) {
        toast.error(e?.message ?? "Crawl failed to start");
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleStatus(id: string, status: string) {
    if (togglingId === id) return;
    setTogglingId(id);
    try {
      const next = status === "Active" ? "Paused" : "Active";
      const { error } = await supabase.from("competitors").update({ status: next }).eq("id", id);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["competitors"] });
    } finally {
      setTogglingId(null);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("competitors").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["competitors"] });
    setExpanded((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
    toast.success("Removed");
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    const { error } = await supabase.from("competitors").delete().in("id", ids);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["competitors"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    setSelected(new Set());
    toast.success(`Removed ${ids.length} competitor${ids.length > 1 ? "s" : ""}`);
  }

  async function recrawl(id: string) {
    try {
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
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search competitors…"
              aria-label="Search competitors"
              className="pl-8 h-9 w-48 text-sm"
            />
          </div>
          <Button onClick={() => setOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add competitor
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-muted/50 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5 h-7"
            onClick={() => setBulkDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete selected
          </Button>
          <button
            type="button"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[auto_2fr_1fr_0.5fr_1fr_0.8fr] gap-4 px-4 py-3 text-xs font-medium text-muted-foreground border-b bg-muted/30 items-center">
          <div className="flex items-center justify-center w-8">
            <Checkbox
              checked={allVisibleSelected}
              data-state={someVisibleSelected && !allVisibleSelected ? "indeterminate" : undefined}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
          </div>
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
              <div key={i} className="grid grid-cols-[auto_2fr_1fr_0.5fr_1fr_0.8fr] gap-4 px-4 py-4 items-center">
                <div className="w-8" />
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
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No competitors match <span className="font-medium">"{searchQuery}"</span>
          </div>
        ) : (
          filtered.map((c: any) => {
            const count = productCounts.filter((p) => p.competitor_id === c.id).length;
            const activeTask = taskByCompetitor.get(c.id);
            // Treat Running tasks older than 5 min as stale (server restart orphan).
            const isCrawling =
              activeTask?.status === "Running" &&
              activeTask.updated_at != null &&
              Date.now() - new Date(activeTask.updated_at).getTime() < CRAWL_TIMEOUT_MS;
            const isExpanded = expanded.has(c.id);
            const isSelected = selected.has(c.id);
            const stale = isStale(c, count, isCrawling);
            const showCrawlNow = c.status === "Active" && count === 0 && !isCrawling;

            return (
              <div key={c.id} className="border-b last:border-b-0">
                <div
                  role="button"
                  tabIndex={0}
                  className={`grid grid-cols-[auto_2fr_1fr_0.5fr_1fr_0.8fr] gap-4 px-4 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer select-none ${isSelected ? "bg-muted/40" : ""}`}
                  onClick={() => toggleExpand(c.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleExpand(c.id); } }}
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${c.display_name} details`}
                >
                  {/* Checkbox */}
                  <div
                    className="flex items-center justify-center w-8"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}
                  >
                    <Checkbox checked={isSelected} aria-label={`Select ${c.display_name}`} />
                  </div>

                  {/* Name + chevron */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 text-muted-foreground/40">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <div
                      className="h-9 w-9 rounded-[10px] flex items-center justify-center text-white text-sm font-semibold shrink-0"
                      style={{ background: avatarGradient(c.display_name) }}
                    >
                      {c.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-1.5" title={c.display_name}>
                        {c.display_name}
                        {stale && (
                          <span title="No products crawled in 7+ days" className="inline-flex">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate" title={c.url}>{hostOf(c.url)}</div>
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

                  {/* Count + inline crawl shortcut */}
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => { if (showCrawlNow) e.stopPropagation(); }}
                  >
                    <span className="font-mono font-semibold text-sm">
                      {isCrawling ? <span className="text-muted-foreground animate-pulse">…</span> : count}
                    </span>
                    {showCrawlNow && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px] shrink-0"
                        onClick={() => recrawl(c.id)}
                        title="Crawl now"
                      >
                        Crawl
                      </Button>
                    )}
                  </div>

                  {/* Last crawled */}
                  <div className="text-xs text-muted-foreground">
                    {isCrawling
                      ? <span className="text-blue-500 text-xs animate-pulse">crawling now</span>
                      : c.last_crawled_at
                        ? formatDistanceToNow(new Date(c.last_crawled_at), { addSuffix: true })
                        : "never"}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {c.status === "Active" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => recrawl(c.id)}
                        disabled={isCrawling}
                        title={isCrawling ? `Crawling ${c.display_name}…` : `Recrawl ${c.display_name}`}
                        aria-label={isCrawling ? `Crawling ${c.display_name}…` : `Recrawl ${c.display_name}`}
                      >
                        <RefreshCw className={`h-4 w-4 ${isCrawling ? "animate-spin opacity-40" : ""}`} />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8"
                      onClick={() => toggleStatus(c.id, c.status)}
                      disabled={isCrawling || togglingId === c.id}
                      title={c.status === "Active" ? `Pause ${c.display_name}` : `Resume ${c.display_name}`}
                      aria-label={c.status === "Active" ? `Pause ${c.display_name}` : `Resume ${c.display_name}`}
                    >
                      {togglingId === c.id
                        ? <Loader2 className="h-4 w-4 animate-spin opacity-60" />
                        : c.status === "Active"
                        ? <Pause className="h-4 w-4" />
                        : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-red-500"
                      onClick={() => setPendingDeleteId(c.id)}
                      title={`Delete ${c.display_name}`}
                      aria-label={`Delete ${c.display_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <>
                    {activeTask && activeTask.status !== "Completed" ? (
                      <CrawlLogPanel
                        task={activeTask}
                        onRetry={activeTask.status === "Failed" ? () => recrawl(c.id) : undefined}
                      />
                    ) : null}
                    {(!activeTask || activeTask.status === "Completed") && (
                      <ProductGrid competitorId={c.id} isActive={false} />
                    )}
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

      {/* Add competitor dialog */}
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
                value={url} onChange={(e) => setUrl(e.target.value)} required autoFocus maxLength={300} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" placeholder="Optional — defaults to the domain"
                value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={adding}>Cancel</Button>
              <Button type="submit" disabled={adding} className="gap-2">
                {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {adding ? "Adding…" : "Add & crawl"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation */}
      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(v) => { if (!v) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove competitor?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const c = competitors.find((x: any) => x.id === pendingDeleteId);
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
              onClick={() => { if (pendingDeleteId) remove(pendingDeleteId); setPendingDeleteId(null); }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selected.size} competitor{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selected.size} competitor{selected.size > 1 ? "s" : ""} and all their scraped products and price history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { bulkDelete(); setBulkDeleteOpen(false); }}
            >
              Remove {selected.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
