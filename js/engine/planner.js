// Kitaeru planner: plan generation, progression and streaks.
// Pure functions only: no DOM, no storage, no Math.random, no clock (except computeStreak's `today`).
// Contract: docs/CONTRACTS.md. Programming rules: docs/research.md (section numbers cited as §x.y).
//
// Errors: every public function that reads a profile throws a PlannerError { code: 'AGE_UNDER_13' }
// when profile.age < 13 (research §13.1: "Kitaeru is for ages 13+").
//
// v1.2 world movement (docs/world-movement.md §3-4): flows as session items, rotation / anti-rotation families,
// balance blocks, Morning Taiso and Baduanjin options. The accuracy gate (js/data/traditions.js) is applied in
// availability, so unverified tradition items are never planned, whichever library is passed in.
import { contentVisible, traditionPreview, TRADITIONS } from '../data/traditions.js';
import { flowSeconds, ALL_BY_ID, ALL_FAMILIES } from '../data/exercises.js';
import { exerciseAnimated, animationGateVersion } from '../data/animated.js';

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
const ALL_GOALS = [...LOADING, 'flexibility', 'skill', 'balance'];
const GOAL_LABEL = { strength: 'Strength', muscle: 'Muscle', endurance: 'Endurance', health: 'Health', flexibility: 'Flexibility', skill: 'Skill', balance: 'Balance' };

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
  [5, 1, 1, 0, 0, 'circuit'], [10, 2, 1.5, 0, 0, 'circuit'], [15, 3, 2, 0, 2, 'circuit'], [20, 3, 2.5, 3, 3, 'superset'],
  [30, 5, 4, 5, 5, 'superset'], [45, 6, 5, 5, 6, 'straight'], [60, 8, 7, 8, 8, 'straight'], [75, 10, 9, 10, 10, 'straight'],
];

const SPACE_RANK = { small: 0, medium: 1, large: 2 };
const PUSH = ['push_horizontal', 'push_vertical', 'dip'];
const PULL = ['pull_vertical', 'pull_horizontal', 'pull_noequip'];
const HPULL = ['pull_horizontal', 'pull_noequip'];
const LEGS = ['squat', 'hinge', 'calves'];
const CORE = ['core_anterior', 'core_lateral', 'core_posterior'];
const ROT = ['anti_rotation', 'rotation']; // world-movement §3.3: pattern 'core'
export const PROGRESSION_FAMILIES = [...PUSH, ...PULL, ...LEGS, ...CORE, 'skill_balance', ...ROT];
const LEVEL_FAMILIES = [...PROGRESSION_FAMILIES, 'conditioning', 'stance'];
/** Session id of a Morning Taiso log: keeps the day streak alive, never counts toward the weekly target. */
export const MORNING_TAISO_SESSION_ID = 'T';
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
  knee: { split_squat: 'Partial range, pain-free (≤3/10).', horse_stance: 'High stance only: knees slightly bent, pain-free.',
    taichi_part_horse_mane: 'High stance: knees slightly bent, pain-free.', taichi_brush_knee: 'High stance: knees slightly bent, pain-free.',
    taichi_golden_rooster: 'Standing knee soft; lift only as high as is comfortable.', baduanjin_draw_bow: 'High stance: knees slightly bent, pain-free.' },
  ankle: { calf_raise: 'Both legs, hands on a wall for support.' },
};
// world-movement §3.3 / §4.6.5: with a back problem, only the gentlest rotation levels
const INJ_LEVEL_CAP = { lower_back: { rotation: 2, anti_rotation: 4 } };
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
  core_anterior: 7, core_lateral: 8, core_posterior: 8, anti_rotation: 8, rotation: 8.5, calves: 9, stance: 9 };

// Near-identical drills never share a session (QA: "Open book" and the side-lying chest opener are the same movement).
const SAME_DRILL = [['open_book', 'thoracic_opener']];
const TWIN = {};
for (const g of SAME_DRILL) for (const id of g) TWIN[id] = g.filter(x => x !== id);
/** A set of used exercise ids that also marks each id's same-drill twins as used. */
class DrillSet extends Set {
  add(id) { super.add(id); for (const t of TWIN[id] || []) super.add(t); return this; }
}
const drillSet = ids => { const s = new DrillSet(); for (const id of ids || []) s.add(id); return s; };
/** Shuffle variety (v1.3): moves used by earlier shuffles of the same request go last; the order is otherwise kept. */
const avoidLast = (ctx, arr) => {
  if (!ctx.avoid || !ctx.avoid.size) return arr;
  const hit = e => ctx.avoid.has(typeof e === 'string' ? e : e?.id);
  return [...arr.filter(e => !hit(e)), ...arr.filter(hit)];
};
const mid = r => (r[0] + r[1]) / 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const patternOf = fam => PUSH.includes(fam) ? 'push' : PULL.includes(fam) ? 'pull' : LEGS.includes(fam) || fam === 'stance' ? 'legs'
  : CORE.includes(fam) || ROT.includes(fam) ? 'core' : fam;
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
    days: clamp(profile.daysPerWeek || 3, 2, 6), M: clamp(profile.minutesPerSession || 30, profile._quick ? 5 : 10, 90),
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
  // §4.6.2: 75+ (or new to exercise at 65+) should use the seated version, which is not built yet
  if (D.age >= 75 || (D.age >= 65 && D.exp === 'new')) excl.add('radio_taiso_1');
  const capOk = ex => D.inj.every(i => { const c = INJ_LEVEL_CAP[i]?.[ex.family]; return c == null || ex.level <= c; });
  return ex => contentVisible(ex) && !ex.flowOnly // accuracy gate; flow-only steps are never planned on their own
    && exerciseAnimated(ex, ALL_BY_ID) // animation gate: nothing is planned that would render as a fallback figure
    && (ex.equipment || []).every(e => eq.has(e))
    && (SPACE_RANK[ex.space] ?? 0) <= sp
    && !excl.has(ex.id)
    && capOk(ex)
    && (ex.mode === 'flow' ? flowAdapt(ex, D) !== null // flows adapt step by step (§6.2) instead of failing on the union
      : !(ex.impact === 'high' && D.lowImpact) && (ex.stress || []).every(s => !D.inj.includes(s) || (INJ_ALLOW[s] && INJ_ALLOW[s][ex.id])));
}

// =============================================================================================
// Flows (world-movement §4.4, §4.6, §6.2)
// =============================================================================================
// Steps dropped for an injury (§4.6.3 neck, §4.6.5 lower back); other stressed steps stay, in a smaller range.
const FLOW_DROP = { neck: ['baduanjin_look_back', 'baduanjin_sway_head_tail'], lower_back: ['rt_trunk_circle', 'baduanjin_touch_toes', 'baduanjin_sway_head_tail'],
  ankle: ['baduanjin_heel_bounce'] };
const FLOW_RANGE = { knee: 'Knees only slightly bent; stay pain-free.', lower_back: 'Keep bends and twists small and pain-free.',
  shoulder: 'Keep arm movements in a pain-free range.', neck: 'Keep head turns small and pain-free: turn less than the figure does.' };
const FLOW_ROUNDS = { taichi_short_flow: 3, radio_taiso_1: 2 }; // how many times a flow may repeat in one block (default once)

/** How a flow adapts to this profile: { skip: [moveId], replace: { moveId: moveId }, stance, notes } or null (unusable). */
function flowAdapt(ex, D) {
  const out = { skip: [], replace: {}, stance: null, notes: [] };
  const swap = ex.variants?.lowImpact?.replace || {};
  const moves = (ex.sequence || []).filter(st => st.move);
  const note = n => { if (!out.notes.includes(n)) out.notes.push(n); };
  for (const st of moves) {
    const id = st.move;
    if (out.skip.includes(id) || out.replace[id]) continue;
    if (D.lowImpact && st.impact === 'high') { if (!swap[id]) return null; out.replace[id] = swap[id]; continue; } // §4.6.2 hops -> heel raises
    const hit = (st.stress || []).filter(s => D.inj.includes(s));
    if (hit.some(s => (FLOW_DROP[s] || []).includes(id))) { out.skip.push(id); continue; }
    for (const s of hit) {
      if (!FLOW_RANGE[s]) { out.skip.push(id); break; } // no safe smaller range to offer: leave the step out
      if (s === 'knee' && ex.stanceLevels) out.stance = 'high'; // §4.6.4: high stance for all Tai Chi
      note(FLOW_RANGE[s]);
    }
  }
  if (D.inj.includes('neck')) note(FLOW_RANGE.neck); // §4.6.3: cap the neck range throughout
  if (Object.keys(out.replace).length) note('No hops: heel raises instead.');
  if (out.skip.length > new Set(moves.map(st => st.move)).size / 3) return null; // too little of the form is left
  return out;
}

/** Highest progression stage allowed: never a soft-gaze stage at 65+ (§4.4). */
function flowMaxStage(ex, D) {
  const st = ex.progression?.stages || [];
  let i = st.length - 1;
  while (i > 0 && D.age >= 65 && st[i].support === 'soft_gaze') i--;
  return Math.max(0, i);
}

/** Plain words for a progression stage, naming what changed from `prev` when given. */
function flowStageText(st, prev = null) {
  const parts = [];
  if (st.variant && (!prev || prev.variant !== st.variant)) parts.push(st.variant === 'full' ? 'the full version' : 'the short version');
  if (st.stance && (!prev || prev.stance !== st.stance)) parts.push(`a ${st.stance} stance`);
  if (st.support && (!prev || prev.support !== st.support)) parts.push(st.support === 'chair' ? 'a chair nearby' : st.support === 'free' ? 'no chair' : 'a soft, lowered gaze');
  if (st.tempoScale && prev && st.tempoScale > (prev.tempoScale || 1)) parts.push('a slower tempo');
  return parts.length ? parts.join(', ') : 'the next stage';
}

/** A flow as a session item. holdSec is the length of one pass; item.flow carries what a flow player needs. */
function flowItem(ex, ctx, { variant = null, sets = 1 } = {}) {
  const D = ctx.D;
  const ad = flowAdapt(ex, D) || { skip: [], replace: {}, stance: null, notes: [] };
  const stages = ex.progression?.stages || null;
  const idx = stages ? clamp(Number(ctx.flowStages?.[ex.id]?.stage) || 0, 0, flowMaxStage(ex, D)) : null;
  const stage = stages ? stages[idx] : {};
  const v = variant || stage.variant || 'full';
  const tempoScale = stage.tempoScale || 1;
  const stance = ex.stanceLevels ? (ad.stance || stage.stance || ex.stanceLevels[0]) : null;
  const support = stage.support || (ex.stanceLevels && D.age >= 55 ? 'chair' : null);
  const sec = Math.round(flowSeconds(ex, { variant: v, skip: ad.skip, tempoScale }));
  const notes = [...ad.notes];
  if (support === 'chair') notes.push('Keep a chair nearby for support.');
  return { exerciseId: ex.id, family: ex.family, sets, reps: null, holdSec: [sec, sec], perSide: false, restSec: 0, rir: null, notes: notes.join(' '),
    flow: { variant: v, stage: idx, stance, support, tempoScale, skip: ad.skip, replace: ad.replace, estSec: sec } };
}

/** Repeat a flow item (up to its round limit) while the block stays within target + 30 s. */
function addRounds(block, it, target, info) {
  while (it.sets < (FLOW_ROUNDS[it.exerciseId] || 1)) {
    it.sets++; it.restSec = 20;
    if (blockSec(block, info) > target + 30) { it.sets--; break; }
  }
  if (it.sets === 1) it.restSec = 0;
}

/** A block of whole flows (light days, Quick 'flow'), filling about `target` seconds. */
function flowBlock(ctx, target, used, order, info) {
  const block = { kind: 'flow', title: 'Flow', items: [] };
  for (const id of order) {
    const ex = ctx.byId[id];
    if (!ex || used.has(id) || !ctx.isAvail(ex)) continue;
    const left = target - blockSec(block, info);
    if (left < 60) break;
    let it = flowItem(ex, ctx);
    if (blockSec({ items: [it] }, info) > left + 30 && ex.variants?.short) it = flowItem(ex, ctx, { variant: 'short' });
    if (blockSec({ items: [it] }, info) > left + 30) continue;
    block.items.push(it); used.add(id);
    addRounds(block, it, target, info);
  }
  if (!block.items.length) return null;
  block.title = block.items.map(i => ctx.byId[i.exerciseId].name).join(' · ');
  return block;
}

// §4.6.1 balance block: Tai Chi when its content is verified, otherwise single-leg and anti-rotation work.
const BALANCE_GENERIC = ['single_leg_rdl', 'bird_dog', 'split_squat', 'single_leg_calf_raise', 'single_leg_glute_bridge', 'bird_dog_row', 'reverse_lunge'];
const BALANCE_QUICK = ['taichi_golden_rooster', 'single_leg_rdl', 'bird_dog', 'single_leg_glute_bridge', 'bird_dog_row', 'single_leg_calf_raise'];
const BAL_NOTE = 'Balance: stand near a wall or sturdy chair for support.';
const injNotes = (ex, D) => (ex.stress || []).filter(s => D.inj.includes(s) && INJ_ALLOW[s]?.[ex.id]).map(s => INJ_ALLOW[s][ex.id]);
function balanceBlock(ctx, target, used, info) {
  const D = ctx.D;
  const block = { kind: 'balance', title: 'Balance', items: [] };
  const tc = ctx.byId.taichi_short_flow;
  const skipTc = ctx.quick && ctx.avoid && ctx.avoid.has('taichi_short_flow') && ctx.vary % 2 === 0; // a shuffle (v1.3): the generic one-leg work this time
  if (tc && ctx.isAvail(tc) && !used.has(tc.id) && !skipTc) {
    const it = flowItem(tc, ctx);
    if (blockSec({ items: [it] }, info) <= target + 30) {
      block.title = 'Balance: Tai Chi';
      block.items.push(it); used.add(tc.id);
      const gr = ctx.byId.taichi_golden_rooster;
      if (gr && ctx.isAvail(gr) && !used.has(gr.id)) {
        const g = flatItem(gr, { hold: [5, 15], sets: 2, rest: 15, notes: [BAL_NOTE, ...injNotes(gr, D)].join(' ') });
        if (blockSec({ items: [...block.items, g] }, info) > target + 30) g.sets = 1; // short blocks still get the one-leg hold (CONTRACTS: Tai Chi + golden rooster)
        if (blockSec({ items: [...block.items, g] }, info) <= target + (ctx.quick ? 30 : 75)) { block.items.push(g); used.add(gr.id); }
      }
      addRounds(block, it, target, info);
      // plans: the block keeps its minimum (5 min; 3 min under 25-min sessions): more one-leg holds, then single-leg work
      const floor = ctx.quick ? 0 : Math.min(target, D.M < 25 ? 180 : 300);
      const g = block.items.find(i => i.exerciseId === 'taichi_golden_rooster');
      while (g && g.sets < 4 && blockSec(block, info) < floor) g.sets++;
      if (blockSec(block, info) < floor) {
        const more = BALANCE_GENERIC.map(id => ctx.byId[id]).filter(e => e && ctx.isAvail(e) && !used.has(e.id));
        fillFlat(block, more, floor, target + 30, ex => flatItem(ex, { reps: [6, 10], hold: [20, 40], sets: 1, rest: 30, notes: [BAL_NOTE, ...injNotes(ex, D)].join(' ') }), 3, used, info);
      }
      return block;
    }
  }
  // Quick: the one-leg hold leads when visible, and short blocks use single sets so something always fits
  const order = ctx.quick ? BALANCE_QUICK : BALANCE_GENERIC;
  const sets = ctx.quick && target < 180 ? 1 : 2;
  let cands = order.map(id => ctx.byId[id]).filter(e => e && ctx.isAvail(e) && !used.has(e.id));
  if (ctx.avoid && cands.length > 1) cands = [cands[0], ...avoidLast(ctx, rotate(cands.slice(1), ctx.vary || 0))]; // shuffle: the lead hold stays
  fillFlat(block, cands, target, target + 30, ex => flatItem(ex, { reps: [6, 10], hold: ex.id === 'taichi_golden_rooster' ? [5, 15] : [20, 40], sets, rest: ex.id === 'taichi_golden_rooster' ? 15 : 30,
    notes: [BAL_NOTE, ...injNotes(ex, D)].join(' ') }), 3, used, info);
  return block.items.length ? block : null;
}
/** Flows to prefer on light days: Tai Chi first for balance (55+ or the balance goal), otherwise Baduanjin. */
const flowOrder = D => D.age >= 55 || D.goals.includes('balance') ? ['taichi_short_flow', 'baduanjin_sequence'] : ['baduanjin_sequence', 'taichi_short_flow'];

/** Is an exercise usable by this profile (equipment, space, impact, injuries, age/BMI exclusions)? */
export function isAvailable(ex, profile) { return availabilityFn(profile, derive(profile))(ex); }

// ---------------------------------------------------------------------------------------------
// v1.3: why an exercise is unavailable, and swaps for moves that are not ladders
// ---------------------------------------------------------------------------------------------
const KIT_SHORT = { pullup_bar: 'a pull-up bar', dip_bars: 'dip bars', rings: 'rings', parallettes: 'parallettes', resistance_band: 'a band', bench: 'a chair or bench',
  table: 'a table', wall: 'a wall', club: 'a club', stick: 'a stick', hand_weights: 'hand weights' };
const STRONG_PARQ = [0, 1, 2, 6]; // pre-screen answers that switch low impact on (onboarding) and gate vigorous bursts (moments)
const healthFlag = p => STRONG_PARQ.some(i => p?.health?.parq?.[i] === true) || !!p?.health?.pregnant;
const listWords = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

/**
 * Why `ex` is not available to this profile, or null when it is (or there is no profile). The first reason that applies,
 * in this order: kit, injury, space, impact, age, BMI start caps, then anything else (hidden or not animated yet).
 * Returns { code: 'kit'|'injury'|'space'|'impact'|'age'|'bmi'|'other', label, detail, kit?, injury? }: `label` is a few
 * words for a Library card ("not with your knee"), `detail` one sentence for the detail sheet.
 */
export function unavailableReason(ex, profile) {
  if (!ex || !profile) return null;
  const D = derive(profile);
  if (availabilityFn(profile, D)(ex)) return null;
  const eq = new Set(profile.equipment || []);
  const missing = (ex.equipment || []).filter(e => !eq.has(e));
  if (missing.length) {
    const words = missing.map(e => KIT_SHORT[e] || e.replace(/_/g, ' '));
    return { code: 'kit', kit: missing, label: missing.length === 1 ? `needs ${words[0]}` : 'needs kit', detail: `It needs ${listWords(words)}, which ${missing.length === 1 ? 'isn’t' : 'aren’t'} in your kit.` };
  }
  // flows adapt step by step: they are out only when flowAdapt gives up (a hop with no swap, or too many steps dropped)
  const steps = ex.mode === 'flow' ? (ex.sequence || []).filter(s => s.move) : [];
  const flowOut = ex.mode === 'flow' && flowAdapt(ex, D) === null;
  const impactHit = ex.mode === 'flow' ? flowOut && D.lowImpact && steps.some(s => s.impact === 'high' && !ex.variants?.lowImpact?.replace?.[s.move]) : D.lowImpact && ex.impact === 'high';
  const hurt = D.inj.find(i => (INJ_EXCLUDE[i] || []).includes(ex.id) || (INJ_LEVEL_CAP[i]?.[ex.family] != null && ex.level > INJ_LEVEL_CAP[i][ex.family])
    || (ex.mode === 'flow' ? flowOut && !impactHit && steps.some(s => (s.stress || []).includes(i)) : (ex.stress || []).includes(i) && !(INJ_ALLOW[i] && INJ_ALLOW[i][ex.id])));
  if (hurt) {
    const n = INJURY_NAME[hurt];
    return { code: 'injury', injury: hurt, label: `not with your ${n}`, detail: `It loads your ${n}, which you told us about, so we leave it out for now.` };
  }
  if ((SPACE_RANK[ex.space] ?? 0) > (SPACE_RANK[profile.space] ?? 1)) {
    return { code: 'space', label: 'needs more space', detail: ex.space === 'large' ? 'It needs room to jump, lunge or crawl several metres.' : 'It needs room to lie down and swing your arms and legs.' };
  }
  if (impactHit) {
    const why = healthFlag(profile) ? ['after pre-screen answers', 'Your health answers mean we keep things low impact for now.']
      : D.lowReasons.includes('age') ? ['not advised at your age', 'We keep jumping out of sessions from 65, to go easy on joints and balance.']
      : D.lowReasons.includes('injury') ? [`not with your ${INJURY_NAME[D.lowInj[0]]}`, `Jumping is hard on your ${INJURY_NAME[D.lowInj[0]]}, so we keep things low impact.`]
      : D.lowReasons.includes('bmi') ? ['low impact for now', 'We start with low-impact moves to go easy on your joints. Jumping can come later.']
      : ['you chose low impact', 'You asked for low impact, and this one has jumps. Switch it off in your preferences to include it.'];
    return { code: 'impact', label: `high impact (${why[0]})`, detail: why[1] };
  }
  const ageList = [...(D.age < 16 ? AGE_EXCLUDE.u16 : []), ...(D.band === 'a55' && D.exp !== 'advanced' ? AGE_EXCLUDE.a55 : []), ...(D.band === 'a65' ? AGE_EXCLUDE.a65 : []),
    ...(D.age >= 75 || (D.age >= 65 && D.exp === 'new') ? ['radio_taiso_1'] : [])];
  if (ageList.includes(ex.id)) return { code: 'age', label: 'not advised at your age', detail: 'We leave this one out at your age: the risk outweighs what it adds. The rest of the ladder trains the same muscles.' };
  if (D.bmiCaps && ex.id === 'deep_squat_hold') return { code: 'bmi', label: 'build up to it first', detail: 'We start with easier leg and hip work first. This one comes later.' };
  if (hurt) { const n = INJURY_NAME[hurt]; return { code: 'injury', injury: hurt, label: `not with your ${n}`, detail: `It loads your ${n}, which you told us about, so we leave it out for now.` }; }
  return { code: 'other', label: 'not for you now', detail: 'It isn’t available in your plans yet.' };
}

const REGION3 = { push: 'upper', pull: 'upper', legs: 'lower', core: 'core' };
const regionsOf = ex => new Set((ex.muscles?.primary || []).map(m => REGION3[MUSCLE_REGION[m]]).filter(Boolean));
const GENTLE_CATS = ['warmup', 'mobility'];
/**
 * Swaps for a move that is not a ladder rung (warm-up, mobility, cardio, single flow forms; world-movement.md §3.3):
 * `n` (default 3) moves for the same body region and purpose, best first. Same purpose = the same kind of move
 * (warm-up and mobility drills swap with each other, cardio with cardio at a similar level), preferring the same mode
 * (reps or hold) and posture. Only what the profile can do (kit: opts.equipment for today's kit, space, injuries, age,
 * impact and the gates) and, with opts.moment, what that moment allows (posture, impact, exclusions). opts.exclude: ids
 * already in the session. Returns exercises (from the visible library).
 */
export function swapAlternatives(exerciseId, profile, library, opts = {}) {
  const info = libInfo(library);
  const ex = info.byId[exerciseId] || ALL_BY_ID[exerciseId];
  if (!ex || ex.mode === 'flow' || PROGRESSION_FAMILIES.includes(ex.family)) return []; // ladders keep Easier / Harder
  const base = quickBase({ equipment: opts.equipment }, profile);
  const ok = availabilityFn(base, derive(base));
  const R = MOMENT_RULES[momentId(opts.moment)] || {};
  const momentOk = e => (!R.posture || R.posture.includes(e.posture)) && !(R.noImpact && e.impact === 'high') && !(R.exclude || []).includes(e.id);
  const skip = new Set([exerciseId, ...(opts.exclude || []), ...(TWIN[exerciseId] || [])]);
  const gentle = GENTLE_CATS.includes(ex.category);
  const flowForm = /^flow_/.test(ex.family);
  const sameKind = e => {
    if (e.mode === 'flow' || e.rung === false) return false;
    if (/^flow_/.test(e.family) && !flowForm) return false; // tradition forms only swap among themselves
    if (gentle) return GENTLE_CATS.includes(e.category) && (!PROGRESSION_FAMILIES.includes(e.family) || e.level <= 3); // gentle rotation drills count
    if (ex.category === 'conditioning') return e.category === 'conditioning' && Math.abs(e.level - ex.level) <= 1.5 && !PROGRESSION_FAMILIES.includes(e.family);
    return e.category === ex.category && !PROGRESSION_FAMILIES.includes(e.family);
  };
  const reg = regionsOf(ex), prim = new Set(ex.muscles?.primary || []), sec = new Set(ex.muscles?.secondary || []);
  const scored = [];
  for (const e of Object.values(info.byId)) {
    if (skip.has(e.id) || (TWIN[e.id] || []).some(t => skip.has(t)) || !sameKind(e) || !ok(e) || !momentOk(e)) continue;
    const er = regionsOf(e);
    const shareReg = [...er].some(r => reg.has(r));
    if (reg.size && !shareReg) continue; // the same body region
    const ep = e.muscles?.primary || [], es = e.muscles?.secondary || [];
    const score = 3 * ep.filter(m => prim.has(m)).length + ep.filter(m => sec.has(m)).length + es.filter(m => prim.has(m)).length
      + (shareReg ? 3 : 0) + (e.mode === ex.mode ? 3 : 0) + (e.category === ex.category ? 1 : 0) + (e.posture === ex.posture ? 1 : 0);
    if (score >= 6) scored.push({ e, score }); // at least the region and the kind of move (dynamic reps, or a held stretch)
  }
  // same score: the nearer level for cardio (intensity); otherwise a steady order
  scored.sort((a, b) => b.score - a.score || (b.e.mode === ex.mode) - (a.e.mode === ex.mode) || (ex.category === 'conditioning' ? Math.abs(a.e.level - ex.level) - Math.abs(b.e.level - ex.level) : 0) || a.e.id.localeCompare(b.e.id));
  return scored.slice(0, opts.n || 3).map(x => x.e);
}

const infoCache = new WeakMap();
/** Family ladders and lookups for a library, after the accuracy gate: hidden items are not rungs (per preview state). */
function libInfo(library) {
  if (!library) return { byId: {}, fam: {}, famMax: {} };
  const key = (traditionPreview() ? 'preview' : 'gated') + ':' + animationGateVersion();
  const cached = infoCache.get(library);
  if (cached && cached[key]) return cached[key];
  const byId = {}, fam = {}, famMax = {};
  for (const ex of library) {
    if (!contentVisible(ex) || ex.flowOnly || !exerciseAnimated(ex, ALL_BY_ID)) continue;
    byId[ex.id] = ex;
    if (ex.rung !== false) (fam[ex.family] ||= []).push(ex);   // variety items (the daṇḍ) are swaps, never rungs
  }
  for (const f of Object.keys(fam)) { fam[f].sort((a, b) => a.level - b.level); famMax[f] = fam[f][fam[f].length - 1].level; }
  const info = { byId, fam, famMax };
  infoCache.set(library, { ...(cached || {}), [key]: info });
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
  anti_rotation: ['bird_dog_row', 'half_kneeling_pallof_hold', 'plank_shoulder_tap', 'pallof_press'], // no band: steps down to the shoulder tap
  rotation: ['open_book', 'thread_the_needle', 'seated_trunk_rotation', 'bodyweight_woodchop'],
  stance: ['horse_stance', 'horse_stance', 'horse_stance', 'horse_stance'],
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
      if (!profile._noSexPrior && profile.sex !== 'male' && ['new', 'some'].includes(D.exp) && ['push_horizontal', 'pull_vertical'].includes(fam)) idx -= 1;
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
  if (ex && /^flow_/.test(ex.family) && ex.tempo?.secPerRep) return ex.tempo.secPerRep; // Tai Chi / Qigong single forms are slow
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
    if (!l || !l.date || l.sessionId === 'M' || l.sessionId === MORNING_TAISO_SESSION_ID || isShortMomentLog(l)) continue;
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
  // §6.1.4 (tradition variants such as the daṇḍ are variety, so they do not re-rate a whole ladder)
  if ((ctx.fam[ex.family] || []).some(e => !e.tradition && (e.stress || []).some(s => D.inj.includes(s)))) rir = Math.max(rir, 3);
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
  const flowDay = (D.primary === 'flexibility' || D.primary === 'balance') && d >= 3;
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
      S(['calves'], 'acc', 0), S(['core_lateral'], 'core', 0), S(['push_vertical', 'dip'], 'main', 0), S(['rotation'], 'core', 0, { minLevel: 4 })] };
    case 'fullB': return { kind: 'hard', name: 'Full body B', focus: ['push', 'pull', 'legs', 'core'], slots: [
      S(['push_vertical', 'dip'], 'main', 1), S(HPULL, 'main', 1), S(['hinge'], 'main', 1),
      S(coreB, 'core', 1), S(['squat'], 'main', 1, { tier: 2, variant: true, unilateral: true }),
      S(['pull_vertical'], 'main', 0), S(['push_horizontal'], 'main', 0), S(['calves'], 'acc', 0), S(['core_anterior'], 'core', 0), S(['anti_rotation'], 'core', 0)] };
    case 'fullC': return { kind: 'hard', name: 'Full body C', focus: ['push', 'pull', 'legs', 'core'], slots: [
      S(['push_horizontal'], 'main', 1, { variant: true }), S(['pull_vertical'], 'main', 1, { pv: true }), S(HPULL, 'main', 1, { hp2: true }),
      // world-movement §4.1: C's core slot is anti-rotation (falls back to the usual core when none is available)
      S(['squat'], 'main', 1, { alt: true, unilateral: true }), S(['anti_rotation', coreB[1], coreB[0], 'core_anterior'], 'core', 1), S(['hinge'], 'main', 1, { tier: 2 }),
      S(['push_vertical', 'dip'], 'main', 0), S(['calves'], 'acc', 0), S(['core_lateral'], 'core', 0), S([coreB[1]], 'core', 0)] };
    case 'upper': {
      const a = [S(['push_horizontal'], 'main', 1), S(HPULL, 'main', 1), S(['push_vertical', 'dip'], 'main', 1), S(['pull_vertical'], 'main', 1)];
      return { kind: 'hard', name: 'Upper', letter: true, focus: ['push', 'pull', 'core'], slots: [
        ...(variant % 2 ? [a[2], a[3], a[0], a[1]] : a), S(coreRot, 'core', 1),
        S(['pull_horizontal'], 'main', 0, { variant: true }), S(['dip', 'push_vertical'], 'main', 0), S(['pull_noequip'], 'main', 0), S(coreRot.slice(1), 'core', 0),
        S(['rotation'], 'core', 0, { minLevel: 4 })] };
    }
    case 'lower': return { kind: 'hard', name: 'Lower', letter: true, focus: ['legs', 'core'], slots: [
      S(['squat'], 'main', 1), S(['hinge'], 'main', 1), S(['squat'], 'main', 1, { variant: true, unilateral: true }), S(['calves'], 'acc', 1),
      S(['core_posterior', 'core_lateral'], 'core', 1), S(['hinge'], 'main', 0, { variant: true }), S(['core_anterior'], 'core', 0), S(['core_lateral'], 'core', 0),
      S(['anti_rotation'], 'core', 0), S(['stance'], 'acc', 0)] };
    case 'push': return { kind: 'hard', name: 'Push', focus: ['push', 'core'], slots: [
      S(['push_horizontal'], 'main', 1), S(['push_vertical', 'dip'], 'main', 1), S(['dip', 'push_vertical'], 'main', 1), S(HPULL, 'main', 1),
      S(coreRot, 'core', 1), S(['push_horizontal'], 'main', 0, { variant: true }), S(coreRot.slice(1), 'core', 0), S(['rotation'], 'core', 0, { minLevel: 4 })] };
    case 'pull': return { kind: 'hard', name: 'Pull', focus: ['pull', 'core'], slots: [
      S(['pull_vertical'], 'main', 1), S(['pull_horizontal', 'pull_noequip'], 'main', 1), S(['pull_noequip', 'pull_horizontal'], 'main', 1, { variant: true }),
      S(coreRot, 'core', 1), S(['pull_vertical'], 'main', 0, { variant: true }), S(coreRot.slice(1), 'core', 0), S(['anti_rotation'], 'core', 0)] };
    case 'legs': return { kind: 'hard', name: 'Legs', focus: ['legs', 'core'], slots: [
      S(['squat'], 'main', 1), S(['hinge'], 'main', 1), S(['squat'], 'main', 1, { variant: true, unilateral: true }), S(['calves'], 'acc', 1),
      S(coreRot, 'core', 1), S(['hinge'], 'main', 0, { variant: true }), S(coreRot.slice(1), 'core', 0), S(['anti_rotation'], 'core', 0), S(['stance'], 'acc', 0)] };
    case 'flow': return { kind: 'flow', name: 'Mobility flow', focus: ['mobility', 'core'], slots: [
      S(['core_posterior', 'core_anterior'], 'core', 1), S(['core_anterior', 'core_lateral'], 'core', 1), S(['core_lateral'], 'core', 0), S(['anti_rotation'], 'core', 0)] };
    case 'skillmob': return { kind: 'skillmob', name: 'Skill & mobility', focus: ['skill', 'mobility', 'core'], slots: [
      S(['core_anterior', 'core_lateral'], 'core', 1), S(['core_lateral', 'core_posterior'], 'core', 1)] };
  }
  throw new Error('unknown template ' + key);
}

// =============================================================================================
// Session builder
// =============================================================================================
function resolveSlot(slot, ctx, used) {
  // shuffle retries (v1.3) try the slot's families in another order
  const list = ctx.vary && slot.fams.length > 1 ? rotate(slot.fams, ctx.vary) : [...slot.fams];
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
    if (!used.has(cur.id) && !(slot.unilateral && !cur.unilateral && ctx.avail[f].some(e => e.unilateral && !used.has(e.id) && Math.abs(e.level - cur.level) <= 2))) return ctx.avoid ? shuffledPick(slot, f, cur, ctx, used) : cur;
    if (slot.variant || isFallback) {
      let c = ctx.avail[f].filter(e => !used.has(e.id) && e.level <= cur.level + 1);
      if (slot.unilateral && c.some(e => e.unilateral)) c = c.filter(e => e.unilateral);
      if (ctx.avoid && c.some(e => !ctx.avoid.has(e.id))) c = c.filter(e => !ctx.avoid.has(e.id)); // shuffle: something not seen yet
      if (c.length) return nearest(c, cur.level - (isFallback ? 1 : 0));
    }
  }
  return null;
}

/**
 * A shuffled Quick session (v1.3): a variation at the user's level or up to one and a half levels below (never above),
 * preferring moves the earlier shuffles did not use; each retry (ctx.vary) takes the next one.
 */
function shuffledPick(slot, f, cur, ctx, used) {
  let win = ctx.avail[f].filter(e => !used.has(e.id) && e.level <= cur.level && e.level >= cur.level - 1.5);
  if (slot.unilateral && win.some(e => e.unilateral)) win = win.filter(e => e.unilateral);
  win.sort((a, b) => b.level - a.level);
  const fresh = win.filter(e => !ctx.avoid.has(e.id));
  const list = fresh.length ? fresh : win;
  return list.length ? list[(ctx.vary || 0) % list.length] : cur;
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
    const roundRest = ctx.D.band === 'a65' ? 90 : ctx.roundRest || (ctx.D.M < 15 ? 60 : 75);
    rests = parts.map((_, i) => i === parts.length - 1 ? roundRest : CONFIG.circuitHopSec);
  }
  return {
    parts, rests, fmt, sets: 0,
    ess: parts.some(p => p.ess), tier: Math.min(...parts.map(p => p.tier ?? 3)), pri: Math.min(...parts.map(p => p.pri)), order: Math.min(...parts.map(p => p.order)),
    min: Math.max(...parts.map(p => p.min)), base: Math.max(...parts.map(p => p.base)), max: Math.min(...parts.map(p => p.max)),
    hardMax: Math.min(...parts.map(p => p.hardMax ?? 99)),
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
  const tryAdd = (u, slack = 0) => {
    if (chosen.includes(u)) return true;
    const floorSets = u.tier >= 2 && u.parts.some(p => p.role === 'main') && u.min >= 2 ? 2 : 1;
    for (let s = u.min; s >= floorSets; s--) {
      const c = unitSec(u, s, info);
      if (t + c <= budget + slack && (muscleOk(u, s) || u.ess)) { u.sets = s; chosen.push(u); t += c; apply(u, s); return true; }
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
  for (const u of units.filter(x => x.tier === 1)) {
    if (tryAdd(u) || u.parts.length < 2) continue;
    for (const p of u.parts) { const one = mkUnit([p], 'straight', ctx); one.tier = 1; tryAdd(one); } // pair too long: keep what fits
  }
  if (!chosen.length) { // very short: never lose the main lift (Quick: the first part of a pair that did not fit)
    let u = units.find(x => x.tier === 1 && x.parts.length === 1);
    if (!u && ctx.quick) { const first = units.find(x => x.tier === 1); if (first) { u = mkUnit([first.parts[0]], 'straight', ctx); u.tier = 1; } }
    if (u) tryAdd(u, 45);
  }
  if (ctx.twoMoves && ctx.D.M <= 5 && chosen.length === 1 && chosen[0].parts.length === 1) { // 5 min: a second move, even if a little over
    const have = new Set(chosen[0].parts.map(p => p.ex.id));
    const p2 = units.filter(x => x.tier <= 2).flatMap(x => x.parts).find(p => !have.has(p.ex.id));
    if (p2) { const u2 = mkUnit([p2], 'straight', ctx); u2.tier = 1; tryAdd(u2, 60); }
  }
  // §2.3 step 4: never keep a push slot without a horizontal pull
  const hasHP = () => chosen.some(u => u.parts.some(p => HPULL.includes(p.ex.family)));
  const hpUnit = units.find(u => !chosen.includes(u) && u.parts.some(p => HPULL.includes(p.ex.family)));
  const hasPush = () => chosen.some(u => u.parts.some(p => p.pattern === 'push'));
  const vOk = ctx.barOnly && chosen.some(u => u.parts.some(p => p.ex.family === 'pull_vertical'));
  if (!ctx.quick && hasPush() && !hasHP() && hpUnit && !vOk) {
    while (!tryAdd(hpUnit)) { // squeeze other lifts (not below 2 sets), then drop pushes as a last resort
      const big = [...chosen].sort((a, b) => b.sets - a.sets || b.pri - a.pri)[0];
      if (big && big.sets > 2) { const d = unitSec(big, big.sets, info) - unitSec(big, big.sets - 1, info); big.sets--; t -= d; apply(big, -1); continue; }
      const pu = [...chosen].reverse().find(u => u.parts.some(p => p.pattern === 'push'));
      if (!pu) break;
      drop(pu);
    }
  }
  // Primary compounds reach their goal sets before anything else is added (QA #2), then tier 2, then accessories.
  // Targeted quick sessions go breadth-first instead: 3-5 on-target exercises, then ~3 sets each.
  if (!sess.targeted) raise(u => u.base);
  for (const u of units.filter(x => x.tier === 2)) {
    if (tryAdd(u) || !sess.targeted || u.parts.length < 2) continue;
    for (const p of u.parts) { const one = mkUnit([p], 'straight', ctx); one.tier = 2; tryAdd(one); }
  }
  raise(u => u.base);
  for (const u of units.filter(x => x.tier === 3)) tryAdd(u);
  raise(u => u.max);
  for (const u of units.filter(x => x.tier >= 4)) tryAdd(u); // extra variations (quick sessions with time to fill)
  raise(u => u.max);
  return {
    units: chosen,
    get t() { return t; },
    topUp(newBudget, extra = 1, cap = 6) { budget = newBudget; raise(u => Math.min(cap, u.max + extra, u.hardMax)); return t; },
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

const WARMUP_REGION = {
  upper: ['arm_circles', 'scapular_push_up', 'thoracic_opener', 'wrist_prep'],
  lower: ['leg_swings', 'hip_circles', 'worlds_greatest_stretch'],
  full: ['arm_circles', 'leg_swings', 'hip_circles', 'scapular_push_up', 'worlds_greatest_stretch'],
};
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
  const hold = ctx.longHolds === 2 ? [45, 60] : ctx.D.band === 'a65' || ctx.longHolds ? [30, 45] : [20, 30]; // §1.1 flexibility (65+: 30-60 s, trimmed to 45 for time)
  return (ex, sets = 1) => flatItem(ex, { reps: [6, 10], hold, sets, rest: 10 });
}

const profile_eq = ctx => ctx.profile.equipment || [];
function buildSession(slot, ctx, weekIndex, sessIdx) {
  const D = ctx.D, info = ctx.info, M = D.M, T = M * 60;
  const key = slot.key || ctx.lightKeys[slot.lightIdx];
  const variant = slot.variant || 0;
  const tpl = slot.tpl || template(key, variant, weekIndex);
  const Q = slot.quick || null;
  const row = [...TIME_TABLE].reverse().find(r => M >= r[0]);
  const fmt = tpl.fmt || (tpl.kind === 'hard' ? row[5] : 'straight');
  const sess = { patternSeen: new Set(), muscle: {}, groups: 0, targeted: !!tpl.targeted,
    capOf: m => tpl.kind !== 'hard' ? CONFIG.maxSetsPerMuscleSession
      : Math.min(CONFIG.maxSetsPerMuscleSession, D.B.weeklyCap / Math.max(1, ctx.hitCount[MUSCLE_REGION[m] || 'core'] || 1)) };
  const used = new DrillSet();
  const region = tpl.region || regionOf(tpl.focus);

  // --- balance (§4): 40-54 one item on 2 sessions/week, 55-64 >= 2 min, 65+ >= 3 min in every session
  const bal = D.B.balance;
  let balanceSec = 0;
  if (Q && (Q.noBalance || Q.pool || Q.noAgeBalance)) { /* mobility-only, pool or muscle quick session */ }
  else if (bal === 'two' && tpl.kind === 'hard' && tpl.focus.includes('legs') && ctx.balanceSessions < 2) balanceSec = 90;
  else if (typeof bal === 'number') balanceSec = bal;
  // world-movement §4.6.1: a 5-10 min balance block (55+ or the balance goal) on chosen sessions replaces the in-main item there
  let tbal = Q ? (Q.balance || 0)
    : tpl.kind === 'hard' && M >= 15 && ctx.balanceBlockIdx && ctx.balanceBlockIdx.has(slot.hardIdx) ? clamp(Math.round(0.2 * T), M < 25 ? 180 : 300, 600) : 0;
  if (tbal > 0) balanceSec = 0;

  // --- block targets (seconds)
  let tw = Math.max(row[1], D.B.warm) * 60;
  tw = Math.min(tw, 0.5 * T);
  let tcool = Math.max(row[2], D.B.mobMin) * 60;
  if ((D.w.flexibility || 0) >= 0.2) tcool = Math.max(tcool, 300);
  if (D.primary === 'flexibility') tcool = Math.max(tcool, 0.3 * T);
  const skillEx = ctx.levelsEx.skill_balance;
  let tskill = 0;
  const skillGoal = (D.w.skill || 0) >= 0.2;
  if (skillEx && tpl.kind === 'hard' && skillGoal && !(Q && Q.skill) && (D.days <= 3 || slot.hardIdx < 3)) {
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
    const over = tw + tcool + tskill + tcond + tbal - 0.55 * T;
    if (over > 0) {
      const cut = Math.min(over, tcond); tcond -= cut;
      const cut2 = Math.min(tskill, over - cut); tskill -= cut2;
      tbal = Math.max(Math.min(tbal, M < 25 ? 180 : 300), tbal - (over - cut - cut2)); // CONTRACTS: never under 5 min (3 min under 25-min sessions)
    }
  }

  if (Q) {
    if (Q.warm != null) tw = Q.warm;
    if (Q.cool != null) tcool = Math.max(Q.coolIsMin ? tcool : 0, Q.cool);
    if (Q.cond != null) tcond = Q.cond;
    if (tpl.kind === 'hard' && !Q.keepBlocks) {
      const over = tw + tcool + tskill + tcond + tbal - 0.6 * T;
      if (over > 0) { const c = Math.min(over, tcond); tcond -= c; const c2 = Math.min(tskill, over - c); tskill -= c2; tbal = Math.max(Math.min(tbal, 120), tbal - (over - c - c2)); }
    }
  }
  const blocks = [];
  // --- warm-up
  const warm = { kind: 'warmup', title: 'Warm-up', items: [] };
  const wo = WARMUP_ORDER[region];
  const wk = (sessIdx + weekIndex) % (wo.length - 1);
  const rel = WARMUP_REGION[region];
  const rk = (sessIdx + weekIndex) % rel.length;
  const relRot = [...rel.slice(rk), ...rel.slice(0, rk)].filter(id => ctx.isAvail(ctx.byId[id]));
  // a drill for the session's region first (short warm-ups may hold only one item), then the pulse raiser
  // world-movement §4.1: one gentle rotation (levels 1-3) in the warm-up
  const rotW = ctx.avail.rotation.filter(e => e.level <= Math.max(1, Math.min(3, ctx.levelsEx.rotation?.level ?? 1)));
  const rotWarm = rotW.length ? [rotW[(sessIdx + weekIndex) % rotW.length].id] : [];
  const warmOrder = [...((Q && Q.warmFirst) || []), ...relRot.slice(0, 1), wo[0], ...rotWarm, ...relRot.slice(1), ...wo.slice(1 + wk), ...wo.slice(1, 1 + wk)];
  let warmCands = candidates([...new Set(warmOrder)], ctx, ['warmup']);
  if (Q && Q.warmAvoid) warmCands = warmCands.filter(e => !Q.warmAvoid.has(e.id)); // kept for the main block
  if (Q && Q.noBalance) warmCands = warmCands.filter(e => e.family !== 'mobility'); // keep the stretches for the flow itself
  const warmMk = ex => flatItem(ex, { reps: [8, 12], hold: ex.family === 'conditioning' ? [45, 60] : [20, 30] });
  if (!(Q && Q.noWarm)) fillFlat(warm, warmCands, tw, tw + 30, warmMk, 2, used, info);
  if (relRot.length && !(Q && Q.noWarm) && !warm.items.some(i => rel.includes(i.exerciseId))) { // short warm-ups still prepare the region
    const ex = ctx.byId[relRot[0]];
    if (!used.has(ex.id)) {
      const it = warmMk(ex); if (it.reps) it.reps = [5, 8];
      if (tw <= 120) { warm.items.forEach(i => used.delete(i.exerciseId)); warm.items = [it]; } else warm.items.unshift(it);
      used.add(ex.id);
    }
  }
  blocks.push(warm);

  // --- skill (first, while fresh)
  if (tskill > 0 && skillEx && !used.has(skillEx.id)) {
    const hold = skillEx.id === 'wall_handstand' ? [15, 45] : [5, 20];
    const it = flatItem(skillEx, { hold, sets: 3, rest: 90, rir: 3, notes: 'Quality attempts only: stop before form fades.' });
    while (it.sets < 6 && blockSec({ items: [{ ...it, sets: it.sets + 1 }] }, info) <= tskill) it.sets++;
    used.add(skillEx.id);
    blocks.push({ kind: 'skill', title: 'Skill practice', items: [it] });
  }
  if (Q && Q.skill) { // Quick skill goal: practice first while fresh (research §1.1: holds 5-30 s, 3-6 quality sets, RIR >= 3)
    const block = { kind: 'skill', title: 'Skill practice', items: [] };
    const target = Q.skill.sec;
    for (const ex of Q.skill.list) {
      if (block.items.length >= Q.skill.max) break;
      if (used.has(ex.id) || !ctx.isAvail(ex)) continue;
      const it = flatItem(ex, { reps: [3, 5], hold: SKILL_HOLD[ex.id] || [5, 20], sets: 2, rest: M <= 10 ? 60 : 90, rir: 3,
        notes: ['Quality attempts only: stop before form fades.', ...injNotes(ex, D)].join(' ') });
      if (block.items.length && blockSec({ items: [...block.items, it] }, info) > target) continue;
      block.items.push(it); used.add(ex.id);
    }
    for (let changed = true; changed;) {
      changed = false;
      for (const it of block.items) {
        if (it.sets >= 5) continue;
        it.sets++;
        if (blockSec(block, info) > target) it.sets--; else changed = true;
      }
    }
    if (block.items.length) blocks.push(block);
  }

  // --- main
  const parts = [];
  let order = 0;
  let curSlot = null;
  const addPart = (ex, role, pri, ess, tier) => {
    used.add(ex.id);
    const pt = makePart(ex, role, ctx, sess, pri, tier === 1, order++, tier);
    if (curSlot && curSlot.hold && pt.item.holdSec) pt.item.holdSec = curSlot.hold;
    if (curSlot && curSlot.reps && pt.item.reps) pt.item.reps = curSlot.reps;
    if (curSlot && curSlot.minSets) pt.min = Math.min(pt.min, curSlot.minSets);
    if (curSlot && curSlot.note) pt.item.notes = [pt.item.notes, curSlot.note].filter(Boolean).join(' ');
    if (curSlot && curSlot.maxSets) { pt.max = Math.min(pt.max, curSlot.maxSets); pt.base = Math.min(pt.base, pt.max); pt.min = Math.min(pt.min, pt.max); pt.hardMax = curSlot.maxSets; }
    if (tpl.targeted && pt.max >= 3) { pt.base = Math.max(pt.base, 3); pt.min = Math.min(pt.min, 2); } // targeted days: breadth at 2 sets, then ~3 each
    parts.push(pt);
  };
  const hasPV = ctx.avail.pull_vertical.length > 0;
  const tierOf = s => s.tier ?? (s.pv ? (hasPV ? 1 : 3) : s.hp2 ? (hasPV ? 2 : 1) : !s.ess ? 3 : s.role === 'main' ? 1 : s.role === 'core' ? 2 : 3);
  const slots = [...tpl.slots];
  if (balanceSec > 0) slots.splice(Math.min(slots.length, tpl.kind === 'hard' ? 4 : 1), 0, S([], 'balance', 1, { balance: true }));
  // A Quick balance session is about the balance block: it chooses first. In plans the main lifts choose first.
  let balBlk = null, flowBlk = null;
  const addBalance = () => { if (tbal > 0 && !balBlk) { balBlk = balanceBlock(ctx, tbal, used, info); if (balBlk) blocks.push(balBlk); } };
  if (Q) addBalance();
  for (const s of slots) {
    curSlot = s;
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
    if (s.minLevel && !((ctx.levelsEx[s.fams[0]]?.level ?? 0) >= s.minLevel)) continue; // e.g. loaded rotation only from level 4
    curSlot = s;
    const preferOk = s.prefer && !used.has(s.prefer.id) && ctx.isAvail(s.prefer) && !(ctx.avoid && ctx.avoid.has(s.prefer.id) && ctx.vary % 2 === 1);
    const ex = s.fixed ? (used.has(s.fixed.id) ? null : s.fixed) : preferOk ? s.prefer : resolveSlot(s, ctx, used);
    if (!ex) continue;
    addPart(ex, s.role, (PRI[ex.family] ?? 9) + (s.variant ? 10 : 0) + (s.ess ? 0 : 20) - (s.hp2 ? 5 : 0), s.ess, tierOf(s));
  }
  // --- balance and flow blocks: in plans, built after the main slots so they never take a main exercise
  addBalance();
  let poolBlk = null;
  if (Q && Q.pool && Q.pool.sec > 0) { poolBlk = poolBlock(ctx, Q.pool, used, info, M); if (poolBlk) blocks.push(poolBlk); }
  const tflow = Q ? (Q.flow || 0) : tpl.kind === 'flow' ? Math.round(0.4 * T) : 0;
  if (tflow > 0) {
    flowBlk = flowBlock(ctx, tflow, used, (Q && Q.flowOrder) || flowOrder(D), info);
    if (flowBlk) { blocks.push(flowBlk); tcool = Math.max(row[2] * 60, tcool - blockSec(flowBlk, info)); } // the flow replaces part of the stretching
  }
  const tWarm = blockSec(warm, info);
  const tSkill = blocks.filter(b => b.kind === 'skill').reduce((t, b) => t + blockSec(b, info), 0);
  const tExtra = [balBlk, flowBlk, poolBlk].filter(Boolean).reduce((t, b) => t + blockSec(b, info), 0);
  const mainBudget = Math.max(0, T - tWarm - tSkill - tExtra - tcond - tcool);
  const fm = fillMain(parts, fmt, ctx, sess, mainBudget);
  if (mainBudget - fm.t > 120) fm.topUp(mainBudget, tpl.pool ? 3 : 1, tpl.pool ? 8 : 6); // a pool session keeps its own moves rather than long stretching
  const main = { kind: 'main', title: tpl.kind === 'hard' ? 'Main' : 'Strength, core & balance', items: unitsToItems(fm.units, sess) };
  blocks.push(main);
  // core did not fit after the primary lifts: keep the session's core pattern as a short warm-up activation
  if (tpl.kind === 'hard' && !ctx.quick && !main.items.some(i => patternOf(i.family) === 'core')) {
    const cp = parts.find(p => p.role === 'core');
    if (cp) warm.items.push(flatItem(cp.ex, { reps: [8, 12], hold: [20, 30], sets: 1, notes: 'Core activation.' }));
  }
  // volume caps reached with time to spare: add an easy conditioning finisher rather than a very long stretch
  let finisher = false;
  const slack = mainBudget - fm.t;
  if (slack > 300 && condAvail && tpl.kind === 'hard' && !(Q && Q.pool)) { finisher = tcond === 0; tcond += Math.min(slack, 900); }

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
  const mobOrder = (Q && Q.mobOrder) || MOBILITY_ORDER[tpl.kind === 'hard' ? region : 'full'];
  const rotBy = Q && Q.mobOrder ? 0 : (weekIndex + sessIdx * 3) % mobOrder.length;
  const mobCands = candidates([...mobOrder.slice(rotBy), ...mobOrder.slice(0, rotBy)], ctx, ['mobility']);
  const mk = mobilityItem(ctx);
  const flexSets = (Q && Q.mobSets) || (tpl.kind !== 'hard' || (D.w.flexibility || 0) >= 0.2 ? 2 : 1);
  const others = () => blocks.reduce((t, b) => t + blockSec(b, info), 0);
  // world-movement §4.1: Baduanjin (short) as the cool-down when it fits and suits the goal; otherwise offered as an option
  const options = [];
  const bdj = ctx.byId.baduanjin_sequence;
  if (tpl.kind === 'hard' && bdj && !used.has(bdj.id) && ctx.isAvail(bdj)) {
    const it = flowItem(bdj, ctx, { variant: 'short' });
    // (a Quick session aimed at chosen areas keeps its targeted stretches; Baduanjin is then only offered)
    const calm = (['health', 'flexibility', 'balance'].includes(D.primary) || D.age >= 55) && !(Q && (Q.mobOrder || Q.pool));
    if (calm && blockSec({ items: [it] }, info) <= T - others() + 15) { cool.items.push(it); used.add(bdj.id); cool.title = 'Cool-down: Baduanjin'; }
    else options.push({ id: 'baduanjin_cooldown', replaces: 'cooldown', title: 'Baduanjin cool-down', block: { kind: 'cooldown', title: 'Baduanjin', items: [it] } });
  }
  // Morning Taiso as an optional warm-up (the UI offers the swap; the plan's timing uses the normal warm-up)
  const rt = ctx.byId.radio_taiso_1;
  if (rt && !used.has(rt.id) && ctx.isAvail(rt) && !(Q && Q.flow)) {
    options.unshift({ id: 'morning_taiso', replaces: 'warmup', title: rt.name, block: { kind: 'warmup', title: rt.name, items: [flowItem(rt, ctx)] } });
  }
  fillFlat(cool, mobCands, T - others(), T - others() + 15, ex => mk(ex, flexSets), flexSets === 2 ? 3 : 2, used, info);
  blocks.push(cool);

  // --- top-up when short (big sessions with a small library)
  let total = others() + blockSec(cool, info) - blockSec(cool, info);
  total = blocks.reduce((t, b) => t + blockSec(b, info), 0);
  if (total < (1 - 0.04) * T) {
    fm.topUp(fm.t + (T - total), Q ? 4 : 1, Q ? 8 : 6);
    main.items = unitsToItems(fm.units, { groups: 0 });
    total = blocks.reduce((t, b) => t + blockSec(b, info), 0);
    if (cond && total < 0.96 * T) {
      const u = cond._u;
      while (u.sets < 8 && total + unitSec(u, u.sets + 1, info) - unitSec(u, u.sets, info) <= T) { total += unitSec(u, u.sets + 1, info) - unitSec(u, u.sets, info); u.sets++; }
      cond.items.forEach(it => { it.sets = u.sets; });
    }
    if (total < 0.96 * T) {
      const base = total - blockSec(cool, info);
      fillFlat(cool, mobCands, T - base, T - base + 15, ex => mk(ex, 1), Q ? (M >= 60 ? 10 : 8) : 4, used, info);
    }
  }
  if (poolBlk) { // a small pool with nothing left to add: more rounds of its own moves rather than a short session
    total = blocks.reduce((t, b) => t + blockSec(b, info), 0);
    if (total < 0.96 * T) { const base = total - blockSec(poolBlk, info); fillFlat(poolBlk, [], T - base, T - base + 15, null, 6, used, info); }
  }
  if (cond) delete cond._u;
  if (ctx.balanceSessionsInc) { ctx.balanceSessions++; ctx.balanceSessionsInc = false; }

  const focus = [...tpl.focus];
  if (blocks.some(b => b.kind === 'skill' && b.items.length) && !focus.includes('skill')) focus.push('skill');
  if (cond && !focus.includes('conditioning')) focus.push('conditioning');
  if (main.items.some(i => i.notes.includes('Balance')) && !focus.includes('balance')) focus.push('balance');
  if (balBlk && !focus.includes('balance')) focus.push('balance');
  if (flowBlk && !focus.includes('flow')) focus.push('flow');
  return { id: '', name: '', focus, estMinutes: 0, blocks: blocks.filter(b => b.items.length), ...(options.length ? { options } : {}), _tpl: tpl, _key: key, _flow: !!flowBlk };
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
  const used = drillSet(s.blocks.flatMap(b => b.items.map(i => i.exerciseId)));
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
      const acc = pl.b.items.filter(i => i.family === 'calves' || patternOf(i.family) === 'core' || /Balance/.test(i.notes || '')).sort((a, b) => b.sets - a.sets)[0];
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
function resolveLevels(ctx, profile, levels, library) {
  const init = initialLevels(profile, library);
  ctx.levelsEx = {};
  for (const fam of LEVEL_FAMILIES) {
    const avail = ctx.avail[fam];
    if (!avail.length) continue;
    const given = levels && typeof levels[fam] === 'string' ? ctx.byId[levels[fam]] : null;
    if (given && given.family === fam) {
      ctx.levelsEx[fam] = avail.includes(given) ? given : (stepDown(ctx.fam[fam], ctx.fam[fam].indexOf(given), ctx.isAvail) || nearest(avail, given.level));
    } else if (init[fam]) ctx.levelsEx[fam] = ctx.byId[init[fam]];
  }
  ctx.flowStages = (levels && levels.flowStages) || {}; // { [flowId]: { stage, easy } } (§4.4)
}

export function generateWeek(profile, levels, library, requestedWeek = 0, opts = {}) {
  const weekIndex = Math.max(0, requestedWeek | 0); // early starts (before startDate) use plan week 1
  const ctx = buildCtx(profile, library);
  const D = ctx.D;
  resolveLevels(ctx, profile, levels, library);
  ctx.phase = opts._forceBuild ? { phase: 'build', blockWeek: 3, reentry: null, calibration: false, cycleLen: 5, blockStart: 0 } : phaseInfo(profile, weekIndex, opts);
  const eqp = profile.equipment || [];
  ctx.barOnly = eqp.includes('pullup_bar') && !eqp.includes('rings') && !eqp.includes('table') && ctx.avail.pull_vertical.length > 0; // doorway bar: rows may be impractical
  ctx.balanceSessions = 0;

  const split = planSplit(D, weekIndex);
  ctx.lightKeys = split.light;
  // world-movement §4.6.1: balance blocks on >= 2 hard sessions a week (3 when balance is the main goal), spread out
  const nBal = Math.min(split.hard.length, D.age >= 55 || D.goals.includes('balance') ? (D.primary === 'balance' ? 3 : 2) : 0);
  ctx.balanceBlockIdx = new Set(Array.from({ length: nBal }, (_, k) => Math.round(k * split.hard.length / nBal)));
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
    s.name = t.kind === 'hard' && !s._key.startsWith('full') ? `${t.name}${letter} — ${GOAL_LABEL[D.primary]}` : t.kind === 'flow' && s._flow ? 'Flow & mobility' : t.name;
    if (t.kind !== 'hard') s.light = true; // light days: flows, mobility, skill (world-movement §4.1)
    delete s._tpl; delete s._key; delete s._flow;
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
  if (log.sessionId === 'Q' && log.request) { // quick session: rebuild it from the stored request for exact ranges
    const qk = 'Q' + JSON.stringify(log.request);
    if (!cache.has(qk)) cache.set(qk, { sessions: [generateQuickSession(log.request, profile, levels, library)] });
    const hit = cache.get(qk).sessions[0].blocks.flatMap(b => b.items).find(it => it.exerciseId === exerciseId);
    if (hit) return hit;
  }
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
  profile = profile || QUICK_DEFAULT;
  levels = levels || initialLevels(profile, library);
  // recovery moments are deliberately below the user's level: they never move a ladder (moments.md §3.5)
  if (sessionLog && sessionLog.sessionId === 'Q' && RECOVERY_MOMENTS.includes(momentId(sessionLog.request?.moment))) return { levels: { ...levels }, changes: [] };
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
  // §4.4 flows: two 'easy' ratings in a row unlock the next stage (stance, support, tempo, length); 'hard' keeps it.
  const flowStep = (fex, item) => {
    const stages = fex.progression?.stages;
    if (!stages?.length) return;
    const fs = out.flowStages = { ...(out.flowStages || {}) };
    const max = flowMaxStage(fex, ctx.D);
    const cur = fs[fex.id] || { stage: 0, easy: 0 };
    const from = clamp(Number(cur.stage) || 0, 0, max);
    let next = { stage: from, easy: Number(cur.easy) || 0 };
    let reason = null;
    if (item.pain != null && Number(item.pain) > 3) {
      next = { stage: Math.max(0, from - 1), easy: 0 };
      if (next.stage !== from) reason = `You reported pain of ${item.pain}/10, so ${name(fex)} steps back to ${flowStageText(stages[next.stage])}.`;
    } else if (lightWeek) return;
    else if (item.rating === 'easy') {
      next.easy = Math.min(2, next.easy + 1);
      if (next.easy >= 2 && from < max) { next = { stage: from + 1, easy: 0 }; reason = `Rated easy twice, so ${name(fex)} moves on to ${flowStageText(stages[from + 1], stages[from])}.`; }
    } else next.easy = 0;
    fs[fex.id] = next;
    if (reason) changes.push({ family: fex.family, from: fex.id, to: fex.id, flow: true, fromStage: from, toStage: next.stage, up: next.stage > from, reason });
  };
  for (const item of sessionLog.items || []) {
    const fex = ctx.byId[item.exerciseId];
    if (fex && fex.mode === 'flow') { flowStep(fex, item); continue; }
    const fam = item.family || ctx.byId[item.exerciseId]?.family;
    if (!PROGRESSION_FAMILIES.includes(fam) || levels[fam] !== item.exerciseId || out[fam] !== item.exerciseId) continue;
    const cur = ctx.byId[item.exerciseId];
    if (!cur) continue;
    const fb = hold => patternOf(fam) === 'core' ? (hold ? [20, 45] : [8, 15]) : (hold ? g.hold : g.reps);
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
    const calibration = sessionLog.weekIndex != null && logWeek(sessionLog) <= 1; // Q logs without a plan week are not calibration
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
  const counted = (logs || []).filter(l => l && l.date && l.sessionId !== 'M');
  const inRange = n => n <= todayN && n >= createdN;
  const logDays = new Set(counted.map(l => dayNum(l.date)).filter(inRange));
  // Morning Taiso keeps the day streak alive but does not count toward the weekly session target (founder decision, v1.2)
  // Moments of 10 min or less follow the same rule (founder decision, moments v1.2)
  const trainDays = new Set(counted.filter(l => l.sessionId !== MORNING_TAISO_SESSION_ID && !isShortMomentLog(l)).map(l => dayNum(l.date)).filter(inRange));
  const startD = opts.startDate || profile.startDate;
  const startN = startD ? toDayN(startD) : -Infinity;
  const early = [...trainDays].filter(n => n < startN).length;
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
    for (let k = mon; k < mon + 7 && k <= todayN; k++) if (trainDays.has(k) && k >= startN) c++;
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
  const balS = week.sessions.filter(s => s.blocks.some(b => b.kind === 'balance'));
  if (balS.length) {
    const balIt = balS.flatMap(s => s.blocks.filter(b => b.kind === 'balance').flatMap(b => b.items));
    const tai = balIt.some(i => i.flow), rooster = balIt.some(i => i.exerciseId === 'taichi_golden_rooster');   // name the one-leg hold only when planned
    out.push(`A balance block in ${balS.length} session${balS.length > 1 ? 's' : ''} (${tai ? `Tai Chi forms${rooster ? ' and a one-leg hold' : ''}` : 'single-leg and trunk-control work'}), with a wall or chair nearby.`);
  }

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

// =============================================================================================
// Quick workout (v1.1)
// =============================================================================================
const QUICK_DEFAULT = { goals: ['health'], primaryGoal: 'health', daysPerWeek: 3, minutesPerSession: 30, preferredDays: [1, 3, 5], age: 30, sex: 'unspecified',
  experience: 'some', baseline: {}, injuries: [], equipment: ['wall'], space: 'medium', lowImpact: false, _noSexPrior: true };
const FOCUS_LABEL = { full: 'Full body', upper: 'Upper body', lower: 'Lower body', core: 'Core', push: 'Push', pull: 'Pull', legs: 'Legs', mobility: 'Mobility flow',
  flow: 'Flow', balance: 'Balance', rotation: 'Rotation' };
const ROTATION_MOBILITY = ['open_book', 'thread_the_needle', 'seated_trunk_rotation', 'thoracic_opener', 'worlds_greatest_stretch', 'cat_cow', 'childs_pose', 'hip_flexor_stretch',
  'standing_hamstring_stretch', 'doorway_chest_stretch'];
const MUSCLE_LABEL = { front_delts: 'front shoulders', side_delts: 'side shoulders', rear_delts: 'rear shoulders', upper_back: 'upper back', lower_back: 'lower back', hip_flexors: 'hip flexors', abs: 'abs' };
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function muscleScore(ex, muscles) {
  let prim = 0, sec = 0;
  for (const m of muscles) { if ((ex.muscles?.primary || []).includes(m)) prim++; else if ((ex.muscles?.secondary || []).includes(m)) sec++; }
  return { prim, sec, score: 2 * prim + sec };
}

function quickTemplate(focus, muscles, ctx, seed, minutes) {
  const T = (fams, role, tier, extra = {}) => S(fams, role, tier <= 2, { tier, ...extra });
  const core = [CORE[seed % 3], CORE[(seed + 1) % 3], CORE[(seed + 2) % 3]];
  const hard = (f, slots) => ({ kind: 'hard', name: '', focus: f, slots });
  switch (focus) {
    case 'mobility': return { kind: 'flow', name: '', focus: ['mobility'], slots: [] };
    case 'flow': return { kind: 'flow', name: '', focus: ['flow', 'mobility'], slots: [] };
    case 'rotation': return { ...hard(['core'], [T(['anti_rotation'], 'core', 1), T(['rotation'], 'core', 1), T(['core_lateral'], 'core', 2),
      T(['anti_rotation'], 'core', 3, { variant: true }), T(['rotation'], 'core', 3, { variant: true }), T(['core_posterior'], 'core', 3)]), region: 'full' };
    case 'balance': return { ...hard(['legs', 'core'], [T(['squat'], 'main', 1, { variant: true, unilateral: true }), T(['hinge'], 'main', 1, { variant: true, unilateral: true }),
      T(['anti_rotation'], 'core', 2), T(['calves'], 'acc', 2), T(['core_lateral'], 'core', 3)]), region: 'lower' };
    case 'core': return hard(['core'], [T([core[0]], 'core', 1), T([core[1]], 'core', 1), T([core[2]], 'core', 2),
      T([core[0]], 'core', 3, { variant: true }), T([core[1]], 'core', 3, { variant: true }), T([core[2]], 'core', 3, { variant: true })]);
    case 'upper': return { ...hard(['push', 'pull'], [T(['push_horizontal'], 'main', 1), T(HPULL, 'main', 1), T(['push_vertical', 'dip'], 'main', 2),
      T(['pull_vertical'], 'main', 2), T(['pull_horizontal'], 'main', 3, { variant: true }), T(['push_horizontal'], 'main', 3, { variant: true })]), region: 'upper' };
    case 'lower': case 'legs': return { ...hard(['legs'], [T(['squat'], 'main', 1), T(['hinge'], 'main', 1), T(['squat'], 'main', 2, { variant: true, unilateral: true }),
      T(['calves'], 'acc', 2), T(['hinge'], 'main', 3, { variant: true })]), region: 'lower' };
    case 'push': return { ...hard(['push'], [T(['push_horizontal'], 'main', 1), T(['push_vertical', 'dip'], 'main', 1), T(['dip', 'push_vertical'], 'main', 2),
      T(['push_horizontal'], 'main', 2, { variant: true }), ...(minutes >= 30 ? [T(HPULL, 'main', 3, { maxSets: 2 })] : [])]), region: 'upper' };
    case 'pull': return { ...hard(['pull'], [T(['pull_vertical'], 'main', 1), T(HPULL, 'main', 1), T(['pull_noequip', 'pull_horizontal'], 'main', 2, { variant: true }),
      T(['pull_vertical'], 'main', 2, { variant: true })]), region: 'upper' };
    case 'muscles': {
      // A real targeted day: several variations per family around the user's level (level ±1), ranked by
      // primary match, then secondary; 2-6 exercises by length, at most 3 per family.
      const N = minutes < 15 ? 2 : minutes < 25 ? 3 : minutes < 35 ? 4 : minutes < 50 ? 5 : 6;
      let pool = [];
      const far = [];
      for (const fam of [...PUSH, ...PULL, ...LEGS, ...CORE]) {
        const av = ctx.avail[fam];
        if (!av.length) continue;
        const cur = ctx.levelsEx[fam] || av[0];
        const hits = av.map(ex => ({ fam, ex, ...muscleScore(ex, muscles), d: Math.abs(ex.level - cur.level) })).filter(c => c.prim > 0);
        const win = hits.filter(c => c.d <= 1);
        pool.push(...(win.length ? win : hits.sort((a, b) => a.d - b.d).slice(0, 1)));
        far.push(...hits.filter(c => !pool.includes(c)));
      }
      if (pool.length < N) pool.push(...far.sort((a, b) => a.d - b.d || a.ex.level - b.ex.level).slice(0, N - pool.length)); // few options: widen the level window
      const nonCore = c => CORE.includes(c.fam) && !muscles.every(m => MUSCLE_REGION[m] === 'core') ? 0 : 1;
      const famRel = {}; // how many picked muscles a family trains as prime mover (hinge > squat for glutes + hamstrings)
      for (const c of [...pool, ...far]) famRel[c.fam] = new Set([...(famRel[c.fam] || []), ...muscles.filter(m => (c.ex.muscles?.primary || []).includes(m))]);
      const rel = c => (famRel[c.fam] || new Set()).size;
      const key = c => minutes <= 10 ? [nonCore(c), c.ex.unilateral ? 0 : 1, c.prim, rel(c), c.sec, -c.d, -(PRI[c.fam] ?? 9)]
        : [c.prim, nonCore(c), rel(c), c.sec, -c.d, -(PRI[c.fam] ?? 9)];
      const cmp = (a, b) => { const ka = key(a), kb = key(b); for (let q = 0; q < ka.length; q++) if (ka[q] !== kb[q]) return kb[q] - ka[q]; return 0; };
      pool = pool.sort(cmp);
      if (ctx.avoid) pool = [...pool.filter(c => !ctx.avoid.has(c.ex.id)), ...pool.filter(c => ctx.avoid.has(c.ex.id))]; // a shuffle (v1.3): unused variations first
      if (!pool.length) return null;
      const chosen = [];
      const perFam = {};
      const take = c => { chosen.push(c); perFam[c.fam] = (perFam[c.fam] || 0) + 1; };
      const left = new Set(muscles);
      const coverList = [...pool, ...far.sort((a, b) => a.d - b.d)]; // a muscle may need a move outside the level window
      for (;;) { // first make sure every picked muscle has a primary mover
        let pick = null, gain = 0;
        for (const c of coverList) {
          if (minutes <= 10 && c.ex.unilateral && chosen.length) continue;
          if (chosen.includes(c)) continue;
          const g = (c.ex.muscles?.primary || []).filter(m => left.has(m)).length;
          if (g > gain) { pick = c; gain = g; }
        }
        if (!pick) break;
        take(pick);
        for (const m of pick.ex.muscles?.primary || []) left.delete(m);
      }
      for (const c of pool) { // then the best remaining variations, spread across families
        if (chosen.length >= N) break;
        if (!chosen.includes(c) && (perFam[c.fam] || 0) < 3 && !chosen.some(x => x.fam === c.fam && x.ex.unilateral === c.ex.unilateral && x.ex.level === c.ex.level)) take(c);
      }
      const role = f => CORE.includes(f) ? 'core' : f === 'calves' ? 'acc' : 'main';
      const slots = chosen.map((c, i) => T([c.fam], role(c.fam), i < 3 ? 1 : 2, { fixed: c.ex, target: true }));
      for (const c of pool.filter(c => !chosen.includes(c)).slice(0, 6)) slots.push(T([c.fam], role(c.fam), 4, { fixed: c.ex, target: true }));
      // balanced antagonist only for broad picks with time to spare
      const regions = muscles.map(m => MUSCLE_REGION[m]);
      if (muscles.length >= 3 && minutes >= 30) {
        const push = regions.filter(r => r === 'push').length, pull = regions.filter(r => r === 'pull').length;
        if (push > pull) slots.push(T(HPULL, 'main', 3, { maxSets: 2 }));
        else if (pull > push) slots.push(T(['push_horizontal'], 'main', 3, { maxSets: 2 }));
      }
      const focusTags = [...new Set(chosen.map(c => patternOf(c.fam)))].filter(x => ['push', 'pull', 'legs', 'core'].includes(x));
      const cnt = r => regions.filter(x => x === r).length;
      const region = cnt('legs') >= Math.max(cnt('push') + cnt('pull'), 1) ? 'lower' : cnt('push') + cnt('pull') > 0 ? 'upper' : 'full';
      return { ...hard(focusTags.length ? focusTags : ['core'], slots), targeted: true, region };
    }
    default: { // a shuffle (v1.3) may lead with the hinge instead of the squat
      const [legA, legB] = ctx.avoid && seed % 2 ? ['hinge', 'squat'] : ['squat', 'hinge'];
      return hard(['push', 'pull', 'legs', 'core'], [T(['push_horizontal'], 'main', 1), T(HPULL, 'main', 1), T([legA], 'main', 1),
      T([legB], 'main', 2), T([core[0]], 'core', 2), T(['pull_vertical'], 'main', 3), T(['push_vertical', 'dip'], 'main', 3), T(['calves'], 'acc', 3), T([core[1]], 'core', 3)]);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Goal-led Quick sessions ("Train for: a goal"). The goal chooses the main content, not only the dose:
// balance = single-leg and balance work, skill = practice first, flexibility = mobility-led, endurance = a circuit.
// strength, muscle and health keep the full-body patterns (research §1.1: the goal sets reps, sets and rest).
// ---------------------------------------------------------------------------------------------
const GOAL_QUICK_LABEL = { balance: 'Balance', skill: 'Skill practice', flexibility: 'Flexibility', endurance: 'Endurance circuit' };
// goals with their own content; strength keeps the default full-body template (muscle and health keep "Full body · X" names)
const GOAL_LED = [...Object.keys(GOAL_QUICK_LABEL), 'muscle', 'health'];
const TEMPO_NOTE = 'Lower for 3 s, full range.';
const SKILL_HOLD = { wall_handstand: [15, 45], freestanding_handstand: [5, 20], crow_pose: [5, 20], l_sit: [5, 15], hollow_body_hold: [15, 30], taichi_golden_rooster: [5, 15] };
// when no handbalance is possible (wrist, shoulder, neck ...): other skill holds, then a one-leg balance skill
const SKILL_ALT = ['l_sit', 'hollow_body_hold', 'taichi_golden_rooster'];
// flexibility (research §1.1 flexibility, world-movement §4.2): dynamic mobility and gentle rotation (levels 1-3) first, then held stretches
const FLEX_DYNAMIC = ['cat_cow', 'open_book', 'worlds_greatest_stretch', 'thread_the_needle', 'thoracic_opener', 'seated_trunk_rotation'];
const FLEX_HOLDS = ['hip_flexor_stretch', 'standing_hamstring_stretch', 'doorway_chest_stretch', 'pigeon_stretch', 'childs_pose', 'deep_squat_hold', 'cobra_stretch',
  'calf_stretch', 'pancake_stretch', 'shoulder_dislocate'];
const rotate = (arr, k) => arr.length ? [...arr.slice(k % arr.length), ...arr.slice(0, k % arr.length)] : arr;
const SLOW_NOTE = 'Slow and controlled: 3 s down, a brief pause, then up.';

function goalTemplate(goal, ctx, seed, minutes, quick) {
  const T = (fams, role, tier, extra = {}) => S(fams, role, tier <= 2, { tier, ...extra });
  const pick = ids => ids.map(id => ctx.byId[id]).find(e => e && ctx.isAvail(e)) || null;
  const secs = minutes * 60;
  // the next rung up the user's ladder (one level at most; none available = stay at the current level), for hypertrophy: harder or longer-range variants
  const up = fams => {
    for (const f of fams) {
      const av = ctx.avail[f];
      if (!av.length) continue;
      const lvl = ctx.levelsEx[f]?.level ?? av[0].level;
      const c = av.filter(e => e.level > lvl && e.level <= lvl + 1); // one rung only in a one-off session: two risks failure and poor form
      if (c.length) return nearest(c, lvl + 1);
    }
    return null;
  };
  switch (goal) {
    case 'muscle': {
      const near = ids => { const e = pick(ids); return e && e.level <= (ctx.levelsEx[e.family]?.level ?? e.level) + 1 ? e : null; }; // research §1.1 muscle: 6-20 reps near failure, 3-4 sets; harder variants, slow eccentrics, accessories, supersets
      const tempo = { note: TEMPO_NOTE, reps: [6, 15] }; // 6-15: the efficient middle of the 6-20 range, so a short session fits more sets
      const legTier = ctx.avoid && seed % 2 ? [2, 1] : [1, 2]; // a shuffle (v1.3) may lead with the hinge
      quick.noAgeBalance = true; // a one-off hypertrophy session: the 40+ balance item belongs to the plan's other sessions
      // breadth first (2 sets each), then up to 3-4 sets: several exercises per muscle suit hypertrophy better than one long lift
      return { kind: 'hard', name: '', focus: ['push', 'pull', 'legs', 'core'], targeted: true, ...(minutes >= 15 ? { fmt: 'superset' } : {}), slots: [
        T(['push_horizontal'], 'main', 1, { prefer: up(['push_horizontal']), ...tempo }),
        T(['pull_vertical', ...HPULL], 'main', 1, { prefer: up(['pull_vertical']) || up(HPULL), ...tempo }),
        T(['squat'], 'main', legTier[0], { prefer: near(['bulgarian_split_squat']) || up(['squat']), ...tempo }),
        T(['hinge'], 'main', legTier[1], { prefer: near(['hip_thrust']) || up(['hinge']), reps: [6, 15] }),
        T(['dip', 'push_vertical'], 'main', 2, { prefer: near(['ring_dip']) || near(['bar_dip']) || near(['bench_dip']) || up(['push_vertical']), ...tempo }),
        T(HPULL, 'main', 2, { prefer: up(HPULL), ...tempo }),
        T(['calves'], 'acc', 3, { prefer: up(['calves']) }), T(['core_anterior'], 'core', 3, { prefer: up(['core_anterior']) })] };
    }
    case 'health': { // research §1.1 / §1.3 health: a bit of everything at an easy-to-moderate dose
      const odd = seed % 2;
      const drills = avoidLast(ctx, rotate(['open_book', 'thread_the_needle', 'seated_trunk_rotation', 'worlds_greatest_stretch', 'cat_cow'].map(id => ctx.byId[id])
        .filter(e => e && ctx.isAvail(e) && (e.family !== 'rotation' || e.level <= 3)), seed));
      const cav = ctx.avail.conditioning, clvl = ctx.levelsEx.conditioning?.level ?? 2;
      let cardio = nearest(cav.filter(e => e.level <= clvl), clvl) || nearest(cav, 1);
      if (ctx.avoid) { // shuffle: another easy cardio piece at or below the user's level
        const easy = avoidLast(ctx, cav.filter(e => e.level <= Math.max(clvl, cav[0]?.level ?? 1)).sort((a, b) => b.level - a.level));
        if (easy.length) cardio = easy[(ctx.vary || 0) % Math.min(2, easy.length)];
      }
      quick.warmAvoid = new Set([drills[0]?.id, cardio?.id].filter(Boolean));
      if (minutes < 30) quick.cond = 0;
      // the hinge leads (strength leads with the squat), so the two goals share at most the push or the pull on any date
      const pp = odd ? ['push_horizontal', ...HPULL] : [...HPULL, 'push_horizontal'], lower = [['hinge'], ['squat']];
      const steady = ctx.avail.anti_rotation.length || ctx.avail.core_lateral.length;
      const two = { maxSets: 2, minSets: 1 }, three = { maxSets: 3, minSets: 1 }; // research §1.1 health: 1-3 sets
      // breadth first (one of each, then sets): lower body, push or pull, a balance / anti-rotation item, a mobility drill, easy cardio
      return { kind: 'hard', name: '', focus: ['push', 'pull', 'legs', 'core'], targeted: true, slots: [
        T(lower[0], 'main', 1, three), T(pp, 'main', 1, three),
        steady ? T(['anti_rotation', 'core_lateral'], 'core', 1, two) : T(['hinge', 'squat'], 'main', 1, { variant: true, unilateral: true, ...two }),
        ...(drills[0] ? [T([drills[0].family], 'core', 1, { fixed: drills[0], ...two })] : []),
        ...(cardio ? [T(['conditioning'], 'main', 1, { fixed: cardio, hold: [30, 45], reps: [20, 30], ...two })] : []),
        T([...pp.slice(HPULL.includes(pp[0]) ? HPULL.length : 1)], 'main', 3, two), T(lower[1], 'main', 3, two), T(['calves'], 'acc', 3, two)] };
    }
    case 'balance': { // world-movement §4.6.1: a balance block (Tai Chi and the one-leg hold when visible), then single-leg strength, slowly
      quick.balance = minutes <= 5 ? 150 : Math.max(150, Math.round(0.35 * secs)); // at 5 min the block is the session: single sets of two holds
      if (minutes > 10) quick.cool = Math.round(Math.min(0.15 * secs, 300));
      if (minutes >= 20) quick.warm = Math.round(Math.min(0.15 * secs, 300));
      quick.cond = 0;
      quick.keepBlocks = true; // the balance block is the point of the session: never trimmed for main work
      const slow = { note: SLOW_NOTE };
      return { kind: 'hard', name: '', focus: ['legs', 'core'], region: 'lower', slots: [
        T(['squat'], 'main', 1, { variant: true, unilateral: true, ...slow }),
        T(['hinge'], 'main', 1, { variant: true, unilateral: true, prefer: pick(['single_leg_rdl']), ...slow }),
        T(['calves'], 'acc', 2, { variant: true, unilateral: true, prefer: pick(['single_leg_calf_raise']), ...slow }),
        T(['anti_rotation', 'core_posterior'], 'core', 2), T(['core_lateral'], 'core', 3)] };
    }
    case 'skill': { // research §1.1 skill: practice at the start while fresh, 5-10 min, then short supporting strength
      const av = ctx.avail.skill_balance;
      const cur = ctx.levelsEx.skill_balance && ctx.isAvail(ctx.levelsEx.skill_balance) ? ctx.levelsEx.skill_balance : nearest(av, ctx.levelsEx.skill_balance?.level ?? 1);
      const near = cur ? av.filter(e => e !== cur && Math.abs(e.level - cur.level) <= 1).sort((a, b) => b.level - a.level) : [];
      const list = [cur, ...near, ...SKILL_ALT.map(id => ctx.byId[id])].filter((e, i, a) => e && ctx.isAvail(e) && a.indexOf(e) === i);
      quick.skill = { list, max: minutes <= 5 ? 1 : minutes < 30 ? 2 : 3, sec: minutes <= 5 ? 135 : minutes <= 10 ? 240 : clamp(Math.round(0.35 * secs), 300, 600) };
      quick.warmFirst = ['wrist_prep']; // hands and wrists carry the handbalances
      quick.cond = 0;
      return { kind: 'hard', name: '', focus: ['skill', 'push', 'core'], region: 'upper', slots: [
        T(['push_vertical', 'dip'], 'main', 1, { maxSets: 3, prefer: ctx.levelsEx.push_vertical || ctx.avail.push_vertical[0] || null }), T(['core_anterior'], 'core', 1, { maxSets: 3 }),
        T(HPULL, 'main', 2, { maxSets: 3 }), T(['pull_vertical'], 'main', 3, { maxSets: 3 }), T(['core_posterior'], 'core', 3, { maxSets: 3 })] };
    }
    case 'flexibility': { // mobility-led: rotation openers and dynamic mobility, a flow when visible (15+ min), then held stretches
      quick.noBalance = true;
      quick.cond = 0;
      if (minutes >= 15) { quick.flow = Math.round(0.4 * secs); quick.flowOrder = ['baduanjin_sequence', 'taichi_short_flow']; }
      const nDyn = minutes <= 5 ? 1 : 2;
      if (minutes <= 5) quick.mobSets = 1; // 5 min: more areas, one hold each
      const dyn = avoidLast(ctx, rotate(FLEX_DYNAMIC.filter(id => ctx.isAvail(ctx.byId[id])), seed)), holds = avoidLast(ctx, rotate(FLEX_HOLDS.filter(id => ctx.isAvail(ctx.byId[id])), seed >> 3));
      quick.mobOrder = nDyn === 1 ? [dyn[0], ...holds, ...dyn.slice(1)].filter(Boolean) // a dynamic opener, then holds with the other drills between them
        : [dyn[0], holds[0], dyn[1], ...holds.slice(1), ...dyn.slice(2)].filter(Boolean);
      return { kind: 'flow', name: '', focus: ['mobility'], slots: [] };
    }
    case 'endurance': { // research §1.1 endurance: circuits, 15-30 reps or 30-45 s efforts, short rests
      const av = ctx.avail.conditioning;
      const lvl = ctx.levelsEx.conditioning?.level ?? 2;
      const close = [...av].sort((a, b) => Math.abs(a.level - lvl) - Math.abs(b.level - lvl) || a.level - b.level).slice(0, 5);
      const n = minutes <= 5 ? 2 : minutes <= 10 ? 3 : 4;
      const chosen = avoidLast(ctx, rotate(close, seed)).slice(0, n).sort((a, b) => a.level - b.level);
      quick.warmAvoid = new Set(chosen.map(e => e.id));
      quick.cond = 0;
      if (minutes <= 5) quick.cool = 45;
      ctx.roundRest = 45;
      const hold = [30, 45];
      return { kind: 'hard', name: '', focus: ['conditioning', 'core'], fmt: 'circuit', slots: [
        ...chosen.map(ex => T(['conditioning'], 'main', 1, { fixed: ex, hold })),
        T(['core_anterior'], 'core', 2, { hold }), T(['push_horizontal'], 'main', 2, { variant: true }),
        T(['squat'], 'main', 3, { alt: true }), T(['anti_rotation', 'core_lateral'], 'core', 3, { hold })] };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Pool sessions: a workout of a chosen length from one Library filter (a tradition, a category and/or a family).
// The request carries the filter; later modes (e.g. `moment`) plug in the same way: request field -> pool + filler.
// ---------------------------------------------------------------------------------------------
const CATEGORY_LABEL = { strength: 'Strength', core: 'Core', skill: 'Skill', conditioning: 'Cardio', mobility: 'Mobility', warmup: 'Warm-up', flow: 'Flow',
  balance: 'Balance', breath: 'Breath' };
const LOAD_CATS = ['strength', 'core', 'conditioning'];
// What fills the time when a pool is small: `slots` = load families (from the user's levels), `ids` = gentle items; `what` names it in the note.
const POOL_FILL = {
  'tradition:horse_stance': { slots: ['squat', 'hinge', 'calves'], ids: ['hip_flexor_stretch', 'deep_squat_hold', 'hip_circles'], note: 'Horse stance is a single hold, so we’ve added leg and hip work around it.' },
  'tradition:pehlwani': { slots: ['squat', 'push_horizontal', 'core_anterior', 'hinge'], note: 'Pehlwani has two moves here (daṇḍ and baiṭhak), so we’ve added push, squat and core work around them.' },
  'tradition:radio_taiso': { ids: ROTATION_MOBILITY, note: flows => flows ? 'Morning Taisō takes about 3 minutes, so it repeats and we’ve added gentle mobility around it.'
    : 'We’ve added gentle mobility around the Morning Taisō moves.' },
  'tradition:tai_chi': { ids: [...BALANCE_QUICK, ...ROTATION_MOBILITY], note: 'We’ve added balance and mobility work around the Tai Chi forms.' },
  'tradition:baduanjin': { ids: [...FLEX_DYNAMIC, ...FLEX_HOLDS], note: 'We’ve added gentle mobility and stretches around the Baduanjin.' },
  'tradition:rotation': { slots: ['core_lateral', 'core_anterior', 'core_posterior'], ids: ROTATION_MOBILITY, note: 'We’ve added core and mobility work around the rotation moves.' },
  'category:balance': { ids: [...BALANCE_QUICK, ...BALANCE_GENERIC], note: 'There are few balance holds, so we’ve added single-leg work around them.' },
  'category:skill': { slots: ['push_vertical', 'core_anterior', 'pull_horizontal'], skillAlt: true, note: 'Skill practice is short by design (quality attempts while you’re fresh), so we’ve added supporting strength.' },
  'category:warmup': { ids: [...FLEX_DYNAMIC, 'marching_in_place'], note: 'We’ve added dynamic mobility to fill the time.' },
  'category:flow': { ids: [...FLEX_DYNAMIC, ...FLEX_HOLDS], note: 'We’ve added mobility and stretches around the flows.' },
  'category:conditioning': { slots: ['squat', 'push_horizontal', 'core_anterior'] },
};
const POOL_TAIL = ['cat_cow', 'childs_pose', 'marching_in_place', 'arm_circles', 'leg_swings', 'hip_circles'];
const GENTLE_KIND = { mobility: 'mobility', balance: 'balance', warmup: 'warmup', flow: 'flow', breath: 'mobility' };

/** Items (visible, available to this profile) matching every given filter. Unknown ids match nothing. */
function poolItems(filter, ctx, library) {
  const tr = filter.tradition ? TRADITIONS[filter.tradition] : null;
  if (filter.tradition && !tr) return [];
  const seen = new Set();
  return (library || []).map(e => ctx.byId[e.id]).filter(ex => {
    if (!ex || seen.has(ex.id) || !ctx.isAvail(ex)) return false;
    seen.add(ex.id);
    if (tr && (tr.kind === 'explainer' ? !(tr.families || []).includes(ex.family) || !!ex.tradition : ex.tradition !== filter.tradition)) return false;
    if (filter.category && ex.category !== filter.category) return false;
    if (filter.family && ex.family !== filter.family) return false;
    if (ex.rung === false && !(filter.tradition && ex.tradition === filter.tradition)) return false; // a variety swap: only in its own tradition's pool
    // tradition single forms belong to their tradition (or a gentle category), not to a strength or core session
    if (!filter.tradition && LOAD_CATS.includes(filter.category) && /^flow_/.test(ex.family)) return false;
    return true;
  });
}

/** Ids of what a pool session would draw from (UI: hide a "make a workout" button when empty). */
export function quickPoolIds(filter = {}, profile = null, library) {
  const p = quickBase(filter, profile);
  return poolItems(filter, buildCtx(p, library), library).map(e => e.id);
}

const isLoad = ex => ex.mode !== 'flow' && LOAD_CATS.includes(ex.category) && !/^flow_/.test(ex.family) && ex.family !== 'skill_balance';
function poolSingle(ex, ctx, sets) {
  const hold = ex.id === 'taichi_golden_rooster' ? [5, 15] : ex.category === 'mobility' ? mobilityItem(ctx)(ex).holdSec : [20, 30];
  const tempo = ex.tempo?.secPerRep || 0;
  const reps = /^flow_/.test(ex.family) ? (tempo >= 10 ? [3, 4] : [4, 6]) : ex.category === 'warmup' ? [8, 12] : [6, 10];
  const notes = [ex.category === 'balance' ? BAL_NOTE : '', ...injNotes(ex, ctx.D)].filter(Boolean).join(' ');
  return flatItem(ex, { reps, hold, sets, rest: ex.mode === 'hold' ? 10 : 15, notes });
}

/** The gentle part of a pool: whole flows first (with their rounds), then single forms and stretches, then filler. */
function poolBlock(ctx, P, used, info, M) {
  const block = { kind: P.kind, title: P.title, items: [] };
  const target = P.sec;
  for (const ex of P.flows) {
    if (used.has(ex.id) || (ctx.avoid && ctx.avoid.has(ex.id) && ctx.vary % 2 === 0)) continue; // a shuffle (v1.3): the single forms this time
    const left = target - blockSec(block, info);
    if (left < 60) break;
    let it = flowItem(ex, ctx);
    if (blockSec({ items: [it] }, info) > left + 30 && ex.variants?.short) it = flowItem(ex, ctx, { variant: 'short' });
    if (blockSec({ items: [it] }, info) > left + 30) continue;
    block.items.push(it); used.add(ex.id);
  }
  for (const it of block.items) addRounds(block, it, target, info);
  const sets = M <= 5 ? 1 : 2;
  fillFlat(block, [...P.singles, ...P.filler], target, target + 30, ex => poolSingle(ex, ctx, sets), M >= 20 ? 4 : 3, used, info);
  return block.items.length ? block : null;
}

/** Template and Quick settings for a pool session; sets quick.pool (the gentle block) and returns the load template. */
function poolTemplate(filter, ctx, seed, minutes, quick, library) {
  const secs = minutes * 60;
  const key = filter.tradition ? `tradition:${filter.tradition}` : filter.category ? `category:${filter.category}` : `family:${filter.family}`;
  const items = poolItems(filter, ctx, library);
  const famCat = filter.family && (ctx.fam[filter.family] || [])[0]?.category; // a family pool fills like its category
  const fill = POOL_FILL[key] || (filter.family && FALLBACK[filter.family]?.length ? { slots: FALLBACK[filter.family] } : POOL_FILL[`category:${famCat}`]) || { ids: [...FLEX_DYNAMIC, ...FLEX_HOLDS] };
  const flows = items.filter(e => e.mode === 'flow');
  let skills = items.filter(e => e.family === 'skill_balance');
  if (fill.skillAlt && !skills.length) skills = SKILL_ALT.map(id => ctx.byId[id]).filter(e => e && ctx.isAvail(e)); // no handbalance possible: other skill holds
  const load = items.filter(isLoad);
  const gentle = items.filter(e => !flows.includes(e) && !skills.includes(e) && !load.includes(e));
  const byT = (a, b) => (a.mode === 'hold') - (b.mode === 'hold') || a.level - b.level;
  quick.warm = filter.category === 'warmup' ? 0 : minutes <= 5 ? 45 : minutes <= 10 ? 60 : Math.round(Math.min(0.1 * secs, 180));
  quick.noWarm = filter.category === 'warmup';
  quick.cool = minutes <= 5 ? 30 : minutes <= 10 ? 60 : Math.round(Math.min(0.1 * secs, 240));
  quick.cond = 0;
  let content = secs - quick.warm - quick.cool;
  if (skills.length) { // skill practice first, capped at 10 min (research §1.1)
    const cur = ctx.levelsEx.skill_balance && skills.includes(ctx.levelsEx.skill_balance) ? ctx.levelsEx.skill_balance : nearest(skills, ctx.levelsEx.skill_balance?.level ?? 1);
    quick.skill = { list: [cur, ...skills.filter(e => e !== cur && Math.abs(e.level - cur.level) <= 1)], max: minutes <= 5 ? 1 : 3, // never more than a level ahead
      sec: Math.min(600, load.length || gentle.length || flows.length || items.length === 1 ? Math.round(0.55 * content) : content) }; // one skill: room for support
    content -= quick.skill.sec;
    quick.warmFirst = ['wrist_prep'];
  }
  const gentleShare = !load.length ? 1 : !(gentle.length + flows.length) ? 0 : clamp((gentle.length + flows.length * 3) / (gentle.length + flows.length * 3 + load.length), 0.3, 0.7);
  // last resort for any gentle pool: easy whole-body drills, so a small pool (small space, injuries) still fills its time
  const okFill = id => ctx.byId[id] && ctx.isAvail(ctx.byId[id]) && !items.includes(ctx.byId[id]);
  const fillMain = (fill.ids || []).filter(okFill), fillTail = POOL_TAIL.filter(id => okFill(id) && !fillMain.includes(id));
  const fillIds = [...avoidLast(ctx, rotate(fillMain, seed)), ...fillTail].map(id => ctx.byId[id]); // the related filler first (varied by day), the easy tail last
  if (gentle.length || flows.length || (!load.length && !skills.length)) {
    const kind = filter.tradition ? (flows.length ? 'flow' : 'mobility') : items.length ? GENTLE_KIND[filter.category] || 'mobility' : 'mobility';
    const title = filter.tradition ? TRADITIONS[filter.tradition].name : CATEGORY_LABEL[filter.category] || ALL_FAMILIES[filter.family]?.name || 'Practice';
    quick.pool = { kind, title, flows: [...flows].sort((a, b) => a.level - b.level), singles: avoidLast(ctx, rotate([...gentle].sort(byT), ctx.vary || 0)), filler: fillIds,
      sec: Math.round(gentleShare * content) };
  }
  const T = (fams, role, tier, extra = {}) => S(fams, role, tier <= 2, { tier, ...extra });
  const role = f => CORE.includes(f) || ROT.includes(f) ? 'core' : f === 'calves' || f === 'stance' ? 'acc' : 'main';
  const slots = [];
  // load items: per family, the one nearest the user's level first (families in the usual priority), then its neighbours
  const fams = [...new Set(load.map(e => e.family))].sort((a, b) => (PRI[a] ?? 9) - (PRI[b] ?? 9));
  const cond = load.length && load.every(e => e.family === 'conditioning' || e.category === 'conditioning');
  const hold = cond ? [30, 45] : undefined;
  let n = 0;
  for (const f of fams) {
    const fl = load.filter(e => e.family === f);
    const lvl = ctx.levelsEx[f]?.level ?? fl[0].level;
    let ranked = [...fl].sort((a, b) => Math.abs(a.level - lvl) - Math.abs(b.level - lvl) || a.level - b.level);
    if (ctx.avoid) { // shuffle: another move at or just below the user's level leads (never a harder one)
      const near = avoidLast(ctx, rotate(ranked.filter(e => e.level <= lvl && lvl - e.level <= 1.5), ctx.vary || 0));
      ranked = [...near, ...ranked.filter(e => !near.includes(e))];
    }
    // cardio: the near-level moves form one circuit (tier 1); otherwise one lead item per family
    ranked.forEach((ex, i) => slots.push(T([f], role(f), (cond ? i < 4 && Math.abs(ex.level - lvl) <= 1.5 : i === 0) ? (n++ < (cond ? 4 : 3) ? 1 : 2) : Math.abs(ex.level - lvl) <= 1 ? 3 : 4,
      { fixed: ex, ...(minutes <= 10 ? { minSets: 1 } : {}), ...(hold ? { hold } : {}) }))); // short sessions: breadth before sets
  }
  if (cond) { quick.warmAvoid = new Set(load.map(e => e.id)); ctx.roundRest = 45; }
  // filler strength slots (tier 4: only used once the pool's own work is in)
  // filler may be a single set; a one-move pool (horse stance) takes it early so the session is more than one hold and stretches
  const lone = items.length === 1 && !flows.length; // a one-move pool: filler joins early
  for (const f of fill.slots || []) slots.push(T([f], role(f), !items.length ? 1 : lone ? 2 : 4, { minSets: 1, ...(hold ? { hold } : {}) }));
  const focus = [...new Set([...load, ...(fill.slots || []).map(f => ({ family: f }))].map(e => patternOf(e.family)))].filter(x => ['push', 'pull', 'legs', 'core'].includes(x));
  const tpl = { kind: 'hard', name: '', focus: focus.length ? focus : ['mobility'], slots, pool: true, ...(lone ? { targeted: true } : {}), ...(cond ? { fmt: 'circuit' } : {}) };
  return { tpl, items, key, fill, flows: flows.length };
}

/**
 * Pool sessions land within about ±8% of the requested length: trim the cool-down (then extra warm-up drills) when over;
 * when short, add sets of the pool's own moves, then a pool form or related filler, then main sets, then stretches.
 */
function fitLength(sess, T, ctx, P, caps = {}) {
  const cap = { main: 6, pool: 4, cool: 3, ...caps };
  const info = ctx.info, lo = 0.93 * T, hi = 1.1 * T - 1; // aim inside ±7%, never past +10%
  const secs = () => sessionSec(sess, info);
  const kinds = k => sess.blocks.filter(b => b.kind === k);
  const content = () => sess.blocks.filter(b => b.kind !== 'warmup' && b.kind !== 'cooldown');
  const warm = kinds('warmup')[0];
  for (let g = 0; g < 40 && secs() > hi; g++) {
    const cool = kinds('cooldown')[0];
    const b = cool && cool.items.length ? cool : warm && warm.items.length > 1 ? warm : null;
    if (b) { const it = b.items[b.items.length - 1]; if (it.sets > 1) it.sets--; else b.items.pop(); continue; }
    // still over: one set fewer of the biggest content item (a superset group together), else drop a last extra move
    const its = content().flatMap(x => x.items).filter(i => i.sets > 1).sort((a, c) => setSec(c, info) - setSec(a, info));
    if (its.length) { const it = its[0]; const grp = it.superset != null ? content().flatMap(x => x.items).filter(x => x.superset === it.superset) : [it]; grp.forEach(x => { x.sets = Math.max(1, x.sets - 1); }); continue; }
    const wi = warm && warm.items[0];
    if (wi && wi.reps && wi.reps[1] > 6) { wi.reps = [4, 6]; continue; } // a shorter warm-up drill
    const long = content().flatMap(x => x.items).filter(i => i.reps && i.reps[1] > 10).sort((a, c) => setSec(c, info) - setSec(a, info))[0];
    if (long) { long.reps = [Math.max(5, long.reps[0] - 3), 10]; continue; } // fewer reps on the longest set
    const cb = content().filter(x => x.items.length).pop();
    if (!cb || content().reduce((n, x) => n + x.items.length, 0) <= 2) break;
    cb.items.pop();
  }
  sess.blocks = sess.blocks.filter(b => b.items.length);
  const used = drillSet(sess.blocks.flatMap(b => b.items.map(i => i.exerciseId)));
  const poolBlk = sess.blocks.find(b => P && b.kind === P.kind && b.title === P.title);
  const main = sess.blocks.find(b => b.kind === 'main');
  let cool = kinds('cooldown')[0];
  if (!cool) { cool = { kind: 'cooldown', title: 'Cool-down', items: [] }; sess.blocks.push(cool); }
  const bump = (list, cap) => () => { // +1 set to the first item (or superset group) that still fits
    for (const it of list()) {
      const grp = it.superset != null ? sess.blocks.find(b => b.items.includes(it)).items.filter(x => x.superset === it.superset) : [it];
      if (grp.some(x => x.sets >= (x.flow ? (FLOW_ROUNDS[x.exerciseId] || 1) : cap))) continue;
      grp.forEach(x => { x.sets++; if (x.flow && x.sets > 1) x.restSec = 20; });
      if (secs() <= hi) return true;
      grp.forEach(x => { x.sets--; if (x.flow && x.sets === 1) x.restSec = 0; });
    }
    return false;
  };
  const add = (block, cands, light = false) => () => {
    for (const ex of cands) {
      if (!ex || used.has(ex.id) || !ctx.isAvail(ex) || (P?.ok && !P.ok(ex))) continue;
      const it = light ? flatItem(ex, { reps: [4, 6], hold: [15, 20], sets: 1 })
        : ex.category === 'mobility' && ex.family === 'mobility' ? mobilityItem(ctx)(ex, 1) : poolSingle(ex, ctx, 1);
      block.items.push(it);
      if (secs() <= hi) { used.add(ex.id); return true; }
      block.items.pop();
    }
    return false;
  };
  const steps = [];
  if (poolBlk) steps.push(bump(() => poolBlk.items.filter(i => !i.flow), cap.pool), add(poolBlk, [...P.singles, ...P.filler]), bump(() => poolBlk.items.filter(i => i.flow), cap.pool));
  if (main && main !== poolBlk) steps.push(bump(() => main.items.filter(i => !i.superset || main.items.find(x => x.superset === i.superset) === i), cap.main));
  steps.push(bump(() => cool.items, cap.cool), add(cool, P?.coolCands || candidates(MOBILITY_ORDER.full, ctx, ['mobility'])));
  if (warm) steps.push(bump(() => warm.items, 2));
  if (poolBlk) steps.push(add(poolBlk, [...P.singles, ...P.filler], true)); // a short extra hold or a few slow reps
  steps.push(add(cool, P?.coolCands || candidates(MOBILITY_ORDER.full, ctx, ['mobility']), true));
  for (let g = 0; g < 60 && secs() < lo; g++) if (!steps.some(f => f())) break;
  // prefer the pool's own work to stretching: trade a cool-down stretch for another set of a pool move when it still fits
  const own = [...(poolBlk ? [bump(() => poolBlk.items, cap.pool)] : []), ...(main && main !== poolBlk ? [steps.find((f, i) => i === (poolBlk ? 3 : 0))] : [])].filter(Boolean);
  for (let g = 0; g < 8 && !cap.keepCool && cool.items.length > (T > 300 ? 1 : 0); g++) {
    const snap = JSON.stringify(sess.blocks);
    const gone = cool.items.pop();
    let grew = false;
    while (secs() < hi && own.some(f => f())) grew = true;
    if (!grew || secs() < lo) { const back = JSON.parse(snap); sess.blocks.forEach((b, i) => { b.items = back[i].items; }); void gone; break; }
  }
  sess.blocks = sess.blocks.filter(b => b.items.length);
}

// =============================================================================================
// Moments (docs/moments.md): a short session shaped by the time of day, or by what someone is about to do or has done
// =============================================================================================
const DOCTOR_LINE = 'If you’ve felt low, anxious or unable to sleep most days for a couple of weeks, it’s worth talking to your doctor.';
/** UI metadata for the nine moments: chip label, mark, allowed minute chips, default, helper and "why" copy (moments.md §4-5). */
export const MOMENTS = {
  morning: { label: 'Morning wake-up', mark: '朝', minutes: [5, 10, 15, 20], def: 10, grade: 'C',
    helper: 'Gentle, standing moves to loosen up and start the day.', why: 'Your back is stiffer first thing, so we keep deep forward bends for later.' },
  desk: { label: 'Desk reset', mark: '伸', minutes: [5, 10, 15], def: 5, grade: 'B',
    helper: 'A few minutes on your feet to undo some of the sitting.', why: 'Short, frequent movement breaks can lower blood-sugar rises during long sitting. Little and often works best.' },
  energy: { label: 'Energy boost', mark: '活', minutes: [5, 10], def: 5, grade: 'C',
    helper: 'Short, brisk bursts for a quick lift. Good before lunch, too.', why: 'Many people feel more alert after a brisk few minutes. Short bursts through the day add up for fitness.' },
  after_meal: { label: 'After a meal', mark: '食', minutes: [5, 10, 15, 20], def: 10, grade: 'B',
    helper: 'Easy, steady moves soon after eating. A walk works just as well.', why: 'Moving soon after a meal can help soften the rise in blood sugar. Sooner is better than later.' },
  before_sport: { label: 'Before sport', mark: '備', minutes: [5, 10, 15, 20], def: 15, grade: 'A',
    helper: 'Raise, activate, mobilise, then a few quick efforts.', why: 'Structured warm-ups with strength and balance work lower injury risk in team sports. Keep stretches short: under 30 seconds.' },
  after_sport: { label: 'After sport', mark: '整', minutes: [5, 10, 15], def: 10, grade: 'C',
    helper: 'Slow down, breathe and stretch while you’re warm.', why: 'A cool-down won’t stop soreness, but it’s a good time to work on flexibility and let your breathing settle.' },
  wind_down: { label: 'Wind down', mark: '静', minutes: [5, 10, 15, 20], def: 10, grade: 'B', always: DOCTOR_LINE, darkPlayer: true,
    helper: 'Slow flow, easy stretches and a longer out-breath.', why: 'Gentle movement in the evening is fine for sleep. It’s hard efforts right before bed that can keep some people up.' },
  on_the_road: { label: 'On the road', mark: '旅', minutes: [10, 15, 20, 30, 45], def: 20, grade: 'C',
    helper: 'No kit, small space, no jumping. The neighbours will never know.', why: 'After flying east, moving in your destination’s morning or early afternoon may help you adjust.' },
  low_energy: { label: 'Low-energy day', mark: '息', minutes: [5, 10, 15, 20], def: 5, grade: 'B', always: DOCTOR_LINE,
    helper: 'Breathe first, then move gently. Stopping early still counts.', why: 'A short, easy session can take the edge off. Five minutes keeps the habit going.' },
};
const MOMENT_ALIAS = { travel: 'on_the_road' };
/** Moments whose sessions are deliberately below the user's level: their logs never move a ladder (moments.md §3.5). */
export const RECOVERY_MOMENTS = ['before_sport', 'after_sport', 'wind_down', 'low_energy', 'after_meal'];
const momentId = m => (typeof m === 'string' && MOMENTS[MOMENT_ALIAS[m] || m] ? (MOMENT_ALIAS[m] || m) : null);
/** The minutes a moment request actually runs for: snapped to the nearest allowed chip (ties go to the shorter). */
export function momentMinutes(request) {
  const id = momentId(request?.moment);
  if (!id) return null;
  const want = Number(request.minutes) || MOMENTS[id].def;
  return MOMENTS[id].minutes.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a));
}
/** A moment of 10 min or less: keeps the day streak alive but is not a training session (founder decision, as Morning Taisō). */
export const isShortMomentLog = l => !!l && l.sessionId === 'Q' && !!momentId(l.request?.moment) && momentMinutes(l.request) <= 10;

const EARLY_FLEXION = ['standing_hamstring_stretch', 'pancake_stretch', 'childs_pose', 'lying_leg_raise', 'hollow_body_hold', 'baduanjin_touch_toes'];
// Ordered pools (moments.md §3.4, plus the phase-A standing and seated items). Tradition ids drop out when not visible.
const MP = {
  morningMob: ['marching_in_place', 'arm_circles', 'rt_stretch_up', 'rt_side_bend', 'hip_circles', 'rt_trunk_twist', 'leg_swings', 'taichi_commencement', 'open_book',
    'cat_cow', 'thoracic_opener', 'worlds_greatest_stretch', 'baduanjin_hold_up_sky', 'taichi_cloud_hands'],
  morningStr: [['bodyweight_squat', 'box_squat'], ['incline_push_up', 'wall_push_up'], ['glute_bridge'], ['bird_dog'], ['calf_raise']],
  deskMove: ['marching_in_place', 'box_squat', 'calf_raise', 'wall_push_up', 'single_leg_rdl', 'seated_calf_raise'],
  deskOpen: ['rt_stretch_up', 'doorway_chest_stretch', 'wall_angel', 'standing_hip_flexor_stretch', 'seated_trunk_rotation', 'rt_side_bend', 'hip_circles', 'arm_circles',
    'rt_trunk_twist', 'leg_swings', 'taichi_cloud_hands', 'baduanjin_hold_up_sky', 'baduanjin_look_back'],
  burstImpact: ['high_knees', 'jumping_jack', 'squat_jump'],
  burstLow: ['marching_in_place', 'bodyweight_squat', 'baithak', 'mountain_climber'],
  easy: ['arm_circles', 'hip_circles', 'rt_stretch_up', 'rt_trunk_twist', 'rt_side_bend', 'leg_swings'],
  meal: ['marching_in_place', 'calf_raise', 'bodyweight_squat', 'box_squat', 'hip_circles', 'arm_circles', 'rt_stretch_up', 'rt_side_bend', 'leg_swings', 'taichi_cloud_hands',
    'taichi_part_horse_mane', 'taichi_brush_knee', 'baduanjin_hold_up_sky', 'baduanjin_draw_bow', 'single_leg_calf_raise', 'seated_calf_raise', 'standing_hip_flexor_stretch'],
  raise: ['marching_in_place', 'jumping_jack', 'high_knees'],
  activate: ['glute_bridge', 'bird_dog', 'split_squat', 'calf_raise', 'single_leg_rdl', 'side_plank', 'plank_shoulder_tap', 'reverse_lunge', 'baduanjin_draw_bow', 'taichi_golden_rooster'],
  mobilise: ['leg_swings', 'hip_circles', 'arm_circles', 'worlds_greatest_stretch', 'inchworm', 'open_book', 'rt_trunk_twist', 'rotational_lunge'],
  potentiate: ['squat_jump', 'high_knees'],
  cool: ['hip_flexor_stretch', 'standing_hip_flexor_stretch', 'standing_hamstring_stretch', 'calf_stretch', 'doorway_chest_stretch', 'pigeon_stretch', 'childs_pose',
    'thread_the_needle', 'open_book', 'cat_cow', 'deep_squat_hold', 'worlds_greatest_stretch'],
  wind: ['cat_cow', 'open_book', 'thread_the_needle', 'childs_pose', 'thoracic_opener', 'hip_flexor_stretch', 'pigeon_stretch', 'standing_hamstring_stretch', 'calf_stretch',
    'taichi_cloud_hands', 'baduanjin_hold_up_sky', 'baduanjin_look_back', 'taichi_commencement'],
  calm: ['marching_in_place', 'rt_stretch_up', 'rt_side_bend', 'hip_circles', 'arm_circles', 'cat_cow', 'open_book', 'childs_pose', 'taichi_cloud_hands', 'baduanjin_hold_up_sky'],
  calmStr: [['incline_push_up', 'wall_push_up'], ['box_squat'], ['glute_bridge'], ['bird_dog']],
};
// Per-moment rules on top of every normal safety filter (moments.md §3.3 step 3). levelOffset: strength one level below the current one.
const MOMENT_RULES = {
  morning: { exclude: EARLY_FLEXION, holdCap: 30 },
  desk: { posture: ['standing', 'seated'], noImpact: true, space: 'small', holdCap: 30 },
  energy: {},
  after_meal: { posture: ['standing', 'seated'], noImpact: true, forceLowImpact: true, exclude: ['baduanjin_touch_toes', 'baduanjin_heel_bounce'] },
  before_sport: { holdCap: 30 },
  after_sport: { noLoad: true, noImpact: true, longHolds: 1 },
  wind_down: { noLoad: true, noImpact: true, longHolds: 1, exclude: ['radio_taiso_1', 'plank', 'hollow_body_hold'] },
  low_energy: { noImpact: true, levelOffset: -1, exclude: ['radio_taiso_1'] },
};
const TRAVEL_KIT = ['wall', 'bench', 'table'];
const TRAVEL_BAN = ['bear_crawl', 'burpee', 'dead_hang'];
const travelLibs = new WeakMap();

function momentSession(request, profile, levels, library, V = {}) {
  const id = momentId(request.moment);
  const meta = MOMENTS[id], R = MOMENT_RULES[id] || {};
  const minutes = momentMinutes(request);
  const T = minutes * 60;
  const finish = (sess, extra = {}) => {
    sess.id = 'Q';
    sess.name = `${minutes}-min ${meta.label}`;
    sess.moment = id;
    sess.light = minutes <= 10; // keeps the day streak alive; not a training session for the weekly target
    Object.assign(sess, extra);
    sess.estMinutes = estimateMinutes(sess, library);
    return sess;
  };
  if (id === 'on_the_road') { // the normal Quick full-body session with the travel overrides (moments.md §1.9)
    let lib = travelLibs.get(library);
    if (!lib) { lib = (library || []).filter(e => !TRAVEL_BAN.includes(e.id)); travelLibs.set(library, lib); }
    const kit = eq => (eq || []).filter(e => TRAVEL_KIT.includes(e));
    const today = Array.isArray(request.equipment) ? request.equipment : null; // v1.3: today's kit wins over the profile's
    const prof = profile ? { ...profile, lowImpact: true, space: 'small', equipment: kit(today || profile.equipment) } : null;
    const req = { minutes, goal: 'health', focus: 'full', date: `${request.date || ''}|moment:${id}`, equipment: kit(today || (profile ? profile.equipment : ['wall'])),
      space: 'small', lowImpact: true, ...(request.levelShift ? { levelShift: request.levelShift } : {}) };
    const sess = quickOnce(req, prof, levels, lib, V);
    return finish(sess, { focus: [...new Set([...sess.focus, 'travel'])] });
  }

  const base = quickBase(request, profile);
  if (R.space && (SPACE_RANK[base.space] ?? 1) > SPACE_RANK[R.space]) base.space = R.space;
  if (R.forceLowImpact) base.lowImpact = true;
  const qp = { ...base, goals: ['health'], primaryGoal: 'health', minutesPerSession: minutes, _quick: true };
  const ctx = buildCtx(qp, library);
  resolveLevels(ctx, qp, profile ? levels : null, library);
  // recovery moments stay below the user's level on purpose: "harder" is not applied there
  const shift = shiftLevels(ctx, request, { noHarder: RECOVERY_MOMENTS.includes(id), profile });
  ctx.phase = { phase: 'build', blockWeek: 3, reentry: null, calibration: false, cycleLen: 5, blockStart: 0 };
  ctx.quick = true;
  ctx.longHolds = R.longHolds || 0;
  Object.assign(ctx, { vary: V.vary || 0, avoid: V.avoid || null });
  const D = ctx.D, info = ctx.info;
  const seed = hashStr(JSON.stringify([request.date || '', minutes, 'moment', id, request.equipment || null, request.space || null, !!request.lowImpact, ...(V.salt ? [V.salt] : [])])) % 9973;

  // --- the moment's filters, on top of availability (which already applies kit, space, injuries, age, BMI, low impact and the gates)
  const LOAD_FAM = [...PROGRESSION_FAMILIES, 'conditioning', 'stance'];
  const levelOk = ex => {
    if (!LOAD_FAM.includes(ex.family) || ex.rung === false || ex.category === 'mobility') return true;
    const av = ctx.avail[ex.family], cur = ctx.levelsEx[ex.family];
    const floor = av.length ? av[0].level : ex.level;
    const capL = cur ? Math.max(floor, cur.level + (R.levelOffset || 0)) : floor; // never above the current level (moments.md §3.3 step 6)
    return ex.level <= capL;
  };
  const ok = ex => !!ex && ctx.isAvail(ex) && (!R.posture || R.posture.includes(ex.posture)) && !(R.noImpact && ex.impact === 'high') && !(R.exclude || []).includes(ex.id)
    && !(R.noLoad && ['strength', 'conditioning', 'core', 'skill'].includes(ex.category) && !/^flow_/.test(ex.family) && ex.id !== 'marching_in_place') && levelOk(ex);
  const used = new DrillSet();
  const pick = ids => ids.map(i => ctx.byId[i]).filter(e => ok(e) && !used.has(e.id));
  const firstOf = alts => avoidLast(ctx, pick(alts).sort((a, b) => b.level - a.level))[0] || null; // the hardest allowed of the alternatives (never above the level)
  // static stretches only: timed dynamic moves (marching, bursts) keep their length
  const capHold = it => { if (R.holdCap && it.holdSec && !it.flow && ctx.byId[it.exerciseId]?.category === 'mobility') it.holdSec = [Math.min(it.holdSec[0], R.holdCap - 10), Math.min(it.holdSec[1], R.holdCap)]; return it; };
  const gentle = (ex, sets = 1, o = {}) => {
    const it = ex.family === 'mobility' && ex.mode === 'hold' ? mobilityItem(ctx)(ex, sets) : poolSingle(ex, ctx, sets);
    if (o.reps && it.reps) it.reps = o.reps;
    if (o.hold && it.holdSec) it.holdSec = o.hold;
    if (o.rest != null) it.restSec = o.rest;
    if (o.rir != null) it.rir = o.rir;
    if (o.note) it.notes = [it.notes, o.note].filter(Boolean).join(' ');
    return capHold(it);
  };
  const strengthIt = (ex, rir, reps = [8, 12], note = '') => gentle(ex, 1, { reps, hold: [15, 25], rest: 30, rir, note });
  const addTo = (block, ex, it) => { block.items.push(it); used.add(ex.id); };
  const fillTo = (block, cands, target, mk, maxSets = 2) => fillFlat(block, cands.filter(e => !used.has(e.id)), target, target + 20, mk, maxSets, used, info);
  const flowFirst = (list, maxSec, title, maxRounds = 9) => { // moments.md §3.3 step 4: the first visible flow that fits in <= maxSec (+ its transition)
    for (const spec of list) {
      const [fid, variant] = spec.split(':');
      const ex = ctx.byId[fid];
      if (!ok(ex) || used.has(fid)) continue;
      const it = flowItem(ex, ctx, variant ? { variant } : {});
      const block = { kind: 'flow', title: title || ex.name, items: [it] };
      if (blockSec(block, info) - CONFIG.transitionStraight > maxSec) continue;
      used.add(fid);
      addRounds(block, it, maxSec, info);
      while (it.sets > maxRounds) it.sets--;
      if (it.sets === 1) it.restSec = 0;
      return block;
    }
    return null;
  };
  const breathItem = sec => flatItem(ctx.byId.paced_breathing, { hold: [sec, sec], sets: 1, notes: 'In for about 4 s, out for about 6 s. No breath holds.' });
  const breath = (sec, title = 'Breathe') => { // paced breathing only: never a breath hold (moments.md §3.3 step 8)
    const ex = ctx.byId.paced_breathing;
    if (!ex || !ctx.isAvail(ex)) return null;
    return { kind: 'mobility', title, items: [breathItem(sec)] };
  };
  const blocks = [];
  const push = b => { if (b && b.items.length) blocks.push(b); return b; };
  const secOf = () => blocks.reduce((t, b) => t + blockSec(b, info), 0);
  const rot = arr => avoidLast(ctx, rotate(arr, seed));
  const vr = arr => (ctx.avoid ? rot(arr) : arr); // lists kept in order, varied only when shuffling (v1.3)
  const mainBlock = (kind, title) => { const b = { kind, title, items: [] }; blocks.push(b); return b; };
  let main = null;
  const extra = {};

  switch (id) {
    case 'morning': { // Morning Taisō first; standing mobility every plane; light strength from 10 min; a balance hold from 15
      const flow = push(flowFirst(['radio_taiso_1'], Math.round(0.7 * T), null, 1));
      const strT = minutes >= 10 ? Math.round(0.3 * T) : 0, balT = minutes >= 15 ? 75 : 0;
      main = mainBlock('mobility', 'Loosen up');
      const mob = pick(MP.morningMob);
      const lead = flow ? [] : mob.slice(0, 1); // no Taisō: start with marching
      const restMob = rot(mob.slice(lead.length));
      fillTo(main, [...lead, ...restMob.filter(e => e.posture === 'standing'), ...restMob.filter(e => e.posture !== 'standing')], T - secOf() - strT - balT, ex => gentle(ex, 1, { note: ex.id === 'cat_cow' ? 'Mid-range only.' : '' })); // standing moves first
      if (strT) fillTo(mainBlock('main', 'Wake up the muscles'), MP.morningStr.map(firstOf).filter(Boolean), strT, ex => strengthIt(ex, 3), 2);
      if (balT) {
        const b = pick(['taichi_golden_rooster', 'single_leg_rdl', 'single_leg_calf_raise'])[0];
        if (b) addTo(mainBlock('balance', 'Balance'), b, gentle(b, 2, { hold: [10, 20], reps: [6, 8], rest: 15, note: BAL_NOTE }));
      }
      break;
    }
    case 'desk': { // standing (a chair allowed): the Dempsey break pattern, then chest, upper-back and trunk openers
      const move = mainBlock('main', 'Move');
      fillTo(move, pick(MP.deskMove), Math.round(0.45 * T), ex => ex.id === 'marching_in_place' ? gentle(ex, 1, { hold: [45, 60] })
        : strengthIt(ex, 3, [10, 15], ex.id === 'box_squat' ? 'Half range: sit to your chair and stand.' : ''));
      main = mainBlock('mobility', 'Open up');
      const open = pick(MP.deskOpen);
      fillTo(main, [...open.slice(0, 2), ...rot(open.slice(2))], T - secOf(), ex => gentle(ex, 1));
      break;
    }
    case 'energy': { // snack: an easy raise, N brisk bursts with easy marching between, standing openers (moments.md §3.3 step 7)
      const vigorous = !(D.age >= 65 || D.bmi35 || [0, 1, 2, 6].some(i => profile?.health?.parq?.[i] === true) || profile?.health?.pregnant);
      const N = minutes <= 5 ? 2 : 4, sec = vigorous ? (minutes <= 5 ? 30 : 40) : 60;
      const cands = vigorous ? [...(D.lowImpact ? [] : pick(MP.burstImpact)), ...pick(MP.burstLow)] : pick(['marching_in_place', 'bodyweight_squat', 'box_squat']);
      const moves = rot(cands.slice(0, 4)).slice(0, 2);
      const warmEx = pick(['marching_in_place', 'arm_circles', 'hip_circles']).filter(e => !moves.includes(e))[0];
      if (warmEx) addTo(mainBlock('warmup', 'Easy start'), warmEx, gentle(warmEx, 1, { hold: [50, 60], reps: [15, 20] }));
      main = mainBlock('conditioning', 'Bursts');
      const rounds = Math.max(1, Math.round(N / Math.max(1, moves.length)));
      for (const ex of moves) {
        addTo(main, ex, { ...flatItem(ex), reps: null, holdSec: [sec, sec], sets: rounds, restSec: 45, perSide: false, rir: null, superset: moves.length > 1 ? 1 : null,
          notes: vigorous ? 'Brisk: a few words at a time. Then about 45 s of easy marching.' : 'Moderate pace: you can still talk. Then about 45 s of easy marching.' });
      }
      fillTo(mainBlock('cooldown', 'Open up'), pick(MP.easy), Math.max(45, T - secOf()), ex => gentle(ex, 1, { reps: [6, 8] }), 1);
      if (!vigorous) extra.note = 'We’ve kept the bursts moderate, based on your health answers or age.';
      break;
    }
    case 'after_meal': { // no warm-up: continuous, standing, easy; Tai Chi or Morning Taisō (no hops) first; openers to finish
      push(flowFirst(avoidLast(ctx, ['taichi_short_flow', 'radio_taiso_1']), Math.round(0.7 * T)));
      main = mainBlock('mobility', 'Keep moving');
      const pool = pick(MP.meal);
      fillTo(main, ctx.avoid ? rot(pool) : [...pool.slice(0, 1), ...rot(pool.slice(1))], T - secOf() - 60, ex => ex.id === 'marching_in_place' ? gentle(ex, 1, { hold: [60, 90] })
        : gentle(ex, 1, { reps: [10, 15], note: ['bodyweight_squat', 'box_squat'].includes(ex.id) ? 'Half range, easy pace.' : 'Easy, steady pace.' }));
      fillTo(mainBlock('cooldown', 'Open up'), vr(pick(['rt_stretch_up', 'arm_circles', 'rt_side_bend', 'hip_circles'])), 60, ex => gentle(ex, 1, { reps: [6, 8] }), 1);
      break;
    }
    case 'before_sport': { // RAMP: raise, activate, mobilise, potentiate (moments.md §1.6, §3.3 step 7); never to fatigue
      const flow5 = minutes === 5 ? push(flowFirst(['radio_taiso_1'], Math.round(0.75 * T), 'Raise: Morning Taisō')) : null;
      const pot = !D.lowImpact && D.age < 65 && minutes >= 10;
      const share = { raise: 0.2 + (D.age >= 65 ? 0.15 : 0), activate: 0.3 + (!pot && D.age < 65 ? 0.15 : 0), potentiate: pot ? 0.15 : 0 };
      if (!flow5) {
        fillTo(mainBlock('warmup', 'Raise'), vr(pick(MP.raise)), Math.round(share.raise * T), ex => gentle(ex, 1, { hold: [30, 45], reps: [20, 30], note: 'Build from easy to moderate.' }), 1);
        fillTo(mainBlock('main', 'Activate'), vr(pick(MP.activate)), Math.round(share.activate * T), ex => strengthIt(ex, 3, [6, 10], 'Controlled; stop well short of tiring.'), 1);
      }
      main = mainBlock('mobility', 'Mobilise');
      // dynamic moves only; any static hold elsewhere stays <= 30 s
      fillTo(main, vr(pick(MP.mobilise).filter(e => e.mode !== 'hold')), T - secOf() - Math.round(share.potentiate * T), ex => gentle(ex, 1, { reps: [6, 10] }), 2);
      if (pot) {
        fillTo(mainBlock('conditioning', 'Potentiate'), vr(pick([...MP.potentiate, 'jumping_jack', 'bodyweight_squat'])), Math.round(share.potentiate * T), ex => ({ ...flatItem(ex), reps: null, holdSec: [10, 10], sets: 2,
          restSec: 30, rir: null, notes: 'Fast and crisp for 10 s, then walk it off. Never to fatigue.' }), 2);
      }
      break;
    }
    case 'after_sport': { // ease off, settle with Baduanjin (short) when it fits, stretch with longer holds, breathe
      const m = pick(['marching_in_place'])[0];
      if (m) addTo(mainBlock('mobility', 'Ease off'), m, gentle(m, 1, { hold: [60, 90], note: 'Slow and easy: let your breathing settle.' }));
      const br = breath(60);
      if (minutes >= 10) push(flowFirst(['baduanjin_sequence:short'], Math.round(0.6 * T)));
      main = mainBlock('mobility', 'Stretch');
      fillTo(main, [...rot(pick(MP.cool)), ...pick(['taichi_commencement'])], T - secOf() - (br ? blockSec(br, info) : 0), ex => gentle(ex, 1));
      push(br);
      break;
    }
    case 'wind_down': { // slow flow, then easy floor mobility with longer holds, then a longer out-breath (moments.md §1.8)
      const br = breath(minutes <= 5 ? 60 : 90);
      push(flowFirst(['baduanjin_sequence:short', 'taichi_short_flow'], Math.round(0.6 * T)));
      main = mainBlock('mobility', 'Stretch');
      const pool = pick(MP.wind);
      const close = pool.filter(e => e.id === 'taichi_commencement');
      fillTo(main, [...rot(pool.filter(e => !close.includes(e))), ...close], T - secOf() - (br ? blockSec(br, info) : 0), ex => gentle(ex, 1));
      push(br);
      extra.darkPlayer = true;
      break;
    }
    case 'low_energy': { // breath first, gentle movement (a slow flow if it fits), light strength from 15 min one level down, breath to close
      const b1 = push(breath(60, 'Breathe first'));
      const strT = minutes >= 15 ? Math.round(0.25 * T) : 0;
      const b2 = minutes >= 10 && b1 ? { kind: 'mobility', title: 'Breathe', items: [breathItem(60)] } : null;
      if (minutes >= 10) push(flowFirst(['taichi_short_flow', 'baduanjin_sequence:short'], Math.round(0.45 * T)));
      main = mainBlock('mobility', 'Move gently');
      const pool = pick(MP.calm);
      fillTo(main, [...pool.slice(0, 1), ...rot(pool.slice(1))], T - secOf() - strT - (b2 ? 60 : 0), ex => gentle(ex, 1, ex.id === 'marching_in_place' ? { hold: [45, 60] } : {}));
      if (strT) fillTo(mainBlock('main', 'A little strength (optional)'), MP.calmStr.map(firstOf).filter(Boolean), strT, ex => strengthIt(ex, 4, [8, 12], 'Easy: stop with plenty left.'), 1);
      push(b2);
      break;
    }
  }
  const sess = { id: 'Q', name: '', focus: [], estMinutes: 0, blocks: blocks.filter(b => b.items.length) };
  // time fit: more of the moment's own gentle moves first, never a move the moment's rules exclude
  const rest = pick([...new Set(Object.values(MP).flat(2))]).filter(e => ['mobility', 'warmup'].includes(e.category) || e.family === 'mobility');
  const caps = { main: id === 'morning' || id === 'desk' ? 2 : 1, pool: id === 'before_sport' ? 2 : 3, cool: 2, keepCool: true };
  const okMore = e => ok(e) && !used.has(e.id) && !(id === 'before_sport' && e.mode === 'hold');
  fitLength(sess, T, ctx, main ? { kind: main.kind, title: main.title, singles: rot(rest), filler: [], ok: okMore, coolCands: rest } : { ok: okMore, coolCands: rest }, caps);
  sess.blocks.forEach(b => b.items.forEach(it => { if (it.exerciseId !== 'paced_breathing') capHold(it); }));
  const tags = new Set(sess.blocks.flatMap(b => [b.kind, ...b.items.map(i => patternOf(i.family))]));
  sess.focus = ['push', 'pull', 'legs', 'core', 'conditioning', 'balance', 'flow', 'mobility', 'breath'].filter(f => tags.has(f));
  if (shift) extra.levelShift = shift;
  return finish(sess, extra);
}

function quickName(minutes, focus, muscles, goal, goalGiven) {
  let label;
  if (muscles.length) {
    const n = muscles.map(m => MUSCLE_LABEL[m] || m.replace(/_/g, ' '));
    label = n.length === 1 ? n[0] : n.length === 2 ? `${n[0]} & ${n[1]}` : n.length === 3 ? `${n[0]}, ${n[1]} & ${n[2]}` : `${n[0]}, ${n[1]} & ${n.length - 2} more`;
    label = label.charAt(0).toUpperCase() + label.slice(1);
  } else label = FOCUS_LABEL[focus];
  return `${minutes}-min ${label}${goalGiven && !['mobility', 'flow'].includes(focus) ? ` · ${GOAL_LABEL[goal]}` : ''}`;
}

/**
 * One-off session (id 'Q'). request = { minutes 5-90, goal?, focus?, muscles?, equipment?, space?, lowImpact?, date }.
 * Without profile/levels: a 'some experience' adult, floor + wall only unless request.equipment is given.
 * Deterministic: seeded from request.date and the request fields.
 * v1.3: request.equipment is today's kit (wins over the profile's for this session), request.levelShift (-2..+2) moves every
 * ladder, request.shuffle (k > 0) returns the k-th different session (docs/CONTRACTS.md "Today's kit, level and shuffle").
 */
export function generateQuickSession(request = {}, profile = null, levels = null, library) {
  if (profile) derive(profile); // ages 13+
  const k = shuffleOf(request);
  if (!k) return quickOnce(request, profile, levels, library);
  return shuffled(request, k, profile, levels, library);
}

/** The profile a Quick request is built for: the user's (with today's kit when the request carries one), or the Quick default. */
function quickBase(request, profile) {
  const kit = Array.isArray(request.equipment) ? request.equipment.filter(e => typeof e === 'string') : null;
  return profile ? { ...profile, ...(kit ? { equipment: [...kit] } : {}) }
    : { ...QUICK_DEFAULT, equipment: kit || ['wall'], space: request.space || 'medium', lowImpact: !!request.lowImpact };
}

// ---------------------------------------------------------------------------------------------
// v1.3: level shift and shuffle
// ---------------------------------------------------------------------------------------------
/**
 * Move every ladder (LEVEL_FAMILIES) request.levelShift rungs (-2..+2) along what this profile can do: ctx.avail already
 * applies kit, space, injuries (and their level caps), age, BMI and low impact, so a shift never reaches an excluded move.
 * Extra safety: no harder cardio after pre-screen flags, pregnancy, 65+ or BMI 35+ (the moments' vigorous gate), and
 * `noHarder` (recovery moments) keeps only the easier direction. Returns null when no shift was asked for.
 */
function shiftLevels(ctx, request, { noHarder = false, profile = null } = {}) {
  const asked = clamp(Math.round(Number(request.levelShift) || 0), -2, 2);
  if (!asked) return null;
  const D = ctx.D;
  const gated = D.age >= 65 || D.bmi35 || [0, 1, 2, 6].some(i => profile?.health?.parq?.[i] === true) || !!profile?.health?.pregnant;
  const n = noHarder ? Math.min(0, asked) : asked;
  const out = { requested: asked, applied: n, changes: [], limited: n !== asked, limitedFamilies: [] };
  if (!n) return out;
  for (const fam of LEVEL_FAMILIES) {
    const cur = ctx.levelsEx[fam];
    const lad = ctx.avail[fam];
    const i = cur ? lad.indexOf(cur) : -1;
    if (i < 0) continue;
    const want = fam === 'conditioning' && gated && n > 0 ? 0 : n;
    const j = clamp(i + want, 0, lad.length - 1);
    if (j !== i + n) { out.limited = true; out.limitedFamilies.push(fam); }
    if (j === i) continue;
    ctx.levelsEx[fam] = lad[j];
    out.changes.push({ family: fam, from: cur.id, to: lad[j].id });
  }
  return out;
}

const shuffleOf = r => clamp(Math.floor(Number(r?.shuffle) || 0), 0, 999);
/** What a shuffle must change: the moves outside the warm-up and cool-down. */
const contentIds = sess => [...new Set(sess.blocks.filter(b => b.kind !== 'warmup' && b.kind !== 'cooldown').flatMap(b => b.items.map(i => i.exerciseId)))].sort();
const shuffleCache = new Map();
const SHUFFLE_TRIES = 8;
/**
 * request.shuffle = k (v1.3): the k-th shuffle of a request. Deterministic: shuffle 0 is the normal session; each next one
 * prefers moves the earlier ones did not use and retries (other variations and family orders) until its content differs
 * from every earlier shuffle. When nothing new is left the shuffles cycle through the ones found (`shuffle.cycled`).
 */
function shuffled(request, k, profile, levels, library) {
  const base = { ...request };
  delete base.shuffle;
  const key = JSON.stringify([base, profile, levels, traditionPreview(), animationGateVersion(), (library || []).length]);
  let st = shuffleCache.get(key);
  if (!st || st.library !== library) {
    const first = quickOnce(base, profile, levels, library);
    st = { library, list: [{ sess: first, sig: contentIds(first).join() }], exhaustedAt: 0 };
    if (shuffleCache.size > 12) shuffleCache.delete(shuffleCache.keys().next().value);
    shuffleCache.set(key, st);
  }
  while (st.list.length <= k && !st.exhaustedAt) {
    const s = st.list.length;
    const seen = new Set(st.list.map(x => x.sig));
    const avoid = new Set(st.list.flatMap(x => x.sig.split(',')));
    let found = null;
    for (let j = 0; j < SHUFFLE_TRIES && !found; j++) {
      const sess = quickOnce(base, profile, levels, library, { salt: s * 31 + j, vary: j, avoid });
      const sig = contentIds(sess).join();
      if (!seen.has(sig)) found = { sess, sig };
    }
    if (found) st.list.push(found); else st.exhaustedAt = s;
  }
  const n = st.list.length;
  const out = JSON.parse(JSON.stringify(st.list[k % n].sess));
  out.shuffle = { n: k, options: st.exhaustedAt ? n : null, cycled: k >= n };
  return out;
}

function quickOnce(request, profile, levels, library, V = {}) {
  if (momentId(request.moment)) return momentSession(request, profile, levels, library, V); // a moment wins over everything else (moments.md §3.1)
  const minutes = clamp(Math.round(Number(request.minutes) || 20), 5, 90);
  const goalGiven = ALL_GOALS.includes(request.goal);
  const goal = goalGiven ? request.goal : 'health';
  const muscles = [...new Set((request.muscles || []).filter(m => MUSCLE_REGION[m]))];
  // a Library pool (tradition / category / family) wins over focus and goal; muscles win over a pool
  const filter = muscles.length ? {} : Object.fromEntries(['tradition', 'category', 'family'].filter(k => typeof request[k] === 'string' && request[k]).map(k => [k, request[k]]));
  const pooled = Object.keys(filter).length > 0;
  let focus = muscles.length ? 'muscles' : pooled ? 'pool' : (FOCUS_LABEL[request.focus] ? request.focus : 'full');
  const base = quickBase(request, profile);
  const qp = { ...base, goals: [goal], primaryGoal: goal, minutesPerSession: minutes, _quick: true };
  const ctx = buildCtx(qp, library);
  resolveLevels(ctx, qp, profile ? levels : null, library);
  const shift = shiftLevels(ctx, request, { profile });
  Object.assign(ctx, { vary: V.vary || 0, avoid: V.avoid || null });
  ctx.phase = { phase: 'build', blockWeek: 3, reentry: null, calibration: false, cycleLen: 5, blockStart: 0 };
  const eqp = qp.equipment || [];
  ctx.barOnly = eqp.includes('pullup_bar') && !eqp.includes('rings') && !eqp.includes('table') && ctx.avail.pull_vertical.length > 0;
  ctx.balanceSessions = 0;
  ctx.hitCount = { core: 1, push: 1, pull: 1, legs: 1 };
  ctx.lightKeys = [];
  const seed = hashStr(JSON.stringify([request.date || '', minutes, goal, focus, muscles, request.equipment || null, request.space || null, !!request.lowImpact,
    ...(pooled ? [filter] : []), ...(V.salt ? [V.salt] : [])])) % 9973;

  const gq = {}; // what a content-led goal sets (applied last, over the generic Quick timing)
  // "Train for a goal" (no area, no muscles): content-led goals choose the main block themselves
  const goalLed = focus === 'full' && !muscles.length && GOAL_LED.includes(goal) ? goal : null;
  const pool = pooled ? poolTemplate(filter, ctx, seed, minutes, gq, library) : null;
  let tpl = pool ? pool.tpl : goalLed ? goalTemplate(goal, ctx, seed, minutes, gq) : quickTemplate(focus, muscles, ctx, seed, minutes);
  if (!tpl) { // nothing trains those muscles here: fall back to the body region
    const r = MUSCLE_REGION[muscles[0]];
    focus = r === 'legs' ? 'lower' : r === 'core' ? 'core' : 'upper';
    tpl = quickTemplate(focus, [], ctx, seed, minutes);
  }
  const T = minutes * 60;
  const quick = { noBalance: focus === 'mobility' || focus === 'flow' };
  quick.warm =minutes <= 5 ? 45 : minutes <= 10 ? Math.max(60, Math.round(0.15 * T)) : minutes < 20 ? 150 : null; // always a warm-up, scaled down when short
  if (minutes <= 10) quick.cool = muscles.length ? 95 : 60;
  if (minutes < 15) quick.cond = 0;
  if (focus === 'muscles' || ['upper', 'lower', 'legs', 'push', 'pull'].includes(focus)) quick.cond = goal === 'endurance' && minutes >= 30 ? 180 : 0; // targeted time stays on target
  ctx.quick = true;
  ctx.longHolds = focus === 'mobility' || goalLed === 'flexibility' ? (minutes >= 60 ? 2 : minutes >= 30 ? 1 : 0) : minutes >= 60 ? 1 : 0;
  if (['upper', 'lower', 'legs', 'push', 'pull'].includes(focus)) tpl.targeted = true;
  if (tpl.kind === 'hard' && minutes >= 30 && focus !== 'muscles' && !pool) { // more variations of the same families, used only if time is left after the prescription
    const fams = [...new Set(tpl.slots.map(x => x.fixed ? x.fixed.family : x.fams[0]))];
    for (let k = 0; k < 2; k++) for (const f of fams) tpl.slots.push(S([f], patternOf(f) === 'core' ? 'core' : f === 'calves' ? 'acc' : 'main', false, { tier: 4, variant: true }));
    if (minutes >= 45 && !tpl.targeted) for (let k = 0; k < 2; k++) for (const f of CORE) tpl.slots.push(S([f], 'core', false, { tier: 4, variant: true })); // long narrow sessions: complementary core work
  }
  const targeted = focus === 'muscles' || ['upper', 'lower', 'legs', 'push', 'pull'].includes(focus);
  if (targeted && minutes >= 15 && minutes < 30) quick.warm = 120; // lean warm-up so the targeted work gets the time
  if (focus === 'muscles' && minutes >= 15) { quick.cool = minutes < 30 ? 95 : 120; quick.coolIsMin = minutes >= 30; }
  if (focus === 'flow') { // whole flows (when their tradition is verified), then stretches with rotation openers first
    quick.flow = Math.round(0.6 * T);
    quick.flowOrder = ['radio_taiso_1', ...flowOrder(ctx.D)];
    quick.mobOrder = ROTATION_MOBILITY;
  }
  if (focus === 'balance') { // the gentle balance block comes early and doubles as preparation, so warm-up and stretching stay short
    quick.balance = Math.max(120, Math.round(0.35 * T));
    if (minutes > 10) quick.cool = Math.round(Math.min(0.15 * T, 300));
    if (minutes >= 20) quick.warm = Math.round(Math.min(0.15 * T, 300));
  }
  if (focus === 'rotation') quick.mobOrder = ROTATION_MOBILITY;
  if (['mobility', 'flow', 'balance', 'rotation'].includes(focus)) quick.cond = 0;
  Object.assign(quick, gq);
  if (muscles.length) { // stretches for the chosen areas first
    const ranked = [...ctx.avail.mobility].map((ex, i) => ({ ex, i, sc: muscleScore(ex, muscles).score })).sort((a, b) => b.sc - a.sc || a.i - b.i);
    quick.mobOrder = ranked.map(x => x.ex.id);
  }
  ctx.twoMoves = focus === 'full' || (pooled && filter.category !== 'warmup'); // goal and pool sessions: a 5-min session always has at least two moves
  let sess = buildSession({ key: 'quick', tpl, quick, hardIdx: 0, variant: 0 }, ctx, seed, 0);
  const contentN = s => s.blocks.filter(b => b.kind !== 'warmup' && b.kind !== 'cooldown').reduce((n, b) => n + b.items.length, 0);
  if (ctx.twoMoves && minutes <= 5 && contentN(sess) < 2) { // 5 min: never a single move; the warm-up and cool-down shrink to their minimum
    const retry = buildSession({ key: 'quick', tpl, quick: { ...quick, warm: 0, cool: 0 }, hardIdx: 0, variant: 0 }, ctx, seed, 0);
    if (contentN(retry) > contentN(sess)) sess = retry;
  }
  delete sess._tpl; delete sess._key;
  sess.id = 'Q';
  if (pool) {
    fitLength(sess, T, ctx, quick.pool);
    const inPool = new Set(pool.items.map(e => e.id));
    const label = filter.tradition ? TRADITIONS[filter.tradition]?.name || filter.tradition : filter.category ? CATEGORY_LABEL[filter.category] || filter.category
      : ALL_FAMILIES[filter.family]?.name || filter.family;
    sess.pool = { ...filter };
    const warmB = filter.category === 'warmup' ? null : sess.blocks.find(b => b.kind === 'warmup');
    const coolB = sess.blocks.find(b => b.kind === 'cooldown');
    const added = sess.blocks.some(b => b !== warmB && b !== coolB && b.items.some(i => !inPool.has(i.exerciseId))); // filler in the content
    const longCool = coolB && blockSec(coolB, ctx.info) > quick.cool + 120; // the stretches absorbed spare time
    const contentBlocks = sess.blocks.filter(b => b !== warmB && b !== coolB);
    const poolSec = contentBlocks.reduce((t, b) => t + blockSec({ items: b.items.filter(i => inPool.has(i.exerciseId)).map(i => ({ ...i, superset: null })) }, ctx.info), 0);
    const thin = poolSec < 0.5 * (sessionSec(sess, ctx.info) - blockSec(warmB || { items: [] }, ctx.info)); // the pool's own work is under half the session
    if (!pool.items.length) sess.note = `None of the ${label} moves suit you right now (kit, space or injuries), so this is a related session instead.`;
    else if (added || longCool || thin) sess.note = (typeof pool.fill.note === 'function' ? pool.fill.note(pool.flows) : pool.fill.note) || `There isn’t enough ${label} to fill ${minutes} minutes, so we’ve added related work around it.`;
    sess.name = `${minutes}-min ${label}`;
  } else sess.name = GOAL_QUICK_LABEL[goalLed] ? `${minutes}-min ${GOAL_QUICK_LABEL[goalLed]}` : quickName(minutes, focus === 'muscles' ? 'muscles' : focus, focus === 'muscles' ? muscles : [], goal, goalGiven);
  if (focus === 'mobility') sess.focus = ['mobility'];
  if (goalLed === 'flexibility') {
    sess.focus = sess.blocks.some(b => b.kind === 'flow') ? ['mobility', 'flow'] : ['mobility'];
    for (const b of sess.blocks) if (b.kind === 'mobility') b.title = 'Mobility & stretching';
  }
  if (focus === 'flow') sess.focus = sess.blocks.some(b => b.kind === 'flow') ? ['flow', 'mobility'] : ['mobility'];
  if (muscles.length) sess.muscles = muscles;
  if (shift) sess.levelShift = shift;
  sess.estMinutes = estimateMinutes(sess, library);
  return sess;
}

// =============================================================================================
// Morning Taiso and flow helpers (v1.2)
// =============================================================================================
/**
 * The optional 3-minute Morning Taiso as its own session (id 'T'), adapted to the profile (no hops for low impact,
 * smaller ranges for injuries). Returns null while its tradition is unverified (no ?preview=traditions) or when
 * unsuitable (75+, or new to exercise at 65+, until the seated version exists). A 'T' log keeps the day streak alive
 * and never counts toward the weekly target.
 */
export function generateMorningTaiso(profile = null, levels = null, library) {
  const p = profile ? { ...profile } : { ...QUICK_DEFAULT };
  const ctx = buildCtx(p, library);
  resolveLevels(ctx, p, profile ? levels : null, library);
  const ex = ctx.byId.radio_taiso_1;
  if (!ex || !ctx.isAvail(ex)) return null;
  const s = { id: MORNING_TAISO_SESSION_ID, name: ex.name, focus: ['flow', 'mobility'], light: true, estMinutes: 0,
    blocks: [{ kind: 'flow', title: ex.name, items: [flowItem(ex, ctx)] }] };
  s.estMinutes = estimateMinutes(s, library);
  return s;
}

/** Ids of the flows this profile can do now (gate, injuries, age). For the UI: e.g. hide Quick 'flow' when empty. */
export function availableFlows(profile, library) {
  const p = profile || QUICK_DEFAULT;
  const ok = availabilityFn(p, derive(p));
  return (library || []).filter(e => e.mode === 'flow' && ok(e)).map(e => e.id);
}
