import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { FileText, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { generateSeoContent } from "@/lib/firecrawl.functions";

export const Route = createFileRoute("/_authenticated/app/seo")({
  component: SeoPage,
});

const TYPE_STYLES: Record<string, string> = {
  "Blog Post": "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  "Product Description": "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  FAQ: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
};

function TypePill({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        TYPE_STYLES[type] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {type}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const ok = status === "Published";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        ok
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-muted-foreground"}`} />
      {status}
    </span>
  );
}

function SeoPage() {
  const qc = useQueryClient();
  const [type, setType] = useState("Blog Post");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingSwitchItem, setPendingSwitchItem] = useState<any>(null);

  const { data: items = [], isLoading: itemsLoading, isError: itemsError } = useQuery({
    queryKey: ["seo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_content")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const selected = items.find((i: any) => i.id === selectedId);
  const isDirty = !!(selected && (editTitle !== (selected.title ?? "") || editBody !== (selected.body ?? "")));

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return toast.error("Enter a topic");
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    setGenerating(true);
    const kws = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      const res = await generateSeoContent({ data: { topic: topic.trim(), type, keywords: kws } });
      if (!res || !res.ok || !res.data) throw new Error(res?.error ?? "Failed to generate SEO content");
      
      const { data, error } = await supabase
        .from("seo_content")
        .insert({
          user_id: user.user!.id,
          type,
          topic: topic.trim(),
          title: res.data.title,
          body: res.data.body,
          keywords: kws.length ? kws : null,
          status: "Draft",
        })
        .select()
        .single();
      
      if (error) throw error;
      setTopic("");
      setKeywords("");
      qc.invalidateQueries({ queryKey: ["seo"] });
      if (data) {
        setSelectedId(data.id);
        setEditTitle(data.title ?? "");
        setEditBody(data.body ?? "");
      }
      toast.success("Draft generated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to generate content");
    } finally {
      setGenerating(false);
    }
  }

  function openItem(item: any, force = false) {
    if (!force && isDirty) {
      setPendingSwitchItem(item);
      return;
    }
    setPendingSwitchItem(null);
    setSelectedId(item.id);
    setEditTitle(item.title ?? "");
    setEditBody(item.body ?? "");
  }

  async function saveEdits() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("seo_content")
        .update({ title: editTitle, body: editBody })
        .eq("id", selected.id);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["seo"] });
      toast.success("Saved");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const next = selected.status === "Published" ? "Draft" : "Published";
      const { error } = await supabase
        .from("seo_content")
        .update({
          status: next,
          published_at: next === "Published" ? new Date().toISOString() : null,
        })
        .eq("id", selected.id);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["seo"] });
      toast.success(next === "Published" ? "Published" : "Moved to draft");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    const { error } = await supabase.from("seo_content").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (selectedId === id) { setSelectedId(null); setEditTitle(""); setEditBody(""); }
    qc.invalidateQueries({ queryKey: ["seo"] });
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">SEO Content</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Generate on-brand blog posts, product copy, and FAQs — then edit, save, and publish.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* Left column */}
        <div className="space-y-5">
          <form onSubmit={generate} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="seo-type" className="text-sm font-semibold">Content type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="seo-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Blog Post">Blog Post</SelectItem>
                  <SelectItem value="Product Description">Product Description</SelectItem>
                  <SelectItem value="FAQ">FAQ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="seo-topic" className="text-sm font-semibold">Topic or product name</label>
              <Input
                id="seo-topic"
                placeholder="e.g. How to dial in espresso"
                value={topic}
                maxLength={200}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="seo-keywords" className="text-sm font-semibold">Target keywords</label>
              <Input
                id="seo-keywords"
                placeholder="espresso, grind size…"
                value={keywords}
                maxLength={200}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Optional, comma-separated</p>
            </div>
            <Button type="submit" disabled={generating} className="w-full h-11 gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generating ? "Generating…" : "Generate content"}
            </Button>
          </form>

          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-sm font-semibold">Your content</div>
              <span className="text-xs font-mono text-muted-foreground">
                {itemsLoading ? "…" : items.length}
              </span>
            </div>
            {itemsError ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span>Failed to load content — check your connection.</span>
              </div>
            ) : itemsLoading ? (
              <div className="divide-y">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No content yet.
              </div>
            ) : (
              items.map((s: any) => (
                <div
                  key={s.id}
                  className={`flex items-start gap-2 px-4 py-3 border-b last:border-b-0 hover:bg-muted/40 transition-colors ${
                    selectedId === s.id ? "bg-muted/60" : ""
                  }`}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex-1 text-left min-w-0 cursor-pointer"
                    onClick={() => openItem(s)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openItem(s); } }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <TypePill type={s.type} />
                      <StatusPill status={s.status} />
                    </div>
                    <div className="font-semibold mt-2 text-sm leading-snug">{s.title}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete"
                    title="Delete"
                    className="mt-0.5 h-7 w-7 grid place-items-center rounded hover:bg-muted hover:text-red-500 text-muted-foreground/50 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setPendingDeleteId(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: draft preview / editor */}
        <div className="rounded-xl border bg-card min-h-[560px] p-8">
          {selected ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <TypePill type={selected.type ?? ""} />
                  <StatusPill status={selected.status ?? "Draft"} />

                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={saveEdits} disabled={saving || !isDirty} className="gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save
                  </Button>
                  <Button size="sm" onClick={togglePublish} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {selected.status === "Published" ? "Unpublish" : "Publish"}
                  </Button>
                </div>
              </div>
              <Input
                id="seo-edit-title"
                aria-label="Content title"
                value={editTitle ?? ""}
                maxLength={200}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-semibold h-12"
              />
              <Textarea
                aria-label="Content body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="min-h-[420px] text-sm leading-relaxed"
              />
              <div className="text-xs text-muted-foreground text-right tabular-nums">
                {editBody.trim() ? editBody.trim().split(/\s+/).length : 0} words
                {" · "}
                {editBody.length} chars
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted grid place-items-center mb-5">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Draft preview</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Generate content or open an existing item to edit it here.
              </p>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!pendingSwitchItem} onOpenChange={(o) => { if (!o) setPendingSwitchItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this item. Discard them and open the selected item?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingSwitchItem) openItem(pendingSwitchItem, true); }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(o) => { if (!o) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the item from your library. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDeleteId) { deleteItem(pendingDeleteId); setPendingDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
