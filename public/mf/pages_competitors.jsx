/* ============================================================
   Pages: Competitor Monitor + Competitor Detail
   ============================================================ */
(function () {
  const { useState } = window.React;
  const L = window.MFLib;
  const h = L.h, Icon = L.Icon;

  // ============================================================
  //  COMPETITOR MONITOR  (/competitors)
  // ============================================================
  function CompetitorMonitor({ onNav }) {
    const store = L.useStore();
    const st = store.get();
    const [adding, setAdding] = useState(false);
    const [confirm, setConfirm] = useState(null);

    return h('div', { className: 'content fade-in' },
      h('div', { className: 'page-row' },
        h('div', { className: 'page-head', style: { marginBottom: 0 } },
          h('h2', null, 'Competitor Monitor'),
          h('p', null, 'Track competitor catalogs and prices. Crawls run on a schedule; trigger a recrawl anytime.')),
        h('button', { className: 'btn btn-primary', onClick: () => setAdding(true) }, h(Icon, { name: 'plus', size: 16 }), 'Add competitor')),

      h('div', { className: 'card' },
        h('table', { className: 'table' },
          h('thead', null, h('tr', null,
            h('th', null, 'Competitor'), h('th', null, 'Status'), h('th', null, 'Products'),
            h('th', null, 'Last crawled'), h('th', { style: { textAlign: 'right' } }, 'Actions'))),
          h('tbody', null, st.competitors.map((c) => {
            const prods = store.productsFor(c.id).length;
            const crawling = store.activeTasks().some((t) => t.task_type === 'Crawl Competitor' && t.details.target === c.display_name);
            return h('tr', { key: c.id, className: 'clickable', onClick: () => onNav('competitors/' + c.id) },
              h('td', null, h('div', { className: 'flex center gap-12' },
                h('div', { className: 'avatar', style: { borderRadius: 9, background: faviconColor(c.display_name), fontSize: 13 } }, c.display_name[0]),
                h('div', null,
                  h('div', { className: 't-strong' }, c.display_name),
                  h('div', { className: 't-muted', style: { fontSize: 12.5 } }, hostOf(c.url))))),
              h('td', null, crawling ? h('span', { className: 'badge badge-running' }, h(Icon, { name: 'refresh', size: 12, className: 'spin' }), 'Crawling…') : h(L.StatusBadge, { status: c.status })),
              h('td', { className: 'mono', style: { fontWeight: 600 } }, prods),
              h('td', { className: 't-muted mono', style: { fontSize: 12.5 } }, L.timeAgo(c.last_crawled_at)),
              h('td', { onClick: (e) => e.stopPropagation() }, h('div', { className: 'row-actions' },
                c.status === 'Active' && h('button', { className: 'act', title: 'Recrawl', disabled: crawling, onClick: () => store.recrawl(c.id) }, h(Icon, { name: 'refresh', size: 15, className: crawling ? 'spin' : '' })),
                c.status === 'Paused'
                  ? h('button', { className: 'act', title: 'Resume', onClick: () => store.setStatus(c.id, 'Active') }, h(Icon, { name: 'play', size: 15 }))
                  : h('button', { className: 'act', title: 'Pause', onClick: () => store.setStatus(c.id, 'Paused') }, h(Icon, { name: 'pause', size: 15 })),
                h('button', { className: 'act', title: 'View details', onClick: () => onNav('competitors/' + c.id) }, h(Icon, { name: 'eye', size: 15 })),
                h('button', { className: 'act danger', title: 'Delete', onClick: () => setConfirm(c) }, h(Icon, { name: 'trash', size: 15 })))));
          })))),

      adding && h(AddCompetitor, { onClose: () => setAdding(false), onAdded: (c) => { setAdding(false); window.MFToast('success', 'Competitor added', c.display_name + ' — first crawl started'); } }),
      confirm && h(L.Modal, {
        title: 'Delete ' + confirm.display_name + '?',
        desc: 'This permanently removes the competitor along with all of its tracked products and price history.',
        onClose: () => setConfirm(null),
        footer: h(window.React.Fragment, null,
          h('button', { className: 'btn btn-ghost', onClick: () => setConfirm(null) }, 'Cancel'),
          h('button', { className: 'btn btn-primary', style: { background: 'var(--red)' }, onClick: () => { store.deleteCompetitor(confirm.id); setConfirm(null); window.MFToast('success', 'Deleted', confirm.display_name + ' removed'); } }, 'Delete competitor')),
      }));
  }

  function AddCompetitor({ onClose, onAdded }) {
    const store = L.useStore();
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [err, setErr] = useState('');
    function submit() {
      const v = url.trim();
      if (!/^https?:\/\/.+\..+/.test(v)) { setErr('Enter a valid http(s):// URL.'); return; }
      const c = store.addCompetitor(name.trim(), v);
      onAdded(c);
    }
    return h(L.Modal, {
      title: 'Add competitor', desc: 'We’ll crawl this site and start tracking its products and prices.', onClose,
      footer: h(window.React.Fragment, null,
        h('button', { className: 'btn btn-ghost', onClick: onClose }, 'Cancel'),
        h('button', { className: 'btn btn-primary', onClick: submit }, h(Icon, { name: 'radar', size: 16 }), 'Add & crawl')),
    },
      h(L.Field, { label: 'Store URL', error: err, hint: 'e.g. https://competitor.com' },
        h('input', { className: 'input' + (err ? ' error' : ''), placeholder: 'https://', value: url, autoFocus: true, onChange: (e) => { setUrl(e.target.value); setErr(''); }, onKeyDown: (e) => e.key === 'Enter' && submit() })),
      h(L.Field, { label: 'Display name', hint: 'Optional — defaults to the domain.' },
        h('input', { className: 'input', placeholder: 'Competitor name', value: name, onChange: (e) => setName(e.target.value) })));
  }

  // ============================================================
  //  COMPETITOR DETAIL  (/competitors/:id)
  // ============================================================
  function CompetitorDetail({ id, onNav }) {
    const store = L.useStore();
    const st = store.get();
    const c = st.competitors.find((x) => x.id === id);
    const prods = store.productsFor(id);
    const [sel, setSel] = useState(prods[0] ? prods[0].id : null);
    if (!c) return h('div', { className: 'content' }, h(L.Empty, { icon: 'radar', title: 'Competitor not found', action: h('button', { className: 'btn btn-soft', onClick: () => onNav('competitors') }, 'Back to monitor') }));

    const selProd = prods.find((p) => p.id === sel) || prods[0];
    const history = selProd ? store.historyFor(selProd.id) : [];
    const crawling = store.activeTasks().some((t) => t.task_type === 'Crawl Competitor' && t.details.target === c.display_name);
    const change = history.length > 1 ? history[history.length - 1].price - history[0].price : 0;
    const pct = history.length > 1 ? (change / history[0].price) * 100 : 0;

    return h('div', { className: 'content fade-in' },
      h('button', { className: 'btn btn-ghost btn-sm', style: { marginBottom: 16 }, onClick: () => onNav('competitors') }, h(Icon, { name: 'chevR', size: 14, style: { transform: 'rotate(180deg)' } }), 'Competitor Monitor'),
      h('div', { className: 'page-row' },
        h('div', { className: 'flex center gap-16' },
          h('div', { className: 'avatar', style: { width: 52, height: 52, borderRadius: 13, background: faviconColor(c.display_name), fontSize: 22 } }, c.display_name[0]),
          h('div', null,
            h('div', { className: 'flex center gap-12' }, h('h2', { style: { margin: 0, fontSize: 24 } }, c.display_name), crawling ? h('span', { className: 'badge badge-running' }, h(Icon, { name: 'refresh', size: 12, className: 'spin' }), 'Crawling…') : h(L.StatusBadge, { status: c.status })),
            h('a', { className: 'flex center gap-8', href: c.url, target: '_blank', style: { color: 'var(--muted)', fontSize: 13.5, marginTop: 4 } }, hostOf(c.url), h(Icon, { name: 'ext', size: 13 })))),
        h('div', { className: 'flex center gap-8' },
          c.status === 'Paused'
            ? h('button', { className: 'btn btn-ghost', onClick: () => store.setStatus(c.id, 'Active') }, h(Icon, { name: 'play', size: 16 }), 'Resume')
            : h('button', { className: 'btn btn-ghost', onClick: () => store.setStatus(c.id, 'Paused') }, h(Icon, { name: 'pause', size: 16 }), 'Pause'),
          h('button', { className: 'btn btn-primary', disabled: crawling || c.status === 'Paused', onClick: () => store.recrawl(c.id) }, h(Icon, { name: 'refresh', size: 16, className: crawling ? 'spin' : '' }), crawling ? 'Crawling…' : 'Recrawl'))),

      prods.length === 0 ? h('div', { className: 'card card-pad' }, h(L.Empty, { icon: 'pkg', title: 'No products tracked yet', desc: 'Run a crawl to discover this competitor’s catalog.' })) :
      h('div', { className: 'grid', style: { gridTemplateColumns: '1.4fr 1fr', alignItems: 'start' } },
        // price chart
        h('div', { className: 'card' },
          h('div', { className: 'card-head' },
            h('div', null,
              h('h3', null, selProd.name),
              h('div', { className: 'sub' }, 'Price history · ', selProd.category)),
            h('div', { style: { marginLeft: 'auto', textAlign: 'right' } },
              h('div', { className: 'mono', style: { fontSize: 22, fontWeight: 700 } }, L.money(store.currentPrice(selProd.id))),
              history.length > 1 && h('div', { className: 'mono', style: { fontSize: 12.5, fontWeight: 600, color: change > 0 ? 'var(--red)' : change < 0 ? 'var(--green)' : 'var(--muted)' } },
                (change >= 0 ? '▲ ' : '▼ ') + Math.abs(pct).toFixed(1) + '% all-time'))),
          h('div', { className: 'card-pad' }, h(L.PriceChart, { data: history, height: 260 })),
          h('div', { className: 'kv', style: { padding: '0 22px 22px' } },
            h('div', { className: 'kv-row' }, h('span', { className: 'k' }, 'SKU'), h('span', { className: 'v mono' }, selProd.sku)),
            h('div', { className: 'kv-row' }, h('span', { className: 'k' }, 'Last updated'), h('span', { className: 'v' }, L.timeAgo(selProd.last_updated_at))),
            selProd.description && h('div', { className: 'kv-row', style: { alignItems: 'flex-start' } }, h('span', { className: 'k' }, 'Description'), h('span', { className: 'v', style: { fontWeight: 400, color: 'var(--ink-2)' } }, selProd.description)))),

        // product list
        h('div', { className: 'card' },
          h('div', { className: 'card-head' }, h('h3', null, 'Products'), h('span', { className: 'sub', style: { marginLeft: 'auto' } }, prods.length + ' tracked')),
          h('div', { style: { maxHeight: 520, overflowY: 'auto' } }, prods.map((p) => h('div', {
            key: p.id, onClick: () => setSel(p.id),
            style: { padding: '14px 20px', borderBottom: '1px solid var(--line)', cursor: 'pointer', background: p.id === sel ? 'var(--accent-softer)' : 'transparent', display: 'flex', alignItems: 'center', gap: 12, transition: 'background .1s' },
          },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { className: 't-strong', style: { fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, p.name),
              h('div', { className: 'flex center gap-8', style: { marginTop: 3 } }, h('span', { className: 'tag', style: { height: 20, fontSize: 11 } }, p.category))),
            h('div', { className: 'mono', style: { fontWeight: 700, fontSize: 14 } }, L.money0(store.currentPrice(p.id))),
            p.id === sel && h(Icon, { name: 'chevR', size: 15, style: { color: 'var(--accent)' } }))))))
    );
  }

  function hostOf(u) { try { return new URL(u).hostname.replace('www.', ''); } catch (e) { return u; } }
  function faviconColor(name) {
    const hues = [262, 200, 300, 155, 25, 75];
    const hue = hues[name.charCodeAt(0) % hues.length];
    return 'linear-gradient(150deg, oklch(0.6 0.13 ' + hue + '), oklch(0.52 0.15 ' + (hue + 30) + '))';
  }

  window.MFPages = Object.assign(window.MFPages || {}, { CompetitorMonitor, CompetitorDetail });
})();
