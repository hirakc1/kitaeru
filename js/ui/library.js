// Library tab: searchable, filterable exercise grid with a detail sheet (#/library/:id).
import { EXERCISES, FAMILIES, MUSCLES, byId, EQUIPMENT, TRADITIONS, flowSteps, createSkeletonPlayer, renderBodyMap, swapAlternatives, unavailableReason } from './deps.js';
import { getState } from '../store.js';
import { esc, icon, openSheet, mountAnims, muscleName, familyName, ladder, isAvailable, isProgression, reducedMotion, nativeNameHTML, fmtDur, stepName, stepCount } from './components.js';
import { cardFor, cardChipHTML, visibleCards, openCultureCard, traditionName } from './culture.js';
import { makeButtonHTML, onMakeClick } from './maker.js';

// Categories that have visible exercises (v1.2 adds flow, balance and breath once their items are visible).
const ALL_CATS = [['strength', 'Strength'], ['core', 'Core'], ['skill', 'Skill'], ['conditioning', 'Cardio'], ['mobility', 'Mobility'], ['warmup', 'Warm-up'],
  ['flow', 'Flow'], ['balance', 'Balance'], ['breath', 'Breath']];
const CATS = [['', 'All'], ...ALL_CATS.filter(([c]) => EXERCISES.some(e => e.category === c))];
const EQUIP_NAME = Object.fromEntries(Object.entries(EQUIPMENT).map(([k, v]) => [k, v.name]));
const PLANES = [['sagittal', 'Forward & back (sagittal)'], ['frontal', 'Side to side (frontal)'], ['transverse', 'Turning (transverse)']];
// v1.2 filters exist only when something visible can match them: nothing tradition-related leaks while gated.
const TRAD_OPTS = () => Object.keys(TRADITIONS).filter(id => TRADITIONS[id].kind !== 'explainer' && EXERCISES.some(e => e.tradition === id));
const PLANE_OPTS = () => PLANES.filter(([p]) => EXERCISES.some(e => (e.planes || []).includes(p)));
const f = { q: '', muscle: '', family: '', mine: false, cat: '', tradition: '', plane: '' }; // filters persist for the session

let destroyGrid = null, closeDetail = null;

function matches(e, profile) {
  if (f.cat && e.category !== f.cat) return false;
  if (f.family && e.family !== f.family) return false;
  if (f.muscle && !e.muscles.primary.includes(f.muscle) && !e.muscles.secondary.includes(f.muscle)) return false;
  if (f.mine && !isAvailable(e, profile)) return false;
  if (f.tradition && e.tradition !== f.tradition) return false;
  if (f.plane && !(e.planes || []).includes(f.plane)) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const nn = e.nativeName ? `${e.nativeName.text} ${e.nativeName.romanised || ''} ${(e.nativeName.alt || []).map(a => a.text).join(' ')}` : '';
    const hay = `${e.name} ${(e.aka || []).join(' ')} ${nn} ${e.tradition ? traditionName(e.tradition) : ''} ${familyName(e.family)} ${e.category} ${[...e.muscles.primary, ...e.muscles.secondary].map(muscleName).join(' ')}`.toLowerCase();
    if (!q.split(/\s+/).every(t => hay.includes(t))) return false;
  }
  return true;
}

function gridHTML() {
  const profile = getState().profile;
  const list = EXERCISES.filter(e => matches(e, profile)).sort((a, b) => FAM_ORDER.indexOf(a.family) - FAM_ORDER.indexOf(b.family) || a.level - b.level);
  if (!list.length) return '<p class="empty muted">No exercises match. Try clearing a filter.</p>';
  return `<ul class="lib-grid">${list.map(e => {
    const ok = isAvailable(e, profile);
    return `<li><a class="lib-card ${ok ? '' : 'na'}" href="#/library/${e.id}">
      <div class="lib-thumb" data-anim="${e.id}" data-size="104"></div>
      ${e.nativeName ? nativeNameHTML(e.nativeName, { roman: false, cls: 'lib-native' }) : ''}<span class="lib-name">${esc(e.name)}</span>
      <span class="lib-meta">${esc(familyName(e.family))}${e.rung === false ? ' · Variety swap' : PROG(e) ? ` · L${e.level}` : ''}</span>
      ${ok ? '' : `<span class="lib-na">${esc(whyNot(e, profile)?.label || 'not for you now')}</span>`}</a></li>`;
  }).join('')}</ul><p class="small muted center">${list.length} of ${EXERCISES.length} exercises</p>`;
}
const FAM_ORDER = Object.keys(FAMILIES);
/** Why a move isn't available to this profile (planner unavailableReason): { label, detail } or null. */
function whyNot(e, profile) { try { return unavailableReason(e, profile); } catch { return null; } }
const PROG = e => isProgression(e.family);

/** "Make a workout" for the current pool filter (category / tradition / pattern); nothing on All or an empty pool. */
function makerHTML() {
  return f.cat || f.tradition || f.family ? makeButtonHTML({ category: f.cat, tradition: f.tradition, family: f.family }, { cls: 'lib-make' }) : '';
}

function redrawGrid(root) {
  destroyGrid && destroyGrid();
  const m = root.querySelector('[data-maker]');
  if (m) m.innerHTML = makerHTML();
  const g = root.querySelector('[data-grid]');
  g.innerHTML = gridHTML();
  destroyGrid = mountAnims(g);
}

/** "Traditions" row of culture cards; not rendered while every tradition is gated. */
function cardsRowHTML() {
  const ids = visibleCards();
  if (!ids.length) return '';
  return `<div class="cc-row" role="group" aria-label="Movement traditions">${ids.map(cardChipHTML).join('')}</div>`;
}

export function render(root, ctx) {
  // A filter whose option has gone (e.g. preview switched off) must not hide everything.
  if (f.tradition && !TRAD_OPTS().includes(f.tradition)) f.tradition = '';
  if (f.plane && !PLANE_OPTS().some(([p]) => p === f.plane)) f.plane = '';
  if (f.cat && !CATS.some(([c]) => c === f.cat)) f.cat = '';
  if (f.family && !FAMILIES[f.family]) f.family = '';
  const muscles = Object.entries(MUSCLES);
  root.innerHTML = `
  <div class="screen library">
    <header class="screen-head"><p class="eyebrow">技の書 · Library</p><h1 class="title">Exercises</h1></header>
    <div class="lib-filters">
      <label class="search"><span class="sr-only">Search exercises</span>${icon('search', { size: 18 })}
        <input type="search" class="input" placeholder="Search push-up, glutes, hold…" value="${esc(f.q)}" data-f="q" autocomplete="off"></label>
      <div class="scroll-x" data-scrollx><div class="chips chips-scroll" role="group" aria-label="Category">${CATS.map(([v, l]) => `<button type="button" class="chip" data-cat="${v}" aria-pressed="${f.cat === v}">${l}</button>`).join('')}</div></div>
      ${cardsRowHTML()}
      <div class="filter-row">
        <label class="select"><span class="sr-only">Muscle group</span><select data-f="muscle"><option value="">All muscles</option>${muscles.map(([id, m]) => `<option value="${id}" ${f.muscle === id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
        <label class="select"><span class="sr-only">Family or pattern</span><select data-f="family"><option value="">All patterns</option>${Object.entries(FAMILIES).map(([id, fm]) => `<option value="${id}" ${f.family === id ? 'selected' : ''}>${esc(fm.name)}</option>`).join('')}</select></label>
        ${TRAD_OPTS().length ? `<label class="select"><span class="sr-only">Tradition</span><select data-f="tradition"><option value="">All traditions</option>${TRAD_OPTS().map(id => `<option value="${id}" ${f.tradition === id ? 'selected' : ''}>${esc(TRADITIONS[id].name)}</option>`).join('')}</select></label>` : ''}
        ${PLANE_OPTS().length ? `<label class="select"><span class="sr-only">Plane of motion</span><select data-f="plane"><option value="">All planes of motion</option>${PLANE_OPTS().map(([id, l]) => `<option value="${id}" ${f.plane === id ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>` : ''}
      </div>
      <label class="switch-row switch-inline"><span class="small">Only what I can do with my kit</span><input type="checkbox" class="switch" data-f="mine" ${f.mine ? 'checked' : ''}></label>
    </div>
    <div data-maker></div>
    <div data-grid></div>
  </div>`;
  redrawGrid(root);
  // The category row scrolls sideways: a fade on the right says there is more until the end is reached.
  const sx = root.querySelector('[data-scrollx]'), row = sx.firstElementChild;
  const edge = () => sx.classList.toggle('at-end', row.scrollLeft + row.clientWidth >= row.scrollWidth - 4);
  row.addEventListener('scroll', edge, { passive: true }); edge();
  root.querySelector('[data-cat][aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

  let t = 0;
  root.addEventListener('input', e => {
    const k = e.target.dataset.f; if (!k) return;
    f[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    clearTimeout(t); t = setTimeout(() => redrawGrid(root), k === 'q' ? 150 : 0);
  });
  root.addEventListener('change', e => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') { const k = e.target.dataset.f; f[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; redrawGrid(root); } });
  root.addEventListener('click', e => {
    if (onMakeClick(e)) return;
    const cc = e.target.closest('[data-culture]');
    if (cc) { openCultureCard(cc.dataset.culture); return; }
    const c = e.target.closest('[data-cat]'); if (!c) return;
    f.cat = c.dataset.cat;
    root.querySelectorAll('[data-cat]').forEach(b => b.setAttribute('aria-pressed', String(b === c)));
    redrawGrid(root);
  });
  update(root, ctx);
  return () => { destroyGrid && destroyGrid(); destroyGrid = null; if (closeDetail) { const c = closeDetail; closeDetail = null; c(); } };
}

export function update(root, ctx) {
  const id = ctx.params[0];
  if (closeDetail) { const c = closeDetail; closeDetail = null; c(); }
  if (id && byId[id]) openDetail(id);
  else if (id) history.replaceState(null, '', '#/library');
}

/** A flow's steps for the detail sheet (full version, no personal adaptations). */
function flowStepsHTML(e) {
  const steps = flowSteps(e.id);
  if (!steps.length) return '';
  return `<h3 class="h3">The sequence</h3><ol class="fl-steps fl-steps-static">${steps.map((st, i) => `<li class="fl-step"><span class="fl-n">${i + 1}</span>
    <span class="fl-body">${st.exercise?.nativeName ? nativeNameHTML(st.exercise.nativeName, { cls: 'fl-native' }) : ''}<span class="fl-name">${esc(stepName(st, i, steps.length))}</span>
    <span class="small muted">${esc(stepCount(st))}${st.cue ? ` · ${esc(st.cue)}` : ''}</span>${st.exercise?.adaptation ? '<span class="badge badge-gold">Kitaeru adaptation</span>' : ''}</span></li>`).join('')}</ol>`;
}

function detailHTML(e) {
  const profile = getState().profile;
  const lad = ladder(e.family);
  const ok = isAvailable(e, profile);
  const target = e.mode === 'flow' ? `Flow · about ${fmtDur(e.estSec || 0)}` : e.mode === 'hold' ? 'Timed hold' : 'Reps';
  const card = cardFor(e);
  const trad = e.tradition && TRADITIONS[e.tradition];
  const mistakes = e.commonMistakes || e.mistakes || [];
  return `<div class="detail">
    <div class="detail-stage" data-stage></div>
    ${trad ? `<p class="origin-line">From <strong>${esc(trad.name)}</strong>${trad.region ? ` · ${esc(trad.region)}` : ''}${card ? ` <button type="button" class="link" data-culture="${esc(card)}">About ${esc(trad.name)}</button>` : ''}</p>`
      : card ? `<p class="origin-line"><button type="button" class="link" data-culture="${esc(card)}">Why train ${esc(TRADITIONS[card].name.toLowerCase())}?</button></p>` : ''}
    <div class="badges"><span class="badge">${esc(familyName(e.family))}</span>${PROG(e) && e.rung === false ? '<span class="badge">Variety swap</span>' : PROG(e) ? `<span class="badge">Level ${lad.indexOf(e) + 1} of ${lad.length}</span>` : ''}
      <span class="badge">${target}${e.unilateral ? ' · per side' : ''}</span><span class="badge">Difficulty ${e.difficulty}/10</span>${e.impact === 'high' ? '<span class="badge badge-gold">High impact</span>' : ''}</div>
    ${ok ? '' : `<p class="note small na-note">${icon('info', { size: 18 })}<span><strong>Not in your plans right now.</strong> ${esc(whyNot(e, profile)?.detail || '')}</span></p>`}
    ${e.description ? `<p>${esc(e.description)}</p>` : ''}
    <div class="detail-muscles"><div class="bodymap" data-bodymap></div>
      <div><h3 class="h3">Muscles</h3><p class="small"><span class="key key-p"></span>${e.muscles.primary.map(muscleName).join(', ')}</p>
      ${e.muscles.secondary.length ? `<p class="small muted"><span class="key key-s"></span>${e.muscles.secondary.map(muscleName).join(', ')}</p>` : ''}</div></div>
    ${e.cues?.length ? `<h3 class="h3">Cues</h3><ol class="cues">${e.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}
    ${e.mode === 'flow' ? flowStepsHTML(e) : ''}
    ${e.attribution ? `<p class="small muted cc-attr"><span class="label">Based on</span> ${esc(e.attribution[0].toUpperCase() + e.attribution.slice(1))}</p>` : ''}
    ${mistakes.length ? `<h3 class="h3">Common mistakes</h3><ul class="mistakes">${mistakes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    <h3 class="h3">You’ll need</h3><p class="small">${e.equipment.length ? e.equipment.map(q => EQUIP_NAME[q] || q).join(', ') : 'Nothing but the floor'} · ${e.space} space${e.stress?.length ? ` · loads: ${e.stress.map(x => x.replace('_', ' ')).join(', ')}` : ''}</p>
    ${similarHTML(e, profile)}
    ${lad.length > 1 && PROG(e) ? `<h3 class="h3">Ladder</h3><ol class="ladder-v">${lad.map(x => `<li class="${x.id === e.id ? 'cur' : ''}">${x.id === e.id ? `<span>${esc(x.name)}</span>` : `<a href="#/library/${x.id}">${esc(x.name)}</a>`}<span class="small muted">${PROG(x) ? `L${x.level}` : ''}</span></li>`).join('')}</ol>` : ''}
  </div>`;
}

/**
 * Moves that are not ladders (warm-up, mobility, cardio) have no easier / harder: the detail links similar moves for the
 * same area instead (the workout player's Swap list). Ladders keep their Ladder list.
 */
function similarHTML(e, profile) {
  if (PROG(e) || e.mode === 'flow') return '';
  let list = [];
  try { list = swapAlternatives(e.id, profile || null, EXERCISES); } catch { list = []; }
  if (!list.length) return '';
  return `<h3 class="h3">Similar moves</h3><ul class="similar">${list.map(x => `<li><a href="#/library/${x.id}">${esc(x.name)}</a><span class="small muted">${esc(x.muscles.primary.map(muscleName).join(', '))}</span></li>`).join('')}</ul>`;
}

function openDetail(id) {
  const e = byId[id];
  closeDetail = openSheet({
    title: e.name, html: detailHTML(e), cls: 'sheet-tall',
    // Native name first (world-movement.md §5.1.2), then the English name.
    titleHTML: e.nativeName ? `${nativeNameHTML(e.nativeName, { cls: 'title-native' })}<span class="title-en">${esc(e.name)}</span>` : '',
    onMount(el) {
      el.addEventListener('click', ev => { const c = ev.target.closest('[data-culture]'); if (c) openCultureCard(c.dataset.culture); });
      let p = null;
      const st = getState().settings;   // animation extras: trail always here, breath guide on holds
      try { p = createSkeletonPlayer(el.querySelector('[data-stage]'), e.anim || e.id, { primary: e.muscles.primary, secondary: e.muscles.secondary, size: Math.min(260, window.innerWidth - 80), playing: !reducedMotion(),
        trail: st.animTrail !== false, breath: e.mode === 'hold' && st.animBreath !== false }); } catch (err) { console.warn(err); }
      try { renderBodyMap(el.querySelector('[data-bodymap]'), { primary: e.muscles.primary, secondary: e.muscles.secondary, size: 140 }); } catch (err) { console.warn(err); }
      return () => { try { p && p.destroy(); } catch { /* ignore */ } };
    },
    onClose() {
      // Closed by the user (not by navigating to another exercise): drop the id from the URL without re-rendering.
      if (location.hash.split("?")[0] === `#/library/${id}`) history.replaceState(null, '', '#/library');
    },
  });
}
