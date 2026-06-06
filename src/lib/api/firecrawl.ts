// Client-side wrapper around the Firecrawl server functions.
// Components should call these helpers rather than touching Supabase / Firecrawl directly.
import { supabase } from "@/integrations/supabase/client";
import { crawlCompetitor, scanTrends } from "@/lib/firecrawl.functions";

export async function startCompetitorCrawl(competitorId: string) {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Not authenticated");

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

  // Fire and forget; UI watches background_tasks via realtime.
  void crawlCompetitor({ data: { competitorId, taskId: task.id } });
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
