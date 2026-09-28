// Quick workout picker (#/quick): minutes + goal or body area (chips or tap-the-body-map) → one-off session 'Q'.
import { EXERCISES, MUSCLES, renderBodyMap, generateQuickSession } from './deps.js';
import { getState, update, todayISO } from '../store.js';
import { esc, icon, mountAnims, muscleName, toast } from './components.js';
import { GOALS, sessionMinutes, startWorkout } from './model.js';
import { sessionPreviewHTML } from './plan.js';
import { EQUIP } from './onboarding.js';

const MINUTES = [5, 10, 15, 20, 30, 45, 60];
const QGOALS = GOALS.map(g => ({ ...g, name: g.id === 'flexibility' ? 'Flexibility' : g.id === 'skill' ? 'Skills' : g.id === 'health' ? 'General' : g.name }));
const FOCUS = [['full', 'Full body'], ['upper', 'Upper'], ['lower', 'Lower'], ['core', 'Core'], ['push', 'Push'], ['pull', 'Pull'], ['legs', 'Legs'], ['mobility', 'Mobility']];
const REGIONS = [['upper', 'Upper body'], ['core', 'Core'], ['lower', 'Lower body']];
const DEFAULTS = { minutes: 20, mode: 'goal', goal: 'strength', focus: 'full', muscles: [], equipment: ['wall'], lowImpact: false };

let q = null, seed = 0, session = null, destroyPreview = null;

const pressed = b => `aria-pressed="${b ? 'true' : 'false'}"`;
const chip = (act, val, label, on, extra = '') => `<button type="button" class="chip" data-act="${act}" data-val="${esc(val)}" ${pressed(on)} ${extra}>${label}</button>`;

function remember() { const picks = { ...q }; update(s => { s.settings.quick = picks; }); }

function request() {
  const p = getState().profile;
  // The engine seeds variety from `date` only, so Shuffle appends a counter to it.
  const r = { minutes: q.minutes, date: seed ? `${todayISO()}#${seed}` : todayISO() };
  if (q.mode === 'goal') r.goal = q.goal;
  else if (q.muscles.length) r.muscles = [...q.muscles];
  else r.focus = q.focus || 'full';
  if (!p) Object.assign(r, { equipment: [...q.equipment], space: 'medium', lowImpact: !!q.lowImpact });
  return r;
}

function mapHTML() {
  const sel = q.muscles;
  return `<div class="qmap-wrap">
    <div class="qmap" data-qmap aria-hidden="true"></div>
    <p class="qsel small" aria-live="polite">${sel.length ? `<strong>Selected:</strong> ${sel.map(muscleName).join(', ')} <button type="button" class="link" data-act="clear-muscles">Clear</button>` : 'Tap muscles on the map to target them, or pick an area above.'}</p>
    <details class="qlist"><summary>Choose muscles from a list</summary>
      <fieldset class="qlist-grid"><legend class="sr-only">Muscles to target</legend>
      ${REGIONS.map(([rid, rname]) => `<div class="qlist-col"><p class="qlist-h">${rname}</p>${Object.entries(MUSCLES).filter(([, m]) => (m.region || 'upper') === rid)
        .map(([id, m]) => `<label class="check"><input type="checkbox" data-muscle-check="${id}" ${sel.includes(id) ? 'checked' : ''}><span>${esc(m.name)}</span></label>`).join('')}</div>`).join('')}
      </fieldset></details></div>`;
}

function formHTML() {
  const p = getState().profile;
  return `
  <section class="section"><h2 class="section-title" id="qt">Time</h2>
    <div class="chips" role="group" aria-labelledby="qt">${MINUTES.map(m => chip('min', m, `${m} min`, q.minutes === m)).join('')}</div></section>
  <section class="section"><h2 class="section-title">Train for</h2>
    <div class="seg" role="group" aria-label="Choose by">${chip('mode', 'goal', 'A goal', q.mode === 'goal')}${chip('mode', 'area', 'A body area', q.mode === 'area')}</div>
    ${q.mode === 'goal'
      ? `<div class="chips qgoals" role="group" aria-label="Goal">${QGOALS.map(g => chip('goal', g.id, `<span class="qk" aria-hidden="true">${g.emoji}</span>${g.name}`, q.goal === g.id, `aria-label="${g.name}"`)).join('')}</div>`
      : `<div class="chips qfocus" role="group" aria-label="Body area">${FOCUS.map(([id, l]) => chip('focus', id, l, !q.muscles.length && q.focus === id)).join('')}</div>${mapHTML()}`}
  </section>
  ${p ? '' : `<section class="section"><h2 class="section-title" id="qk">Anything to hand? <span class="tag">optional</span></h2>
    <div class="equip-grid" role="group" aria-labelledby="qk">${EQUIP.map(([id, l, svg]) => `<button type="button" class="equip" data-act="equip" data-val="${id}" ${pressed(q.equipment.includes(id))} aria-label="${esc(l)}">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg}</svg><span>${l}</span></button>`).join('')}</div>
    <label class="switch-row card"><span><span class="opt-name">Low impact?</span><span class="opt-desc">No jumping — kinder to joints and neighbours.</span></span>
      <input type="checkbox" class="switch" data-act="low" ${q.lowImpact ? 'checked' : ''}></label></section>`}
  <button type="button" class="btn btn-primary btn-lg btn-block qgen" data-act="generate">${icon('play', { size: 18 })} ${session ? 'Regenerate' : 'Generate workout'}</button>
  <div data-preview></div>`;
}

function previewHTML() {
  if (!session) return '';
  const n = session.blocks.reduce((a, b) => a + b.items.length, 0);
  return `<section class="card qpreview" aria-label="Workout preview">
    <p class="eyebrow">Ready when you are</p><h2 class="card-title">${esc(session.name)}</h2>
    <p class="muted small">~${sessionMinutes(session)} min · ${n} exercise${n === 1 ? '' : 's'}</p>
    ${sessionPreviewHTML(session)}
    <div class="btn-row qactions"><button type="button" class="btn btn-ghost" data-act="shuffle">Shuffle</button>
      <button type="button" class="btn btn-primary" data-act="start">${icon('play', { size: 18 })} Start</button></div></section>`;
}

export function render(root, ctx) {
  q = { ...DEFAULTS, ...(getState().settings.quick || {}) };
  q.muscles = [...(q.muscles || [])]; q.equipment = [...(q.equipment || ['wall'])];
  session = null; seed = 0;
  const hasProfile = !!getState().profile;
  root.innerHTML = `<div class="screen quick">
    <header class="screen-head qhead"><button class="icon-btn" data-act="back" aria-label="Back">${icon('back')}</button>
      <div><p class="eyebrow">即 · Quick workout</p><h1 class="title">Just jump in</h1>
      <p class="muted small">${hasProfile ? 'A one-off session that respects your levels, kit and injuries.' : 'No setup needed. You can build a full plan any time.'}</p></div></header>
    <div data-form></div></div>`;
  const form = root.querySelector('[data-form]');

  const drawMap = () => {
    const m = root.querySelector('[data-qmap]');
    if (!m) return;
    renderBodyMap(m, { primary: q.muscles, secondary: [], size: 320 });
    m.querySelectorAll('[data-muscle]').forEach(g => g.classList.add('qm-hit'));
  };
  const drawPreview = () => {
    destroyPreview && destroyPreview();
    const el = root.querySelector('[data-preview]');
    el.innerHTML = previewHTML();
    destroyPreview = mountAnims(el);
  };
  const draw = ({ keep } = {}) => {
    const scroll = window.scrollY;
    const openList = root.querySelector('.qlist')?.open;
    form.innerHTML = formHTML();
    if (openList) { const l = root.querySelector('.qlist'); if (l) l.open = true; }
    drawMap(); drawPreview();
    if (keep) { window.scrollTo(0, scroll); root.querySelector(keep)?.focus({ preventScroll: true }); }
  };
  const invalidate = () => { session = null; };
  draw();

  const generate = () => {
    const s = getState();
    try {
      const req = request();
      session = generateQuickSession(req, s.profile || null, s.profile ? s.levels : null, EXERCISES);
      if (session) session.request = req;
      if (!session || !session.blocks?.some(b => b.items?.length)) { session = null; toast('No exercises fit those picks. Try another area or add some kit.'); }
    } catch (e) {
      session = null;
      toast(e?.code === 'AGE_UNDER_13' ? 'Kitaeru is for ages 13 and up.' : 'Couldn’t build that workout. Try different picks.');
      if (e?.code !== 'AGE_UNDER_13') console.error(e);
    }
    remember();
    draw();
    root.querySelector('.qpreview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  root.addEventListener('click', e => {
    const m = e.target.closest('[data-qmap] [data-muscle]');
    if (m) { const id = m.dataset.muscle; q.muscles = q.muscles.includes(id) ? q.muscles.filter(x => x !== id) : [...q.muscles, id]; invalidate(); remember(); draw({ keep: null }); return; }
    const a = e.target.closest('[data-act]'); if (!a || a.type === 'checkbox') return;
    const v = a.dataset.val, sel = `[data-act="${a.dataset.act}"][data-val="${v}"]`;
    switch (a.dataset.act) {
      case 'back': if (history.length > 1) history.back(); else ctx.go(getState().profile ? '#/today' : '#/welcome'); return;
      case 'min': q.minutes = +v; break;
      case 'mode': q.mode = v; break;
      case 'goal': q.goal = v; break;
      case 'focus': q.focus = v; q.muscles = []; break;
      case 'clear-muscles': q.muscles = []; break;
      case 'equip': q.equipment = q.equipment.includes(v) ? q.equipment.filter(x => x !== v) : [...q.equipment, v]; break;
      case 'generate': generate(); return;
      case 'shuffle': seed++; generate(); return;
      case 'start': {
        if (!session) return;
        if (!getState().profile) update(s => { s.settings.quickUser = true; });
        startWorkout({ ...session, id: 'Q' }, { sessionId: 'Q' });
        return;
      }
      default: return;
    }
    invalidate(); remember(); draw({ keep: sel });
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-muscle-check]')) {
      const id = t.dataset.muscleCheck;
      q.muscles = t.checked ? [...new Set([...q.muscles, id])] : q.muscles.filter(x => x !== id);
      invalidate(); remember(); draw({ keep: `[data-muscle-check="${id}"]` });
    }
    if (t.matches('[data-act="low"]')) { q.lowImpact = t.checked; invalidate(); remember(); drawPreview(); }
  });
  return () => { destroyPreview && destroyPreview(); destroyPreview = null; };
}
