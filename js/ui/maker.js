// "Make a workout" (v1.2): pick a time, see what the session contains, start it. One sheet.
// Library pools (a tradition, the rotation explainer, a category or a family) use the Quick pool API
// (generateQuickSession({ minutes, tradition?, category?, family? }) and quickPoolIds). The sheet itself is generic:
// a *source* says what to build, so a later source (e.g. a "moment of day") reuses the time picker and the preview.
//   source = { title, heading, lead?, request(minutes, date) -> Quick request }
import { EXERCISES, FAMILIES, TRADITIONS, generateQuickSession, quickPoolIds } from './deps.js';
import { getState, update, todayISO } from '../store.js';
import { esc, icon, openSheet, fmtTarget, exName, toast } from './components.js';
import { QUICK_MINUTES, sessionMinutes, startWorkout } from './model.js';
import { EQUIP } from './onboarding.js';

// Library chip labels (the planner's own names: "Cardio" for conditioning).
const CAT_LABEL = { strength: 'Strength', core: 'Core', skill: 'Skill', conditioning: 'Cardio', mobility: 'Mobility', warmup: 'Warm-up', flow: 'Flow',
  balance: 'Balance', breath: 'Breath' };
const BLOCK_LABEL = { warmup: 'Warm-up', skill: 'Skill', main: 'Main', conditioning: 'Conditioning', mobility: 'Mobility', cooldown: 'Cool-down', balance: 'Balance', flow: 'Flow' };
const DEFAULT_MIN = 10;

// ---------- pool sources (Library) ----------
/** Just the pool fields of a filter, without empty values: { tradition?, category?, family? }. */
export function poolFilter({ tradition, category, family } = {}) {
  return Object.fromEntries(Object.entries({ tradition, category, family }).filter(([, v]) => typeof v === 'string' && v));
}
/** "Tai Chi", "Mobility", "Horizontal push", "Tai Chi · Mobility". */
export function poolLabel(filter) {
  const f = poolFilter(filter);
  return [f.tradition && TRADITIONS[f.tradition]?.name, f.category && CAT_LABEL[f.category], f.family && FAMILIES[f.family]?.name].filter(Boolean).join(' · ');
}
// ---------- today's kit and level (v1.3; shared by Quick, moments and "Make a workout") ----------
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));
/** The profile's usual kit, or null for a Quick-only user. */
export const profileKit = () => (getState().profile ? [...(getState().profile.equipment || [])] : null);
/**
 * What the user has to hand today. With a profile: their usual kit unless they changed it today (remembered for the day,
 * never written to the profile). Quick-only: their last Quick picks (none to start with).
 */
export function kitToday() {
  const s = getState(), q = s.settings.quick || {};
  if (!s.profile) return [...(q.equipment || [])];
  return q.kit && q.kit.date === todayISO() && Array.isArray(q.kit.equipment) ? [...q.kit.equipment] : profileKit();
}
export function setKitToday(list) {
  const kit = [...new Set(list)];
  update(s => {
    s.settings.quick = { ...(s.settings.quick || {}) };
    if (s.profile) s.settings.quick.kit = { date: todayISO(), equipment: kit };
    else s.settings.quick.equipment = kit;
  });
}
export const toggleKit = id => { const k = kitToday(); setKitToday(k.includes(id) ? k.filter(x => x !== id) : [...k, id]); };
/**
 * The request fields for today's kit: Quick-only users always send theirs (with space and low impact); a profile sends
 * `equipment` only when today's kit differs from the usual one (so the usual sessions stay exactly as they were).
 */
export function kitRequest() {
  const s = getState();
  if (!s.profile) { const q = s.settings.quick || {}; return { equipment: kitToday(), space: 'medium', lowImpact: !!q.lowImpact }; }
  const k = kitToday();
  return sameSet(k, profileKit()) ? {} : { equipment: k };
}
const KIT_NAME = Object.fromEntries(EQUIP.map(([id, l]) => [id, l]));
/** "Kit today" chips; `open` shows them, otherwise a one-line summary that opens them. */
export function kitHTML({ act = 'kit', collapsible = false, open = false } = {}) {
  const kit = kitToday(), usual = profileKit();
  const changed = usual && !sameSet(kit, usual);
  const words = kit.length ? kit.map(id => KIT_NAME[id] || id).join(', ') : 'Nothing: floor only';
  const chips = `<div class="chips kit-chips" role="group" aria-label="Kit you have today">${EQUIP.map(([id, l, svg]) =>
    `<button type="button" class="chip kit-chip" data-act="${act}" data-val="${id}" aria-pressed="${kit.includes(id)}">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg}</svg>${esc(l)}</button>`).join('')}</div>
    <p class="small muted kit-help">${usual ? `Just for today’s workouts. Your usual kit stays as it is.${changed ? ` <button type="button" class="link link-sm" data-act="${act}-reset">Use my usual kit</button>` : ''}` : 'Tap what you have to hand. Floor and body weight always work.'}</p>`;
  if (!collapsible) return chips;
  return `<details class="kit-box" ${open ? 'open' : ''}><summary><span class="kit-sum"><span class="label">Kit today</span> <span>${esc(words)}</span>${changed ? ' <span class="badge">changed</span>' : ''}</span><span class="link-like">Change</span></summary>${chips}</details>`;
}
const LEVELS = [[-2, '−2', 'Two levels easier'], [-1, '−1', 'One level easier'], [0, 'Usual', 'Your usual level'], [1, '+1', 'One level harder'], [2, '+2', 'Two levels harder']];
/** The −2…+2 level control. */
export function levelHTML(shift = 0, { act = 'lvl' } = {}) {
  return `<div class="seg seg-sm lvl-seg" role="group" aria-label="Level">${LEVELS.map(([v, l, a]) =>
    `<button type="button" class="chip" data-act="${act}" data-val="${v}" aria-pressed="${shift === v}" aria-label="${a}">${l}</button>`).join('')}</div>`;
}
/** One line on what the level choice did to this session (or '' at the usual level). */
export function levelNoteHTML(session) {
  const sh = session?.levelShift;
  if (!sh || !sh.requested) return '';
  const ids = new Set(session.blocks.flatMap(b => b.items.map(i => i.exerciseId)));
  const fams = new Set(session.blocks.flatMap(b => b.items.map(i => i.family)));
  const seen = sh.changes.filter(c => ids.has(c.to));
  const stuck = (sh.limitedFamilies || []).filter(f => fams.has(f)).length > 0;   // a move in this session is already at the end of its ladder
  const dir = sh.requested > 0 ? 'Harder' : 'Easier';
  let text;
  if (!sh.applied) text = 'This moment stays gentle, so harder isn’t applied.';
  else if (!seen.length) text = stuck ? `These moves are already as ${sh.requested > 0 ? 'hard' : 'easy'} as suits you.` : 'Level doesn’t change the moves in this session.';
  else {
    const list = seen.slice(0, 3).map(c => `${exName(c.to)} (was ${exName(c.from)})`).join(', ');
    text = `${dir}: ${list}${seen.length > 3 ? ` and ${seen.length - 3} more` : ''}.${stuck ? ` Some are already as ${sh.requested > 0 ? 'hard' : 'easy'} as suits you.` : ''}`;
  }
  return `<p class="small lvl-note"><span class="badge">${sh.applied > 0 ? `+${sh.applied}` : sh.applied < 0 ? `−${-sh.applied}` : '0'}</span> ${esc(text)}</p>`;
}
/** When a shuffle has gone round every workout that fits. */
export function shuffleNoteHTML(session) {
  const sh = session?.shuffle;
  if (!sh || !sh.cycled) return '';
  return `<p class="small muted shuffle-note">Only ${sh.options === 1 ? 'one workout fits' : `${sh.options} workouts fit`} these picks, so shuffling repeats them. Try another time, kit or level.</p>`;
}
/** Is there anything to build from? (hide the control when the pool is empty). */
export function poolAvailable(filter) {
  const f = poolFilter(filter);
  if (!Object.keys(f).length) return false;
  try { return quickPoolIds({ ...f, ...kitRequest() }, getState().profile || null, EXERCISES).length > 0; } catch (e) { console.warn(e); return false; }
}
/**
 * The same label for running text: "Make a mobility workout", "Make a Tai Chi workout", "Make a horizontal push workout".
 * Category and family names are lowercased; tradition names (and families named after one) keep their capitals.
 */
export function poolPhrase(filter) {
  const f = poolFilter(filter);
  const t = f.tradition && TRADITIONS[f.tradition];
  const proper = Object.values(TRADITIONS).filter(x => x.kind !== 'explainer').map(x => x.name);
  const lower = n => (n && !proper.some(p => n.startsWith(p)) ? n.charAt(0).toLowerCase() + n.slice(1) : n);
  const words = [t && (t.kind === 'explainer' ? lower(t.name) : t.name), f.category && lower(CAT_LABEL[f.category]), f.family && lower(FAMILIES[f.family]?.name)].filter(Boolean).join(' · ');
  return `${/^[aeiou]/i.test(words) ? 'an' : 'a'} ${words}`;
}
/** A maker source for a Library pool. */
export function poolSource(filter) {
  const f = poolFilter(filter);
  const label = poolLabel(f);
  const exp = f.tradition && TRADITIONS[f.tradition]?.kind === 'explainer';
  return {
    title: `Make ${poolPhrase(f)} workout`, heading: exp ? `${label} workout` : label,
    request: (minutes, date) => ({ minutes, ...f, ...kitRequest(), date }),
  };
}
/** The Library / culture-card control. Empty string when the pool is empty. */
export function makeButtonHTML(filter, { cls = '' } = {}) {
  if (!poolAvailable(filter)) return '';
  return `<button type="button" class="card quick-card mk-open ${cls}" data-make="${esc(JSON.stringify(poolFilter(filter)))}">
    <span class="quick-mark" aria-hidden="true">作</span>
    <span class="quick-text"><span class="opt-name">Make ${esc(poolPhrase(filter))} workout</span>
      <span class="muted small">Pick ${QUICK_MINUTES[0]} to ${QUICK_MINUTES[QUICK_MINUTES.length - 1]} min and start</span></span>
    ${icon('chevron', { size: 20 })}</button>`;
}
/** Handle a click on a make button (delegated). Returns true when handled. */
export function onMakeClick(e) {
  const b = e.target.closest?.('[data-make]');
  if (!b) return false;
  let f = {};
  try { f = JSON.parse(b.dataset.make); } catch { return false; }
  openMaker(poolSource(f));
  return true;
}

// ---------- reusable parts (time picker, preview) ----------
/** Time chips; `act` names the data-act the sheet listens for. */
export function timeChipsHTML(minutes, { options = QUICK_MINUTES, act = 'mk-min', label = 'Time' } = {}) {
  return `<div class="chips mk-times" role="group" aria-label="${esc(label)}">${options.map(m =>
    `<button type="button" class="chip" data-act="${act}" data-val="${m}" aria-pressed="${m === minutes}">${m} min</button>`).join('')}</div>`;
}
/** A short, text-only list of what a session contains: block labels, then each move and its dose. */
export function sessionListHTML(session) {
  return `<ol class="mk-list">${session.blocks.filter(b => b.items?.length).map(b => `<li class="mk-block"><span class="mk-block-t">${esc(b.title || BLOCK_LABEL[b.kind] || b.kind)}</span>
    <ul>${b.items.map(it => `<li class="mk-item"><span class="mk-name">${esc(exName(it.exerciseId))}</span><span class="small muted">${esc(fmtTarget(it))}</span></li>`).join('')}</ul></li>`).join('')}</ol>`;
}
/** Summary + optional note + list: what the user sees before Start. */
export function previewHTML(session) {
  const n = session.blocks.reduce((a, b) => a + (b.items?.length || 0), 0);
  return `<div class="mk-preview">
    <p class="mk-sum"><strong>${esc(session.name)}</strong><span class="muted small"> · ~${sessionMinutes(session)} min · ${n} exercise${n === 1 ? '' : 's'}</span></p>
    ${session.note ? `<div class="note mk-note">${icon('info', { size: 18 })}<p>${esc(session.note)}</p></div>` : ''}
    ${levelNoteHTML(session)}${shuffleNoteHTML(session)}
    ${sessionListHTML(session)}</div>`;
}

// ---------- the sheet ----------
/** Build a source's session: today's kit (in the source's request), the level choice and the shuffle count go in the request. */
function build(source, minutes, { levelShift = 0, shuffle = 0 } = {}) {
  const s = getState();
  const req = { ...source.request(minutes, todayISO()), ...(levelShift ? { levelShift } : {}), ...(shuffle ? { shuffle } : {}) };
  try {
    const session = generateQuickSession(req, s.profile || null, s.profile ? s.levels : null, EXERCISES);
    if (!session?.blocks?.some(b => b.items?.length)) return { error: 'Nothing fits right now. Try another length or add some kit.' };
    session.request = req;   // remembered with the log, so the started session can be rebuilt exactly
    return { session };
  } catch (e) {
    if (e?.code !== 'AGE_UNDER_13') console.error(e);
    return { error: e?.code === 'AGE_UNDER_13' ? 'Kitaeru is for ages 13 and up.' : 'Couldn’t build that workout. Try another length.' };
  }
}

/** Open the maker sheet for a source. Returns close(). */
export function openMaker(source) {
  let minutes = QUICK_MINUTES.includes(getState().settings.makeMinutes) ? getState().settings.makeMinutes : DEFAULT_MIN;
  let levelShift = 0, shuffle = 0, kitOpen = false;
  let res = build(source, minutes);
  const hasProfile = !!getState().profile;
  return openSheet({
    title: source.title, cls: 'mk-sheet',
    titleHTML: `<span class="mk-eyebrow">Make a workout</span><span class="title-en">${esc(source.heading)}</span>`,
    html: `<p class="small muted mk-lead">${esc(source.lead || (hasProfile ? 'Built around your levels, kit and injuries. It counts like any Quick workout.' : 'No setup needed. It counts like any Quick workout.'))}</p>
      <div data-mk-times>${timeChipsHTML(minutes)}</div>
      <div data-mk-kit></div>
      <div class="mk-level"><span class="label" id="mk-lvl">Level</span>${levelHTML(0, { act: 'mk-lvl' })}</div>
      <div data-mk-preview aria-live="polite"></div>
      <div class="sheet-cta mk-cta btn-row"><button type="button" class="btn btn-ghost" data-act="mk-shuffle">${icon('shuffle', { size: 18 })} Shuffle</button>
        <button type="button" class="btn btn-primary btn-lg" data-act="mk-start">${icon('play', { size: 18 })} <span data-mk-label>Start</span></button></div>`,
    onMount(el) {
      const drawKit = () => { el.querySelector('[data-mk-kit]').innerHTML = kitHTML({ act: 'mk-kit', collapsible: true, open: kitOpen }); };
      const draw = () => {
        el.querySelector('[data-mk-preview]').innerHTML = res.session ? previewHTML(res.session) : `<p class="note note-warn">${esc(res.error)}</p>`;
        const start = el.querySelector('[data-act="mk-start"]');
        start.disabled = !res.session;
        el.querySelector('[data-act="mk-shuffle"]').disabled = !res.session;
        el.querySelector('[data-mk-label]').textContent = res.session ? `Start · ${sessionMinutes(res.session)} min` : 'Start';
      };
      const rebuild = () => { res = build(source, minutes, { levelShift, shuffle }); draw(); };
      drawKit(); draw();
      el.addEventListener('toggle', e => { if (e.target.matches?.('.kit-box')) kitOpen = e.target.open; }, true);
      el.addEventListener('click', e => {
        const a = e.target.closest('[data-act]'); if (!a) return;
        const act = a.dataset.act;
        if (act === 'mk-min') {
          minutes = +a.dataset.val; shuffle = 0;
          el.querySelectorAll('[data-act="mk-min"]').forEach(b => b.setAttribute('aria-pressed', String(b === a)));
          update(s => { s.settings.makeMinutes = minutes; });
          rebuild();
        } else if (act === 'mk-kit' || act === 'mk-kit-reset') {
          if (act === 'mk-kit') toggleKit(a.dataset.val); else setKitToday(profileKit() || []);
          kitOpen = true; shuffle = 0;
          drawKit(); rebuild();
          el.querySelector(act === 'mk-kit' ? `[data-act="mk-kit"][data-val="${a.dataset.val}"]` : '.kit-box summary')?.focus({ preventScroll: true });
        } else if (act === 'mk-lvl') {
          levelShift = +a.dataset.val;
          el.querySelectorAll('[data-act="mk-lvl"]').forEach(b => b.setAttribute('aria-pressed', String(b === a)));
          rebuild();
        } else if (act === 'mk-shuffle') {
          shuffle++; rebuild();
        } else if (act === 'mk-start') {
          if (!res.session) { toast(res.error || 'Pick a time first.'); return; }
          if (!getState().profile) update(s => { s.settings.quickUser = true; });
          // A Quick workout in every way: session id 'Q', logged with its request (streaks count it like Quick).
          startWorkout({ ...res.session, id: 'Q' }, { sessionId: 'Q' });
        }
      });
    },
  });
}
