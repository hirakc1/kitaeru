// Derived data shared by screens: the current week, today's session, streaks, workout bootstrapping.
import { EXERCISES, byId, generateWeek, computeStreak, estimateMinutes, initialLevels, plannerStartDate, generateMorningTaiso, isShortMomentLog } from './deps.js';
import { getState, getCurrentWeekIndex, toISO, fromISO, weekStart, addDays, saveActiveWorkout, getActiveWorkout } from '../store.js';
import { isAvailable, confirmSheet } from './components.js';

let weekCache = { key: '', week: null };
export function getWeek(weekIndex = getCurrentWeekIndex()) {
  const s = getState();
  if (!s.profile) return null;
  const opts = { ...planOpts(), logs: s.logs };
  const key = JSON.stringify([s.profile, s.levels, weekIndex, s.plan, s.logs.length]);
  if (weekCache.key === key) return weekCache.week;
  let week;
  try { week = generateWeek(s.profile, s.levels, EXERCISES, weekIndex, opts); }
  catch (e) {
    if (e?.code !== 'AGE_UNDER_13') console.error('generateWeek failed', e);
    week = { weekIndex, phase: 'build', sessions: [], days: {}, meta: {}, error: e?.code || 'ERROR' };
  }
  weekCache = { key, week };
  return week;
}

/**
 * Monday the plan starts: this week's Monday if a preferred day is still ahead (today counts), else next Monday.
 * Uses the planner's planStartDate when it exists so the rule lives in one place.
 */
export function computePlanStart(createdOn, preferredDays) {
  if (plannerStartDate) {
    try { const r = plannerStartDate(createdOn, preferredDays); if (r) return typeof r === 'string' ? r : toISO(r); } catch (e) { console.warn('planStartDate failed', e); }
  }
  const d = fromISO(createdOn);
  const mon = weekStart(d);
  const todayOffset = (d.getDay() + 6) % 7; // 0 = Monday
  const ahead = (preferredDays || []).some(dow => (dow + 6) % 7 >= todayOffset);
  return toISO(ahead ? mon : addDays(mon, 7));
}

/** Monday of the week the UI should present as "this week" (the plan's first week if it hasn't begun). */
export function displayWeekStart(date = new Date()) {
  const start = getState().plan?.startDate;
  const t = weekStart(date);
  return start && fromISO(start) > t ? fromISO(start) : t;
}

/** Light logs that are not training sessions: rest-day mobility and Morning Taisō (day streak only, v1.2). */
export const NOT_A_SESSION = new Set(['M', 'T']);
/** A training session log: not rest-day mobility, not Morning Taisō, not a moment of 10 min or less (those keep the day streak only). */
export const isTrainingLog = l => !NOT_A_SESSION.has(l.sessionId) && !isShortMomentLog(l);
/** True until the user has logged a real (non-mobility) session. */
export const isFirstTimer = () => !getState().logs.some(isTrainingLog);

/** Options every planner call shares: plan anchors from the store. */
export function planOpts() {
  const p = getState().plan || {};
  return { startDate: p.startDate, blockStart: p.blockStart ?? p.startDate };
}

/** Superset/circuit label for an item within its block: { label: 'A1', size } or null. */
export function groupLabel(items, i) {
  const it = items[i];
  if (it.superset == null) return null;
  const members = items.filter(x => x.superset === it.superset && x.bi === it.bi);
  const pos = members.indexOf(it) + 1;
  const letter = String.fromCharCode(64 + (Number(it.superset) || 1));
  return { label: `${letter}${pos}`, size: members.length, circuit: members.length > 2, pos };
}

export const sessionById = (week, id) => week?.sessions?.find(x => x.id === id) || null;
export function sessionForDow(week, dow) { const id = week?.days?.[dow]; return id ? sessionById(week, id) : null; }

export function sessionMinutes(session) {
  try { const m = estimateMinutes(session, EXERCISES); if (Number.isFinite(m) && m > 0) return Math.round(m); } catch { /* fall through */ }
  return session.estMinutes || 0;
}

export function logsByDate(logs = getState().logs) {
  const m = new Map();
  for (const l of logs) { if (!m.has(l.date)) m.set(l.date, []); m.get(l.date).push(l); }
  return m;
}

export function getStreak() {
  const s = getState();
  // Quick-only users have no profile: a neutral one lets their logs still count.
  const prof = s.profile || { daysPerWeek: 3, preferredDays: [1, 3, 5], goals: ['health'] };
  try { return computeStreak(s.logs, prof, new Date(), { createdOn: s.plan?.createdOn, startDate: s.plan?.startDate }); } catch (e) { console.error(e); return { current: 0, best: 0, weekly: { current: 0, best: 0 }, freezeAvailable: 0 }; }
}

/** Weekly target per research §10.2: daysPerWeek if ≤3, else max(2, days−1). */
export function weeklyTarget(profile = getState().profile) {
  const n = profile?.daysPerWeek || 3;
  return n <= 3 ? n : Math.max(2, n - 1);
}
/** Distinct training days logged in the current Mon–Sun week. */
export function sessionsThisWeek(date = new Date()) {
  const start = toISO(weekStart(date)), end = toISO(addDays(weekStart(date), 6));
  return new Set(getState().logs.filter(l => l.date >= start && l.date <= end && isTrainingLog(l)).map(l => l.date)).size;
}
/** Freezes banked (max 2). Accepts a number or boolean from the planner. */
export function freezesBanked(streak) {
  const v = streak?.freezes ?? streak?.freezesBanked ?? streak?.freezeAvailable;
  return Math.min(2, v === true ? 1 : Math.max(0, Number(v) || 0));
}

/** Monday-first array of this week's 7 days with plan & log status. */
export function weekDays(date = new Date()) {
  const week = getWeek();
  const byDate = logsByDate();
  const start = displayWeekStart(date);
  const planStart = getState().plan?.startDate || '';
  const todayIso = toISO(date);
  const created = getState().plan?.createdOn || '';
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const iso = toISO(d);
    const session = iso < planStart ? null : sessionForDow(week, d.getDay());
    const logs = byDate.get(iso) || [];
    const beforePlan = iso < created;
    // Morning Taisō or a short moment alone doesn't mark a day done: it keeps the day streak, not the planned session (v1.2).
    return { date: d, iso, dow: d.getDay(), session, logs, done: logs.some(l => l.sessionId !== 'T' && !isShortMomentLog(l)), light: logs.some(isShortMomentLog), taiso: logs.some(l => l.sessionId === 'T'), isToday: iso === todayIso, isPast: iso < todayIso, beforePlan };
  });
}

export function sessionItems(session) {
  const out = [];
  (session.blocks || []).forEach((b, bi) => (b.items || []).forEach((it, ii) => out.push({ ...it, bi, ii, blockKind: b.kind, blockTitle: b.title })));
  return out;
}

/**
 * v1.2 optional swaps (Session.options): replace the warm-up or cool-down with the option's block when the user has
 * switched it on (settings.options[id]). Options only exist while their tradition is visible (planner rule).
 */
export function withOptions(session, prefs = getState().settings.options || {}) {
  if (!session?.options?.length) return session;
  const blocks = session.blocks.slice();
  for (const o of session.options) {
    if (!prefs[o.id]) continue;
    const nb = { ...o.block, optionId: o.id };
    const i = blocks.findIndex(b => b.kind === o.replaces);
    if (i >= 0) blocks[i] = nb; else if (o.replaces === 'warmup') blocks.unshift(nb); else blocks.push(nb);
  }
  return { ...session, blocks };
}
/** Minutes for an option or a flow-only session: a flow's own length (its steps), otherwise the planner's estimate. */
export function flowMinutes(blocks) {
  const items = blocks.flatMap(b => b.items);
  if (items.length && items.every(i => i.flow)) return Math.max(1, Math.round(items.reduce((a, i) => a + i.flow.estSec * i.sets + (i.sets - 1) * (i.restSec || 0), 0) / 60));
  try { return Math.max(1, Math.round(estimateMinutes({ blocks }, EXERCISES))); } catch { return 0; }
}
export const optionMinutes = o => flowMinutes([o.block]);

/** The optional Morning Taisō session (id 'T') when the setting is on and it is available (verified, suitable). */
export function morningTaiso() {
  const s = getState();
  if (!s.settings.morningTaiso) return null;
  try { return generateMorningTaiso(s.profile || null, s.profile ? s.levels : null, EXERCISES); } catch (e) { console.warn(e); return null; }
}
/** Can Morning Taisō be offered at all (for the settings toggle)? */
export function morningTaisoAvailable() {
  const s = getState();
  try { return !!generateMorningTaiso(s.profile || null, s.profile ? s.levels : null, EXERCISES); } catch { return false; }
}

/** An optional rest-day mobility flow built from available mobility drills. */
export function mobilityFlow(profile = getState().profile) {
  const prefer = ['cat_cow', 'worlds_greatest_stretch', 'hip_flexor_stretch', 'thoracic_opener', 'standing_hamstring_stretch', 'deep_squat_hold', 'childs_pose', 'cobra_stretch', 'calf_stretch'];
  const pool = prefer.map(id => byId[id]).filter(e => e && isAvailable(e, profile));
  const extra = EXERCISES.filter(e => e.family === 'mobility' && !prefer.includes(e.id) && isAvailable(e, profile));
  const chosen = [...pool, ...extra].slice(0, 6);
  const items = chosen.map(e => ({
    exerciseId: e.id, family: e.family, sets: 1,
    reps: e.mode === 'reps' ? [8, 10] : null, holdSec: e.mode === 'hold' ? [30, 45] : null,
    perSide: !!e.unilateral, restSec: 10, rir: null, notes: '',
  }));
  const session = { id: 'M', name: 'Rest-day mobility', focus: ['mobility'], estMinutes: 10, blocks: [{ kind: 'mobility', title: 'Mobility flow', items }] };
  session.estMinutes = sessionMinutes(session) || 10;
  return session;
}

export async function startWorkout(session, { weekIndex = getCurrentWeekIndex(), sessionId = session.id } = {}) {
  const existing = getActiveWorkout();
  // Resume today's session of the same id; a different Quick workout ('Q' with another request) is a new session.
  const same = existing && existing.sessionId === sessionId && existing.date === toISO()
    && (sessionId !== 'Q' || JSON.stringify(existing.session.request || null) === JSON.stringify(session.request || null));
  if (same) { location.hash = '#/workout'; return; }
  if (existing && existing.logs.some(l => l.sets.length)) {
    const ok = await confirmSheet({ title: 'Replace workout in progress?', body: `You have sets logged in “${existing.session.name}”. Starting a new session discards them.`, ok: 'Start new', danger: true });
    if (!ok) return;
  }
  const items = sessionItems(session).map(it => ({ ...it, origExerciseId: it.exerciseId, sets: Math.max(1, it.sets || 1) }));
  const week = ['M', 'Q', 'T'].includes(sessionId) ? null : getWeek(weekIndex);
  saveActiveWorkout({
    v: 1, session: { id: session.id, name: session.name, blocks: session.blocks, ...(session.request && { request: session.request }) }, sessionId, weekIndex,
    weekPhase: week?.phase || 'build', reentry: week?.meta?.reentry ?? null,
    date: toISO(), startedAt: Date.now(), items, idx: 0, phase: 'set',
    logs: items.map(it => ({ exerciseId: it.exerciseId, family: it.family, sets: [], rating: null, skipped: false })),
    restEndsAt: null, restTotal: 0, restNext: null,
  });
  location.hash = '#/workout';
}

/** Levels for a (possibly edited) profile: keep valid existing levels unless reset. */
export function levelsFor(profile, oldLevels = {}, reset = false) {
  let fresh = {};
  try { fresh = initialLevels(profile, EXERCISES) || {}; } catch (e) { if (e?.code !== 'AGE_UNDER_13') console.error(e); }
  if (reset) return fresh;
  const kept = {};
  for (const [fam, id] of Object.entries(oldLevels || {})) if (typeof id === 'string' && byId[id] && isAvailable(byId[id], profile)) kept[fam] = id;
  if (oldLevels && oldLevels.flowStages) kept.flowStages = oldLevels.flowStages; // v1.2 flow progress (stance, tempo) survives profile edits
  return { ...fresh, ...kept };
}

/** Session lengths offered by Quick and by "Make a workout" (the planner accepts 5..90). */
export const QUICK_MINUTES = [5, 10, 15, 20, 30, 45, 60];

export const GOALS = [
  { id: 'strength', name: 'Strength', emoji: '力', desc: 'Get stronger in the big movement patterns.' },
  { id: 'muscle', name: 'Build muscle', emoji: '筋', desc: 'More volume for visible muscle growth.' },
  { id: 'endurance', name: 'Endurance', emoji: '耐', desc: 'Last longer, recover faster between efforts.' },
  { id: 'flexibility', name: 'Flexibility & mobility', emoji: '柔', desc: 'Move freely; deeper, pain-free ranges.' },
  { id: 'skill', name: 'Skills', emoji: '技', desc: 'Handstand, crow and other arm balances.' },
  { id: 'health', name: 'General health', emoji: '健', desc: 'Feel good, move daily, stay consistent.' },
  { id: 'balance', name: 'Balance', emoji: '衡', desc: 'Steadier on your feet: single-leg work and slow, controlled moves.' },
];
export const goalName = id => GOALS.find(g => g.id === id)?.name || id;
