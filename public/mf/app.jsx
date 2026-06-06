/* ============================================================
   App: router + Profile + mount
   ============================================================ */
(function () {
  const { useState, useEffect } = window.React;
  const L = window.MFLib;
  const h = L.h, Icon = L.Icon;
  const P = window.MFPages;
  const Shell = window.MFShell;

  function ProfilePage() {
    const store = L.useStore();
    const st = store.get();
    const [name, setName] = useState(st.profile.full_name);
    const [company, setCompany] = useState(st.profile.company_name);
    const dirty = name !== st.profile.full_name || company !== st.profile.company_name;
    function save() { store.updateProfile({ full_name: name, company_name: company }); window.MFToast('success', 'Profile saved', 'Your details were updated'); }
    return h('div', { className: 'content fade-in', style: { maxWidth: 720 } },
      h('div', { className: 'page-head' }, h('h2', null, 'Profile'), h('p', null, 'Manage your account details.')),
      h('div', { className: 'card' },
        h('div', { className: 'card-pad', style: { display: 'flex', alignItems: 'center', gap: 18, borderBottom: '1px solid var(--line)' } },
          h('div', { className: 'avatar', style: { width: 64, height: 64, fontSize: 24 } }, L.initials(st.profile.full_name)),
          h('div', null, h('div', { style: { fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' } }, st.profile.full_name),
            h('div', { className: 'flex center gap-8', style: { color: 'var(--muted)', fontSize: 14, marginTop: 3 } }, h(Icon, { name: 'mail', size: 14 }), st.profile.email)),
          h('span', { className: 'badge ' + (st.profile.role === 'Admin' ? 'badge-violet' : 'badge-neutral'), style: { marginLeft: 'auto' } }, st.profile.role)),
        h('div', { className: 'card-pad', style: { display: 'flex', flexDirection: 'column', gap: 18 } },
          h('div', { className: 'grid cols-2' },
            h(L.Field, { label: 'Full name' }, h('input', { className: 'input', value: name, onChange: (e) => setName(e.target.value) })),
            h(L.Field, { label: 'Company name' }, h('input', { className: 'input', value: company, onChange: (e) => setCompany(e.target.value) }))),
          h(L.Field, { label: 'Email' }, h('input', { className: 'input', value: st.profile.email, disabled: true, style: { color: 'var(--muted)', background: 'var(--surface-2)' } })),
          h('div', { className: 'flex', style: { justifyContent: 'flex-end', gap: 10 } },
            h('button', { className: 'btn btn-primary', disabled: !dirty, onClick: save }, h(Icon, { name: 'save', size: 16 }), 'Save changes')))),
      h('div', { className: 'card', style: { marginTop: 18 } },
        h('div', { className: 'card-pad', style: { display: 'flex', alignItems: 'center', gap: 14 } },
          h('div', { style: { flex: 1 } }, h('div', { style: { fontWeight: 700, fontSize: 15 } }, 'Sign out'),
            h('div', { className: 't-muted', style: { fontSize: 13.5, marginTop: 2 } }, 'End your session on this device.')),
          h('button', { className: 'btn btn-ghost', onClick: () => window.MFToast('info', 'Demo mode', 'Sign-out is disabled in this prototype.') }, h(Icon, { name: 'logout', size: 16 }), 'Log out'))));
  }

  // ---------- router ----------
  function parseRoute() {
    const hash = (window.location.hash || '#dashboard').slice(1);
    return hash || 'dashboard';
  }

  function App() {
    const [route, setRoute] = useState(parseRoute());
    useEffect(() => {
      const onHash = () => { setRoute(parseRoute()); document.querySelector('.main') && document.querySelector('.main').scrollTo(0, 0); };
      window.addEventListener('hashchange', onHash);
      return () => window.removeEventListener('hashchange', onHash);
    }, []);
    function nav(r) { window.location.hash = r; }

    const base = route.split('/')[0];
    let page;
    if (base === 'dashboard') page = h(P.Dashboard, { onNav: nav });
    else if (base === 'competitors') {
      const id = route.split('/')[1];
      page = id ? h(P.CompetitorDetail, { id, onNav: nav }) : h(P.CompetitorMonitor, { onNav: nav });
    }
    else if (base === 'trends') page = h(P.ProductDiscovery, null);
    else if (base === 'brand') page = h(P.BrandBuilder, null);
    else if (base === 'seo') page = h(P.SeoGenerator, null);
    else if (base === 'store') page = h(P.StoreGenerator, null);
    else if (base === 'tasks') page = h(P.TaskLog, null);
    else if (base === 'profile') page = h(ProfilePage, null);
    else page = h(P.Dashboard, { onNav: nav });

    return h('div', { className: 'app' },
      h(Shell.Sidebar, { route, onNav: nav }),
      h('div', { className: 'main' },
        h(Shell.Topbar, { route, onNav: nav }),
        h('div', { key: route, style: { flex: 1 } }, page)),
      h(Shell.ToastHost, null));
  }

  window.ReactDOM.createRoot(document.getElementById('root')).render(h(App, null));
})();
