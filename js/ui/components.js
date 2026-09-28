// Shared UI helpers: escaping, icons, the seal mark, sheets, toasts, formatting, audio, thumbnails.
import { MUSCLES, FAMILIES, ALL_FAMILIES, EXERCISES, byId, varietyFor, ALL_BY_ID, createSkeletonPlayer, plannerIsAvailable } from './deps.js';
import { getState } from '../store.js';

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
};
export function icon(name, { size = 24, label = '' } = {}) {
  const a = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  const fill = name === 'play' ? 'currentColor' : 'none';
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${a}>${P[name] || ''}</svg>`;
}

// ---------- hanko seal ----------
/** Vermilion seal with vertical text. `text` is 1-3 CJK characters. */
export function seal(text = '鍛', { size = 56, cls = '' } = {}) {
  const chars = [...text];
  const fs = chars.length === 1 ? 58 : chars.length === 2 ? 36 : 26;
  const step = fs * 0.98;
  const y0 = 50 - (step * (chars.length - 1)) / 2 + fs * 0.35;
  const t = chars.map((c, i) => `<text x="50" y="${(y0 + i * step).toFixed(1)}" text-anchor="middle" font-size="${fs}">${esc(c)}</text>`).join('');
  return `<svg class="seal ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
    <rect x="5" y="5" width="90" height="90" rx="14" fill="var(--accent)"/>
    <rect x="11" y="11" width="78" height="78" rx="9" fill="none" stroke="var(--on-accent)" stroke-width="2.2" opacity=".9"/>
    <g fill="var(--on-accent)" font-family="'Noto Serif JP','Yu Mincho','Hiragino Mincho ProN',serif" font-weight="700">${t}</g></svg>`;
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

// ---------- names & formatting ----------
export const exercise = id => byId[id];
// ALL_BY_ID: flow steps and items logged in preview still have a name after the gate hides them.
export const exName = id => byId[id]?.name || ALL_BY_ID[id]?.name || id;
export const muscleName = id => MUSCLES[id]?.name || id.replace(/_/g, ' ');
export const familyName = f => FAMILIES[f]?.name || ALL_FAMILIES[f]?.name || f.replace(/_/g, ' ');
export const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday-first display
const range = r => (r[0] === r[1] ? `${r[0]}` : `${r[0]}–${r[1]}`);

/** "2:30", "45 s" */
export const fmtDur = sec => { const s = Math.max(0, Math.round(sec)); return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s} s`; };
/** Is this plan item a whole flow (v1.2 `mode: 'flow'`)? */
export const isFlowItem = item => !!item && (!!item.flow || ALL_BY_ID[item.exerciseId]?.mode === 'flow');

/** Display name of a resolved flow step (pauses have no exercise). */
export const stepName = (st, i, n) => st.exercise?.name || st.label || (i === 0 ? 'Starting position' : i === n - 1 ? 'Closing' : 'Pause');
/** "8 times", "2 each side", "3 alternating", "10 s": Kitaeru's own count. */
export function stepCount(st) {
  if (!st.reps) return fmtDur(st.sec);
  if (st.side === 'both') return `${st.reps} each side`;
  if (st.side === 'alternate') return `${st.reps} alternating`;
  return `${st.reps} ${st.reps === 1 ? 'time' : 'times'}`;
}
/** "3 × 6–10 per side", "2 × hold 20–30 s", flows: "1 pass · about 3:05" */
export function fmtTarget(item) {
  if (isFlowItem(item)) {
    const sec = item.flow?.estSec ?? item.holdSec?.[1] ?? ALL_BY_ID[item.exerciseId]?.estSec ?? 0;
    return `${item.sets > 1 ? `${item.sets} rounds` : '1 pass'} · about ${fmtDur(sec)}${item.sets > 1 ? ' each' : ''}`;
  }
  const sets = item.sets > 1 ? `${item.sets} × ` : '';
  const side = item.perSide ? ' per side' : '';
  const cat = byId[item.exerciseId]?.category;
  if (item.holdSec) return `${sets}${['conditioning', 'warmup'].includes(cat) ? '' : 'hold '}${range(item.holdSec)} s${side}`;
  if (item.reps) return `${sets}${range(item.reps)}${side}`;
  return `${item.sets} set${item.sets > 1 ? 's' : ''}`;
}
export function fmtDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts);
}
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---------- units ----------
export const kgToLb = kg => kg * 2.20462;
export const lbToKg = lb => lb / 2.20462;
export function cmToFtIn(cm) { const inch = cm / 2.54; let ft = Math.floor(inch / 12); let i = Math.round(inch - ft * 12); if (i === 12) { ft++; i = 0; } return { ft, in: i }; }
export const ftInToCm = (ft, i) => (ft * 12 + i) * 2.54;
export function kgToStLb(kg) { const lb = kgToLb(kg); let st = Math.floor(lb / 14); let l = Math.round(lb - st * 14); if (l === 14) { st++; l = 0; } return { st, lb: l }; }
/** 'kg' or 'lb': the unit body weight is typed and charted in. */
export const weightUnit = (units = getState().settings.units, fmt = getState().settings.weightFmt) => (units === 'imperial' && fmt !== 'kg' ? 'lb' : 'kg');
export function fmtWeight(kg, units = getState().settings.units, fmt = getState().settings.weightFmt) {
  if (kg == null) return '—';
  if (units !== 'imperial') return `${Math.round(kg * 10) / 10} kg`;
  const f = fmt; // imperial users may prefer kg or st & lb for body weight
  if (f === 'kg') return `${Math.round(kg * 10) / 10} kg`;
  if (f === 'stlb') { const x = kgToStLb(kg); return `${x.st} st ${x.lb} lb`; }
  return `${Math.round(kgToLb(kg) * 10) / 10} lb`;
}
export function fmtHeight(cm, units = getState().settings.units) {
  if (cm == null) return '—';
  if (units === 'imperial') { const f = cmToFtIn(cm); return `${f.ft}′ ${f.in}″`; }
  return `${Math.round(cm)} cm`;
}

// ---------- availability & ladders ----------
export function isAvailable(ex, profile) {
  if (!ex || !profile) return !!ex;
  if (plannerIsAvailable) { try { return !!plannerIsAvailable(ex, profile); } catch { /* fall back to the local rule */ } }
  const eq = profile.equipment || [];
  if (!(ex.equipment || []).every(q => eq.includes(q))) return false;
  if ((ex.stress || []).some(s => (profile.injuries || []).includes(s))) return false;
  if (profile.lowImpact && ex.impact === 'high') return false;
  const rank = { small: 0, medium: 1, large: 2 };
  if ((rank[ex.space] ?? 0) > (rank[profile.space] ?? 2)) return false;
  return true;
}
export const ladder = family => EXERCISES.filter(e => e.family === family && e.rung !== false).sort((a, b) => a.level - b.level);
/** Next easier/harder exercise for a swap, respecting explicit overrides and availability. */
export function neighbour(id, dir, profile) {
  const ex = byId[id]; if (!ex) return null;
  const override = dir < 0 ? ex.easier : ex.harder;
  if (override && byId[override] && isAvailable(byId[override], profile)) return byId[override];
  const lad = ladder(ex.family).filter(e => e.id !== id && isAvailable(e, profile));
  const cands = dir < 0 ? lad.filter(e => e.level < ex.level).reverse() : lad.filter(e => e.level > ex.level);
  return cands[0] || null;
}
/** Variety swaps (`rung: false` items such as the daṇḍ) this profile can do instead of an exercise. */
export function varietySwaps(id, profile) { return varietyFor(id).filter(e => isAvailable(e, profile)); }
export const PROGRESSION_EXCLUDE = new Set(['mobility', 'warmup', 'conditioning']);
/** Is this family a progression ladder? Not mobility/warm-up/conditioning, nor v1.2 families marked `progression: false` (flows, breath). */
export const isProgression = f => !PROGRESSION_EXCLUDE.has(f) && (ALL_FAMILIES[f] || FAMILIES[f])?.progression !== false;

// ---------- native names (v1.2) ----------
/** Script-specific font stacks: see .native in app.css. `lang` picks the right fallback and glyph variants. */
export function nativeNameHTML(nn, { roman = true, cls = '' } = {}) {
  if (!nn || !nn.text) return '';
  const rtl = ['ur', 'fa', 'ar'].includes(nn.lang);
  return `<span class="native-name ${cls}"><span class="native" lang="${esc(nn.lang || 'und')}"${rtl ? ' dir="rtl"' : ''}>${esc(nn.text)}</span>${roman && nn.romanised ? ` <span class="roman">${esc(nn.romanised)}</span>` : ''}</span>`;
}

// ---------- skeleton thumbnails ----------
/**
 * Mount skeleton players into every `[data-anim]` element inside root.
 * data-anim = exercise id; data-size; data-play="1" to animate. Lazily mounts when scrolled into view.
 * Returns a destroy() function.
 */
export function mountAnims(root) {
  const players = [];
  const mount = el => {
    if (el._mounted) return; el._mounted = true;
    const ex = byId[el.dataset.anim] || ALL_BY_ID[el.dataset.anim];
    if (!ex) return;
    try {
      const p = createSkeletonPlayer(el, ex.anim || ex.id, {
        primary: ex.muscles?.primary || [], secondary: ex.muscles?.secondary || [],
        size: +el.dataset.size || 96, playing: el.dataset.play === '1' && !reducedMotion(),
      });
      players.push(p);
    } catch (e) { console.warn('anim failed', ex.id, e); }
  };
  const els = $$('[data-anim]', root);
  let io = null;
  if ('IntersectionObserver' in window && els.length > 6) {
    io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { mount(en.target); io.unobserve(en.target); } }), { rootMargin: '200px' });
    els.forEach(el => io.observe(el));
  } else els.forEach(mount);
  return () => { io && io.disconnect(); players.forEach(p => { try { p.destroy(); } catch { /* ignore */ } }); players.length = 0; };
}

// ---------- sound & haptics ----------
let actx = null;
export function unlockAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { try { actx = new AC(); } catch { actx = null; } }
}
/** kind: 'tick' | 'go' | 'done' */
export function beep(kind = 'tick') {
  if (!getState().settings.sound || !actx) return;
  const notes = kind === 'tick' ? [[880, 0, 0.08]] : kind === 'go' ? [[660, 0, 0.12], [990, 0.14, 0.2]] : [[523, 0, 0.14], [659, 0.15, 0.14], [784, 0.3, 0.3]];
  const t = actx.currentTime;
  for (const [f, at, dur] of notes) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t + at);
    g.gain.exponentialRampToValueAtTime(0.18, t + at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
    o.connect(g).connect(actx.destination);
    o.start(t + at); o.stop(t + at + dur + 0.05);
  }
}
export function buzz(pattern = [120]) {
  if (!getState().settings.sound) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; // browsers block vibrate before a real tap
  try { navigator.vibrate && navigator.vibrate(pattern); } catch { /* ignore */ }
}

// ---------- misc widgets ----------
export function stepper({ name, value, min = 0, max = 999, step = 1, label, unit = '' }) {
  return `<div class="stepper" data-stepper="${esc(name)}" data-min="${min}" data-max="${max}" data-step="${step}">
    <button type="button" class="step-btn" data-step-dir="-1" aria-label="Decrease ${esc(label || name)}">${icon('minus')}</button>
    <output class="step-val" aria-live="polite" aria-label="${esc(label || name)}"><span data-val>${value}</span>${unit ? `<small>${esc(unit)}</small>` : ''}</output>
    <button type="button" class="step-btn" data-step-dir="1" aria-label="Increase ${esc(label || name)}">${icon('plus')}</button></div>`;
}
/** Handles a click inside a stepper; returns { name, value } or null. */
export function handleStepper(e) {
  const btn = e.target.closest('[data-step-dir]'); if (!btn) return null;
  const st = btn.closest('[data-stepper]');
  const v = +st.querySelector('[data-val]').textContent;
  const nv = clamp(v + +btn.dataset.stepDir * +st.dataset.step, +st.dataset.min, +st.dataset.max);
  st.querySelector('[data-val]').textContent = nv;
  return { name: st.dataset.stepper, value: nv };
}

export function ring({ progress = 0, size = 180, label = '', sub = '', cls = '' }) {
  const r = 44, c = 2 * Math.PI * r;
  return `<div class="ring ${cls}" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="50" cy="50" r="${r}" class="ring-track"/>
      <circle cx="50" cy="50" r="${r}" class="ring-fill" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - clamp(progress, 0, 1))).toFixed(2)}" transform="rotate(-90 50 50)"/>
    </svg><div class="ring-label"><span class="ring-main">${label}</span>${sub ? `<span class="ring-sub">${sub}</span>` : ''}</div></div>`;
}
export function setRing(el, progress) {
  const f = el.querySelector('.ring-fill'); if (!f) return;
  const c = 2 * Math.PI * 44;
  f.setAttribute('stroke-dashoffset', (c * (1 - clamp(progress, 0, 1))).toFixed(2));
}

export function downloadFile(name, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
