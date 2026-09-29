// Light shared UI helpers with no exercise or planner dependency: escaping, icons, the seal mark, sheets, toasts.
// app.js and the Welcome screen use only these, so the first screen paints before the planner and data load.
import { SEALS, WORDMARK } from './seal-paths.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- icons (24px line icons, currentColor) ----------
const P = {
  today: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>',
  plan: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  progress: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  library: '<path d="M5 4h4v16H5zM11 4h4v16h-4z"/><path d="m17 5 3 .8-3.6 14.4-3-.8"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m5 9 7 7 7-7"/>',
  easier: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  harder: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  skip: '<path d="M5 5l9 7-9 7zM18 5v14"/>',
  flame: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1 2.5 2 3 .5-3-1-5.5.5-8z"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  timer: '<circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 2M9 3h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  shuffle: '<path d="M3 7h4c4 0 6 10 10 10h4M3 17h4c1.6 0 2.8-1.6 3.9-3.6M13.1 9.6C14.2 8.1 15.4 7 17 7h4"/><path d="m18 4 3 3-3 3M18 14l3 3-3 3"/>',
  swap: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
};
export function icon(name, { size = 24, label = '' } = {}) {
  const a = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  const fill = name === 'play' ? 'currentColor' : 'none';
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${a}>${P[name] || ''}</svg>`;
}

// ---------- hanko seal ----------
// The carved seal (docs/brand, direction B): vector paths only, so the mark never waits for a web font.
// Parts carry .seal-bg / .seal-ink classes (fills default to --accent / --on-accent) for CSS recolouring.
const SMALL = 32; // below this the clean small-size cut replaces the textured carving

/** Vermilion seal. Known texts: '鍛' and '済' (square) and '鍛える' (vertical; `size` is its height). */
export function seal(text = '鍛', { size = 56, cls = '' } = {}) {
  const s = SEALS[text];
  if (!s) return textSeal(text, size, cls);
  const [, , vw, vh] = s.vb.split(' ').map(Number);
  const h = size, w = Math.round(size * vw / vh * 10) / 10;
  const body = (size < SMALL && s.sm) || s.lg;
  return `<svg class="seal ${cls}" width="${w}" height="${h}" viewBox="${s.vb}" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** The KITAERU wordmark as paths, in currentColor. `height` in px. */
export function wordmark({ height = 26, cls = '' } = {}) {
  const w = Math.round(height * WORDMARK.w / WORDMARK.h * 10) / 10;
  return `<svg class="wordmark ${cls}" width="${w}" height="${height}" viewBox="0 0 ${WORDMARK.w} ${WORDMARK.h}" role="img" aria-label="Kitaeru">${WORDMARK.body}</svg>`;
}

// Fallback for any other text: the plain seal with live text (not used by the app today).
function textSeal(text, size, cls) {
  const chars = [...text];
  const fs = chars.length === 1 ? 58 : chars.length === 2 ? 36 : 26;
  const step = fs * 0.98;
  const y0 = 50 - (step * (chars.length - 1)) / 2 + fs * 0.35;
  const t = chars.map((c, i) => `<text x="50" y="${(y0 + i * step).toFixed(1)}" text-anchor="middle" font-size="${fs}">${esc(c)}</text>`).join('');
  return `<svg class="seal ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <rect class="seal-bg" x="5" y="5" width="90" height="90" rx="6" fill="var(--accent)"/>
    <g class="seal-ink" fill="var(--on-accent)" font-family="'Noto Serif JP','Yu Mincho','Hiragino Mincho ProN',serif" font-weight="700">${t}</g></svg>`;
}

// ---------- toast ----------
export function toast(msg, ms = 2600) {
  let host = $('#toasts');
  if (!host) { host = document.createElement('div'); host.id = 'toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.append(host); }
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  host.append(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
}

// ---------- sheet (slide-up modal) ----------
let sheetStack = [];
/** openSheet({ title, html, onMount(el, close), onClose, wide }) -> close() */
export function openSheet({ title = '', titleHTML = '', html = '', onMount, onClose, cls = '' } = {}) {
  const prevFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="backdrop" data-close></div>
    <section class="sheet ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}" tabindex="-1">
      <div class="sheet-grip" aria-hidden="true"></div>
      <header class="sheet-head"><h2 class="sheet-title">${titleHTML || esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="Close">${icon('close')}</button></header>
      <div class="sheet-body">${html}</div>
    </section>`;
  document.body.append(wrap);
  document.body.classList.add('no-scroll');
  const sheet = $('.sheet', wrap);
  let cleanup = null, closed = false;
  const close = () => {
    if (closed) return; closed = true;
    wrap.classList.add('closing');
    try { cleanup && cleanup(); } catch (e) { console.error(e); }
    sheetStack = sheetStack.filter(s => s !== close);
    setTimeout(() => {
      wrap.remove();
      if (!sheetStack.length) document.body.classList.remove('no-scroll');
      prevFocus && prevFocus.focus && prevFocus.focus({ preventScroll: true });
      onClose && onClose();
    }, reducedMotion() ? 0 : 220);
  };
  wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') { // simple focus trap
      const f = $$('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])', sheet).filter(x => !x.disabled && x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  sheetStack.push(close);
  requestAnimationFrame(() => { wrap.classList.add('open'); sheet.focus({ preventScroll: true }); });
  if (onMount) cleanup = onMount($('.sheet-body', wrap), close) || null;
  return close;
}
export function closeAllSheets() { [...sheetStack].forEach(c => c()); }

/** Promise-based confirm built on the sheet. */
export function confirmSheet({ title, body = '', ok = 'Confirm', cancel = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    let result = false;
    openSheet({
      title, cls: 'sheet-small',
      html: `<p class="muted">${body}</p><div class="btn-row"><button class="btn btn-ghost" data-close>${esc(cancel)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button></div>`,
      onMount(el, close) { el.querySelector('[data-ok]').addEventListener('click', () => { result = true; close(); }); },
      onClose: () => resolve(result),
    });
  });
}
