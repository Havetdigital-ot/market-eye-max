import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Filter,
  FileText,
  Radar,
  TrendingUp,
  Store as StoreIcon,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app/tasks")({
  component: TasksPage,
});

const TYPE_ICON: Record<string, any> = {
  "Generate SEO": FileText,
  "Crawl Competitor": Radar,
  "Scan Trends": TrendingUp,
  "Generate Store": StoreIcon,
  "Generate Brand": Star,
};

const STATUS_STYLES: Record<string, string> = {
  Running: "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/40",
  Pending: "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/40",
  Completed: "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40",
  Failed: "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/40",
};
const STATUS_DOT: Record<string, string> = {
  Running: "bg-blue-500",
  Pending: "bg-blue-500",
  Completed: "bg-emerald-500",
  Failed: "bg-red-500",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? "bg-muted-foreground"}`} />
      {status}
    </span>
  );
}

function detailText(t: any) {
  if (t.status === "Failed" && t.error_message) return t.error_message;
  const d = t.details ?? {};
  if (t.task_type === "Crawl Competitor")
    return d.target ? `${d.target}${d.found ? ` · ${d.found} update(s)` : ""}` : "—";
  if (t.task_type === "Scan Trends") {
    const plats = Array.isArray(d.platforms) ? d.platforms.join(", ") : "";
    return `${plats}${d.found ? ` · ${d.found} found` : ""}`;
  }
  if (t.task_type === "Generate Brand" || t.task_type === "Generate Store")
    return d.brand || d.store || "—";
  if (t.task_type === "Generate SEO") return d.topic || "—";
  return "—";
}

function TasksPage() {
  const qc = useQueryClient();
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("background_tasks")
        .select("*")
        .eq("dismissed", false)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const types = Array.from(new Set(tasks.map((t: any) => t.task_type)));
  const filtered = tasks.filter((t: any) => {
    if (type !== "all" && t.task_type !== type) return false;
    if (status !== "all" && t.status !== status) return false;
    return true;
  });

  async function dismiss(id: string) {
    await supabase.from("background_tasks").update({ dismissed: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["badge", "tasks"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">Task Log</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Background jobs across crawling, trend scans, and AI generation.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-2 rounded-full bg-card border">
          <Filter className="h-3.5 w-3.5" /> Filter
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[180px] h-10 rounded-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All task types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] h-10 rounded-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Running">Running</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.9fr_2fr_0.7fr_0.7fr_0.7fr] gap-4 px-6 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase border-b bg-muted/30">
          <div>Task</div>
          <div>Status</div>
          <div>Details</div>
          <div>Created</div>
          <div>Updated</div>
          <div className="text-right"></div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No tasks.</div>
        ) : (
          filtered.map((t: any) => {
            const Icon = TYPE_ICON[t.task_type] ?? FileText;
            const failed = t.status === "Failed";
            return (
              <div
                key={t.id}
                className="grid grid-cols-[1.4fr_0.9fr_2fr_0.7fr_0.7fr_0.7fr] gap-4 px-6 py-4 items-center border-b last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-[10px] grid place-items-center bg-muted text-muted-foreground shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="font-medium truncate">{t.task_type}</div>
                </div>
                <div>
                  <StatusPill status={t.status} />
                </div>
                <div className={`text-sm truncate ${failed ? "text-red-600 dark:text-red-400" : ""}`}>
                  {detailText(t)}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}
                </div>
                <div className="flex justify-end">
                  {t.status !== "Running" && t.status !== "Pending" && (
                    <Button variant="outline" size="sm" onClick={() => dismiss(t.id)}>
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
