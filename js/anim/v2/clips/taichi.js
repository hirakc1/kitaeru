// Kitaeru animation v2 clips: Tai Chi, forms of the Simplified 24-form in taichi_short_flow plus the golden rooster.
// Slow and continuous (short ramps, no rep bounce), open palms (handShape 1), the eyes following the leading hand
// (headYaw). Every clip follows the fact-checked cues in js/data/exercises.js.
// Stepping (core leg mode 'step'): each foot is placed by channels (heel x, lateral z, lift, toe-out, pitch). Within a
// phase a planted foot keeps identical channels in every key, so it cannot slide; a swing foot lifts along a spline
// through a mid-swing key and lands heel first (pitch > 0) or flat; a rear foot peels off the ball (pitch < 0); a foot
// that turns while bearing weight pivots on its heel with the toes up. An empty-stance foot touches with the ball only
// (lift 0, pitch < 0) and bears no weight. Weight transfer is keyed ('weight', share on the right foot) and checked by
// QA. clip.travel is the net displacement per cycle; the camera follows the pelvis so the loop wraps.
// Free hands are placed in the upper-chest (T4) frame: handX forward, handY up the spine, handZ out to that hand's side.
import { mirrorPose } from '../core.js';
import { CLIPS, feet, mix, noFeet, swing, stepLegs, arm } from './lib.js';

const PALM = { handShape: 1, fingers: 8 };                   // open Tai Chi palm, fingers gently extended
// one camera, view box (frame 'tc') and floor (the travelling grid) for every form, so a flow never changes view
const CAM = { az: 40, el: 8 };
const tc = (name, over) => ({
  name, cam: CAM, frame: 'tc', grid: true, floor: true, trail: [], lag: .3, headLag: .45, shift: 0, shiftRoll: 0, stepBalance: true, legs: stepLegs,
  arms: { both: { mode: 'ik', grip: 'free', pole: [-.3, -1, .6] } },
  ...over,
  base: { rootY: 84, pitch: 2, weight: .5, cervical: 2, wrist: 6, ...PALM, ...(over.base || {}) },
});
const ph = (from, to, dur, breath, via, at) => ({ from, via, to, at, dur, r1: .15, r2: .2, breath });

// ready stance: feet parallel, shoulder-width, knees soft, arms relaxed by the sides
const SW = 16;
const READY_FEET = feet({ R: [-5, SW, 0], L: [-5, -SW, 0] });   // (toes forward: the walking forms start and end here)
const HANDS_DOWN = arm(5, 30, 50, { palm: 100, wrist: 4 });

// ---------------------------------------------------------------------------------------------------------------
// Commencement (起势): feet shoulder-width, knees soft; breathe in as the arms float up to shoulder height, breathe out
// as you sink a little and press the palms down; rise and let the arms settle. 1 rep ≈ 9 s.
const taichi_commencement = tc('Commencement', {
  counts: 1, trail: ['palmR'],
  keys: {
    a: { rootY: 87, ...READY_FEET, ...HANDS_DOWN },
    mid: { rootY: 87, ...READY_FEET, ...arm(45, 12, 49, { palm: 150, wrist: -20 }) },   // wrists lead, fingers trail
    up: { rootY: 87, ...READY_FEET, ...arm(88, 10, 48, { palm: 170, wrist: 10 }) },       // shoulder height, palms down
    down: { rootY: 81, ...READY_FEET, ...arm(38, 12, 44, { palm: 175, wrist: 20 }), pitch: 3 },   // sink, palms press down
  },
  timeline: [ph('a', 'up', 3.4, 'in', ['mid'], [0, .45, 1]), ph('up', 'down', 3.2, 'out'), ph('down', 'a', 2.4, 'in')],
});

// ---------------------------------------------------------------------------------------------------------------
// Closing (收势): the hands cross in front, the palms turn down and part to shoulder width, then lower slowly to the
// sides as you breathe out; the feet come together and you stand quietly. It ends still (the last step of the flow);
// shown on its own the loop restarts from the ready stance with a quick fade (cut).
const taichi_closing = (() => {
  const TOG = feet({ R: [-5, SW, 0], L: [-5, SW - 17, 0] });   // the left foot comes in beside the right
  const k = {
    a: { rootY: 85, ...READY_FEET, ...HANDS_DOWN },
    rise: { rootY: 85, ...READY_FEET, ...arm(50, -12, 46, { palm: 90, wrist: 0 }) },
    cross: { rootY: 85, ...READY_FEET, ...arm(80, -22, 44, { palm: 90, wrist: 0 }) },          // wrists crossed in front
    part: { rootY: 85, ...READY_FEET, ...arm(84, 10, 47, { palm: 175, wrist: 8 }) },         // palms down, shoulder width
    low: { rootY: 86, ...READY_FEET, ...HANDS_DOWN },
    shift: { rootY: 87, weight: .85, ...READY_FEET, ...HANDS_DOWN },
    tog: { rootY: 88, weight: .5, ...TOG, ...HANDS_DOWN },
    quiet: { rootY: 88.3, weight: .5, ...TOG, ...HANDS_DOWN },
  };
  return tc('Closing', {
    counts: 1, cut: true, trail: ['palmR'], keys: k,
    timeline: [ph('a', 'cross', 2.4, 'in', ['rise']), ph('cross', 'part', 2, 'in'), ph('part', 'low', 3.4, 'out'), ph('low', 'shift', 1.2),
      swing(k, 'sL', 'shift', 'tog', 'L', [-5, -SW, 0], [-5, SW - 17, 0], { lift: 3, dur: 1.4 }), ph('tog', 'quiet', 3.6, 'in'), { hold: 'quiet', dur: 1.6, b: .5 }],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// Walking forms in bow stances (part the wild horse's mane, brush knee and push): three reps, left, right, left, as in the
// 24-form, advancing from the ready stance and back to it one travel on (a flow step of 3 reps is exactly one cycle and
// ends standing, ready for the next form). Each rep, the stepping foot from a bow stance on the other foot:
//   sit back (the front toes lift and turn out on the heel) -> the weight flows forward -> the stepping foot draws in
//   beside the standing ankle, ball touching (empty stance), and pauses -> it steps out heel first -> the weight shifts
//   forward into the new bow stance. The first rep starts from the ready stance (the weight shifts onto the right foot
//   instead of sitting back); after the third the rear foot comes up beside the front one. Feet stay on their lanes
//   (shoulder-width); strides of 46 cm.
// `B` gives the body and hands for one left-foot rep from a right bow stance: [0] right bow stance (a right rep done),
// [1] sit back, [2] weight forward, [3] the pause by the ankle, [4] heel strike; the left bow stance is the mirror of [0].
const STRIDE = 46, OUT = 35, X0 = -5, TRAVEL_W = 3 * STRIDE;
function bowWalk({ name, B, muscles }) {
  const Bm = B.map(b => mirrorPose(b));                              // the same rep stepping the right foot
  const k = {}, tl = [];
  // a key from feet and weight (share on the right); root starting guesses, the stepping balance does the rest
  const at = (key, R, L, w, body) => {
    k[key] = { ...body, weight: w, rootX: R[0] * w + L[0] * (1 - w) + 7, rootZ: (R[1] * w + L[1] * (1 - w)) * .8, ...feet({ R, L }) };
    return key;
  };
  const feetR = { R: [X0, SW, 0], L: [X0, -SW, 0] };
  at('E0', feetR.R, feetR.L, .5, { ...HANDS_DOWN, rootY: 84 });
  const rep = (i, sd) => {
    const P = sd === 'L' ? B : Bm, done = sd === 'L' ? Bm[0] : B[0], pre = 'r' + i;
    const other = sd === 'L' ? 'R' : 'L';
    const w = x => (sd === 'L' ? x : 1 - x);                        // weight on the right, from the stepping side's view
    const RL = (st, mv) => (sd === 'L' ? [st, mv] : [mv, st]);      // [right foot, left foot]
    let stand = feetR[other].slice(), move = feetR[sd].slice();
    const from = i === 0 ? 'E0' : 'r' + (i - 1) + 'F';
    if (i === 0) tl.push(ph(from, at(pre + 'b', ...RL(stand, move), w(1), P[2]), 2.2, 'in'));
    else {
      at(pre + 'a', ...RL([stand[0], stand[1], OUT, 0, 14], move), w(.15), P[1]);   // sit back: front toes up, turned out
      k[pre + 'at'] = { ...mix(k[from], k[pre + 'a'], .35), ...feet({ [other]: [stand[0], stand[1], 3, 0, 15] }) };   // toes lift first
      tl.push(ph(from, pre + 'a', 1.6, 'in', [pre + 'at'], [0, .35, 1]));
      stand = [stand[0], stand[1], OUT];
      tl.push(ph(pre + 'a', at(pre + 'b', ...RL(stand, move), w(1), P[2]), 1.3, 'in'));
    }
    const beside = [stand[0] + 2, stand[1] + (sd === 'L' ? -14 : 14), 8, 0, -32];   // by the standing ankle, ball touching
    at(pre + 'c', ...RL(stand, beside), w(1), P[3]);
    tl.push(swing(k, pre + 's1', pre + 'b', pre + 'c', sd, move, beside, { lift: 5, dur: 1.3, breath: 'in' }));
    tl.push({ hold: pre + 'c', dur: .6, b: 1 });                    // the pause by the ankle
    const land = [stand[0] + STRIDE, move[1], 0, 0, 16];            // heel first, on its own lane
    at(pre + 'd', ...RL(stand, land), w(1), P[4]);
    tl.push(swing(k, pre + 's2', pre + 'c', pre + 'd', sd, beside, land, { lift: 3, dur: 1.5, breath: 'out' }));
    const front = [land[0], land[1], 0];
    tl.push(ph(pre + 'd', at(pre + 'F', ...RL(stand, front), w(.3), done), 1.8, 'out'));
    feetR[sd] = front; feetR[other] = stand;
  };
  rep(0, 'L'); rep(1, 'R'); rep(2, 'L');
  // close: the weight forward onto the left foot, the right foot comes up beside it, the arms settle: ready, one travel on
  const R2 = feetR.R, L2 = feetR.L, up = [L2[0], SW, 0];
  tl.push(ph('r2F', at('X1', R2, L2, 0, { ...k.r2F, ...HANDS_DOWN }), 1.6, 'out'));
  at('X2', up, L2, 0, k.X1);
  tl.push(swing(k, 'Xs', 'X1', 'X2', 'R', R2, up, { lift: 4, dur: 1.4, breath: 'in' }));
  k.E1 = { ...k.E0, rootX: k.E0.rootX + TRAVEL_W, footXR: k.E0.footXR + TRAVEL_W, footXL: k.E0.footXL + TRAVEL_W };
  tl.push(ph('X2', 'E1', 1.4, 'out'));
  return tc(name, { counts: 3, travel: [TRAVEL_W, 0, 0], muscles, keys: k, timeline: tl });
}

// Part the wild horse's mane (野马分鬃): hold an imaginary ball at the chest (the upper hand on the side of the standing
// leg), step out heel first into a bow stance, turn the waist and let the hands part diagonally: the front hand rises
// to eye height, palm obliquely up, the other presses down beside the hip. Eyes follow the front hand.
const MANE_END_R = { ...arm(100, 22, 47, { palm: 40, wrist: 0 }, 'R'), ...arm(24, 32, 45, { palm: 150, wrist: 8 }, 'L') };   // right hand at eye height
const taichi_part_horse_mane = bowWalk({
  name: 'Part the wild horse’s mane',
  muscles: { primary: ['quads', 'glutes'], secondary: ['obliques', 'adductors', 'side_delts'] },
  B: [
    { weight: .7, rootX: -16, rootZ: 2, rootY: 76, pitch: 3, yaw: -12, headYaw: -10, head: -2, ...MANE_END_R },   // right bow stance, right hand up
    { weight: .15, rootX: -26, rootZ: 1, rootY: 75, pitch: 1, yaw: -16, headYaw: -12,                             // sit back, hands begin to turn
      ...arm(92, 12, 45, { palm: 100, wrist: 0 }, 'R'), ...arm(34, 14, 44, { palm: 120, wrist: 4 }, 'L') },
    { weight: 1, rootX: 2, rootZ: 7, rootY: 75, pitch: 2, yaw: -24, headYaw: -14,                                 // weight forward: hold the ball
      ...arm(78, -8, 40, { palm: 170, wrist: 6 }, 'R'), ...arm(40, -22, 42, { palm: 10, wrist: 0 }, 'L') },
    { weight: 1, rootX: 3, rootZ: 7, rootY: 75, pitch: 2, yaw: -26, headYaw: -14,                                 // foot beside the ankle: ball held
      ...arm(78, -10, 40, { palm: 175, wrist: 6 }, 'R'), ...arm(40, -24, 42, { palm: 5, wrist: 0 }, 'L') },
    { weight: 1, rootX: 5, rootZ: 6, rootY: 71, pitch: 2, yaw: -8, headYaw: -2,                                   // heel lands; hands begin to part
      ...arm(52, 8, 42, { palm: 160, wrist: 6 }, 'R'), ...arm(66, -8, 44, { palm: 30, wrist: 0 }, 'L') },
  ],
});

// Brush knee and push (搂膝拗步): turn the waist; one hand circles back beside the ear; the foot draws in by the ankle
// and pauses, then steps forward into a bow stance as the lower hand brushes past the knee and the other palm pushes.
// The eyes follow the pushing hand.
const taichi_brush_knee = bowWalk({
  name: 'Brush knee and push',
  muscles: { primary: ['quads', 'glutes'], secondary: ['obliques', 'triceps', 'front_delts'] },
  B: [
    { weight: .7, rootX: -16, rootZ: 2, rootY: 76, pitch: 4, yaw: 0, head: -2,                                    // right bow stance: left palm pushed
      ...arm(82, -6, 47, { palm: 60, wrist: -45 }, 'L'), ...arm(24, 30, 45, { palm: 130, wrist: -10 }, 'R') },
    { weight: .15, rootX: -26, rootZ: 1, rootY: 75, pitch: 1, yaw: -16, head: -1, headYaw: -6,
      handXL: 36, handYL: -6, handZL: 1, palmL: 90, wristL: -20, handXR: 22, handYR: -28, handZR: 20, palmR: 110, wristR: -4 },
    { weight: 1, rootX: 2, rootZ: 7, rootY: 75, pitch: 3, yaw: -28, head: -2, headYaw: -14,                       // right hand circles back
      handXL: 28, handYL: -8, handZL: -4, palmL: 120, wristL: 0, handXR: 2, handYR: 8, handZR: 24, palmR: 80, wristR: 10 },
    { weight: 1, rootX: 3, rootZ: 7, rootY: 75, pitch: 3, yaw: -32, head: -2, headYaw: -16,                       // beside the ear: pause
      handXL: 26, handYL: -10, handZL: -4, palmL: 130, wristL: 0, handXR: -2, handYR: 14, handZR: 22, palmR: 70, wristR: 10 },
    { weight: 1, rootX: 5, rootZ: 6, rootY: 71, pitch: 3, yaw: -12, head: -2, headYaw: -4,                        // step: the left hand brushes low
      handXL: 26, handYL: -26, handZL: 6, palmL: 150, wristL: -5, handXR: 8, handYR: 10, handZR: 18, palmR: 70, wristR: 5 },
  ],
});

// ---------------------------------------------------------------------------------------------------------------
// White crane spreads its wings (白鹤亮翅): the weight settles on the back (right) leg, the left foot rests in front on
// its ball (empty stance); the right hand rises beside the right temple, the left presses down beside the left hip.
// From the ready stance and back. 1 rep ≈ 9 s.
const taichi_white_crane = (() => {
  const k = {
    a: { rootY: 86, weight: .5, ...READY_FEET, ...HANDS_DOWN },
    back: { rootY: 82, weight: 1, yaw: -8, ...READY_FEET, handXR: 28, handYR: -14, handZR: 2, palmR: 20, handXL: 30, handYL: -6, handZL: -4, palmL: 160 },   // hold a ball, left hand on top
    crane: { rootY: 80, weight: 1, yaw: 6, headYaw: 4, ...feet({ R: [-5, SW, 0], L: [14, -8, 4, 0, -30] }),
      handXR: 16, handYR: 16, handZR: 20, palmR: 80, wristR: 8, handXL: 16, handYL: -36, handZL: 18, palmL: 160, wristL: 10 },
  };
  return tc('White crane spreads its wings', {
    counts: 1, trail: ['palmR'], keys: k,
    timeline: [ph('a', 'back', 2.4, 'in'),
      swing(k, 'sL', 'back', 'crane', 'L', [-5, -SW, 0], [14, -8, 4, 0, -30], { lift: 3, dur: 2.2, breath: 'out' }), { hold: 'crane', dur: 1.6, b: .5 },
      swing(k, 'rL', 'crane', 'back', 'L', [14, -8, 4, 0, -30], [-5, -SW, 0], { lift: 3, dur: 1.8, breath: 'in' }), ph('back', 'a', 1.8, 'out')],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// Golden rooster stands on one leg (金鸡独立): near a wall or chair, lift one knee towards hip height as the same-side
// hand rises (elbow over the knee, fingers up at nose height), the other hand presses down beside the hip; breathe
// slowly. A slight balance sway on the standing foot. Right knee first (standing on the left); sides alternate.
const taichi_golden_rooster = (() => {
  const UPL = { weight: 0, rootY: 85, ...READY_FEET,
    handXR: 22, handYR: 12, handZR: 8, palmR: 90, wristR: 20, ...arm(22, 42, 47, { palm: 178, wrist: 65 }, 'L') };   // presses down beside the hip
  const knee = (dz, roll) => ({ ...UPL, rootY: 86, rootZ: dz, roll, ...feet({ R: [18, 10, 4, 40, 20], L: [-5, -SW, 0] }) });
  const k = { a: { rootY: 86, weight: .5, ...READY_FEET, ...HANDS_DOWN }, shift: { ...HANDS_DOWN, rootY: 85, weight: 0, ...READY_FEET },
    up0: knee(0, 0), upA: knee(.7, 1.2), upB: knee(-.6, -1) };
  return tc('Golden rooster stands on one leg', {
    swap: true, counts: 1, trail: [], keys: k, muscles: { primary: ['glutes', 'quads'], secondary: ['hip_flexors', 'calves', 'abs'] },
    timeline: [ph('a', 'shift', 1.4, 'in'), swing(k, 'kR', 'shift', 'up0', 'R', [-5, SW, 0], [18, 10, 4, 40, 20], { lift: 20, dur: 1.8, breath: 'in' }),
      { cyclic: ['up0', 'upA', 'up0', 'upB'], dur: 4.4, breath: 'cycle', breaths: 1 },   // the sway: a few mm over the standing foot
      swing(k, 'dR', 'up0', 'shift', 'R', [18, 10, 4, 40, 20], [-5, SW, 0], { lift: 20, dur: 1.6, breath: 'out' }), ph('shift', 'a', 1.2)],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// Cloud hands (云手) with side-steps. From the centre with the feet at the ready width: the waist turns right as the
// weight flows onto the right foot; the left foot steps out to the left; the weight flows back as the waist turns left;
// the right foot follows to the ready width again, 25 cm further left. Hands circle in turn, one at face
// height, one at the belly; the eyes follow the upper hand. One cycle = one rep, starting and ending in the ready
// stance, so a flow step of 3 reps ends where the next form starts.
const HL = { yaw: 24, twist: 16, rootY: 84, headYaw: 22, head: 3, bend: -2,
  handXL: 30, handYL: 17, handZL: 7, palmL: 40, wristL: 12, handXR: 27, handYR: -19, handZR: -10, palmR: 120, wristR: -6 };
const HLR = { yaw: 0, twist: 0, rootY: 86, headYaw: 0, head: 4,
  handXR: 33, handYR: 2, handZR: -3, palmR: 70, wristR: 4, handXL: 30, handYL: -6, handZL: 3, palmL: 110, wristL: 0 };
const HR = mirrorPose(HL), HRL = mirrorPose(HLR);
const CH_STEP = 25, HX = -5;                                    // the left foot steps out 25 cm, the right follows
const taichi_cloud_hands = (() => {
  const zR = SW, zL = -SW, zLo = zL - CH_STEP, zRi = zR - CH_STEP;
  const k = {
    C0: { ...HLR, weight: .5, rootZ: 0, ...feet({ R: [HX, zR, 0], L: [HX, zL, 0] }) },
    K2: { ...HR, weight: 1, rootZ: zR - 4, ...feet({ R: [HX, zR, 0], L: [HX, zL, 0] }) },
    K3: { ...mix(HR, HRL, .4), weight: 1, rootZ: zR - 5, rootY: 81, ...feet({ R: [HX, zR, 0], L: [HX, zLo, 0] }) },
    RL: { ...HRL, weight: .5, rootY: 81, rootZ: (zR + zLo) / 2, ...feet({ R: [HX, zR, 0], L: [HX, zLo, 0] }) },
    K4: { ...HL, weight: 0, rootY: 82, rootZ: zLo + 5, ...feet({ R: [HX, zR, 0], L: [HX, zLo, 0] }) },
    K5: { ...mix(HL, HLR, .4), weight: 0, rootZ: zLo + 6, rootY: 84, ...feet({ R: [HX, zRi, 0], L: [HX, zLo, 0] }) },
    C1: { ...HLR, weight: .5, rootZ: -CH_STEP, ...feet({ R: [HX, zRi, 0], L: [HX, zLo, 0] }) },
  };
  return tc('Cloud hands', {
    counts: 1, travel: [0, 0, -CH_STEP], lag: .35, headLag: .5,
    muscles: { primary: ['obliques', 'quads'], secondary: ['adductors', 'side_delts'] },
    base: { rootY: 84, pitch: 2, fingers: 14, wrist: 6, cervical: 2 },
    keys: k,
    timeline: [ph('C0', 'K2', 1.6, 'out'), swing(k, 'sL', 'K2', 'K3', 'L', [HX, zL, 0, 0, 0], [HX, zLo, 0, 0, 0], { dur: 1.7, breath: 'in' }),
      ph('K3', 'K4', 2.6, 'out', ['RL']), swing(k, 'sR', 'K4', 'K5', 'R', [HX, zR, 0, 0, 0], [HX, zRi, 0, 0, 0], { dur: 1.7, breath: 'in' }),
      ph('K5', 'C1', 1.4, 'out')],
  });
})();

Object.assign(CLIPS, { taichi_commencement, taichi_part_horse_mane, taichi_white_crane, taichi_brush_knee, taichi_cloud_hands,
  taichi_golden_rooster, taichi_closing });
