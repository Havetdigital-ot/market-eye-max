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
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["seo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_content")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const selected = items.find((i: any) => i.id === selectedId);

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

    const sampleTitle =
      type === "Product Description"
        ? `${topic} — Detailed Overview`
        : type === "FAQ"
        ? `${topic} — Frequently Asked Questions`
        : `Ultimate Guide to ${topic}`;
    const sampleBody = `# ${sampleTitle}\n\nGenerated draft for "${topic}". Edit freely to make it your own.\n\n- Keyword focus: ${kws.join(", ") || "none specified"}\n- Type: ${type}\n`;

    setTimeout(async () => {
      const { data, error } = await supabase
        .from("seo_content")
        .insert({
          user_id: user.user!.id,
          type,
          topic: topic.trim(),
          title: sampleTitle,
          body: sampleBody,
          keywords: kws.length ? kws : null,
          status: "Draft",
        })
        .select()
        .single();
      setGenerating(false);
      if (error) return toast.error(error.message);
      setTopic("");
      setKeywords("");
      qc.invalidateQueries({ queryKey: ["seo"] });
      if (data) {
        setSelectedId(data.id);
        setEditTitle(data.title);
        setEditBody(data.body ?? "");
      }
      toast.success("Draft generated");
    }, 1200);
  }

  function openItem(item: any) {
    setSelectedId(item.id);
    setEditTitle(item.title ?? "");
    setEditBody(item.body ?? "");
  }

  async function saveEdits() {
    if (!selected) return;
    const { error } = await supabase
      .from("seo_content")
      .update({ title: editTitle, body: editBody })
      .eq("id", selected.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["seo"] });
    toast.success("Saved");
  }

  async function togglePublish() {
    if (!selected) return;
    const next = selected.status === "Published" ? "Draft" : "Published";
    await supabase
      .from("seo_content")
      .update({
        status: next,
        published_at: next === "Published" ? new Date().toISOString() : null,
      })
      .eq("id", selected.id);
    qc.invalidateQueries({ queryKey: ["seo"] });
    toast.success(next === "Published" ? "Published" : "Moved to draft");
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
              <label className="text-sm font-semibold">Content type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
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
              <label className="text-sm font-semibold">Topic or product name</label>
              <Input
                placeholder="e.g. How to dial in espresso"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Target keywords</label>
              <Input
                placeholder="espresso, grind size…"
                value={keywords}
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
              <span className="text-xs font-mono text-muted-foreground">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No content yet.
              </div>
            ) : (
              items.map((s: any) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openItem(s)}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-muted/40 transition-colors ${
                    selectedId === s.id ? "bg-muted/60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <TypePill type={s.type} />
                    <StatusPill status={s.status} />
                  </div>
                  <div className="font-semibold mt-2 text-sm leading-snug">{s.title}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </div>
                </button>
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
                  <TypePill type={selected.type} />
                  <StatusPill status={selected.status} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={saveEdits}>
                    Save
                  </Button>
                  <Button size="sm" onClick={togglePublish}>
                    {selected.status === "Published" ? "Unpublish" : "Publish"}
                  </Button>
                </div>
              </div>
              <Input
                value={editTitle ?? ""}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-semibold h-12"
              />
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="min-h-[420px] font-mono text-sm"
              />
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
    </div>
  );
}
