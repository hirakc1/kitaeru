// Kitaeru animation v2 clips: flows (prototype for the v1.2 world-movement wave; not an app exercise yet).
import { mirrorPose } from '../core.js';
import { CLIPS } from './lib.js';

// simplified Yang-style cloud hands (yún shǒu), stationary: waist turn, weight transfer, hands circling, gaze following
// the upper hand. Continuous (cyclic spline, no pauses), 8 s per cycle, two breaths.
const taichi_cloud_hands = {
  name: 'Cloud hands (yún shǒu, simplified)', cam: { az: 58, el: 9 }, floor: true, trail: ['palmR', 'palmL'],
  muscles: { primary: ['quads', 'obliques'], secondary: ['glutes', 'side_delts', 'adductors'] },
  lag: .35, headLag: .5, shift: 0, shiftRoll: 0,
  legs: { both: { mode: 'ik', foot: 'flat', toeOut: 4, ankle: (sd, s) => [0, 7.5, 22 * s], pole: s => [1, 0, .12 * s] } },
  arms: { both: { mode: 'ik', grip: 'free', pole: [-.15, -1, .75] } },
  base: { rootY: 85, pitch: 2, fingers: 14, wrist: 6, cervical: 2 },
  keys: {},
  timeline: [{ cyclic: ['L', 'LR', 'R', 'RL'], dur: 8, breath: 'cycle', breaths: 2 }],
  prep() {
    const k = taichi_cloud_hands.keys;
    k.L = { yaw: 24, twist: 16, rootZ: -8, rootY: 84, headYaw: 14, head: 3, bend: -2,
      handXL: 30, handYL: 17, handZL: 7, palmL: 40, wristL: 12,
      handXR: 27, handYR: -19, handZR: -10, palmR: 120, wristR: -6 };
    k.LR = { yaw: 0, twist: 0, rootZ: 0, rootY: 86, headYaw: 0, head: 4,
      handXR: 33, handYR: 2, handZR: -3, palmR: 70, wristR: 4,
      handXL: 30, handYL: -6, handZL: 3, palmL: 110, wristL: 0 };
    k.R = mirrorPose(k.L); k.RL = mirrorPose(k.LR);
  },
};

Object.assign(CLIPS, { taichi_cloud_hands });
