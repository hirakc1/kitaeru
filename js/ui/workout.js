// Full-screen workout player with per-set logging, rest timer, swaps, ratings, completion & celebration.
import { EXERCISES, byId, createSkeletonPlayer, renderBodyMap, applySessionLog } from './deps.js';
import { getState, update, getActiveWorkout, saveActiveWorkout, clearActiveWorkout } from '../store.js';
import { esc, icon, seal, fmtTarget, exName, muscleName, familyName, neighbour, stepper, handleStepper, ring, setRing,
  beep, buzz, unlockAudio, openSheet, reducedMotion, clamp, plural } from './components.js';
import { getStreak, sessionsThisWeek, weeklyTarget, groupLabel, planOpts } from './model.js';

const RATED = new Set(['main', 'skill', 'conditioning']);
const FEEL = [[1, 'Very easy'], [2, 'Easy'], [3, 'Solid'], [4, 'Hard'], [5, 'Max effort']];

let w = null, root = null, stageEl = null, player = null, timer = 0, hold = null, wakeLock = null, celebrate = null, ctxRef = null;
let lastRestSecond = null;

const save = () => saveActiveWorkout(w);
const item = () => w.items[w.idx];
const log = () => w.logs[w.idx];
const ex = () => byId[item().exerciseId];

export function render(host, ctx) {
  root = host; ctxRef = ctx; celebrate = null; hold = null;
  w = getActiveWorkout();
  if (!w) { ctx.go('#/today', { replace: true }); return; }
  if (w.phase === 'rest' && w.restEndsAt && Date.now() >= w.restEndsAt) { w.phase = 'set'; w.restEndsAt = null; save(); }
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
  };
}

// ---------- wake lock ----------
async function requestWake() { try { if ('wakeLock' in navigator && document.visibilityState === 'visible') wakeLock = await navigator.wakeLock.request('screen'); } catch { wakeLock = null; } }
function releaseWake() { try { wakeLock && wakeLock.release(); } catch { /* ignore */ } wakeLock = null; }
function onVis() { if (document.visibilityState === 'visible' && timer) requestWake(); }

// ---------- stage ----------
let stageId = null;
function setStage(exId) {
  const e = byId[exId];
  if (!e) return;
  const size = 1200; // CSS sizes the hero (full column width, clamp height); this only caps max-width
  if (player && stageId === exId) return;
  const animId = e.anim || e.id;
  try {
    if (player && player.setAnim) player.setAnim(animId, e.muscles.primary, e.muscles.secondary);
    else { player && player.destroy(); player = createSkeletonPlayer(stageEl, animId, { primary: e.muscles.primary, secondary: e.muscles.secondary, size, playing: !reducedMotion() }); }
  } catch (err) { console.warn('skeleton failed', err); }
  stageEl.setAttribute('aria-label', `${e.name} demonstration`);
  stageId = exId;
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
  setStage(it.exerciseId);
  const setNo = Math.min(l.sets.length + 1, it.sets);
  const easier = neighbour(it.exerciseId, -1, getState().profile);
  const harder = neighbour(it.exerciseId, 1, getState().profile);
  const muscles = e.muscles;
  const grp = groupLabel(w.items, w.idx);
  content.innerHTML = `
    <p class="pl-muscles" aria-label="Muscles worked">${muscles.primary.map(m => `<span class="mchip mchip-p">${esc(muscleName(m))}</span>`).join('')}${muscles.secondary.map(m => `<span class="mchip mchip-s">${esc(muscleName(m))}</span>`).join('')}</p>
    <p class="eyebrow pl-block">${esc(it.blockTitle || it.blockKind)} · ${w.idx + 1} of ${w.items.length}${grp ? ` · <span class="pl-group">${grp.circuit ? 'Circuit' : 'Superset'} ${grp.label}</span>` : ''}</p>
    <h1 class="pl-name">${esc(e.name)}</h1>
    <p class="pl-target">${esc(fmtTarget(it))}${it.rir != null && RATED.has(it.blockKind) ? ` <span class="muted small">· stop ${it.rir} rep${it.rir === 1 ? '' : 's'} short of failure</span>` : ''}</p>
    ${it.notes ? `<p class="small pl-note">${esc(it.notes)}</p>` : ''}
    <ul class="pl-cues">${(e.cues || []).map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    <div class="pl-sets" aria-label="Set ${setNo} of ${it.sets}">${Array.from({ length: it.sets }, (_, i) => {
      const s = l.sets[i];
      return `<span class="set-pill ${s ? 'done' : i === l.sets.length ? 'cur' : ''}">${s ? (s.sec != null ? `${s.sec}s` : s.reps) : `Set ${i + 1}`}</span>`;
    }).join('')}</div>
    <div class="pl-panel">${w.phase === 'rest' ? restHTML() : w.phase === 'rate' ? rateHTML() : loggerHTML()}</div>
    ${w.phase === 'set' ? `<div class="pl-actions">
      <button class="btn btn-quiet btn-sm" data-act="easier" ${easier ? '' : 'disabled'} aria-label="Swap to an easier variation${easier ? `: ${esc(easier.name)}` : ''}">${icon('easier', { size: 18 })} Easier</button>
      <button class="btn btn-quiet btn-sm" data-act="harder" ${harder ? '' : 'disabled'} aria-label="Swap to a harder variation${harder ? `: ${esc(harder.name)}` : ''}">${icon('harder', { size: 18 })} Harder</button>
      <button class="btn btn-quiet btn-sm" data-act="skip">${icon('skip', { size: 18 })} Skip</button></div>` : ''}
    <details class="pl-details"><summary>Muscles worked</summary>
      <div class="pl-body"><div class="bodymap" data-bodymap></div>
      <div><p class="small"><span class="key key-p"></span>${muscles.primary.map(muscleName).join(', ')}</p>
      ${muscles.secondary.length ? `<p class="small muted"><span class="key key-s"></span>${muscles.secondary.map(muscleName).join(', ')}</p>` : ''}
      <p class="small muted">${esc(familyName(e.family))} · level ${e.level}</p></div></div></details>`;
  const bm = content.querySelector('[data-bodymap]');
  content.querySelector('.pl-details').addEventListener('toggle', ev => { if (ev.target.open && !bm.childNodes.length) { try { renderBodyMap(bm, { primary: muscles.primary, secondary: muscles.secondary, size: 150 }); } catch (err) { console.warn(err); } } }, { once: false });
}

function loggerHTML() {
  const it = item(), e = ex(), l = log();
  if (e.mode === 'hold' || it.holdSec) {
    const target = it.holdSec ? it.holdSec[1] : 30;
    const running = hold && hold.idx === w.idx;
    const sec = running ? Math.floor((Date.now() - hold.start) / 1000) : 0;
    return `<div class="logger hold">${ring({ progress: sec / target, size: 168, label: `<span data-hold-sec>${sec}</span><small>s</small>`, sub: `target ${it.holdSec ? `${it.holdSec[0]}–${it.holdSec[1]}` : target} s`, cls: running ? 'running' : '' })}
      <div class="btn-row">${running ? `<button class="btn btn-primary btn-lg" data-act="hold-stop">${icon('check', { size: 20 })} Stop & log</button>`
        : `<button class="btn btn-primary btn-lg" data-act="hold-start">${icon('play', { size: 20 })} Start</button>
           <button class="btn btn-ghost" data-act="hold-log" aria-label="Log ${target} seconds without the timer">Log ${target}s</button>`}</div></div>`;
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
  const nextLabel = log().sets.length === 0 || grp ? `Up next: ${tag}<strong>${esc(exName(next.exerciseId))}</strong> · set ${log().sets.length + 1} of ${next.sets}` : `Next: set ${log().sets.length + 1} of ${next.sets}`;
  return `<div class="logger rest" aria-live="off">${ring({ progress: left / (w.restTotal || 1), size: 168, label: `<span data-rest-left>${fmtClock(left)}</span>`, sub: 'rest', cls: 'rest-ring' })}
    <p class="center small">${nextLabel}</p>
    <div class="btn-row"><button class="btn btn-ghost" data-act="rest-add">+15 s</button><button class="btn btn-primary" data-act="rest-skip">Skip rest</button></div></div>`;
}

function rateHTML() {
  const l = log();
  const pain = l.pain;
  return `<div class="logger rate"><p class="label center" id="ratel">How did ${esc(ex().name)} feel?</p>
    <div class="rate-row" role="group" aria-labelledby="ratel">${[['easy', 'Easy', '軽'], ['good', 'Good', '良'], ['hard', 'Hard', '重']].map(([v, t, k]) =>
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
  if (hold && hold.idx === w.idx && w.phase === 'set') {
    const sec = Math.floor((Date.now() - hold.start) / 1000);
    const el = root.querySelector('[data-hold-sec]');
    if (el && el.textContent !== String(sec)) {
      el.textContent = sec;
      const target = item().holdSec ? item().holdSec[1] : 30;
      const r = root.querySelector('.ring'); if (r) setRing(r, sec / target);
      if (sec === target) { beep('done'); buzz([200, 100, 200]); }
      else if (item().holdSec && sec === item().holdSec[0]) beep('tick');
    }
  }
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
  if (l.sets.length >= it.sets && RATED.has(it.blockKind) && !l.rating) { w.phase = 'rate'; save(); draw(); return; }
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

function swap(dir) {
  const target = neighbour(item().exerciseId, dir, getState().profile);
  if (!target) return;
  const it = item();
  it.exerciseId = target.id;
  if (target.mode === 'hold' && !it.holdSec) { it.holdSec = [20, 30]; it.reps = null; }
  if (target.mode === 'reps' && !it.reps) { it.reps = [6, 10]; it.holdSec = null; }
  it.perSide = !!target.unilateral;
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
    case 'hold-start': hold = { idx: w.idx, start: Date.now() }; beep('go'); draw(); break;
    case 'hold-stop': { const sec = Math.max(1, Math.floor((Date.now() - hold.start) / 1000)); hold = null; logSet({ sec }); break; }
    case 'hold-log': { const it = item(); logSet({ sec: it.holdSec ? it.holdSec[1] : 30 }); break; }
    case 'rest-add': w.restEndsAt += 15000; w.restTotal += 15; save(); tick(); break;
    case 'rest-skip': endRest(); break;
    case 'easier': swap(-1); break;
    case 'harder': swap(1); break;
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
    name: w.session.name, durationMin: w.durationMin || elapsedMin(), feel: w.feel, items,
  };
  if (w.weekPhase) sessionLog.phase = w.weekPhase;
  if (w.reentry != null) sessionLog.reentry = true;
  let changes = [];
  update(s => {
    const history = s.logs.slice();
    s.logs.push(sessionLog);
    if (w.sessionId !== 'M') {
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
  const firstEver = isMain && getState().logs.filter(x => x.sessionId !== 'M').length === 1;
  const durLabel = celebrate.shortSec != null ? 'under a minute' : plural(L.durationMin, 'minute');
  const lv = changes.map(c => {
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
      ${wk > 0 ? `<div class="cstat ${wkUp ? 'up' : ''}"><span class="cnum">${wk}</span><span class="clab">week streak${wkUp ? ' ↑' : ''}</span></div>`
        : `<div class="cstat up"><span class="cnum cnum-jp" lang="ja">${firstEver ? '初' : '印'}</span><span class="clab">${firstEver ? 'First stamp earned' : 'Stamp earned'}</span></div>`}
      <div class="cstat up"><span class="cnum">${Math.min(sessionsThisWeek(), weeklyTarget())}<small>/${weeklyTarget()}</small></span><span class="clab">${wk > 0 ? 'this week' : `Week ${Math.max(1, (L.weekIndex ?? 0) + 1)} underway`}</span></div>
      ${isMain ? `<div class="cstat ${dayUp || (after.current ?? 0) === 0 ? 'up' : ''}"><span class="cnum">${Math.max(1, after.current ?? 0)}</span><span class="clab">day streak${dayUp ? ' ↑' : ''}</span></div>` : ''}
    </div>
    ${lv ? `<section class="card levelups"><h2 class="section-title">Progressions</h2><ul>${lv}</ul></section>` : `<p class="small muted">Keep logging honestly — progressions unlock when you top the rep range.</p>`}
    <button class="btn btn-primary btn-lg btn-block" data-act="done">Done</button></div>`;
  root.querySelector('[data-act="done"]').focus({ preventScroll: true });
}
