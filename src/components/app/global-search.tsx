import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Radar,
  Sparkles,
  Star,
  FileText,
  Store as StoreIcon,
  ListChecks,
  TrendingUp,
  Package,
  Bell,
  AlertCircle,
} from "lucide-react";

const PAGES = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/competitors", label: "Competitor Monitor", icon: Radar },
  { to: "/app/discovery", label: "Product Discovery", icon: Sparkles },
  { to: "/app/brand", label: "Brand Builder", icon: Star },
  { to: "/app/seo", label: "SEO Content", icon: FileText },
  { to: "/app/store", label: "Store Generator", icon: StoreIcon },
  { to: "/app/alerts", label: "Alerts", icon: Bell },
  { to: "/app/tasks", label: "Task Log", icon: ListChecks },
] as const;

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 180);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const enabled = debounced.length > 0;
  const like = `%${debounced}%`;

  const { data: competitors = [], isLoading: competitorsLoading, isError: competitorsError } = useQuery({
    queryKey: ["search", "competitors", debounced],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitors")
        .select("id, display_name, url")
        .or(`display_name.ilike.${like},url.ilike.${like}`)
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products = [], isLoading: productsLoading, isError: productsError } = useQuery({
    queryKey: ["search", "products", debounced],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitor_products")
        .select("id, name, category")
        .ilike("name", like)
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: trends = [], isLoading: trendsLoading, isError: trendsError } = useQuery({
    queryKey: ["search", "trends", debounced],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trends")
        .select("id, keyword, product_name, platform")
        .or(`keyword.ilike.${like},product_name.ilike.${like}`)
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: alerts = [], isLoading: alertsLoading, isError: alertsError } = useQuery({
    queryKey: ["search", "alerts", debounced],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, type, competitor_name, product_name")
        .or(`competitor_name.ilike.${like},product_name.ilike.${like},type.ilike.${like}`)
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const anyLoading = enabled && (competitorsLoading || productsLoading || trendsLoading || alertsLoading);
  const anyError = enabled && !anyLoading && (competitorsError && productsError && trendsError && alertsError);

  const go = (to: string) => {
    onOpenChange(false);
    navigate({ to: to as any });
  };

  const filteredPages = enabled
    ? PAGES.filter((p) => p.label.toLowerCase().includes(debounced.toLowerCase()))
    : PAGES;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search competitors, products, trends…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!anyLoading && (
          <CommandEmpty>
            {debounced
              ? `No results for "${debounced}" — try a competitor name, product, or keyword.`
              : "No results found."}
          </CommandEmpty>
        )}

        {anyLoading && (
          <CommandGroup heading="Searching…">
            {[0, 1, 2, 3].map((i) => (
              <CommandItem key={i} value={`__loading-${i}`} disabled>
                <Skeleton className="h-4 w-4 mr-2 rounded-sm shrink-0" />
                <Skeleton className="h-3.5 rounded" style={{ width: `${[120, 96, 144, 108][i]}px` }} />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {anyError && (
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span>Search failed — check your connection and try again.</span>
          </div>
        )}

        {!anyLoading && filteredPages.length > 0 && (
          <CommandGroup heading="Navigate">
            {filteredPages.map((p) => {
              const Icon = p.icon;
              return (
                <CommandItem key={p.to} value={`page-${p.label}`} onSelect={() => go(p.to)}>
                  <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{p.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {!anyLoading && competitors.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Competitors">
              {competitors.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`competitor-${c.id}-${c.display_name}`}
                  onSelect={() => go("/app/competitors")}
                >
                  <Radar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{c.display_name}</span>
                  {c.url && (
                    <span className="ml-2 text-xs text-muted-foreground truncate">
                      {c.url.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {!anyLoading && products.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Products">
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`product-${p.id}-${p.name}`}
                  onSelect={() => go("/app/competitors")}
                >
                  <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{p.name}</span>
                  {p.category && (
                    <span className="ml-2 text-xs text-muted-foreground">{p.category}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {!anyLoading && trends.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Trends">
              {trends.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`trend-${t.id}-${t.product_name ?? t.keyword ?? ""}`}
                  onSelect={() => go("/app/discovery")}
                >
                  <TrendingUp className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{t.product_name ?? t.keyword ?? "Trend"}</span>
                  {t.product_name && t.keyword && (
                    <span className="ml-2 text-xs text-muted-foreground truncate">
                      {t.keyword}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {!anyLoading && alerts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Alerts">
              {alerts.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`alert-${a.id}-${a.type}`}
                  onSelect={() => go("/app/alerts")}
                >
                  <Bell className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{a.type}</span>
                  <span className="ml-2 text-xs text-muted-foreground truncate">
                    {a.competitor_name} · {a.product_name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
