--
-- PostgreSQL database dump
--

\restrict h2tesCC4lo3A0fdObKzYbjdq8PchfPqnRmSajb0ZStcuusLl7ABQLIiD7FGg4LJ

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
-- Data for Name: alerts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."alerts" ("id", "user_id", "type", "competitor_id", "competitor_product_id", "competitor_name", "product_name", "old_price", "new_price", "is_read", "created_at") FROM stdin;
ef986d5c-c068-4639-98f2-3dd8b290d3ae	2dc42356-13cb-4ce4-bf77-fd583f77d72e	New Product	\N	\N	CremaLab	Crema Flat Burr Grinder	\N	329.00	t	2026-06-04 03:09:59.8784+00
71378228-1888-467a-ba42-215c7f0889d0	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Price Change	\N	\N	Roast Republic	Insulated Travel Press 350ml	39.00	36.00	t	2026-06-03 15:09:59.8784+00
f9f5be04-4dc0-4fde-b9f6-3a8346c037b3	2dc42356-13cb-4ce4-bf77-fd583f77d72e	New Product	\N	\N	Roast Republic	Cold Brew Tower 1.5L	\N	129.00	t	2026-06-06 00:09:59.8784+00
03ccd05b-547e-4dc4-84e7-f935aa01c84c	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Price Change	\N	\N	CremaLab	Crema Pro Semi-Auto Machine	799.00	749.00	t	2026-06-06 02:39:59.8784+00
dfb841c5-b940-4347-923e-0c5ef9c16e5c	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Price Change	\N	\N	BaristaBox	Aria Conical Burr Grinder	229.00	249.00	t	2026-06-05 19:09:59.8784+00
d81da339-1cd7-4144-9fe4-c0df55fd2d7b	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Price Change	\N	\N	BaristaBox	Gooseneck Pour-Over Kettle 1.0L	89.00	79.00	t	2026-06-04 23:09:59.8784+00
\.


--
-- Data for Name: background_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."background_tasks" ("id", "user_id", "task_type", "status", "details", "error_message", "dismissed", "created_at", "updated_at") FROM stdin;
127eda87-988c-4bfb-8c4a-319a64232322	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Completed	{"found": 4, "target": "BaristaBox"}	\N	f	2026-06-06 01:09:59.8784+00	2026-06-06 01:09:59.8784+00
a6de16b8-0281-4ab8-96b2-6274b73d7730	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Scan Trends	Completed	{"found": 5, "platforms": ["TikTok", "Amazon"]}	\N	f	2026-06-05 16:09:59.8784+00	2026-06-05 16:09:59.8784+00
01f7feb0-1b80-4840-84af-6cc20ac5fdca	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Generate Brand	Completed	{"brand": "Driftwood Coffee Co."}	\N	f	2026-06-02 03:09:59.8784+00	2026-06-02 03:09:59.8784+00
790857e9-44b5-442e-9b9a-c3454d78e8f2	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Failed	{"target": "Kettle & Co"}	Crawler timed out after 30s — site returned 503.	f	2026-06-03 03:09:59.8784+00	2026-06-03 03:09:59.8784+00
9756f649-64a9-49bf-ac28-972f392da167	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Generate Store	Completed	{"store": "Driftwood Coffee Co."}	\N	f	2026-06-04 03:09:59.8784+00	2026-06-04 03:09:59.8784+00
9f8ed9cb-9623-40c6-b6e5-1c7d8d147c6b	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Generate SEO	Running	{"topic": "Cold brew brewing questions"}	\N	f	2026-06-06 03:05:59.8784+00	2026-06-06 03:08:59.8784+00
aba1c799-da49-4138-ae9b-2cb6faa25b50	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Scan Trends	Completed	{"found": 15, "message": "15 new trend(s) discovered", "keywords": ["slow"], "platforms": ["TikTok", "Amazon", "Reddit"]}	\N	f	2026-06-06 03:59:10.214887+00	2026-06-06 03:59:13.561985+00
0839332d-3d53-4250-9722-8b620c2e61e2	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Scan Trends	Completed	{"found": 15, "message": "15 new trend(s) discovered", "keywords": ["slows"], "platforms": ["TikTok", "Amazon", "Reddit"]}	\N	f	2026-06-06 03:59:12.755861+00	2026-06-06 03:59:15.852371+00
db1104f3-5ef5-41be-96b3-193dc24cb329	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Completed	{"found": 0, "alerts": 0, "target": "Roast Republic"}	\N	f	2026-06-06 04:19:12.184436+00	2026-06-06 04:19:22.693828+00
45fe6964-1cc8-42d1-9e19-9c43631357f6	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Scan Trends	Running	{"keywords": [], "platforms": ["TikTok", "Amazon"]}	\N	f	2026-06-06 04:37:10.440212+00	2026-06-06 04:37:10.440212+00
45031e6d-3a1c-4a68-b2de-97725ae0e44b	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Failed	{"target": "amazon"}	Bad Request	t	2026-06-06 04:40:22.399877+00	2026-06-06 04:41:42.498936+00
18d8b617-eac2-4a6a-875e-771a93010c0c	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Scan Trends	Running	{"keywords": [], "platforms": ["Amazon"]}	\N	f	2026-06-06 04:43:39.618237+00	2026-06-06 04:43:39.618237+00
febb5033-dfa3-4492-b03b-85d2f9a3c153	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Scan Trends	Completed	{"found": 10, "message": "10 new trend(s) discovered", "keywords": ["mouse"], "platforms": ["TikTok", "Amazon"]}	\N	f	2026-06-06 04:45:17.125859+00	2026-06-06 04:45:19.093679+00
6f977f97-86cd-490e-a7fe-384aa763daf2	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Failed	{"target": "razer mouse"}	Bad Request	t	2026-06-06 04:42:41.415346+00	2026-06-06 04:53:01.460791+00
411ba78f-7d1f-4f63-98ee-f909e5840a9f	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Failed	{"target": "amazon"}	Bad Request	f	2026-06-06 05:55:23.237309+00	2026-06-06 05:55:24.74297+00
013a8f09-cee9-4f74-bbbc-0d4f2be1c7d0	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Failed	{"target": "razer mouse"}	Bad Request	f	2026-06-06 05:55:27.393442+00	2026-06-06 05:55:29.916128+00
c0690202-0dc1-4abe-a0af-ea6b2fb3a7eb	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Failed	{"target": "razer mouse"}	Bad Request	f	2026-06-06 05:55:29.766384+00	2026-06-06 05:55:32.033321+00
5242540b-2abc-4cbb-a015-24c578a5ff1b	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Completed	{"found": 0, "alerts": 0, "target": "CremaLab"}	\N	f	2026-06-06 05:55:26.327656+00	2026-06-06 05:55:36.744368+00
bec3fc30-5a3a-49d5-bb3e-90eab8dc45f9	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Completed	{"found": 0, "alerts": 0, "target": "Kettle & Co"}	\N	f	2026-06-06 05:55:26.810772+00	2026-06-06 05:55:36.958171+00
d51f36dd-fade-4a12-bea5-ce5c408ce61f	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Completed	{"found": 0, "alerts": 0, "target": "amazon"}	\N	f	2026-06-06 05:56:05.053375+00	2026-06-06 05:56:12.282988+00
b02f4f31-2bcb-41e6-b6d5-ed2e39724da7	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Completed	{"found": 0, "alerts": 0, "target": "amazon"}	\N	f	2026-06-06 05:56:11.541908+00	2026-06-06 05:56:20.219466+00
49d40e06-4b00-4ea1-9f1b-8c36baa46782	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Crawl Competitor	Failed	{"target": "amazon"}	Bad Request	f	2026-06-06 06:08:29.39933+00	2026-06-06 06:08:30.85532+00
ad44f3bc-021d-4c58-b397-c042ad3927cb	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Generate Store	Failed	{"store": "fghj"}	Generation failed — simulated error.	f	2026-06-06 06:16:55.327412+00	2026-06-06 06:16:57.219734+00
\.


--
-- Data for Name: brand_assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."brand_assets" ("id", "user_id", "source_description", "brand_name", "customer_persona", "brand_voice", "color_palette", "font_choices", "generated_at") FROM stdin;
4a724d79-c6e3-4b52-8dc5-099c6dc552dc	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Premium home espresso gear for design-conscious enthusiasts	Driftwood Coffee Co.	{"age": "28-42", "name": "The Weekend Barista", "traits": ["Design-conscious", "Quality over quantity", "Enjoys ritual"], "summary": "Urban professionals who treat their morning brew as a craft."}	Warm, knowledgeable, and unpretentious — like a trusted friend who happens to be a barista.	["#2A1E16", "#C8794A", "#E8DCC8", "#7A8B6F", "#F4EFE6"]	{"primary": "Fraunces", "secondary": "Hanken Grotesk"}	2026-06-02 03:09:59.8784+00
\.


--
-- Data for Name: brand_generation_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."brand_generation_templates" ("id", "sort_order", "brand_name", "brand_voice", "color_palette", "font_primary", "font_secondary", "created_at") FROM stdin;
eb8ae884-c4cd-4a45-b85e-4d167d6834e4	0	Driftwood Coffee Co.	Warm, knowledgeable, and unpretentious — like a trusted friend who happens to be a barista.	["#1F2A24", "#3E7C5A", "#A8C3A0", "#E9F0E6", "#F6F4EE"]	Fraunces	Hanken Grotesk	2026-06-06 04:15:42.845537+00
483d9292-6de3-403f-9db6-009936ddbc44	1	Ember & Oak	Bold, energetic, and a little irreverent — for a brand that doesn't take itself too seriously.	["#2A1E16", "#C8794A", "#E8DCC8", "#7A8B6F", "#F4EFE6"]	Canela	Inter	2026-06-06 04:15:42.845537+00
3e89fd67-e924-44d4-80bf-b222878b8424	2	Slow Pour Society	Refined and editorial, with quiet confidence — speaking to discerning, design-led buyers.	["#16202E", "#3A6EA5", "#9FC3E8", "#E6EEF6", "#F4F7FA"]	Spectral	Söhne	2026-06-06 04:15:42.845537+00
\.


--
-- Data for Name: competitor_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."competitor_products" ("id", "competitor_id", "name", "url", "description", "image_url", "category", "sku", "last_updated_at") FROM stdin;
614c2ec5-0246-4d67-a640-0954d52337a5	6b4413a4-1b9b-4e6c-97f7-c37deeb861d1	Crema Pro Semi-Auto Machine	https://example.com/cl-pro-750	58mm portafilter semi-automatic.	\N	Machines	CL-PRO-750	2026-06-06 03:09:59.8784+00
5639f778-d55b-4031-a34a-8be59464ffee	6b4413a4-1b9b-4e6c-97f7-c37deeb861d1	Crema Flat Burr Grinder	https://example.com/cl-fb-329	64mm flat burr grinder.	\N	Grinders	CL-FB-329	2026-06-06 03:09:59.8784+00
38f92354-d7c3-49e3-9455-ecd6d766ad00	6b4413a4-1b9b-4e6c-97f7-c37deeb861d1	Glass Carafe Pour-Over Set	https://example.com/cl-po-054	Borosilicate carafe with reusable stainless filter.	\N	Brewers	CL-PO-054	2026-06-06 03:09:59.8784+00
45d0d622-217e-4e37-b03a-81f7b353885c	db432546-ce39-49cb-ac10-317d7e1b4916	Republic Single-Origin Sampler	https://example.com/rr-so-042	Rotating four-bag sampler of single-origin lots.	\N	Beans	RR-SO-042	2026-06-06 03:09:59.8784+00
a064881d-6428-42fc-906b-64698063be6c	db432546-ce39-49cb-ac10-317d7e1b4916	Cold Brew Tower 1.5L	https://example.com/rr-cb-129	Slow-drip cold brew tower, glass and walnut.	\N	Brewers	RR-CB-129	2026-06-06 03:09:59.8784+00
0f70af2e-dc71-4936-be4c-886c9be95df0	db432546-ce39-49cb-ac10-317d7e1b4916	Insulated Travel Press 350ml	https://example.com/rr-tp-036	Vacuum-insulated French press travel mug.	\N	Accessories	RR-TP-036	2026-06-06 03:09:59.8784+00
0075ea4d-8008-4491-9a7d-c00b8e7f395b	eb2d9813-9ada-4090-a17b-e941dc76cb2d	Smart Electric Gooseneck Kettle	https://example.com/kc-sk-099	App-connected kettle with hold-temp and pour-timer.	\N	Kettles	KC-SK-099	2026-06-06 03:09:59.8784+00
3e7c530f-57b5-44c5-80ea-bdd2f221a2a4	eb2d9813-9ada-4090-a17b-e941dc76cb2d	Milk Frother Pro	https://example.com/kc-mf-059	Induction milk frother with four texture modes.	\N	Accessories	KC-MF-059	2026-06-06 03:09:59.8784+00
\.


--
-- Data for Name: competitors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."competitors" ("id", "user_id", "display_name", "url", "status", "last_crawled_at", "created_at") FROM stdin;
5398ef97-b19c-4236-96fa-446305bc76f5	2dc42356-13cb-4ce4-bf77-fd583f77d72e	PourCraft	https://pourcraft.example.com	Paused	2026-05-31 03:09:59.8784+00	2026-06-06 03:09:59.8784+00
db432546-ce39-49cb-ac10-317d7e1b4916	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Roast Republic	https://roastrepublic.example.com	Active	2026-06-06 04:19:22.619+00	2026-06-06 03:09:59.8784+00
3b4a555a-1676-4ab4-85e2-64635d43d610	2dc42356-13cb-4ce4-bf77-fd583f77d72e	razer mouse	https://www.razer.com/store/gaming-mice	Active	\N	2026-06-06 04:42:34.372594+00
6b4413a4-1b9b-4e6c-97f7-c37deeb861d1	2dc42356-13cb-4ce4-bf77-fd583f77d72e	CremaLab	https://shop.cremalab.example.com	Active	2026-06-06 05:55:36.687+00	2026-06-06 03:09:59.8784+00
eb2d9813-9ada-4090-a17b-e941dc76cb2d	2dc42356-13cb-4ce4-bf77-fd583f77d72e	Kettle & Co	https://kettleandco.example.com	Active	2026-06-06 05:55:36.899+00	2026-06-06 03:09:59.8784+00
5be3c0a5-1d99-46e2-bee4-d4f2f4b8a02d	2dc42356-13cb-4ce4-bf77-fd583f77d72e	amazon	https://www.amazon.com/	Active	2026-06-06 05:56:20.115+00	2026-06-06 04:39:26.624993+00
\.


--
-- Data for Name: generated_stores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."generated_stores" ("id", "user_id", "slug", "name", "description", "brand_asset_id", "palette", "content", "published", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."price_history" ("id", "competitor_product_id", "price", "currency", "timestamp") FROM stdin;
f21e0390-b30a-4b34-85d4-d0db0e11716c	614c2ec5-0246-4d67-a640-0954d52337a5	713.47	USD	2026-05-13 03:09:59.8784+00
7e97ea1d-e583-4fee-88d2-f7c8329d70a3	614c2ec5-0246-4d67-a640-0954d52337a5	731.83	USD	2026-05-16 03:09:59.8784+00
5e3201fa-453d-4816-acd9-2d117596ff3b	614c2ec5-0246-4d67-a640-0954d52337a5	723.41	USD	2026-05-19 03:09:59.8784+00
6ecc102b-fdb9-40c4-aece-2681bf9de0f4	614c2ec5-0246-4d67-a640-0954d52337a5	729.25	USD	2026-05-22 03:09:59.8784+00
6d7711f3-064b-4bc5-beb6-1c2a32e0ca26	614c2ec5-0246-4d67-a640-0954d52337a5	724.81	USD	2026-05-25 03:09:59.8784+00
0fe16cfd-2bdc-43a8-9e6b-27b9114a60de	614c2ec5-0246-4d67-a640-0954d52337a5	746.47	USD	2026-05-28 03:09:59.8784+00
ab2322eb-69b4-42dc-b41b-5476ed9ee84a	614c2ec5-0246-4d67-a640-0954d52337a5	775.00	USD	2026-05-31 03:09:59.8784+00
5aa66502-707e-4fed-9c0c-0a1c440b8670	614c2ec5-0246-4d67-a640-0954d52337a5	719.59	USD	2026-06-03 03:09:59.8784+00
f6f4ec72-7c7a-4338-8aaa-7bcbcc843518	614c2ec5-0246-4d67-a640-0954d52337a5	749.00	USD	2026-06-06 03:09:59.8784+00
442aa90c-7c7c-45bc-b2c4-4b66a273a61a	5639f778-d55b-4031-a34a-8be59464ffee	331.07	USD	2026-05-13 03:09:59.8784+00
8a6c02ef-eb08-4bc2-8293-93f0d37d4e59	5639f778-d55b-4031-a34a-8be59464ffee	344.52	USD	2026-05-16 03:09:59.8784+00
ca06d39a-5d42-4c18-a515-aee5f927ec77	5639f778-d55b-4031-a34a-8be59464ffee	344.51	USD	2026-05-19 03:09:59.8784+00
941588cc-5a33-40a0-b809-1f0c96167167	5639f778-d55b-4031-a34a-8be59464ffee	332.73	USD	2026-05-22 03:09:59.8784+00
c1ac8715-b2c5-42dd-87af-b409ac10e0a6	5639f778-d55b-4031-a34a-8be59464ffee	332.31	USD	2026-05-25 03:09:59.8784+00
01f605ef-ac70-4b4f-8cd0-6aa907efc853	5639f778-d55b-4031-a34a-8be59464ffee	329.23	USD	2026-05-28 03:09:59.8784+00
810f4bcf-3cfa-45ad-9704-fc41c1f82d0d	5639f778-d55b-4031-a34a-8be59464ffee	343.47	USD	2026-05-31 03:09:59.8784+00
6ec9fd18-12f3-442c-85de-36e497ea78c3	5639f778-d55b-4031-a34a-8be59464ffee	327.08	USD	2026-06-03 03:09:59.8784+00
2f9f2e39-79a1-4c98-bd2c-b9b0b3447368	5639f778-d55b-4031-a34a-8be59464ffee	329.00	USD	2026-06-06 03:09:59.8784+00
b54aabd6-7d87-4e4d-bb23-61bf0dc83d9a	38f92354-d7c3-49e3-9455-ecd6d766ad00	56.15	USD	2026-05-13 03:09:59.8784+00
7cc75b44-639e-40db-8f66-2188a53e681e	38f92354-d7c3-49e3-9455-ecd6d766ad00	53.03	USD	2026-05-16 03:09:59.8784+00
e19fec47-7d61-431e-a4fb-75497a0a28d8	38f92354-d7c3-49e3-9455-ecd6d766ad00	53.01	USD	2026-05-19 03:09:59.8784+00
37e34386-f089-4629-baa7-361514cdca54	38f92354-d7c3-49e3-9455-ecd6d766ad00	56.07	USD	2026-05-22 03:09:59.8784+00
6ac2411f-2f44-47b6-b978-629f37cdb0bc	38f92354-d7c3-49e3-9455-ecd6d766ad00	51.79	USD	2026-05-25 03:09:59.8784+00
79bd697d-2e90-4e1b-8d12-e8c2cc6f7ac6	38f92354-d7c3-49e3-9455-ecd6d766ad00	52.71	USD	2026-05-28 03:09:59.8784+00
6bffacc5-56d9-453f-82e8-cfcdd62bf1ed	38f92354-d7c3-49e3-9455-ecd6d766ad00	54.56	USD	2026-05-31 03:09:59.8784+00
541d5a76-c33d-45e1-a2be-1a22e6355172	38f92354-d7c3-49e3-9455-ecd6d766ad00	54.62	USD	2026-06-03 03:09:59.8784+00
e11b75d1-3e2f-4f07-a764-c34a0d1b0328	38f92354-d7c3-49e3-9455-ecd6d766ad00	54.00	USD	2026-06-06 03:09:59.8784+00
0ba99e87-45bd-4f17-8f4d-d6cab127db9d	45d0d622-217e-4e37-b03a-81f7b353885c	40.76	USD	2026-05-13 03:09:59.8784+00
e9defc7b-8373-48e9-a40a-1525514d260b	45d0d622-217e-4e37-b03a-81f7b353885c	40.41	USD	2026-05-16 03:09:59.8784+00
71c81b6f-c1b6-4713-a155-67169e4fe09e	45d0d622-217e-4e37-b03a-81f7b353885c	41.34	USD	2026-05-19 03:09:59.8784+00
3075d4c9-cabb-476d-8868-94613f1c3852	45d0d622-217e-4e37-b03a-81f7b353885c	41.92	USD	2026-05-22 03:09:59.8784+00
07ce948e-eea8-411e-b1bc-3f1f92be8e71	45d0d622-217e-4e37-b03a-81f7b353885c	40.18	USD	2026-05-25 03:09:59.8784+00
79134b25-9e97-409a-bc76-af21c2656c79	45d0d622-217e-4e37-b03a-81f7b353885c	41.35	USD	2026-05-28 03:09:59.8784+00
bbd6f611-1dda-41ce-aacd-32fd88ef2ff9	45d0d622-217e-4e37-b03a-81f7b353885c	42.31	USD	2026-05-31 03:09:59.8784+00
e381fd60-552a-47de-b1af-b018e93460df	45d0d622-217e-4e37-b03a-81f7b353885c	40.70	USD	2026-06-03 03:09:59.8784+00
1e4d5ae5-faaa-4bda-97f5-3484ee9a69b9	45d0d622-217e-4e37-b03a-81f7b353885c	42.00	USD	2026-06-06 03:09:59.8784+00
ddb4ed0a-b4f4-4438-89bb-aac38630bc7d	a064881d-6428-42fc-906b-64698063be6c	125.71	USD	2026-05-13 03:09:59.8784+00
a2d1c231-5d0f-41b6-9b7d-012d9a712ffd	a064881d-6428-42fc-906b-64698063be6c	127.72	USD	2026-05-16 03:09:59.8784+00
6284fff8-76b9-4be6-9efd-2bd3d5268cdd	a064881d-6428-42fc-906b-64698063be6c	128.51	USD	2026-05-19 03:09:59.8784+00
9f8f2273-c053-4208-930d-bd3b3d6ed864	a064881d-6428-42fc-906b-64698063be6c	131.44	USD	2026-05-22 03:09:59.8784+00
0f2a3fd5-0100-4575-9284-13781a8cf8ba	a064881d-6428-42fc-906b-64698063be6c	135.39	USD	2026-05-25 03:09:59.8784+00
b12571e1-0e17-4649-9a90-d0c3233c7588	a064881d-6428-42fc-906b-64698063be6c	130.04	USD	2026-05-28 03:09:59.8784+00
12498bde-4d7a-412c-a544-d2815266ea6f	a064881d-6428-42fc-906b-64698063be6c	132.98	USD	2026-05-31 03:09:59.8784+00
70200af1-3e3f-44ea-af17-326999ad7f97	a064881d-6428-42fc-906b-64698063be6c	130.24	USD	2026-06-03 03:09:59.8784+00
ee76e6f4-a652-460e-9e7c-8dd337fdde2c	a064881d-6428-42fc-906b-64698063be6c	129.00	USD	2026-06-06 03:09:59.8784+00
b7612f1a-0b81-4c6b-a85a-660e734b183b	0f70af2e-dc71-4936-be4c-886c9be95df0	35.11	USD	2026-05-13 03:09:59.8784+00
a4bb18e6-e5fc-43f9-9edb-5248a2392d95	0f70af2e-dc71-4936-be4c-886c9be95df0	35.25	USD	2026-05-16 03:09:59.8784+00
fb0556e9-ebca-466f-9200-318c4fd818cc	0f70af2e-dc71-4936-be4c-886c9be95df0	37.19	USD	2026-05-19 03:09:59.8784+00
5f911cbe-1f7f-4ab5-8d36-188be786fd91	0f70af2e-dc71-4936-be4c-886c9be95df0	37.60	USD	2026-05-22 03:09:59.8784+00
05c8e524-bc56-4fe4-b358-e6d643f3c799	0f70af2e-dc71-4936-be4c-886c9be95df0	36.98	USD	2026-05-25 03:09:59.8784+00
064c9e42-9870-42e8-afd3-ab588efe9710	0f70af2e-dc71-4936-be4c-886c9be95df0	35.85	USD	2026-05-28 03:09:59.8784+00
264f158f-0516-46a9-af70-3472c68f5c6c	0f70af2e-dc71-4936-be4c-886c9be95df0	37.00	USD	2026-05-31 03:09:59.8784+00
419a6ece-9af0-4c1a-893a-0040fc2db8a9	0f70af2e-dc71-4936-be4c-886c9be95df0	35.72	USD	2026-06-03 03:09:59.8784+00
a9e6f947-d366-4b4e-b011-67992091b4ae	0f70af2e-dc71-4936-be4c-886c9be95df0	36.00	USD	2026-06-06 03:09:59.8784+00
2ebc8fad-2888-4f27-a54a-605948aaec39	0075ea4d-8008-4491-9a7d-c00b8e7f395b	94.11	USD	2026-05-13 03:09:59.8784+00
af7f7afb-31c9-4c53-877d-5b0a21ced368	0075ea4d-8008-4491-9a7d-c00b8e7f395b	101.40	USD	2026-05-16 03:09:59.8784+00
4e0649ca-eb2a-4311-bf19-a007072de6b3	0075ea4d-8008-4491-9a7d-c00b8e7f395b	97.91	USD	2026-05-19 03:09:59.8784+00
c27e2f28-a54e-4f42-8d39-c6df873793fd	0075ea4d-8008-4491-9a7d-c00b8e7f395b	97.64	USD	2026-05-22 03:09:59.8784+00
c47d1da7-f887-4f98-b9a5-c75736829132	0075ea4d-8008-4491-9a7d-c00b8e7f395b	98.77	USD	2026-05-25 03:09:59.8784+00
1bccb186-d944-4c4a-852b-c3e143914425	0075ea4d-8008-4491-9a7d-c00b8e7f395b	95.93	USD	2026-05-28 03:09:59.8784+00
4282ca30-f86f-4184-a8af-9bc380e9d8b1	0075ea4d-8008-4491-9a7d-c00b8e7f395b	94.84	USD	2026-05-31 03:09:59.8784+00
c31572c0-fce1-4eb7-ad30-02d39336e6c7	0075ea4d-8008-4491-9a7d-c00b8e7f395b	98.34	USD	2026-06-03 03:09:59.8784+00
d6124a87-3eb9-4eb8-b2d7-9ab87c7f4fed	0075ea4d-8008-4491-9a7d-c00b8e7f395b	99.00	USD	2026-06-06 03:09:59.8784+00
e8c34825-41f4-4d3e-9635-a732288759ac	3e7c530f-57b5-44c5-80ea-bdd2f221a2a4	59.82	USD	2026-05-13 03:09:59.8784+00
faab1fa2-84f7-4cb8-b282-b65514bd4540	3e7c530f-57b5-44c5-80ea-bdd2f221a2a4	56.99	USD	2026-05-16 03:09:59.8784+00
69f96565-6062-4dff-8f78-4d6ed3fa2a71	3e7c530f-57b5-44c5-80ea-bdd2f221a2a4	57.07	USD	2026-05-19 03:09:59.8784+00
90bfa409-13e4-452b-9e7f-6bdb7aca3e72	3e7c530f-57b5-44c5-80ea-bdd2f221a2a4	56.80	USD	2026-05-22 03:09:59.8784+00
b4d53a96-bc79-4c4c-b535-0a4e5141c30a	3e7c530f-57b5-44c5-80ea-bdd2f221a2a4	61.18	USD	2026-05-25 03:09:59.8784+00
93e28eee-094e-43ff-bfb3-9e0ebc425376	3e7c530f-57b5-44c5-80ea-bdd2f221a2a4	56.34	USD	2026-05-28 03:09:59.8784+00
09c8814a-6018-4ce0-9a02-38be77b946c6	3e7c530f-57b5-44c5-80ea-bdd2f221a2a4	58.81	USD	2026-05-31 03:09:59.8784+00
7af699b2-6ff4-4a59-89fb-709e9f2b1d6b	3e7c530f-57b5-44c5-80ea-bdd2f221a2a4	58.45	USD	2026-06-03 03:09:59.8784+00
34b3f1fb-cb0f-4ec1-9de5-6b60ebd01a39	3e7c530f-57b5-44c5-80ea-bdd2f221a2a4	59.00	USD	2026-06-06 03:09:59.8784+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."profiles" ("id", "email", "full_name", "company_name", "role", "created_at", "updated_at") FROM stdin;
2dc42356-13cb-4ce4-bf77-fd583f77d72e	joe@marketeye.demo	Joe Demo	\N	User	2026-06-06 03:09:59.650311+00	2026-06-06 03:09:59.650311+00
\.


--
-- Data for Name: seo_content; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."seo_content" ("id", "user_id", "product_id", "type", "topic", "title", "body", "keywords", "status", "created_at", "published_at") FROM stdin;
19d27a25-6749-4e55-afbd-081ee2a5dd79	2dc42356-13cb-4ce4-bf77-fd583f77d72e	\N	Blog Post	How to dial in espresso at home	7 Steps to Dial In the Perfect Espresso Shot at Home	\N	{espresso,"home barista","dialing in","grind size"}	Published	2026-06-03 03:09:59.8784+00	2026-06-03 15:09:59.8784+00
5e43dadc-e0a4-4156-95c9-4f0ead5b4870	2dc42356-13cb-4ce4-bf77-fd583f77d72e	\N	Product Description	Aria Dual-Boiler Espresso Machine	Aria Dual-Boiler — Café-Grade Espresso, Engineered for Your Counter	\N	{"dual boiler",PID,"prosumer espresso"}	Draft	2026-06-05 03:09:59.8784+00	\N
c0946288-9546-4931-b9c1-99679836357b	2dc42356-13cb-4ce4-bf77-fd583f77d72e	\N	FAQ	Cold brew brewing questions	Cold Brew FAQ: Ratios, Timing & Storage	\N	{"cold brew",ratio,storage}	Draft	2026-06-05 21:09:59.8784+00	\N
\.


--
-- Data for Name: trends; Type: TABLE DATA; Schema: public; Owner: -
--

COPY "public"."trends" ("id", "user_id", "keyword", "platform", "product_name", "source_url", "trend_score", "virality_potential", "seasonality_score", "saved", "discovered_at") FROM stdin;
98466e72-5cc2-4103-b4e1-89dc108d443c	2dc42356-13cb-4ce4-bf77-fd583f77d72e	cold brew	TikTok	Slow-Drip Cold Brew Tower	https://tiktok.com/t/coldbrewtower	92	88	71	t	2026-06-05 21:09:59.8784+00
610c73ef-830a-4ea7-bbef-e2b008e35e56	2dc42356-13cb-4ce4-bf77-fd583f77d72e	milk frother	Amazon	Electric Milk Frother (4-mode)	https://amazon.com/dp/frother	84	62	55	f	2026-06-05 16:09:59.8784+00
25cd1f55-7d64-41c9-95d5-3c82b4e7865e	2dc42356-13cb-4ce4-bf77-fd583f77d72e	matcha kit	TikTok	Ceremonial Matcha Starter Kit	https://tiktok.com/t/matchakit	89	95	48	f	2026-06-05 13:09:59.8784+00
77c250d2-5616-4cec-b29f-08b80dc5ee56	2dc42356-13cb-4ce4-bf77-fd583f77d72e	pour over	Reddit	Single-Dose Burr Grinder	https://reddit.com/r/coffee/po	76	44	39	f	2026-06-05 07:09:59.8784+00
d8717000-8c2e-431c-83a3-5f895efa9c24	2dc42356-13cb-4ce4-bf77-fd583f77d72e	travel espresso	Amazon	Portable Hand-Pump Espresso Maker	https://amazon.com/dp/travelesp	81	73	66	t	2026-06-05 01:09:59.8784+00
a1f85b3f-39e3-4732-bbbc-c41be4c2d856	2dc42356-13cb-4ce4-bf77-fd583f77d72e	coffee scale	Reddit	Bluetooth Brew Scale	https://reddit.com/r/espresso/scale	68	51	33	f	2026-06-04 17:09:59.8784+00
4d026eb9-bf34-4cb7-acc2-52dd6c406c04	2dc42356-13cb-4ce4-bf77-fd583f77d72e	iced latte	TikTok	Glass Iced Latte Tumbler Set	https://tiktok.com/t/icedlatte	87	90	78	f	2026-06-04 09:09:59.8784+00
15996ef0-692b-4680-8830-cfeb78853774	2dc42356-13cb-4ce4-bf77-fd583f77d72e	dripper	Other	Ceramic Flat-Bottom Dripper	https://example.com/dripper	59	38	41	f	2026-06-03 19:09:59.8784+00
b36f9feb-96ff-4f8a-86ac-1a63bdab7fbf	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	TikTok	#slow | TikTok	https://www.tiktok.com/tag/slow	72	23	88	f	2026-06-06 03:59:11.393+00
8874da10-0d79-4e68-8ac1-dd168eccf4c3	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	TikTok	The Power of a Slow Hand in Country Music | TikTok	https://www.tiktok.com/@hudsonwestbrookmusic/video/7614692751304592670	65	67	46	f	2026-06-06 03:59:11.44+00
c5c16121-4fc7-42bd-873c-6cf99fd0bbe9	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	TikTok	Slow Blink | Learn - TikTok effect house	https://effecthouse.tiktok.com/learn/guides/workspace/objects/generative-effects/slow-blink	81	84	51	f	2026-06-06 03:59:11.485+00
d7fa8407-f5a1-4f7a-acc7-4b119b4d1dc0	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	TikTok	Boost Your Vocabulary: Synonyms for Slow | English Language Tips	https://www.tiktok.com/@englishwitharchie/video/7268663924768394529	77	52	76	f	2026-06-06 03:59:11.527+00
6ed204c8-52f6-4f2a-b881-1bebe8584608	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	TikTok	simple slow cooker recipes - TikTok Shop	https://shop.tiktok.com/us/k/simple-slow-cooker-recipes	86	93	77	f	2026-06-06 03:59:11.575+00
30078246-fbe8-4a80-81f1-d9c8c88ed556	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	Amazon	Thomas Slow: books, biography, latest update - Amazon.com	https://www.amazon.com/stores/author/B07WRC3HWR	61	25	2	f	2026-06-06 03:59:12.306+00
5db46361-4c6f-42fd-a46b-be272931f55c	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	Amazon	Seller Central Edit and Add Product Pages SO SLOW almost unusable	https://sellercentral.amazon.com/seller-forums/discussions/t/60df476c-3a8b-4913-9638-f84971901b96	92	13	64	f	2026-06-06 03:59:12.353+00
aec6621b-f747-4f5f-adde-1cf0eb66030f	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	Amazon	Configuring your database to monitor slow SQL queries with ...	https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DatabaseInsights.SlowSQL.html	79	40	18	f	2026-06-06 03:59:12.396+00
5c84c853-a1e1-49e8-9a89-06422629487d	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	Amazon	T swift slow songs | Community Playlist on Amazon Music Unlimited	https://music.amazon.com/user-playlists/2c07b53554f84baeb84942316c860b0fsune	81	66	93	f	2026-06-06 03:59:12.446+00
b99ac85a-3267-4667-95a5-fcc847e4b2fc	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	Amazon	Southwest Slow Cooking: Biber, Tammy, Howell, Theresa	https://www.amazon.com/Southwest-Slow-Cooking-Tammy-Biber/dp/0873588568	61	91	48	f	2026-06-06 03:59:12.493+00
cc6ee796-3a3d-4f6d-814b-4b55b723b401	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	Reddit	Does slow mean the same thing as calling someone intellectually ...	https://www.reddit.com/r/logophilia/comments/193d57e/does_slow_mean_the_same_thing_as_calling_someone/	82	49	40	f	2026-06-06 03:59:13.317+00
80a75f34-9c0d-4114-8226-6ce4235b5a2a	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	Reddit	Slow is making it feel impossible to have combat challenge my players	https://www.reddit.com/r/DMAcademy/comments/ju9oti/slow_is_making_it_feel_impossible_to_have_combat/	69	27	21	f	2026-06-06 03:59:13.36+00
b9712079-c2da-41d7-ae13-611dd1273822	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	Reddit	You can only pick ONE: Slow or Hypnotic Pattern? (2024) - Reddit	https://www.reddit.com/r/onednd/comments/1r4uppe/you_can_only_pick_one_slow_or_hypnotic_pattern/	83	6	43	f	2026-06-06 03:59:13.402+00
f65d7727-5202-44cc-835d-ada8fbb455f1	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	Reddit	r/SlowLiving - Reddit	https://www.reddit.com/r/SlowLiving/	79	77	49	f	2026-06-06 03:59:13.446+00
f3365587-966c-4d1c-9cac-a09e3e086f79	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slow	Reddit	is it better using Slow or use instead Web and save a third level slot?	https://www.reddit.com/r/dndnext/comments/u5thie/is_it_better_using_slow_or_use_instead_web_and/	87	84	92	f	2026-06-06 03:59:13.489+00
dac5d7c3-7e15-44e7-915d-fd1cd7282d4f	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	TikTok	Slows BBQ Detroit Weekend Food Tour - TikTok	https://www.tiktok.com/@sethtroxler/video/7375123922062249262	66	23	98	f	2026-06-06 03:59:13.619+00
89901716-35c6-4c78-b2f2-6b64fdda09df	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	TikTok	USED-Slows: Twice by Liem, T. (Paperback) - TikTok Shop	https://shop.tiktok.com/us/pdp/slows-twice-by-liem-paperback-poetry-collection-used-book/1731891834298929866	84	39	26	f	2026-06-06 03:59:13.66+00
231e6762-b2a2-4626-a295-80e3bb54ac0f	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	TikTok	Slows Bar BQ (@slowsbarbq_gr) | TikTok	https://www.tiktok.com/@slowsbarbq_gr	81	28	38	f	2026-06-06 03:59:13.7+00
8fdbc8b9-9c30-4cd3-84c0-de61d1464901	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	TikTok	Slow Feeder Dog Bowl Floating Pet Bowl Splash ... - TikTok Shop	https://shop.tiktok.com/us/pdp/kimpet7-dog-slow-feeder-bowl-1500ml-anti-overturning/1732281016861495865	79	7	8	f	2026-06-06 03:59:13.742+00
b161aea8-b442-4ca6-991e-7d14d5048ea1	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	TikTok	Slow Blink | Learn - TikTok effect house	https://effecthouse.tiktok.com/learn/guides/workspace/objects/generative-effects/slow-blink	64	5	75	f	2026-06-06 03:59:13.783+00
07965532-b19b-43a6-bc67-8d8e0f893e87	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	Amazon	Slows - Amazon.com Music	https://www.amazon.com/Slows/dp/B00008O2Y8	81	56	81	f	2026-06-06 03:59:14.591+00
ccf5bc14-e4ae-4e42-8df8-2886840aee6c	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	Amazon	Amazon Best Sellers: Best Dog Slow Feeders	https://www.amazon.com/Best-Sellers-Dog-Slow-Feeders/zgbs/pet-supplies/17602455011	83	67	28	f	2026-06-06 03:59:14.639+00
2033caae-ec85-460d-8ba8-2eea3c0e045e	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	Amazon	The Moth Radio Hour: When Time Slows Down | The Moth Episode ...	https://music.amazon.com/podcasts/ec96f832-d82b-4dbf-91e0-5b78c61177d5/episodes/9383146c-66c0-46ef-884c-f77a89849646/the-moth-the-moth-radio-hour-when-time-slows-down	82	60	6	f	2026-06-06 03:59:14.684+00
53e861ab-89a7-4e46-a5e1-e8abdbb9d618	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	Amazon	Listing Creation & Editing Page Extremely Slow – Any Fix?	https://sellercentral.amazon.com/seller-forums/discussions/t/56fedf45-6e0b-4ac2-9d33-df9ff2816553	90	89	6	f	2026-06-06 03:59:14.726+00
84b5b904-e91e-4682-b7c5-3126b0443768	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	Amazon	Query Running Slow - Amazon DocumentDB - AWS Documentation	https://docs.aws.amazon.com/documentdb/latest/devguide/performance-slow-queries.html	75	85	38	f	2026-06-06 03:59:14.773+00
70227d4b-01f3-4a7f-97b3-8c81b1d73807	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	Reddit	Slows BBQ 207 E Washington Ann Arbor. Now open - Reddit	https://www.reddit.com/r/AnnArbor/comments/1pe05bg/slows_bbq_207_e_washington_ann_arbor_now_open/	85	88	38	f	2026-06-06 03:59:15.61+00
726baa04-1533-475f-a433-248b5e9bd9d6	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	Reddit	Where is the door to Slows BBQ in Corktown? : r/Detroit - Reddit	https://www.reddit.com/r/Detroit/comments/1gv0cs0/where_is_the_door_to_slows_bbq_in_corktown/	75	62	74	f	2026-06-06 03:59:15.656+00
0b657e92-b931-42a3-ae4b-baf1bf96d43e	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	Reddit	[Detroit Free Press] Slows Bar BQ announces a third metro ... - Reddit	https://www.reddit.com/r/AnnArbor/comments/1mzr4av/detroit_free_press_slows_bar_bq_announces_a_third/	90	37	79	f	2026-06-06 03:59:15.697+00
9092042d-34d0-4f7e-bb3d-b5c877fbf61e	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	Reddit	[[Teferi, Who Slows the Sunset]], does the emblem stack? - Reddit	https://www.reddit.com/r/mtgrules/comments/1jp4tj7/teferi_who_slows_the_sunset_does_the_emblem_stack/	68	36	51	f	2026-06-06 03:59:15.739+00
0a740ddb-b4b6-477d-9533-85cf05e240f3	2dc42356-13cb-4ce4-bf77-fd583f77d72e	slows	Reddit	SLOWS BBQ - seems to keep changing and I don't like it. Or ... - Reddit	https://www.reddit.com/r/Detroit/comments/4xvm30/slows_bbq_seems_to_keep_changing_and_i_dont_like/	69	3	10	t	2026-06-06 03:59:15.786+00
9683fa05-f3df-423b-9be8-f21a301e082e	2dc42356-13cb-4ce4-bf77-fd583f77d72e	mouse	TikTok	Cute Mouse Videos: Tiny Mouses in Homes | TikTok	https://www.tiktok.com/@emily_gelardi/video/7458151949758778655	78	68	96	f	2026-06-06 04:45:17.93+00
75b4c715-6e80-4525-b822-71fef2383e09	2dc42356-13cb-4ce4-bf77-fd583f77d72e	mouse	TikTok	where to wire your mouse - TikTok Shop	https://shop.tiktok.com/us/k/where-to-wire-your-mouse	80	92	94	f	2026-06-06 04:45:18.01+00
9837437f-52b0-4972-bdf6-00acd33751d7	2dc42356-13cb-4ce4-bf77-fd583f77d72e	mouse	TikTok	#mouse | TikTok	https://www.tiktok.com/tag/mouse	75	89	47	f	2026-06-06 04:45:18.064+00
68fe2663-0698-4de2-8a1d-eb35fd61cbdb	2dc42356-13cb-4ce4-bf77-fd583f77d72e	mouse	TikTok	mouse black - TikTok Shop	https://shop.tiktok.com/us/k/mouse-black	67	0	24	f	2026-06-06 04:45:18.12+00
0f035c08-0db4-4dc4-bf9d-cc4002a39d38	2dc42356-13cb-4ce4-bf77-fd583f77d72e	mouse	TikTok	best mouse ever made - TikTok Shop	https://shop.tiktok.com/us/k/best-mouse-ever-made	84	1	40	f	2026-06-06 04:45:18.158+00
21f184fb-c04d-4743-bd05-3b1522007d7a	2dc42356-13cb-4ce4-bf77-fd583f77d72e	mouse	Amazon	Mouse - Amazon.com	https://www.amazon.com/mouse/s?k=mouse	91	81	85	f	2026-06-06 04:45:18.866+00
a0f64748-fd1b-4aba-ad7e-62da1b907c98	2dc42356-13cb-4ce4-bf77-fd583f77d72e	mouse	Amazon	Logitech MX Anywhere 2 Wireless Mouse – Use On Any Surface ...	https://www.amazon.com/Logitech-Anywhere-Wireless-Mouse-Rechargeable/dp/B075Y8ZVBB	74	34	96	f	2026-06-06 04:45:18.907+00
ea1050d8-74f4-41d9-8d52-384e07542230	2dc42356-13cb-4ce4-bf77-fd583f77d72e	mouse	Amazon	Logitech M510 Wireless Mouse, Black - Amazon.com	https://www.amazon.com/Logitech-Wireless-Computer-Mouse-Side/dp/B003NR57BY	65	65	96	f	2026-06-06 04:45:18.952+00
71937a58-dd28-411f-b639-8cce611850ee	2dc42356-13cb-4ce4-bf77-fd583f77d72e	mouse	Amazon	MiraCase Comfortable 2.4 GHz Long Range Silent Wireless Mouse	https://www.amazon.com/MiraCase-Comfortable-Wireless-Distance-Included/dp/B013EBQXB6	93	70	58	f	2026-06-06 04:45:18.996+00
9dad7373-ddf7-44a5-8052-e9f19452fdae	2dc42356-13cb-4ce4-bf77-fd583f77d72e	mouse	Amazon	Amazon.com: Cute Cat Wireless Mouse, 2.4GHz Wireless Silent ...	https://www.amazon.com/Wireless-Receiver-Adjustable-Compatible-Computer/dp/B0DPV9VWD8	70	85	64	f	2026-06-06 04:45:19.033+00
\.


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

\unrestrict h2tesCC4lo3A0fdObKzYbjdq8PchfPqnRmSajb0ZStcuusLl7ABQLIiD7FGg4LJ

