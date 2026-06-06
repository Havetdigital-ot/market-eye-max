import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { startCompetitorCrawl } from "@/lib/api/firecrawl";
import { Trash2, RefreshCw, Pause, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/competitors")({
  component: CompetitorsPage,
});

function CompetitorsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

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
        .select("id, competitor_id, name, category, last_updated_at");
      return data ?? [];
    },
  });

  async function addCompetitor(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const display = name || new URL(url).hostname.replace("www.", "");
    const { error } = await supabase.from("competitors").insert({
      user_id: user.user.id,
      display_name: display,
      url,
      status: "Active",
    });
    if (error) return toast.error(error.message);
    setName("");
    setUrl("");
    qc.invalidateQueries({ queryKey: ["competitors"] });
    toast.success("Competitor added");
  }

  async function toggleStatus(id: string, status: string) {
    const next = status === "Active" ? "Paused" : "Active";
    await supabase.from("competitors").update({ status: next }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["competitors"] });
  }

  async function remove(id: string) {
    await supabase.from("competitors").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["competitors"] });
    toast.success("Removed");
  }

  async function recrawl(id: string) {
    try {
      await startCompetitorCrawl(id);
      toast.success("Crawl started");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start crawl");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Competitors</h1>
        <p className="text-sm text-muted-foreground">Monitor competitor product pages with Firecrawl.</p>
      </div>

      <Card className="p-4">
        <form onSubmit={addCompetitor} className="flex flex-wrap gap-2">
          <Input
            placeholder="Display name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-xs"
          />
          <Input
            type="url"
            placeholder="https://competitor.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="flex-1 min-w-[240px]"
          />
          <Button type="submit">Add competitor</Button>
        </form>
      </Card>

      <div className="grid gap-3">
        {competitors.map((c) => {
          const count = products.filter((p) => p.competitor_id === c.id).length;
          return (
            <Card key={c.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{c.display_name}</span>
                  <Badge variant={c.status === "Active" ? "default" : c.status === "Error" ? "destructive" : "secondary"}>
                    {c.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.url} · {count} products ·{" "}
                  {c.last_crawled_at
                    ? `crawled ${formatDistanceToNow(new Date(c.last_crawled_at), { addSuffix: true })}`
                    : "never crawled"}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => recrawl(c.id)} title="Recrawl">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => toggleStatus(c.id, c.status)} title="Toggle">
                  {c.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(c.id)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
        {competitors.length === 0 && (
          <p className="text-sm text-muted-foreground">No competitors yet — add one above.</p>
        )}
      </div>
    </div>
  );
}
