// "Make a workout" (v1.2): pick a time, see what the session contains, start it. One sheet.
// Library pools (a tradition, the rotation explainer, a category or a family) use the Quick pool API
// (generateQuickSession({ minutes, tradition?, category?, family? }) and quickPoolIds). The sheet itself is generic:
// a *source* says what to build, so a later source (e.g. a "moment of day") reuses the time picker and the preview.
//   source = { title, heading, lead?, request(minutes, date) -> Quick request }
import { EXERCISES, FAMILIES, TRADITIONS, generateQuickSession, quickPoolIds } from './deps.js';
import { getState, update, todayISO } from '../store.js';
import { esc, icon, openSheet, fmtTarget, exName, toast } from './components.js';
import { QUICK_MINUTES, sessionMinutes, startWorkout } from './model.js';

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
/** What a no-profile (Quick-only) user has to hand: their last Quick picks. The profile wins when there is one. */
function kitRequest() {
  const s = getState();
  if (s.profile) return {};
  const q = s.settings.quick || {};
  return { equipment: [...(q.equipment || ['wall'])], space: 'medium', lowImpact: !!q.lowImpact };
}
/** Is there anything to build from? (hide the control when the pool is empty). */
export function poolAvailable(filter) {
  const f = poolFilter(filter);
  if (!Object.keys(f).length) return false;
  try { return quickPoolIds({ ...f, ...kitRequest() }, getState().profile || null, EXERCISES).length > 0; } catch (e) { console.warn(e); return false; }
}
/** A maker source for a Library pool. */
export function poolSource(filter) {
  const f = poolFilter(filter);
  const label = poolLabel(f);
  const exp = f.tradition && TRADITIONS[f.tradition]?.kind === 'explainer';
  return {
    title: `Make a ${label} workout`, heading: exp ? `${label} workout` : label,
    request: (minutes, date) => ({ minutes, ...f, ...kitRequest(), date }),
  };
}
/** The Library / culture-card control. Empty string when the pool is empty. */
export function makeButtonHTML(filter, { cls = '' } = {}) {
  if (!poolAvailable(filter)) return '';
  const label = poolLabel(filter);
  const exp = filter.tradition && TRADITIONS[filter.tradition]?.kind === 'explainer';
  return `<button type="button" class="card quick-card mk-open ${cls}" data-make="${esc(JSON.stringify(poolFilter(filter)))}">
    <span class="quick-mark" aria-hidden="true">作</span>
    <span class="quick-text"><span class="opt-name">Make a ${esc(exp ? label.toLowerCase() : label)} workout</span>
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
    ${sessionListHTML(session)}</div>`;
}

// ---------- the sheet ----------
function build(source, minutes) {
  const s = getState();
  const req = source.request(minutes, todayISO());
  try {
    const session = generateQuickSession(req, s.profile || null, s.profile ? s.levels : null, EXERCISES);
    if (!session?.blocks?.some(b => b.items?.length)) return { error: 'Nothing fits right now. Try another length.' };
    session.request = req;
    return { session };
  } catch (e) {
    if (e?.code !== 'AGE_UNDER_13') console.error(e);
    return { error: e?.code === 'AGE_UNDER_13' ? 'Kitaeru is for ages 13 and up.' : 'Couldn’t build that workout. Try another length.' };
  }
}

/** Open the maker sheet for a source. Returns close(). */
export function openMaker(source) {
  let minutes = QUICK_MINUTES.includes(getState().settings.makeMinutes) ? getState().settings.makeMinutes : DEFAULT_MIN;
  let res = build(source, minutes);
  const hasProfile = !!getState().profile;
  return openSheet({
    title: source.title, cls: 'mk-sheet',
    titleHTML: `<span class="mk-eyebrow">Make a workout</span><span class="title-en">${esc(source.heading)}</span>`,
    html: `<p class="small muted mk-lead">${esc(source.lead || (hasProfile ? 'Built around your levels, kit and injuries. It counts like any Quick workout.' : 'No setup needed. It counts like any Quick workout.'))}</p>
      <div data-mk-times>${timeChipsHTML(minutes)}</div>
      <div data-mk-preview aria-live="polite"></div>
      <div class="sheet-cta mk-cta"><button type="button" class="btn btn-primary btn-lg btn-block" data-act="mk-start">${icon('play', { size: 18 })} <span data-mk-label>Start</span></button></div>`,
    onMount(el) {
      const draw = () => {
        el.querySelector('[data-mk-preview]').innerHTML = res.session ? previewHTML(res.session) : `<p class="note note-warn">${esc(res.error)}</p>`;
        const start = el.querySelector('[data-act="mk-start"]');
        start.disabled = !res.session;
        el.querySelector('[data-mk-label]').textContent = res.session ? `Start · ${sessionMinutes(res.session)} min` : 'Start';
      };
      draw();
      el.addEventListener('click', e => {
        const a = e.target.closest('[data-act]'); if (!a) return;
        if (a.dataset.act === 'mk-min') {
          minutes = +a.dataset.val;
          el.querySelectorAll('[data-act="mk-min"]').forEach(b => b.setAttribute('aria-pressed', String(b === a)));
          update(s => { s.settings.makeMinutes = minutes; });
          res = build(source, minutes);
          draw();
        } else if (a.dataset.act === 'mk-start') {
          if (!res.session) { toast(res.error || 'Pick a time first.'); return; }
          if (!getState().profile) update(s => { s.settings.quickUser = true; });
          // A Quick workout in every way: session id 'Q', logged with its request (streaks count it like Quick).
          startWorkout({ ...res.session, id: 'Q' }, { sessionId: 'Q' });
        }
      });
    },
  });
}
