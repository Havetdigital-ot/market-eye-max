/* ============================================================
   Pages: Dashboard, Task Log
   ============================================================ */
(function () {
  const { useState } = window.React;
  const L = window.MFLib;
  const h = L.h, Icon = L.Icon;

  // ============================================================
  //  DASHBOARD
  // ============================================================
  function Dashboard({ onNav }) {
    const store = L.useStore();
    const st = store.get();
    const activeComp = st.competitors.filter((c) => c.status === 'Active').length;
    const activeTasks = store.activeTasks().length;
    const unread = store.unreadAlerts().length;
    const savedTrends = st.trends.filter((t) => t.saved).length;
    const recentAlerts = st.alerts.slice(0, 5);
    const topTrends = [...st.trends].sort((a, b) => b.trend_score - a.trend_score).slice(0, 3);
    const lastStore = st.generated_stores[0];
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    const stats = [
      { label: 'Active competitors', val: activeComp, icon: 'radar', bg: 'var(--accent-soft)', fg: 'var(--accent-text)', delta: '+1', up: true, go: 'competitors' },
      { label: 'Running tasks', val: activeTasks, icon: 'tasks', bg: 'var(--violet-soft)', fg: 'oklch(0.5 0.15 300)', go: 'tasks' },
      { label: 'Unread alerts', val: unread, icon: 'bell', bg: 'var(--amber-soft)', fg: 'oklch(0.55 0.12 60)', go: 'competitors' },
      { label: 'Saved trends', val: savedTrends, icon: 'trend', bg: 'var(--green-soft)', fg: 'var(--green)', delta: '+2', up: true, go: 'trends' },
    ];
    const links = [
      ['competitors', 'radar', 'Competitor Monitor'], ['trends', 'trend', 'Product Discovery'],
      ['brand', 'brand', 'Brand Builder'], ['seo', 'seo', 'SEO Content'], ['store', 'store', 'Store Generator'],
    ];

    return h('div', { className: 'content fade-in' },
      h('div', { className: 'page-head' },
        h('h2', null, greet + ', ' + st.profile.full_name.split(' ')[0] + ' 👋'),
        h('p', null, "Here's what's moving across your market today.")),

      h('div', { className: 'stat-grid', style: { marginBottom: 22 } },
        stats.map((s, i) => h('div', { key: i, className: 'stat', style: { cursor: 'pointer' }, onClick: () => onNav(s.go) },
          h('div', { className: 'stat-ico', style: { background: s.bg, color: s.fg } }, h(Icon, { name: s.icon, size: 19 })),
          h('div', { className: 'stat-val' }, s.val),
          h('div', { className: 'stat-label' }, s.label),
          s.delta && h('div', { className: 'stat-delta ' + (s.up ? 'up' : 'down') }, h(Icon, { name: s.up ? 'up' : 'down', size: 12 }), s.delta)))),

      h('div', { className: 'grid cols-3', style: { alignItems: 'start' } },
        // recent alerts (span 2)
        h('div', { className: 'card span-2' },
          h('div', { className: 'card-head' },
            h('h3', null, 'Recent pricing alerts'),
            h('div', { style: { marginLeft: 'auto' } }, h('button', { className: 'btn btn-ghost btn-sm', onClick: () => onNav('competitors') }, 'View all', h(Icon, { name: 'arrowR', size: 14 })))),
          recentAlerts.length === 0 ? h(L.Empty, { icon: 'bell', title: 'No alerts yet' }) :
            h('table', { className: 'table' },
              h('thead', null, h('tr', null,
                h('th', null, 'Competitor'), h('th', null, 'Product'), h('th', null, 'Change'), h('th', null, 'When'))),
              h('tbody', null, recentAlerts.map((a) => {
                const drop = a.type === 'Price Change' && a.new_price < a.old_price;
                return h('tr', { key: a.id },
                  h('td', { className: 't-strong' }, a.competitor_name),
                  h('td', { className: 't-muted' }, a.product_name),
                  h('td', null, a.type === 'New Product'
                    ? h('span', { className: 'badge badge-blue' }, 'New · ', L.money0(a.new_price))
                    : h('span', { className: 'mono', style: { fontWeight: 600 } },
                        h('span', { className: 't-muted', style: { textDecoration: 'line-through', fontWeight: 400, marginRight: 6 } }, L.money0(a.old_price)),
                        h('span', { style: { color: drop ? 'var(--green)' : 'var(--red)' } }, L.money0(a.new_price)))),
                  h('td', { className: 't-muted mono', style: { fontSize: 12.5 } }, L.timeAgo(a.created_at)));
              })))),

        // store status
        h('div', { className: 'card' },
          h('div', { className: 'card-head' }, h('h3', null, 'Latest store')),
          h('div', { className: 'card-pad' },
            lastStore ? h('div', null,
              h(L.Placeholder, { label: 'store preview', height: 120 }),
              h('div', { className: 'flex between', style: { marginTop: 14, gap: 10, alignItems: 'flex-start' } },
                h('div', { style: { fontWeight: 700, fontSize: 15, minWidth: 0, lineHeight: 1.3 } }, lastStore.store_name),
                h('div', { style: { flex: 'none' } }, h(L.StatusBadge, { status: lastStore.status }))),
              h('div', { className: 'flex center gap-8', style: { fontSize: 12.5, color: 'var(--muted)', marginTop: 6 } },
                h(Icon, { name: 'clock', size: 13 }), 'Created ', L.timeAgo(lastStore.created_at)),
              h('button', { className: 'btn btn-soft btn-block', style: { marginTop: 14 }, onClick: () => onNav('store') }, h(Icon, { name: 'store', size: 16 }), 'Open Store Generator'))
              : h(L.Empty, { icon: 'store', title: 'No store yet', desc: 'Generate your first storefront.' }))),
      ),

      h('div', { className: 'grid cols-3', style: { marginTop: 18, alignItems: 'start' } },
        h('div', { className: 'card span-2' },
          h('div', { className: 'card-head' }, h('h3', null, 'Top trends right now'),
            h('div', { style: { marginLeft: 'auto' } }, h('button', { className: 'btn btn-ghost btn-sm', onClick: () => onNav('trends') }, 'Discover more', h(Icon, { name: 'arrowR', size: 14 })))),
          h('table', { className: 'table' },
            h('thead', null, h('tr', null, h('th', null, 'Product'), h('th', null, 'Platform'), h('th', null, 'Trend score'))),
            h('tbody', null, topTrends.map((t) => h('tr', { key: t.id },
              h('td', { className: 't-strong' }, t.product_name),
              h('td', null, h(L.PlatformBadge, { platform: t.platform })),
              h('td', { style: { width: 200 } }, h(L.ScoreBar, { value: t.trend_score })))))),
        ),
        h('div', { className: 'card' },
          h('div', { className: 'card-head' }, h('h3', null, 'Quick actions')),
          h('div', { className: 'card-pad', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            links.map(([key, ic, lbl]) => h('button', { key, className: 'btn btn-ghost btn-block', style: { justifyContent: 'flex-start' }, onClick: () => onNav(key) },
              h(Icon, { name: ic, size: 16, style: { color: 'var(--accent-text)' } }), lbl,
              h(Icon, { name: 'chevR', size: 15, style: { marginLeft: 'auto', color: 'var(--faint)' } })))))));
  }

  // ============================================================
  //  TASK LOG
  // ============================================================
  const TASK_TYPES = ['Crawl Competitor', 'Scan Trends', 'Generate Brand', 'Generate SEO', 'Generate Store'];
  const TASK_STATUS = ['Pending', 'Running', 'Completed', 'Failed'];

  function TaskLog() {
    const store = L.useStore();
    const st = store.get();
    const [fType, setFType] = useState('');
    const [fStatus, setFStatus] = useState('');
    const [sortDir, setSortDir] = useState('desc');

    let rows = st.background_tasks.filter((t) => !t.dismissed);
    if (fType) rows = rows.filter((t) => t.task_type === fType);
    if (fStatus) rows = rows.filter((t) => t.status === fStatus);
    rows = [...rows].sort((a, b) => sortDir === 'desc' ? new Date(b.created_at) - new Date(a.created_at) : new Date(a.created_at) - new Date(b.created_at));

    return h('div', { className: 'content fade-in' },
      h('div', { className: 'page-row' },
        h('div', { className: 'page-head', style: { marginBottom: 0 } },
          h('h2', null, 'Task Log'),
          h('p', null, 'Background jobs across crawling, trend scans, and AI generation.'))),

      h('div', { className: 'flex center gap-12', style: { marginBottom: 16, flexWrap: 'wrap' } },
        h('div', { className: 'flex center gap-8', style: { color: 'var(--muted)', fontSize: 13, fontWeight: 600 } }, h(Icon, { name: 'filter', size: 15 }), 'Filter'),
        h('select', { className: 'select', style: { width: 200 }, value: fType, onChange: (e) => setFType(e.target.value) },
          h('option', { value: '' }, 'All task types'), TASK_TYPES.map((t) => h('option', { key: t, value: t }, t))),
        h('select', { className: 'select', style: { width: 170 }, value: fStatus, onChange: (e) => setFStatus(e.target.value) },
          h('option', { value: '' }, 'All statuses'), TASK_STATUS.map((t) => h('option', { key: t, value: t }, t))),
        (fType || fStatus) && h('button', { className: 'btn btn-ghost btn-sm', onClick: () => { setFType(''); setFStatus(''); } }, 'Clear')),

      h('div', { className: 'card' },
        h('table', { className: 'table' },
          h('thead', null, h('tr', null,
            h('th', null, 'Task'),
            h('th', null, 'Status'),
            h('th', null, 'Details'),
            h('th', { className: 'sortable', onClick: () => setSortDir((d) => d === 'desc' ? 'asc' : 'desc') }, 'Created ', h('span', { className: 'arrow' }, sortDir === 'desc' ? '↓' : '↑')),
            h('th', null, 'Updated'),
            h('th', { style: { textAlign: 'right' } }, ''))),
          h('tbody', null,
            rows.length === 0 ? h('tr', null, h('td', { colSpan: 6 }, h(L.Empty, { icon: 'tasks', title: 'No tasks match', desc: 'Try clearing filters.' }))) :
            rows.map((t) => h('tr', { key: t.id },
              h('td', null, h('div', { className: 'flex center gap-12' },
                h('div', { className: 'notif-ico', style: { width: 32, height: 32, background: 'var(--surface-2)', color: 'var(--ink-2)' } }, h(Icon, { name: taskIcon(t.task_type), size: 15 })),
                h('span', { className: 't-strong' }, t.task_type))),
              h('td', null, h(L.StatusBadge, { status: t.status })),
              h('td', { className: 't-muted', style: { maxWidth: 320 } },
                t.status === 'Failed' ? h('span', { style: { color: 'oklch(0.55 0.17 22)' } }, t.error_message) : detailText(t)),
              h('td', { className: 't-muted mono', style: { fontSize: 12.5 } }, L.timeAgo(t.created_at)),
              h('td', { className: 't-muted mono', style: { fontSize: 12.5 } }, L.timeAgo(t.updated_at)),
              h('td', null, h('div', { className: 'row-actions' },
                (t.status === 'Completed' || t.status === 'Failed') &&
                  h('button', { className: 'btn btn-ghost btn-sm', onClick: () => store.dismissTask(t.id) }, 'Dismiss')))))))));
  }

  function taskIcon(type) {
    return { 'Crawl Competitor': 'radar', 'Scan Trends': 'trend', 'Generate Brand': 'brand', 'Generate SEO': 'seo', 'Generate Store': 'store' }[type] || 'tasks';
  }
  function detailText(t) {
    const d = t.details || {};
    if (d.target) return d.target + (d.found != null ? ' · ' + d.found + ' update(s)' : '');
    if (d.platforms) return d.platforms.join(', ') + (d.found != null ? ' · ' + d.found + ' found' : '');
    if (d.brand) return d.brand;
    if (d.store) return d.store;
    if (d.topic) return d.topic;
    return '—';
  }

  window.MFPages = Object.assign(window.MFPages || {}, { Dashboard, TaskLog });
})();
