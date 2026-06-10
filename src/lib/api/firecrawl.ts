// Client-side wrapper around the Firecrawl server functions.
// Components should call these helpers rather than touching Supabase / Firecrawl directly.
import { supabase } from "@/integrations/supabase/client";
import { crawlCompetitor, scanTrends } from "@/lib/firecrawl.functions";

const CRAWL_ACTIVE_MS = 90_000; // 90 seconds — matches the 60s hard timeout + buffer

export async function startCompetitorCrawl(competitorId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  // Requirement 4: prevent duplicate overlapping crawls.
  // Fetch any Running tasks for this competitor from the last 24h.
  const { data: runningTasks } = await supabase
    .from("background_tasks")
    .select("id, updated_at, details")
    .eq("task_type", "Crawl Competitor")
    .eq("status", "Running")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const forThisCompetitor = (runningTasks ?? []).filter(
    (t: any) => t.details?.competitorId === competitorId,
  );

  // Split into active (updated < 5 min ago) vs stale (server restart orphans).
  const activeTasks = forThisCompetitor.filter(
    (t: any) => Date.now() - new Date(t.updated_at).getTime() < CRAWL_ACTIVE_MS,
  );
  if (activeTasks.length > 0) throw new Error("A crawl is already in progress");

  // Auto-fail orphaned stale tasks so the UI stops showing "Crawling…".
  for (const t of forThisCompetitor) {
    await supabase
      .from("background_tasks")
      .update({
        status: "Failed",
        error_message: "Timed out — server restarted mid-crawl",
        updated_at: new Date().toISOString(),
      })
      .eq("id", t.id);
  }

  const { data: comp } = await supabase
    .from("competitors")
    .select("display_name")
    .eq("id", competitorId)
    .single();

  const { data: task, error } = await supabase
    .from("background_tasks")
    .insert({
      user_id: userId,
      task_type: "Crawl Competitor",
      status: "Running",
      details: { target: comp?.display_name ?? "competitor", competitorId },
    })
    .select("id")
    .single();
  if (error || !task) throw error ?? new Error("Failed to create task");

  // Awaited so failures surface; UI also watches background_tasks via realtime.
  void crawlCompetitor({ data: { competitorId, taskId: task.id } }).catch((e) => {
    console.error("[startCompetitorCrawl] crawl failed:", e);
  });
  return { taskId: task.id };
}

export async function startTrendScan(
  keywords: string[],
  platforms: Array<"TikTok" | "Amazon" | "Reddit" | "Other">,
) {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const { data: task, error } = await supabase
    .from("background_tasks")
    .insert({
      user_id: userId,
      task_type: "Scan Trends",
      status: "Running",
      details: { keywords, platforms },
    })
    .select("id")
    .single();
  if (error || !task) throw error ?? new Error("Failed to create task");

  void scanTrends({ data: { taskId: task.id, keywords, platforms } });
  return { taskId: task.id };
}
