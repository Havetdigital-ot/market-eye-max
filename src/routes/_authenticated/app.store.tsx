import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Store as StoreIcon, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/store")({
  component: StorePage,
});

function StorePage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [brandId, setBrandId] = useState<string>("none");
  const [simulateFail, setSimulateFail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const { data: brands = [] } = useQuery({
    queryKey: ["brand_assets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_assets")
        .select("*")
        .order("generated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: previousStores = [] } = useQuery({
    queryKey: ["tasks", "stores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("background_tasks")
        .select("*")
        .eq("task_type", "Generate Store")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !desc.trim()) return toast.error("Fill in name and description");
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    setGenerating(true);
    const brand = brands.find((b: any) => b.id === brandId);

    const { data: task } = await supabase
      .from("background_tasks")
      .insert({
        user_id: user.user.id,
        task_type: "Generate Store",
        status: "Running",
        details: { store: name.trim() },
      })
      .select()
      .single();

    setTimeout(async () => {
      if (simulateFail) {
        await supabase
          .from("background_tasks")
          .update({
            status: "Failed",
            error_message: "Generation failed — simulated error.",
          })
          .eq("id", task!.id);
        toast.error("Generation failed");
      } else {
        await supabase
          .from("background_tasks")
          .update({ status: "Completed", details: { store: name.trim() } })
          .eq("id", task!.id);
        setPreview({
          name: name.trim(),
          desc: desc.trim(),
          palette: (brand?.color_palette as any) ?? ["#1F2A24", "#3E7C5A", "#A8C3A0", "#E9F0E6"],
        });
        toast.success("Store generated");
      }
      qc.invalidateQueries({ queryKey: ["tasks", "stores"] });
      qc.invalidateQueries({ queryKey: ["badge", "tasks"] });
      setGenerating(false);
    }, 1800);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Store Generator</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Generate a complete, self-contained storefront from your brand and catalog — preview,
          refine, and download.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* Left column: form + notice + history */}
        <div className="space-y-5">
          <form onSubmit={generate} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Store name</label>
              <Input
                placeholder="e.g. Driftwood Coffee Co."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Product / niche description</label>
              <Textarea
                placeholder="Describe what the store sells…"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="min-h-[96px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Apply brand asset</label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
                  <SelectValue placeholder="None — use defaults" />
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
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox
                checked={simulateFail}
                onCheckedChange={(v) => setSimulateFail(v === true)}
              />
              Simulate a generation failure
            </label>
            <Button type="submit" disabled={generating} className="w-full h-11 gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <StoreIcon className="h-4 w-4" />}
              {generating ? "Generating…" : "Generate store"}
            </Button>
          </form>

          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/60 p-4 flex gap-3">
            <div className="h-9 w-9 rounded-[10px] grid place-items-center bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
              <StoreIcon className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <div className="font-semibold text-amber-900 dark:text-amber-200">
                Shopify integration coming soon
              </div>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Connect your Shopify store to deploy directly in a future release.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-sm font-semibold">Previous stores</div>
              <span className="text-xs font-mono text-muted-foreground">
                {previousStores.length}
              </span>
            </div>
            {previousStores.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No stores generated yet.
              </div>
            ) : (
              previousStores.map((s: any) => {
                const sName = (s.details as any)?.store ?? "Store";
                const ready = s.status === "Completed";
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{sName}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        ready
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : s.status === "Failed"
                          ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          ready ? "bg-emerald-500" : s.status === "Failed" ? "bg-red-500" : "bg-blue-500"
                        }`}
                      />
                      {ready ? "Ready" : s.status}
                    </span>
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
                Fill in the form and generate to see a live, interactive storefront here.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
