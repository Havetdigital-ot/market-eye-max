import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/alerts")({
  component: AlertsPage,
});

const PAGE_SIZE = 25;

type AlertType = "All" | "Price Change" | "New Product";
type ReadFilter = "All" | "Unread";

function money0(n: number | string | null | undefined) {
  return "$" + Number(n ?? 0).toFixed(2);
}

function AlertsPage() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<AlertType>("All");
  const [readFilter, setReadFilter] = useState<ReadFilter>("All");
  const [page, setPage] = useState(1);
  const [marking, setMarking] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);

  const { data: alerts = [], isLoading, isError } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function markRead(id: string) {
    if (readingId === id) return;
    setReadingId(id);
    try {
      const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", id);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["badge", "alerts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts"] });
    } finally {
      setReadingId(null);
    }
  }

  async function markAllRead() {
    if (marking) return;
    setMarking(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { error } = await supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("user_id", u.user.id)
        .eq("is_read", false);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-counts"] });
      toast.success("Marked all as read");
    } finally {
      setMarking(false);
    }
  }

  const filtered = alerts.filter((a: any) => {
    if (typeFilter !== "All" && a.type !== typeFilter) return false;
    if (readFilter === "Unread" && a.is_read) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const unreadCount = alerts.filter((a: any) => !a.is_read).length;

  function handleFilterChange(type?: AlertType, read?: ReadFilter) {
    if (type !== undefined) setTypeFilter(type);
    if (read !== undefined) setReadFilter(read);
    setPage(1);
  }

  return (
    <div className="space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Price changes and new products detected across your tracked competitors.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark all alerts as read?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""} as read.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={marking}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={markAllRead} disabled={marking} className="gap-1.5">
                {marking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {marking ? "Marking…" : "Mark all read"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
          {(["All", "Price Change", "New Product"] as AlertType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleFilterChange(t)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                typeFilter === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
          {(["All", "Unread"] as ReadFilter[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleFilterChange(undefined, r)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                readFilter === r
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "Unread" && unreadCount > 0 ? `Unread (${unreadCount})` : r}
            </button>
          ))}
        </div>
        {filtered.length > 0 && !isLoading && (
          <span className="ml-auto text-xs text-muted-foreground">
            {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length} alert{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table card */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-48 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-24 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 grid place-items-center mx-auto mb-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="font-medium text-sm">Failed to load alerts</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Check your connection and try refreshing the page.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-muted grid place-items-center mx-auto mb-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="font-medium text-sm">
              {alerts.length === 0 ? "No alerts yet" : "No alerts match your filters"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {alerts.length === 0
                ? "Crawl a competitor to start tracking price changes."
                : "Try changing the type or read-status filter above."}
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground bg-muted/30">
                <th scope="col" className="text-left font-medium px-5 py-3">Competitor</th>
                <th scope="col" className="text-left font-medium px-3 py-3">Product</th>
                <th scope="col" className="text-left font-medium px-3 py-3">Change</th>
                <th scope="col" className="text-left font-medium px-3 py-3">Type</th>
                <th scope="col" className="text-left font-medium px-5 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a: any) => {
                const drop =
                  a.type === "Price Change" &&
                  Number(a.new_price) < Number(a.old_price);
                return (
                  <tr
                    key={a.id}
                    onClick={!a.is_read && readingId !== a.id ? () => markRead(a.id) : undefined}
                    tabIndex={!a.is_read ? 0 : undefined}
                    aria-label={!a.is_read ? "Mark as read" : undefined}
                    onKeyDown={!a.is_read && readingId !== a.id ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); markRead(a.id); } } : undefined}
                    className={cn(
                      "border-t transition-colors",
                      !a.is_read &&
                        "bg-amber-50/60 dark:bg-amber-500/8 border-l-2 border-l-amber-400 cursor-pointer hover:bg-amber-100/60 dark:hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      readingId === a.id && "opacity-50 pointer-events-none"
                    )}
                  >
                    <td className="px-5 py-3 font-medium">{a.competitor_name}</td>
                    <td className="px-3 py-3 text-muted-foreground max-w-[260px] truncate" title={a.product_name}>
                      {a.product_name}
                    </td>
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
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          a.type === "New Product"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                            : drop
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                        )}
                      >
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

      {/* Pagination */}
      {!isLoading && !isError && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
