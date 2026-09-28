// Kitaeru animation v2 clips: flows with stepping (pilot for v1.2 Tai Chi and anim batch 4 conditioning).
// Stepping (core leg mode 'step'): each foot is placed by channels (heel x, lateral z, lift, toe-out, pitch). Within a
// phase a planted foot keeps identical channels in every key, so it cannot slide; a swing foot lifts along a spline
// through a mid-swing key and lands heel first (pitch > 0) or flat; a rear foot peels off the ball (pitch < 0); a foot
// that turns while bearing weight pivots on its heel with the toes up. Weight transfer is keyed on the root and checked
// by QA (centre of mass over the base of support). clip.travel is the net displacement per cycle: the last key equals
// the first shifted by it, and the camera pans at a steady rate so the loop wraps seamlessly (the floor grid scrolls).
import { mirrorPose } from '../core.js';
import { CLIPS, R, feet, mix, noFeet, swing, stepLegs } from './lib.js';

// ---------------------------------------------------------------------------------------------------------------
// cloud hands (yún shǒu) with side-steps: turned left with the weight on the left foot, the right foot steps in beside
// it; the waist turns right as the weight flows onto the right foot; the left foot steps out to the left; the waist
// turns back left as the weight returns to the left foot. Net: 24 cm to the left per cycle, feet parallel.
const HL = { yaw: 24, twist: 16, rootY: 84, headYaw: 14, head: 3, bend: -2,
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
  const ph = (from, via, to, dur, breath) => ({ from, via: via ? [via] : undefined, to, dur, r1: .18, r2: .22, breath });
  return {
    name: 'Cloud hands (yún shǒu), side-stepping', cam: { az: 58, el: 9 }, floor: true, trail: [], travel: [0, 0, -TRAVEL],
    muscles: { primary: ['obliques', 'quads'], secondary: ['adductors', 'side_delts'] },
    lag: .35, headLag: .5, shift: 0, shiftRoll: 0, stepBalance: true,
    legs: stepLegs,
    arms: { both: { mode: 'ik', grip: 'free', pole: [-.15, -1, .75] } },
    base: { rootY: 84, pitch: 2, fingers: 14, wrist: 6, cervical: 2 },
    keys: k,
    timeline: [swing(k, 'sR', 'K0', 'K1', 'R', [HX, zR0, 4, 0, 0], [HX, zRin, 4, 0, 0], { dur: 1.5, breath: 'in' }), ph('K1', 'LR', 'K2', 2.3, 'out'),
      swing(k, 'sL', 'K2', 'K3', 'L', [HX, zL0, 4, 0, 0], [HX, zLout, 4, 0, 0], { dur: 1.5, breath: 'in' }), ph('K3', 'RL', 'K4', 2.3, 'out')],
  };
})();

// ---------------------------------------------------------------------------------------------------------------
// brush knee and push (lōu xī ào bù), left then right, advancing: from a right bow stance, sit back and turn the right
// toes out on the heel; the weight flows forward onto the right foot as the left heel peels up and the right hand
// circles back beside the ear; the left foot steps through and lands heel first; the weight shifts into a left bow
// stance as the right palm pushes and the left hand brushes past the left knee. Then the same on the other side.
// Net: two 46 cm steps (92 cm) per cycle.
const STRIDE = 46, LANE = 9, OUT = 32;
const taichi_brush_knee = (() => {
  // body + hands, first half (left step). The second half is the mirror image, one stride further on.
  const B = [
    { weight: 0.7, rootX: -16, rootZ: 2, rootY: 80, pitch: 4, yaw: 0, head: -2,
      handXL: 42, handYL: -3, handZL: 3, palmL: 60, wristL: -45, handXR: 14, handYR: -36, handZR: 17, palmR: 130, wristR: -10 },
    { weight: 0.15, rootX: -26, rootZ: 1, rootY: 79, pitch: 1, yaw: -16, head: -1, headYaw: -6,
      handXL: 36, handYL: -6, handZL: 1, palmL: 90, wristL: -20, handXR: 22, handYR: -28, handZR: 20, palmR: 110, wristR: -4 },
    { weight: 1, rootX: 2, rootZ: 7, rootY: 77, pitch: 3, yaw: -30, head: -2, headYaw: -8,
      handXL: 26, handYL: -10, handZL: -4, palmL: 120, wristL: 0, handXR: -2, handYR: 14, handZR: 22, palmR: 70, wristR: 10 },
    { weight: 1, rootX: 5, rootZ: 6, rootY: 77, pitch: 3, yaw: -12, head: -2, headYaw: -3,
      handXL: 22, handYL: -24, handZL: 6, palmL: 130, wristL: -5, handXR: 6, handYR: 12, handZR: 18, palmR: 70, wristR: 5 },
  ];
  B.push({ ...mirrorPose(B[0]), rootX: B[0].rootX + STRIDE });
  const F = [   // [heelX, worldZ, toeOut, lift, pitch]
    { R: [0, LANE, 0], L: [-STRIDE, -LANE, OUT] },
    { R: [0, LANE, OUT, 0, 14], L: [-STRIDE, -LANE, OUT] },           // sit back; front toes up, turning out on the heel
    { R: [0, LANE, OUT], L: [-STRIDE, -LANE, OUT] },                  // weight forward; the rear heel peels as needed (core)
    { R: [0, LANE, OUT], L: [STRIDE, -LANE, 0, 0, 16] },              // step through, heel strike
    { R: [0, LANE, OUT], L: [STRIDE, -LANE, 0] },                     // left bow stance
  ];
  const k = {};
  const second = f => ({ R: [f.L[0] + STRIDE, -f.L[1], ...f.L.slice(2)], L: [f.R[0] + STRIDE, -f.R[1], ...f.R.slice(2)] });
  B.forEach((b, i) => { k['A' + i] = { ...b, ...feet(F[i]) }; });
  for (let i = 1; i <= 4; i++) {
    const m = mirrorPose(noFeet(k['A' + i]));
    k['B' + i] = { ...m, rootX: m.rootX + STRIDE, ...feet(second(F[i])) };
  }
  k.A4 = { ...k.A4, ...feet(F[4]) };                                  // = B0 (the second half starts here)
  // sitting back: the front toes lift first, then turn out on the heel
  const toesUp = (a, b, sd, f) => ({ ...mix(k[a], k[b], .35), ...feet({ [sd]: f }) });
  k.A0t = toesUp('A0', 'A1', 'R', [0, LANE, 3, 0, 15]);
  k.A4t = toesUp('A4', 'B1', 'L', [STRIDE, -LANE, 3, 0, 15]);
  const ph = (from, to, dur, breath, via) => ({ from, via: via ? [via] : undefined, at: via ? [0, .35, 1] : undefined, to, dur, r1: .2, r2: .25, breath });
  return {
    name: 'Brush knee and push (lōu xī ào bù)', cam: { az: 36, el: 8 }, floor: true, trail: [], travel: [2 * STRIDE, 0, 0],
    muscles: { primary: ['quads', 'glutes'], secondary: ['obliques', 'triceps', 'front_delts'] },
    lag: .3, headLag: .4, shift: 0, shiftRoll: 0, stepBalance: true,
    legs: stepLegs,
    arms: { both: { mode: 'ik', grip: 'free', pole: [-.3, -1, .6] } },
    base: { fingers: 12, cervical: 2 },
    keys: k,
    timeline: [ph('A0', 'A1', 1.4, 'in', 'A0t'), ph('A1', 'A2', 1.3, 'in'),
      swing(k, 'sL', 'A2', 'A3', 'L', F[2].L, F[3].L, { mid: [2, -LANE + 4, 18, 6, -2], dur: 1.9, breath: 'in' }),   // passing the standing ankle
      ph('A3', 'A4', 1.6, 'out'), ph('A4', 'B1', 1.4, 'in', 'A4t'), ph('B1', 'B2', 1.3, 'in'),
      swing(k, 'sR', 'B2', 'B3', 'R', second(F[2]).R, second(F[3]).R, { mid: [2 + STRIDE, LANE - 4, 18, 6, -2], dur: 1.9, breath: 'in' }),
      ph('B3', 'B4', 1.6, 'out')],
  };
})();

Object.assign(CLIPS, { taichi_cloud_hands, taichi_brush_knee });
