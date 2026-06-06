/* ============================================================
   Shared lib: hooks, formatters, small components
   ============================================================ */
(function () {
  const { useState, useEffect, useRef, useCallback } = window.React;
  const h = window.React.createElement;
  const Icon = window.Icon;

  // ---- store hook ----
  function useStore() {
    const [, force] = useState(0);
    useEffect(() => window.MFStore.subscribe(() => force((n) => n + 1)), []);
    return window.MFStore;
  }

  // ---- formatters ----
  const money = (n) => n == null ? '—' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money0 = (n) => n == null ? '—' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  function timeAgo(iso) {
    if (!iso) return 'never';
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function dateFmt(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const initials = (name) => (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  // ---- status badge ----
  function StatusBadge({ status }) {
    const map = {
      Active: 'badge-active', Paused: 'badge-paused', Error: 'badge-error',
      Running: 'badge-running', Pending: 'badge-pending', Completed: 'badge-done', Failed: 'badge-failed',
      Ready: 'badge-done', Generating: 'badge-running', Draft: 'badge-neutral', Published: 'badge-active',
    };
    return h('span', { className: 'badge ' + (map[status] || 'badge-neutral') },
      h('span', { className: 'bdot' }), status);
  }

  function PlatformBadge({ platform }) {
    const map = { TikTok: 'badge-violet', Amazon: 'badge-amber', Reddit: 'badge-error', Other: 'badge-neutral' };
    return h('span', { className: 'badge ' + (map[platform] || 'badge-neutral') }, platform);
  }

  // ---- score bar ----
  function ScoreBar({ value, hue }) {
    const color = hue === 'v' ? 'oklch(0.6 0.16 300)' : hue === 'a' ? 'oklch(0.7 0.13 75)' : 'var(--accent)';
    return h('div', { className: 'score' },
      h('div', { className: 'score-track' }, h('div', { className: 'score-fill', style: { width: value + '%', background: color } })),
      h('span', { className: 'score-val' }, value));
  }

  // ---- field ----
  function Field({ label, hint, error, children }) {
    return h('div', { className: 'field' },
      label && h('label', null, label),
      children,
      error && h('div', { className: 'err-msg' }, h(Icon, { name: 'alert', size: 13 }), error),
      hint && !error && h('div', { className: 'hint' }, hint));
  }

  // ---- empty state ----
  function Empty({ icon, title, desc, action }) {
    return h('div', { className: 'empty' },
      h('div', { className: 'empty-ico' }, h(Icon, { name: icon || 'layers', size: 24 })),
      h('h4', null, title),
      desc && h('p', null, desc),
      action && h('div', { style: { marginTop: 16 } }, action));
  }

  // ---- modal ----
  function Modal({ title, desc, children, onClose, footer, wide }) {
    useEffect(() => {
      const k = (e) => e.key === 'Escape' && onClose && onClose();
      window.addEventListener('keydown', k);
      return () => window.removeEventListener('keydown', k);
    }, []);
    return h('div', { className: 'modal-backdrop', onMouseDown: (e) => e.target === e.currentTarget && onClose && onClose() },
      h('div', { className: 'modal', style: wide ? { maxWidth: 680 } : null },
        (title || desc) && h('div', { className: 'modal-head' }, title && h('h3', null, title), desc && h('p', null, desc)),
        h('div', { className: 'modal-body' }, children),
        footer && h('div', { className: 'modal-foot' }, footer)));
  }

  // ============================================================
  //  Price history line chart (SVG)
  // ============================================================
  function PriceChart({ data, height }) {
    const ref = useRef(null);
    const [w, setW] = useState(640);
    const [hover, setHover] = useState(null);
    useEffect(() => {
      const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
      if (ref.current) ro.observe(ref.current);
      return () => ro.disconnect();
    }, []);
    const H = height || 240;
    const padL = 52, padR = 16, padT = 18, padB = 30;
    if (!data || data.length < 2) return h('div', { className: 'empty', style: { padding: 40 } }, 'Not enough price data yet.');
    const prices = data.map((d) => d.price);
    let min = Math.min(...prices), max = Math.max(...prices);
    const span = max - min || max * 0.1 || 1;
    min -= span * 0.25; max += span * 0.25;
    const innerW = w - padL - padR, innerH = H - padT - padB;
    const x = (i) => padL + (innerW * i) / (data.length - 1);
    const y = (p) => padT + innerH * (1 - (p - min) / (max - min));
    const line = data.map((d, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(d.price).toFixed(1)).join(' ');
    const area = line + ' L' + x(data.length - 1).toFixed(1) + ' ' + (padT + innerH) + ' L' + padL + ' ' + (padT + innerH) + ' Z';
    const ticks = 4;
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => min + ((max - min) * i) / ticks);
    const last = data[data.length - 1].price, first = data[0].price;
    const upTrend = last >= first;

    function move(e) {
      const rect = ref.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      let idx = Math.round(((px - padL) / innerW) * (data.length - 1));
      idx = Math.max(0, Math.min(data.length - 1, idx));
      setHover(idx);
    }
    const stroke = upTrend ? 'var(--green)' : 'var(--red)';
    const gid = 'g' + Math.round(min);
    return h('div', { className: 'chart-wrap', ref, onMouseMove: move, onMouseLeave: () => setHover(null) },
      h('svg', { width: '100%', height: H, style: { display: 'block', overflow: 'visible' } },
        h('defs', null, h('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
          h('stop', { offset: '0%', stopColor: stroke, stopOpacity: 0.16 }),
          h('stop', { offset: '100%', stopColor: stroke, stopOpacity: 0 }))),
        yTicks.map((t, i) => h('g', { key: i },
          h('line', { x1: padL, x2: w - padR, y1: y(t), y2: y(t), stroke: 'var(--line)', strokeWidth: 1 }),
          h('text', { x: padL - 10, y: y(t) + 4, textAnchor: 'end', fontSize: 11, fill: 'var(--faint)', fontFamily: 'var(--mono)' }, '$' + Math.round(t)))),
        h('path', { d: area, fill: 'url(#' + gid + ')' }),
        h('path', { d: line, fill: 'none', stroke, strokeWidth: 2.4, strokeLinejoin: 'round', strokeLinecap: 'round' }),
        data.map((d, i) => h('circle', { key: i, cx: x(i), cy: y(d.price), r: hover === i ? 5 : 0, fill: stroke, stroke: '#fff', strokeWidth: 2 })),
        hover != null && h('line', { x1: x(hover), x2: x(hover), y1: padT, y2: padT + innerH, stroke: 'var(--line-2)', strokeWidth: 1, strokeDasharray: '3 3' })),
      hover != null && h('div', { className: 'chart-tip', style: { left: x(hover), top: y(data[hover].price) } },
        h('span', { className: 'v' }, money(data[hover].price)),
        h('div', { style: { fontSize: 10.5, opacity: 0.7, marginTop: 1 } }, dateFmt(data[hover].timestamp))));
  }

  // ---- striped image placeholder ----
  function Placeholder({ label, height, radius }) {
    return h('div', {
      style: {
        height: height || 120, borderRadius: radius || 10,
        background: 'repeating-linear-gradient(135deg, var(--surface-2), var(--surface-2) 11px, var(--surface-3) 11px, var(--surface-3) 22px)',
        border: '1px solid var(--line)', display: 'grid', placeItems: 'center',
      },
    }, h('span', { style: { fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--faint)', background: 'var(--surface)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--line)' } }, label || 'image'));
  }

  window.MFLib = { useStore, money, money0, timeAgo, dateFmt, initials, StatusBadge, PlatformBadge, ScoreBar, Field, Empty, Modal, PriceChart, Placeholder, h, Icon };
})();
