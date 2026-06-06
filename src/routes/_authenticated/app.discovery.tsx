import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { startTrendScan } from "@/lib/api/firecrawl";
import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";

type Platform = "TikTok" | "Amazon" | "Reddit" | "Other";
const PLATFORMS: Platform[] = ["TikTok", "Amazon", "Reddit", "Other"];

export const Route = createFileRoute("/_authenticated/app/discovery")({
  component: DiscoveryPage,
});

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

  const { data: trends = [] } = useQuery({
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

  async function scan(e: React.FormEvent) {
    e.preventDefault();
    const kws = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const plats = PLATFORMS.filter((p) => selected[p]);
    if (kws.length === 0) return toast.error("Enter at least one keyword");
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
        <h1 className="text-2xl font-semibold">Product Discovery</h1>
        <p className="text-sm text-muted-foreground">Find trending products across platforms with Firecrawl.</p>
      </div>

      <Card className="p-4 space-y-3">
        <form onSubmit={scan} className="space-y-3">
          <Input
            placeholder="Keywords (comma-separated): cold brew, matcha"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setSelected((s) => ({ ...s, [p]: !s[p] }))}
                className={`px-3 py-1 rounded-full text-sm border ${
                  selected[p] ? "bg-primary text-primary-foreground border-primary" : "bg-background"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button type="submit" disabled={running}>
            {running ? "Starting…" : "Scan trends"}
          </Button>
        </form>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wide text-muted-foreground px-4 py-2 border-b bg-muted/30">
          <div className="col-span-5">Product</div>
          <div className="col-span-2">Platform</div>
          <div className="col-span-2">Score</div>
          <div className="col-span-2">Discovered</div>
          <div className="col-span-1 text-right">Save</div>
        </div>
        {trends.length === 0 && (
          <p className="text-sm text-muted-foreground p-4">No trends yet — run a scan above.</p>
        )}
        {trends.map((t) => (
          <div key={t.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 border-b last:border-0 text-sm">
            <div className="col-span-5 min-w-0">
              <div className="font-medium truncate">{t.product_name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {t.keyword}
                {t.source_url && (
                  <a href={t.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center ml-2 hover:text-primary">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="col-span-2"><Badge variant="secondary">{t.platform}</Badge></div>
            <div className="col-span-2 font-medium">{t.trend_score}</div>
            <div className="col-span-2 text-xs text-muted-foreground">
              {new Date(t.discovered_at).toLocaleDateString()}
            </div>
            <div className="col-span-1 text-right">
              <Button size="icon" variant="ghost" onClick={() => toggleSave(t.id, t.saved)}>
                {t.saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
