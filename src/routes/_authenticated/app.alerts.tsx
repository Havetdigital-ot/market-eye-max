import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/alerts")({
  component: AlertsPage,
});

function money0(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return "$" + Math.round(v).toLocaleString();
}

function AlertsPage() {
  const qc = useQueryClient();
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts", "all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function markAllRead() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("alerts").update({ is_read: true }).eq("user_id", u.user.id).eq("is_read", false);
    qc.invalidateQueries({ queryKey: ["alerts"] });
    qc.invalidateQueries({ queryKey: ["dashboard-counts"] });
    toast.success("Marked all as read");
  }

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Price changes and new products detected across your tracked competitors.
          </p>
        </div>
        <Button onClick={markAllRead} variant="outline" className="gap-1.5">
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      <Card className="overflow-hidden">
        {alerts.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-muted grid place-items-center mx-auto mb-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="font-medium text-sm">No alerts yet</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Crawl a competitor to start tracking price changes.
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground bg-muted/30">
                <th className="text-left font-medium px-5 py-3">Competitor</th>
                <th className="text-left font-medium px-3 py-3">Product</th>
                <th className="text-left font-medium px-3 py-3">Change</th>
                <th className="text-left font-medium px-3 py-3">Type</th>
                <th className="text-left font-medium px-5 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a: any) => {
                const drop =
                  a.type === "Price Change" &&
                  Number(a.new_price) < Number(a.old_price);
                return (
                  <tr key={a.id} className={`border-t ${a.is_read ? "" : "bg-amber-50/40 dark:bg-amber-500/5"}`}>
                    <td className="px-5 py-3 font-medium">{a.competitor_name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{a.product_name}</td>
                    <td className="px-3 py-3 font-mono text-[13px]">
                      {a.type === "New Product" ? (
                        <span className="font-semibold">{money0(a.new_price)}</span>
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
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted text-xs font-medium">
                        {a.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
