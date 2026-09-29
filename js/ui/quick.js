// Quick workout picker (#/quick): minutes + goal, body area (chips or tap-the-body-map) or moment → one-off session 'Q'.
import { EXERCISES, FAMILIES, MUSCLES, renderBodyMap, generateQuickSession, availableFlows, MOMENTS, MORNING_TAISO_SESSION_ID } from './deps.js';
import { getState, update, todayISO } from '../store.js';
import { esc, icon, mountAnims, muscleName, toast } from './components.js';
import { GOALS, QUICK_MINUTES as MINUTES, sessionMinutes, startWorkout } from './model.js';
import { sessionPreviewHTML } from './plan.js';
import { EQUIP } from './onboarding.js';
import { timeChipsHTML, previewHTML as makerPreviewHTML } from './maker.js';

const QGOALS = GOALS.map(g => ({ ...g, name: g.id === 'flexibility' ? 'Flexibility' : g.id === 'skill' ? 'Skills' : g.id === 'health' ? 'General' : g.name }));
const BASE_FOCUS = [['full', 'Full body'], ['upper', 'Upper'], ['lower', 'Lower'], ['core', 'Core'], ['push', 'Push'], ['pull', 'Pull'], ['legs', 'Legs'], ['mobility', 'Mobility']];
/**
 * v1.2 foci: balance always (generic single-leg work works without any tradition); rotation once its families have
 * visible (animated) items; flow only when a flow is available to this user (verified, animated, suitable).
 */
function focusOptions() {
  const out = [...BASE_FOCUS, ['balance', 'Balance']];
  if (FAMILIES.rotation || FAMILIES.anti_rotation) out.push(['rotation', 'Rotation']);
  let flows = [];
  try { flows = availableFlows(getState().profile || null, EXERCISES); } catch { flows = []; }
  if (flows.length) out.push(['flow', 'Flow']);
  return out;
}
const REGIONS = [['upper', 'Upper body'], ['core', 'Core'], ['lower', 'Lower body']];
const DEFAULTS = { minutes: 20, mode: 'goal', goal: 'strength', focus: 'full', muscles: [], equipment: ['wall'], lowImpact: false, moment: null, momentMinutes: null };

// ---------- moments (docs/moments.md §4) ----------
const MOMENT_IDS = Object.keys(MOMENTS);
/** The chip order: roughly through the day, then the situational ones. */
const MOMENT_ORDER = ['morning', 'desk', 'energy', 'after_meal', 'wind_down', 'before_sport', 'after_sport', 'on_the_road', 'low_energy'].filter(id => MOMENTS[id]);
MOMENT_IDS.forEach(id => { if (!MOMENT_ORDER.includes(id)) MOMENT_ORDER.push(id); });
/**
 * A gentle clock hint (moments.md §4.2): 05:00–10:00 Morning wake-up, 12:00–14:00 After a meal, 14:00–16:30 Energy boost,
 * after 20:30 (and on through the small hours) Wind down. It only marks a chip; it never selects or starts anything.
 */
export function momentHint(d = new Date()) {
  const t = d.getHours() * 60 + d.getMinutes();
  const id = t >= 300 && t < 600 ? 'morning' : t >= 720 && t < 840 ? 'after_meal' : t >= 840 && t < 990 ? 'energy' : t >= 1230 || t < 300 ? 'wind_down' : null; // late night counts as evening
  return id && MOMENTS[id] ? id : null;
}
const taisoToday = () => getState().logs.some(l => l.date === todayISO() && l.sessionId === MORNING_TAISO_SESSION_ID);
const momentMins = () => {
  const m = MOMENTS[q.moment];
  return m ? (m.minutes.includes(q.momentMinutes) ? q.momentMinutes : m.def) : null;
};
const MOMENT_TAISO_HELPER = 'You’ve done Morning Taisō today. This adds a little more.';

let q = null, seed = 0, session = null, destroyPreview = null;

const pressed = b => `aria-pressed="${b ? 'true' : 'false'}"`;
const chip = (act, val, label, on, extra = '') => `<button type="button" class="chip" data-act="${act}" data-val="${esc(val)}" ${pressed(on)} ${extra}>${label}</button>`;

function remember() { const picks = { ...q }; update(s => { s.settings.quick = picks; }); }

function request() {
  const p = getState().profile;
  // The engine seeds variety from `date` only, so Shuffle appends a counter to it.
  const r = { minutes: q.minutes, date: seed ? `${todayISO()}#${seed}` : todayISO() };
  if (q.mode === 'moment' && MOMENTS[q.moment]) { r.minutes = momentMins(); r.moment = q.moment; }
  else if (q.mode === 'goal') r.goal = q.goal;
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

function momentHTML() {
  const hint = momentHint();
  const m = MOMENTS[q.moment];
  const mins = momentMins();
  const helper = m && q.moment === 'morning' && taisoToday() ? MOMENT_TAISO_HELPER : m?.helper;
  return `<div class="chips qgoals qmoments" role="group" aria-label="Moment">${MOMENT_ORDER.map(id => {
    const x = MOMENTS[id], isHint = id === hint && q.moment !== id;
    return chip('moment', id, `<span class="qk" aria-hidden="true">${x.mark}</span>${esc(x.label)}${isHint ? '<span class="qhint-dot" aria-hidden="true"></span>' : ''}`, q.moment === id,
      `aria-label="${esc(x.label)}${isHint ? ', suits this time of day' : ''}"${isHint ? ' data-hint="1"' : ''}`);
  }).join('')}</div>
  ${m ? `<div class="qmoment" aria-live="polite">
      <p class="qm-helper">${esc(helper)}</p>
      <div class="qm-times">${timeChipsHTML(mins, { options: m.minutes, act: 'mmin', label: 'Minutes' })}</div>
      ${m.always ? `<p class="small muted qm-always">${esc(m.always)}</p>` : ''}
      ${m.why ? `<details class="qm-why"><summary class="small">Why this shape?</summary><p class="small muted">${esc(m.why)}</p></details>` : ''}
    </div>`
    : `<p class="small muted qm-pick">${hint ? `Pick a moment. The one marked with a dot suits this time of day.` : 'Pick a moment to see what it includes.'}</p>`}`;
}

function hintLineHTML() {
  const hint = momentHint();
  if (!hint || q.mode === 'moment') return '';
  const x = MOMENTS[hint];
  return `<button type="button" class="qhint" data-act="hint" data-val="${hint}"><span class="qk" aria-hidden="true">${x.mark}</span><span>Suits this time of day: <strong>${esc(x.label)}</strong></span></button>`;
}

function formHTML() {
  const p = getState().profile;
  const isMoment = q.mode === 'moment';
  return `
  ${isMoment ? '' : `<section class="section"><h2 class="section-title" id="qt">Time</h2>
    <div class="chips" role="group" aria-labelledby="qt">${MINUTES.map(m => chip('min', m, `${m} min`, q.minutes === m)).join('')}</div></section>`}
  <section class="section"><h2 class="section-title">Train for</h2>
    <div class="seg qseg" role="group" aria-label="Choose by">${chip('mode', 'goal', 'A goal', q.mode === 'goal')}${chip('mode', 'area', 'A body area', q.mode === 'area')}${chip('mode', 'moment', 'A moment', isMoment)}</div>
    ${hintLineHTML()}
    ${q.mode === 'goal'
      ? `<div class="chips qgoals" role="group" aria-label="Goal">${QGOALS.map(g => chip('goal', g.id, `<span class="qk" aria-hidden="true">${g.emoji}</span>${g.name}`, q.goal === g.id, `aria-label="${g.name}"`)).join('')}</div>`
      : isMoment ? momentHTML()
      : `<div class="chips qfocus" role="group" aria-label="Body area or focus">${focusOptions().map(([id, l]) => chip('focus', id, l, !q.muscles.length && q.focus === id)).join('')}</div>${mapHTML()}`}
  </section>
  ${p ? '' : `<section class="section"><h2 class="section-title" id="qk">Anything to hand? <span class="tag">optional</span></h2>
    <div class="equip-grid" role="group" aria-labelledby="qk">${EQUIP.map(([id, l, svg]) => `<button type="button" class="equip" data-act="equip" data-val="${id}" ${pressed(q.equipment.includes(id))} aria-label="${esc(l)}">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg}</svg><span>${l}</span></button>`).join('')}</div>
    <label class="switch-row card"><span><span class="opt-name">Low impact?</span><span class="opt-desc">No jumping — kinder to joints and neighbours.</span></span>
      <input type="checkbox" class="switch" data-act="low" ${q.lowImpact ? 'checked' : ''}></label></section>`}
  ${isMoment ? '' : `<button type="button" class="btn btn-primary btn-lg btn-block qgen" data-act="generate">${icon('play', { size: 18 })} ${session ? 'Regenerate' : 'Generate workout'}</button>`}
  <div data-preview></div>`;
}

function previewHTML() {
  if (!session) return '';
  const n = session.blocks.reduce((a, b) => a + b.items.length, 0);
  const actions = `<div class="btn-row qactions"><button type="button" class="btn btn-ghost" data-act="shuffle">Shuffle</button>
      <button type="button" class="btn btn-primary" data-act="start">${icon('play', { size: 18 })} Start${session.moment ? ` · ${sessionMinutes(session)} min` : ''}</button></div>`;
  // A moment reuses the "Make a workout" preview (text list + the session note, e.g. the moderate-bursts downgrade).
  if (session.moment) {
    return `<section class="card qpreview qpreview-moment" aria-label="Workout preview"><p class="eyebrow">Ready when you are</p>
      ${makerPreviewHTML(session)}
      <p class="small muted qm-light">${!getState().profile ? 'Keeps your day streak going.' : session.light
        ? 'Keeps your day streak going. Moments of 10 min or less don’t count towards your weekly sessions.'
        : 'Counts towards your weekly sessions, like any Quick workout.'}</p>
      ${actions}</section>`;
  }
  return `<section class="card qpreview" aria-label="Workout preview">
    <p class="eyebrow">Ready when you are</p><h2 class="card-title">${esc(session.name)}</h2>
    <p class="muted small">~${sessionMinutes(session)} min · ${n} exercise${n === 1 ? '' : 's'}</p>
    ${sessionPreviewHTML(session)}
    ${actions}</section>`;
}

/**
 * Morning wake-up after today's Morning Taisō (moments.md §4.3; UI-only, the engine doesn't know): at every length the
 * session follows on from the Taisō instead of repeating it. We build one chip longer (to make up the Taisō's ~3 min),
 * drop the Taisō block, trim to the chosen length (never the balance block the chosen length would have) or top it up
 * from other Morning builds' moves, and name the session by what it really is. `light` follows the CHOSEN chip.
 */
function afterTaiso(req, build) {
  const opts = MOMENTS.morning.minutes;
  const target = req.minutes;
  const isTaiso = it => it.exerciseId === 'radio_taiso_1';
  const longer = opts.find(m => m > target) ?? target;
  const full = build({ ...req, minutes: longer });
  if (!full) return null;
  // The balance hold comes with 15 min and up (engine rule): keep it then, leave it out below.
  const keepBal = target >= 15;
  const blocks = full.blocks.filter(b => !b.items?.some(isTaiso) && (keepBal || b.kind !== 'balance')).map(b => ({ ...b, items: [...b.items] }));
  const out = { ...full, blocks, light: target <= 10, note: 'Follows on from this morning’s Morning Taisō, so it doesn’t repeat it.' };
  const count = () => blocks.reduce((a, b) => a + b.items.length, 0);
  const est = () => sessionMinutes(out);
  // Too long: trim from the end, but never the balance block.
  while (est() > target && count() > 2) {
    const last = [...blocks].reverse().find(b => b.kind !== 'balance' && b.items.length);
    if (!last) break;
    last.items.pop();
  }
  // Too short (nothing longer to build from, e.g. 20 min): top up with more of the moment's own moves.
  if (est() < target * 0.9) {
    const loosen = blocks.find(b => b.kind === 'mobility') || blocks[0];
    const have = new Set(blocks.flatMap(b => b.items.map(i => i.exerciseId)));
    for (let k = 1; k <= 8 && est() < target * 0.95; k++) {
      const alt = build({ ...req, minutes: target, date: `${req.date}~${k}` });
      for (const it of (alt?.blocks || []).filter(b => b.kind === 'mobility').flatMap(b => b.items)) {
        if (have.has(it.exerciseId) || isTaiso(it)) continue;
        loosen.items.push(it); have.add(it.exerciseId);
        if (est() > target * 1.1) { loosen.items.pop(); have.delete(it.exerciseId); break; }
        if (est() >= target * 0.95) break;
      }
    }
  }
  out.blocks = blocks.filter(b => b.items.length);
  if (count() < 2) return null;
  out.name = `${Math.max(1, est())}-min ${MOMENTS.morning.label}`;
  return out;
}

export function render(root, ctx) {
  q = { ...DEFAULTS, ...(getState().settings.quick || {}) };
  q.muscles = [...(q.muscles || [])]; q.equipment = [...(q.equipment || ['wall'])];
  if (!focusOptions().some(([id]) => id === q.focus)) q.focus = 'full'; // e.g. 'flow' saved while previewing
  if (q.moment && !MOMENTS[q.moment]) q.moment = null;
  if (!['goal', 'area', 'moment'].includes(q.mode)) q.mode = 'goal';
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

  const generate = ({ scroll = true } = {}) => {
    const s = getState();
    try {
      const req = request();
      const build = r => generateQuickSession(r, s.profile || null, s.profile ? s.levels : null, EXERCISES);
      session = null;
      if (req.moment === 'morning' && taisoToday()) { session = afterTaiso(req, build); if (session) req.afterTaiso = true; }
      if (!session) session = build(req);
      if (session) session.request = req;
      if (!session || !session.blocks?.some(b => b.items?.length)) { session = null; toast('No exercises fit those picks. Try another area or add some kit.'); }
    } catch (e) {
      session = null;
      toast(e?.code === 'AGE_UNDER_13' ? 'Kitaeru is for ages 13 and up.' : 'Couldn’t build that workout. Try different picks.');
      if (e?.code !== 'AGE_UNDER_13') console.error(e);
    }
    remember();
    if (scroll) { draw(); root.querySelector('.qpreview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  };
  // A moment builds as soon as it is picked (the maker's pattern): pick, glance, start. Nothing ever starts on its own.
  const momentReady = () => q.mode === 'moment' && !!MOMENTS[q.moment];
  if (momentReady()) generate({ scroll: false });
  draw();

  root.addEventListener('click', e => {
    const m = e.target.closest('[data-qmap] [data-muscle]');
    if (m) { const id = m.dataset.muscle; q.muscles = q.muscles.includes(id) ? q.muscles.filter(x => x !== id) : [...q.muscles, id]; invalidate(); remember(); draw({ keep: null }); return; }
    const a = e.target.closest('[data-act]'); if (!a || a.type === 'checkbox') return;
    const v = a.dataset.val, sel = `[data-act="${a.dataset.act}"][data-val="${v}"]`;
    switch (a.dataset.act) {
      case 'back': if (history.length > 1) history.back(); else ctx.go(getState().profile ? '#/today' : '#/welcome'); return;
      case 'min': q.minutes = +v; break;
      case 'mode': q.mode = v; if (momentReady()) { generate({ scroll: false }); draw({ keep: sel }); return; } break;
      case 'hint': q.mode = 'moment'; q.moment = v; q.momentMinutes = MOMENTS[v].def; seed = 0; generate({ scroll: false }); draw({ keep: `[data-act="moment"][data-val="${v}"]` }); return;
      case 'moment': if (q.moment !== v) { q.moment = v; q.momentMinutes = MOMENTS[v].def; seed = 0; } generate({ scroll: false }); draw({ keep: sel }); return;
      case 'mmin': q.momentMinutes = +v; generate({ scroll: false }); draw({ keep: `[data-act="mmin"][data-val="${v}"]` }); return;
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
    invalidate(); remember(); if (momentReady()) generate({ scroll: false }); draw({ keep: sel });
  });
  root.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-muscle-check]')) {
      const id = t.dataset.muscleCheck;
      q.muscles = t.checked ? [...new Set([...q.muscles, id])] : q.muscles.filter(x => x !== id);
      invalidate(); remember(); draw({ keep: `[data-muscle-check="${id}"]` });
    }
    if (t.matches('[data-act="low"]')) { q.lowImpact = t.checked; invalidate(); remember(); if (momentReady()) generate({ scroll: false }); drawPreview(); }
  });
  return () => { destroyPreview && destroyPreview(); destroyPreview = null; };
}
