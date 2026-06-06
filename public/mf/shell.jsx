/* ============================================================
   App shell: Sidebar, Topbar, Notification Tray, Toasts
   ============================================================ */
(function () {
  const { useState, useEffect, useRef } = window.React;
  const L = window.MFLib;
  const h = L.h, Icon = L.Icon;

  const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'competitors', label: 'Competitor Monitor', icon: 'radar' },
    { key: 'trends', label: 'Product Discovery', icon: 'trend' },
    { key: 'brand', label: 'Brand Builder', icon: 'brand' },
    { key: 'seo', label: 'SEO Content', icon: 'seo' },
    { key: 'store', label: 'Store Generator', icon: 'store' },
    { key: 'tasks', label: 'Task Log', icon: 'tasks' },
  ];
  const TITLES = {
    dashboard: 'Dashboard', competitors: 'Competitor Monitor', trends: 'Product Discovery',
    brand: 'Brand Builder', seo: 'SEO Content', store: 'Store Generator', tasks: 'Task Log', profile: 'Profile',
  };

  function Sidebar({ route, onNav }) {
    const store = L.useStore();
    const st = store.get();
    const base = route.split('/')[0];
    const unread = store.unreadAlerts().length;
    const active = store.activeTasks().length;
    return h('aside', { className: 'sidebar' },
      h('div', { className: 'brand' },
        h('div', { className: 'brand-mark' }, h(Icon, { name: 'radar', size: 19, style: { color: '#fff' } })),
        h('div', { className: 'brand-name' }, 'Market Eye')),
      h('nav', { className: 'nav' },
        h('div', { className: 'nav-label' }, 'Workspace'),
        NAV.map((n) => h('div', {
          key: n.key, className: 'nav-item' + (base === n.key ? ' active' : ''), onClick: () => onNav(n.key),
        },
          h(Icon, { name: n.icon, size: 18 }),
          h('span', null, n.label),
          n.key === 'tasks' && active > 0 && h('span', { className: 'count' }, active),
        ))),
      h('div', { className: 'nav-foot' },
        h('div', { className: 'userchip', onClick: () => onNav('profile') },
          h('div', { className: 'avatar' }, L.initials(st.profile.full_name)),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { className: 'userchip-name' }, st.profile.full_name),
            h('div', { className: 'userchip-co' }, st.profile.company_name)),
          h(Icon, { name: 'chevR', size: 15, style: { color: 'var(--chrome-muted)' } }))));
  }

  function Topbar({ route, onNav }) {
    const store = L.useStore();
    const unread = store.unreadAlerts().length;
    const [trayOpen, setTrayOpen] = useState(false);
    const crumb = route.includes('/') ? route.split('/')[0] : null;
    return h(window.React.Fragment, null,
      h('header', { className: 'topbar' },
        h('h1', null,
          crumb ? h('span', null, h('span', { className: 'crumb', style: { cursor: 'pointer' }, onClick: () => onNav(crumb) }, TITLES[crumb]), ' / ', 'Detail') : TITLES[route] || 'Market Eye'),
        h('div', { className: 'topbar-spacer' }),
        h('div', { className: 'searchbox' },
          h(Icon, { name: 'search', size: 16 }),
          h('input', { placeholder: 'Search competitors, products, trends…' }),
          h('kbd', null, '⌘K')),
        h('button', { className: 'iconbtn', title: 'Notifications', onClick: () => setTrayOpen(true) },
          h(Icon, { name: 'bell', size: 18 }),
          unread > 0 && h('span', { className: 'badge' }, unread))),
      trayOpen && h(NotificationTray, { onClose: () => setTrayOpen(false), onNav }));
  }

  // ---------- Notification Tray ----------
  function NotificationTray({ onClose, onNav }) {
    const store = L.useStore();
    const st = store.get();
    const [tab, setTab] = useState('all');
    const alerts = st.alerts;
    const tasks = st.background_tasks.filter((t) => !t.dismissed);

    const items = [];
    alerts.forEach((a) => items.push({ kind: 'alert', t: a.created_at, data: a }));
    tasks.filter((t) => t.status === 'Completed' || t.status === 'Failed' || t.status === 'Running').forEach((t) => items.push({ kind: 'task', t: t.updated_at, data: t }));
    items.sort((a, b) => new Date(b.t) - new Date(a.t));
    const shown = tab === 'alerts' ? items.filter((i) => i.kind === 'alert') : tab === 'tasks' ? items.filter((i) => i.kind === 'task') : items;

    function alertNotif(a) {
      const isPrice = a.type === 'Price Change';
      const drop = isPrice && a.new_price < a.old_price;
      return h('div', { key: a.id, className: 'notif' + (a.is_read ? '' : ' unread'), onClick: () => { store.markAlertRead(a.id); onNav('competitors'); onClose(); } },
        h('div', { className: 'notif-ico', style: { background: isPrice ? 'var(--accent-soft)' : 'var(--green-soft)', color: isPrice ? 'var(--accent-text)' : 'var(--green)' } },
          h(Icon, { name: isPrice ? (drop ? 'down' : 'up') : 'plus', size: 16 })),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { className: 'notif-title' }, a.type === 'Price Change' ? 'Price ' + (drop ? 'drop' : 'increase') : 'New product'),
          h('div', { className: 'notif-desc' },
            h('strong', { style: { color: 'var(--ink-2)' } }, a.competitor_name), ' · ', a.product_name,
            isPrice && h('span', null, ' — ', L.money(a.old_price), ' → ', h('span', { style: { color: drop ? 'var(--green)' : 'var(--red)', fontWeight: 600 } }, L.money(a.new_price)))),
          h('div', { className: 'notif-time' }, L.timeAgo(a.created_at))),
        !a.is_read && h('span', { className: 'unread-dot' }));
    }
    function taskNotif(t) {
      const m = { Completed: ['check', 'var(--green-soft)', 'var(--green)'], Failed: ['x', 'var(--red-soft)', 'var(--red)'], Running: ['refresh', 'var(--accent-soft)', 'var(--accent-text)'] };
      const [ic, bg, fg] = m[t.status] || m.Running;
      return h('div', { key: t.id, className: 'notif', onClick: () => { onNav('tasks'); onClose(); } },
        h('div', { className: 'notif-ico', style: { background: bg, color: fg } }, h(Icon, { name: ic, size: 16, className: t.status === 'Running' ? 'spin' : '' })),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { className: 'notif-title' }, t.task_type, ' · ', t.status),
          h('div', { className: 'notif-desc' }, t.status === 'Failed' ? t.error_message : (t.details.target || t.details.store || t.details.brand || t.details.topic || (t.details.platforms ? t.details.platforms.join(', ') : 'Processing…'))),
          h('div', { className: 'notif-time' }, L.timeAgo(t.updated_at))));
    }

    return h(window.React.Fragment, null,
      h('div', { className: 'tray-backdrop', onClick: onClose }),
      h('div', { className: 'tray' },
        h('div', { className: 'tray-head' },
          h('h3', null, 'Notifications'),
          h('div', { className: 'flex center gap-8' },
            store.unreadAlerts().length > 0 && h('button', { className: 'btn btn-ghost btn-sm', onClick: () => store.markAllRead() }, 'Mark all read'),
            h('button', { className: 'iconbtn', style: { width: 32, height: 32 }, onClick: onClose }, h(Icon, { name: 'x', size: 16 })))),
        h('div', { className: 'tray-tabs' },
          [['all', 'All'], ['alerts', 'Alerts'], ['tasks', 'Tasks']].map(([k, lbl]) =>
            h('div', { key: k, className: 'tray-tab' + (tab === k ? ' on' : ''), onClick: () => setTab(k) }, lbl))),
        h('div', { className: 'tray-body' },
          shown.length === 0 ? h(L.Empty, { icon: 'bell', title: 'All caught up', desc: 'No notifications in this view.' })
            : shown.map((i) => i.kind === 'alert' ? alertNotif(i.data) : taskNotif(i.data))),
        h(ConnBar, null)));
  }

  function ConnBar() {
    const store = L.useStore();
    const on = store.get().connected;
    return h('div', { className: 'conn' + (on ? '' : ' off') },
      h('span', { className: 'live' }),
      on ? 'Live updates connected' : 'Live updates disconnected — reconnecting…');
  }

  // ---------- Toast host ----------
  function ToastHost() {
    const [toasts, setToasts] = useState([]);
    useEffect(() => {
      window.MFToast = (type, title, desc) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((ts) => [...ts, { id, type, title, desc }]);
        setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 5200);
      };
    }, []);
    const conf = {
      success: ['check', 'var(--green)'], error: ['alert', 'var(--red)'],
      alert: ['bell', 'var(--accent)'], info: ['bulb', 'var(--accent)'],
    };
    return h('div', { className: 'toast-wrap' }, toasts.map((t) => {
      const [ic, color] = conf[t.type] || conf.info;
      return h('div', { key: t.id, className: 'toast' },
        h('div', { className: 'toast-ico', style: { background: 'oklch(1 0 0 / 0.1)', color } }, h(Icon, { name: ic, size: 16 })),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { className: 'toast-title' }, t.title),
          t.desc && h('div', { className: 'toast-desc' }, t.desc)),
        h('button', { className: 'toast-x', onClick: () => setToasts((ts) => ts.filter((x) => x.id !== t.id)) }, h(Icon, { name: 'x', size: 15 })));
    }));
  }

  window.MFShell = { Sidebar, Topbar, ToastHost, NAV, TITLES };
})();
