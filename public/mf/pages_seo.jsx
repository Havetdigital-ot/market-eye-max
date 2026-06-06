/* ============================================================
   Page: SEO Content Generator (/seo)
   ============================================================ */
(function () {
  const { useState } = window.React;
  const L = window.MFLib;
  const h = L.h, Icon = L.Icon;
  const TYPES = ['Blog Post', 'Product Description', 'FAQ'];

  function genContent(type, topic, keywords) {
    const kw = (keywords && keywords.length) ? keywords : ['coffee', 'home brewing'];
    if (type === 'Product Description') {
      return {
        title: topic + ' — Crafted for the Everyday Ritual',
        body: '<p>Meet the <strong>' + topic + '</strong> — engineered for people who believe the details matter. From the first pour to the last sip, every element is tuned for consistency, durability, and quiet good looks on your counter.</p>'
          + '<h3>Why you\'ll love it</h3><ul><li>Precision-built for repeatable results, cup after cup</li><li>Premium materials that age beautifully</li><li>Thoughtful design that fits real kitchens</li></ul>'
          + '<p>Whether you\'re dialing in your morning espresso or slowing down for a weekend pour-over, the ' + topic + ' is built to keep up with your craft.</p>',
      };
    }
    if (type === 'FAQ') {
      return {
        title: topic.replace(/questions?$/i, '').trim() + ' — Frequently Asked Questions',
        body: '<h3>What ratio should I use?</h3><p>Start with a 1:8 coffee-to-water ratio and adjust to taste. Stronger? Go 1:6. Lighter? Try 1:10.</p>'
          + '<h3>How long does it take?</h3><p>Plan for 12–18 hours of steep time in the fridge for a smooth, low-acidity result.</p>'
          + '<h3>How should I store it?</h3><p>Keep the concentrate sealed in the fridge and enjoy within 7–10 days for peak flavor.</p>'
          + '<h3>Can I make it hot?</h3><p>Absolutely — dilute the concentrate with hot water for a clean, mellow hot cup.</p>',
      };
    }
    return {
      title: topic.replace(/^how to /i, '').replace(/\b\w/, (c) => c.toUpperCase()) + ': A Practical Guide',
      body: '<p>If you\'ve ever wondered how to get café-quality results without the café, you\'re in the right place. This guide walks through everything you need to know about <strong>' + topic.toLowerCase() + '</strong>.</p>'
        + '<h2>Start with the fundamentals</h2><p>Great coffee is a system: fresh beans, the right grind, clean water, and consistent technique. Nail these and everything downstream gets easier.</p>'
        + '<h2>Dial it in step by step</h2><ul><li>Weigh your dose and water for repeatability</li><li>Adjust grind size before anything else</li><li>Taste, note, and change one variable at a time</li></ul>'
        + '<h2>Keep improving</h2><p>The best home baristas treat every brew as an experiment. Keep a simple log and you\'ll see steady gains within a week.</p>'
        + '<p><em>Targeting keywords: ' + kw.join(', ') + '.</em></p>',
    };
  }

  function SeoGenerator() {
    const store = L.useStore();
    const st = store.get();
    const [type, setType] = useState('Blog Post');
    const [topic, setTopic] = useState('');
    const [kwInput, setKwInput] = useState('');
    const [phase, setPhase] = useState('idle'); // idle | generating | edit
    const [draft, setDraft] = useState(null); // {id?, type, topic, title, body, keywords}
    const [pending, setPending] = useState(null); // regenerated version awaiting accept
    const [topicErr, setTopicErr] = useState('');

    function generate() {
      if (!topic.trim()) { setTopicErr('A topic or product name is required.'); return; }
      setPhase('generating');
      const keywords = kwInput.split(',').map((s) => s.trim()).filter(Boolean);
      const task = store.addTask('Generate SEO', { topic });
      setTimeout(() => {
        const c = genContent(type, topic, keywords);
        setDraft({ type, topic, title: c.title, body: c.body, keywords });
        setPhase('edit');
        store.finishTask(task.id, 'Completed', { details: { topic } });
      }, 2200);
    }
    function regenerate() {
      const task = store.addTask('Generate SEO', { topic: draft.topic });
      setTimeout(() => {
        const c = genContent(draft.type, draft.topic, draft.keywords);
        setPending({ title: c.title, body: c.body });
        store.finishTask(task.id, 'Completed', { details: { topic: draft.topic } });
        window.MFToast('info', 'Regenerated', 'Review the new version, then keep or discard it.');
      }, 1800);
    }
    function save(status) {
      store.saveSeo(draft, status);
      window.MFToast('success', status === 'Published' ? 'Published' : 'Draft saved', draft.title);
      setPhase('idle'); setDraft(null); setTopic(''); setKwInput('');
    }
    function openExisting(s) {
      setDraft({ id: s.id, type: s.type, topic: s.topic, title: s.title, body: s.body || genContent(s.type, s.topic, s.keywords).body, keywords: s.keywords });
      setType(s.type); setTopic(s.topic); setPhase('edit'); setPending(null);
    }

    return h('div', { className: 'content fade-in' },
      h('div', { className: 'page-head' },
        h('h2', null, 'SEO Content'),
        h('p', null, 'Generate on-brand blog posts, product copy, and FAQs — then edit, save, and publish.')),

      h('div', { className: 'grid', style: { gridTemplateColumns: '340px 1fr', alignItems: 'start' } },
        // left column: form + list
        h('div', { className: 'grid', style: { gap: 18 } },
          h('div', { className: 'card card-pad', style: { display: 'flex', flexDirection: 'column', gap: 16 } },
            h(L.Field, { label: 'Content type' },
              h('select', { className: 'select', value: type, onChange: (e) => setType(e.target.value) }, TYPES.map((t) => h('option', { key: t, value: t }, t)))),
            h(L.Field, { label: 'Topic or product name', error: topicErr },
              h('input', { className: 'input' + (topicErr ? ' error' : ''), placeholder: 'e.g. How to dial in espresso', value: topic, onChange: (e) => { setTopic(e.target.value); setTopicErr(''); } })),
            h(L.Field, { label: 'Target keywords', hint: 'Optional, comma-separated' },
              h('input', { className: 'input', placeholder: 'espresso, grind size…', value: kwInput, onChange: (e) => setKwInput(e.target.value) })),
            h('button', { className: 'btn btn-primary btn-block', disabled: phase === 'generating', onClick: generate },
              h(Icon, { name: phase === 'generating' ? 'refresh' : 'seo', size: 16, className: phase === 'generating' ? 'spin' : '' }), phase === 'generating' ? 'Generating…' : 'Generate content')),

          h('div', { className: 'card' },
            h('div', { className: 'card-head' }, h('h3', null, 'Your content'), h('span', { className: 'sub', style: { marginLeft: 'auto' } }, st.seo_content.length)),
            st.seo_content.length === 0 ? h(L.Empty, { icon: 'seo', title: 'Nothing yet' }) :
              st.seo_content.map((s) => h('div', { key: s.id, onClick: () => openExisting(s), style: { padding: '13px 18px', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: (draft && draft.id === s.id) ? 'var(--accent-softer)' : 'transparent' } },
                h('div', { className: 'flex between center', style: { marginBottom: 5 } }, h('span', { className: 'tag', style: { fontFamily: 'var(--sans)' } }, s.type), h(L.StatusBadge, { status: s.status })),
                h('div', { className: 't-strong', style: { fontSize: 13.5, lineHeight: 1.35 } }, s.title),
                h('div', { className: 't-muted mono', style: { fontSize: 11.5, marginTop: 5 } }, L.timeAgo(s.created_at)))))),

        // right column: editor
        h('div', { className: 'card', style: { minHeight: 480 } },
          phase === 'generating' ? h('div', { className: 'gen-loader' }, h('div', { className: 'ring' }), h('h4', null, 'Writing your ' + type.toLowerCase() + '…'), h('p', null, 'Optimizing for your target keywords'))
          : phase === 'edit' && draft ? h(SeoEditor, { draft, setDraft, pending, setPending, onRegen: regenerate, onSave: save, onAcceptPending: () => { setDraft((d) => ({ ...d, title: pending.title, body: pending.body })); setPending(null); window.MFToast('success', 'Updated', 'Kept the regenerated version'); } })
          : h('div', { className: 'gen-loader', style: { color: 'var(--muted)' } },
            h('div', { className: 'empty-ico', style: { width: 60, height: 60 } }, h(Icon, { name: 'seo', size: 28 })),
            h('h4', { style: { color: 'var(--ink)' } }, 'Draft preview'),
            h('p', null, 'Generate content or open an existing item to edit it here.')))));
  }

  function SeoEditor({ draft, setDraft, pending, setPending, onRegen, onSave, onAcceptPending }) {
    const [tab, setTab] = useState('edit');
    function addKw(e) {
      if (e.key === 'Enter' && e.target.value.trim()) {
        setDraft((d) => ({ ...d, keywords: [...d.keywords, e.target.value.trim()] }));
        e.target.value = '';
      }
    }
    return h('div', null,
      h('div', { className: 'card-head' },
        h('span', { className: 'tag', style: { fontFamily: 'var(--sans)' } }, draft.type),
        h('div', { className: 'flex center gap-8', style: { marginLeft: 'auto' } },
          h('button', { className: 'btn btn-ghost btn-sm', onClick: onRegen }, h(Icon, { name: 'refresh', size: 14 }), 'Regenerate'),
          h('button', { className: 'btn btn-ghost btn-sm', onClick: () => onSave('Draft') }, 'Save draft'),
          h('button', { className: 'btn btn-primary btn-sm', onClick: () => onSave('Published') }, h(Icon, { name: 'rocket', size: 14 }), 'Publish'))),

      pending && h('div', { className: 'notice', style: { margin: '18px 22px 0', background: 'var(--violet-soft)', borderColor: 'oklch(0.88 0.05 300)' } },
        h('div', { className: 'notice-ico', style: { color: 'oklch(0.5 0.15 300)' } }, h(Icon, { name: 'sparkle', size: 20 })),
        h('div', { style: { flex: 1 } },
          h('h4', { style: { color: 'oklch(0.45 0.15 300)' } }, 'New version ready'),
          h('p', { style: { color: 'var(--ink-2)' } }, 'A regenerated draft is available. Your current edits are preserved until you choose.')),
        h('div', { className: 'flex gap-8' },
          h('button', { className: 'btn btn-ghost btn-sm', onClick: () => setPending(null) }, 'Discard'),
          h('button', { className: 'btn btn-primary btn-sm', onClick: onAcceptPending }, 'Keep new'))),

      h('div', { className: 'card-pad' },
        h('div', { className: 'tabs' },
          h('div', { className: 'tab' + (tab === 'edit' ? ' on' : ''), onClick: () => setTab('edit') }, 'Edit'),
          h('div', { className: 'tab' + (tab === 'preview' ? ' on' : ''), onClick: () => setTab('preview') }, 'Preview')),
        tab === 'edit' ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
          h(L.Field, { label: 'Title' }, h('input', { className: 'input', value: draft.title, onChange: (e) => setDraft((d) => ({ ...d, title: e.target.value })) })),
          h(L.Field, { label: 'Body (HTML)' }, h('textarea', { className: 'textarea', style: { minHeight: 280, fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.6 }, value: draft.body, onChange: (e) => setDraft((d) => ({ ...d, body: e.target.value })) })),
          h(L.Field, { label: 'Keywords', hint: 'Press Enter to add' },
            h('div', null,
              h('div', { className: 'flex wrap gap-8', style: { marginBottom: draft.keywords.length ? 8 : 0 } }, draft.keywords.map((k, i) => h('span', { key: i, className: 'tag', style: { fontFamily: 'var(--sans)', gap: 6 } }, k,
                h('span', { style: { cursor: 'pointer', color: 'var(--faint)' }, onClick: () => setDraft((d) => ({ ...d, keywords: d.keywords.filter((_, j) => j !== i) })) }, '×')))),
              h('input', { className: 'input', placeholder: 'Add keyword…', onKeyDown: addKw }))))
          : h('article', null,
            h('h1', { style: { fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.2 } }, draft.title),
            h('div', { className: 'prose', dangerouslySetInnerHTML: { __html: draft.body } }),
            draft.keywords.length > 0 && h('div', { className: 'flex wrap gap-8', style: { marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' } }, draft.keywords.map((k, i) => h('span', { key: i, className: 'tag' }, '#', k))))));
  }

  window.MFPages = Object.assign(window.MFPages || {}, { SeoGenerator });
})();
