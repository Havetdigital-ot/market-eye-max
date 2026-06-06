import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Trash2, RefreshCw, Pause, Play, Eye, Plus } from "lucide-react";
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
  try {
    return new URL(u).hostname.replace("www.", "");
  } catch {
    return u;
  }
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { dot: string; cls: string }> = {
    Active: { dot: "bg-emerald-500", cls: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40" },
    Paused: { dot: "bg-muted-foreground", cls: "text-muted-foreground bg-muted" },
    Error: { dot: "bg-red-500", cls: "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40" },
  };
  const s = map[status] ?? map.Paused;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function CompetitorsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

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
      .insert({
        user_id: user.user.id,
        display_name: display,
        url,
        status: "Active",
      })
      .select("id")
      .single();
    if (error || !inserted) return toast.error(error?.message ?? "Failed");
    setName("");
    setUrl("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["competitors"] });
    toast.success("Competitor added — starting first crawl");
    try {
      await startCompetitorCrawl(inserted.id);
      qc.invalidateQueries({ queryKey: ["competitors"] });
      qc.invalidateQueries({ queryKey: ["products"] });
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Competitor Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Track competitor catalogs and prices. Crawls run on a schedule; trigger a recrawl anytime.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add competitor
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
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
            return (
              <div
                key={c.id}
                className="grid grid-cols-[1.6fr_1fr_0.6fr_0.9fr_0.8fr] gap-4 px-6 py-4 items-center border-b last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
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
                <div>
                  <StatusPill status={c.status} />
                </div>
                <div className="font-mono font-semibold text-sm">{count}</div>
                <div className="text-xs text-muted-foreground">
                  {c.last_crawled_at
                    ? formatDistanceToNow(new Date(c.last_crawled_at), { addSuffix: true })
                    : "never"}
                </div>
                <div className="flex justify-end gap-1">
                  {c.status === "Active" && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => recrawl(c.id)} title="Recrawl">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => toggleStatus(c.id, c.status)}
                    title={c.status === "Active" ? "Pause" : "Resume"}
                  >
                    {c.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="View">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:text-red-500"
                    onClick={() => remove(c.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
              <Input
                id="url"
                type="url"
                placeholder="https://competitor.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                placeholder="Optional — defaults to the domain"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add & crawl</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
