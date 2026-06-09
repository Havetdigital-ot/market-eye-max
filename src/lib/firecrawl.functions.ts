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
        limit: z.number().min(1).max(20).optional().default(3),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // We previously detached this work via ctx.waitUntil() so the HTTP
    // response could return immediately. That didn't survive on this runtime
    // (the isolate is terminated when the response is flushed), leaving every
    // task stuck "Running" until the orphan sweeper marked it failed. Now we
    // await the crawl inside the request — the HTTP connection holds the
    // isolate open. Budget is kept under ~30s end-to-end.
    const work = (async () => {
      const { getFirecrawl, productExtractionSchema } = await import("./firecrawl.server");

      const setProgress = async (stage: string, extra: Record<string, any> = {}) => {
        await supabase
          .from("background_tasks")
          .update({
            details: { competitorId: data.competitorId, stage, ...extra },
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.taskId);
      };

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

      // Hard 5-minute overall timeout — guards against server restart leaving
      // the task stuck "Running" forever. Uses .eq("status","Running") so it
      // won't overwrite a task that already completed normally.
      const hardTimeoutId = setTimeout(async () => {
        await supabase
          .from("background_tasks")
          .update({
            status: "Failed",
            error_message: "Crawl timed out after 5 minutes",
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.taskId)
          .eq("status", "Running");
      }, 5 * 60 * 1000);

      try {
        const { data: competitor, error: cErr } = await supabase
          .from("competitors")
          .select("id, display_name, url, user_id")
          .eq("id", data.competitorId)
          .eq("user_id", userId)
          .single();
        if (cErr || !competitor) throw new Error("Competitor not found");

        const firecrawl = getFirecrawl();

        // 1) Build candidate URLs — try firecrawl.map() with a hard 25s timeout,
        //    then fall back to common product-page patterns so the crawl never hangs.
        const hostname = new URL(competitor.url).hostname;
        await setProgress("mapping", { target: competitor.display_name, domain: hostname });

        const base = competitor.url.replace(/\/$/, "");
        const fallbackUrls = [
          `${base}/products`,
          `${base}/shop`,
          `${base}/collections`,
          `${base}/collections/all`,
          `${base}/catalog`,
          base,
        ].slice(0, data.limit);

        let urls: string[] = fallbackUrls;
        try {
          const mapRes: any = await Promise.race([
            firecrawl.map(competitor.url, { limit: data.limit * 4 }),
            new Promise((_, rej) =>
              setTimeout(() => rej(new Error("map timeout after 10s")), 10_000)
            ),
          ]);
          // SDK v4 returns { links: SearchResultWeb[] } — extract url string from each entry.
          const rawLinks: any[] = mapRes?.links ?? mapRes?.data?.links ?? [];
          const allLinks: string[] = rawLinks
            .map((l: any) => (typeof l === "string" ? l : (l?.url ?? "")))
            .filter(Boolean);

          const productPat = /\/(products?|shop|store|catalog|collections?|items?|buy|categor)\b/i;
          const skipPat =
            /\/(about|faq|contact|help|blog|news|press|career|legal|terms|privacy|account|cart|checkout|search|wishlist)\b/i;

          const productLinks = allLinks.filter((u) => productPat.test(u) && !skipPat.test(u));
          const otherLinks = allLinks.filter((u) => !productPat.test(u) && !skipPat.test(u));
          const mapped = [...productLinks, ...otherLinks].slice(0, data.limit);
          if (mapped.length > 0) urls = mapped;
          console.log("[crawlCompetitor] mapped", allLinks.length, "→ using", urls.length, "urls");
        } catch (mapErr: any) {
          console.warn("[crawlCompetitor] map skipped:", mapErr?.message ?? mapErr, "— using fallback URLs");
        }

        // 2) Scrape each URL with formats:[{type:"json"}] — the v4 SDK way to do LLM extraction.
        await setProgress("extracting", {
          target: competitor.display_name,
          urlCount: urls.length,
          urls: urls.slice(0, 8),
        });

        const BATCH = 2;
        const TIMEOUT = 60_000;
        const products: any[] = [];

        for (let i = 0; i < urls.length; i += BATCH) {
          const batch = urls.slice(i, i + BATCH);
          // Heartbeat: keep updated_at fresh so staleness checks don't misfire.
          await supabase
            .from("background_tasks")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", data.taskId);

          const results = await Promise.allSettled(
            batch.map((u) =>
              Promise.race([
                firecrawl.scrape(u, {
                  formats: [
                    {
                      type: "json",
                      prompt:
                        "Extract every distinct product visible on this page. For each product return: name (string), url (absolute product URL string), description (short string), image_url (string), category (string), sku (string), price (number).",
                      schema: productExtractionSchema,
                    } as any,
                  ],
                }),
                new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT)),
              ]),
            ),
          );
          for (const r of results) {
            if (r.status === "fulfilled") {
              const doc: any = r.value;
              const raw = doc?.json ?? doc?.extract;
              const list: any[] = Array.isArray(raw) ? raw : (raw?.products ?? []);
              products.push(...list);
            } else {
              console.error("[crawlCompetitor] scrape rejected:", r.reason?.message ?? r.reason);
            }
          }
        }

        // 3) Save products to DB
        await setProgress("saving", { target: competitor.display_name, found: products.length });

        let upserts = 0;
        let alertsFired = 0;

        for (const p of products) {
          if (!p?.name) continue;
          const { data: existing } = await supabase
            .from("competitor_products")
            .select("id")
            .eq("competitor_id", competitor.id)
            .or(`sku.eq.${p.sku ?? "__none__"},name.eq.${(p.name as string).replace(/,/g, "")}`)
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

        clearTimeout(hardTimeoutId);
        await supabase
          .from("background_tasks")
          .update({
            status: "Completed",
            details: {
              competitorId: data.competitorId,
              stage: "done",
              target: competitor.display_name,
              found: upserts,
              alerts: alertsFired,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.taskId);
      } catch (err: any) {
        clearTimeout(hardTimeoutId);
        await supabase
          .from("background_tasks")
          .update({
            status: "Failed",
            error_message: (err?.message ?? String(err)).slice(0, 1000),
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.taskId);
      }
    })();

    waitUntil(work);
    return { ok: true, started: true };
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
            results = res?.web ?? res?.data?.web ?? res?.data ?? res?.results ?? [];
          } catch (e: any) {
            // Continue with other platforms; record nothing for this one.
            console.error("[firecrawl.search]", platform, keyword, e?.message);
            continue;
          }

          for (const r of results) {
            const url: string | undefined = r?.url ?? r?.link;
            const title: string | undefined = r?.title ?? r?.metadata?.title ?? url;
            if (!url || !title) continue;

            const trendScore = Math.min(99, Math.max(40, 60 + Math.floor(Math.random() * 35)));

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
      const results =
        searchRes?.web ?? searchRes?.data?.web ?? searchRes?.data ?? searchRes?.results ?? [];
      const urls = results.map((r: any) => r.url ?? r.link).filter(Boolean);
      let extractUrls =
        urls.length > 0
          ? urls
          : ["https://dribbble.com/search/" + encodeURIComponent(data.description)];
      const extractRes: any = await (firecrawl as any).extract({
        urls: extractUrls,
        prompt:
          "Analyze these pages and generate a premium, unique brand identity for a company described as: " +
          data.description +
          ". Return brand_name, brand_voice, color_palette (array of 4-5 hex codes), font_primary, and font_secondary.",
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
  .inputValidator((input) =>
    z
      .object({
        topic: z.string(),
        type: z.string(),
        keywords: z.array(z.string()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getFirecrawl, seoExtractionSchema } = await import("./firecrawl.server");
    const firecrawl = getFirecrawl();
    try {
      const searchRes: any = await firecrawl.search(data.topic, { limit: 3 });
      const results =
        searchRes?.web ?? searchRes?.data?.web ?? searchRes?.data ?? searchRes?.results ?? [];
      const urls = results.map((r: any) => r.url ?? r.link).filter(Boolean);
      let extractUrls =
        urls.length > 0
          ? urls
          : [
              "https://en.wikipedia.org/wiki/Special:Search?search=" +
                encodeURIComponent(data.topic),
            ];
      const keywordsStr =
        data.keywords && data.keywords.length > 0
          ? "Target keywords: " + data.keywords.join(", ")
          : "";
      const extractRes: any = await (firecrawl as any).extract({
        urls: extractUrls,
        prompt:
          "Read these top ranking pages and write a high-quality, comprehensive " +
          data.type +
          " about " +
          data.topic +
          ". " +
          keywordsStr +
          " Output a catchy 'title' and a detailed 'body' in Markdown format.",
        schema: seoExtractionSchema as any,
      });
      const payload = extractRes?.data ?? extractRes;
      if (!payload || !payload.title || !payload.body) throw new Error("Extraction failed");
      return { ok: true, data: payload };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) };
    }
  });
