--
-- PostgreSQL database dump
--

\restrict qQUFed1IkMfxbfpHjVXspUImqt6ftQkkdlNOcdvwZonExUC3QZ6M5vkaaLZVFDv

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END; $$;


--
-- Name: seed_demo_data("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."seed_demo_data"("p_user" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  c1 UUID; c2 UUID; c3 UUID; c4 UUID; c5 UUID;
  p_id UUID; base_price NUMERIC; i INT; prod RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user THEN
    RAISE EXCEPTION 'Not authorized to seed for this user';
  END IF;
  IF EXISTS (SELECT 1 FROM public.competitors WHERE user_id = p_user) THEN
    RETURN;
  END IF;

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

  INSERT INTO public.alerts (user_id, type, competitor_name, product_name, old_price, new_price, is_read, created_at) VALUES
    (p_user, 'Price Change', 'CremaLab', 'Crema Pro Semi-Auto Machine', 799, 749, false, now() - interval '30 minutes'),
    (p_user, 'New Product', 'Roast Republic', 'Cold Brew Tower 1.5L', NULL, 129, false, now() - interval '3 hours'),
    (p_user, 'Price Change', 'BaristaBox', 'Aria Conical Burr Grinder', 229, 249, false, now() - interval '8 hours'),
    (p_user, 'Price Change', 'BaristaBox', 'Gooseneck Pour-Over Kettle 1.0L', 89, 79, true, now() - interval '1 day 4 hours'),
    (p_user, 'New Product', 'CremaLab', 'Crema Flat Burr Grinder', NULL, 329, true, now() - interval '2 days'),
    (p_user, 'Price Change', 'Roast Republic', 'Insulated Travel Press 350ml', 39, 36, true, now() - interval '2 days 12 hours');

  INSERT INTO public.trends (user_id, keyword, platform, product_name, source_url, trend_score, virality_potential, seasonality_score, saved, discovered_at) VALUES
    (p_user, 'cold brew',       'TikTok', 'Slow-Drip Cold Brew Tower',         'https://tiktok.com/t/coldbrewtower', 92, 88, 71, true,  now() - interval '6 hours'),
    (p_user, 'milk frother',    'Amazon', 'Electric Milk Frother (4-mode)',    'https://amazon.com/dp/frother',       84, 62, 55, false, now() - interval '11 hours'),
    (p_user, 'matcha kit',      'TikTok', 'Ceremonial Matcha Starter Kit',     'https://tiktok.com/t/matchakit',     89, 95, 48, false, now() - interval '14 hours'),
    (p_user, 'pour over',       'Reddit', 'Single-Dose Burr Grinder',          'https://reddit.com/r/coffee/po',     76, 44, 39, false, now() - interval '20 hours'),
    (p_user, 'travel espresso', 'Amazon', 'Portable Hand-Pump Espresso Maker', 'https://amazon.com/dp/travelesp',    81, 73, 66, true,  now() - interval '1 day 2 hours'),
    (p_user, 'coffee scale',    'Reddit', 'Bluetooth Brew Scale',              'https://reddit.com/r/espresso/scale',68, 51, 33, false, now() - interval '1 day 10 hours'),
    (p_user, 'iced latte',      'TikTok', 'Glass Iced Latte Tumbler Set',      'https://tiktok.com/t/icedlatte',     87, 90, 78, false, now() - interval '1 day 18 hours'),
    (p_user, 'dripper',         'Other',  'Ceramic Flat-Bottom Dripper',       'https://example.com/dripper',        59, 38, 41, false, now() - interval '2 days 8 hours');

  INSERT INTO public.brand_assets (user_id, source_description, brand_name, customer_persona, brand_voice, color_palette, font_choices, generated_at) VALUES
    (p_user,
     'Premium home espresso gear for design-conscious enthusiasts',
     'Driftwood Coffee Co.',
     '{"name":"The Weekend Barista","age":"28-42","traits":["Design-conscious","Quality over quantity","Enjoys ritual"],"summary":"Urban professionals who treat their morning brew as a craft."}'::jsonb,
     'Warm, knowledgeable, and unpretentious — like a trusted friend who happens to be a barista.',
     '["#2A1E16","#C8794A","#E8DCC8","#7A8B6F","#F4EFE6"]'::jsonb,
     '{"primary":"Fraunces","secondary":"Hanken Grotesk"}'::jsonb,
     now() - interval '4 days');

  INSERT INTO public.seo_content (user_id, type, topic, title, keywords, status, created_at, published_at) VALUES
    (p_user, 'Blog Post',           'How to dial in espresso at home',        '7 Steps to Dial In the Perfect Espresso Shot at Home',  ARRAY['espresso','home barista','dialing in','grind size'], 'Published', now() - interval '3 days', now() - interval '2 days 12 hours'),
    (p_user, 'Product Description', 'Aria Dual-Boiler Espresso Machine',      'Aria Dual-Boiler — Café-Grade Espresso, Engineered for Your Counter', ARRAY['dual boiler','PID','prosumer espresso'], 'Draft', now() - interval '1 day', NULL),
    (p_user, 'FAQ',                 'Cold brew brewing questions',            'Cold Brew FAQ: Ratios, Timing & Storage',               ARRAY['cold brew','ratio','storage'], 'Draft', now() - interval '6 hours', NULL);

  INSERT INTO public.background_tasks (user_id, task_type, status, details, error_message, created_at, updated_at) VALUES
    (p_user, 'Crawl Competitor', 'Completed', '{"target":"BaristaBox","found":4}'::jsonb,         NULL, now() - interval '2 hours', now() - interval '2 hours'),
    (p_user, 'Scan Trends',      'Completed', '{"platforms":["TikTok","Amazon"],"found":5}'::jsonb,NULL, now() - interval '11 hours', now() - interval '11 hours'),
    (p_user, 'Generate Brand',   'Completed', '{"brand":"Driftwood Coffee Co."}'::jsonb,           NULL, now() - interval '4 days',  now() - interval '4 days'),
    (p_user, 'Crawl Competitor', 'Failed',    '{"target":"Kettle & Co"}'::jsonb,                   'Crawler timed out after 30s — site returned 503.', now() - interval '3 days', now() - interval '3 days'),
    (p_user, 'Generate Store',   'Completed', '{"store":"Driftwood Coffee Co."}'::jsonb,           NULL, now() - interval '2 days',  now() - interval '2 days'),
    (p_user, 'Generate SEO',     'Running',   '{"topic":"Cold brew brewing questions"}'::jsonb,    NULL, now() - interval '4 minutes', now() - interval '1 minute');
END; $$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "competitor_id" "uuid",
    "competitor_product_id" "uuid",
    "competitor_name" "text",
    "product_name" "text",
    "old_price" numeric(12,2),
    "new_price" numeric(12,2),
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."alerts" REPLICA IDENTITY FULL;


--
-- Name: background_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."background_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "task_type" "text" NOT NULL,
    "status" "text" DEFAULT 'Running'::"text" NOT NULL,
    "details" "jsonb",
    "error_message" "text",
    "dismissed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

ALTER TABLE ONLY "public"."background_tasks" REPLICA IDENTITY FULL;


--
-- Name: brand_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."brand_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_description" "text",
    "brand_name" "text",
    "customer_persona" "jsonb",
    "brand_voice" "text",
    "color_palette" "jsonb",
    "font_choices" "jsonb",
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: brand_generation_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."brand_generation_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sort_order" integer NOT NULL,
    "brand_name" "text" NOT NULL,
    "brand_voice" "text" NOT NULL,
    "color_palette" "jsonb" NOT NULL,
    "font_primary" "text" NOT NULL,
    "font_secondary" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: competitor_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."competitor_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "competitor_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "url" "text",
    "description" "text",
    "image_url" "text",
    "category" "text",
    "sku" "text",
    "last_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: competitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."competitors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "last_crawled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: generated_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."generated_stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "brand_asset_id" "uuid",
    "palette" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "published" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."price_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "competitor_product_id" "uuid" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "company_name" "text",
    "role" "text" DEFAULT 'User'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: seo_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."seo_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "type" "text",
    "topic" "text",
    "title" "text",
    "body" "text",
    "keywords" "text"[],
    "status" "text" DEFAULT 'Draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone
);


--
-- Name: trends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."trends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "keyword" "text",
    "platform" "text",
    "product_name" "text",
    "source_url" "text",
    "trend_score" numeric,
    "virality_potential" numeric,
    "seasonality_score" numeric,
    "saved" boolean DEFAULT false NOT NULL,
    "discovered_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_pkey" PRIMARY KEY ("id");


--
-- Name: background_tasks background_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."background_tasks"
    ADD CONSTRAINT "background_tasks_pkey" PRIMARY KEY ("id");


--
-- Name: brand_assets brand_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_assets"
    ADD CONSTRAINT "brand_assets_pkey" PRIMARY KEY ("id");


--
-- Name: brand_generation_templates brand_generation_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_generation_templates"
    ADD CONSTRAINT "brand_generation_templates_pkey" PRIMARY KEY ("id");


--
-- Name: competitor_products competitor_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."competitor_products"
    ADD CONSTRAINT "competitor_products_pkey" PRIMARY KEY ("id");


--
-- Name: competitors competitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."competitors"
    ADD CONSTRAINT "competitors_pkey" PRIMARY KEY ("id");


--
-- Name: generated_stores generated_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."generated_stores"
    ADD CONSTRAINT "generated_stores_pkey" PRIMARY KEY ("id");


--
-- Name: generated_stores generated_stores_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."generated_stores"
    ADD CONSTRAINT "generated_stores_slug_key" UNIQUE ("slug");


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."price_history"
    ADD CONSTRAINT "price_history_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: seo_content seo_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seo_content"
    ADD CONSTRAINT "seo_content_pkey" PRIMARY KEY ("id");


--
-- Name: trends trends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trends"
    ADD CONSTRAINT "trends_pkey" PRIMARY KEY ("id");


--
-- Name: generated_stores_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "generated_stores_slug_idx" ON "public"."generated_stores" USING "btree" ("slug");


--
-- Name: generated_stores_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "generated_stores_user_id_idx" ON "public"."generated_stores" USING "btree" ("user_id");


--
-- Name: idx_alerts_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_alerts_user_created" ON "public"."alerts" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_alerts_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_alerts_user_unread" ON "public"."alerts" USING "btree" ("user_id") WHERE ("is_read" = false);


--
-- Name: idx_brand_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_brand_user" ON "public"."brand_assets" USING "btree" ("user_id", "generated_at" DESC);


--
-- Name: idx_competitors_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_competitors_user" ON "public"."competitors" USING "btree" ("user_id");


--
-- Name: idx_price_product_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_price_product_time" ON "public"."price_history" USING "btree" ("competitor_product_id", "timestamp");


--
-- Name: idx_products_competitor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_products_competitor" ON "public"."competitor_products" USING "btree" ("competitor_id");


--
-- Name: idx_seo_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_seo_user_created" ON "public"."seo_content" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_tasks_user_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_user_active" ON "public"."background_tasks" USING "btree" ("user_id") WHERE (("dismissed" = false) AND ("status" = ANY (ARRAY['Running'::"text", 'Pending'::"text"])));


--
-- Name: idx_tasks_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_tasks_user_created" ON "public"."background_tasks" USING "btree" ("user_id", "created_at" DESC);


--
-- Name: idx_trends_user_discovered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_trends_user_discovered" ON "public"."trends" USING "btree" ("user_id", "discovered_at" DESC);


--
-- Name: generated_stores set_generated_stores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "set_generated_stores_updated_at" BEFORE UPDATE ON "public"."generated_stores" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: profiles trg_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: background_tasks trg_tasks_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "trg_tasks_updated" BEFORE UPDATE ON "public"."background_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();


--
-- Name: alerts alerts_competitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE SET NULL;


--
-- Name: alerts alerts_competitor_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_competitor_product_id_fkey" FOREIGN KEY ("competitor_product_id") REFERENCES "public"."competitor_products"("id") ON DELETE SET NULL;


--
-- Name: alerts alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."alerts"
    ADD CONSTRAINT "alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: background_tasks background_tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."background_tasks"
    ADD CONSTRAINT "background_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: brand_assets brand_assets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."brand_assets"
    ADD CONSTRAINT "brand_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: competitor_products competitor_products_competitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."competitor_products"
    ADD CONSTRAINT "competitor_products_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE CASCADE;


--
-- Name: competitors competitors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."competitors"
    ADD CONSTRAINT "competitors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: generated_stores generated_stores_brand_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."generated_stores"
    ADD CONSTRAINT "generated_stores_brand_asset_id_fkey" FOREIGN KEY ("brand_asset_id") REFERENCES "public"."brand_assets"("id") ON DELETE SET NULL;


--
-- Name: generated_stores generated_stores_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."generated_stores"
    ADD CONSTRAINT "generated_stores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: price_history price_history_competitor_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."price_history"
    ADD CONSTRAINT "price_history_competitor_product_id_fkey" FOREIGN KEY ("competitor_product_id") REFERENCES "public"."competitor_products"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: seo_content seo_content_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seo_content"
    ADD CONSTRAINT "seo_content_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."competitor_products"("id") ON DELETE SET NULL;


--
-- Name: seo_content seo_content_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."seo_content"
    ADD CONSTRAINT "seo_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: trends trends_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."trends"
    ADD CONSTRAINT "trends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;


--
-- Name: brand_generation_templates Authenticated can read brand templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can read brand templates" ON "public"."brand_generation_templates" FOR SELECT TO "authenticated" USING (true);


--
-- Name: generated_stores Owners manage their stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage their stores" ON "public"."generated_stores" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: generated_stores Public can view published stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view published stores" ON "public"."generated_stores" FOR SELECT TO "authenticated", "anon" USING (("published" = true));


--
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."alerts" ENABLE ROW LEVEL SECURITY;

--
-- Name: alerts alerts_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "alerts_own" ON "public"."alerts" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: background_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."background_tasks" ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."brand_assets" ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_generation_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."brand_generation_templates" ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_assets brand_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "brand_own" ON "public"."brand_assets" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: competitor_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."competitor_products" ENABLE ROW LEVEL SECURITY;

--
-- Name: competitors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."competitors" ENABLE ROW LEVEL SECURITY;

--
-- Name: competitors competitors_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "competitors_own" ON "public"."competitors" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: generated_stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."generated_stores" ENABLE ROW LEVEL SECURITY;

--
-- Name: price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."price_history" ENABLE ROW LEVEL SECURITY;

--
-- Name: price_history price_via_product; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "price_via_product" ON "public"."price_history" USING ((EXISTS ( SELECT 1
   FROM ("public"."competitor_products" "p"
     JOIN "public"."competitors" "c" ON (("c"."id" = "p"."competitor_id")))
  WHERE (("p"."id" = "price_history"."competitor_product_id") AND ("c"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."competitor_products" "p"
     JOIN "public"."competitors" "c" ON (("c"."id" = "p"."competitor_id")))
  WHERE (("p"."id" = "price_history"."competitor_product_id") AND ("c"."user_id" = "auth"."uid"())))));


--
-- Name: competitor_products products_via_competitor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "products_via_competitor" ON "public"."competitor_products" USING ((EXISTS ( SELECT 1
   FROM "public"."competitors" "c"
  WHERE (("c"."id" = "competitor_products"."competitor_id") AND ("c"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."competitors" "c"
  WHERE (("c"."id" = "competitor_products"."competitor_id") AND ("c"."user_id" = "auth"."uid"())))));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));


--
-- Name: seo_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."seo_content" ENABLE ROW LEVEL SECURITY;

--
-- Name: seo_content seo_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "seo_own" ON "public"."seo_content" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: background_tasks tasks_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "tasks_own" ON "public"."background_tasks" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- Name: trends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."trends" ENABLE ROW LEVEL SECURITY;

--
-- Name: trends trends_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "trends_own" ON "public"."trends" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));


--
-- PostgreSQL database dump complete
--

\unrestrict qQUFed1IkMfxbfpHjVXspUImqt6ftQkkdlNOcdvwZonExUC3QZ6M5vkaaLZVFDv

