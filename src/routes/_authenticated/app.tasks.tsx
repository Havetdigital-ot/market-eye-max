import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Filter,
  FileText,
  Radar,
  TrendingUp,
  Store as StoreIcon,
  Star,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

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
  Running: "bg-blue-500 animate-pulse",
  Pending: "bg-blue-500 animate-pulse",
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

function summaryText(t: any) {
  if (t.status === "Failed" && t.error_message) return t.error_message;
  const d = t.details ?? {};
  if (t.task_type === "Crawl Competitor") {
    const parts = [d.target];
    if (typeof d.found === "number") parts.push(`${d.found} product${d.found === 1 ? "" : "s"}`);
    if (typeof d.alerts === "number") parts.push(`${d.alerts} alert${d.alerts === 1 ? "" : "s"}`);
    return parts.filter(Boolean).join(" · ") || "—";
  }
  if (t.task_type === "Scan Trends") {
    const plats = Array.isArray(d.platforms) ? d.platforms.join(", ") : "";
    const kws = Array.isArray(d.keywords) ? `[${d.keywords.join(", ")}]` : "";
    const found = typeof d.found === "number" ? ` · ${d.found} found` : "";
    return [plats, kws].filter(Boolean).join(" ") + found || "—";
  }
  if (t.task_type === "Generate Brand" || t.task_type === "Generate Store")
    return d.brand || d.store || "—";
  if (t.task_type === "Generate SEO") return d.topic || "—";
  return "—";
}

function fmtTime(s: string) {
  try {
    return format(new Date(s), "MMM d, yyyy · HH:mm:ss");
  } catch {
    return s;
  }
}

function duration(startIso: string, endMs: number | string) {
  const end = typeof endMs === "number" ? endMs : new Date(endMs).getTime();
  const ms = end - new Date(startIso).getTime();
  if (isNaN(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function TasksPage() {
  const qc = useQueryClient();
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const { data: tasks = [], isFetching, isLoading, isError, refetch } = useQuery({
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
    refetchInterval: (q) => {
      const data = q.state.data as any[] | undefined;
      const hasRunning = data?.some((t) => t.status === "Running" || t.status === "Pending");
      return hasRunning ? 3000 : false;
    },
  });

  const hasActiveTasks = tasks.some(
    (t: any) => t.status === "Running" || t.status === "Pending"
  );
  const now = useNow(hasActiveTasks);

  const types = Array.from(new Set(tasks.map((t: any) => t.task_type)));
  const filtered = tasks.filter((t: any) => {
    if (type !== "all" && t.task_type !== type) return false;
    if (status !== "all" && t.status !== status) return false;
    return true;
  });

  async function dismiss(id: string) {
    setDismissingId(id);
    try {
      const { error } = await supabase.from("background_tasks").update({ dismissed: true }).eq("id", id);
      if (error) return toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["badge", "tasks"] });
    } finally {
      setDismissingId(null);
    }
  }

  function toggle(id: string) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Task Log</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Background jobs across crawling, trend scans, and AI generation. Click a row for full details.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
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
        <div className="grid grid-cols-[24px_1.4fr_0.9fr_2fr_0.8fr_0.8fr_0.7fr] gap-4 px-6 py-3 text-xs font-medium text-muted-foreground border-b bg-muted/30">
          <div></div>
          <div>Task</div>
          <div>Status</div>
          <div>Summary</div>
          <div>Created</div>
          <div>Duration</div>
          <div className="text-right"></div>
        </div>

        {isError ? (
          <div className="py-14 flex flex-col items-center gap-3 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <div>
              <div className="font-medium text-sm">Failed to load tasks</div>
              <div className="text-xs text-muted-foreground mt-0.5">Check your connection and try again.</div>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </Button>
          </div>
        ) : isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[24px_1.4fr_0.9fr_2fr_0.8fr_0.8fr_0.7fr] gap-4 px-6 py-4 items-center border-b last:border-b-0"
            >
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-[10px] shrink-0" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
              <div />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-muted grid place-items-center mx-auto mb-3">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="font-medium text-sm">
              {tasks.length === 0 ? "No tasks yet" : "No tasks match your filters"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {tasks.length === 0
                ? "Tasks appear here when you crawl competitors, scan trends, or generate content."
                : "Try changing the task type or status filter above."}
            </div>
          </div>
        ) : (
          filtered.map((t: any) => {
            const Icon = TYPE_ICON[t.task_type] ?? FileText;
            const failed = t.status === "Failed";
            const isActive = t.status === "Running" || t.status === "Pending";
            const isOpen = !!expanded[t.id];
            const Chevron = isOpen ? ChevronDown : ChevronRight;
            const taskDuration = duration(t.created_at, isActive ? now : t.updated_at);
            return (
              <div key={t.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="w-full grid grid-cols-[24px_1.4fr_0.9fr_2fr_0.8fr_0.8fr_0.7fr] gap-4 px-6 py-4 items-center text-left hover:bg-muted/30 transition-colors"
                >
                  <Chevron className="h-4 w-4 text-muted-foreground" />
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
                    {summaryText(t)}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono tabular-nums">
                    {taskDuration}
                  </div>
                  <div
                    className="flex justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={dismissingId === t.id}
                        onClick={() => dismiss(t.id)}
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 bg-muted/20 border-t">
                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                      <Field label="Task ID" value={t.id} mono />
                      <Field label="Type" value={t.task_type} />
                      <Field label="Status" value={t.status} />
                      <Field label="Created" value={fmtTime(t.created_at)} mono />
                      <Field label="Last update" value={fmtTime(t.updated_at)} mono />
                      <Field label="Duration" value={taskDuration} mono />
                    </div>

                    {t.error_message && (
                      <div className="mt-4">
                        <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">
                          Error
                        </div>
                        <pre className="text-xs bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-md p-3 whitespace-pre-wrap break-all border border-red-200/60 dark:border-red-900/40 max-h-[300px] overflow-y-auto">
                          {t.error_message}
                        </pre>
                      </div>
                    )}

                    <div className="mt-4">
                      <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">
                        Details payload
                      </div>
                      <pre className="text-xs bg-background rounded-md p-3 overflow-auto max-h-[300px] border font-mono">
                        {JSON.stringify(t.details ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </div>
      <div className={`mt-0.5 ${mono ? "font-mono text-[12px]" : ""} break-all`}>
        {value}
      </div>
    </div>
  );
}
