import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/seo")({
  component: SeoPage,
});

function SeoPage() {
  const qc = useQueryClient();
  const [type, setType] = useState("Blog Post");
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

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

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("seo_content").insert({
      user_id: user.user.id,
      type, topic, title, body,
      status: "Draft",
    });
    if (error) return toast.error(error.message);
    setTopic(""); setTitle(""); setBody("");
    qc.invalidateQueries({ queryKey: ["seo"] });
    toast.success("Draft saved");
  }

  async function togglePublish(id: string, status: string) {
    const next = status === "Published" ? "Draft" : "Published";
    await supabase.from("seo_content").update({
      status: next,
      published_at: next === "Published" ? new Date().toISOString() : null,
    }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["seo"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">SEO Content</h1>
        <p className="text-sm text-muted-foreground">Manage your content pipeline.</p>
      </div>

      <Card className="p-4">
        <form onSubmit={create} className="space-y-3">
          <div className="flex gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded px-3 py-2 text-sm bg-background">
              <option>Blog Post</option>
              <option>Product Description</option>
              <option>FAQ</option>
            </select>
            <Input placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
          </div>
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          <Button type="submit">Save draft</Button>
        </form>
      </Card>

      <div className="space-y-3">
        {items.map((s) => (
          <Card key={s.id} className="p-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{s.type}</Badge>
                <Badge variant={s.status === "Published" ? "default" : "secondary"}>{s.status}</Badge>
              </div>
              <h3 className="font-medium mt-2">{s.title}</h3>
              <p className="text-xs text-muted-foreground">{s.topic}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => togglePublish(s.id, s.status)}>
              {s.status === "Published" ? "Unpublish" : "Publish"}
            </Button>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No content yet.</p>}
      </div>
    </div>
  );
}
