// Kitaeru app shell: theme, hash router, tab bar, service worker.
import { getState, subscribe, getActiveWorkout } from './store.js';
import { icon, $, $$, closeAllSheets } from './ui/components.js';
import * as welcome from './ui/welcome.js';
import * as onboarding from './ui/onboarding.js';
import * as today from './ui/today.js';
import * as plan from './ui/plan.js';
import * as progress from './ui/progress.js';
import * as library from './ui/library.js';
import * as me from './ui/me.js';
import * as workout from './ui/workout.js';

const ROUTES = { welcome, onboarding, today, plan, progress, library, me, workout };
const TABS = new Set(['today', 'plan', 'progress', 'library', 'me']);
const view = $('#view');
const tabbar = $('#tabbar');

let current = { name: null, cleanup: null, mod: null, host: null };

// ---------- theme ----------
function applyTheme() {
  const t = getState().settings.theme;
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach(m => { m.content = dark ? '#121110' : '#F5F1E8'; });
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
let lastTheme = null;
subscribe(s => { if (s.settings.theme !== lastTheme) { lastTheme = s.settings.theme; applyTheme(); } });

// ---------- routing ----------
export function parseHash(hash = location.hash) {
  const [path, qs = ''] = hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || '', params: parts.slice(1), query: Object.fromEntries(new URLSearchParams(qs)) };
}
export function go(hash, { replace = false } = {}) {
  if (replace) { history.replaceState(null, '', hash); route(); } else location.hash = hash;
}

function guard(r) {
  const s = getState();
  const hasProfile = !!s.profile;
  if (!hasProfile && !['welcome', 'onboarding'].includes(r.name)) return '#/welcome';
  if (hasProfile && (r.name === '' || r.name === 'welcome')) return '#/today';
  if (r.name === 'workout' && !getActiveWorkout()) return '#/today';
  if (r.name && !ROUTES[r.name]) return hasProfile ? '#/today' : '#/welcome';
  return null;
}

function route() {
  const r = parseHash();
  const redirect = guard(r);
  if (redirect) { history.replaceState(null, '', redirect); return route(); }
  const mod = ROUTES[r.name];
  const ctx = { ...r, go, rerender: () => render(true) };

  function render(force = false) {
    // Same screen with an update() hook (e.g. library -> library/:id): let it patch in place.
    if (!force && current.name === r.name && mod.update) { mod.update(current.host, ctx); return; }
    try { current.cleanup && current.cleanup(); } catch (e) { console.error(e); }
    closeAllSheets();
    // A fresh host per render so delegated listeners never accumulate.
    const host = document.createElement('div');
    host.className = 'host';
    view.replaceChildren(host);
    view.className = `view view-${r.name}`;
    current = { name: r.name, mod, cleanup: null, host };
    current.cleanup = mod.render(host, ctx) || null;
    if (!force) { window.scrollTo(0, 0); view.focus({ preventScroll: true }); }
  }
  render();

  const showTabs = TABS.has(r.name);
  tabbar.hidden = !showTabs;
  document.body.classList.toggle('has-tabs', showTabs);
  $$('a[data-tab]', tabbar).forEach(a => {
    const on = a.dataset.tab === r.name;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// ---------- boot ----------
$$('[data-icon]', tabbar).forEach(el => { el.innerHTML = icon(el.dataset.icon); });
applyTheme();
lastTheme = getState().settings.theme;
window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  if (new URLSearchParams(location.search).has('nosw')) {
    // Developer escape hatch: ?nosw unregisters the worker so edits show immediately.
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  } else {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW registration failed', e)));
  }
}
