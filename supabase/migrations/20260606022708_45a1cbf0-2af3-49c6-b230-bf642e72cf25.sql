
CREATE OR REPLACE FUNCTION public.seed_demo_data(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

REVOKE EXECUTE ON FUNCTION public.seed_demo_data(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_demo_data(UUID) TO authenticated;
