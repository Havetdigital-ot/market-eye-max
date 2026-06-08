import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { startTrendScan } from "@/lib/api/firecrawl";
import { Check, ExternalLink, Search, RefreshCw, Plus, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

type Platform = "TikTok" | "Amazon" | "Reddit" | "Other";
const PLATFORMS: Platform[] = ["TikTok", "Amazon", "Reddit", "Other"];

export const Route = createFileRoute("/_authenticated/app/discovery")({
  component: DiscoveryPage,
});

const PLATFORM_STYLES: Record<Platform, string> = {
  TikTok: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  Amazon: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  Reddit: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  Other: "bg-muted text-muted-foreground",
};

function PlatformBadge({ platform }: { platform: string }) {
  const cls = PLATFORM_STYLES[(platform as Platform)] ?? PLATFORM_STYLES.Other;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {platform}
    </span>
  );
}

function ScoreBar({ value, hue = "b" }: { value: number; hue?: "b" | "v" | "a" }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  const color =
    hue === "v"
      ? "bg-violet-500"
      : hue === "a"
      ? "bg-amber-500"
      : "bg-primary";
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[140px]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
      </div>
      <span className="font-mono font-semibold text-sm tabular-nums w-8 text-right">{v}</span>
    </div>
  );
}

function DiscoveryPage() {
  const qc = useQueryClient();
  const [keywords, setKeywords] = useState("");
  const [selected, setSelected] = useState<Record<Platform, boolean>>({
    TikTok: true,
    Amazon: true,
    Reddit: false,
    Other: false,
  });
  const [running, setRunning] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  const { data: trends = [], isLoading, isError: trendsError } = useQuery({
    queryKey: ["trends"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trends")
        .select("*")
        .order("discovered_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const rows = savedOnly ? trends.filter((t: any) => t.saved) : trends;

  async function scan(e: React.FormEvent) {
    e.preventDefault();
    const kws = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    const plats = PLATFORMS.filter((p) => selected[p]);
    if (plats.length === 0) return toast.error("Select at least one platform");
    setRunning(true);
    try {
      await startTrendScan(kws, plats);
      toast.success("Scan started — results will appear as they're found");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start scan");
    } finally {
      setRunning(false);
    }
  }

  async function toggleSave(id: string, saved: boolean) {
    await supabase.from("trends").update({ saved: !saved }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["trends"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Product Discovery</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Scan social and marketplace signals to surface trending products before they peak.
        </p>
      </div>

      {/* Scan form card */}
      <div className="rounded-xl border bg-card p-5">
        <form onSubmit={scan} className="flex flex-col lg:flex-row gap-5 lg:items-end">
          <div className="flex-1 min-w-0 space-y-2">
            <label htmlFor="discovery-keywords" className="text-sm font-semibold">Keywords</label>
            <Input
              id="discovery-keywords"
              placeholder="Enter keywords to scan…"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated — e.g. cold brew, matcha, frother
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => {
                const on = selected[p];
                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setSelected((s) => ({ ...s, [p]: !s[p] }))}
                    className={`inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-sm font-medium border transition-colors ${
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    {on && <Check className="h-3.5 w-3.5" />}
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
          <Button type="submit" disabled={running} className="h-11 px-5 gap-2 shrink-0">
            {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {running ? "Scanning…" : "Scan trends"}
          </Button>
        </form>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold">{rows.length} trends</div>
        <button
          type="button"
          onClick={() => setSavedOnly((s) => !s)}
          className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
            savedOnly
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:bg-muted"
          }`}
        >
          {savedOnly && <Check className="h-3.5 w-3.5" />}
          Saved only
        </button>
      </div>

      {/* Trends table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-[1.6fr_0.7fr_1fr_1fr_1fr_0.7fr_0.6fr] gap-4 px-6 py-3 text-xs font-medium text-muted-foreground border-b bg-muted/30">
          <div>Product</div>
          <div>Platform</div>
          <div>Trend score</div>
          <div>Virality</div>
          <div>Seasonality</div>
          <div>Found</div>
          <div className="text-right"></div>
        </div>

        {trendsError ? (
          <div className="px-6 py-12 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span>Failed to load trends — check your connection.</span>
          </div>
        ) : isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1.6fr_0.7fr_1fr_1fr_1fr_0.7fr_0.6fr] gap-4 px-6 py-4 items-center border-b last:border-b-0"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-28 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-4 w-14" />
              <div />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {savedOnly ? "No saved trends yet." : "No trends found — run a scan above."}
          </div>
        ) : (
          rows.map((t: any) => (
            <div
              key={t.id}
              className="grid grid-cols-[1.6fr_0.7fr_1fr_1fr_1fr_0.7fr_0.6fr] gap-4 px-6 py-4 items-center border-b last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{t.product_name}</div>
                {t.source_url && (
                  <a
                    href={t.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div>
                <PlatformBadge platform={t.platform} />
              </div>
              <div>
                <ScoreBar value={t.trend_score} hue="b" />
              </div>
              <div>
                <ScoreBar value={t.virality_potential} hue="v" />
              </div>
              <div>
                <ScoreBar value={t.seasonality_score} hue="a" />
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {t.discovered_at
                  ? formatDistanceToNow(new Date(t.discovered_at), { addSuffix: true })
                  : "—"}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => toggleSave(t.id, t.saved)}
                  className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                    t.saved
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : "bg-background border-border hover:bg-muted"
                  }`}
                >
                  {t.saved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {t.saved ? "Saved" : "Save"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
