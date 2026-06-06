import { createServerFn } from "@tanstack/react-start";

export const getStoreBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const slug = data.slug?.toLowerCase().trim();
    if (!slug) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin
      .from("generated_stores")
      .select("id, slug, name, description, palette, content, published, created_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return store;
  });
