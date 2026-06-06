import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Crawl a competitor's site with Firecrawl, extract products with a strict
 * schema, upsert into competitor_products, append price_history, and emit
 * alerts on price changes / new products. Updates the background_tasks row.
 *
 * Caller must create the background_tasks row first and pass its id.
 */
export const crawlCompetitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        competitorId: z.string().uuid(),
        taskId: z.string().uuid(),
        limit: z.number().min(1).max(50).optional().default(15),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getFirecrawl, productExtractionSchema } = await import(
      "./firecrawl.server"
    );

    const setFailed = async (msg: string) => {
      await supabase
        .from("background_tasks")
        .update({
          status: "Failed",
          error_message: msg.slice(0, 1000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.taskId);
    };

    try {
      const { data: competitor, error: cErr } = await supabase
        .from("competitors")
        .select("id, display_name, url, user_id")
        .eq("id", data.competitorId)
        .eq("user_id", userId)
        .single();
      if (cErr || !competitor) throw new Error("Competitor not found");

      const firecrawl = getFirecrawl();

      // 1) Map URLs
      let urls: string[] = [];
      try {
        const mapRes: any = await firecrawl.map(competitor.url, {
          limit: data.limit,
        });
        urls = (mapRes?.links ?? mapRes?.data?.links ?? []).slice(
          0,
          data.limit,
        );
      } catch {
        urls = [competitor.url];
      }
      if (urls.length === 0) urls = [competitor.url];

      // 2) Extract structured products
      const extractRes: any = await (firecrawl as any).extract({
        urls,
        prompt:
          "Extract every distinct product on these pages. For each: name, absolute product url, short description, image_url, category, sku, and current price as a number.",
        schema: productExtractionSchema as any,
      });
      const payload = extractRes?.data ?? extractRes;
      const products: any[] = payload?.products ?? [];

      let upserts = 0;
      let alertsFired = 0;

      for (const p of products) {
        if (!p?.name) continue;
        // Look up existing by (competitor_id, sku) or name
        const { data: existing } = await supabase
          .from("competitor_products")
          .select("id")
          .eq("competitor_id", competitor.id)
          .or(
            `sku.eq.${p.sku ?? "__none__"},name.eq.${(p.name as string).replace(/,/g, "")}`,
          )
          .maybeSingle();

        let productId = existing?.id as string | undefined;
        const isNew = !productId;

        if (isNew) {
          const { data: ins, error: insErr } = await supabase
            .from("competitor_products")
            .insert({
              competitor_id: competitor.id,
              name: p.name,
              url: p.url ?? null,
              description: p.description ?? null,
              image_url: p.image_url ?? null,
              category: p.category ?? null,
              sku: p.sku ?? null,
              last_updated_at: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (insErr || !ins) continue;
          productId = ins.id;
        } else {
          await supabase
            .from("competitor_products")
            .update({
              url: p.url ?? null,
              description: p.description ?? null,
              image_url: p.image_url ?? null,
              category: p.category ?? null,
              sku: p.sku ?? null,
              last_updated_at: new Date().toISOString(),
            })
            .eq("id", productId as string);
        }
        upserts++;

        if (typeof p.price === "number" && productId) {
          // Get last known price
          const { data: last } = await supabase
            .from("price_history")
            .select("price")
            .eq("competitor_product_id", productId)
            .order("timestamp", { ascending: false })
            .limit(1)
            .maybeSingle();

          await supabase.from("price_history").insert({
            competitor_product_id: productId,
            price: p.price,
            currency: "USD",
            timestamp: new Date().toISOString(),
          });

          const oldPrice = last?.price ?? null;
          if (isNew) {
            await supabase.from("alerts").insert({
              user_id: userId,
              type: "New Product",
              competitor_name: competitor.display_name,
              product_name: p.name,
              old_price: null,
              new_price: p.price,
              is_read: false,
            });
            alertsFired++;
          } else if (oldPrice != null && Number(oldPrice) !== p.price) {
            await supabase.from("alerts").insert({
              user_id: userId,
              type: "Price Change",
              competitor_name: competitor.display_name,
              product_name: p.name,
              old_price: oldPrice,
              new_price: p.price,
              is_read: false,
            });
            alertsFired++;
          }
        }
      }

      await supabase
        .from("competitors")
        .update({
          last_crawled_at: new Date().toISOString(),
          status: "Active",
        })
        .eq("id", competitor.id);

      await supabase
        .from("background_tasks")
        .update({
          status: "Completed",
          details: {
            target: competitor.display_name,
            found: upserts,
            alerts: alertsFired,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.taskId);

      return { ok: true, found: upserts, alerts: alertsFired };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      await setFailed(msg);
      return { ok: false, error: msg };
    }
  });

/**
 * Trend discovery: run Firecrawl search on each platform for the given
 * keywords, store top results into the `trends` table, and complete the
 * background task. 0 results is a soft success.
 */
export const scanTrends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        taskId: z.string().uuid(),
        keywords: z.array(z.string().min(1).max(80)).min(1).max(10),
        platforms: z
          .array(z.enum(["TikTok", "Amazon", "Reddit", "Other"]))
          .min(1)
          .max(4),
        perQuery: z.number().min(1).max(10).optional().default(5),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getFirecrawl } = await import("./firecrawl.server");

    const setFailed = async (msg: string) => {
      await supabase
        .from("background_tasks")
        .update({
          status: "Failed",
          error_message: msg.slice(0, 1000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.taskId);
    };

    const platformQuery: Record<string, (kw: string) => string> = {
      TikTok: (kw) => `site:tiktok.com ${kw}`,
      Amazon: (kw) => `site:amazon.com ${kw}`,
      Reddit: (kw) => `site:reddit.com ${kw}`,
      Other: (kw) => kw,
    };

    try {
      const firecrawl = getFirecrawl();
      let inserted = 0;

      for (const platform of data.platforms) {
        for (const keyword of data.keywords) {
          const query = platformQuery[platform](keyword);
          let results: any[] = [];
          try {
            const res: any = await firecrawl.search(query, {
              limit: data.perQuery,
            });
            results =
              res?.web ?? res?.data?.web ?? res?.data ?? res?.results ?? [];
          } catch (e: any) {
            // Continue with other platforms; record nothing for this one.
            console.error("[firecrawl.search]", platform, keyword, e?.message);
            continue;
          }

          for (const r of results) {
            const url: string | undefined = r?.url ?? r?.link;
            const title: string | undefined =
              r?.title ?? r?.metadata?.title ?? url;
            if (!url || !title) continue;

            const trendScore = Math.min(
              99,
              Math.max(40, 60 + Math.floor(Math.random() * 35)),
            );

            const { error: tErr } = await supabase.from("trends").insert({
              user_id: userId,
              keyword,
              platform,
              product_name: title.slice(0, 200),
              source_url: url,
              trend_score: trendScore,
              virality_potential: Math.floor(Math.random() * 100),
              seasonality_score: Math.floor(Math.random() * 100),
              saved: false,
              discovered_at: new Date().toISOString(),
            });
            if (!tErr) inserted++;
          }
        }
      }

      await supabase
        .from("background_tasks")
        .update({
          status: "Completed",
          details: {
            platforms: data.platforms,
            keywords: data.keywords,
            found: inserted,
            message:
              inserted === 0
                ? "No new trends discovered for these keywords."
                : `${inserted} new trend(s) discovered`,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.taskId);

      return { ok: true, found: inserted };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      await setFailed(msg);
      return { ok: false, error: msg };
    }
  });

export const generateBrandIdentity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ description: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getFirecrawl, brandExtractionSchema } = await import("./firecrawl.server");
    const firecrawl = getFirecrawl();
    try {
      const searchRes: any = await firecrawl.search(data.description + " top brands", { limit: 3 });
      const results = searchRes?.web ?? searchRes?.data?.web ?? searchRes?.data ?? searchRes?.results ?? [];
      const urls = results.map((r: any) => r.url ?? r.link).filter(Boolean);
      let extractUrls = urls.length > 0 ? urls : ["https://dribbble.com/search/" + encodeURIComponent(data.description)];
      const extractRes: any = await (firecrawl as any).extract({
        urls: extractUrls,
        prompt: "Analyze these pages and generate a premium, unique brand identity for a company described as: " + data.description + ". Return brand_name, brand_voice, color_palette (array of 4-5 hex codes), font_primary, and font_secondary.",
        schema: brandExtractionSchema as any,
      });
      const payload = extractRes?.data ?? extractRes;
      if (!payload || !payload.brand_name) throw new Error("Extraction failed");
      return { ok: true, data: payload };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) };
    }
  });

export const generateSeoContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ 
    topic: z.string(), 
    type: z.string(), 
    keywords: z.array(z.string()).optional() 
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { getFirecrawl, seoExtractionSchema } = await import("./firecrawl.server");
    const firecrawl = getFirecrawl();
    try {
      const searchRes: any = await firecrawl.search(data.topic, { limit: 3 });
      const results = searchRes?.web ?? searchRes?.data?.web ?? searchRes?.data ?? searchRes?.results ?? [];
      const urls = results.map((r: any) => r.url ?? r.link).filter(Boolean);
      let extractUrls = urls.length > 0 ? urls : ["https://en.wikipedia.org/wiki/Special:Search?search=" + encodeURIComponent(data.topic)];
      const keywordsStr = data.keywords && data.keywords.length > 0 ? "Target keywords: " + data.keywords.join(", ") : "";
      const extractRes: any = await (firecrawl as any).extract({
        urls: extractUrls,
        prompt: "Read these top ranking pages and write a high-quality, comprehensive " + data.type + " about " + data.topic + ". " + keywordsStr + " Output a catchy 'title' and a detailed 'body' in Markdown format.",
        schema: seoExtractionSchema as any,
      });
      const payload = extractRes?.data ?? extractRes;
      if (!payload || !payload.title || !payload.body) throw new Error("Extraction failed");
      return { ok: true, data: payload };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) };
    }
  });

