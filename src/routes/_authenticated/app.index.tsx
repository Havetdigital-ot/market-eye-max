import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import {
  Radar,
  ListChecks,
  Bell,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ArrowRight,
  Store,
  Palette,
  FileText,
  Clock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: DashboardPage,
});

function money0(n: number | string | null | undefined) {
  return "$" + Number(n ?? 0).toFixed(2);
}

function timeAgo(d: string) {
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "—";
  }
}

function DashboardPage() {
  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: counts, isLoading: countsLoading, isError: countsError } = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [comp, tasks, alerts, trends] = await Promise.all([
        supabase
          .from("competitors")
          .select("id", { count: "exact", head: true })
          .eq("status", "Active"),
        supabase
          .from("background_tasks")
          .select("id", { count: "exact", head: true })
          .in("status", ["Running", "Pending"])
          .eq("dismissed", false),
        supabase
          .from("alerts")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false),
        supabase
          .from("trends")
          .select("id", { count: "exact", head: true })
          .eq("saved", true),
      ]);
      const firstError = [comp.error, tasks.error, alerts.error, trends.error].find(Boolean);
      if (firstError) throw firstError;
      return {
        competitors: comp.count ?? 0,
        tasks: tasks.count ?? 0,
        alerts: alerts.count ?? 0,
        trends: trends.count ?? 0,
      };
    },
  });

  const { data: alerts = [], isLoading: alertsLoading, isError: alertsError } = useQuery({
    queryKey: ["alerts", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: topTrends = [], isLoading: trendsLoading, isError: trendsError } = useQuery({
    queryKey: ["trends", "top"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trends")
        .select("*")
        .order("trend_score", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: lastStore = null, isLoading: storeLoading, isError: storeError } = useQuery({
    queryKey: ["store", "latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("background_tasks")
        .select("*")
        .eq("task_type", "Generate Store")
        .eq("status", "Completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName =
    (profile?.user_metadata as any)?.full_name?.split(" ")[0] ??
    profile?.email?.split("@")[0] ??
    "there";

  const statDefs = [
    {
      label: "Active competitors",
      key: "competitors" as const,
      icon: Radar,
      iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
      to: "/app/competitors",
    },
    {
      label: "Running tasks",
      key: "tasks" as const,
      icon: ListChecks,
      iconBg: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
      to: "/app/tasks",
    },
    {
      label: "Unread alerts",
      key: "alerts" as const,
      icon: Bell,
      iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      to: "/app/alerts",
    },
    {
      label: "Saved trends",
      key: "trends" as const,
      icon: Sparkles,
      iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      to: "/app/discovery",
    },
  ] as const;

  const quickLinks = [
    { to: "/app/competitors", label: "Competitor Monitor", icon: Radar },
    { to: "/app/discovery", label: "Product Discovery", icon: Sparkles },
    { to: "/app/brand", label: "Brand Builder", icon: Palette },
    { to: "/app/seo", label: "SEO Content", icon: FileText },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Greeting */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight leading-tight">
          {greet}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here's what's moving across your market today.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statDefs.map((s) => {
          const Icon = s.icon;
          return (
            <Link to={s.to} key={s.label} className="group">
              <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className={`w-10 h-10 rounded-lg grid place-items-center ${s.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-3xl font-bold tabular-nums tracking-tight">
                  {countsLoading ? (
                    <Skeleton className="h-8 w-12 rounded" />
                  ) : countsError ? (
                    <span className="text-muted-foreground text-2xl">—</span>
                  ) : (
                    counts?.[s.key] ?? 0
                  )}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Row 1: Recent alerts (span 2) + Latest store */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center px-5 py-4 border-b">
            <h2 className="font-semibold">Recent pricing alerts</h2>
            <Link to="/app/alerts" className="ml-auto">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          {alertsLoading ? (
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : alertsError ? (
            <div className="px-5 py-10 flex flex-col items-center gap-1.5 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Failed to load alerts.</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground space-y-1">
              <p>No alerts yet.</p>
              <p className="text-xs">Add a competitor to start receiving price change alerts.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="text-left font-medium px-5 py-2.5">Competitor</th>
                  <th scope="col" className="text-left font-medium px-3 py-2.5">Product</th>
                  <th scope="col" className="text-left font-medium px-3 py-2.5">Change</th>
                  <th scope="col" className="text-left font-medium px-5 py-2.5">When</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a: any) => {
                  const drop =
                    a.type === "Price Change" &&
                    Number(a.new_price) < Number(a.old_price);
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="px-5 py-3 font-medium max-w-[160px] truncate" title={a.competitor_name}>{a.competitor_name}</td>
                      <td className="px-3 py-3 text-muted-foreground max-w-[200px] truncate" title={a.product_name}>{a.product_name}</td>
                      <td className="px-3 py-3 font-mono text-[13px]">
                        {a.type === "New Product" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-xs font-medium">
                            New · {money0(a.new_price)}
                          </span>
                        ) : (
                          <span className="font-semibold">
                            <span className="text-muted-foreground line-through font-normal mr-1.5">
                              {money0(a.old_price)}
                            </span>
                            <span className={drop ? "text-emerald-600" : "text-rose-600"}>
                              {money0(a.new_price)}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground font-mono text-xs">
                        {timeAgo(a.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        {/* Latest store */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Latest store</h2>
          </div>
          <div className="p-5">
            {storeLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-[120px] w-full rounded-md" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ) : storeError ? (
              <div className="py-8 flex flex-col items-center gap-1.5 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span>Failed to load store data.</span>
              </div>
            ) : lastStore ? (
              <div>
                <div className="h-[120px] rounded-md bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center gap-2 px-4">
                  <Store className="h-8 w-8 text-muted-foreground/50" />
                  {(lastStore as any).details?.url && (
                    <a
                      href={(lastStore as any).details.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors truncate max-w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(lastStore as any).details.url}
                      <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    </a>
                  )}
                </div>
                <div className="mt-3.5 flex items-start justify-between gap-2">
                  <div className="font-semibold text-[15px] leading-tight">
                    {(lastStore as any).details?.store ?? "Unnamed Store"}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-medium shrink-0">
                    Ready
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                  <Clock className="h-3 w-3" />
                  Created {timeAgo((lastStore as any).created_at)}
                </div>
                <Link to="/app/store">
                  <Button variant="secondary" className="w-full mt-3.5 gap-2">
                    <Store className="h-4 w-4" /> Open Store Generator
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted grid place-items-center mx-auto mb-3">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="font-medium text-sm">No store yet</div>
                <div className="text-xs text-muted-foreground mt-0.5 mb-4">
                  Generate your first storefront.
                </div>
                <Link to="/app/store">
                  <Button variant="secondary" size="sm" className="gap-2">
                    <Store className="h-3.5 w-3.5" /> Generate Store
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Top trends (span 2) + Quick actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center px-5 py-4 border-b">
            <h2 className="font-semibold">Top trends right now</h2>
            <Link to="/app/discovery" className="ml-auto">
              <Button variant="ghost" size="sm" className="gap-1">
                Discover more <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          {trendsLoading ? (
            <div className="divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <Skeleton className="h-4 w-40 flex-1" />
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : trendsError ? (
            <div className="px-5 py-10 flex flex-col items-center gap-1.5 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Failed to load trends.</span>
            </div>
          ) : topTrends.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No trends yet. Run a scan in Product Discovery.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="text-left font-medium px-5 py-2.5">Product</th>
                  <th scope="col" className="text-left font-medium px-3 py-2.5">Platform</th>
                  <th scope="col" className="text-left font-medium px-5 py-2.5">Trend score</th>
                </tr>
              </thead>
              <tbody>
                {topTrends.map((t: any) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-5 py-3 font-medium max-w-[220px] truncate" title={t.product_name}>{t.product_name}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs font-medium">
                        {t.platform}
                      </span>
                    </td>
                    <td className="px-5 py-3 w-[220px]">
                      <ScoreBar value={t.trend_score ?? 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Quick actions */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold">Quick actions</h2>
          </div>
          <div className="p-2.5 flex flex-col gap-1">
            {quickLinks.map((l) => {
              const Icon = l.icon;
              return (
                <Link key={l.to} to={l.to}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2.5 h-10 font-medium"
                  >
                    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="flex-1 text-left">{l.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </Button>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Subtle KPI delta hint (optional) */}
      <DeltaHint alerts={alerts} />
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-xs font-mono font-semibold tabular-nums w-8 text-right">
        {Math.round(v)}
      </span>
    </div>
  );
}

function DeltaHint({ alerts }: { alerts: any[] }) {
  const priceChanges = alerts.filter((a) => a.type === "Price Change");
  if (priceChanges.length === 0) return null;
  const avg =
    priceChanges.reduce(
      (s, a) => s + (Number(a.new_price) - Number(a.old_price)),
      0,
    ) / priceChanges.length;
  if (avg === 0) return null;
  const up = avg > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className={`h-3.5 w-3.5 ${up ? "text-rose-500" : "text-emerald-500"}`} />
      Average price change across recent alerts:{" "}
      <span className={`font-mono font-semibold ${up ? "text-rose-600" : "text-emerald-600"}`}>
        {up ? "+" : ""}
        {avg.toFixed(2)}
      </span>
    </div>
  );
}
