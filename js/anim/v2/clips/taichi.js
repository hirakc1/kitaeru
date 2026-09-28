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
const tc = (name, over) => ({
  name, floor: true, trail: [], lag: .3, headLag: .45, shift: 0, shiftRoll: 0, stepBalance: true, legs: stepLegs,
  arms: { both: { mode: 'ik', grip: 'free', pole: [-.3, -1, .6] } },
  ...over,
  base: { rootY: 84, pitch: 2, weight: .5, cervical: 2, wrist: 6, ...PALM, ...(over.base || {}) },
});
const ph = (from, to, dur, breath, via, at) => ({ from, via, to, at, dur, r1: .15, r2: .2, breath });

// ready stance: feet parallel, shoulder-width, knees soft, arms relaxed by the sides
const SW = 16;
const READY_FEET = feet({ R: [-5, SW, 4], L: [-5, -SW, 4] });
const HANDS_DOWN = arm(5, 30, 50, { palm: 100, wrist: 4 });

// ---------------------------------------------------------------------------------------------------------------
// Commencement (起势): feet shoulder-width, knees soft; breathe in as the arms float up to shoulder height, breathe out
// as you sink a little and press the palms down; rise and let the arms settle. 1 rep ≈ 9 s.
const taichi_commencement = tc('Commencement', {
  cam: { az: 60, el: 8 }, counts: 1, trail: ['palmR'],
  keys: {
    a: { rootY: 87, ...READY_FEET, ...HANDS_DOWN },
    mid: { rootY: 87, ...READY_FEET, ...arm(45, 12, 49, { palm: 150, wrist: -20 }) },   // wrists lead, fingers trail
    up: { rootY: 87, ...READY_FEET, ...arm(88, 10, 48, { palm: 170, wrist: 10 }) },       // shoulder height, palms down
    down: { rootY: 81, ...READY_FEET, ...arm(38, 12, 44, { palm: 175, wrist: 20 }), pitch: 3 },   // sink, palms press down
  },
  timeline: [ph('a', 'up', 3.4, 'in', ['mid'], [0, .45, 1]), ph('up', 'down', 3.2, 'out'), ph('down', 'a', 2.4, 'in')],
});

// ---------------------------------------------------------------------------------------------------------------
// Closing (收势): palms turn down and part to shoulder width, lower slowly to the sides as you breathe out, then the
// feet come together and you stand quietly. The loop opens again: the left foot steps back out, the hands rise and cross.
const taichi_closing = (() => {
  const TOG = feet({ R: [-5, SW, 4], L: [-5, SW - 17, 4] });   // the left foot comes in beside the right
  const k = {
    a: { rootY: 85, ...READY_FEET, ...arm(80, -22, 44, { palm: 90, wrist: 0 }) },            // wrists crossed in front
    part: { rootY: 85, ...READY_FEET, ...arm(84, 10, 47, { palm: 175, wrist: 8 }) },         // palms down, shoulder width
    low: { rootY: 86, ...READY_FEET, ...HANDS_DOWN },
    shift: { rootY: 87, weight: .85, ...READY_FEET, ...HANDS_DOWN },
    tog: { rootY: 88, weight: .5, ...TOG, ...HANDS_DOWN },
    quiet: { rootY: 88, weight: .5, ...TOG, ...HANDS_DOWN },
    sh2: { rootY: 87, weight: .85, ...TOG, ...HANDS_DOWN },
    open: { rootY: 87, weight: .85, ...READY_FEET, ...HANDS_DOWN },
    rise: { rootY: 85, weight: .5, ...READY_FEET, ...arm(50, -12, 46, { palm: 90, wrist: 0 }) },
  };
  return tc('Closing', {
    cam: { az: 60, el: 8 }, counts: 1, trail: ['palmR'], keys: k,
    timeline: [ph('a', 'part', 2.2, 'in'), ph('part', 'low', 3.4, 'out'), ph('low', 'shift', 1.2),
      swing(k, 'sL', 'shift', 'tog', 'L', [-5, -SW, 4], [-5, SW - 17, 4], { lift: 3, dur: 1.4 }), { hold: 'quiet', dur: 2.2, b: .5 },
      ph('quiet', 'sh2', 1), swing(k, 'oL', 'sh2', 'open', 'L', [-5, SW - 17, 4], [-5, -SW, 4], { lift: 3, dur: 1.4 }),
      ph('open', 'rise', 1.4, 'in'), ph('rise', 'a', 1.2, 'in')],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// Walking forms in bow stances (part the wild horse's mane, brush knee and push), left step then right, advancing.
// One side, stepping the left foot, from a right bow stance:
//   0 right bow stance        1 sit back: front toes up, turning out on the heel
//   2 weight flows forward     3 the rear foot draws in beside the standing ankle, ball touching (empty stance): pause
//   4 step out, heel first     5 weight shifts forward into a left bow stance
// The second half is the mirror image one stride further on. `B` gives the body and hands for phases 0 to 4 (phase 5
// is the mirror of phase 0, one stride on); the footholds are shared.
const STRIDE = 46, LANE = 9, OUT = 35;
function bowWalk({ name, B, cam = { az: 36, el: 8 }, muscles, scale = 1 }) {
  B = B.map(b => ({ ...b }));
  B.push({ ...mirrorPose(B[0]), rootX: B[0].rootX + STRIDE });
  const F = [   // [heelX, worldZ, toeOut, lift, pitch]
    { R: [0, LANE, 0], L: [-STRIDE, -LANE, OUT] },
    { R: [0, LANE, OUT, 0, 14], L: [-STRIDE, -LANE, OUT] },           // sit back; front toes up, turning out on the heel
    { R: [0, LANE, OUT], L: [-STRIDE, -LANE, OUT] },                  // weight forward; the rear heel peels as needed (core)
    { R: [0, LANE, OUT], L: [-3, -LANE + 5, 8, 0, -32] },             // drawn in beside the ankle: ball touching, heel up
    { R: [0, LANE, OUT], L: [STRIDE, -LANE, 0, 0, 16] },              // step out, heel strike
    { R: [0, LANE, OUT], L: [STRIDE, -LANE, 0] },                     // left bow stance
  ];
  const k = {};
  const second = f => ({ R: [f.L[0] + STRIDE, -f.L[1], ...f.L.slice(2)], L: [f.R[0] + STRIDE, -f.R[1], ...f.R.slice(2)] });
  B.forEach((b, i) => { k['A' + i] = { ...b, ...feet(F[i]) }; });
  for (let i = 1; i <= 5; i++) {
    const m = mirrorPose(noFeet(k['A' + i]));
    k['B' + i] = { ...m, rootX: m.rootX + STRIDE, ...feet(second(F[i])) };
  }
  // sitting back: the front toes lift first, then turn out on the heel
  const toesUp = (a, b, sd, f) => ({ ...mix(k[a], k[b], .35), ...feet({ [sd]: f }) });
  k.A0t = toesUp('A0', 'A1', 'R', [0, LANE, 3, 0, 15]);
  k.A5t = toesUp('A5', 'B1', 'L', [STRIDE, -LANE, 3, 0, 15]);
  const s = x => x * scale;
  const side = (P, t, sw, S2) => [
    ph(P + '0', P + '1', s(1.6), 'in', [P === 'A' ? 'A0t' : 'A5t'], [0, .35, 1]),   // sit back, the front toes lifting first
    ph(P + '1', P + '2', s(1.3), 'in'),
    swing(k, sw + 'a', P + '2', P + '3', sw.slice(-1), t(F[2]).L, t(F[3]).L, { lift: 5, dur: s(1.3), breath: 'in' }),
    { hold: P + '3', dur: s(.6), b: 1 },                                  // the pause by the ankle
    swing(k, sw + 'b', P + '3', P + '4', sw.slice(-1), t(F[3]).L, t(F[4]).L, { lift: 3, dur: s(1.5), breath: 'out' }),
    ph(P + '4', S2, s(1.8), 'out'),
  ];
  // second half: 'B0' is A5 (the left bow stance); its footholds are the mirrored ones (the moving foot is the right)
  k.B0 = k.A5;
  const tA = f => f, tB = f => { const g = second(f); return { L: g.R, R: g.L }; };
  const tl = [...side('A', tA, 'sL', 'A5'), ...side('B', tB, 'sR', 'B5')];
  return tc(name, { cam, counts: 2, travel: [2 * STRIDE, 0, 0], muscles, keys: k, timeline: tl });
}

// Part the wild horse's mane (野马分鬃): hold an imaginary ball at the chest (the upper hand on the side of the standing
// leg), step out heel first into a bow stance, turn the waist and let the hands part diagonally: the front hand rises
// to eye height, palm obliquely up, the other presses down beside the hip. Eyes follow the front hand.
const MANE_END_R = { ...arm(100, 22, 47, { palm: 40, wrist: 0 }, 'R'), ...arm(24, 32, 45, { palm: 150, wrist: 8 }, 'L') };   // right hand at eye height
const taichi_part_horse_mane = bowWalk({
  name: 'Part the wild horse’s mane',
  muscles: { primary: ['quads', 'glutes'], secondary: ['obliques', 'adductors', 'side_delts'] },
  B: [
    { weight: .7, rootX: -16, rootZ: 2, rootY: 80, pitch: 3, yaw: -12, headYaw: -10, head: -2, ...MANE_END_R },   // right bow stance, right hand up
    { weight: .15, rootX: -26, rootZ: 1, rootY: 79, pitch: 1, yaw: -16, headYaw: -12,                             // sit back, hands begin to turn
      ...arm(92, 12, 45, { palm: 100, wrist: 0 }, 'R'), ...arm(34, 14, 44, { palm: 120, wrist: 4 }, 'L') },
    { weight: 1, rootX: 2, rootZ: 7, rootY: 78, pitch: 2, yaw: -24, headYaw: -14,                                 // weight forward: hold the ball
      ...arm(78, -8, 40, { palm: 170, wrist: 6 }, 'R'), ...arm(40, -22, 42, { palm: 10, wrist: 0 }, 'L') },
    { weight: 1, rootX: 3, rootZ: 7, rootY: 77, pitch: 2, yaw: -26, headYaw: -14,                                 // foot beside the ankle: ball held
      ...arm(78, -10, 40, { palm: 175, wrist: 6 }, 'R'), ...arm(40, -24, 42, { palm: 5, wrist: 0 }, 'L') },
    { weight: 1, rootX: 5, rootZ: 6, rootY: 77, pitch: 2, yaw: -8, headYaw: -2,                                   // heel lands; hands begin to part
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
    { weight: .7, rootX: -16, rootZ: 2, rootY: 80, pitch: 4, yaw: 0, head: -2,                                    // right bow stance: left palm pushed
      ...arm(82, -6, 47, { palm: 60, wrist: -45 }, 'L'), ...arm(24, 30, 45, { palm: 130, wrist: -10 }, 'R') },
    { weight: .15, rootX: -26, rootZ: 1, rootY: 79, pitch: 1, yaw: -16, head: -1, headYaw: -6,
      handXL: 36, handYL: -6, handZL: 1, palmL: 90, wristL: -20, handXR: 22, handYR: -28, handZR: 20, palmR: 110, wristR: -4 },
    { weight: 1, rootX: 2, rootZ: 7, rootY: 77, pitch: 3, yaw: -28, head: -2, headYaw: -14,                       // right hand circles back
      handXL: 28, handYL: -8, handZL: -4, palmL: 120, wristL: 0, handXR: 2, handYR: 8, handZR: 24, palmR: 80, wristR: 10 },
    { weight: 1, rootX: 3, rootZ: 7, rootY: 77, pitch: 3, yaw: -32, head: -2, headYaw: -16,                       // beside the ear: pause
      handXL: 26, handYL: -10, handZL: -4, palmL: 130, wristL: 0, handXR: -2, handYR: 14, handZR: 22, palmR: 70, wristR: 10 },
    { weight: 1, rootX: 5, rootZ: 6, rootY: 77, pitch: 3, yaw: -12, head: -2, headYaw: -4,                        // step: the left hand brushes low
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
    crane: { rootY: 80, weight: 1, yaw: 6, headYaw: 4, ...feet({ R: [-5, SW, 4], L: [14, -8, 4, 0, -30] }),
      handXR: 16, handYR: 16, handZR: 20, palmR: 80, wristR: 8, handXL: 16, handYL: -36, handZL: 18, palmL: 160, wristL: 10 },
  };
  return tc('White crane spreads its wings', {
    cam: { az: 42, el: 8 }, counts: 1, trail: ['palmR'], keys: k,
    timeline: [ph('a', 'back', 2.4, 'in'),
      swing(k, 'sL', 'back', 'crane', 'L', [-5, -SW, 4], [14, -8, 4, 0, -30], { lift: 3, dur: 2.2, breath: 'out' }), { hold: 'crane', dur: 1.6, b: .5 },
      swing(k, 'rL', 'crane', 'back', 'L', [14, -8, 4, 0, -30], [-5, -SW, 4], { lift: 3, dur: 1.8, breath: 'in' }), ph('back', 'a', 1.8, 'out')],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// Golden rooster stands on one leg (金鸡独立): near a wall or chair, lift one knee towards hip height as the same-side
// hand rises (elbow over the knee, fingers up at nose height), the other hand presses down beside the hip; breathe
// slowly. A slight balance sway on the standing foot. Right knee first (standing on the left); sides alternate.
const taichi_golden_rooster = (() => {
  const UPL = { weight: 0, rootY: 85, ...READY_FEET,
    handXR: 22, handYR: 12, handZR: 8, palmR: 90, wristR: 20, handXL: 16, handYL: -36, handZL: 18, palmL: 160, wristL: 10 };
  const knee = (dz, roll) => ({ ...UPL, rootY: 86, rootZ: dz, roll, ...feet({ R: [18, 10, 4, 40, 20], L: [-5, -SW, 4] }) });
  const k = { a: { rootY: 86, weight: .5, ...READY_FEET, ...HANDS_DOWN }, shift: { ...HANDS_DOWN, rootY: 85, weight: 0, ...READY_FEET },
    up0: knee(0, 0), upA: knee(.7, 1.2), upB: knee(-.6, -1) };
  return tc('Golden rooster stands on one leg', {
    cam: { az: 50, el: 8 }, swap: true, counts: 1, trail: [], keys: k, muscles: { primary: ['glutes', 'quads'], secondary: ['hip_flexors', 'calves', 'abs'] },
    timeline: [ph('a', 'shift', 1.4, 'in'), swing(k, 'kR', 'shift', 'up0', 'R', [-5, SW, 4], [18, 10, 4, 40, 20], { lift: 20, dur: 1.8, breath: 'in' }),
      { cyclic: ['up0', 'upA', 'up0', 'upB'], dur: 4.4, breath: 'cycle', breaths: 1 },   // the sway: a few mm over the standing foot
      swing(k, 'dR', 'up0', 'shift', 'R', [18, 10, 4, 40, 20], [-5, SW, 4], { lift: 20, dur: 1.6, breath: 'out' }), ph('shift', 'a', 1.2)],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// Cloud hands (云手) with side-steps: turned left with the weight on the left foot, the right foot steps in beside it;
// the waist turns right as the weight flows onto the right foot; the left foot steps out to the left; the waist turns
// back left as the weight returns to the left foot. Hands circle in turn, one at face height, one at the belly; the
// eyes follow the upper hand. Net: 24 cm to the left per cycle, feet parallel.
const HL = { yaw: 24, twist: 16, rootY: 84, headYaw: 22, head: 3, bend: -2,
  handXL: 30, handYL: 17, handZL: 7, palmL: 40, wristL: 12, handXR: 27, handYR: -19, handZR: -10, palmR: 120, wristR: -6 };
const HLR = { yaw: 0, twist: 0, rootY: 86, headYaw: 0, head: 4,
  handXR: 33, handYR: 2, handZR: -3, palmR: 70, wristR: 4, handXL: 30, handYL: -6, handZL: 3, palmL: 110, wristL: 0 };
const HR = mirrorPose(HL), HRL = mirrorPose(HLR);
const WIDE = 44, NARROW = 20, TRAVEL = WIDE - NARROW, HX = -5;
const taichi_cloud_hands = (() => {
  const zL0 = -WIDE / 2, zR0 = WIDE / 2, zRin = zL0 + NARROW, zLout = zRin - WIDE;
  const k = {
    K0: { ...HL, weight: 0, rootZ: zL0 + 5, ...feet({ R: [HX, zR0], L: [HX, zL0] }) },
    K1: { ...mix(HL, HLR, .4), weight: 0, rootZ: zL0 + 6, rootY: 84, ...feet({ R: [HX, zRin], L: [HX, zL0] }) },
    LR: { ...HLR, weight: 0.5, rootZ: (zL0 + zRin) / 2 + 2, ...feet({ R: [HX, zRin], L: [HX, zL0] }) },
    K2: { ...HR, weight: 1, rootZ: zRin - 4, ...feet({ R: [HX, zRin], L: [HX, zL0] }) },
    K3: { ...mix(HR, HRL, .4), weight: 1, rootZ: zRin - 5, rootY: 84, ...feet({ R: [HX, zRin], L: [HX, zLout] }) },
    RL: { ...HRL, weight: 0.5, rootZ: (zRin + zLout) / 2 - 2, ...feet({ R: [HX, zRin], L: [HX, zLout] }) },
    K4: { ...HL, weight: 0, rootZ: zLout + 5, ...feet({ R: [HX, zRin], L: [HX, zLout] }) },
  };
  return tc('Cloud hands', {
    cam: { az: 58, el: 9 }, counts: 2, travel: [0, 0, -TRAVEL], lag: .35, headLag: .5,
    muscles: { primary: ['obliques', 'quads'], secondary: ['adductors', 'side_delts'] },
    arms: { both: { mode: 'ik', grip: 'free', pole: [-.15, -1, .75] } },
    base: { rootY: 84, pitch: 2, fingers: 14, wrist: 6, cervical: 2 },
    keys: k,
    timeline: [swing(k, 'sR', 'K0', 'K1', 'R', [HX, zR0, 4, 0, 0], [HX, zRin, 4, 0, 0], { dur: 1.7, breath: 'in' }), ph('K1', 'K2', 2.6, 'out', ['LR']),
      swing(k, 'sL', 'K2', 'K3', 'L', [HX, zL0, 4, 0, 0], [HX, zLout, 4, 0, 0], { dur: 1.7, breath: 'in' }), ph('K3', 'K4', 2.6, 'out', ['RL'])],
  });
})();

Object.assign(CLIPS, { taichi_commencement, taichi_part_horse_mane, taichi_white_crane, taichi_brush_knee, taichi_cloud_hands,
  taichi_golden_rooster, taichi_closing });
