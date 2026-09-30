// Kitaeru animation v2 clips (v1.3b): standing practice. Standing post (站桩), bow stance (弓步) and the breath-paced walk.
// See lib.js / taichi.js for the conventions (stepping legs, keyed weight, free hands in the T4 frame). Every clip follows
// the fact-checked cues in js/data/exercises.js.
import { CLIPS, stand, feet, arm, swing, hold } from './lib.js';

// ---------------------------------------------------------------------------------------------------------------
// Standing post (站桩, the three-circle stance 三圆式): feet about shoulder-width, the toes turned slightly in (两足尖内扣,
// CMQG; Lyu 2021 Table 1), knees softly bent (a high stance); the arms rounded at chest height as if hugging a tree, palms
// facing the chest, fingers apart, the elbows a little lower than the wrists; still, relaxed, breathing slowly. Front view.
// A still hold: the breath and a tiny sway (a few mm of weight over the feet) keep it alive.
const ZZ_FEET = { R: [-5, 16, -7], L: [-5, -16, -7] };   // toes slightly in (toe-out -7°)
const HUG = { handX: 36, handY: 4, handZ: 9, palm: 25, wrist: -8, fingers: 18, handShape: 1, elbowOut: .8 };
const zhan_zhuang = stand(ZZ_FEET, {
  name: 'Standing post', cam: { az: 50, el: 13 }, still: 0, trail: [], lag: .3, headLag: .3,
  arms: { both: { mode: 'ik', grip: 'free', pole: [-.4, -1, .7] } },
  base: { rootY: 85.2, pitch: 1, lumbar: -2, cervical: 2, ...HUG },
  keys: { a: { weight: .5 }, b: { weight: .53, rootY: 85, thoracic: -.8, scapElev: .2 } },
  timeline: hold('a', 'b', 6),
});

// ---------------------------------------------------------------------------------------------------------------
// Bow stance (弓步): a long step, the front knee bent to a half squat over the foot, the front toes turned slightly in; the
// back leg pushed straight, its toes angled forward; both heels down (Zhengzhou standard §5.3.1; Guangzhou course).
// Kitaeru's high bow stance (a shorter step, the front thigh well above level), trunk upright, fists at the waist. The
// front leg bears more of the weight (an animation choice; no split is stated). Three-quarter view; sides alternate.
const BOW = { R: [36, 11, -6], L: [-44, -12, 42] };      // right foot forward (toes slightly in), left foot back, turned out ~45°
const FISTS = { handShape: 2, handX: 7, handY: -28, handZ: 13, palm: 0, wrist: 0 };
const bow_stance = stand(BOW, {
  name: 'Bow stance', cam: { az: 38, el: 7 }, swap: true, still: 0, trail: [], lag: .3, headLag: .3,
  arms: { both: { mode: 'ik', grip: 'free', pole: [-1, -.25, .12] } },   // elbows point back
  base: { rootY: 78.5, pitch: 0, lumbar: -3, thoracic: -2, ...FISTS },
  keys: { a: { weight: .66 }, b: { weight: .67, rootY: 78.2, thoracic: -2.8 } },
  timeline: hold('a', 'b', 6),
});

// ---------------------------------------------------------------------------------------------------------------
// Breath-paced walk: walking on the spot, tall and loose, the breath paced to the steps. Shown at two steps in, two steps
// out (Asthma + Lung UK: "two steps in, two steps out"): the breathing ring fills over two steps and empties over two.
// Lower, easier steps than marching; the arms swing a little in opposition.
const FW = 11, ST = { R: [-5, FW, 6], L: [-5, -FW, 6] };
const swingArms = (fwd, deg) => {
  const back = fwd === 'R' ? 'L' : 'R';
  return { ...arm(deg, 6, 50, { palm: 90, fingers: 20 }, fwd), ...arm(-deg * .6, 12, 50, { palm: 90, fingers: 20 }, back) };
};
const breath_paced_walk = (() => {
  const k = {
    s: { weight: .5, rootY: 88, ...feet(ST), ...swingArms('R', 4) },
    wL: { weight: 0, rootY: 88, ...feet(ST), ...swingArms('L', 6) },
    s2: { weight: .5, rootY: 88, ...feet(ST), ...swingArms('L', 4) },
    wR: { weight: 1, rootY: 88, ...feet(ST), ...swingArms('R', 6) },
  };
  const step = sd => ({ mid: [8, (sd === 'R' ? 1 : -1) * FW, 6, 0, -20], lift: 14 });   // an easy step: the heel lifts, the knee a little forward
  const mR = swing(k, 'mR', 'wL', 's2', 'R', ST.R, ST.R, { ...step('R'), dur: .55 });
  const mL = swing(k, 'mL', 'wR', 's', 'L', ST.L, ST.L, { ...step('L'), dur: .55 });
  [[mR, 'L'], [mL, 'R']].forEach(([ph, fwd]) => ph.via.forEach((v, i) => Object.assign(k[v], swingArms(fwd, [12, 18, 12][i]))));
  // one breath in over the first two steps, out over the next two (the ring follows b0 -> b1 across the phases)
  const leg = (ph, b0, b1) => ({ ...ph, b0, b1 });
  const w = (from, to, b0, b1) => ({ from, to, dur: .12, r1: .3, r2: .3, b0, b1 });
  return stand({}, {
    name: 'Breath-paced walk', cam: { az: 36, el: 6 }, counts: 4, still: .2, trail: [], keys: k, base: { rootY: 88 },
    timeline: [w('s', 'wL', 0, .1), leg(mR, .1, .5), w('s2', 'wR', .5, .6), leg(mL, .6, 1),
      w('s', 'wL', 1, .9), leg(mR, .9, .5), w('s2', 'wR', .5, .4), leg(mL, .4, 0)],
  });
})();

Object.assign(CLIPS, { zhan_zhuang, bow_stance, breath_paced_walk });
