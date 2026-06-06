import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Star, ChevronRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { generateBrandIdentity } from "@/lib/firecrawl.functions";

const NICHE_PRESETS: { value: string; label: string; description: string }[] = [
  {
    value: "premium-espresso",
    label: "Premium home espresso gear",
    description:
      "Premium home espresso gear for design-conscious enthusiasts who care about ritual and craft.",
  },
  {
    value: "skincare-clean",
    label: "Clean skincare & beauty",
    description:
      "Clean, science-backed skincare for millennials who want minimalist routines and transparent ingredients.",
  },
  {
    value: "activewear",
    label: "Activewear & athleisure",
    description:
      "Sustainable activewear for women who train hard and want pieces that look as good off the mat as on it.",
  },
  {
    value: "pet-supplies",
    label: "Premium pet supplies",
    description:
      "Modern, vet-approved pet supplies for design-savvy owners who treat their dogs and cats like family.",
  },
  {
    value: "home-decor",
    label: "Home decor & lifestyle",
    description:
      "Warm, modern home decor for first-time apartment owners building a cozy, Instagram-ready space on a budget.",
  },
  {
    value: "supplements",
    label: "Wellness supplements",
    description:
      "Clinically-formulated daily supplements for busy professionals who want energy, focus, and better sleep.",
  },
  {
    value: "kids-toys",
    label: "Kids & educational toys",
    description:
      "Montessori-inspired wooden toys for parents of toddlers who value screen-free, open-ended play.",
  },
  {
    value: "outdoor-gear",
    label: "Outdoor & adventure gear",
    description:
      "Lightweight outdoor gear for weekend backpackers and thru-hikers who count every gram in their pack.",
  },
  {
    value: "kitchen-tools",
    label: "Kitchen tools & cookware",
    description:
      "Heirloom-quality kitchen tools for home cooks who watch YouTube tutorials and care about technique.",
  },
];

export const Route = createFileRoute("/_authenticated/app/brand")({
  component: BrandPage,
});

type BrandTemplate = {
  brand_name: string;
  brand_voice: string;
  color_palette: string[];
  font_primary: string;
  font_secondary: string;
};


function timeAgo(d: string) {
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "—";
  }
}

function BrandPage() {
  const qc = useQueryClient();
  const [nicheKey, setNicheKey] = useState<string>("");
  const [desc, setDesc] = useState("");
  const [phase, setPhase] = useState<"idle" | "generating" | "review">("idle");
  const [draft, setDraft] = useState<any | null>(null);
  const [seed, setSeed] = useState(0);

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

  const { data: templates = [] } = useQuery<BrandTemplate[]>({
    queryKey: ["brand-generation-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("brand_generation_templates")
        .select("brand_name, brand_voice, color_palette, font_primary, font_secondary")
        .order("sort_order", { ascending: true });
      return (data ?? []) as BrandTemplate[];
    },
  });

  async function generate() {
    if (!desc.trim()) {
      toast.error("Describe your product or niche first.");
      return;
    }
    setPhase("generating");
    try {
      const res = await generateBrandIdentity({ data: { description: desc } });
      if (!res || !res.ok || !res.data) throw new Error(res?.error ?? "Failed to generate brand");
      
      const t = res.data;
      setDraft({
        brand_name: t.brand_name,
        source_description: desc,
        brand_voice: t.brand_voice,
        color_palette: t.color_palette,
        font_choices: { primary: t.font_primary, secondary: t.font_secondary },
      });
      setPhase("review");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to generate");
      setPhase("idle");
    }
  }


  async function accept() {
    if (!draft) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("brand_assets").insert({
      user_id: user.user.id,
      brand_name: draft.brand_name,
      source_description: draft.source_description,
      brand_voice: draft.brand_voice,
      color_palette: draft.color_palette,
      font_choices: draft.font_choices,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["brand-assets"] });
    toast.success(`${draft.brand_name} saved to your brand library`);
    setPhase("idle");
    setDraft(null);
    setDesc("");
  }

  return (
    <div className="max-w-[1400px] space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight leading-tight">Brand Builder</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Generate a complete brand identity — name, persona, voice, palette, and type — from a single description.
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-5 items-start">
        {/* LEFT: input + library */}
        <div className="space-y-5">
          <Card className="p-5">
            <label className="text-[13px] font-semibold text-foreground">
              Product / niche description
            </label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Premium home espresso gear for design-conscious enthusiasts who care about ritual and craft…"
              className="mt-2 min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              The more specific, the better the result.
            </p>
            <Button
              onClick={generate}
              disabled={phase === "generating"}
              className="w-full mt-3.5 h-11 gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {phase === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" /> Generate brand
                </>
              )}
            </Button>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center px-5 py-4 border-b">
              <h2 className="font-semibold text-[15px]">Brand library</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {assets.length} saved
              </span>
            </div>
            {assets.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-muted grid place-items-center mx-auto mb-3">
                  <Star className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium">No brands yet</div>
              </div>
            ) : (
              assets.map((b: any) => (
                <div
                  key={b.id}
                  className="flex items-center gap-3 px-5 py-3.5 border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex">
                    {(Array.isArray(b.color_palette) ? b.color_palette.slice(0, 4) : []).map(
                      (c: string, i: number) => (
                        <div
                          key={i}
                          className="w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-white"
                          style={{ background: c, marginLeft: i ? -5 : 0 }}
                        />
                      ),
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{b.brand_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {timeAgo(b.generated_at)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              ))
            )}
          </Card>
        </div>

        {/* RIGHT: result panel */}
        <Card className="min-h-[460px]">
          {phase === "generating" ? (
            <GenLoader />
          ) : phase === "review" && draft ? (
            <BrandReview draft={draft} onAccept={accept} onRegen={generate} />
          ) : (
            <EmptyState />
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full min-h-[460px] flex flex-col items-center justify-center text-center p-8">
      <div className="w-14 h-14 rounded-xl bg-muted grid place-items-center mb-4">
        <Star className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold">Your brand will appear here</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        Describe your product and hit Generate to see a full identity you can refine and save.
      </p>
    </div>
  );
}

function GenLoader() {
  return (
    <div className="h-full min-h-[460px] flex flex-col items-center justify-center text-center p-8">
      <div className="w-14 h-14 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4" />
      <h3 className="text-lg font-bold">Designing your brand…</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Synthesizing name, persona, voice and palette
      </p>
    </div>
  );
}

function BrandReview({
  draft,
  onAccept,
  onRegen,
}: {
  draft: any;
  onAccept: () => void;
  onRegen: () => void;
}) {
  return (
    <div>
      <div className="flex items-center px-5 py-4 border-b">
        <h3 className="font-semibold text-[15px]">Review generated brand</h3>
        <span className="ml-auto inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
          <Sparkles className="h-3 w-3" /> AI draft
        </span>
      </div>
      <div className="p-5 space-y-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Brand name
          </div>
          <div className="text-3xl font-extrabold tracking-tight">{draft.brand_name}</div>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Color palette
          </div>
          <div className="flex gap-2">
            {draft.color_palette.map((c: string, i: number) => (
              <div
                key={i}
                className="flex-1 h-16 rounded-lg flex items-end justify-center pb-1.5 text-[10px] font-mono font-semibold text-white/90"
                style={{
                  background: c,
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Typography
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-xs text-muted-foreground">Primary</div>
            <div className="text-lg font-bold">{draft.font_choices.primary}</div>
            <div className="text-xs text-muted-foreground mt-2">Secondary</div>
            <div className="text-base">{draft.font_choices.secondary}</div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            Brand voice
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/80">
            {draft.brand_voice}
          </p>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onRegen} className="gap-2">
            <Sparkles className="h-4 w-4" /> Regenerate
          </Button>
          <Button
            onClick={onAccept}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            Accept & save
          </Button>
        </div>
      </div>
    </div>
  );
}
