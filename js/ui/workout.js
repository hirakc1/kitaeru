// Full-screen workout player with per-set logging, rest timer, swaps, ratings, completion & celebration.
// v1.2: flow items (mode 'flow') play step by step with Kitaeru's own visual count. No music, ever.
// v1.3: moves that are not ladders (warm-up, mobility, cardio) get one "Swap" (same region and purpose) instead of
// Easier / Harder; the animation extras (Me → Animation extras) apply in the player too.
import { EXERCISES, byId, ALL_BY_ID, flowSteps, createSkeletonPlayer, renderBodyMap, applySessionLog, MORNING_TAISO_SESSION_ID, MOMENTS, RECOVERY_MOMENTS, isShortMomentLog,
  swapAlternatives } from './deps.js';
import { getState, update, getActiveWorkout, saveActiveWorkout, clearActiveWorkout } from '../store.js';
import { esc, icon, seal, fmtTarget, exName, muscleName, familyName, neighbour, varietySwaps, stepper, handleStepper, ring, setRing, mountAnims,
  beep, buzz, unlockAudio, openSheet, reducedMotion, clamp, plural, isFlowItem, isProgression, nativeNameHTML, fmtDur, stepName, stepCount } from './components.js';
import { getStreak, sessionsThisWeek, weeklyTarget, groupLabel, planOpts, isTrainingLog } from './model.js';

const RATED = new Set(['main', 'skill', 'conditioning']);
const FEEL = [[1, 'Very easy'], [2, 'Easy'], [3, 'Solid'], [4, 'Hard'], [5, 'Max effort']];

let w = null, root = null, stageEl = null, player = null, timer = 0, hold = null, wakeLock = null, celebrate = null, ctxRef = null;
let lastRestSecond = null;

const save = () => saveActiveWorkout(w);
// Moments whose sessions sit below the user's level on purpose: the planner never moves a ladder on them.
const RECOVERY = new Set(RECOVERY_MOMENTS);

// ---------- dark player (Wind down): dark for this session only, whatever the app theme; restored on leaving ----------
let themeRestore = null;
function darkPlayerOn() {
  if (themeRestore) return;
  const html = document.documentElement;
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  const had = html.dataset.theme;
  themeRestore = { had, metas: metas.map(m => m.content) };
  html.dataset.theme = 'dark';
  html.classList.add('dark-player');
  metas.forEach(m => { m.content = '#121110'; });
}
function darkPlayerOff() {
  if (!themeRestore) return;
  const html = document.documentElement;
  const { had, metas } = themeRestore;
  if (had === undefined) delete html.dataset.theme; else html.dataset.theme = had;
  html.classList.remove('dark-player');
  document.querySelectorAll('meta[name="theme-color"]').forEach((m, i) => { if (metas[i] != null) m.content = metas[i]; });
  themeRestore = null;
}
const wantsDark = x => !!(x?.session?.darkPlayer || MOMENTS[x?.session?.moment || x?.session?.request?.moment]?.darkPlayer);
const item = () => w.items[w.idx];
const log = () => w.logs[w.idx];
const ex = () => byId[item().exerciseId] || ALL_BY_ID[item().exerciseId];
const flowNow = () => isFlowItem(item());
// Flows are rated only when they progress (§4.4: easy twice unlocks the next stage); Morning Taisō has no stages.
const needsRating = it => RATED.has(it.blockKind) ? true : isFlowItem(it) && !!ALL_BY_ID[it.exerciseId]?.progression?.stages;

export function render(host, ctx) {
  root = host; ctxRef = ctx; celebrate = null; hold = null;
  w = getActiveWorkout();
  flowCache.clear();
  if (!w) { ctx.go('#/today', { replace: true }); return; }
  if (w.phase === 'rest' && w.restEndsAt && Date.now() >= w.restEndsAt) { w.phase = 'set'; w.restEndsAt = null; save(); }
  if (wantsDark(w)) darkPlayerOn();
  root.innerHTML = `<div class="player" role="region" aria-label="Workout player">
    <header class="pl-head">
      <button class="icon-btn" data-act="close" aria-label="Pause or leave workout">${icon('close')}</button>
      <div class="pl-prog" aria-hidden="true"></div>
      <span class="pl-time" aria-label="Elapsed time">0:00</span>
    </header>
    <div class="pl-stage" aria-hidden="false"></div>
    <div class="pl-content"></div>
  </div>`;
  stageEl = root.querySelector('.pl-stage');
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  draw();
  timer = setInterval(tick, 250);
  tick();
  requestWake();
  document.addEventListener('visibilitychange', onVis);
  return () => {
    clearInterval(timer); timer = 0;
    document.removeEventListener('visibilitychange', onVis);
    try { player && player.destroy(); } catch { /* ignore */ }
    player = null; hold = null;
    releaseWake();
    darkPlayerOff();
  };
}

// ---------- wake lock ----------
async function requestWake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen'); } catch { wakeLock = null; } }
function releaseWake() { try { wakeLock && wakeLock.release(); } catch { /* ignore */ } wakeLock = null; }
function onVis() { if (document.visibilityState === 'visible' && timer) requestWake(); }

// ---------- stage ----------
let stageId = null;
/**
 * Animation extras in the player (Me → Animation extras, both on by default). The breath ring shows on holds, breathing
 * and every flow step; the motion trail on every clip that has one, drawn fainter than in the Library (.pl-stage CSS).
 * Travelling clips (Tai Chi walking forms, bear crawl) keep it: the plate draws their path in the camera's frame.
 */
function extras(e, step) {
  const st = getState().settings;
  return {
    // (a timed burst of marching or jacks is not a hold: no ring there)
    breath: st.animBreath !== false && (!!step || e?.category === 'breath' || (e?.mode === 'hold' && !['conditioning', 'warmup'].includes(e?.category))),
    trail: st.animTrail !== false,
  };
}
/**
 * Show an exercise on the stage. Flow steps pass their own anim (pauses have no exercise); a flow shows its first step
 * before Start and during the countdown (lead), then each step as it comes, blending from the step before.
 */
function setStage(exId, step = null, { lead = false } = {}) {
  const e = step ? step.exercise : (byId[exId] || ALL_BY_ID[exId]);
  const animId = step ? (e?.anim || step.move || step.anim) : (e?.anim || e?.id);
  if (!animId) return;
  const size = 1200; // CSS sizes the hero (full column width, clamp height); this only caps max-width
  const key = `${exId}|${animId}|${step ? (lead ? 'lead' : step.i) : ''}`;
  const pace = step && step.count ? step.sec / step.count : null;   // flows: the clip keeps to the step's count
  const fit = step && !step.count ? step.sec : null;                 // (a timed step: whole cycles in its seconds)
  if (player && stageId === key) return;
  const mus = e?.muscles || { primary: [], secondary: [] };
  const { breath, trail } = extras(e, step);
  try {
    const opts = step ? { flow: true, blend: !lead } : {};   // flow steps: no fades at the ends; blend from the last pose
    if (player && player.setAnim) { player.setPace?.(pace, fit); player.setAnim(animId, mus.primary, mus.secondary, opts); player.setBreath?.(breath); player.setTrail?.(trail); }
    else { player && player.destroy(); player = createSkeletonPlayer(stageEl, animId, { primary: mus.primary, secondary: mus.secondary, size, playing: !reducedMotion(), breath, trail, pace, fit, flow: !!step }); }
  } catch (err) { console.warn('skeleton failed', err); }
  stageEl.setAttribute('aria-label', `${e?.name || (step ? step.name : '')} demonstration`);
  stageId = key;
}

// ---------- flows (v1.2) ----------
const flowCache = new Map();
/**
 * The resolved steps of the current flow item with their time windows, plus display rows that also show the steps
 * left out for this profile and the ones replaced (e.g. hops -> Kitaeru's heel raises).
 */
function flowInfo(idx = w.idx) {
  const it = w.items[idx];
  const key = `${idx}|${it.exerciseId}|${JSON.stringify(it.flow || {})}`;
  if (flowCache.has(key)) return flowCache.get(key);
  const fx = it.flow || {};
  const fex = ALL_BY_ID[it.exerciseId];
  const resolved = flowSteps(it.exerciseId, fx);
  let t = 0;
  const steps = resolved.map((st, i) => {
    const s = { ...st, i, start: t, end: t + st.sec, name: stepName(st, i, resolved.length) };
    s.count = st.reps ? (st.side === 'both' ? st.reps * 2 : st.reps) : 0;
    t += st.sec; return s;
  });
  const skip = new Set(fx.skip || []);
  const inj = getState().profile?.injuries || [];
  const rows = [];
  let k = 0;
  for (const st of fex?.sequence || []) {
    if (st.move && skip.has(st.move)) {
      const why = (st.stress || []).filter(x => inj.includes(x)).map(x => x.replace('_', ' '));
      rows.push({ skipped: true, name: ALL_BY_ID[st.move]?.name || st.move, why });
      continue;
    }
    const s = steps[k++];
    if (!s) continue;
    if (st.move && s.move !== st.move) { // the step's own cue describes the original move (e.g. "soft hops")
      s.replacedFrom = ALL_BY_ID[st.move]?.name || st.move;
      s.cue = s.exercise?.cues?.[0] || '';
    }
    rows.push(s);
  }
  const info = { fex, steps, rows, total: Math.max(1, Math.round(t)) };
  flowCache.set(key, info);
  return info;
}
/** Where the flow is at `el` seconds: current step, rep within the step and which side. */
function flowAt(info, el) {
  const s = info.steps.find(x => el < x.end) || info.steps[info.steps.length - 1];
  const local = Math.max(0, el - s.start);
  if (!s.count) return { s, left: Math.max(0, Math.ceil(s.end - el)), rep: 0 };
  const rep = Math.min(s.count, Math.floor(local / (s.sec / s.count)) + 1);
  if (s.side === 'both') return { s, rep: ((rep - 1) % s.reps) + 1, of: s.reps, sideLabel: rep <= s.reps ? 'First side' : 'Second side', bead: rep };
  return { s, rep, of: s.count, sideLabel: s.side === 'alternate' ? 'Alternate sides' : '', bead: rep };
}
const flowEl = () => (hold && hold.idx === w.idx ? Math.max(0, (Date.now() - hold.start) / 1000) : 0);

function flowNowHTML(info, running) {
  const lead = running && Date.now() < hold.start;
  if (!running || lead) {
    const s = info.steps[0];
    return `<p class="eyebrow">${lead ? 'Get ready' : 'First'}</p><p class="fl-now-name">${esc(s.name)}</p>${s.cue ? `<p class="small muted">${esc(s.cue)}</p>` : ''}`;
  }
  const a = flowAt(info, flowEl());
  const s = a.s;
  const beads = s.count && s.count <= 24 ? `<span class="fl-beads" aria-hidden="true">${Array.from({ length: s.count }, (_, i) => `<i class="${i + 1 < a.bead ? 'done' : i + 1 === a.bead ? 'cur' : ''}"></i>`).join('')}</span>` : '';
  return `<p class="eyebrow">Step ${s.i + 1} of ${info.steps.length}${s.exercise?.adaptation ? ' · <span class="fl-adapt">Kitaeru adaptation</span>' : ''}</p>
    ${s.exercise?.nativeName ? nativeNameHTML(s.exercise.nativeName, { cls: 'fl-native' }) : ''}<p class="fl-now-name">${esc(s.name)}</p>
    ${s.cue ? `<p class="fl-now-cue">${esc(s.cue)}</p>` : ''}
    <p class="fl-count" aria-live="off">${s.count ? `<span class="fl-count-n" data-fl-n>${a.rep}</span><span class="fl-count-of">of ${a.of}</span>${a.sideLabel ? `<span class="fl-count-side" data-fl-side>${a.sideLabel}</span>` : ''}`
      : `<span class="fl-count-n" data-fl-n>${a.left}</span><span class="fl-count-of">s</span>`}</p>${beads}`;
}

function flowListHTML(info, curStep = -1) {
  return `<ol class="fl-steps" aria-label="Steps">${info.rows.map(r => r.skipped
    ? `<li class="fl-step fl-skipped"><span class="fl-n" aria-hidden="true">–</span><span class="fl-body"><span class="fl-name">${esc(r.name)}</span>
        <span class="small muted">Left out for you${r.why.length ? ` (${esc(r.why.join(', '))})` : ''}</span></span></li>`
    : `<li class="fl-step ${r.i === curStep ? 'cur' : r.i < curStep ? 'done' : ''}" data-fl-step="${r.i}"><span class="fl-n">${r.i + 1}</span>
        <span class="fl-body"><span class="fl-name">${esc(r.name)}</span>
        <span class="small muted">${esc(stepCount(r))}${r.cue ? ` · ${esc(r.cue)}` : ''}</span>
        ${r.replacedFrom ? `<span class="small">Replaces ${esc(r.replacedFrom)}</span>` : ''}
        ${r.exercise?.adaptation ? '<span class="badge badge-gold">Kitaeru adaptation</span>' : ''}</span></li>`).join('')}</ol>`;
}

function flowLoggerHTML() {
  const info = flowInfo();
  const running = hold && hold.idx === w.idx;
  const v = running ? holdView() : { lead: 0, left: info.total, done: 0 };
  return `<div class="logger flow">
    <div class="fl-now" data-fl-now>${flowNowHTML(info, running)}</div>
    ${ring({ progress: running ? v.done / info.total : 0, size: 112, label: `<span data-hold-sec>${v.lead || fmtClock(v.left)}</span>`, sub: `<span data-hold-sub>${v.lead ? 'get ready' : 'left'}</span>`, cls: running ? 'running' : '' })}
    <div class="btn-row">${running ? `<button class="btn btn-primary btn-lg" data-act="hold-stop">${icon('check', { size: 20 })} <span data-hold-btn>${v.lead ? 'Cancel' : 'Stop & log'}</span></button>`
      : `<button class="btn btn-primary btn-lg" data-act="hold-start">${icon('play', { size: 20 })} Start</button>
         <button class="btn btn-ghost" data-act="hold-log" aria-label="Log the whole flow without the timer">Log without timer</button>`}</div>
    <p class="small muted center">Follow the count on screen. There’s no music to keep time with.</p></div>`;
}

/** During a flow the muscle chips follow the current step (a pause shows none). */
function stepChips(s) {
  const el = root.querySelector('.pl-muscles'); if (!el) return;
  const m = s?.exercise?.muscles || { primary: [], secondary: [] };
  el.innerHTML = `${m.primary.map(x => `<span class="mchip mchip-p">${esc(muscleName(x))}</span>`).join('')}${m.secondary.map(x => `<span class="mchip mchip-s">${esc(muscleName(x))}</span>`).join('')}`;
}
/** Per-tick flow update: count, beads, current step and stage; re-renders the step panel when the step changes. */
function tickFlow() {
  const info = flowInfo();
  const now = root.querySelector('[data-fl-now]');
  if (!now) return;
  const lead = Date.now() < hold.start;
  const a = lead ? null : flowAt(info, flowEl());
  const key = lead ? 'lead' : `${a.s.i}|${a.rep}|${a.left ?? ''}`;
  if (key === hold.flowKey) return;
  const stepChanged = !lead && (!hold.flowKey || hold.flowKey.split('|')[0] !== String(a.s.i));
  hold.flowKey = key;
  if (lead) { now.innerHTML = flowNowHTML(info, true); return; }
  if (stepChanged) {
    now.innerHTML = flowNowHTML(info, true);
    root.querySelectorAll('[data-fl-step]').forEach(li => { const i = +li.dataset.flStep; li.classList.toggle('cur', i === a.s.i); li.classList.toggle('done', i < a.s.i); });
    setStage(item().exerciseId, a.s);
    stepChips(a.s);
    if (a.s.i > 0) { beep('tick'); buzz([30]); }
    return;
  }
  const n = now.querySelector('[data-fl-n]'); if (n) n.textContent = a.s.count ? a.rep : a.left;
  const sd = now.querySelector('[data-fl-side]'); if (sd && a.sideLabel) sd.textContent = a.sideLabel;
  now.querySelectorAll('.fl-beads i').forEach((b, i) => { b.className = i + 1 < a.bead ? 'done' : i + 1 === a.bead ? 'cur' : ''; });
}

// ---------- drawing ----------
function progressBar() {
  const segs = w.items.map((it, i) => {
    const l = w.logs[i];
    const st = i < w.idx || (w.phase === 'finish') ? (l.skipped ? 'skip' : 'done') : i === w.idx ? 'cur' : '';
    return `<span class="seg-${st || 'todo'}"></span>`;
  }).join('');
  root.querySelector('.pl-prog').innerHTML = segs;
}

function draw() {
  if (celebrate) return drawCelebrate();
  progressBar();
  const content = root.querySelector('.pl-content');
  if (w.phase === 'finish') { stageEl.hidden = true; content.innerHTML = finishHTML(); return; }
  stageEl.hidden = false;
  const it = item(), e = ex(), l = log();
  const isFlow = flowNow();
  const running = hold && hold.idx === w.idx;
  if (isFlow && running && Date.now() >= hold.start) setStage(it.exerciseId, flowAt(flowInfo(), flowEl()).s);
  else if (isFlow) setStage(it.exerciseId, flowInfo().steps[0], { lead: true });   // before Start / countdown: step 1
  else setStage(it.exerciseId);
  const setNo = Math.min(l.sets.length + 1, it.sets);
  // Flows keep their own form: no easier/harder swap (their stance, support and tempo progress instead).
  // Moves that are not ladders (warm-up, mobility, cardio) get one Swap: Easier / Harder would jump to an unrelated move.
  const ladder = !isFlow && isProgression(e.family);
  const easier = ladder ? neighbour(it.exerciseId, -1, getState().profile) : null;
  const harder = ladder ? neighbour(it.exerciseId, 1, getState().profile) : null;
  const swaps = isFlow || ladder ? [] : swapsFor(it.exerciseId);
  const variety = isFlow ? [] : varietySwaps(it.exerciseId, getState().profile);   // e.g. the daṇḍ from the push-up
  const muscles = e.muscles;
  const grp = groupLabel(w.items, w.idx);
  const fx = it.flow || {};
  const flowTags = isFlow ? [fx.stance && `${fx.stance[0].toUpperCase()}${fx.stance.slice(1)} stance`, fx.support === 'chair' && 'Chair nearby',
    fx.support === 'soft_gaze' && 'Soft gaze', fx.tempoScale > 1 && 'Slower tempo', fx.variant === 'short' && 'Short version'].filter(Boolean) : [];
  const unit = isFlow ? 'Round' : 'Set';
  // A flow's muscles are the union of every step: show only its main ones as chips (all of them under "Muscles worked").
  // (while it runs, the chips follow the current step: stepChips)
  const cur = isFlow && running && Date.now() >= hold.start ? flowAt(flowInfo(), flowEl()).s : null, cm = cur ? (cur.exercise?.muscles || { primary: [], secondary: [] }) : null;
  const chipsP = cm ? cm.primary : isFlow ? muscles.primary.slice(0, 5) : muscles.primary, chipsS = cm ? cm.secondary : isFlow ? [] : muscles.secondary;
  root.classList.toggle('is-flow', isFlow);   // flows: a shorter stage and the count panel right under the name (fits 375×812)
  const headHTML = `
    <p class="pl-muscles" aria-label="Muscles worked">${chipsP.map(m => `<span class="mchip mchip-p">${esc(muscleName(m))}</span>`).join('')}${chipsS.map(m => `<span class="mchip mchip-s">${esc(muscleName(m))}</span>`).join('')}</p>
    <p class="eyebrow pl-block">${esc(it.blockTitle || it.blockKind)} · ${w.idx + 1} of ${w.items.length}${grp ? ` · <span class="pl-group">${grp.circuit ? 'Circuit' : 'Superset'} ${grp.label}</span>` : ''}</p>
    ${e.nativeName ? nativeNameHTML(e.nativeName, { cls: 'pl-native' }) : ''}<h1 class="pl-name">${esc(e.name)}</h1>`;
  const infoHTML = `
    <p class="pl-target">${esc(fmtTarget(it))}${it.rir != null && RATED.has(it.blockKind) && !isFlow ? ` <span class="muted small">· stop ${it.rir} rep${it.rir === 1 ? '' : 's'} short of failure</span>` : ''}</p>
    ${flowTags.length ? `<p class="badges">${flowTags.map(t => `<span class="badge">${esc(t)}</span>`).join('')}</p>` : ''}
    ${it.notes ? `<p class="small pl-note">${esc(it.notes)}</p>` : ''}
    ${e.attribution && isFlow ? `<p class="small muted center">Based on ${esc(e.attribution)}</p>` : ''}
    <ul class="pl-cues">${(e.cues || []).map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    <div class="pl-sets" ${isFlow && it.sets === 1 ? 'hidden' : ''} aria-label="${unit} ${setNo} of ${it.sets}">${Array.from({ length: it.sets }, (_, i) => {
      const s = l.sets[i];
      return `<span class="set-pill ${s ? 'done' : i === l.sets.length ? 'cur' : ''}">${s ? (s.sec != null ? (isFlow ? fmtDur(s.sec) : `${s.sec}s`) : s.reps) : `${unit} ${i + 1}`}</span>`;
    }).join('')}</div>`;
  const panelHTML = `<div class="pl-panel">${w.phase === 'rest' ? restHTML() : w.phase === 'rate' ? rateHTML() : loggerHTML()}</div>`;
  content.innerHTML = `${headHTML}${isFlow ? panelHTML + infoHTML : infoHTML + panelHTML}
    ${isFlow && w.phase === 'set' ? flowListHTML(flowInfo(), running && Date.now() >= hold.start ? flowAt(flowInfo(), flowEl()).s.i : -1) : ''}
    ${w.phase === 'set' ? `<div class="pl-actions">
      ${isFlow ? '' : ladder ? `<button class="btn btn-quiet btn-sm" data-act="easier" ${easier ? '' : 'disabled'} aria-label="Swap to an easier variation${easier ? `: ${esc(easier.name)}` : ''}">${icon('easier', { size: 18 })} Easier</button>
      <button class="btn btn-quiet btn-sm" data-act="harder" ${harder ? '' : 'disabled'} aria-label="Swap to a harder variation${harder ? `: ${esc(harder.name)}` : ''}">${icon('harder', { size: 18 })} Harder</button>`
      : `<button class="btn btn-quiet btn-sm" data-act="swap-open" ${swaps.length ? '' : 'disabled'} aria-label="${swaps.length ? `Swap for a similar move: ${esc(swaps.map(x => x.name).join(', '))}` : 'No similar move to swap to'}">${icon('swap', { size: 18 })} Swap</button>`}
      ${variety.map(v => `<button class="btn btn-quiet btn-sm" data-act="variety" data-id="${esc(v.id)}" aria-label="Swap to a variety move: ${esc(v.name)}">${esc(v.aka?.[0] || v.name)}</button>`).join('')}
      <button class="btn btn-quiet btn-sm" data-act="skip">${icon('skip', { size: 18 })} Skip</button></div>` : ''}
    <details class="pl-details"><summary>Muscles worked</summary>
      <div class="pl-body"><div class="bodymap" data-bodymap></div>
      <div><p class="small"><span class="key key-p"></span>${muscles.primary.map(muscleName).join(', ')}</p>
      ${muscles.secondary.length ? `<p class="small muted"><span class="key key-s"></span>${muscles.secondary.map(muscleName).join(', ')}</p>` : ''}
      <p class="small muted">${esc(familyName(e.family))}${isProgression(e.family) ? ` · level ${e.level}` : ''}</p></div></div></details>`;
  const bm = content.querySelector('[data-bodymap]');
  content.querySelector('.pl-details').addEventListener('toggle', ev => { if (ev.target.open && !bm.childNodes.length) { try { renderBodyMap(bm, { primary: muscles.primary, secondary: muscles.secondary, size: 150 }); } catch (err) { console.warn(err); } } }, { once: false });
}

function loggerHTML() {
  const it = item(), e = ex(), l = log();
  if (flowNow()) return flowLoggerHTML();
  if (e.mode === 'hold' || it.holdSec) {
    const target = holdTarget();
    const running = hold && hold.idx === w.idx;
    const v = running ? holdView() : { lead: 0, left: target };
    return `<div class="logger hold">${ring({ progress: running ? v.done / target : 0, size: 168, label: `<span data-hold-sec>${v.lead || v.left}</span><small data-hold-unit>${v.lead ? '' : 's'}</small>`, sub: `<span data-hold-sub>${holdSub(v, target)}</span>`, cls: running ? 'running' : '' })}
      <div class="btn-row">${running ? `<button class="btn btn-primary btn-lg" data-act="hold-stop">${icon('check', { size: 20 })} <span data-hold-btn>${v.lead ? 'Cancel' : 'Stop & log'}</span></button>`
        : `<button class="btn btn-primary btn-lg" data-act="hold-start">${icon('play', { size: 20 })} Start</button>
           <button class="btn btn-ghost" data-act="hold-log" aria-label="Log ${target} seconds${bothSides() ? ' per side' : ''} without the timer">Log ${target}s${bothSides() ? ' each side' : ''}</button>`}</div></div>`;
  }
  const last = l.sets[l.sets.length - 1];
  const def = last?.reps ?? (it.reps ? it.reps[1] : 10);
  return `<div class="logger reps"><span class="label center">Reps${it.perSide ? ' per side' : ''}</span>
    ${stepper({ name: 'reps', value: def, min: 0, max: 200, label: 'reps', unit: '' })}
    <button class="btn btn-primary btn-lg btn-block" data-act="log-set">${icon('check', { size: 20 })} Log set ${l.sets.length + 1}</button></div>`;
}

function restHTML() {
  const left = Math.max(0, Math.ceil((w.restEndsAt - Date.now()) / 1000));
  const next = item();
  const grp = groupLabel(w.items, w.idx);
  const tag = grp ? `${grp.label} · ` : '';
  const unit = isFlowItem(next) ? 'round' : 'set';
  const nextLabel = log().sets.length === 0 || grp ? `Up next: ${tag}<strong>${esc(exName(next.exerciseId))}</strong> · ${unit} ${log().sets.length + 1} of ${next.sets}` : `Next: ${unit} ${log().sets.length + 1} of ${next.sets}`;
  return `<div class="logger rest" aria-live="off">${ring({ progress: left / (w.restTotal || 1), size: 168, label: `<span data-rest-left>${fmtClock(left)}</span>`, sub: 'rest', cls: 'rest-ring' })}
    <p class="center small">${nextLabel}</p>
    <div class="btn-row"><button class="btn btn-ghost" data-act="rest-add">+15 s</button><button class="btn btn-primary" data-act="rest-skip">Skip rest</button></div></div>`;
}

function rateHTML() {
  const l = log();
  const pain = l.pain;
  return `<div class="logger rate"><p class="label center" id="ratel">How did ${esc(ex().name)} feel?</p>
    <div class="rate-row" role="group" aria-labelledby="ratel">${[['easy', 'Easy', '軽'], ['good', 'Good', '中'], ['hard', 'Hard', '重']].map(([v, t, k]) =>
      `<button class="rate-btn" data-act="rate" data-val="${v}" aria-pressed="${l.rating === v}"><span class="rate-k" aria-hidden="true">${k}</span>${t}</button>`).join('')}</div>
    <div class="pain"><label for="pain" class="small">Any pain? <span class="muted">(optional)</span> <output data-pain-out>${pain == null ? 'none' : `${pain}/10`}</output></label>
      <input type="range" id="pain" min="0" max="10" step="1" value="${pain ?? 0}" data-pain aria-valuetext="${pain ?? 0} out of 10">
      <div class="pain-scale small muted" aria-hidden="true"><span>0 none</span><span>3 mild</span><span>10 worst</span></div>
      <div class="note note-warn" data-pain-note ${pain > 3 ? '' : 'hidden'}>${icon('info', { size: 20 })}<p>Pain above 3/10 is a signal to back off. Next time use an easier variation or a smaller range, or stop this exercise today. If pain is sharp or lasts into tomorrow, please see a physiotherapist or doctor.</p></div></div>
    <button class="btn btn-primary btn-lg btn-block" data-act="rate-next" ${l.rating ? '' : 'disabled'}>${w.idx >= w.items.length - 1 ? 'Finish workout' : 'Next exercise'}</button></div>`;
}

function finishHTML() {
  const mins = elapsedMin();
  w.feel ??= null; w.durationMin ??= mins;
  const setsDone = w.logs.reduce((a, l) => a + l.sets.length, 0);
  return `<div class="finish">
    <p class="eyebrow">Almost there</p><h1 class="title">How was that session?</h1>
    <p class="muted">${plural(setsDone, 'set')} across ${plural(w.logs.filter(l => l.sets.length).length, 'exercise')}.</p>
    <fieldset class="feel"><legend class="label">Overall effort</legend>
      <div class="feel-row">${FEEL.map(([v, t]) => `<button type="button" class="feel-btn" data-act="feel" data-val="${v}" aria-pressed="${w.feel === v}"><span class="feel-n">${v}</span><span class="feel-t">${t}</span></button>`).join('')}</div></fieldset>
    <div class="field"><span class="label">Duration</span>${stepper({ name: 'duration', value: w.durationMin, min: 1, max: 240, label: 'duration in minutes', unit: 'min' })}</div>
    <button class="btn btn-primary btn-lg btn-block" data-act="save" ${w.feel ? '' : 'disabled'}>${seal('鍛', { size: 22, cls: 'seal-inline' })} Save & stamp</button>
    <button class="btn btn-quiet btn-block" data-act="back-to-work">Back to workout</button></div>`;
}

// ---------- timers ----------
const fmtClock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const elapsedMin = () => clamp(Math.round((Date.now() - w.startedAt) / 60000), 1, 240);

function tick() {
  if (!w || celebrate) return;
  const t = root.querySelector('.pl-time');
  if (t) t.textContent = fmtClock(Math.floor((Date.now() - w.startedAt) / 1000) % 360000);
  if (w.phase === 'rest') {
    const leftMs = w.restEndsAt - Date.now();
    const left = Math.max(0, Math.ceil(leftMs / 1000));
    const el = root.querySelector('[data-rest-left]');
    if (el) el.textContent = fmtClock(left);
    const r = root.querySelector('.rest-ring'); if (r) setRing(r, leftMs / 1000 / (w.restTotal || 1));
    if (left !== lastRestSecond) {
      lastRestSecond = left;
      if (left > 0 && left <= 3) beep('tick');
    }
    if (leftMs <= 0) { beep('go'); buzz([180, 80, 180]); endRest(); }
  }
  if (hold && hold.idx === w.idx && w.phase === 'set' && flowNow()) {
    const v = holdView(), target = holdTarget();
    tickFlow();
    const key = v.lead ? `L${v.lead}` : String(v.left);
    if (key === hold.shown) return;
    const was = hold.shown; hold.shown = key;
    if (v.left <= 0) { beep('done'); buzz([200, 100, 200]); hold = null; logSet({ sec: target, completedSteps: flowInfo().steps.length }); return; }
    const el = root.querySelector('[data-hold-sec]'); if (el) el.textContent = v.lead || fmtClock(v.left);
    const sub = root.querySelector('[data-hold-sub]'); if (sub) sub.textContent = v.lead ? 'get ready' : 'left';
    const b = root.querySelector('[data-hold-btn]'); if (b) b.textContent = v.lead ? 'Cancel' : 'Stop & log';
    const r = root.querySelector('.ring'); if (r) setRing(r, v.done / target);
    if (v.lead) beep('tick');
    else if (was && was[0] === 'L') { beep('go'); buzz([60]); }
    return;
  }
  if (hold && hold.idx === w.idx && w.phase === 'set') {
    const v = holdView(), target = holdTarget();
    const key = v.lead ? `L${v.lead}` : String(v.left);
    if (key === hold.shown) return;
    const was = hold.shown; hold.shown = key;
    if (v.left <= 0 && bothSides() && hold.side === 1) {
      // First side done: a short switch countdown, then the same hold on the other side.
      beep('go'); buzz([120, 60, 120]); hold.side = 2; hold.start = Date.now() + SWITCH_IN * 1000; hold.shown = null; tick(); return;
    }
    if (v.left <= 0) { beep('done'); buzz([200, 100, 200]); hold = null; logSet({ sec: target }); return; }
    const el = root.querySelector('[data-hold-sec]'); if (el) el.textContent = v.lead || v.left;
    const u = root.querySelector('[data-hold-unit]'); if (u) u.textContent = v.lead ? '' : 's';
    const sub = root.querySelector('[data-hold-sub]'); if (sub) sub.textContent = holdSub(v, target);
    const b = root.querySelector('[data-hold-btn]'); if (b) b.textContent = v.lead && hold.side !== 2 ? 'Cancel' : 'Stop & log';
    const r = root.querySelector('.ring'); if (r) setRing(r, v.done / target);
    if (v.lead) beep('tick');
    else if (was && was[0] === 'L') { beep('go'); buzz([60]); }
    else if (v.left <= 3) beep('tick');
  }
}

// Timed holds: a short get-ready countdown, then count down to the target and log automatically at zero.
// One-sided holds (side plank, single-leg stand, stretches) run the target once per side, with a switch countdown between.
const LEAD_IN = 3, SWITCH_IN = 5;
const bothSides = () => !flowNow() && !!(item().perSide || ex().unilateral);
function holdSub(v, target) {
  const side = bothSides() && hold && hold.idx === w.idx ? ` · side ${hold.side} of 2` : bothSides() ? ' each side' : '';
  if (v.lead) return hold?.side === 2 ? 'switch sides' : 'get ready';
  return `target ${item().holdSec ? `${item().holdSec[0]}–${item().holdSec[1]}` : target} s${side}`;
}
// A flow counts down as a whole: its target is the sum of its (adapted) steps.
const holdTarget = () => (flowNow() ? flowInfo().total : item().holdSec ? item().holdSec[1] : 30);
function holdView() {
  const ms = Date.now() - hold.start;
  if (ms < 0) return { lead: Math.ceil(-ms / 1000), done: 0, left: holdTarget() };
  const done = Math.floor(ms / 1000);
  return { lead: 0, done, left: Math.max(0, holdTarget() - done) };
}

function startRest(sec) {
  if (!sec || sec <= 0) { w.phase = 'set'; save(); draw(); return; }
  w.phase = 'rest'; w.restTotal = sec; w.restEndsAt = Date.now() + sec * 1000; lastRestSecond = null;
  save(); draw();
}
function endRest() { w.phase = 'set'; w.restEndsAt = null; save(); draw(); root.querySelector('[data-act="log-set"],[data-act="hold-start"]')?.focus({ preventScroll: true }); }

// ---------- flow ----------
function logSet(entry) {
  const it = item(), l = log();
  l.sets.push({ ...entry, done: true });
  if (l.sets.length >= it.sets && needsRating(it) && !l.rating) { w.phase = 'rate'; save(); draw(); return; }
  if (l.sets.length >= it.sets) l.rating = l.rating || 'good';
  advance(it.restSec);
}

// Supersets / circuits: items sharing `superset` in the same block alternate set by set with shared rest.
const remaining = i => !w.logs[i].skipped && w.logs[i].sets.length < w.items[i].sets;
function groupOf(i) {
  const it = w.items[i];
  if (it.superset == null) return [i];
  return w.items.map((x, j) => j).filter(j => w.items[j].superset === it.superset && w.items[j].bi === it.bi);
}
/** Move to the next thing to do (partner in a superset, same exercise, or the next exercise) after `rest` seconds. */
function advance(rest) {
  const g = groupOf(w.idx);
  let target = null;
  if (g.length > 1) {
    const pos = g.indexOf(w.idx);
    for (let k = 1; k <= g.length; k++) { const j = g[(pos + k) % g.length]; if (remaining(j)) { target = j; break; } }
  } else if (remaining(w.idx)) target = w.idx;
  if (target == null) { const after = Math.max(...g); target = w.items.findIndex((_, j) => j > after && remaining(j)); if (target < 0) target = null; }
  if (target == null) target = w.items.findIndex((_, j) => remaining(j)); // anything skipped past earlier
  hold = null;
  if (target == null || target < 0) { w.phase = 'finish'; save(); draw(); window.scrollTo(0, 0); return; }
  const moved = target !== w.idx;
  w.idx = target;
  // No rest when hopping inside a circuit round is configured as 0; otherwise rest as prescribed.
  if (rest > 0) startRest(rest); else { w.phase = 'set'; save(); draw(); }
  if (moved) window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/**
 * Similar moves for a non-ladder item (planner swapAlternatives): same body region and purpose, what the user can do with
 * the session's kit (today's kit when the Quick request carried one), within the moment's rules, not already in the session.
 */
function swapsFor(exId) {
  const req = w.session?.request || {};
  try {
    return swapAlternatives(exId, getState().profile || null, EXERCISES, {
      equipment: Array.isArray(req.equipment) ? req.equipment : undefined,
      moment: w.session?.moment || req.moment, exclude: w.items.map(i => i.exerciseId),
    });
  } catch (err) { console.warn(err); return []; }
}
function swapSheet() {
  const list = swapsFor(item().exerciseId);
  if (!list.length) return;
  const cur = ex();
  openSheet({
    title: `Swap ${cur.name}`, cls: 'sheet-small swap-sheet',
    html: `<p class="small muted">Similar moves for the same area. Pick one to do instead.</p>
      <ul class="swap-list">${list.map(x => `<li><button type="button" class="swap-opt" data-swap="${esc(x.id)}">
        <span class="swap-thumb" data-anim="${esc(x.id)}" data-size="64" aria-hidden="true"></span>
        <span class="swap-text"><span class="opt-name">${esc(x.name)}</span><span class="small muted">${esc(x.muscles.primary.map(muscleName).join(', '))}${x.mode === 'hold' ? ' · hold' : ''}</span></span>
        ${icon('chevron', { size: 18 })}</button></li>`).join('')}</ul>
      <button type="button" class="btn btn-quiet btn-block" data-close>Keep ${esc(cur.name)}</button>`,
    onMount(el, close) {
      const stop = mountAnims(el);
      el.addEventListener('click', ev => {
        const b = ev.target.closest('[data-swap]'); if (!b) return;
        const t = list.find(x => x.id === b.dataset.swap);
        close();
        if (t) swap(0, t);
      });
      return stop;
    },
  });
}

function swap(dir, target = neighbour(item().exerciseId, dir, getState().profile)) {
  if (flowNow()) return;
  if (!target) return;
  const it = item();
  it.exerciseId = target.id;
  if (target.mode === 'hold' && !it.holdSec) { it.holdSec = [20, 30]; it.reps = null; }
  if (target.mode === 'reps' && !it.reps) { it.reps = [6, 10]; it.holdSec = null; }
  it.perSide = !!target.unilateral;
  it.family = target.family; log().family = target.family;   // a Swap may cross families (warm-up <-> mobility)
  log().exerciseId = target.id;
  hold = null;
  save(); draw();
}

async function onClick(e) {
  unlockAudio();
  const st = handleStepper(e);
  if (st) { if (st.name === 'duration') { w.durationMin = st.value; save(); } return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  switch (a.dataset.act) {
    case 'log-set': { const v = +root.querySelector('[data-stepper="reps"] [data-val]').textContent; buzz([40]); logSet({ reps: v }); break; }
    case 'hold-start': hold = { idx: w.idx, start: Date.now() + LEAD_IN * 1000, shown: null, side: 1 }; draw(); tick(); break;
    case 'hold-stop': {
      const ms = Date.now() - hold.start, side = hold.side; hold = null;
      if (side === 2 && ms < 1000) { logSet({ sec: holdTarget() }); break; } // stopped at the switch: the first side was held in full
      if (ms < 1000) { draw(); break; } // cancelled during the get-ready countdown
      const sec = Math.min(holdTarget(), Math.floor(ms / 1000));
      if (flowNow()) { logSet({ sec, completedSteps: flowInfo().steps.filter(s => s.end <= sec + 0.5).length }); break; }
      logSet({ sec }); break;
    }
    case 'hold-log': {
      const it = item();
      if (flowNow()) { logSet({ sec: flowInfo().total, completedSteps: flowInfo().steps.length }); break; }
      logSet({ sec: it.holdSec ? it.holdSec[1] : 30 }); break;
    }
    case 'rest-add': w.restEndsAt += 15000; w.restTotal += 15; save(); tick(); break;
    case 'rest-skip': endRest(); break;
    case 'easier': swap(-1); break;
    case 'harder': swap(1); break;
    case 'swap-open': swapSheet(); break;
    case 'variety': { const v = varietySwaps(item().exerciseId, getState().profile).find(x => x.id === a.dataset.id); if (v) swap(0, v); break; }
    case 'skip': log().skipped = true; log().sets = []; hold = null; advance(0); break;
    case 'rate': log().rating = a.dataset.val; save();
      root.querySelectorAll('.rate-btn').forEach(b => b.setAttribute('aria-pressed', String(b === a)));
      root.querySelector('[data-act="rate-next"]').disabled = false; break;
    case 'rate-next': advance(item().restSec); break;
    case 'feel': w.feel = +a.dataset.val; save();
      root.querySelectorAll('.feel-btn').forEach(b => b.setAttribute('aria-pressed', String(b === a)));
      root.querySelector('[data-act="save"]').disabled = false; break;
    case 'back-to-work': { const j = w.items.findIndex((_, k) => remaining(k)); if (j >= 0) w.idx = j; w.phase = 'set'; save(); draw(); break; }
    case 'save': finish(); break;
    case 'done': clearActiveWorkout(); ctxRef.go('#/today'); break;
    case 'close': leaveSheet(); break;
    default: break;
  }
}

function onInput(e) {
  if (!e.target.matches('[data-pain]')) return;
  const v = +e.target.value;
  log().pain = v; save();
  e.target.setAttribute('aria-valuetext', `${v} out of 10`);
  root.querySelector('[data-pain-out]').textContent = `${v}/10`;
  root.querySelector('[data-pain-note]').hidden = !(v > 3);
}

function leaveSheet() {
  const hasSets = w.logs.some(l => l.sets.length);
  openSheet({
    title: 'Pause workout', cls: 'sheet-small',
    html: `<p class="muted">Your progress is saved on this device. Resume any time today.</p>
      <div class="stack">
        <button class="btn btn-primary btn-block" data-close>Keep going</button>
        <button class="btn btn-ghost btn-block" data-leave="later">Leave and resume later</button>
        ${hasSets ? '<button class="btn btn-ghost btn-block" data-leave="finish">Finish early and save</button>' : ''}
        <button class="btn btn-quiet btn-block danger-text" data-leave="discard">Discard workout</button></div>`,
    onMount(el, close) {
      el.addEventListener('click', ev => {
        const b = ev.target.closest('[data-leave]'); if (!b) return;
        close();
        if (b.dataset.leave === 'later') ctxRef.go('#/today');
        if (b.dataset.leave === 'finish') { w.phase = 'finish'; save(); draw(); }
        if (b.dataset.leave === 'discard') { clearActiveWorkout(); ctxRef.go('#/today'); }
      });
    },
  });
}

// ---------- completion ----------
function finish() {
  const before = getStreak();
  const items = w.logs.filter(l => l.sets.length && !l.skipped).map(l => {
    const o = { exerciseId: l.exerciseId, family: l.family, sets: l.sets.map(s => ({ ...s })), rating: l.rating || 'good' };
    if (l.pain != null) o.pain = l.pain;
    return o;
  });
  const sessionLog = {
    id: `${w.date}-${w.sessionId}-${Date.now().toString(36)}`, date: w.date, weekIndex: w.weekIndex, sessionId: w.sessionId,
    name: w.session.name, durationMin: w.durationMin || elapsedMin(), feel: w.feel, items, ...(w.session.request && { request: w.session.request }),
  };
  if (w.weekPhase) sessionLog.phase = w.weekPhase;
  if (w.reentry != null) sessionLog.reentry = true;
  let changes = [];
  update(s => {
    const history = s.logs.slice();
    s.logs.push(sessionLog);
    if (w.sessionId !== 'M' && s.profile) {
      try {
        const res = applySessionLog(s.levels, s.profile, sessionLog, EXERCISES, history, planOpts());
        if (res && res.levels) { s.levels = res.levels; changes = res.changes || []; }
      } catch (err) { console.error('applySessionLog failed', err); }
    }
  });
  clearActiveWorkout();
  const after = getStreak();
  const elapsedSec = Math.round((Date.now() - w.startedAt) / 1000);
  // Only say "under a minute" when the duration wasn't edited and the timer really ran < 60 s.
  celebrate = { log: sessionLog, changes, before, after, shortSec: elapsedSec < 60 && w.durationMin === elapsedMin() ? elapsedSec : null };
  releaseWake();
  draw();
  beep('done'); buzz([80, 60, 160]);
}

function drawCelebrate() {
  const { log: L, changes, before, after } = celebrate;
  try { player && player.destroy(); } catch { /* ignore */ }
  player = null; stageId = null;
  const wkUp = (after.weekly?.current ?? 0) > (before.weekly?.current ?? 0);
  const dayUp = (after.current ?? 0) > (before.current ?? 0);
  const sets = L.items.reduce((a, i) => a + i.sets.length, 0);
  const wk = after.weekly?.current ?? 0;
  const isMain = L.sessionId !== 'M';
  const isTaiso = L.sessionId === MORNING_TAISO_SESSION_ID;
  const shortMoment = isShortMomentLog(L);
  const moment = L.request?.moment;
  const light = isTaiso || shortMoment;
  const hasPlan = !!getState().profile;   // Quick-only users have no weekly target: day streak only   // day streak only: no weekly credit (v1.2)
  const firstEver = isMain && !light && getState().logs.filter(isTrainingLog).length === 1;
  const durLabel = celebrate.shortSec != null ? 'under a minute' : plural(L.durationMin, 'minute');
  const lv = changes.map(c => {
    if (c.flow) { // flow progression: same flow, next stage (stance, support, tempo or the full version)
      return `<li class="lv ${c.up ? 'up' : 'down'}"><strong>${esc(exName(c.to))}</strong> <span class="small muted">stage ${(c.fromStage ?? 0) + 1} → ${(c.toStage ?? 0) + 1}</span>
      <span class="lv-tag">${c.up ? 'next stage' : 'eased back'}</span>${c.reason ? `<span class="small muted lv-why">${esc(c.reason)}</span>` : ''}</li>`;
    }
    const up = (byId[c.to]?.level ?? 0) > (byId[c.from]?.level ?? 0);
    return `<li class="lv ${up ? 'up' : 'down'}"><span>${esc(exName(c.from))}</span> <span aria-hidden="true">→</span><span class="sr-only">to</span> <strong>${esc(exName(c.to))}</strong>
      <span class="lv-tag">${up ? 'unlocked' : 'eased back'}</span>${c.reason ? `<span class="small muted lv-why">${esc(c.reason)}</span>` : ''}</li>`;
  }).join('');
  root.innerHTML = `<div class="celebrate" role="status">
    <div class="stamp-wrap">${seal('鍛', { size: 132, cls: 'stamp' })}<span class="ink-ring" aria-hidden="true"></span></div>
    <p class="eyebrow">鍛えた · forged</p>
    <h1 class="title">Session complete</h1>
    <p class="muted">${esc(L.name)} · ${durLabel} · ${plural(sets, 'set')}</p>
    <div class="cele-stats">
      ${!hasPlan ? '' : wk > 0 ? `<div class="cstat ${wkUp ? 'up' : ''}"><span class="cnum">${wk}</span><span class="clab">week streak${wkUp ? ' ↑' : ''}</span></div>`
        : `<div class="cstat up"><span class="cnum cnum-jp" lang="ja">${firstEver ? '初' : '印'}</span><span class="clab">${firstEver ? 'First stamp earned' : 'Stamp earned'}</span></div>`}
      ${hasPlan ? `<div class="cstat ${light ? '' : 'up'}"><span class="cnum">${Math.min(sessionsThisWeek(), weeklyTarget())}<small>/${weeklyTarget()}</small></span><span class="clab">${wk > 0 ? 'this week' : `Week ${Math.max(1, (L.weekIndex ?? 0) + 1)} underway`}</span></div>` : ''}
      ${isMain ? `<div class="cstat ${dayUp || (after.current ?? 0) === 0 ? 'up' : ''}"><span class="cnum">${Math.max(1, after.current ?? 0)}</span><span class="clab">day streak${dayUp ? ' ↑' : ''}</span></div>` : ''}
    </div>
    ${isTaiso ? `<p class="small muted">Morning Taisō keeps your day streak going.${hasPlan ? ' It doesn’t count towards your weekly sessions.' : ''}</p>` : ''}
    ${shortMoment ? `<p class="small muted">${esc(MOMENTS[moment]?.label || 'This moment')} keeps your day streak going.${hasPlan ? ' Moments of 10 min or less don’t count towards your weekly sessions.' : ''}</p>` : ''}
    ${lv ? `<section class="card levelups"><h2 class="section-title">Progressions</h2><ul>${lv}</ul></section>`
      : isTaiso || shortMoment || RECOVERY.has(moment) ? '' : `<p class="small muted">Keep logging honestly — progressions unlock when you top the rep range.</p>`}
    <button class="btn btn-primary btn-lg btn-block" data-act="done">Done</button></div>`;
  root.querySelector('[data-act="done"]').focus({ preventScroll: true });
}
