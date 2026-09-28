// Library tab: searchable, filterable exercise grid with a detail sheet (#/library/:id).
import { EXERCISES, FAMILIES, MUSCLES, byId, createSkeletonPlayer, renderBodyMap } from './deps.js';
import { getState } from '../store.js';
import { esc, icon, openSheet, mountAnims, muscleName, familyName, ladder, isAvailable, reducedMotion } from './components.js';

const CATS = [['', 'All'], ['strength', 'Strength'], ['core', 'Core'], ['skill', 'Skill'], ['conditioning', 'Cardio'], ['mobility', 'Mobility'], ['warmup', 'Warm-up']];
const EQUIP_NAME = { pullup_bar: 'Pull-up bar', dip_bars: 'Dip bars', rings: 'Rings', parallettes: 'Parallettes', resistance_band: 'Resistance band', bench: 'Sturdy chair / bench', table: 'Sturdy table', wall: 'Wall' };
const f = { q: '', muscle: '', family: '', mine: false, cat: '' }; // filters persist for the session

let destroyGrid = null, closeDetail = null;

function matches(e, profile) {
  if (f.cat && e.category !== f.cat) return false;
  if (f.family && e.family !== f.family) return false;
  if (f.muscle && !e.muscles.primary.includes(f.muscle) && !e.muscles.secondary.includes(f.muscle)) return false;
  if (f.mine && !isAvailable(e, profile)) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = `${e.name} ${familyName(e.family)} ${e.category} ${[...e.muscles.primary, ...e.muscles.secondary].map(muscleName).join(' ')}`.toLowerCase();
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
      <span class="lib-name">${esc(e.name)}</span>
      <span class="lib-meta">${esc(familyName(e.family))}${PROG(e) ? ` · L${e.level}` : ''}</span>
      ${ok ? '' : `<span class="lib-na">${e.equipment.some(q => !(profile?.equipment || []).includes(q)) ? 'needs kit' : 'not for you now'}</span>`}</a></li>`;
  }).join('')}</ul><p class="small muted center">${list.length} of ${EXERCISES.length} exercises</p>`;
}
const FAM_ORDER = Object.keys(FAMILIES);
const PROG = e => !['mobility', 'warmup', 'conditioning'].includes(e.family);

function redrawGrid(root) {
  destroyGrid && destroyGrid();
  const g = root.querySelector('[data-grid]');
  g.innerHTML = gridHTML();
  destroyGrid = mountAnims(g);
}

export function render(root, ctx) {
  const muscles = Object.entries(MUSCLES);
  root.innerHTML = `
  <div class="screen library">
    <header class="screen-head"><p class="eyebrow">技の書 · Library</p><h1 class="title">Exercises</h1></header>
    <div class="lib-filters">
      <label class="search"><span class="sr-only">Search exercises</span>${icon('search', { size: 18 })}
        <input type="search" class="input" placeholder="Search push-up, glutes, hold…" value="${esc(f.q)}" data-f="q" autocomplete="off"></label>
      <div class="chips chips-scroll" role="group" aria-label="Category">${CATS.map(([v, l]) => `<button type="button" class="chip" data-cat="${v}" aria-pressed="${f.cat === v}">${l}</button>`).join('')}</div>
      <div class="filter-row">
        <label class="select"><span class="sr-only">Muscle group</span><select data-f="muscle"><option value="">All muscles</option>${muscles.map(([id, m]) => `<option value="${id}" ${f.muscle === id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
        <label class="select"><span class="sr-only">Family or pattern</span><select data-f="family"><option value="">All patterns</option>${Object.entries(FAMILIES).map(([id, fm]) => `<option value="${id}" ${f.family === id ? 'selected' : ''}>${esc(fm.name)}</option>`).join('')}</select></label>
      </div>
      <label class="switch-row switch-inline"><span class="small">Only what I can do with my kit</span><input type="checkbox" class="switch" data-f="mine" ${f.mine ? 'checked' : ''}></label>
    </div>
    <div data-grid></div>
  </div>`;
  redrawGrid(root);

  let t = 0;
  root.addEventListener('input', e => {
    const k = e.target.dataset.f; if (!k) return;
    f[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    clearTimeout(t); t = setTimeout(() => redrawGrid(root), k === 'q' ? 150 : 0);
  });
  root.addEventListener('change', e => { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') { const k = e.target.dataset.f; f[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; redrawGrid(root); } });
  root.addEventListener('click', e => {
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

function detailHTML(e) {
  const profile = getState().profile;
  const lad = ladder(e.family);
  const ok = isAvailable(e, profile);
  const target = e.mode === 'hold' ? 'Timed hold' : 'Reps';
  const mistakes = e.commonMistakes || e.mistakes || [];
  return `<div class="detail">
    <div class="detail-stage" data-stage></div>
    <div class="badges"><span class="badge">${esc(familyName(e.family))}</span>${PROG(e) ? `<span class="badge">Level ${e.level} of ${lad.length}</span>` : ''}
      <span class="badge">${target}${e.unilateral ? ' · per side' : ''}</span><span class="badge">Difficulty ${e.difficulty}/10</span>${e.impact === 'high' ? '<span class="badge badge-gold">High impact</span>' : ''}</div>
    ${ok ? '' : '<p class="note small">Not in your plan right now — it needs equipment you don’t have, or it loads a joint you flagged.</p>'}
    ${e.description ? `<p>${esc(e.description)}</p>` : ''}
    <div class="detail-muscles"><div class="bodymap" data-bodymap></div>
      <div><h3 class="h3">Muscles</h3><p class="small"><span class="key key-p"></span>${e.muscles.primary.map(muscleName).join(', ')}</p>
      ${e.muscles.secondary.length ? `<p class="small muted"><span class="key key-s"></span>${e.muscles.secondary.map(muscleName).join(', ')}</p>` : ''}</div></div>
    ${e.cues?.length ? `<h3 class="h3">Cues</h3><ol class="cues">${e.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}
    ${mistakes.length ? `<h3 class="h3">Common mistakes</h3><ul class="mistakes">${mistakes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    <h3 class="h3">You’ll need</h3><p class="small">${e.equipment.length ? e.equipment.map(q => EQUIP_NAME[q] || q).join(', ') : 'Nothing but the floor'} · ${e.space} space${e.stress?.length ? ` · loads: ${e.stress.map(x => x.replace('_', ' ')).join(', ')}` : ''}</p>
    ${lad.length > 1 ? `<h3 class="h3">Ladder</h3><ol class="ladder-v">${lad.map(x => `<li class="${x.id === e.id ? 'cur' : ''}">${x.id === e.id ? `<span>${esc(x.name)}</span>` : `<a href="#/library/${x.id}">${esc(x.name)}</a>`}<span class="small muted">${PROG(x) ? `L${x.level}` : ''}</span></li>`).join('')}</ol>` : ''}
  </div>`;
}

function openDetail(id) {
  const e = byId[id];
  closeDetail = openSheet({
    title: e.name, html: detailHTML(e), cls: 'sheet-tall',
    onMount(el) {
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
