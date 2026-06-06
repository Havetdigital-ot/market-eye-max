import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Bell,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: DashboardPage,
});

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 200 70% 50%))", "hsl(var(--chart-3, 280 60% 55%))", "hsl(var(--chart-4, 30 80% 55%))", "hsl(var(--chart-5, 160 60% 45%))"];

function DashboardPage() {
  const { data: counts } = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const [comp, prod, alerts, trends] = await Promise.all([
        supabase.from("competitors").select("id", { count: "exact", head: true }),
        supabase.from("competitor_products").select("id", { count: "exact", head: true }),
        supabase.from("alerts").select("id", { count: "exact", head: true }).eq("is_read", false),
        supabase.from("trends").select("id", { count: "exact", head: true }),
      ]);
      return {
        competitors: comp.count ?? 0,
        products: prod.count ?? 0,
        alerts: alerts.count ?? 0,
        trends: trends.count ?? 0,
      };
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts", "recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("background_tasks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const { data: priceSeries = [] } = useQuery({
    queryKey: ["price-history-trend"],
    queryFn: async () => {
      const { data } = await supabase
        .from("price_history")
        .select("price, observed_at")
        .order("observed_at", { ascending: true })
        .limit(200);
      // Bucket by day, average price
      const buckets = new Map<string, { sum: number; n: number }>();
      (data ?? []).forEach((row: any) => {
        const day = new Date(row.observed_at).toISOString().slice(0, 10);
        const b = buckets.get(day) ?? { sum: 0, n: 0 };
        b.sum += Number(row.price) || 0;
        b.n += 1;
        buckets.set(day, b);
      });
      return Array.from(buckets.entries()).map(([day, b]) => ({
        day: day.slice(5),
        avg: +(b.sum / b.n).toFixed(2),
      }));
    },
  });

  const { data: alertsByDay = [] } = useQuery({
    queryKey: ["alerts-by-day"],
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("alerts")
        .select("type, created_at")
        .gte("created_at", since);
      const buckets = new Map<string, { day: string; price: number; new: number }>();
      (data ?? []).forEach((a: any) => {
        const day = new Date(a.created_at).toISOString().slice(5, 10);
        const b = buckets.get(day) ?? { day, price: 0, new: 0 };
        if (a.type === "Price Change") b.price += 1;
        else b.new += 1;
        buckets.set(day, b);
      });
      return Array.from(buckets.values());
    },
  });

  const { data: topCompetitors = [] } = useQuery({
    queryKey: ["top-competitors"],
    queryFn: async () => {
      const { data } = await supabase
        .from("competitor_products")
        .select("competitor_id, competitors(name)")
        .limit(500);
      const counts = new Map<string, number>();
      (data ?? []).forEach((row: any) => {
        const name = row.competitors?.name ?? "Unknown";
        counts.set(name, (counts.get(name) ?? 0) + 1);
      });
      return Array.from(counts.entries())
        .map(([name, products]) => ({ name, products }))
        .sort((a, b) => b.products - a.products)
        .slice(0, 6);
    },
  });

  const { data: trendPlatforms = [] } = useQuery({
    queryKey: ["trend-platforms"],
    queryFn: async () => {
      const { data } = await supabase.from("trends").select("platform").limit(500);
      const counts = new Map<string, number>();
      (data ?? []).forEach((t: any) => {
        const key = t.platform ?? "Other";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
      return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
    },
  });

  const priceChanges = alerts.filter((a: any) => a.type === "Price Change");
  const avgDelta =
    priceChanges.length > 0
      ? priceChanges.reduce(
          (s: number, a: any) => s + (Number(a.new_price) - Number(a.old_price)),
          0,
        ) / priceChanges.length
      : 0;

  const tiles = [
    {
      label: "Competitors",
      value: counts?.competitors ?? 0,
      icon: Users,
      hint: "tracked storefronts",
    },
    {
      label: "Products tracked",
      value: counts?.products ?? 0,
      icon: Package,
      hint: "across catalogs",
    },
    {
      label: "Unread alerts",
      value: counts?.alerts ?? 0,
      icon: Bell,
      hint: avgDelta !== 0 ? `avg Δ $${avgDelta.toFixed(2)}` : "no recent changes",
      trend: avgDelta > 0 ? "up" : avgDelta < 0 ? "down" : "flat",
    },
    {
      label: "Trends discovered",
      value: counts?.trends ?? 0,
      icon: Sparkles,
      hint: "from discovery scans",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live market intelligence across competitors, prices, and trends.</p>
        </div>
        <Badge variant="outline" className="text-xs">Live · auto-refreshing</Badge>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          const TrendIcon = t.trend === "up" ? TrendingUp : t.trend === "down" ? TrendingDown : null;
          return (
            <Card key={t.label} className="p-4 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</div>
                  <div className="text-3xl font-semibold mt-1 tabular-nums">{t.value}</div>
                </div>
                <div className="rounded-md bg-primary/10 text-primary p-2">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                {TrendIcon && <TrendIcon className={`h-3 w-3 ${t.trend === "up" ? "text-emerald-500" : "text-rose-500"}`} />}
                <span>{t.hint}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Average competitor price</h2>
              <p className="text-xs text-muted-foreground">Rolling daily average across tracked SKUs.</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceSeries} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="avg" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#priceFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-1">Trend platforms</h2>
          <p className="text-xs text-muted-foreground mb-3">Where discovered trends are coming from.</p>
          <div className="h-64">
            {trendPlatforms.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No trend data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={trendPlatforms} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {trendPlatforms.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h2 className="font-semibold mb-1">Alerts — last 14 days</h2>
          <p className="text-xs text-muted-foreground mb-3">Price changes vs. new listings.</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertsByDay} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={32} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="price" name="Price change" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="new" name="New product" stackId="a" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-1">Top competitors</h2>
          <p className="text-xs text-muted-foreground mb-3">By products tracked.</p>
          <div className="h-56">
            {topCompetitors.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No competitors yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCompetitors} layout="vertical" margin={{ left: 8, right: 12, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="products" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Lists */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Recent alerts</h2>
          <div className="space-y-2">
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts yet.</p>}
            {alerts.map((a: any) => {
              const delta = Number(a.new_price) - Number(a.old_price ?? a.new_price);
              return (
                <div key={a.id} className="flex items-start justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                  <div>
                    <div className="font-medium">{a.product_name}</div>
                    <div className="text-muted-foreground text-xs">
                      {a.competitor_name} ·{" "}
                      {a.type === "Price Change"
                        ? `$${a.old_price} → $${a.new_price}`
                        : `new at $${a.new_price}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.type === "Price Change" && (
                      <span className={`text-xs tabular-nums ${delta < 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(2)}
                      </span>
                    )}
                    <Badge variant={a.is_read ? "secondary" : "default"}>{a.type}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Background tasks</h2>
          <div className="space-y-2">
            {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
            {tasks.map((t: any) => (
              <div key={t.id} className="flex items-start justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <div>
                  <div className="font-medium">{t.task_type}</div>
                  <div className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                    {t.error_message && <span className="text-destructive ml-1">· {t.error_message.slice(0, 60)}</span>}
                  </div>
                </div>
                <Badge
                  variant={
                    t.status === "Completed" ? "secondary" : t.status === "Failed" ? "destructive" : "default"
                  }
                >
                  {t.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
