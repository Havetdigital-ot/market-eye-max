-- Market Eye Pro — full database schema
-- Run on a fresh Supabase project (SQL Editor). Safe to re-run: uses IF NOT EXISTS.

-- =========================================================================
-- 1. TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  company_name text,
  role text NOT NULL DEFAULT 'User',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  last_crawled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.competitor_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text,
  description text,
  image_url text,
  category text,
  sku text,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_product_id uuid NOT NULL REFERENCES public.competitor_products(id) ON DELETE CASCADE,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  competitor_id uuid REFERENCES public.competitors(id) ON DELETE SET NULL,
  competitor_product_id uuid REFERENCES public.competitor_products(id) ON DELETE SET NULL,
  competitor_name text,
  product_name text,
  old_price numeric,
  new_price numeric,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  keyword text,
  platform text,
  product_name text,
  source_url text,
  trend_score numeric,
  virality_potential numeric,
  seasonality_score numeric,
  saved boolean NOT NULL DEFAULT false,
  discovered_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_description text,
  brand_name text,
  customer_persona jsonb,
  brand_voice text,
  color_palette jsonb,
  font_choices jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.brand_generation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order integer NOT NULL,
  brand_name text NOT NULL,
  brand_voice text NOT NULL,
  color_palette jsonb NOT NULL,
  font_primary text NOT NULL,
  font_secondary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.competitor_products(id) ON DELETE SET NULL,
  type text,
  topic text,
  title text,
  body text,
  keywords text[],
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.background_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  status text NOT NULL DEFAULT 'Running',
  details jsonb,
  error_message text,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- 2. GRANTS (required for the Supabase Data API / PostgREST)
-- =========================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_assets TO authenticated;
GRANT SELECT ON public.brand_generation_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_content TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.background_tasks TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =========================================================================
-- 3. ROW LEVEL SECURITY
-- =========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_generation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_tasks ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- user-owned tables
CREATE POLICY competitors_own ON public.competitors FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY alerts_own      ON public.alerts      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY trends_own      ON public.trends      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY brand_own       ON public.brand_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY seo_own         ON public.seo_content  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY tasks_own       ON public.background_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- products inherit from competitors
CREATE POLICY products_via_competitor ON public.competitor_products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competitors c WHERE c.id = competitor_products.competitor_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competitors c WHERE c.id = competitor_products.competitor_id AND c.user_id = auth.uid()));

-- price history inherits from products → competitors
CREATE POLICY price_via_product ON public.price_history FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.competitor_products p
    JOIN public.competitors c ON c.id = p.competitor_id
    WHERE p.id = price_history.competitor_product_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.competitor_products p
    JOIN public.competitors c ON c.id = p.competitor_id
    WHERE p.id = price_history.competitor_product_id AND c.user_id = auth.uid()));

-- shared read-only catalog
CREATE POLICY "Authenticated can read brand templates"
  ON public.brand_generation_templates FOR SELECT TO authenticated USING (true);

-- =========================================================================
-- 4. FUNCTIONS & TRIGGERS
-- =========================================================================

-- updated_at maintainer
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS background_tasks_set_updated_at ON public.background_tasks;
CREATE TRIGGER background_tasks_set_updated_at
  BEFORE UPDATE ON public.background_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- seed_demo_data(): see supabase/migrations/ in the repo for the full body
-- (it inserts demo competitors/products/alerts/trends for the calling user).
-- Copy that function verbatim if you want demo data on first sign-in.
