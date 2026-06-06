/* ============================================================
   MarketForge AI — In-memory data store (mock backend)
   Simulates Supabase tables + Realtime via a pub/sub + setTimeout.
   ============================================================ */
(function () {
  const now = Date.now();
  const H = 3600 * 1000, D = 24 * H;
  const ago = (ms) => new Date(now - ms).toISOString();
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);

  // ---------- price history generator ----------
  function genHistory(base, points, vol) {
    const out = [];
    let p = base * (1 + (Math.random() - 0.5) * 0.12);
    for (let i = points - 1; i >= 0; i--) {
      p = Math.max(base * 0.7, p + (Math.random() - 0.48) * base * vol);
      out.push({ t: ago(i * 3 * D + Math.random() * D), price: Math.round(p * 100) / 100 });
    }
    out[out.length - 1].price = base; // current price = base
    return out;
  }

  // ---------- competitors + products ----------
  const competitors = [
    { id: 'c1', display_name: 'BaristaBox', url: 'https://baristabox.example.com', status: 'Active', last_crawled_at: ago(2 * H) },
    { id: 'c2', display_name: 'CremaLab', url: 'https://shop.cremalab.example.com', status: 'Active', last_crawled_at: ago(5 * H) },
    { id: 'c3', display_name: 'PourCraft', url: 'https://pourcraft.example.com', status: 'Paused', last_crawled_at: ago(6 * D) },
    { id: 'c4', display_name: 'Roast Republic', url: 'https://roastrepublic.example.com', status: 'Active', last_crawled_at: ago(1 * D) },
    { id: 'c5', display_name: 'Kettle & Co', url: 'https://kettleandco.example.com', status: 'Error', last_crawled_at: ago(3 * D) },
  ];

  const productSeed = [
    ['c1', 'Aria Dual-Boiler Espresso Machine', 899, 'Machines', 'BB-ESP-900', 'A prosumer dual-boiler with PID temperature control and a rotary pump.'],
    ['c1', 'Aria Conical Burr Grinder', 249, 'Grinders', 'BB-GR-249', 'Stepless burr grinder with 40mm conical burrs for espresso to pour-over.'],
    ['c1', 'Gooseneck Pour-Over Kettle 1.0L', 79, 'Kettles', 'BB-KT-079', 'Variable temperature gooseneck kettle with a 1L capacity.'],
    ['c1', 'Precision Coffee Scale', 39, 'Accessories', 'BB-SC-039', '0.1g precision scale with built-in brew timer.'],
    ['c2', 'Crema Pro Semi-Auto Machine', 749, 'Machines', 'CL-PRO-750', '58mm portafilter semi-automatic with a single boiler and steam wand.'],
    ['c2', 'Crema Flat Burr Grinder', 329, 'Grinders', 'CL-FB-329', '64mm flat burr grinder with single-dose hopper.'],
    ['c2', 'Glass Carafe Pour-Over Set', 54, 'Brewers', 'CL-PO-054', 'Borosilicate carafe with reusable stainless filter.'],
    ['c4', 'Republic Single-Origin Sampler', 42, 'Beans', 'RR-SO-042', 'Rotating four-bag sampler of single-origin lots.'],
    ['c4', 'Cold Brew Tower 1.5L', 129, 'Brewers', 'RR-CB-129', 'Slow-drip cold brew tower, glass and walnut.'],
    ['c4', 'Insulated Travel Press 350ml', 36, 'Accessories', 'RR-TP-036', 'Vacuum-insulated French press travel mug.'],
    ['c5', 'Smart Electric Gooseneck Kettle', 99, 'Kettles', 'KC-SK-099', 'App-connected kettle with hold-temp and pour-timer.'],
    ['c5', 'Milk Frother Pro', 59, 'Accessories', 'KC-MF-059', 'Induction milk frother with four texture modes.'],
  ];

  const competitor_products = [];
  const price_history = [];
  productSeed.forEach((s, i) => {
    const [cid, name, price, category, sku, description] = s;
    const pid = 'p' + (i + 1);
    competitor_products.push({
      id: pid, competitor_id: cid, name, url: 'https://example.com/' + sku.toLowerCase(),
      description, image_url: '', category, sku, last_updated_at: ago(Math.random() * 4 * D),
    });
    genHistory(price, 9, 0.05).forEach((h) => {
      price_history.push({ id: uid('ph'), competitor_product_id: pid, price: h.price, currency: 'USD', timestamp: h.t });
    });
  });

  // ---------- alerts ----------
  const alerts = [
    { id: 'a1', type: 'Price Change', competitor_name: 'CremaLab', product_name: 'Crema Pro Semi-Auto Machine', old_price: 799, new_price: 749, is_read: false, created_at: ago(0.5 * H) },
    { id: 'a2', type: 'New Product', competitor_name: 'Roast Republic', product_name: 'Cold Brew Tower 1.5L', old_price: null, new_price: 129, is_read: false, created_at: ago(3 * H) },
    { id: 'a3', type: 'Price Change', competitor_name: 'BaristaBox', product_name: 'Aria Conical Burr Grinder', old_price: 229, new_price: 249, is_read: false, created_at: ago(8 * H) },
    { id: 'a4', type: 'Price Change', competitor_name: 'BaristaBox', product_name: 'Gooseneck Pour-Over Kettle 1.0L', old_price: 89, new_price: 79, is_read: true, created_at: ago(1.2 * D) },
    { id: 'a5', type: 'New Product', competitor_name: 'CremaLab', product_name: 'Crema Flat Burr Grinder', old_price: null, new_price: 329, is_read: true, created_at: ago(2 * D) },
    { id: 'a6', type: 'Price Change', competitor_name: 'Roast Republic', product_name: 'Insulated Travel Press 350ml', old_price: 39, new_price: 36, is_read: true, created_at: ago(2.5 * D) },
  ];

  // ---------- trends ----------
  const trends = [
    { id: 't1', keyword: 'cold brew', platform: 'TikTok', product_name: 'Slow-Drip Cold Brew Tower', source_url: 'https://tiktok.com/t/coldbrewtower', trend_score: 92, virality_potential: 88, seasonality_score: 71, saved: true, discovered_at: ago(6 * H) },
    { id: 't2', keyword: 'milk frother', platform: 'Amazon', product_name: 'Electric Milk Frother (4-mode)', source_url: 'https://amazon.com/dp/frother', trend_score: 84, virality_potential: 62, seasonality_score: 55, saved: false, discovered_at: ago(11 * H) },
    { id: 't3', keyword: 'matcha kit', platform: 'TikTok', product_name: 'Ceremonial Matcha Starter Kit', source_url: 'https://tiktok.com/t/matchakit', trend_score: 89, virality_potential: 95, seasonality_score: 48, saved: false, discovered_at: ago(14 * H) },
    { id: 't4', keyword: 'pour over', platform: 'Reddit', product_name: 'Single-Dose Burr Grinder', source_url: 'https://reddit.com/r/coffee/po', trend_score: 76, virality_potential: 44, seasonality_score: 39, saved: false, discovered_at: ago(20 * H) },
    { id: 't5', keyword: 'travel espresso', platform: 'Amazon', product_name: 'Portable Hand-Pump Espresso Maker', source_url: 'https://amazon.com/dp/travelesp', trend_score: 81, virality_potential: 73, seasonality_score: 66, saved: true, discovered_at: ago(1.1 * D) },
    { id: 't6', keyword: 'coffee scale', platform: 'Reddit', product_name: 'Bluetooth Brew Scale', source_url: 'https://reddit.com/r/espresso/scale', trend_score: 68, virality_potential: 51, seasonality_score: 33, saved: false, discovered_at: ago(1.4 * D) },
    { id: 't7', keyword: 'iced latte', platform: 'TikTok', product_name: 'Glass Iced Latte Tumbler Set', source_url: 'https://tiktok.com/t/icedlatte', trend_score: 87, virality_potential: 90, seasonality_score: 78, saved: false, discovered_at: ago(1.8 * D) },
    { id: 't8', keyword: 'dripper', platform: 'Other', product_name: 'Ceramic Flat-Bottom Dripper', source_url: 'https://example.com/dripper', trend_score: 59, virality_potential: 38, seasonality_score: 41, saved: false, discovered_at: ago(2.3 * D) },
  ];

  // ---------- brand assets ----------
  const brand_assets = [
    {
      id: 'b1', source_description: 'Premium home espresso gear for design-conscious enthusiasts',
      brand_name: 'Driftwood Coffee Co.',
      customer_persona: { name: 'The Weekend Barista', age: '28–42', traits: ['Design-conscious', 'Quality over quantity', 'Enjoys ritual'], summary: 'Urban professionals who treat their morning brew as a craft. They research before buying and pay for durability and aesthetics.' },
      brand_voice: 'Warm, knowledgeable, and unpretentious — like a trusted friend who happens to be a barista.',
      color_palette: ['#2A1E16', '#C8794A', '#E8DCC8', '#7A8B6F', '#F4EFE6'],
      font_choices: { primary: 'Fraunces', secondary: 'Hanken Grotesk' },
      generated_at: ago(4 * D),
    },
  ];

  // ---------- seo content ----------
  const seo_content = [
    { id: 's1', type: 'Blog Post', topic: 'How to dial in espresso at home', title: '7 Steps to Dial In the Perfect Espresso Shot at Home', body: '', keywords: ['espresso', 'home barista', 'dialing in', 'grind size'], status: 'Published', created_at: ago(3 * D), published_at: ago(2.5 * D) },
    { id: 's2', type: 'Product Description', topic: 'Aria Dual-Boiler Espresso Machine', title: 'Aria Dual-Boiler — Café-Grade Espresso, Engineered for Your Counter', body: '', keywords: ['dual boiler', 'PID', 'prosumer espresso'], status: 'Draft', created_at: ago(1 * D), published_at: null },
    { id: 's3', type: 'FAQ', topic: 'Cold brew brewing questions', title: 'Cold Brew FAQ: Ratios, Timing & Storage', body: '', keywords: ['cold brew', 'ratio', 'storage'], status: 'Draft', created_at: ago(6 * H), published_at: null },
  ];

  // ---------- generated stores ----------
  const generated_stores = [
    { id: 'g1', store_name: 'Driftwood Coffee Co.', brand_asset_id: 'b1', status: 'Ready', generation_prompt: {}, generated_files: [], error_message: null, created_at: ago(2 * D) },
  ];

  // ---------- background tasks ----------
  const background_tasks = [
    { id: 'bt1', task_type: 'Crawl Competitor', status: 'Completed', details: { target: 'BaristaBox', found: 4 }, error_message: null, dismissed: false, created_at: ago(2 * H), updated_at: ago(2 * H - 40000) },
    { id: 'bt2', task_type: 'Scan Trends', status: 'Completed', details: { platforms: ['TikTok', 'Amazon'], found: 5 }, error_message: null, dismissed: false, created_at: ago(11 * H), updated_at: ago(11 * H - 90000) },
    { id: 'bt3', task_type: 'Generate Brand', status: 'Completed', details: { brand: 'Driftwood Coffee Co.' }, error_message: null, dismissed: false, created_at: ago(4 * D), updated_at: ago(4 * D - 30000) },
    { id: 'bt4', task_type: 'Crawl Competitor', status: 'Failed', details: { target: 'Kettle & Co' }, error_message: 'Crawler timed out after 30s — site returned 503 (Service Unavailable).', dismissed: false, created_at: ago(3 * D), updated_at: ago(3 * D - 31000) },
    { id: 'bt5', task_type: 'Generate Store', status: 'Completed', details: { store: 'Driftwood Coffee Co.' }, error_message: null, dismissed: false, created_at: ago(2 * D), updated_at: ago(2 * D - 120000) },
    { id: 'bt6', task_type: 'Generate SEO', status: 'Running', details: { topic: 'Cold brew brewing questions' }, error_message: null, dismissed: false, created_at: ago(4 * 60000), updated_at: ago(60000) },
  ];

  const profile = { id: 'u1', email: 'jordan@driftwood.co', full_name: 'Jordan Avery', company_name: 'Driftwood Coffee Co.', role: 'Admin' };

  // ============================================================
  //  Store
  // ============================================================
  const listeners = new Set();
  let connected = true;

  const state = {
    profile, competitors, competitor_products, price_history, alerts, trends,
    brand_assets, seo_content, generated_stores, background_tasks, connected,
  };

  function emit() { listeners.forEach((fn) => fn()); }

  const Store = {
    get: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    uid,

    // ----- helpers -----
    productsFor(cid) { return state.competitor_products.filter((p) => p.competitor_id === cid); },
    historyFor(pid) {
      return state.price_history.filter((h) => h.competitor_product_id === pid)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    currentPrice(pid) {
      const h = this.historyFor(pid);
      return h.length ? h[h.length - 1].price : null;
    },
    unreadAlerts() { return state.alerts.filter((a) => !a.is_read); },
    activeTasks() { return state.background_tasks.filter((t) => !t.dismissed && (t.status === 'Running' || t.status === 'Pending')); },

    // ----- mutations -----
    addTask(task_type, details) {
      const t = { id: uid('bt'), task_type, status: 'Running', details: details || {}, error_message: null, dismissed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      state.background_tasks.unshift(t);
      emit();
      return t;
    },
    finishTask(id, status, patch) {
      const t = state.background_tasks.find((x) => x.id === id);
      if (!t) return;
      t.status = status; t.updated_at = new Date().toISOString();
      if (patch) Object.assign(t, patch);
      emit();
      window.MFToast && window.MFToast(
        status === 'Failed' ? 'error' : 'success',
        t.task_type + ' ' + status.toLowerCase(),
        status === 'Failed' ? (t.error_message || 'Task failed.') : taskDoneMsg(t)
      );
    },
    dismissTask(id) { const t = state.background_tasks.find((x) => x.id === id); if (t) { t.dismissed = true; emit(); } },

    addAlert(a) {
      const alert = Object.assign({ id: uid('a'), is_read: false, created_at: new Date().toISOString() }, a);
      state.alerts.unshift(alert);
      emit();
      window.MFToast && window.MFToast('alert', a.type, alertMsg(alert));
      return alert;
    },
    markAlertRead(id) { const a = state.alerts.find((x) => x.id === id); if (a) { a.is_read = true; emit(); } },
    markAllRead() { state.alerts.forEach((a) => a.is_read = true); emit(); },

    addCompetitor(display_name, url) {
      const c = { id: uid('c'), display_name: display_name || hostFromUrl(url), url, status: 'Active', last_crawled_at: null };
      state.competitors.unshift(c);
      emit();
      this.recrawl(c.id, true);
      return c;
    },
    setStatus(id, status) { const c = state.competitors.find((x) => x.id === id); if (c) { c.status = status; emit(); } },
    deleteCompetitor(id) {
      state.competitors = state.competitors.filter((c) => c.id !== id);
      const pids = state.competitor_products.filter((p) => p.competitor_id === id).map((p) => p.id);
      state.competitor_products = state.competitor_products.filter((p) => p.competitor_id !== id);
      state.price_history = state.price_history.filter((h) => !pids.includes(h.competitor_product_id));
      emit();
    },
    recrawl(id, isNew) {
      const c = state.competitors.find((x) => x.id === id);
      if (!c) return;
      c.status = 'Active';
      const task = this.addTask('Crawl Competitor', { target: c.display_name });
      // simulate crawl
      setTimeout(() => {
        c.last_crawled_at = new Date().toISOString();
        const prods = this.productsFor(id);
        let changes = 0;
        if (isNew) {
          // seed a couple products for a brand-new competitor
          const samples = [
            ['Signature Drip Brewer', 64, 'Brewers'],
            ['Stainless Pour-Over Stand', 48, 'Accessories'],
            ['House Blend 1kg', 28, 'Beans'],
          ];
          samples.forEach((s, i) => {
            const pid = uid('p');
            state.competitor_products.push({ id: pid, competitor_id: id, name: s[0], url: c.url + '/p/' + i, description: '', image_url: '', category: s[2], sku: 'NEW-' + i, last_updated_at: new Date().toISOString() });
            this._seedHistory(pid, s[1]);
          });
          changes = samples.length;
        } else if (prods.length) {
          // change a price on a random product
          const p = prods[Math.floor(Math.random() * prods.length)];
          const old = this.currentPrice(p.id);
          const next = Math.round((old * (1 + (Math.random() - 0.55) * 0.16)) * 100) / 100;
          state.price_history.push({ id: uid('ph'), competitor_product_id: p.id, price: next, currency: 'USD', timestamp: new Date().toISOString() });
          p.last_updated_at = new Date().toISOString();
          if (next !== old) {
            this.addAlert({ type: 'Price Change', competitor_id: id, competitor_product_id: p.id, competitor_name: c.display_name, product_name: p.name, old_price: old, new_price: next });
          }
          changes = 1;
        }
        this.finishTask(task.id, 'Completed', { details: { target: c.display_name, found: changes } });
      }, 2600 + Math.random() * 1200);
    },
    _seedHistory(pid, base) {
      genHistory(base, 6, 0.05).forEach((h) => state.price_history.push({ id: uid('ph'), competitor_product_id: pid, price: h.price, currency: 'USD', timestamp: h.t }));
    },

    scanTrends(keywords, platforms) {
      const task = this.addTask('Scan Trends', { platforms, keywords });
      setTimeout(() => {
        const pool = {
          TikTok: ['Whipped Dalgona Kit', 'Iced Matcha Whisk Set', 'Mini Milk Frother Wand'],
          Amazon: ['Reusable K-Cup 6-Pack', 'Insulated Carafe 1.2L', 'Digital Coffee Scale'],
          Reddit: ['Single-Dose Bellows', 'WDT Distribution Tool', 'Bottomless Portafilter'],
          Other: ['Ceramic V-Dripper', 'Bamboo Drip Stand'],
        };
        let added = 0;
        (platforms || []).forEach((plat) => {
          const names = pool[plat] || [];
          const n = 1 + Math.floor(Math.random() * 2);
          for (let i = 0; i < n && i < names.length; i++) {
            state.trends.unshift({
              id: uid('t'), keyword: (keywords && keywords[0]) || 'coffee', platform: plat,
              product_name: names[i], source_url: 'https://example.com/' + plat.toLowerCase(),
              trend_score: 55 + Math.floor(Math.random() * 44), virality_potential: 40 + Math.floor(Math.random() * 58),
              seasonality_score: 30 + Math.floor(Math.random() * 60), saved: false, discovered_at: new Date().toISOString(),
            });
            added++;
          }
        });
        this.finishTask(task.id, 'Completed', { details: { platforms, found: added } });
      }, 2800 + Math.random() * 1000);
    },
    toggleSaveTrend(id) { const t = state.trends.find((x) => x.id === id); if (t) { t.saved = !t.saved; emit(); } },

    saveBrand(asset) {
      const b = Object.assign({ id: uid('b'), generated_at: new Date().toISOString() }, asset);
      state.brand_assets.unshift(b);
      emit();
      return b;
    },

    saveSeo(content, status) {
      const existing = content.id && state.seo_content.find((s) => s.id === content.id);
      if (existing) {
        Object.assign(existing, content, { status, published_at: status === 'Published' ? new Date().toISOString() : existing.published_at });
      } else {
        state.seo_content.unshift(Object.assign({ id: uid('s'), created_at: new Date().toISOString(), published_at: status === 'Published' ? new Date().toISOString() : null }, content, { status }));
      }
      emit();
    },

    addStore(store_name, status) {
      const g = { id: uid('g'), store_name, brand_asset_id: null, status: status || 'Generating', generation_prompt: {}, generated_files: [], error_message: null, created_at: new Date().toISOString() };
      state.generated_stores.unshift(g);
      emit();
      return g;
    },
    updateStore(id, patch) { const g = state.generated_stores.find((x) => x.id === id); if (g) { Object.assign(g, patch); emit(); } },

    updateProfile(patch) { Object.assign(state.profile, patch); emit(); },

    // simulate a realtime drop/reconnect (used by topbar demo button)
    toggleConnection() {
      state.connected = !state.connected;
      emit();
      if (!state.connected) {
        setTimeout(() => { state.connected = true; emit(); window.MFToast && window.MFToast('success', 'Reconnected', 'Live updates restored. Missed events re-fetched.'); }, 3200);
      }
    },
  };

  function hostFromUrl(u) { try { return new URL(u).hostname.replace('www.', ''); } catch (e) { return u; } }
  function alertMsg(a) {
    if (a.type === 'Price Change') return a.competitor_name + ' · ' + a.product_name + ' → $' + a.new_price;
    return a.competitor_name + ' listed ' + a.product_name;
  }
  function taskDoneMsg(t) {
    if (t.task_type === 'Crawl Competitor') return (t.details.target || '') + ' · ' + (t.details.found || 0) + ' update(s) found';
    if (t.task_type === 'Scan Trends') return (t.details.found || 0) + ' new trend(s) discovered';
    return 'Finished successfully';
  }

  window.MFStore = Store;
})();
