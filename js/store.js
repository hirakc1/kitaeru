// Kitaeru persistence: one localStorage document under `kitaeru.v1` (shape per docs/CONTRACTS.md).
// Auxiliary keys (in-progress workout, onboarding draft) live under separate keys so the main shape stays exact.

export const KEY = 'kitaeru.v1';
const WORKOUT_KEY = 'kitaeru.v1.workout';
const DRAFT_KEY = 'kitaeru.v1.draft';
export const VERSION = 1;
// Terms of use and safety (js/ui/terms.js): bump when the terms change in substance, so everyone accepts again.
export const TERMS_VERSION = 1;
const DAY = 864e5;

const memory = new Map(); // fallback when localStorage is unavailable (private mode, blocked storage)
function rawGet(k) { try { return localStorage.getItem(k); } catch { return memory.has(k) ? memory.get(k) : null; } }
function rawSet(k, v) { try { localStorage.setItem(k, v); return true; } catch { memory.set(k, v); return false; } }
function rawDel(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } memory.delete(k); }

export function defaultState() {
  return {
    version: VERSION, profile: null, levels: {}, plan: null, logs: [], bodyweights: [],
    settings: { units: 'metric', sound: true, theme: 'auto', animBreath: true, animTrail: true, animFigure: 'human', animSkeleton: false },   // anim*: animation extras; animFigure 'human' | 'classic', animBody 'f' | 'm' (unset: from the profile's sex), animSkeleton (see-through body)
  };
}

/** Bring any older / partial document up to the current shape. */
export function migrate(doc) {
  const base = defaultState();
  if (!doc || typeof doc !== 'object') return base;
  const out = { ...base, ...doc };
  out.version = VERSION;
  out.levels = doc.levels && typeof doc.levels === 'object' ? doc.levels : {};
  out.logs = Array.isArray(doc.logs) ? doc.logs.filter(l => l && typeof l.date === 'string') : [];
  out.bodyweights = Array.isArray(doc.bodyweights) ? doc.bodyweights.filter(b => b && b.date && Number.isFinite(+b.kg)) : [];
  out.settings = { ...base.settings, ...(doc.settings || {}) };
  if (out.plan && typeof out.plan.startDate !== 'string') out.plan = null;
  return out;
}

let state = load();
const subs = new Set();

function load() {
  const raw = rawGet(KEY);
  if (!raw) return defaultState();
  try { return migrate(JSON.parse(raw)); } catch { return defaultState(); }
}

function persist() { rawSet(KEY, JSON.stringify(state)); }

export function getState() { return state; }

/** update(fn) — fn receives a draft copy and may mutate it or return a new object. */
export function update(fn) {
  const draft = structuredClone(state);
  const res = fn(draft);
  state = migrate(res || draft);
  persist();
  subs.forEach(s => { try { s(state); } catch (e) { console.error(e); } });
  return state;
}

export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }

export function replaceState(doc) { return update(() => migrate(doc)); }

export function resetAll() {
  rawDel(KEY); rawDel(WORKOUT_KEY); rawDel(DRAFT_KEY);
  state = defaultState();
  subs.forEach(s => s(state));
}

// ---------- dates ----------
export function toISO(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export function fromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function todayISO() { return toISO(new Date()); }
/** Monday of the week containing d (local time, midnight). */
export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

/** floor((today - startDate) / 7 days), never negative. */
export function getCurrentWeekIndex(today = new Date()) {
  const start = state.plan?.startDate;
  if (!start) return 0;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((t - fromISO(start)) / DAY); // round absorbs DST shifts
  return Math.max(0, Math.floor(diff / 7));
}

// ---------- in-progress workout ----------
export function getActiveWorkout() {
  try { const w = JSON.parse(rawGet(WORKOUT_KEY)); return w && w.session ? w : null; } catch { return null; }
}
export function saveActiveWorkout(w) { rawSet(WORKOUT_KEY, JSON.stringify(w)); }
export function clearActiveWorkout() { rawDel(WORKOUT_KEY); }

// ---------- onboarding draft ----------
export function getDraft() { try { return JSON.parse(rawGet(DRAFT_KEY)); } catch { return null; } }
export function saveDraft(d) { rawSet(DRAFT_KEY, JSON.stringify(d)); }
export function clearDraft() { rawDel(DRAFT_KEY); }

// ---------- export / import ----------
export function exportJSON() {
  return JSON.stringify({ app: 'kitaeru', exportedAt: new Date().toISOString(), ...state }, null, 2);
}

/** Validate an imported object. Returns { ok, data?, error? }. */
export function validateImport(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'This file is not a Kitaeru backup.' };
  if (obj.version !== undefined && (typeof obj.version !== 'number' || obj.version > VERSION)) return { ok: false, error: 'This backup is from a newer version of Kitaeru.' };
  if (!('profile' in obj) || !('logs' in obj)) return { ok: false, error: 'Missing profile or logs — not a Kitaeru backup.' };
  if (obj.profile !== null && (typeof obj.profile !== 'object' || !Array.isArray(obj.profile.goals))) return { ok: false, error: 'The profile in this file is malformed.' };
  if (!Array.isArray(obj.logs)) return { ok: false, error: 'Session logs are malformed.' };
  if (obj.logs.some(l => !l || typeof l.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(l.date) || !Array.isArray(l.items))) return { ok: false, error: 'One or more session logs are malformed.' };
  if (obj.bodyweights !== undefined && !Array.isArray(obj.bodyweights)) return { ok: false, error: 'Body-weight entries are malformed.' };
  const { app, exportedAt, ...rest } = obj;
  return { ok: true, data: migrate(rest) };
}
