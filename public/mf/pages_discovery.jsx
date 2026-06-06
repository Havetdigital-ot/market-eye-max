/* ============================================================
   Pages: Product Discovery (Trends) + Brand Builder
   ============================================================ */
(function () {
  const { useState } = window.React;
  const L = window.MFLib;
  const h = L.h, Icon = L.Icon;
  const PLATFORMS = ['TikTok', 'Amazon', 'Reddit', 'Other'];

  // ============================================================
  //  PRODUCT DISCOVERY  (/trends)
  // ============================================================
  function ProductDiscovery() {
    const store = L.useStore();
    const st = store.get();
    const [kw, setKw] = useState('');
    const [plats, setPlats] = useState(['TikTok', 'Amazon']);
    const [sortKey, setSortKey] = useState('trend_score');
    const [sortDir, setSortDir] = useState('desc');
    const [savedOnly, setSavedOnly] = useState(false);

    const scanning = store.activeTasks().some((t) => t.task_type === 'Scan Trends');

    function togglePlat(p) { setPlats((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]); }
    function scan() {
      if (!plats.length) { window.MFToast('error', 'Select a platform', 'Pick at least one platform to scan.'); return; }
      store.scanTrends(kw.split(',').map((s) => s.trim()).filter(Boolean), plats);
      window.MFToast('info', 'Scan started', 'Scanning ' + plats.join(', ') + '…');
    }
    function sort(k) { if (sortKey === k) setSortDir((d) => d === 'desc' ? 'asc' : 'desc'); else { setSortKey(k); setSortDir('desc'); } }

    let rows = savedOnly ? st.trends.filter((t) => t.saved) : st.trends;
    rows = [...rows].sort((a, b) => {
      const av = sortKey === 'discovered_at' ? new Date(a[sortKey]) : a[sortKey];
      const bv = sortKey === 'discovered_at' ? new Date(b[sortKey]) : b[sortKey];
      return sortDir === 'desc' ? bv - av : av - bv;
    });

    const platformsWithResults = new Set(st.trends.map((t) => t.platform));
    const emptyPlats = plats.filter((p) => !platformsWithResults.has(p));

    const th = (k, label, alignRight) => h('th', { className: 'sortable', style: alignRight ? { textAlign: 'right' } : null, onClick: () => sort(k) },
      label, ' ', sortKey === k && h('span', { className: 'arrow' }, sortDir === 'desc' ? '↓' : '↑'));

    return h('div', { className: 'content fade-in' },
      h('div', { className: 'page-head' },
        h('h2', null, 'Product Discovery'),
        h('p', null, 'Scan social and marketplace signals to surface trending products before they peak.')),

      // scan form
      h('div', { className: 'card card-pad', style: { marginBottom: 22 } },
        h('div', { className: 'flex gap-16', style: { alignItems: 'flex-end', flexWrap: 'wrap' } },
          h('div', { style: { flex: 1, minWidth: 260 } },
            h(L.Field, { label: 'Keywords', hint: 'Comma-separated — e.g. cold brew, matcha, frother' },
              h('input', { className: 'input', placeholder: 'Enter keywords to scan…', value: kw, onChange: (e) => setKw(e.target.value), onKeyDown: (e) => e.key === 'Enter' && scan() }))),
          h('div', null,
            h('label', { style: { fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 7 } }, 'Platforms'),
            h('div', { className: 'flex gap-8 wrap' }, PLATFORMS.map((p) => h('div', { key: p, className: 'pill' + (plats.includes(p) ? ' on' : ''), onClick: () => togglePlat(p) },
              plats.includes(p) && h(Icon, { name: 'check', size: 13 }), p)))),
          h('button', { className: 'btn btn-primary', disabled: scanning, onClick: scan, style: { height: 44 } }, h(Icon, { name: scanning ? 'refresh' : 'search', size: 16, className: scanning ? 'spin' : '' }), scanning ? 'Scanning…' : 'Scan trends'))),

      emptyPlats.length > 0 && h('div', { className: 'notice', style: { marginBottom: 18, background: 'var(--accent-softer)', borderColor: 'var(--accent-soft)' } },
        h('div', { className: 'notice-ico', style: { color: 'var(--accent-text)' } }, h(Icon, { name: 'search', size: 20 })),
        h('div', null,
          h('h4', { style: { color: 'var(--accent-text)' } }, 'No trends found for ' + emptyPlats.join(', ')),
          h('p', { style: { color: 'var(--ink-2)' } }, 'Try broadening your keywords or scanning a different platform.'))),

      // results
      h('div', { className: 'flex between center', style: { marginBottom: 14 } },
        h('div', { className: 'flex center gap-8' },
          h('span', { style: { fontSize: 14, fontWeight: 700 } }, rows.length + ' trends'),
          scanning && h('span', { className: 'badge badge-running' }, h(Icon, { name: 'refresh', size: 12, className: 'spin' }), 'Live')),
        h('div', { className: 'pill' + (savedOnly ? ' on' : ''), onClick: () => setSavedOnly((s) => !s) }, h(Icon, { name: 'check', size: 13 }), 'Saved only')),

      h('div', { className: 'card' },
        h('table', { className: 'table' },
          h('thead', null, h('tr', null,
            h('th', null, 'Product'),
            h('th', null, 'Platform'),
            th('trend_score', 'Trend'),
            th('virality_potential', 'Virality'),
            th('seasonality_score', 'Seasonality'),
            th('discovered_at', 'Found'),
            h('th', { style: { textAlign: 'right' } }, ''))),
          h('tbody', null, rows.length === 0
            ? h('tr', null, h('td', { colSpan: 7 }, h(L.Empty, { icon: 'trend', title: savedOnly ? 'No saved trends' : 'No trends found', desc: savedOnly ? 'Save trends to revisit them here.' : 'Run a scan to discover trending products.' })))
            : rows.map((t) => h('tr', { key: t.id },
              h('td', null, h('div', null, h('div', { className: 't-strong' }, t.product_name),
                h('a', { className: 't-link flex center gap-8', href: t.source_url, target: '_blank', style: { fontSize: 12, marginTop: 2 } }, 'Source', h(Icon, { name: 'ext', size: 11 })))),
              h('td', null, h(L.PlatformBadge, { platform: t.platform })),
              h('td', { style: { width: 150 } }, h(L.ScoreBar, { value: t.trend_score })),
              h('td', { style: { width: 150 } }, h(L.ScoreBar, { value: t.virality_potential, hue: 'v' })),
              h('td', { style: { width: 150 } }, h(L.ScoreBar, { value: t.seasonality_score, hue: 'a' })),
              h('td', { className: 't-muted mono', style: { fontSize: 12.5 } }, L.timeAgo(t.discovered_at)),
              h('td', null, h('div', { className: 'row-actions' },
                h('button', { className: 'btn btn-sm ' + (t.saved ? 'btn-soft' : 'btn-ghost'), onClick: () => store.toggleSaveTrend(t.id) },
                  h(Icon, { name: t.saved ? 'check' : 'plus', size: 14 }), t.saved ? 'Saved' : 'Save')))))))));
  }

  // ============================================================
  //  BRAND BUILDER  (/brand)
  // ============================================================
  const VOICES = ['Warm, knowledgeable, and unpretentious — like a trusted friend who happens to be a barista.', 'Bold, energetic, and a little irreverent — for a brand that doesn’t take itself too seriously.', 'Refined and editorial, with quiet confidence — speaking to discerning, design-led buyers.'];
  const PALETTES = [
    ['#1F2A24', '#3E7C5A', '#A8C3A0', '#E9F0E6', '#F6F4EE'],
    ['#2A1E16', '#C8794A', '#E8DCC8', '#7A8B6F', '#F4EFE6'],
    ['#16202E', '#3A6EA5', '#9FC3E8', '#E6EEF6', '#F4F7FA'],
  ];
  const PERSONAS = [
    { name: 'The Weekend Barista', age: '28–42', traits: ['Design-conscious', 'Quality over quantity', 'Enjoys ritual'], summary: 'Urban professionals who treat their morning brew as a craft. They research before buying and pay for durability and aesthetics.' },
    { name: 'The Aspiring Connoisseur', age: '24–35', traits: ['Curious', 'Budget-aware', 'Social-first'], summary: 'Early-career enthusiasts upgrading from drip to specialty coffee. They learn from TikTok and value approachable guidance.' },
    { name: 'The Gifting Host', age: '32–50', traits: ['Generous', 'Brand-loyal', 'Convenience-led'], summary: 'Buyers shopping for thoughtful, premium gifts. They respond to beautiful packaging and curated bundles.' },
  ];

  function genBrand(desc, seed) {
    const i = seed % 3;
    const names = ['Driftwood Coffee Co.', 'Ember & Oak', 'Slow Pour Society'];
    return {
      source_description: desc,
      brand_name: names[i],
      customer_persona: PERSONAS[i],
      brand_voice: VOICES[i],
      color_palette: PALETTES[i],
      font_choices: { primary: ['Fraunces', 'Canela', 'Spectral'][i], secondary: ['Hanken Grotesk', 'Inter', 'Söhne'][i] },
    };
  }

  function BrandBuilder() {
    const store = L.useStore();
    const st = store.get();
    const [desc, setDesc] = useState('');
    const [phase, setPhase] = useState('idle'); // idle | generating | review
    const [draft, setDraft] = useState(null);
    const [refine, setRefine] = useState('');
    const [seed, setSeed] = useState(0);
    const [viewing, setViewing] = useState(null);

    function generate(refineText) {
      if (!desc.trim()) { window.MFToast('error', 'Add a description', 'Describe your product or niche first.'); return; }
      setPhase('generating');
      const task = store.addTask('Generate Brand', { topic: desc.slice(0, 40) });
      const s = seed + 1; setSeed(s);
      setTimeout(() => {
        setDraft(genBrand(desc, s));
        setPhase('review');
        store.finishTask(task.id, 'Completed', { details: { brand: genBrand(desc, s).brand_name } });
        setRefine('');
      }, 2400);
    }
    function accept() {
      const b = store.saveBrand(draft);
      setPhase('idle'); setDraft(null); setDesc('');
      window.MFToast('success', 'Brand saved', b.brand_name + ' added to your brand library');
    }

    return h('div', { className: 'content fade-in' },
      h('div', { className: 'page-head' },
        h('h2', null, 'Brand Builder'),
        h('p', null, 'Generate a complete brand identity — name, persona, voice, palette, and type — from a single description.')),

      h('div', { className: 'grid', style: { gridTemplateColumns: '1fr 1.3fr', alignItems: 'start' } },
        // left: input + history
        h('div', { className: 'grid', style: { gap: 18 } },
          h('div', { className: 'card card-pad' },
            h(L.Field, { label: 'Product / niche description', hint: 'The more specific, the better the result.' },
              h('textarea', { className: 'textarea', style: { minHeight: 120 }, placeholder: 'e.g. Premium home espresso gear for design-conscious enthusiasts who care about ritual and craft…', value: desc, onChange: (e) => setDesc(e.target.value) })),
            h('button', { className: 'btn btn-primary btn-block', style: { marginTop: 14 }, disabled: phase === 'generating', onClick: () => generate() },
              h(Icon, { name: phase === 'generating' ? 'refresh' : 'brand', size: 16, className: phase === 'generating' ? 'spin' : '' }), phase === 'generating' ? 'Generating…' : 'Generate brand')),

          h('div', { className: 'card' },
            h('div', { className: 'card-head' }, h('h3', null, 'Brand library'), h('span', { className: 'sub', style: { marginLeft: 'auto' } }, st.brand_assets.length + ' saved')),
            st.brand_assets.length === 0 ? h(L.Empty, { icon: 'brand', title: 'No brands yet' }) :
              st.brand_assets.map((b) => h('div', { key: b.id, onClick: () => setViewing(b), style: { padding: '14px 20px', borderBottom: '1px solid var(--line)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 } },
                h('div', { className: 'flex', style: { gap: 0 } }, b.color_palette.slice(0, 4).map((c, i) => h('div', { key: i, style: { width: 18, height: 18, borderRadius: 5, background: c, marginLeft: i ? -5 : 0, border: '1.5px solid #fff' } }))),
                h('div', { style: { flex: 1 } }, h('div', { className: 't-strong' }, b.brand_name), h('div', { className: 't-muted', style: { fontSize: 12.5 } }, L.timeAgo(b.generated_at))),
                h(Icon, { name: 'chevR', size: 15, style: { color: 'var(--faint)' } })))))
        ,
        // right: result / review
        h('div', { className: 'card', style: { minHeight: 420 } },
          phase === 'generating' ? h('div', { className: 'gen-loader' },
            h('div', { className: 'ring' }), h('h4', null, 'Designing your brand…'),
            h('p', null, 'Synthesizing name, persona, voice and palette'),
            h(GenSteps, { steps: ['Analyzing niche', 'Naming the brand', 'Building persona', 'Composing palette'] }))
          : phase === 'review' && draft ? h(BrandReview, { draft, refine, setRefine, onRegen: () => generate(refine), onAccept: accept })
          : h('div', { className: 'gen-loader', style: { color: 'var(--muted)' } },
            h('div', { className: 'empty-ico', style: { width: 60, height: 60 } }, h(Icon, { name: 'brand', size: 28 })),
            h('h4', { style: { color: 'var(--ink)' } }, 'Your brand will appear here'),
            h('p', null, 'Describe your product and hit Generate to see a full identity you can refine and save.')))),

      viewing && h(BrandView, { brand: viewing, onClose: () => setViewing(null) }));
  }

  function GenSteps({ steps }) {
    const [done, setDone] = useState(0);
    window.React.useEffect(() => {
      const timers = steps.map((_, i) => setTimeout(() => setDone(i + 1), (i + 1) * 550));
      return () => timers.forEach(clearTimeout);
    }, []);
    return h('div', { className: 'steps' }, steps.map((s, i) => h('div', { key: i, className: 'step' + (i < done ? ' done' : i === done ? ' active' : '') },
      h('div', { className: 'sdot' }, i < done && h(Icon, { name: 'check', size: 11 })), s)));
  }

  function BrandReview({ draft, refine, setRefine, onRegen, onAccept }) {
    return h('div', null,
      h('div', { className: 'card-head' }, h('h3', null, 'Review generated brand'), h('span', { className: 'badge badge-blue', style: { marginLeft: 'auto' } }, h(Icon, { name: 'sparkle', size: 12 }), 'AI draft')),
      h('div', { className: 'card-pad', style: { display: 'flex', flexDirection: 'column', gap: 20 } },
        h(BrandBody, { b: draft }),
        h('div', { style: { borderTop: '1px solid var(--line)', paddingTop: 16 } },
          h(L.Field, { label: 'Refine (optional)', hint: 'Tell the model what to change, then regenerate.' },
            h('input', { className: 'input', placeholder: 'e.g. make it more playful, use cooler colors…', value: refine, onChange: (e) => setRefine(e.target.value) })),
          h('div', { className: 'flex gap-8', style: { marginTop: 14 } },
            h('button', { className: 'btn btn-ghost', onClick: onRegen }, h(Icon, { name: 'refresh', size: 16 }), 'Refine'),
            h('button', { className: 'btn btn-primary', style: { flex: 1 }, onClick: onAccept }, h(Icon, { name: 'check', size: 16 }), 'Accept & save')))));
  }

  function BrandBody({ b }) {
    return h(window.React.Fragment, null,
      h('div', null,
        h('div', { style: { fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 } }, 'Brand name'),
        h('div', { style: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' } }, b.brand_name)),
      h('div', null,
        h('div', { style: { fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 } }, 'Color palette'),
        h('div', { className: 'swatches' }, b.color_palette.map((c, i) => h('div', { key: i, className: 'swatch', style: { background: c } }, h('span', null, c))))),
      h('div', { className: 'grid cols-2' },
        h('div', null,
          h('div', { style: { fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 } }, 'Typography'),
          h('div', { className: 'card-pad', style: { padding: 14, background: 'var(--surface-2)', borderRadius: 10 } },
            h('div', { style: { fontSize: 13, color: 'var(--muted)' } }, 'Primary'),
            h('div', { style: { fontSize: 19, fontWeight: 700 } }, b.font_choices.primary),
            h('div', { style: { fontSize: 13, color: 'var(--muted)', marginTop: 8 } }, 'Secondary'),
            h('div', { style: { fontSize: 16, fontWeight: 500 } }, b.font_choices.secondary))),
        h('div', null,
          h('div', { style: { fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 } }, 'Customer persona'),
          h('div', { className: 'card-pad', style: { padding: 14, background: 'var(--surface-2)', borderRadius: 10 } },
            h('div', { style: { fontWeight: 700, fontSize: 15 } }, b.customer_persona.name),
            h('div', { style: { fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 } }, 'Age ' + b.customer_persona.age),
            h('div', { className: 'flex wrap gap-8' }, b.customer_persona.traits.map((t, i) => h('span', { key: i, className: 'tag', style: { fontFamily: 'var(--sans)' } }, t)))))),
      h('div', null,
        h('div', { style: { fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 } }, 'Brand voice'),
        h('p', { style: { margin: 0, fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-2)' } }, b.brand_voice)),
      h('div', null,
        h('div', { style: { fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 } }, 'Persona summary'),
        h('p', { style: { margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)' } }, b.customer_persona.summary)));
  }

  function BrandView({ brand, onClose }) {
    return h(L.Modal, { title: brand.brand_name, desc: 'Saved ' + L.dateFmt(brand.generated_at), onClose, wide: true,
      footer: h('button', { className: 'btn btn-soft', onClick: onClose }, 'Close') },
      h(BrandBody, { b: brand }));
  }

  window.MFPages = Object.assign(window.MFPages || {}, { ProductDiscovery, BrandBuilder });
})();
