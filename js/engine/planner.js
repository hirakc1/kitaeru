// Kitaeru planner: plan generation, progression and streaks.
// Pure functions only: no DOM, no storage, no Math.random, no clock (except computeStreak's `today`).
// Contract: docs/CONTRACTS.md. Programming rules: docs/research.md (section numbers cited as §x.y).
//
// Errors: every public function that reads a profile throws a PlannerError { code: 'AGE_UNDER_13' }
// when profile.age < 13 (research §13.1: "Kitaeru is for ages 13+").

// =============================================================================================
// Tunables and tables
// =============================================================================================
export const CONFIG = {
  secPerRep: 3, secPerRepStrength: 4, secPerRepNegative: 6, secPerRepConditioning: 1, // §2.3
  setOverheadSec: 10, unilateralSwitchSec: 5,
  transitionStraight: 30, transitionCircuit: 20, circuitHopSec: 15,
  sessionTolerance: 0.10,
  freezeEveryKeptWeeks: 2, freezeMax: 2,       // §10.2
  maxSetsPerMuscleSession: 10,                 // §1.2
};

export class PlannerError extends Error {
  constructor(code, message) { super(message); this.name = 'PlannerError'; this.code = code; }
}

// §1.1 main-block prescriptions (loading goals). rir = goal RIR before ramps/floors.
export const GOAL_RX = {
  strength: { sets: [3, 5], reps: [4, 8],  hold: [10, 20], rest: 150, rir: 1 },
  muscle:   { sets: [3, 4], reps: [6, 20], hold: [30, 60], rest: 90,  rir: 1 },
  endurance:{ sets: [2, 3], reps: [15, 30], hold: [30, 60], rest: 45, rir: 2 },
  health:   { sets: [1, 3], reps: [8, 15], hold: [20, 40], rest: 75,  rir: 2 },
};
const LOADING = ['strength', 'muscle', 'endurance', 'health'];
const ALL_GOALS = [...LOADING, 'flexibility', 'skill'];
const GOAL_LABEL = { strength: 'Strength', muscle: 'Muscle', endurance: 'Endurance', health: 'Health', flexibility: 'Flexibility', skill: 'Skill' };

// §4 age bands
const BANDS = {
  u18: { warm: 5, rirFloor: 3, cycle: 4, weeklyCap: 12, mobMin: 2, balance: 0 },
  a18: { warm: 0, rirFloor: 1, cycle: 5, weeklyCap: 20, mobMin: 0, balance: 0 },
  a40: { warm: 5, rirFloor: 1, cycle: 5, weeklyCap: 18, mobMin: 3, balance: 'two' },
  a55: { warm: 7, rirFloor: 2, cycle: 4, weeklyCap: 14, mobMin: 5, balance: 120 },
  a65: { warm: 8, rirFloor: 2, cycle: 4, weeklyCap: 12, mobMin: 5, balance: 180 },
};
// §2.2 time allocation rows: [fromMinutes, warm, cool, skillMax, condMax, format]
const TIME_TABLE = [
  [10, 2, 1.5, 0, 0, 'circuit'], [15, 3, 2, 0, 2, 'circuit'], [20, 3, 2.5, 3, 3, 'superset'],
  [30, 5, 4, 5, 5, 'superset'], [45, 6, 5, 5, 6, 'straight'], [60, 8, 7, 8, 8, 'straight'], [75, 10, 9, 10, 10, 'straight'],
];

const SPACE_RANK = { small: 0, medium: 1, large: 2 };
const PUSH = ['push_horizontal', 'push_vertical', 'dip'];
const PULL = ['pull_vertical', 'pull_horizontal', 'pull_noequip'];
const HPULL = ['pull_horizontal', 'pull_noequip'];
const LEGS = ['squat', 'hinge', 'calves'];
const CORE = ['core_anterior', 'core_lateral', 'core_posterior'];
export const PROGRESSION_FAMILIES = [...PUSH, ...PULL, ...LEGS, ...CORE, 'skill_balance'];
const LEVEL_FAMILIES = [...PROGRESSION_FAMILIES, 'conditioning'];
const INJURY_NAME = { wrist: 'wrist', elbow: 'elbow', shoulder: 'shoulder', neck: 'neck', lower_back: 'lower back', hip: 'hip', knee: 'knee', ankle: 'ankle' };

// §6.2 extra exclusions beyond each exercise's `stress` tags
const INJ_EXCLUDE = {
  wrist: ['pseudo_planche_push_up', 'crow_pose', 'wall_handstand', 'freestanding_handstand', 'bear_crawl', 'mountain_climber', 'burpee', 'l_sit'],
  elbow: ['bench_dip', 'bar_dip', 'ring_dip', 'diamond_push_up', 'archer_push_up', 'archer_pull_up', 'archer_row', 'pseudo_planche_push_up'],
  shoulder: ['bench_dip', 'bar_dip', 'ring_dip', 'pike_push_up', 'elevated_pike_push_up', 'wall_handstand_push_up', 'crow_pose', 'wall_handstand', 'freestanding_handstand',
    'archer_push_up', 'archer_pull_up', 'archer_row', 'pseudo_planche_push_up', 'shoulder_dislocate', 'dead_hang'],
  neck: ['pike_push_up', 'elevated_pike_push_up', 'wall_handstand_push_up', 'crow_pose', 'wall_handstand', 'freestanding_handstand', 'hollow_body_hold', 'lying_leg_raise', 'hanging_knee_raise', 'hanging_leg_raise'],
  lower_back: ['superman', 'superman_pull', 'lying_leg_raise', 'hanging_leg_raise', 'l_sit', 'nordic_curl_negative', 'burpee', 'squat_jump', 'pancake_stretch', 'bulgarian_split_squat'],
  hip: ['pistol_squat', 'shrimp_squat', 'cossack_squat', 'deep_squat_hold', 'pigeon_stretch', 'pancake_stretch', 'lying_leg_raise', 'hanging_leg_raise', 'l_sit'],
  knee: ['pistol_squat', 'shrimp_squat', 'cossack_squat', 'bulgarian_split_squat', 'deep_squat_hold', 'reverse_lunge', 'nordic_curl_negative'],
  ankle: ['high_knees', 'single_leg_calf_raise', 'pistol_squat', 'shrimp_squat', 'cossack_squat'],
};
// §6.2 "allowed with modification": usable despite a matching stress tag, with a note.
const INJ_ALLOW = {
  wrist: { incline_push_up: 'Push up from fists or parallettes to keep wrists straight; pain-free only.', knee_push_up: 'On fists or parallettes to keep wrists straight; pain-free only.',
    push_up: 'On fists or parallettes to keep wrists straight; pain-free only.', wrist_prep: 'Gentle, pain-free range only.' },
  elbow: { negative_pull_up: 'Chin-up or neutral grip, 3 s lowering.', band_assisted_pull_up: 'Chin-up or neutral grip, 3 s lowering.', chin_up: 'Neutral or chin-up grip, 3 s lowering.',
    pull_up: 'Neutral grip if possible, 3 s lowering.', inverted_row: 'Neutral grip, 3 s lowering.' },
  shoulder: { incline_push_up: 'Stop at parallel: pain-free depth only.', knee_push_up: 'Stop at parallel: pain-free depth only.', push_up: 'Stop at parallel: pain-free depth only.' },
  knee: { split_squat: 'Partial range, pain-free (≤3/10).' },
  ankle: { calf_raise: 'Both legs, hands on a wall for support.' },
};
const AGE_EXCLUDE = {
  u16: ['freestanding_handstand'],
  a55: ['pistol_squat', 'shrimp_squat', 'nordic_curl_negative'],
  a65: ['wall_handstand', 'freestanding_handstand', 'wall_handstand_push_up', 'pistol_squat', 'shrimp_squat', 'nordic_curl_negative', 'burpee', 'squat_jump'],
};
const FALLBACK = {
  push_horizontal: ['dip', 'push_vertical'], push_vertical: ['dip', 'push_horizontal'], dip: ['push_horizontal', 'push_vertical'],
  pull_vertical: ['pull_noequip', 'pull_horizontal'], pull_horizontal: ['pull_noequip', 'pull_vertical'], pull_noequip: ['pull_horizontal', 'pull_vertical'],
  squat: ['hinge'], hinge: ['squat', 'core_posterior'], calves: [],
  core_anterior: ['core_lateral', 'core_posterior'], core_lateral: ['core_anterior', 'core_posterior'], core_posterior: ['core_lateral', 'core_anterior'],
};
const PRI = { push_horizontal: 1, pull_horizontal: 2, pull_noequip: 2, squat: 3, balance: 3.5, hinge: 4, pull_vertical: 5, push_vertical: 6, dip: 6,
  core_anterior: 7, core_lateral: 8, core_posterior: 8, calves: 9 };

const mid = r => (r[0] + r[1]) / 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const patternOf = fam => PUSH.includes(fam) ? 'push' : PULL.includes(fam) ? 'pull' : LEGS.includes(fam) ? 'legs' : CORE.includes(fam) ? 'core' : fam;
const dayNum = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
const dowOf = n => (((n + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday
const mondayOf = n => n - ((dowOf(n) + 6) % 7);

// =============================================================================================
// Profile derivation (§13 steps 1-7)
// =============================================================================================
function bmiOf(p) {
  const h = (p.heightCm || 0) / 100;
  return h > 0 && p.weightKg ? p.weightKg / (h * h) : null;
}

function derive(profile) {
  const age = Number.isFinite(profile.age) ? profile.age : 30;
  if (age < 13) throw new PlannerError('AGE_UNDER_13', 'Kitaeru is for ages 13+.');
  const band = age < 18 ? 'u18' : age < 40 ? 'a18' : age < 55 ? 'a40' : age < 65 ? 'a55' : 'a65';
  const bmi = bmiOf(profile);
  const exp = ['new', 'some', 'regular', 'advanced'].includes(profile.experience) ? profile.experience : 'new';
  const inj = (profile.injuries || []).filter(i => INJURY_NAME[i]);
  const G = [...new Set([profile.primaryGoal, ...(profile.goals || [])].filter(g => ALL_GOALS.includes(g)))];
  if (!G.length) G.push('health');
  const w = {};
  G.forEach((g, i) => { w[g] = G.length === 1 ? 1 : i === 0 ? 0.6 : 0.4 / (G.length - 1); });
  const loading = LOADING.includes(G[0]) ? G[0] : (G.find(g => LOADING.includes(g)) || 'health');
  const b = profile.baseline || {};
  const relax = exp === 'advanced' || ((b.pushUps ?? 0) >= 20 && (b.squats ?? 0) >= 40);
  const lowReasons = [];
  if (age >= 65) lowReasons.push('age');
  if (bmi != null && bmi >= 30 && !['regular', 'advanced'].includes(exp)) lowReasons.push('bmi');
  const lowInj = inj.filter(i => ['knee', 'ankle', 'hip'].includes(i));
  if (lowInj.length) lowReasons.push('injury');
  return {
    age, band, B: BANDS[band], bmi, exp, inj, goals: G, primary: G[0], w, loading,
    concurrent: (w.strength || 0) >= 0.2 && (w.muscle || 0) >= 0.2,
    bmiCaps: bmi != null && bmi >= 30 && !relax, bmi35: bmi != null && bmi >= 35 && !relax,
    lowImpact: !!profile.lowImpact || lowReasons.length > 0, lowReasons, lowInj,
    days: clamp(profile.daysPerWeek || 3, 2, 6), M: clamp(profile.minutesPerSession || 30, 10, 90),
  };
}

/** Why low impact is on. forced = imposed by age >= 65, BMI >= 30, or a knee/ankle/hip injury (§13.2). */
export function lowImpactInfo(profile) {
  const D = derive(profile);
  return { on: D.lowImpact, forced: D.lowReasons.length > 0, reasons: D.lowReasons, injuries: D.lowInj, bmi: D.bmi };
}

function availabilityFn(profile, D) {
  const eq = new Set(profile.equipment || []);
  const sp = SPACE_RANK[profile.space] ?? 1;
  const excl = new Set();
  for (const i of D.inj) (INJ_EXCLUDE[i] || []).forEach(x => excl.add(x));
  if (D.age < 16) AGE_EXCLUDE.u16.forEach(x => excl.add(x));
  if (D.band === 'a55' && D.exp !== 'advanced') AGE_EXCLUDE.a55.forEach(x => excl.add(x));
  if (D.band === 'a65') AGE_EXCLUDE.a65.forEach(x => excl.add(x));
  if (D.bmiCaps) excl.add('deep_squat_hold');
  return ex => (ex.equipment || []).every(e => eq.has(e))
    && (SPACE_RANK[ex.space] ?? 0) <= sp
    && !(ex.impact === 'high' && D.lowImpact)
    && !excl.has(ex.id)
    && (ex.stress || []).every(s => !D.inj.includes(s) || (INJ_ALLOW[s] && INJ_ALLOW[s][ex.id]));
}

/** Is an exercise usable by this profile (equipment, space, impact, injuries, age/BMI exclusions)? */
export function isAvailable(ex, profile) { return availabilityFn(profile, derive(profile))(ex); }

const infoCache = new WeakMap();
function libInfo(library) {
  if (!library) return { byId: {}, fam: {}, famMax: {} };
  if (infoCache.has(library)) return infoCache.get(library);
  const byId = {}, fam = {}, famMax = {};
  for (const ex of library) { byId[ex.id] = ex; (fam[ex.family] ||= []).push(ex); }
  for (const f of Object.keys(fam)) { fam[f].sort((a, b) => a.level - b.level); famMax[f] = fam[f][fam[f].length - 1].level; }
  const info = { byId, fam, famMax };
  infoCache.set(library, info);
  return info;
}

function buildCtx(profile, library) {
  const D = derive(profile);
  const info = libInfo(library);
  const ok = availabilityFn(profile, D);
  const avail = {};
  for (const f of Object.keys(info.fam)) avail[f] = info.fam[f].filter(ok);
  return { profile, D, info, byId: info.byId, fam: info.fam, avail: new Proxy(avail, { get: (o, k) => o[k] || [] }), isAvail: ex => !!ex && ok(ex) };
}

function nearest(list, level, preferEasier = true) {
  let best = null, bd = Infinity;
  for (const ex of list) {
    const d = Math.abs(ex.level - level);
    if (d < bd || (d === bd && (preferEasier ? ex.level < best.level : ex.level > best.level))) { best = ex; bd = d; }
  }
  return best;
}

// =============================================================================================
// Starting levels (§3)
// =============================================================================================
const EXP_IDX = { new: 0, some: 1, regular: 2, advanced: 3 };
const EXP_TABLE = { // §3.3 (null = do not schedule yet)
  push_horizontal: ['incline_push_up', 'knee_push_up', 'push_up', 'decline_push_up'],
  pull_vertical: ['dead_hang', 'scapular_pull', 'negative_pull_up', 'chin_up'],
  pull_horizontal: ['table_row', 'table_row', 'inverted_row', 'inverted_row'],
  pull_noequip: ['prone_ytw', 'prone_ytw', 'superman_pull', 'superman_pull'],
  squat: ['box_squat', 'bodyweight_squat', 'split_squat', 'reverse_lunge'],
  hinge: ['glute_bridge', 'glute_bridge', 'single_leg_glute_bridge', 'hip_thrust'],
  calves: ['calf_raise', 'calf_raise', 'calf_raise', 'single_leg_calf_raise'],
  core_anterior: ['dead_bug', 'plank', 'plank', 'hollow_body_hold'],
  core_lateral: ['side_plank', 'side_plank', 'side_plank', 'side_plank_hip_dip'],
  core_posterior: ['bird_dog', 'superman', 'superman', 'superman'],
  push_vertical: [null, null, 'pike_push_up', 'pike_push_up'],
  dip: [null, 'bench_dip', 'bench_dip', 'bar_dip'],
  skill_balance: ['crow_pose', 'crow_pose', 'crow_pose', 'wall_handstand'],
  conditioning: ['marching_in_place', 'jumping_jack', 'mountain_climber', 'mountain_climber'],
};
const BASE_FIELD = { push_horizontal: 'pushUps', push_vertical: 'pushUps', dip: 'pushUps', skill_balance: 'pushUps', pull_vertical: 'pullUps', pull_horizontal: 'pullUps',
  squat: 'squats', hinge: 'squats', calves: 'squats', core_anterior: 'plankSec', core_lateral: 'plankSec' };
const known = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

// §3.2 baseline mapping. Returns an id, null (= skip), or undefined (= no baseline for this family).
function fromBaseline(fam, profile, D) {
  const b = profile.baseline || {};
  const field = BASE_FIELD[fam];
  if (!field || !known(b[field])) return undefined;
  const v = Number(b[field]);
  const eq = profile.equipment || [];
  const exp = EXP_IDX[D.exp];
  switch (fam) {
    case 'push_horizontal': return v <= 0 ? 'incline_push_up' : v <= 5 ? 'knee_push_up' : v <= 15 ? 'push_up' : v <= 25 ? 'decline_push_up' : v <= 35 ? 'diamond_push_up'
      : (D.exp === 'advanced' && v >= 40 ? 'pseudo_planche_push_up' : 'archer_push_up');
    case 'push_vertical': return v < 8 ? null : v < 25 ? 'pike_push_up' : v < 40 ? (exp >= 2 ? 'elevated_pike_push_up' : 'pike_push_up')
      : (D.exp === 'advanced' && eq.includes('wall') ? 'wall_handstand_push_up' : exp >= 2 ? 'elevated_pike_push_up' : 'pike_push_up');
    case 'dip': return v < 6 ? null : v < 20 ? 'bench_dip' : (D.exp === 'advanced' && eq.includes('rings') && v >= 30 ? 'ring_dip' : eq.includes('dip_bars') ? 'bar_dip' : 'bench_dip');
    case 'pull_vertical': return v <= 0 ? (D.exp === 'new' ? 'dead_hang' : (known(b.pushUps) && b.pushUps >= 15 ? 'negative_pull_up' : 'scapular_pull'))
      : v <= 2 ? (eq.includes('resistance_band') ? 'band_assisted_pull_up' : 'negative_pull_up') : v <= 5 ? 'chin_up' : v <= 11 ? 'pull_up' : (D.exp === 'advanced' ? 'archer_pull_up' : 'pull_up');
    case 'pull_horizontal': return v <= 0 ? 'table_row' : v <= 7 ? (eq.includes('pullup_bar') || eq.includes('rings') ? 'inverted_row' : 'table_row')
      : (v >= 12 && D.exp === 'advanced' ? 'archer_row' : 'inverted_row');
    case 'squat': return v <= 9 ? 'box_squat' : v <= 29 ? 'bodyweight_squat' : v <= 49 ? 'split_squat' : v <= 74 ? 'reverse_lunge' : 'bulgarian_split_squat';
    case 'hinge': return v < 20 ? 'glute_bridge' : v < 50 ? 'single_leg_glute_bridge' : (eq.includes('bench') ? 'hip_thrust' : 'single_leg_rdl');
    case 'calves': return v < 30 ? 'calf_raise' : 'single_leg_calf_raise';
    case 'core_anterior': return v < 20 ? 'dead_bug' : v < 45 ? 'plank' : v < 90 ? 'hollow_body_hold'
      : (eq.includes('pullup_bar') && known(b.pullUps) && b.pullUps >= 3 ? 'hanging_knee_raise' : 'lying_leg_raise');
    case 'core_lateral': return v < 60 ? 'side_plank' : 'side_plank_hip_dip';
    case 'skill_balance': {
      if (v < 10) return null;
      const noInj = !D.inj.some(i => ['wrist', 'shoulder', 'neck'].includes(i));
      if (D.exp === 'advanced' && v >= 20 && noInj && D.age < 65) return eq.includes('wall') ? 'wall_handstand' : 'freestanding_handstand';
      return v >= 20 && exp >= 1 && eq.includes('wall') && noInj && D.age < 65 ? 'wall_handstand' : 'crow_pose';
    }
    default: return undefined;
  }
}

// QA #3: a measured baseline far above the goal's rep range means a harder variation. Estimated max reps
// halve per level above the tested exercise; pick the highest level whose estimate still reaches
// the top of the goal range + RIR (holds: the top of the core hold range). Same mode (reps/hold) only.
const BASELINE_REF = { push_horizontal: ['pushUps', 'push_up'], pull_vertical: ['pullUps', 'pull_up'], squat: ['squats', 'bodyweight_squat'], core_anterior: ['plankSec', 'plank'] };
function harderByBaseline(fam, all, profile, D) {
  const ref = BASELINE_REF[fam];
  if (!ref) return -1;
  const v = Number((profile.baseline || {})[ref[0]]);
  const ri = all.findIndex(e => e.id === ref[1]);
  if (!(v > 0) || ri < 0) return -1;
  const g = GOAL_RX[D.loading];
  const top = all[ri].mode === 'hold' ? (D.loading === 'strength' ? 30 : 45) : g.reps[1] + Math.max(g.rir, D.B.rirFloor);
  let best = -1;
  for (let j = ri; j < all.length; j++) {
    if (all[j].mode !== all[ri].mode) break;
    if (v * Math.pow(0.5, j - ri) >= top) best = j; else break;
  }
  return best;
}

/** Plain-English notes about the priors applied when a baseline is missing (§3.3). */
export function levelPriors(profile) {
  const D = derive(profile);
  const b = profile.baseline || {};
  const out = [];
  if (!known(b.pushUps) || !known(b.pullUps) || !known(b.squats) || !known(b.plankSec)) out.push('experience');
  if (D.age >= 55 && (!known(b.pushUps) || !known(b.squats) || !known(b.pullUps))) out.push('age_easier');
  if (profile.sex !== 'male' && ['new', 'some'].includes(D.exp) && (!known(b.pushUps) || !known(b.pullUps))) out.push('upper_body_easier');
  if (D.bmiCaps) out.push('bmi_caps');
  return out;
}

function stepDown(all, idx, ok) {
  for (let i = idx; i >= 0; i--) if (ok(all[i])) return all[i];
  for (let i = idx + 1; i < all.length; i++) if (ok(all[i])) return all[i];
  return null;
}

export function initialLevels(profile, library) {
  const ctx = buildCtx(profile, library);
  const D = ctx.D;
  const b = profile.baseline || {};
  const out = {};
  for (const fam of LEVEL_FAMILIES) {
    const all = ctx.fam[fam] || [];
    if (!all.length || !ctx.avail[fam].length) continue;
    const idxOf = id => all.findIndex(e => e.id === id);
    let id = fromBaseline(fam, profile, D);
    const measured = id !== undefined;
    if (!measured) {
      id = (EXP_TABLE[fam] || [])[EXP_IDX[D.exp]];
      if (id === undefined) id = all[0].id;
    }
    if (id === null) continue; // not scheduled yet (push_vertical / dip / skill)
    let idx = idxOf(id);
    if (idx < 0) idx = Math.round(EXP_IDX[D.exp] / 3 * (all.length - 1) * 0.5);
    if (measured && idx >= 0) idx = Math.max(idx, harderByBaseline(fam, all, profile, D));
    if (!measured) {
      if (D.band === 'a55' && ['push_horizontal', 'squat', 'pull_vertical'].includes(fam)) idx -= 1;
      if (D.band === 'a65') {
        idx -= 1;
        if (fam === 'push_horizontal') idx = Math.min(idx, idxOf(D.exp === 'new' ? 'wall_push_up' : 'incline_push_up'));
      }
      if (profile.sex !== 'male' && ['new', 'some'].includes(D.exp) && ['push_horizontal', 'pull_vertical'].includes(fam)) idx -= 1;
    }
    if (D.bmiCaps) { // §5 start caps
      const cap = { push_horizontal: D.bmi35 || !known(b.pushUps) || b.pushUps < 5 ? 'incline_push_up' : 'knee_push_up', pull_vertical: 'negative_pull_up', squat: 'split_squat' }[fam];
      if (cap && idxOf(cap) >= 0) idx = Math.min(idx, idxOf(cap));
    }
    if (fam === 'hinge' && all[clamp(idx, 0, all.length - 1)]?.id === 'hip_thrust' && !ctx.isAvail(all[idx]) && ctx.isAvail(ctx.byId.single_leg_rdl)) { out[fam] = 'single_leg_rdl'; continue; }
    idx = clamp(idx, 0, all.length - 1);
    const pick = stepDown(all, idx, ctx.isAvail);
    if (pick) out[fam] = pick.id;
  }
  return out;
}

// =============================================================================================
// Time estimation (§2.3)
// =============================================================================================
function repSec(it, info) {
  if (/^negative_|nordic_curl_negative/.test(it.exerciseId)) return CONFIG.secPerRepNegative;
  if (it.family === 'conditioning') return CONFIG.secPerRepConditioning;
  const ex = info.byId[it.exerciseId];
  if ((it.reps && it.reps[1] <= 8) || (ex && PROGRESSION_FAMILIES.includes(ex.family) && ex.level >= info.famMax[ex.family] - 1)) return CONFIG.secPerRepStrength;
  return CONFIG.secPerRep;
}
function setSec(it, info) {
  const side = it.perSide ? 2 : 1;
  const work = it.holdSec ? mid(it.holdSec) : it.reps ? mid(it.reps) * repSec(it, info) : 30;
  return work * side + (it.perSide ? CONFIG.unilateralSwitchSec : 0) + CONFIG.setOverheadSec;
}
function blockSec(block, info) {
  let t = 0;
  const groups = new Map();
  for (const it of block.items) {
    if (it.superset != null) { (groups.get(it.superset) || groups.set(it.superset, []).get(it.superset)).push(it); continue; }
    t += it.sets * setSec(it, info) + (it.sets - 1) * (it.restSec || 0) + CONFIG.transitionStraight;
  }
  for (const g of groups.values()) {
    const body = g.reduce((s, it) => s + it.sets * (setSec(it, info) + (it.restSec || 0)), 0);
    t += g.length === 2 ? body - (g[1].restSec || 0) + CONFIG.transitionStraight : body + CONFIG.transitionCircuit;
  }
  return t;
}
function sessionSec(session, info) { return session.blocks.reduce((t, b) => t + blockSec(b, info), 0); }

/** Estimated minutes (§2.3): straight sets, supersets (pairs) and circuits (3+ grouped items). */
export function estimateMinutes(session, library) {
  return Math.round(sessionSec(session, libInfo(library)) / 60);
}
/** Unrounded seconds, for tests and fine-grained UI. */
export function estimateSeconds(session, library) { return sessionSec(session, libInfo(library)); }

// =============================================================================================
// Periodisation (§9)
// =============================================================================================
function weekIdxFromDate(dateStr, startDate) {
  if (typeof dateStr === 'number') return dateStr;
  if (!dateStr || !startDate) return 0;
  return Math.floor((dayNum(dateStr) - dayNum(startDate)) / 7);
}

/** Days since the last real (non rest-day-mobility) log strictly before day `n`, or null. */
function gapBefore(logs, n) {
  let last = null;
  for (const l of logs || []) {
    if (!l || !l.date || l.sessionId === 'M') continue;
    const d = dayNum(l.date);
    if (d < n && (last === null || d > last)) last = d;
  }
  return last === null ? null : n - last;
}

/** §9.4 policy for a gap in days. */
export function gapPolicy(days) {
  if (days == null || days <= 10) return { factors: [], levelDrop: 0, retest: false };
  if (days <= 21) return { factors: [0.75], levelDrop: 0, retest: false };
  if (days <= 42) return { factors: [0.5, 0.75], levelDrop: 1, minLevelForDrop: 3, retest: false };
  if (days <= 90) return { factors: [0.5, 0.75], levelDrop: 1, levelDrop65: 2, retest: false };
  return { factors: [0.5, 0.75], levelDrop: 0, retest: true };
}

/**
 * Phase of a week. opts: { blockStart (weekIndex or 'YYYY-MM-DD'), startDate, logs, daysSinceLastLog, reentryWeek }.
 * With logs + startDate the planner derives re-entry weeks itself and restarts the cycle after them.
 */
export function phaseInfo(profile, weekIndex, opts = {}) {
  const D = derive(profile);
  const cycle = (D.band === 'u18' || D.band === 'a55' || D.band === 'a65' || D.inj.length || D.bmi35) ? 4 : 5;
  let blockStart = Math.max(0, weekIdxFromDate(opts.blockStart, opts.startDate) || 0);
  let factor = null;
  if (opts.daysSinceLastLog != null) {
    const f = gapPolicy(opts.daysSinceLastLog).factors;
    factor = f[clamp(opts.reentryWeek || 0, 0, 9)] ?? null;
  } else if (opts.logs && opts.startDate) {
    const ws = w => dayNum(opts.startDate) + 7 * w;
    const g0 = gapBefore(opts.logs, ws(weekIndex));
    const p0 = gapPolicy(g0);
    if (p0.factors.length) factor = p0.factors[0];
    else {
      const g1 = gapBefore(opts.logs, ws(weekIndex - 1));
      const p1 = gapPolicy(g1);
      if (p1.factors.length > 1 && g0 != null && g0 <= 7) factor = p1.factors[1];
    }
    for (let w = weekIndex; w > blockStart; w--) { // latest re-entry restarts the cycle
      if (gapPolicy(gapBefore(opts.logs, ws(w))).factors.length) { blockStart = w; break; }
    }
  }
  const n = weekIndex - blockStart + 1; // 1-based week in the block
  let deload = n > 0 && n % cycle === 0;
  if (deload && D.exp === 'new' && n === cycle) deload = false; // §9.1: novices skip the first deload
  if (factor != null) deload = false;
  const pos = ((n - 1) % cycle + cycle) % cycle + 1; // build week number inside the block
  return { phase: deload ? 'deload' : 'build', cycleLen: cycle, blockStart, blockWeek: pos, reentry: factor, calibration: weekIndex <= 1 };
}

// =============================================================================================
// Prescriptions
// =============================================================================================
function rirFor(ex, ctx, role) {
  const D = ctx.D;
  let rir = GOAL_RX[D.loading].rir + (ctx.phase.blockWeek <= 2 ? 1 : 0);           // §9.2 ramp
  rir = Math.max(rir, D.B.rirFloor);
  if ((ctx.fam[ex.family] || []).some(e => (e.stress || []).some(s => D.inj.includes(s)))) rir = Math.max(rir, 3); // §6.1.4
  if (role === 'skill' || ex.family === 'skill_balance') rir = Math.max(rir, 3);
  return rir;
}

function makePart(ex, role, ctx, sess, pri, ess, order, tier = ess ? 1 : 3) {
  const D = ctx.D;
  let rxGoal = D.loading;
  if (D.concurrent && role === 'main') {
    const p = patternOf(ex.family);
    rxGoal = sess.patternSeen.has(p) ? 'muscle' : 'strength';
    sess.patternSeen.add(p);
  }
  const g = GOAL_RX[rxGoal];
  let reps, hold, rest, min, base, max;
  const early = ctx.phase.calibration && (D.band === 'a65' || (D.goals.length === 1 && D.goals[0] === 'health'));
  const smin = early ? 1 : 2;
  if (role === 'main') {
    reps = g.reps; hold = g.hold; rest = g.rest;
    max = early ? 2 : g.sets[1];
    min = early ? smin : Math.max(smin, (rxGoal === 'strength' || rxGoal === 'muscle') ? 3 : 2); // QA: primary lifts reach 3 sets first
    base = clamp(g.sets[0], min, max);
  } else if (role === 'core') {
    reps = D.loading === 'endurance' ? [15, 30] : [8, 15]; hold = D.loading === 'strength' ? [15, 30] : [20, 45];
    rest = 60; min = smin; base = Math.max(smin, 2); max = early ? 2 : 3;
  } else if (role === 'balance') {
    reps = [6, 10]; hold = [20, 40]; rest = 30; min = 1; base = 2; max = 4;
  } else { // accessory (calves)
    reps = [12, 20]; hold = [20, 30]; rest = 60; min = smin; base = Math.max(smin, 2); max = early ? 2 : 3;
  }
  if (ex.id === 'dead_hang') hold = D.band === 'a65' ? [10, 20] : [10, 30];
  if (D.band === 'a65' && role !== 'balance') rest = Math.max(rest, 90);
  const notes = [];
  for (const s of ex.stress || []) if (D.inj.includes(s) && INJ_ALLOW[s]?.[ex.id]) notes.push(INJ_ALLOW[s][ex.id]);
  if (D.inj.includes('knee') && ex.family === 'squat' && !notes.length) notes.push('Keep to a pain-free depth.');
  if (role === 'balance') notes.push('Balance: stand near a wall or sturdy chair for support.');
  if (ex.id === 'inverted_row' && !(ctx.profile.equipment || []).includes('rings')) notes.push('Use a low bar or rings. If your bar cannot go low, do a table row or an extra set of your vertical pull instead.');
  if (D.band === 'u18' && role === 'main') notes.push('Technique first: stop with 3+ reps in reserve.');
  if ((D.band === 'a55' || D.band === 'a65') && ['box_squat', 'incline_push_up', 'glute_bridge'].includes(ex.id)) notes.push('Lift fast, lower slowly.');
  if (ex.mode === 'hold') reps = null; else hold = null;
  const item = { exerciseId: ex.id, family: ex.family, sets: min, reps, holdSec: hold, perSide: !!ex.unilateral, restSec: rest, rir: rirFor(ex, ctx, role), notes: notes.join(' ') };
  return { item, ex, role, pri, ess, order, tier, min, base, max, pattern: patternOf(ex.family) };
}

const flatItem = (ex, { reps = [8, 12], hold = [20, 30], sets = 1, rest = 0, rir = null, notes = '' } = {}) => ({
  exerciseId: ex.id, family: ex.family, sets,
  reps: ex.mode === 'hold' ? null : reps, holdSec: ex.mode === 'hold' ? hold : null,
  perSide: !!ex.unilateral, restSec: rest, rir, notes,
});

// =============================================================================================
// Split selection and placement (§2.1, §4)
// =============================================================================================
function planSplit(D, weekIndex) {
  const d = D.days, M = D.M;
  const fullOnly = D.exp === 'new' || D.band === 'a65' || D.bmi35;
  let maxHard = { u18: ['regular', 'advanced'].includes(D.exp) ? 4 : 3, a18: 6, a40: 5, a55: 4, a65: 3 }[D.band];
  if (fullOnly) maxHard = Math.min(maxHard, 3);
  if (M < 25 && d >= 5) maxHard = Math.min(maxHard, 3);
  const flowDay = D.primary === 'flexibility' && d >= 3;
  const hard = Math.min(d - (flowDay ? 1 : 0), maxHard);
  let keys;
  if (hard <= 2) keys = ['fullA', 'fullB'].slice(0, Math.max(2, hard));
  else if (hard === 3) keys = M < 25 ? (weekIndex % 2 === 0 ? ['fullA', 'fullB', 'fullA'] : ['fullB', 'fullA', 'fullB']) : ['fullA', 'fullB', 'fullC'];
  else if (fullOnly || M < 25) keys = ['fullA', 'fullB', 'fullA', 'fullB', 'fullC', 'fullA'].slice(0, hard);
  else if (hard === 4) keys = ['upper', 'lower', 'upper', 'lower'];
  else if (hard === 5) keys = M >= 45 ? ['upper', 'lower', 'push', 'pull', 'legs'] : ['upper', 'lower', 'fullC', 'upper', 'lower'];
  else keys = M >= 45 ? ['push', 'pull', 'legs', 'push', 'pull', 'legs'] : ['upper', 'lower', 'upper', 'lower', 'upper', 'lower'];
  const light = [];
  for (let i = keys.length; i < d; i++) light.push(((D.w.skill || 0) >= 0.2 && light.length % 2 === 0) || (D.primary === 'skill') ? 'skillmob' : 'flow');
  return { hard: keys, light };
}

const MUSCLE_REGION = { chest: 'push', front_delts: 'push', side_delts: 'push', triceps: 'push', rear_delts: 'pull', lats: 'pull', upper_back: 'pull', traps: 'pull',
  biceps: 'pull', forearms: 'pull', quads: 'legs', glutes: 'legs', hamstrings: 'legs', adductors: 'legs', calves: 'legs', hip_flexors: 'legs',
  abs: 'core', obliques: 'core', lower_back: 'core' };
const REGIONS = { fullA: ['push', 'pull', 'legs'], fullB: ['push', 'pull', 'legs'], fullC: ['push', 'pull', 'legs'], upper: ['push', 'pull'], lower: ['legs'],
  push: ['push'], pull: ['pull'], legs: ['legs'] };

/** Choose which preferred days get hard sessions so that same-muscle sessions are >= 48 h (72 h at 65+) apart. */
function placeSessions(hardKeys, nLight, preferred, D) {
  const d = hardKeys.length + nLight;
  let pd = Array.isArray(preferred) ? [...new Set(preferred)].filter(x => Number.isInteger(x) && x >= 0 && x <= 6).sort((a, b) => a - b) : [];
  if (pd.length !== d) pd = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] }[d];
  const minGap = D.band === 'a65' ? 3 : 2;
  const h = hardKeys.length;
  let best = null, bestPen = Infinity;
  const combo = (start, chosen) => {
    if (chosen.length === h) {
      let pen = 0;
      for (let i = 0; i < h; i++) for (let j = i + 1; j < h; j++) {
        const share = REGIONS[hardKeys[i]].some(r => REGIONS[hardKeys[j]].includes(r));
        if (!share) continue;
        const gap = Math.min(Math.abs(pd[chosen[j]] - pd[chosen[i]]), 7 - Math.abs(pd[chosen[j]] - pd[chosen[i]]));
        if (gap < minGap) pen += (minGap - gap) * (j === i + 1 || (i === 0 && j === h - 1) ? 2 : 1);
      }
      if (pen < bestPen) { bestPen = pen; best = [...chosen]; }
      return;
    }
    for (let i = start; i < d; i++) combo(i + 1, [...chosen, i]);
  };
  combo(0, []);
  const slots = [];
  let hi = 0, li = 0;
  for (let i = 0; i < d; i++) slots.push(best.includes(i) ? { key: hardKeys[hi], hardIdx: hi++, dow: pd[i] } : { key: null, lightIdx: li++, dow: pd[i] });
  return slots;
}

// =============================================================================================
// Session templates (§2.1)
// =============================================================================================
const S = (fams, role, ess, extra = {}) => ({ fams, role, ess: !!ess, ...extra });
function template(key, variant, weekIndex) {
  const coreB = weekIndex % 2 ? ['core_posterior', 'core_lateral'] : ['core_lateral', 'core_posterior'];
  const rot = (weekIndex + variant) % 3;
  const coreRot = [CORE[rot], CORE[(rot + 1) % 3], CORE[(rot + 2) % 3]];
  switch (key) {
    // Tiers: 1 = primary compounds (filled to goal sets first), 2 = second leg pattern + core, 3 = accessories/extras.
    // A: vertical pull + squat emphasis, anterior core. B: row + hinge emphasis, lateral/posterior core.
    // C: vertical pull + unilateral squat, posterior core. Each of push, pull, squat, hinge, core appears >= 2x/week.
    case 'fullA': return { kind: 'hard', name: 'Full body A', focus: ['push', 'pull', 'legs', 'core'], slots: [
      S(['push_horizontal'], 'main', 1), S(['pull_vertical'], 'main', 1, { pv: true }), S(HPULL, 'main', 1, { hp2: true }),
      variant % 2 ? S(['squat'], 'main', 1, { variant: true, unilateral: true }) : S(['squat'], 'main', 1),
      S([variant % 2 ? 'core_lateral' : 'core_anterior'], 'core', 1), S(['hinge'], 'main', 1, { tier: 2 }),
      S(['calves'], 'acc', 0), S(['core_lateral'], 'core', 0), S(['push_vertical', 'dip'], 'main', 0)] };
    case 'fullB': return { kind: 'hard', name: 'Full body B', focus: ['push', 'pull', 'legs', 'core'], slots: [
      S(['push_vertical', 'dip'], 'main', 1), S(HPULL, 'main', 1), S(['hinge'], 'main', 1),
      S(coreB, 'core', 1), S(['squat'], 'main', 1, { tier: 2, variant: true, unilateral: true }),
      S(['pull_vertical'], 'main', 0), S(['push_horizontal'], 'main', 0), S(['calves'], 'acc', 0), S(['core_anterior'], 'core', 0)] };
    case 'fullC': return { kind: 'hard', name: 'Full body C', focus: ['push', 'pull', 'legs', 'core'], slots: [
      S(['push_horizontal'], 'main', 1, { variant: true }), S(['pull_vertical'], 'main', 1, { pv: true }), S(HPULL, 'main', 1, { hp2: true }),
      S(['squat'], 'main', 1, { alt: true, unilateral: true }), S([coreB[1], coreB[0], 'core_anterior'], 'core', 1), S(['hinge'], 'main', 1, { tier: 2 }),
      S(['push_vertical', 'dip'], 'main', 0), S(['calves'], 'acc', 0), S(['core_lateral'], 'core', 0)] };
    case 'upper': {
      const a = [S(['push_horizontal'], 'main', 1), S(HPULL, 'main', 1), S(['push_vertical', 'dip'], 'main', 1), S(['pull_vertical'], 'main', 1)];
      return { kind: 'hard', name: 'Upper', letter: true, focus: ['push', 'pull', 'core'], slots: [
        ...(variant % 2 ? [a[2], a[3], a[0], a[1]] : a), S(coreRot, 'core', 1),
        S(['pull_horizontal'], 'main', 0, { variant: true }), S(['dip', 'push_vertical'], 'main', 0), S(['pull_noequip'], 'main', 0), S(coreRot.slice(1), 'core', 0)] };
    }
    case 'lower': return { kind: 'hard', name: 'Lower', letter: true, focus: ['legs', 'core'], slots: [
      S(['squat'], 'main', 1), S(['hinge'], 'main', 1), S(['squat'], 'main', 1, { variant: true, unilateral: true }), S(['calves'], 'acc', 1),
      S(['core_posterior', 'core_lateral'], 'core', 1), S(['hinge'], 'main', 0, { variant: true }), S(['core_anterior'], 'core', 0), S(['core_lateral'], 'core', 0)] };
    case 'push': return { kind: 'hard', name: 'Push', focus: ['push', 'core'], slots: [
      S(['push_horizontal'], 'main', 1), S(['push_vertical', 'dip'], 'main', 1), S(['dip', 'push_vertical'], 'main', 1), S(HPULL, 'main', 1),
      S(coreRot, 'core', 1), S(['push_horizontal'], 'main', 0, { variant: true }), S(coreRot.slice(1), 'core', 0)] };
    case 'pull': return { kind: 'hard', name: 'Pull', focus: ['pull', 'core'], slots: [
      S(['pull_vertical'], 'main', 1), S(['pull_horizontal', 'pull_noequip'], 'main', 1), S(['pull_noequip', 'pull_horizontal'], 'main', 1, { variant: true }),
      S(coreRot, 'core', 1), S(['pull_vertical'], 'main', 0, { variant: true }), S(coreRot.slice(1), 'core', 0)] };
    case 'legs': return { kind: 'hard', name: 'Legs', focus: ['legs', 'core'], slots: [
      S(['squat'], 'main', 1), S(['hinge'], 'main', 1), S(['squat'], 'main', 1, { variant: true, unilateral: true }), S(['calves'], 'acc', 1),
      S(coreRot, 'core', 1), S(['hinge'], 'main', 0, { variant: true }), S(coreRot.slice(1), 'core', 0)] };
    case 'flow': return { kind: 'flow', name: 'Mobility flow', focus: ['mobility', 'core'], slots: [
      S(['core_posterior', 'core_anterior'], 'core', 1), S(['core_anterior', 'core_lateral'], 'core', 1), S(['core_lateral'], 'core', 0)] };
    case 'skillmob': return { kind: 'skillmob', name: 'Skill & mobility', focus: ['skill', 'mobility', 'core'], slots: [
      S(['core_anterior', 'core_lateral'], 'core', 1), S(['core_lateral', 'core_posterior'], 'core', 1)] };
  }
  throw new Error('unknown template ' + key);
}

// =============================================================================================
// Session builder
// =============================================================================================
function resolveSlot(slot, ctx, used) {
  const list = [...slot.fams];
  if (!slot.variant) for (const f of slot.fams) for (const fb of (FALLBACK[f] || [])) if (!list.includes(fb)) list.push(fb);
  for (const [i, f] of list.entries()) {
    const cur = ctx.levelsEx[f];
    const isFallback = i >= slot.fams.length;
    if (!cur) continue;
    if (slot.alt && i === 0) { // a different variation from the usual one, for variety across the week
      let c = ctx.avail[f].filter(e => e !== cur && !used.has(e.id) && Math.abs(e.level - cur.level) <= 1);
      if (slot.unilateral && c.some(e => e.unilateral)) c = c.filter(e => e.unilateral);
      if (c.length) return nearest(c, cur.level);
    }
    if (!used.has(cur.id) && !(slot.unilateral && !cur.unilateral && ctx.avail[f].some(e => e.unilateral && !used.has(e.id) && Math.abs(e.level - cur.level) <= 2))) return cur;
    if (slot.variant || isFallback) {
      let c = ctx.avail[f].filter(e => !used.has(e.id) && e.level <= cur.level + 1);
      if (slot.unilateral && c.some(e => e.unilateral)) c = c.filter(e => e.unilateral);
      if (c.length) return nearest(c, cur.level - (isFallback ? 1 : 0));
    }
  }
  return null;
}

function muscleLoad(ex) {
  const m = {};
  for (const x of ex.muscles?.primary || []) m[x] = (m[x] || 0) + 1;
  for (const x of ex.muscles?.secondary || []) m[x] = (m[x] || 0) + 0.5;
  return m;
}

function unitSec(u, sets, info) {
  if (u.parts.length === 1) { const it = u.parts[0].item; return sets * setSec(it, info) + (sets - 1) * u.rests[0] + CONFIG.transitionStraight; }
  const body = u.parts.reduce((s, p, i) => s + sets * (setSec(p.item, info) + u.rests[i]), 0);
  return u.parts.length === 2 ? body - u.rests[1] + CONFIG.transitionStraight : body + CONFIG.transitionCircuit;
}

function mkUnit(parts, fmt, ctx) {
  const info = ctx.info;
  let rests;
  if (parts.length === 1) rests = [parts[0].item.restSec];
  else if (parts.length === 2) { // §2.3 superset: r = max(30, rest/2), effective rest >= 60 (90 strength range)
    const rest = Math.max(...parts.map(p => p.item.restSec));
    let r = Math.max(30, rest / 2);
    const needEff = parts.some(p => p.item.reps && p.item.reps[1] <= 8) ? 90 : 60;
    for (const [i, p] of parts.entries()) r = Math.max(r, (needEff - setSec(parts[1 - i].item, info)) / 2);
    if (ctx.D.band === 'a65') r = Math.max(r, 45);
    r = Math.ceil(r / 5) * 5;
    rests = [r, r];
  } else { // circuit: 15 s hops, 60-90 s between rounds
    const roundRest = ctx.D.band === 'a65' ? 90 : ctx.D.M < 15 ? 60 : 75;
    rests = parts.map((_, i) => i === parts.length - 1 ? roundRest : CONFIG.circuitHopSec);
  }
  return {
    parts, rests, fmt, sets: 0,
    ess: parts.some(p => p.ess), tier: Math.min(...parts.map(p => p.tier ?? 3)), pri: Math.min(...parts.map(p => p.pri)), order: Math.min(...parts.map(p => p.order)),
    min: Math.max(...parts.map(p => p.min)), base: Math.max(...parts.map(p => p.base)), max: Math.min(...parts.map(p => p.max)),
    load: parts.reduce((m, p) => { for (const [k, v] of Object.entries(muscleLoad(p.ex))) m[k] = (m[k] || 0) + v; return m; }, {}),
  };
}

function pairUp(allParts, fmt, ctx) {
  if (fmt === 'straight' || allParts.length < 2) return allParts.map(p => mkUnit([p], fmt, ctx));
  const tiers = [...new Set(allParts.map(p => p.tier))].sort();
  if (tiers.length > 1) return tiers.flatMap(t => pairUp(allParts.filter(p => p.tier === t), fmt === 'circuit' && t !== tiers[0] ? 'superset' : fmt, ctx));
  const parts = allParts;
  const left = [...parts];
  const take = pred => { const i = left.findIndex(pred); return i >= 0 ? left.splice(i, 1)[0] : null; };
  const fam = (...fs) => p => fs.includes(p.ex.family);
  const units = [];
  if (fmt === 'circuit') {
    const ess = left.filter(p => p.ess && p.role !== 'balance').slice(0, 4);
    if (ess.length >= 3) { ess.forEach(p => left.splice(left.indexOf(p), 1)); units.push(mkUnit(ess, fmt, ctx)); }
  }
  const sameInjury = (a, b) => (a.ex.stress || []).some(s => ctx.D.inj.includes(s) && (b.ex.stress || []).includes(s));
  const rules = [[fam('push_horizontal'), fam('pull_horizontal', 'pull_noequip')], [fam('push_vertical', 'dip'), fam('pull_vertical')], [fam('squat', 'hinge'), fam('pull_vertical')],
    [fam('squat'), fam('core_anterior')], [fam('hinge'), fam('push_vertical', 'dip')], [fam('squat'), fam('core_lateral')],
    [p => p.pattern === 'push', p => p.pattern === 'pull'], [p => p.pattern === 'legs', p => p.pattern === 'core'], [p => p.pattern !== 'core', p => p.pattern === 'core'],
    [p => p.pattern === 'push', p => p.pattern === 'legs'], [p => p.pattern !== 'core', p => p.pattern !== 'core']];
  for (const [ra, rb] of rules) {
    for (;;) {
      const a = left.find(p => ra(p) && p.role !== 'balance');
      if (!a) break;
      const b = left.find(p => p !== a && rb(p) && p.role !== 'balance' && !sameInjury(a, p) && !(a.pattern === 'pull' && p.pattern === 'pull'));
      if (!b) break;
      left.splice(left.indexOf(a), 1); left.splice(left.indexOf(b), 1);
      units.push(mkUnit([a, b], fmt, ctx));
    }
  }
  for (const p of left) units.push(mkUnit([p], fmt, ctx));
  return units;
}

function fillMain(parts, fmt, ctx, sess, budget) {
  const info = ctx.info;
  const units = pairUp(parts, fmt, ctx).sort((a, b) => a.tier - b.tier || a.pri - b.pri || a.order - b.order);
  const chosen = [];
  let t = 0;
  // §1.2 / §4: <= 10 fractional sets per muscle per session, and the weekly age cap shared evenly
  // across the sessions that train that muscle.
  const muscleOk = (u, extra) => Object.entries(u.load).every(([m, v]) =>
    (sess.muscle[m] || 0) + v * extra <= (sess.capOf ? sess.capOf(m) : CONFIG.maxSetsPerMuscleSession));
  const apply = (u, extra) => { for (const [m, v] of Object.entries(u.load)) sess.muscle[m] = (sess.muscle[m] || 0) + v * extra; };
  const tryAdd = u => {
    if (chosen.includes(u)) return true;
    const floorSets = u.tier >= 2 && u.parts.some(p => p.role === 'main') && u.min >= 2 ? 2 : 1;
    for (let s = u.min; s >= floorSets; s--) {
      const c = unitSec(u, s, info);
      if (t + c <= budget && (muscleOk(u, s) || u.ess)) { u.sets = s; chosen.push(u); t += c; apply(u, s); return true; }
    }
    return false;
  };
  const raise = capOf => {
    let changed = true;
    while (changed) {
      changed = false;
      for (const u of [...chosen].sort((a, b) => a.pri - b.pri)) {
        if (u.sets >= capOf(u)) continue;
        const dc = unitSec(u, u.sets + 1, info) - unitSec(u, u.sets, info);
        if (t + dc <= budget && muscleOk(u, 1)) { u.sets++; t += dc; apply(u, 1); changed = true; }
      }
    }
  };
  const drop = u => { chosen.splice(chosen.indexOf(u), 1); t -= unitSec(u, u.sets, info); apply(u, -u.sets); };
  for (const u of units.filter(x => x.tier === 1)) tryAdd(u);
  // §2.3 step 4: never keep a push slot without a horizontal pull
  const hasHP = () => chosen.some(u => u.parts.some(p => HPULL.includes(p.ex.family)));
  const hpUnit = units.find(u => !chosen.includes(u) && u.parts.some(p => HPULL.includes(p.ex.family)));
  const hasPush = () => chosen.some(u => u.parts.some(p => p.pattern === 'push'));
  const vOk = ctx.barOnly && chosen.some(u => u.parts.some(p => p.ex.family === 'pull_vertical'));
  if (hasPush() && !hasHP() && hpUnit && !vOk) {
    while (!tryAdd(hpUnit)) { // squeeze other lifts (not below 2 sets), then drop pushes as a last resort
      const big = [...chosen].sort((a, b) => b.sets - a.sets || b.pri - a.pri)[0];
      if (big && big.sets > 2) { const d = unitSec(big, big.sets, info) - unitSec(big, big.sets - 1, info); big.sets--; t -= d; apply(big, -1); continue; }
      const pu = [...chosen].reverse().find(u => u.parts.some(p => p.pattern === 'push'));
      if (!pu) break;
      drop(pu);
    }
  }
  // Primary compounds reach their goal sets before anything else is added (QA #2), then tier 2, then accessories.
  raise(u => u.base);
  for (const u of units.filter(x => x.tier === 2)) tryAdd(u);
  raise(u => u.base);
  for (const u of units.filter(x => x.tier >= 3)) tryAdd(u);
  raise(u => u.max);
  return {
    units: chosen,
    get t() { return t; },
    topUp(newBudget) { budget = newBudget; raise(u => Math.min(6, u.max + 1)); return t; },
  };
}

function unitsToItems(units, sess) {
  const items = [];
  for (const u of [...units].sort((a, b) => a.order - b.order)) {
    const gid = u.parts.length > 1 ? ++sess.groups : null;
    u.parts.forEach((p, i) => {
      const it = { ...p.item, sets: u.sets, restSec: u.rests[i] };
      if (gid != null) {
        it.superset = gid;
        const tag = u.parts.length === 2 ? `Superset ${String.fromCharCode(64 + gid)}${i + 1}: alternate with ${u.parts[1 - i].ex.name || u.parts[1 - i].ex.id}.`
          : `Circuit: ${i === u.parts.length - 1 ? 'rest, then start the next round.' : 'move straight to the next exercise.'}`;
        it.notes = [tag, it.notes].filter(Boolean).join(' ');
      }
      items.push(it);
    });
  }
  return items;
}

const WARMUP_ORDER = {
  upper: ['marching_in_place', 'arm_circles', 'scapular_push_up', 'wrist_prep', 'thoracic_opener', 'cat_cow', 'inchworm', 'hip_circles'],
  lower: ['marching_in_place', 'leg_swings', 'hip_circles', 'worlds_greatest_stretch', 'cat_cow', 'arm_circles', 'inchworm'],
  full: ['marching_in_place', 'arm_circles', 'leg_swings', 'hip_circles', 'scapular_push_up', 'worlds_greatest_stretch', 'inchworm', 'cat_cow', 'wrist_prep', 'thoracic_opener'],
};
const MOBILITY_ORDER = {
  upper: ['doorway_chest_stretch', 'thoracic_opener', 'childs_pose', 'shoulder_dislocate', 'cobra_stretch', 'cat_cow', 'standing_hamstring_stretch', 'hip_flexor_stretch'],
  lower: ['hip_flexor_stretch', 'standing_hamstring_stretch', 'pigeon_stretch', 'calf_stretch', 'deep_squat_hold', 'pancake_stretch', 'worlds_greatest_stretch', 'childs_pose'],
  full: ['hip_flexor_stretch', 'standing_hamstring_stretch', 'doorway_chest_stretch', 'thoracic_opener', 'childs_pose', 'calf_stretch', 'pigeon_stretch', 'cobra_stretch',
    'deep_squat_hold', 'worlds_greatest_stretch', 'shoulder_dislocate', 'pancake_stretch', 'cat_cow'],
};
const regionOf = focus => focus.includes('legs') && !focus.includes('push') ? 'lower'
  : (focus.includes('push') || focus.includes('pull')) && !focus.includes('legs') ? 'upper' : 'full';

function candidates(order, ctx, families) {
  const ids = [...order];
  for (const f of families) for (const ex of ctx.avail[f]) if (!ids.includes(ex.id)) ids.push(ex.id);
  return ids.map(id => ctx.byId[id]).filter(ex => ex && ctx.isAvail(ex));
}

/** Add items, then sets, to a flat block until it reaches `target` seconds, never passing `limit`. */
function fillFlat(block, cands, target, limit, mk, maxSets, used, info) {
  let t = blockSec(block, info);
  for (const ex of cands) {
    if (t >= target) break;
    if (used.has(ex.id)) continue;
    const it = mk(ex);
    const c = blockSec({ items: [it] }, info);
    if (t + c > limit) continue;
    block.items.push(it); used.add(ex.id); t += c;
  }
  let changed = true;
  while (t < target && changed) {
    changed = false;
    for (const it of block.items) {
      if (t >= target) break;
      const c = setSec(it, info) + (it.restSec || 0);
      if (it.sets < maxSets && t + c <= limit) { it.sets++; t += c; changed = true; }
    }
  }
  return t;
}

function mobilityItem(ctx) {
  const hold = ctx.D.band === 'a65' ? [30, 45] : [20, 30]; // §1.1 flexibility (65+: 30-60 s, trimmed to 45 for time)
  return (ex, sets = 1) => flatItem(ex, { reps: [6, 10], hold, sets, rest: 10 });
}

const profile_eq = ctx => ctx.profile.equipment || [];
function buildSession(slot, ctx, weekIndex, sessIdx) {
  const D = ctx.D, info = ctx.info, M = D.M, T = M * 60;
  const key = slot.key || ctx.lightKeys[slot.lightIdx];
  const variant = slot.variant || 0;
  const tpl = template(key, variant, weekIndex);
  const row = [...TIME_TABLE].reverse().find(r => M >= r[0]);
  const fmt = tpl.kind === 'hard' ? row[5] : 'straight';
  const sess = { patternSeen: new Set(), muscle: {}, groups: 0,
    capOf: m => tpl.kind !== 'hard' ? CONFIG.maxSetsPerMuscleSession
      : Math.min(CONFIG.maxSetsPerMuscleSession, D.B.weeklyCap / Math.max(1, ctx.hitCount[MUSCLE_REGION[m] || 'core'] || 1)) };
  const used = new Set();
  const region = regionOf(tpl.focus);

  // --- balance (§4): 40-54 one item on 2 sessions/week, 55-64 >= 2 min, 65+ >= 3 min in every session
  const bal = D.B.balance;
  let balanceSec = 0;
  if (bal === 'two' && tpl.kind === 'hard' && tpl.focus.includes('legs') && ctx.balanceSessions < 2) balanceSec = 90;
  else if (typeof bal === 'number') balanceSec = bal;

  // --- block targets (seconds)
  let tw = Math.max(row[1], D.B.warm) * 60;
  tw = Math.min(tw, 0.5 * T);
  let tcool = Math.max(row[2], D.B.mobMin) * 60;
  if ((D.w.flexibility || 0) >= 0.2) tcool = Math.max(tcool, 300);
  if (D.primary === 'flexibility') tcool = Math.max(tcool, 0.3 * T);
  const skillEx = ctx.levelsEx.skill_balance;
  let tskill = 0;
  const skillGoal = (D.w.skill || 0) >= 0.2;
  if (skillEx && tpl.kind === 'hard' && skillGoal && (D.days <= 3 || slot.hardIdx < 3)) {
    tskill = M < 20 ? (D.primary === 'skill' && M >= 15 ? 180 : 0) : M < 30 ? 180 : M < 60 ? 300 : (D.primary === 'skill' ? 600 : 480);
  }
  if (tpl.kind === 'skillmob' && skillEx) tskill = clamp(0.35 * T, 180, 900);
  let tcond = 0;
  const condAvail = ctx.avail.conditioning.length > 0;
  if (condAvail && tpl.kind === 'hard') {
    if ((D.w.endurance || 0) >= 0.2) tcond = Math.max(180, Math.round((D.w.endurance * 0.25) * T));
    if (D.goals.includes('health') && M >= 20) tcond = Math.max(tcond, D.primary === 'health' ? clamp(row[4], 3, 10) * 60 : 180);
    if (D.bmi != null && D.bmi < 18.5) tcond = Math.min(tcond, 300);
    tcond = Math.min(tcond, 0.3 * T);
  }
  if (condAvail && tpl.kind === 'flow' && M >= 20) tcond = 180;
  if (tpl.kind === 'flow') tcool = Math.max(tcool, 0.5 * T);
  if (tpl.kind === 'skillmob') tcool = Math.max(tcool, 0.3 * T);
  // keep at least ~45% of hard sessions for main work
  if (tpl.kind === 'hard') {
    const over = tw + tcool + tskill + tcond - 0.55 * T;
    if (over > 0) { const cut = Math.min(over, tcond); tcond -= cut; tskill = Math.max(0, tskill - Math.max(0, over - cut)); }
  }

  const blocks = [];
  // --- warm-up
  const warm = { kind: 'warmup', title: 'Warm-up', items: [] };
  const wo = WARMUP_ORDER[region];
  const wk = (sessIdx + weekIndex) % (wo.length - 1);
  fillFlat(warm, candidates([wo[0], ...wo.slice(1 + wk), ...wo.slice(1, 1 + wk)], ctx, ['warmup']), tw, tw + 30,
    ex => flatItem(ex, { reps: [8, 12], hold: ex.family === 'conditioning' ? [45, 60] : [20, 30] }), 2, used, info);
  blocks.push(warm);

  // --- skill (first, while fresh)
  if (tskill > 0 && skillEx && !used.has(skillEx.id)) {
    const hold = skillEx.id === 'wall_handstand' ? [15, 45] : [5, 20];
    const it = flatItem(skillEx, { hold, sets: 3, rest: 90, rir: 3, notes: 'Quality attempts only: stop before form fades.' });
    while (it.sets < 6 && blockSec({ items: [{ ...it, sets: it.sets + 1 }] }, info) <= tskill) it.sets++;
    used.add(skillEx.id);
    blocks.push({ kind: 'skill', title: 'Skill practice', items: [it] });
  }

  // --- main
  const parts = [];
  let order = 0;
  const addPart = (ex, role, pri, ess, tier) => { used.add(ex.id); parts.push(makePart(ex, role, ctx, sess, pri, tier === 1, order++, tier)); };
  const hasPV = ctx.avail.pull_vertical.length > 0;
  const tierOf = s => s.tier ?? (s.pv ? (hasPV ? 1 : 3) : s.hp2 ? (hasPV ? 2 : 1) : !s.ess ? 3 : s.role === 'main' ? 1 : s.role === 'core' ? 2 : 3);
  const slots = [...tpl.slots];
  if (balanceSec > 0) slots.splice(Math.min(slots.length, tpl.kind === 'hard' ? 4 : 1), 0, S([], 'balance', 1, { balance: true }));
  for (const s of slots) {
    if (s.balance) {
      const ex = ['single_leg_rdl', 'split_squat', 'bird_dog', 'single_leg_glute_bridge'].map(id => ctx.byId[id]).find(e => e && ctx.isAvail(e) && !used.has(e.id));
      if (!ex) continue;
      addPart(ex, 'balance', PRI.balance, true, D.B.balance === 'two' ? 3 : 2);
      const p = parts[parts.length - 1];
      const unit = mkUnit([p], 'straight', ctx);
      let n = 1;
      while (n < 4 && unitSec(unit, n, info) < balanceSec) n++;
      p.min = p.base = n; p.max = Math.max(n, p.max);
      ctx.balanceSessionsInc = true;
      continue;
    }
    if (s.pv && !hasPV) continue; // no bar: the horizontal-pull slot carries the pulling (§7)
    const ex = resolveSlot(s, ctx, used);
    if (!ex) continue;
    addPart(ex, s.role, (PRI[ex.family] ?? 9) + (s.variant ? 10 : 0) + (s.ess ? 0 : 20) - (s.hp2 ? 5 : 0), s.ess, tierOf(s));
  }
  const tWarm = blockSec(warm, info);
  const tSkill = blocks[1] ? blockSec(blocks[1], info) : 0;
  const mainBudget = Math.max(0, T - tWarm - tSkill - tcond - tcool);
  const fm = fillMain(parts, fmt, ctx, sess, mainBudget);
  if (mainBudget - fm.t > 120) fm.topUp(mainBudget);
  const main = { kind: 'main', title: tpl.kind === 'hard' ? 'Main' : 'Strength, core & balance', items: unitsToItems(fm.units, sess) };
  blocks.push(main);
  // core did not fit after the primary lifts: keep the session's core pattern as a short warm-up activation
  if (tpl.kind === 'hard' && !main.items.some(i => CORE.includes(i.family))) {
    const cp = parts.find(p => p.role === 'core');
    if (cp) warm.items.push(flatItem(cp.ex, { reps: [8, 12], hold: [20, 30], sets: 1, notes: 'Core activation.' }));
  }
  // volume caps reached with time to spare: add an easy conditioning finisher rather than a very long stretch
  let finisher = false;
  const slack = mainBudget - fm.t;
  if (slack > 300 && condAvail && tpl.kind === 'hard') { finisher = tcond === 0; tcond += Math.min(slack, 900); }

  // --- conditioning circuit
  let cond = null;
  if (tcond > 0) {
    const av = ctx.avail.conditioning.filter(e => !used.has(e.id));
    if (av.length) {
      const lvl = ctx.levelsEx.conditioning?.level ?? av[0].level;
      const easy = tpl.kind !== 'hard' || finisher;
      const sorted = [...av].sort((a, b) => Math.abs(a.level - lvl) - Math.abs(b.level - lvl) || a.level - b.level);
      const pool = easy ? av.slice(0, 2) : sorted.slice(0, Math.min(4, sorted.length));
      const pick = pool.length > 2 ? [0, 1, 2, 3].map(i => pool[(i + weekIndex + sessIdx) % pool.length]).filter((e, i, a) => a.indexOf(e) === i).slice(0, 3) : pool;
      const hold = D.bmi35 ? [20, 30] : D.loading === 'endurance' ? [30, 45] : [30, 40];
      const cparts = pick.map((ex, i) => ({ item: { ...flatItem(ex), reps: null, holdSec: hold, perSide: false, rir: null, notes: easy ? 'Easy pace: you should be able to talk.' : '' }, ex, pri: 50, order: i, min: 1, base: 1, max: 8, ess: false, role: 'cond', pattern: 'conditioning' }));
      const u = mkUnit(cparts, cparts.length >= 3 ? 'circuit' : 'straight', ctx);
      if (cparts.length === 2) u.rests = [15, D.band === 'a65' ? 90 : 45];
      if (cparts.length === 1) u.rests = [D.band === 'a65' ? 90 : 30];
      u.sets = 1;
      while (u.sets < 8 && unitSec(u, u.sets + 1, info) <= tcond) u.sets++;
      if (unitSec(u, 1, info) <= tcond + 60) {
        const items = unitsToItems([u], sess);
        items.forEach(it => used.add(it.exerciseId));
        cond = { kind: 'conditioning', title: 'Conditioning', items, _u: u };
        blocks.push(cond);
      }
    }
  }

  // --- cool-down / mobility absorbs what is left
  const cool = { kind: tpl.kind === 'hard' ? 'cooldown' : 'mobility', title: tpl.kind === 'flow' ? 'Mobility flow' : tpl.kind === 'hard' ? 'Cool-down' : 'Mobility', items: [] };
  const mobOrder = MOBILITY_ORDER[tpl.kind === 'hard' ? region : 'full'];
  const rotBy = (weekIndex + sessIdx * 3) % mobOrder.length;
  const mobCands = candidates([...mobOrder.slice(rotBy), ...mobOrder.slice(0, rotBy)], ctx, ['mobility']);
  const mk = mobilityItem(ctx);
  const flexSets = tpl.kind !== 'hard' || (D.w.flexibility || 0) >= 0.2 ? 2 : 1;
  const others = () => blocks.reduce((t, b) => t + blockSec(b, info), 0);
  fillFlat(cool, mobCands, T - others(), T - others() + 15, ex => mk(ex, flexSets), flexSets === 2 ? 3 : 2, used, info);
  blocks.push(cool);

  // --- top-up when short (big sessions with a small library)
  let total = others() + blockSec(cool, info) - blockSec(cool, info);
  total = blocks.reduce((t, b) => t + blockSec(b, info), 0);
  if (total < (1 - 0.04) * T) {
    fm.topUp(mainBudget + (T - total));
    main.items = unitsToItems(fm.units, { groups: 0 });
    total = blocks.reduce((t, b) => t + blockSec(b, info), 0);
    if (cond && total < 0.96 * T) {
      const u = cond._u;
      while (u.sets < 8 && total + unitSec(u, u.sets + 1, info) - unitSec(u, u.sets, info) <= T) { total += unitSec(u, u.sets + 1, info) - unitSec(u, u.sets, info); u.sets++; }
      cond.items.forEach(it => { it.sets = u.sets; });
    }
    if (total < 0.96 * T) {
      const base = total - blockSec(cool, info);
      fillFlat(cool, mobCands, T - base, T - base + 15, ex => mk(ex, 1), 4, used, info);
    }
  }
  if (cond) delete cond._u;
  if (ctx.balanceSessionsInc) { ctx.balanceSessions++; ctx.balanceSessionsInc = false; }

  const focus = [...tpl.focus];
  if (blocks.some(b => b.kind === 'skill' && b.items.length) && !focus.includes('skill')) focus.push('skill');
  if (cond && !focus.includes('conditioning')) focus.push('conditioning');
  if (main.items.some(i => i.notes.includes('Balance')) && !focus.includes('balance')) focus.push('balance');
  return { id: '', name: '', focus, estMinutes: 0, blocks: blocks.filter(b => b.items.length), _tpl: tpl, _key: key };
}

// =============================================================================================
// Week-level balancing (§7, §13.23)
// =============================================================================================
function mainItems(sessions) {
  const out = [];
  for (const s of sessions) for (const b of s.blocks) if (b.kind === 'main') for (const it of b.items) out.push({ s, b, it });
  return out;
}
function pushPull(sessions) {
  let push = 0, pull = 0, hpush = 0, hpull = 0;
  for (const { it } of mainItems(sessions)) {
    const p = patternOf(it.family);
    if (p === 'push') push += it.sets;
    if (p === 'pull') pull += it.sets;
    if (it.family === 'push_horizontal') hpush += it.sets;
    if (HPULL.includes(it.family)) hpull += it.sets;
  }
  return { push, pull, hpush, hpull };
}

function padSession(s, ctx) {
  const info = ctx.info, T = ctx.D.M * 60;
  let cool = s.blocks.find(b => b.kind === 'cooldown' || b.kind === 'mobility');
  if (!cool) { cool = { kind: 'cooldown', title: 'Cool-down', items: [] }; s.blocks.push(cool); }
  const used = new Set(s.blocks.flatMap(b => b.items.map(i => i.exerciseId)));
  const main = s.blocks.find(b => b.kind === 'main');
  let t = sessionSec(s, info);
  if (main) for (const it of main.items) {
    if (patternOf(it.family) !== 'core' && patternOf(it.family) !== 'legs') continue;
    for (;;) {
      if (t >= 0.96 * T || it.sets >= 4) break;
      it.sets++;
      const nt = sessionSec(s, info);
      if (nt > T) { it.sets--; break; }
      t = nt;
    }
  }
  if (t < 0.96 * T) {
    const base = t - blockSec(cool, info);
    fillFlat(cool, candidates(MOBILITY_ORDER.full, ctx, ['mobility']), T - base, T - base + 15, ex => mobilityItem(ctx)(ex, 1), 4, used, info);
  }
  if (!cool.items.length) s.blocks.splice(s.blocks.indexOf(cool), 1);
}

function rebalance(sessions, ctx, pad) {
  if (!PULL.some(f => ctx.avail[f].length)) return;
  const ratio = ctx.D.inj.includes('shoulder') ? 1.5 : 1;
  const T = ctx.D.M * 60;
  const touched = new Set();
  for (let guard = 0; guard < 300; guard++) {
    const c = pushPull(sessions);
    const hFail = !ctx.barOnly && c.hpull < c.hpush && ctx.avail.pull_horizontal.length + ctx.avail.pull_noequip.length > 0;
    const tFail = c.pull < ratio * c.push;
    if (!hFail && !tFail) break;
    const isPush = hFail ? (it => it.family === 'push_horizontal') : (it => patternOf(it.family) === 'push');
    const isPull = hFail ? (it => HPULL.includes(it.family)) : (it => patternOf(it.family) === 'pull');
    const all = mainItems(sessions);
    const pushes = all.filter(x => isPush(x.it)), pulls = all.filter(x => isPull(x.it));
    let done = false;
    // (a) swap a push set for a pull set in the same session
    const floor = ['strength', 'muscle'].includes(ctx.D.loading) ? 3 : 1;
    for (const pu of [...pushes].sort((a, b) => b.it.sets - a.it.sets)) {
      if (pu.it.sets <= floor) continue;
      const pl = pulls.filter(x => x.s === pu.s && x.it.sets < 6).sort((a, b) => a.it.sets - b.it.sets)[0];
      if (pl) { pu.it.sets--; pl.it.sets++; touched.add(pu.s); done = true; break; }
    }
    if (done) continue;
    // (b) add a pull set where time allows
    for (const pl of [...pulls].sort((a, b) => a.it.sets - b.it.sets)) {
      if (pl.it.sets >= 6) continue;
      pl.it.sets++;
      if (sessionSec(pl.s, ctx.info) <= T * 1.05) { done = true; break; }
      pl.it.sets--;
    }
    if (done) continue;
    // (b2) trade an accessory/core set in the same session for a pull set
    for (const pl of [...pulls].sort((a, b) => a.it.sets - b.it.sets)) {
      if (pl.it.sets >= 6) continue;
      const acc = pl.b.items.filter(i => i.family === 'calves' || CORE.includes(i.family) || /Balance/.test(i.notes || '')).sort((a, b) => b.sets - a.sets)[0];
      if (!acc) continue;
      if (acc.sets > 1) acc.sets--; else pl.b.items.splice(pl.b.items.indexOf(acc), 1);
      pl.it.sets++;
      touched.add(pl.s); done = true; break;
    }
    if (done) continue;
    // (c) remove a push set, (d) remove a single-set push item if another push remains in the week
    const pu = [...pushes].sort((a, b) => b.it.sets - a.it.sets)[0];
    if (!pu) break;
    if (pu.it.sets > floor || (tFail && pu.it.sets > 1)) pu.it.sets--;
    else if (!tFail) break;
    else if (pushes.length > 1 && c.pull > 0) pu.b.items.splice(pu.b.items.indexOf(pu.it), 1);
    else break;
    touched.add(pu.s);
  }
  if (pad) for (const s of touched) padSession(s, ctx);
}

function reduceVolume(sessions, factor, kind) {
  for (const s of sessions) for (const b of s.blocks) {
    if (b.kind !== 'main' && b.kind !== 'conditioning') continue;
    for (const it of b.items) {
      it.sets = Math.max(1, Math.round(it.sets * factor));
      if (kind === 'deload') {
        if (it.reps) it.reps = [it.reps[0], Math.max(it.reps[0], Math.floor(mid(it.reps)))];
        if (it.holdSec) it.holdSec = [it.holdSec[0], Math.max(it.holdSec[0], Math.floor(mid(it.holdSec)))];
        if (it.rir != null) it.rir = Math.max(it.rir, 4);
      } else if (it.rir != null) it.rir += 1;
      if (b.kind === 'main') it.notes = [it.notes, kind === 'deload' ? 'Deload week: lighter on purpose. This is when you adapt.' : 'Welcome back: easing in after a break.'].filter(Boolean).join(' ');
    }
  }
}

// =============================================================================================
// generateWeek
// =============================================================================================
export function generateWeek(profile, levels, library, requestedWeek = 0, opts = {}) {
  const weekIndex = Math.max(0, requestedWeek | 0); // early starts (before startDate) use plan week 1
  const ctx = buildCtx(profile, library);
  const D = ctx.D;
  const init = initialLevels(profile, library);
  ctx.levelsEx = {};
  for (const fam of LEVEL_FAMILIES) {
    const avail = ctx.avail[fam];
    if (!avail.length) continue;
    const given = levels && levels[fam] ? ctx.byId[levels[fam]] : null;
    if (given && given.family === fam) {
      ctx.levelsEx[fam] = avail.includes(given) ? given : (stepDown(ctx.fam[fam], ctx.fam[fam].indexOf(given), ctx.isAvail) || nearest(avail, given.level));
    } else if (init[fam]) ctx.levelsEx[fam] = ctx.byId[init[fam]];
  }
  ctx.phase = opts._forceBuild ? { phase: 'build', blockWeek: 3, reentry: null, calibration: false, cycleLen: 5, blockStart: 0 } : phaseInfo(profile, weekIndex, opts);
  const eqp = profile.equipment || [];
  ctx.barOnly = eqp.includes('pullup_bar') && !eqp.includes('rings') && !eqp.includes('table') && ctx.avail.pull_vertical.length > 0; // doorway bar: rows may be impractical
  ctx.balanceSessions = 0;

  const split = planSplit(D, weekIndex);
  ctx.lightKeys = split.light;
  const slots = placeSessions(split.hard, split.light.length, profile.preferredDays, D);
  ctx.hitCount = { core: split.hard.length };
  for (const k of split.hard) for (const r of REGIONS[k]) ctx.hitCount[r] = (ctx.hitCount[r] || 0) + 1;
  const seen = {};
  for (const s of slots) if (s.key) s.variant = seen[s.key] = (seen[s.key] ?? -1) + 1;
  const sessions = slots.map((s, i) => buildSession(s, ctx, weekIndex, i));
  const counts = {};
  sessions.forEach(s => { counts[s._key] = (counts[s._key] || 0) + 1; });
  const seen2 = {};
  sessions.forEach((s, i) => {
    s.id = String.fromCharCode(65 + i);
    const t = s._tpl;
    const n = seen2[s._key] = (seen2[s._key] || 0) + 1;
    const letter = t.letter && counts[s._key] > 1 ? ' ' + String.fromCharCode(64 + n) : '';
    s.name = t.kind === 'hard' && !s._key.startsWith('full') ? `${t.name}${letter} — ${GOAL_LABEL[D.primary]}` : t.name;
    delete s._tpl; delete s._key;
  });
  rebalance(sessions, ctx, true);
  const ph = ctx.phase;
  if (ph.phase === 'deload') reduceVolume(sessions, 0.5, 'deload');
  else if (ph.reentry != null) reduceVolume(sessions, ph.reentry, 'reentry');
  if (ph.phase === 'deload' || ph.reentry != null) rebalance(sessions, ctx, false);
  for (const s of sessions) s.estMinutes = estimateMinutes(s, library);

  const days = {};
  for (let i = 0; i < 7; i++) days[i] = null;
  slots.forEach((sl, i) => { days[sl.dow] = sessions[i].id; });
  return {
    weekIndex: requestedWeek, phase: ph.phase, sessions, days,
    meta: {
      split: split.hard, lightDays: split.light.length, format: ([...TIME_TABLE].reverse().find(r => D.M >= r[0]))[5],
      lowImpact: D.lowImpact, lowImpactReasons: D.lowReasons, goal: D.primary, loadingGoal: D.loading, goalWeights: D.w, concurrent: D.concurrent,
      cycleLen: ph.cycleLen, blockWeek: ph.blockWeek, blockStart: ph.blockStart, reentry: ph.reentry, calibration: ph.calibration,
    },
  };
}

// =============================================================================================
// Progression (§8)
// =============================================================================================
const logWeek = log => Math.max(0, log.weekIndex ?? 0); // early-start logs belong to week 1

function prescribed(profile, levels, library, log, exerciseId, cache) {
  const key = logWeek(log);
  if (!cache.has(key)) cache.set(key, generateWeek(profile, levels, library, key, { _forceBuild: true }));
  const wk = cache.get(key);
  const find = ss => { for (const s of ss) for (const b of s.blocks) for (const it of b.items) if (it.exerciseId === exerciseId) return it; return null; };
  return find(wk.sessions.filter(s => s.id === log.sessionId)) || find(wk.sessions);
}

function judge(item, rx, fallback) {
  const hold = rx ? !!rx.holdSec : (item.sets || []).some(s => s.sec != null);
  const [lo, hi] = rx ? (rx.holdSec || rx.reps) : fallback(hold);
  const vals = (item.sets || []).map(s => (s.done === false ? 0 : Number((hold ? s.sec : s.reps) ?? 0)));
  const best = vals.length ? Math.max(...vals) : 0;
  return {
    lo, hi, hold, vals,
    allTop: vals.length > 0 && vals.every(v => v >= hi),
    anyBelow: vals.length === 0 || vals.some(v => v < lo),
    collapse: hold ? best < 0.5 * lo : best < lo - 3,
    hard: item.rating === 'hard', easy: item.rating === 'easy',
  };
}

/**
 * Double progression. history = previous SessionLogs. opts (optional): same as generateWeek opts
 * (blockStart/startDate/logs) so deload and re-entry weeks can be recognised.
 */
export function applySessionLog(levels, profile, sessionLog, library, history = [], opts = {}) {
  const ctx = buildCtx(profile, library);
  const out = { ...levels };
  const changes = [];
  const cache = new Map();
  const phaseOf = log => (log.phase === 'deload' || log.deload) ? 'deload' : log.reentry ? 'reentry'
    : (() => { const p = phaseInfo(profile, logWeek(log), { ...opts, logs: opts.logs || history }); return p.reentry != null ? 'reentry' : p.phase; })();
  const lightWeek = phaseOf(sessionLog) !== 'build';
  const prevLogs = (history || []).filter(l => l && l.id !== sessionLog.id && l.sessionId !== 'M' && (l.date || '') <= (sessionLog.date || '9999'))
    .map((l, i) => ({ l, i })).sort((a, b) => (a.l.date || '').localeCompare(b.l.date || '') || a.i - b.i).map(x => x.l);
  const g = GOAL_RX[ctx.D.loading];
  const name = ex => ex.name || ex.id;
  const move = (fam, cur, steps, reason) => {
    const list = ctx.avail[fam];
    let to = null;
    if (steps > 0) to = list.filter(e => e.level > cur.level)[steps - 1] || list.filter(e => e.level > cur.level).pop() || null;
    else to = [...list].reverse().find(e => e.level < cur.level) || null;
    if (!to) return false;
    out[fam] = to.id;
    changes.push({ family: fam, from: cur.id, to: to.id, reason: reason(to) });
    return true;
  };
  for (const item of sessionLog.items || []) {
    const fam = item.family || ctx.byId[item.exerciseId]?.family;
    if (!PROGRESSION_FAMILIES.includes(fam) || levels[fam] !== item.exerciseId || out[fam] !== item.exerciseId) continue;
    const cur = ctx.byId[item.exerciseId];
    if (!cur) continue;
    const fb = hold => CORE.includes(fam) ? (hold ? [20, 45] : [8, 15]) : (hold ? g.hold : g.reps);
    const now = judge(item, prescribed(profile, levels, library, sessionLog, item.exerciseId, cache), fb);
    const unit = now.hold ? ' s' : ' reps';
    if (item.pain != null && Number(item.pain) > 3) { // §6.1.3: immediate regression, even in light weeks
      move(fam, cur, -1, to => `You reported pain of ${item.pain}/10, so we step back to ${name(to)}. If pain lasts into the next day, see a professional.`);
      continue;
    }
    if (lightWeek) continue; // §8.7: deload / re-entry logs never change levels
    let prev = null, prevLog = null;
    for (let i = prevLogs.length - 1; i >= 0; i--) {
      if (phaseOf(prevLogs[i]) !== 'build') continue;
      const it = (prevLogs[i].items || []).find(x => (x.family || ctx.byId[x.exerciseId]?.family) === fam);
      if (it) { prev = it; prevLog = prevLogs[i]; break; }
    }
    const before = prev && prev.exerciseId === item.exerciseId ? judge(prev, prescribed(profile, levels, library, prevLog, prev.exerciseId, cache), fb) : null;
    const calibration = logWeek(sessionLog) <= 1;
    // fast-track (§8.4)
    if (calibration && now.vals.length && now.vals.every(v => v >= now.hi + 6) && !now.hard
      && move(fam, cur, 2, to => `Calibration: every set was well past ${now.hi}${unit}, so you jump two levels to ${name(to)}.`)) continue;
    if (now.easy && now.vals.length && now.vals.every(v => v >= now.hi + 3)
      && move(fam, cur, 1, to => `Rated easy with every set at ${now.hi + 3}+${unit}, so you move straight to ${name(to)}.`)) continue;
    // advance (§8.2)
    if (before && now.allTop && before.allTop && !now.hard && !before.hard && (sessionLog.feel ?? 3) <= 4
      && move(fam, cur, 1, to => `Hit the top of the range (${now.lo}-${now.hi}${unit}) on all sets twice, so it is time for ${name(to)}.`)) continue;
    // regress (§8.3)
    if (now.collapse) { move(fam, cur, -1, to => `Every set was well short of ${now.lo}${unit}, so we step back to ${name(to)} to rebuild.`); continue; }
    if (before && now.anyBelow && before.anyBelow) { move(fam, cur, -1, to => `Fell short of ${now.lo}${unit} in 2 sessions in a row, so we step back to ${name(to)}.`); continue; }
    if (before && now.hard && before.hard) { move(fam, cur, -1, to => `Rated hard 2 sessions in a row, so we step back to ${name(to)}.`); continue; }
  }
  // unlock vertical push / dip once the push-up ladder reaches the decline push-up (pushUps ≈ 16+)
  const ph = ctx.byId[out.push_horizontal];
  if (ph && ph.level >= 5) for (const fam of ['push_vertical', 'dip']) {
    if (out[fam] || !ctx.avail[fam].length) continue;
    const first = ctx.avail[fam][0];
    out[fam] = first.id;
    changes.push({ family: fam, from: null, to: first.id, reason: `Your push-ups are strong enough to add ${name(first)}.` });
  }
  return { levels: out, changes };
}

/** §9.4: level drops after a long gap. Returns { levels, changes, factors, retest }. */
export function applyGap(levels, profile, library, daysSinceLastLog) {
  const ctx = buildCtx(profile, library);
  const pol = gapPolicy(daysSinceLastLog);
  const out = { ...levels };
  const changes = [];
  const drop = ctx.D.band === 'a65' && pol.levelDrop65 ? pol.levelDrop65 : pol.levelDrop;
  if (drop) for (const fam of PROGRESSION_FAMILIES) {
    const cur = ctx.byId[out[fam]];
    if (!cur || (pol.minLevelForDrop && cur.level < pol.minLevelForDrop)) continue;
    const easier = ctx.avail[fam].filter(e => e.level < cur.level);
    const to = easier[Math.max(0, easier.length - drop)];
    if (!to) continue;
    out[fam] = to.id;
    changes.push({ family: fam, from: cur.id, to: to.id, reason: `After ${daysSinceLastLog} days off we ease back in one step lower.` });
  }
  return { levels: out, changes, factors: pol.factors, retest: pol.retest };
}

// =============================================================================================
// Plan start (QA #5)
// =============================================================================================
const isoOf = n => new Date(n * 86400000).toISOString().slice(0, 10);
const toDayN = d => typeof d === 'string' ? dayNum(d) : Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;

/**
 * planStartDate(createdOn, preferredDays) -> 'YYYY-MM-DD' (a Monday).
 * The Monday of the current week if at least one preferred day is still today or later this week
 * (Mon-Sun), otherwise next Monday. createdOn: Date or 'YYYY-MM-DD'.
 */
export function planStartDate(createdOn = new Date(), preferredDays = []) {
  const n = toDayN(createdOn);
  const mon = mondayOf(n);
  const today = (dowOf(n) + 6) % 7; // 0 = Monday
  const pd = Array.isArray(preferredDays) && preferredDays.length ? preferredDays : [1, 3, 5];
  return isoOf(pd.some(d => (d + 6) % 7 >= today) ? mon : mon + 7);
}

// =============================================================================================
// Streaks (§10.2)
// =============================================================================================
/**
 * opts.createdOn ('YYYY-MM-DD' or Date, or profile.createdOn): nothing before it counts or is penalised.
 * opts.startDate (plan start, or profile.startDate): sessions logged between createdOn and startDate are
 * early starts and count toward plan week 1's weekly target.
 */
export function computeStreak(logs, profile, today = new Date(), opts = {}) {
  const todayN = toDayN(today);
  const created = opts.createdOn || profile.createdOn;
  const createdN = created ? toDayN(created) : -Infinity;
  const logDays = new Set((logs || []).filter(l => l && l.date && l.sessionId !== 'M').map(l => dayNum(l.date)).filter(n => n <= todayN && n >= createdN));
  const startD = opts.startDate || profile.startDate;
  const startN = startD ? toDayN(startD) : -Infinity;
  const early = [...logDays].filter(n => n < startN).length;
  const d = clamp(profile.daysPerWeek || 3, 2, 6);
  const empty = { current: 0, best: 0, weekly: { current: 0, best: 0 }, freezeAvailable: false, freezesBanked: 0, freezesUsed: 0 };
  if (!logDays.size) return empty;
  let sched = Array.isArray(profile.preferredDays) && profile.preferredDays.length ? profile.preferredDays : null;
  if (!sched) sched = { 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] }[d];
  const isSched = n => sched.includes(dowOf(n));
  const target = d <= 3 ? d : Math.max(2, d - 1);
  const first = Math.min(...logDays);
  const usedLog = new Set();
  let cur = 0, best = 0, banked = 0, used = 0, wc = 0, wb = 0, keptRun = 0;
  const weekStartOfFirst = mondayOf(first);
  const curMon = mondayOf(todayN);
  const weekCount = mon => {
    let c = 0;
    for (let k = mon; k < mon + 7 && k <= todayN; k++) if (logDays.has(k) && k >= startN) c++;
    if (Number.isFinite(startN) && mon === mondayOf(startN)) c += early; // early starts count for week 1
    return c;
  };
  // A finished, missed week (not the partial first week) is "rescued" by one freeze, which also covers its missed days.
  const rescued = new Map(); // monday -> true (rescued) | false (broken)
  const weekMissed = mon => mon !== curMon && mon !== weekStartOfFirst && weekCount(mon) < target;
  const rescue = mon => {
    if (!rescued.has(mon)) { if (banked > 0) { banked--; used++; rescued.set(mon, true); } else rescued.set(mon, false); }
    return rescued.get(mon);
  };
  for (let n = first; n <= todayN; n++) {
    const mon = mondayOf(n);
    // an unscheduled session starts a streak, unless tomorrow's scheduled day can claim it via the ±1 flex
    if (!isSched(n) && cur === 0 && logDays.has(n) && !usedLog.has(n) && !(isSched(n + 1) && !logDays.has(n + 1) && n + 1 <= todayN)) {
      usedLog.add(n); cur = 1; best = Math.max(best, cur);
    }
    if (isSched(n)) {
      let hit = null;
      if (logDays.has(n) && !usedLog.has(n)) hit = n;
      else if (logDays.has(n - 1) && !usedLog.has(n - 1) && !isSched(n - 1) && n - 1 >= first) hit = n - 1; // ±1 day flex
      else if (logDays.has(n + 1) && !usedLog.has(n + 1) && !isSched(n + 1) && n + 1 <= todayN) hit = n + 1;
      if (hit != null) { usedLog.add(hit); cur++; }
      else if (n === todayN) { /* today still open */ }
      else if (n === todayN - 1 && !isSched(todayN) && !logDays.has(todayN)) { /* can still be made up today */ }
      else if (weekMissed(mon)) { if (!rescue(mon)) cur = 0; }
      else if (banked > 0) { banked--; used++; }
      else cur = 0;
      best = Math.max(best, cur);
    }
    const weekEnd = dowOf(n) === 0;
    if (weekEnd || n === todayN) {
      const kept = weekCount(mon) >= target;
      if (!weekEnd) { if (kept) wc++; } // in-progress week: counts once kept, never breaks
      else if (kept) { wc++; keptRun++; if (keptRun % CONFIG.freezeEveryKeptWeeks === 0) banked = Math.min(CONFIG.freezeMax, banked + 1); }
      else if (mon === weekStartOfFirst) { /* partial first week: neutral */ }
      else if (rescue(mon)) keptRun = 0;
      else { wc = 0; keptRun = 0; }
      wb = Math.max(wb, wc);
    }
  }
  // a session logged today (or yesterday, waiting to be claimed by today's scheduled day) always shows at least 1
  if (cur === 0 && (logDays.has(todayN) || (logDays.has(todayN - 1) && !usedLog.has(todayN - 1) && isSched(todayN)))) { cur = 1; best = Math.max(best, 1); }
  return { current: cur, best, weekly: { current: wc, best: wb }, freezeAvailable: banked > 0, freezesBanked: banked, freezesUsed: used };
}

// =============================================================================================
// Explanation
// =============================================================================================
/** What the week actually prescribes for its main compound lifts (push, pull, squat, hinge). */
function deliveredMain(week) {
  const its = [];
  for (const s of week.sessions) for (const b of s.blocks) if (b.kind === 'main') for (const it of b.items) {
    if ([...PUSH, ...PULL, 'squat', 'hinge'].includes(it.family) && !/Balance/.test(it.notes || '')) its.push(it);
  }
  if (!its.length) return null;
  const span = (a, b, unit = '') => a === b ? `${a}${unit}` : `${a}-${b}${unit}`;
  const sets = its.map(i => i.sets);
  const reps = [...new Set(its.map(i => i.reps ? `${i.reps[0]}-${i.reps[1]} reps` : `${i.holdSec[0]}-${i.holdSec[1]} s holds`))];
  const single = its.filter(i => i.superset == null).map(i => i.restSec);
  const paired = its.filter(i => i.superset != null).map(i => i.restSec);
  const rest = [single.length ? `about ${span(Math.min(...single), Math.max(...single), ' s')} rest` : '',
    paired.length ? `supersets with ${span(Math.min(...paired), Math.max(...paired), ' s')} between exercises` : ''].filter(Boolean).join(' and ');
  const rirs = its.map(i => i.rir).filter(x => x != null);
  return { sets: span(Math.min(...sets), Math.max(...sets)), minSets: Math.min(...sets), maxSets: Math.max(...sets), reps: reps.slice(0, 2).join(' or '), rest,
    rir: rirs.length ? span(Math.min(...rirs), Math.max(...rirs)) : '2-3' };
}

export function explainPlan(profile, week) {
  const D = derive(profile);
  const meta = week.meta || {};
  const hard = week.sessions.filter(s => s.focus.some(f => f === 'push' || f === 'pull' || f === 'legs')).length;
  const light = week.sessions.length - hard;
  const split = meta.split || [];
  const out = [];

  let sp;
  if (split.every(k => k.startsWith('full'))) {
    const why = D.exp === 'new' ? 'as a newcomer' : D.band === 'a65' ? 'which suits 65+' : D.bmi35 ? 'to keep sessions joint-friendly' : D.M < 25 ? 'because short sessions work best that way' : 'the best return for your time';
    sp = `Full body ${hard}×/week (${why}): every muscle is trained at least twice a week.`;
  } else if (split.includes('push') && split.includes('upper')) sp = 'Upper / Lower + Push / Pull / Legs: 5 longer sessions still train each muscle twice a week.';
  else if (split.includes('push')) sp = 'Push / Pull / Legs twice: each session focuses on one pattern and every muscle is trained twice a week.';
  else sp = `Upper / Lower split over ${hard} days, so each muscle gets two sessions with at least 48 h to recover.`;
  if (light) sp += ` ${light} lighter day${light > 1 ? 's' : ''} (mobility${D.w.skill >= 0.2 ? ', skill' : ''}${D.band === 'a55' || D.band === 'a65' ? ', balance' : ''}) keep${light > 1 ? '' : 's'} you moving without overloading recovery.`;
  out.push(sp);

  const L = D.loading;
  const dl = deliveredMain(week);
  let goal = `${GOAL_LABEL[L]} focus`;
  if (dl) {
    goal += `: your main lifts get ${dl.sets} sets of ${dl.reps}${dl.rest ? `, ${dl.rest}` : ''}, stopping ${dl.rir} reps short of failure.`;
  } else goal += '.';
  if (D.goals.length > 1) goal = `Goals blended 60/40 with ${GOAL_LABEL[D.primary]} first. ` + goal;
  if (D.concurrent) goal += ' The first exercise of each pattern is the heavy one; later ones use higher reps.';
  if (D.primary === 'flexibility') goal += ' At least 30% of each session is mobility work.';
  if (D.primary === 'skill' || (D.w.skill || 0) >= 0.2) goal += ' Balance-skill practice comes first while you are fresh.';
  out.push(goal);

  if (D.lowReasons.length) {
    const why = [];
    if (D.lowReasons.includes('injury')) why.push(`you mentioned a ${D.lowInj.map(i => INJURY_NAME[i]).join('/')} issue`);
    if (D.lowReasons.includes('age')) why.push('it is kinder on joints at 65+');
    if (D.lowReasons.includes('bmi')) why.push('it protects knees and ankles at your current weight (this relaxes as you get stronger)');
    out.push(`Low-impact options only (no jumping) because ${why.join(' and ')}.`);
  } else if (D.lowImpact) out.push('No jumping, as you asked for low-impact options.');
  if (D.inj.length) out.push(`Exercises that load your ${D.inj.map(i => INJURY_NAME[i]).join(' or ')} are left out or modified, with 3+ reps in reserve nearby. Discomfort up to 3/10 is OK; more than that, stop and step back.`);

  const c = pushPull(week.sessions);
  if (c.pull > 0) out.push(`A row or back exercise sits in every session with pushing, and pulling sets (${c.pull}) are at least ${D.inj.includes('shoulder') ? '1.5×' : 'equal to'} pushing sets (${c.push}) to keep your shoulders healthy.`);

  const ageTxt = { u18: 'Under 18: no sets to failure (3+ reps in reserve), technique first, and a 5-minute warm-up. Train with a parent, coach or PE teacher aware.',
    a40: '40+: a 5-minute warm-up and a little single-leg balance work each week.',
    a55: '55+: a 7-minute warm-up, 2+ minutes of balance work every session, and sets stop 2+ reps short of failure.',
    a65: '65+: low impact, an 8-minute warm-up, 3+ minutes of balance every session, longer rests and more mobility.' }[D.band];
  if (ageTxt) out.push(ageTxt);

  if (week.phase === 'deload') out.push('Deload week: same exercises at about half the sets. Lighter on purpose: this is when you adapt.');
  else if (meta.reentry != null) out.push(`Welcome back: this week uses about ${Math.round(meta.reentry * 100)}% of your usual sets to ease you in after a break.`);
  else if (meta.calibration) out.push('The first two weeks calibrate your starting levels: if something is too easy you will move up quickly.');
  else out.push(`Build week ${meta.blockWeek || 1}: every ${meta.cycleLen || 5}th week is an easier deload so progress keeps coming.`);

  if (meta.format === 'circuit') out.push('Short sessions run as a circuit so you get push, pull and legs done in the time.');
  else if (meta.format === 'superset') out.push('Exercises are paired as supersets (push + pull, legs + core) to fit more work in without cutting rest.');
  const pri = levelPriors(profile);
  if (pri.includes('age_easier') || pri.includes('upper_body_easier') || pri.includes('bmi_caps')) out.push('Without a full baseline test we start a step easier; being too easy corrects itself within a couple of sessions.');

  const who = 'For full health benefit, also aim for 150-300 min/week of moderate aerobic activity such as brisk walking (WHO).';
  return [...out.slice(0, 7), who];
}
