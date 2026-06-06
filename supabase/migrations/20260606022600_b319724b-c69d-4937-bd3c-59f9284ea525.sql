
-- =============================================================
-- PROFILES
-- =============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  company_name TEXT,
  role TEXT NOT NULL DEFAULT 'User',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- COMPETITORS
-- =============================================================
CREATE TABLE public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  last_crawled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_competitors_user ON public.competitors(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitors TO authenticated;
GRANT ALL ON public.competitors TO service_role;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitors_own" ON public.competitors FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- COMPETITOR PRODUCTS
-- =============================================================
CREATE TABLE public.competitor_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  description TEXT,
  image_url TEXT,
  category TEXT,
  sku TEXT,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_competitor ON public.competitor_products(competitor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_products TO authenticated;
GRANT ALL ON public.competitor_products TO service_role;
ALTER TABLE public.competitor_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_via_competitor" ON public.competitor_products FOR ALL
  USING (EXISTS (SELECT 1 FROM public.competitors c WHERE c.id = competitor_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.competitors c WHERE c.id = competitor_id AND c.user_id = auth.uid()));

-- =============================================================
-- PRICE HISTORY
-- =============================================================
CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_product_id UUID NOT NULL REFERENCES public.competitor_products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_price_product_time ON public.price_history(competitor_product_id, timestamp);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_history TO authenticated;
GRANT ALL ON public.price_history TO service_role;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_via_product" ON public.price_history FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.competitor_products p
    JOIN public.competitors c ON c.id = p.competitor_id
    WHERE p.id = competitor_product_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.competitor_products p
    JOIN public.competitors c ON c.id = p.competitor_id
    WHERE p.id = competitor_product_id AND c.user_id = auth.uid()));

-- =============================================================
-- ALERTS
-- =============================================================
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  competitor_id UUID REFERENCES public.competitors(id) ON DELETE SET NULL,
  competitor_product_id UUID REFERENCES public.competitor_products(id) ON DELETE SET NULL,
  competitor_name TEXT,
  product_name TEXT,
  old_price NUMERIC(12,2),
  new_price NUMERIC(12,2),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_user_created ON public.alerts(user_id, created_at DESC);
CREATE INDEX idx_alerts_user_unread ON public.alerts(user_id) WHERE is_read = false;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_own" ON public.alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- TRENDS
-- =============================================================
CREATE TABLE public.trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  keyword TEXT,
  platform TEXT,
  product_name TEXT,
  source_url TEXT,
  trend_score NUMERIC,
  virality_potential NUMERIC,
  seasonality_score NUMERIC,
  saved BOOLEAN NOT NULL DEFAULT false,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_trends_user_discovered ON public.trends(user_id, discovered_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trends TO authenticated;
GRANT ALL ON public.trends TO service_role;
ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trends_own" ON public.trends FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- BRAND ASSETS
-- =============================================================
CREATE TABLE public.brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_description TEXT,
  brand_name TEXT,
  customer_persona JSONB,
  brand_voice TEXT,
  color_palette JSONB,
  font_choices JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_brand_user ON public.brand_assets(user_id, generated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_assets TO authenticated;
GRANT ALL ON public.brand_assets TO service_role;
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_own" ON public.brand_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- SEO CONTENT
-- =============================================================
CREATE TABLE public.seo_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.competitor_products(id) ON DELETE SET NULL,
  type TEXT,
  topic TEXT,
  title TEXT,
  body TEXT,
  keywords TEXT[],
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
CREATE INDEX idx_seo_user_created ON public.seo_content(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_content TO authenticated;
GRANT ALL ON public.seo_content TO service_role;
ALTER TABLE public.seo_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_own" ON public.seo_content FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================
-- BACKGROUND TASKS
-- =============================================================
CREATE TABLE public.background_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Running',
  details JSONB,
  error_message TEXT,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_user_created ON public.background_tasks(user_id, created_at DESC);
CREATE INDEX idx_tasks_user_active ON public.background_tasks(user_id) WHERE dismissed = false AND status IN ('Running','Pending');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.background_tasks TO authenticated;
GRANT ALL ON public.background_tasks TO service_role;
ALTER TABLE public.background_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_own" ON public.background_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.background_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- REALTIME for alerts + background_tasks
-- =============================================================
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER TABLE public.background_tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.background_tasks;

-- =============================================================
-- SEED DEMO DATA (idempotent per user)
-- =============================================================
CREATE OR REPLACE FUNCTION public.seed_demo_data(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c1 UUID; c2 UUID; c3 UUID; c4 UUID; c5 UUID;
  p_id UUID;
  base_price NUMERIC;
  i INT;
  prod RECORD;
BEGIN
  -- Only seed if the user has no competitors yet
  IF EXISTS (SELECT 1 FROM public.competitors WHERE user_id = p_user) THEN
    RETURN;
  END IF;

  -- Competitors
  INSERT INTO public.competitors (user_id, display_name, url, status, last_crawled_at) VALUES
    (p_user, 'BaristaBox', 'https://baristabox.example.com', 'Active', now() - interval '2 hours') RETURNING id INTO c1;
  INSERT INTO public.competitors (user_id, display_name, url, status, last_crawled_at) VALUES
    (p_user, 'CremaLab', 'https://shop.cremalab.example.com', 'Active', now() - interval '5 hours') RETURNING id INTO c2;
  INSERT INTO public.competitors (user_id, display_name, url, status, last_crawled_at) VALUES
    (p_user, 'PourCraft', 'https://pourcraft.example.com', 'Paused', now() - interval '6 days') RETURNING id INTO c3;
  INSERT INTO public.competitors (user_id, display_name, url, status, last_crawled_at) VALUES
    (p_user, 'Roast Republic', 'https://roastrepublic.example.com', 'Active', now() - interval '1 day') RETURNING id INTO c4;
  INSERT INTO public.competitors (user_id, display_name, url, status, last_crawled_at) VALUES
    (p_user, 'Kettle & Co', 'https://kettleandco.example.com', 'Error', now() - interval '3 days') RETURNING id INTO c5;

  -- Products + price history
  FOR prod IN SELECT * FROM (VALUES
    (c1, 'Aria Dual-Boiler Espresso Machine', 899::numeric, 'Machines', 'BB-ESP-900', 'A prosumer dual-boiler with PID temperature control and a rotary pump.'),
    (c1, 'Aria Conical Burr Grinder', 249::numeric, 'Grinders', 'BB-GR-249', 'Stepless burr grinder with 40mm conical burrs.'),
    (c1, 'Gooseneck Pour-Over Kettle 1.0L', 79::numeric, 'Kettles', 'BB-KT-079', 'Variable temperature gooseneck kettle.'),
    (c1, 'Precision Coffee Scale', 39::numeric, 'Accessories', 'BB-SC-039', '0.1g precision scale with built-in brew timer.'),
    (c2, 'Crema Pro Semi-Auto Machine', 749::numeric, 'Machines', 'CL-PRO-750', '58mm portafilter semi-automatic.'),
    (c2, 'Crema Flat Burr Grinder', 329::numeric, 'Grinders', 'CL-FB-329', '64mm flat burr grinder.'),
    (c2, 'Glass Carafe Pour-Over Set', 54::numeric, 'Brewers', 'CL-PO-054', 'Borosilicate carafe with reusable stainless filter.'),
    (c4, 'Republic Single-Origin Sampler', 42::numeric, 'Beans', 'RR-SO-042', 'Rotating four-bag sampler of single-origin lots.'),
    (c4, 'Cold Brew Tower 1.5L', 129::numeric, 'Brewers', 'RR-CB-129', 'Slow-drip cold brew tower, glass and walnut.'),
    (c4, 'Insulated Travel Press 350ml', 36::numeric, 'Accessories', 'RR-TP-036', 'Vacuum-insulated French press travel mug.'),
    (c5, 'Smart Electric Gooseneck Kettle', 99::numeric, 'Kettles', 'KC-SK-099', 'App-connected kettle with hold-temp and pour-timer.'),
    (c5, 'Milk Frother Pro', 59::numeric, 'Accessories', 'KC-MF-059', 'Induction milk frother with four texture modes.')
  ) AS t(cid, pname, pprice, pcat, psku, pdesc)
  LOOP
    INSERT INTO public.competitor_products (competitor_id, name, category, sku, description, url)
    VALUES (prod.cid, prod.pname, prod.pcat, prod.psku, prod.pdesc, 'https://example.com/' || lower(prod.psku))
    RETURNING id INTO p_id;

    base_price := prod.pprice;
    FOR i IN 0..8 LOOP
      INSERT INTO public.price_history (competitor_product_id, price, currency, timestamp)
      VALUES (
        p_id,
        CASE WHEN i = 8 THEN base_price
             ELSE round((base_price * (1 + (random() - 0.5) * 0.1))::numeric, 2)
        END,
        'USD',
        now() - ((8 - i) * 3 || ' days')::interval
      );
    END LOOP;
  END LOOP;

  -- Alerts
  INSERT INTO public.alerts (user_id, type, competitor_name, product_name, old_price, new_price, is_read, created_at) VALUES
    (p_user, 'Price Change', 'CremaLab', 'Crema Pro Semi-Auto Machine', 799, 749, false, now() - interval '30 minutes'),
    (p_user, 'New Product', 'Roast Republic', 'Cold Brew Tower 1.5L', NULL, 129, false, now() - interval '3 hours'),
    (p_user, 'Price Change', 'BaristaBox', 'Aria Conical Burr Grinder', 229, 249, false, now() - interval '8 hours'),
    (p_user, 'Price Change', 'BaristaBox', 'Gooseneck Pour-Over Kettle 1.0L', 89, 79, true, now() - interval '1 day 4 hours'),
    (p_user, 'New Product', 'CremaLab', 'Crema Flat Burr Grinder', NULL, 329, true, now() - interval '2 days'),
    (p_user, 'Price Change', 'Roast Republic', 'Insulated Travel Press 350ml', 39, 36, true, now() - interval '2 days 12 hours');

  -- Trends
  INSERT INTO public.trends (user_id, keyword, platform, product_name, source_url, trend_score, virality_potential, seasonality_score, saved, discovered_at) VALUES
    (p_user, 'cold brew',       'TikTok', 'Slow-Drip Cold Brew Tower',         'https://tiktok.com/t/coldbrewtower', 92, 88, 71, true,  now() - interval '6 hours'),
    (p_user, 'milk frother',    'Amazon', 'Electric Milk Frother (4-mode)',    'https://amazon.com/dp/frother',       84, 62, 55, false, now() - interval '11 hours'),
    (p_user, 'matcha kit',      'TikTok', 'Ceremonial Matcha Starter Kit',     'https://tiktok.com/t/matchakit',     89, 95, 48, false, now() - interval '14 hours'),
    (p_user, 'pour over',       'Reddit', 'Single-Dose Burr Grinder',          'https://reddit.com/r/coffee/po',     76, 44, 39, false, now() - interval '20 hours'),
    (p_user, 'travel espresso', 'Amazon', 'Portable Hand-Pump Espresso Maker', 'https://amazon.com/dp/travelesp',    81, 73, 66, true,  now() - interval '1 day 2 hours'),
    (p_user, 'coffee scale',    'Reddit', 'Bluetooth Brew Scale',              'https://reddit.com/r/espresso/scale',68, 51, 33, false, now() - interval '1 day 10 hours'),
    (p_user, 'iced latte',      'TikTok', 'Glass Iced Latte Tumbler Set',      'https://tiktok.com/t/icedlatte',     87, 90, 78, false, now() - interval '1 day 18 hours'),
    (p_user, 'dripper',         'Other',  'Ceramic Flat-Bottom Dripper',       'https://example.com/dripper',        59, 38, 41, false, now() - interval '2 days 8 hours');

  -- Brand asset
  INSERT INTO public.brand_assets (user_id, source_description, brand_name, customer_persona, brand_voice, color_palette, font_choices, generated_at) VALUES
    (p_user,
     'Premium home espresso gear for design-conscious enthusiasts',
     'Driftwood Coffee Co.',
     '{"name":"The Weekend Barista","age":"28-42","traits":["Design-conscious","Quality over quantity","Enjoys ritual"],"summary":"Urban professionals who treat their morning brew as a craft."}'::jsonb,
     'Warm, knowledgeable, and unpretentious — like a trusted friend who happens to be a barista.',
     '["#2A1E16","#C8794A","#E8DCC8","#7A8B6F","#F4EFE6"]'::jsonb,
     '{"primary":"Fraunces","secondary":"Hanken Grotesk"}'::jsonb,
     now() - interval '4 days');

  -- SEO content
  INSERT INTO public.seo_content (user_id, type, topic, title, keywords, status, created_at, published_at) VALUES
    (p_user, 'Blog Post',           'How to dial in espresso at home',        '7 Steps to Dial In the Perfect Espresso Shot at Home',  ARRAY['espresso','home barista','dialing in','grind size'], 'Published', now() - interval '3 days', now() - interval '2 days 12 hours'),
    (p_user, 'Product Description', 'Aria Dual-Boiler Espresso Machine',      'Aria Dual-Boiler — Café-Grade Espresso, Engineered for Your Counter', ARRAY['dual boiler','PID','prosumer espresso'], 'Draft', now() - interval '1 day', NULL),
    (p_user, 'FAQ',                 'Cold brew brewing questions',            'Cold Brew FAQ: Ratios, Timing & Storage',               ARRAY['cold brew','ratio','storage'], 'Draft', now() - interval '6 hours', NULL);

  -- Background tasks
  INSERT INTO public.background_tasks (user_id, task_type, status, details, error_message, created_at, updated_at) VALUES
    (p_user, 'Crawl Competitor', 'Completed', '{"target":"BaristaBox","found":4}'::jsonb,         NULL, now() - interval '2 hours', now() - interval '2 hours'),
    (p_user, 'Scan Trends',      'Completed', '{"platforms":["TikTok","Amazon"],"found":5}'::jsonb,NULL, now() - interval '11 hours', now() - interval '11 hours'),
    (p_user, 'Generate Brand',   'Completed', '{"brand":"Driftwood Coffee Co."}'::jsonb,           NULL, now() - interval '4 days',  now() - interval '4 days'),
    (p_user, 'Crawl Competitor', 'Failed',    '{"target":"Kettle & Co"}'::jsonb,                   'Crawler timed out after 30s — site returned 503.', now() - interval '3 days', now() - interval '3 days'),
    (p_user, 'Generate Store',   'Completed', '{"store":"Driftwood Coffee Co."}'::jsonb,           NULL, now() - interval '2 days',  now() - interval '2 days'),
    (p_user, 'Generate SEO',     'Running',   '{"topic":"Cold brew brewing questions"}'::jsonb,    NULL, now() - interval '4 minutes', now() - interval '1 minute');
END; $$;

GRANT EXECUTE ON FUNCTION public.seed_demo_data(UUID) TO authenticated;
