import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, TrendingUp, TrendingDown, Sparkles, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { toast } from "sonner";

function timeAgo(iso: string) {
  const date = new Date(iso);
  const diff = Math.max(0, Date.now() - date.getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return format(date, sameYear ? "MMM d" : "MMM d, yyyy");
}

export function NotificationsPopover({ count }: { count: number }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: alerts = [], isLoading: alertsLoading, isError: alertsError } = useQuery({
    queryKey: ["alerts", "popover"],
    queryFn: async () => {
      const { data } = await supabase
        .from("alerts")
        .select("id, type, competitor_name, product_name, old_price, new_price, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  async function markAllRead() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("user_id", u.user.id)
      .eq("is_read", false);
    if (error) {
      toast.error("Couldn't mark as read");
      return;
    }
    qc.invalidateQueries({ queryKey: ["alerts"] });
    qc.invalidateQueries({ queryKey: ["badge", "alerts"] });
    toast.success("All notifications marked as read");
  }

  async function openAlert(id: string) {
    await supabase.from("alerts").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["alerts"] });
    qc.invalidateQueries({ queryKey: ["badge", "alerts"] });
    navigate({ to: "/app/alerts" });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative w-10 h-10 rounded-full bg-background border grid place-items-center hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px] text-foreground" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full grid place-items-center text-[10px] font-bold text-white bg-rose-500 border-2 border-background">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-xs text-muted-foreground">
              {count > 0 ? `${count} unread` : "All caught up"}
            </div>
          </div>
          {count > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {alertsError ? (
            <div className="py-8 flex flex-col items-center gap-1.5 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Failed to load notifications.</span>
            </div>
          ) : alertsLoading ? (
            <div className="divide-y">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 px-4 py-3">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-36 rounded" />
                    <Skeleton className="h-3 w-48 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            alerts.map((a) => {
              const dropped =
                a.old_price != null && a.new_price != null && Number(a.new_price) < Number(a.old_price);
              const Icon =
                a.type === "New Product" ? Sparkles : dropped ? TrendingDown : TrendingUp;
              const iconColor = a.type === "New Product"
                ? "text-violet-600 bg-violet-50"
                : dropped
                ? "text-emerald-600 bg-emerald-50"
                : "text-rose-600 bg-rose-50";
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => openAlert(a.id)}
                  className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors flex gap-3 ${
                    !a.is_read ? "bg-blue-50/40" : ""
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {a.type} · {a.competitor_name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.product_name}
                      {a.old_price != null && a.new_price != null && (
                        <> · ${Number(a.old_price)} → ${Number(a.new_price)}</>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {timeAgo(a.created_at)}
                    </div>
                  </div>
                  {!a.is_read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: "/app/alerts" })}
          className="w-full px-4 py-2.5 text-xs font-medium text-blue-600 hover:bg-muted/50 border-t"
        >
          View all alerts
        </button>
      </PopoverContent>
    </Popover>
  );
}
