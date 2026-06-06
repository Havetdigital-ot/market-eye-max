import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/")({
  component: DashboardPage,
});

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
        .limit(8);
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

  const tiles = [
    { label: "Competitors", value: counts?.competitors ?? 0 },
    { label: "Products tracked", value: counts?.products ?? 0 },
    { label: "Unread alerts", value: counts?.alerts ?? 0 },
    { label: "Trends discovered", value: counts?.trends ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live view of your market intelligence.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="text-sm text-muted-foreground">{t.label}</div>
            <div className="text-3xl font-semibold mt-1">{t.value}</div>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Recent alerts</h2>
          <div className="space-y-2">
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">No alerts yet.</p>}
            {alerts.map((a) => (
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
                <Badge variant={a.is_read ? "secondary" : "default"}>{a.type}</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Background tasks</h2>
          <div className="space-y-2">
            {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
            {tasks.map((t) => (
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
