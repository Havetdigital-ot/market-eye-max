import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/app/brand")({
  component: BrandPage,
});

function BrandPage() {
  const qc = useQueryClient();
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [voice, setVoice] = useState("");

  const { data: assets = [] } = useQuery({
    queryKey: ["brand-assets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_assets")
        .select("*")
        .order("generated_at", { ascending: false });
      return data ?? [];
    },
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("brand_assets").insert({
      user_id: user.user.id,
      brand_name: brandName,
      source_description: description,
      brand_voice: voice,
      color_palette: ["#2A1E16", "#C8794A", "#E8DCC8", "#7A8B6F", "#F4EFE6"],
      font_choices: { primary: "Fraunces", secondary: "Hanken Grotesk" },
    });
    if (error) return toast.error(error.message);
    setBrandName(""); setDescription(""); setVoice("");
    qc.invalidateQueries({ queryKey: ["brand-assets"] });
    toast.success("Brand created");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Brand Builder</h1>
        <p className="text-sm text-muted-foreground">Capture brand identity assets.</p>
      </div>

      <Card className="p-4">
        <form onSubmit={create} className="space-y-3">
          <Input placeholder="Brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)} required />
          <Textarea placeholder="Brand description / source" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Textarea placeholder="Brand voice" value={voice} onChange={(e) => setVoice(e.target.value)} />
          <Button type="submit">Save brand</Button>
        </form>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {assets.map((b) => (
          <Card key={b.id} className="p-4 space-y-3">
            <div>
              <h3 className="font-semibold">{b.brand_name}</h3>
              <p className="text-xs text-muted-foreground">{b.source_description}</p>
            </div>
            {Array.isArray(b.color_palette) && (
              <div className="flex gap-1">
                {(b.color_palette as string[]).map((c, i) => (
                  <div key={i} className="h-8 w-8 rounded border" style={{ background: c }} />
                ))}
              </div>
            )}
            {b.brand_voice && <p className="text-sm">{b.brand_voice}</p>}
          </Card>
        ))}
        {assets.length === 0 && <p className="text-sm text-muted-foreground">No brand assets yet.</p>}
      </div>
    </div>
  );
}
