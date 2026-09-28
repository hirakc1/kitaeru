// Kitaeru animation v2 clips: legs (squat, split squat, calves, hinge / bridges). See lib.js for conventions.
import { P, T_INDEX } from '../core.js';
import { CLIPS, angXY, solve, rep, repUp, box } from './lib.js';

const SQUAT_KEYS = {
  top: { rootY: 91.5, pitch: 2, shFlex: 6, elbow: 12, head: 0, cervical: 0 },
  down: { rootY: 73, rootX: -9, pitch: 17, lumbar: -2, thoracic: 2, shFlex: 44, elbow: 8, head: -7, cervical: -3 },
  bottom: { rootY: 47, rootX: -19, pitch: 36, lumbar: -5, thoracic: 5, shFlex: 86, shAbd: 7, elbow: 5, head: -16, cervical: -9, fingers: 10 },
  up: { rootY: 65, rootX: -13, pitch: 27, lumbar: -4, thoracic: 3, shFlex: 64, elbow: 6, head: -12, cervical: -6 },
};
const squat = over => ({
  cam: { az: 30, el: 6 }, floor: true, trail: ['hipR'],
  lag: .16, headLag: .4, shift: .6, shiftRoll: .8,
  legs: { both: { mode: 'ik', foot: 'flat', toeOut: 13, ankle: (sd, s) => [0, 7.5, 13.5 * s], pole: s => [1, 0, .34 * s] } },
  balance: S => (S.pt.heelR[0] + S.pt.ballR[0]) / 2 + .5,
  base: { rootY: 91, pitch: 3, elbow: 10, palm: 90, wrist: 5, fingers: 25, shAbd: 5 },
  keys: structuredClone(SQUAT_KEYS),
  timeline: rep('top', 'bottom', { p0: .5, via1: ['down'], at1: [0, .42, 1], via2: ['up'], at2: [0, .45, 1] }),
  ...over,
});
const bodyweight_squat = squat({ name: 'Bodyweight squat', muscles: { primary: ['quads', 'glutes'], secondary: ['adductors', 'hamstrings', 'calves'] } });
// sit back to a box until the glutes just touch, pause, stand tall
const BOX_H = 45;
const box_squat = (() => {
  const c = squat({
    name: 'Box squat', muscles: { primary: ['quads', 'glutes'], secondary: ['adductors', 'hamstrings'] }, _bx: -30,
    timeline: rep('top', 'bottom', { p0: .5, p1: .6, via1: ['down'], at1: [0, .42, 1], via2: ['up'], at2: [0, .45, 1] }),
    props: c => [box([c._bx - 20, 0, -21], [c._bx + 20, BOX_H, 21])],
    prep({ settle }) {
      const k = c.keys, b = k.bottom = { ...k.bottom, pitch: 30, shFlex: 78 };
      const seat = S => P(S.F.pelvis, [-3.7, -7.5, 0]);   // ischial tuberosities
      b.rootY = solve(40, 80, y => seat(settle({ ...b, rootY: y }))[1], BOX_H + 3);
      c._bx = seat(settle(b))[0] - 6;
      k.up = { ...k.up, rootY: (b.rootY + k.top.rootY) / 2 + 2 }; k.down = { ...k.down, rootY: (b.rootY + k.top.rootY) / 2 + 4 };
    },
  });
  return c;
})();

// unilateral: right (near) foot forward and flat, left ball planted with the heel up; the back knee drops straight down
const split_squat = {
  name: 'Split squat', cam: { az: 30, el: 6 }, floor: true, trail: ['hipR'], still: .22, swap: true,   // sides alternate each rep
  muscles: { primary: ['quads', 'glutes'], secondary: ['adductors', 'hamstrings'] },
  lag: .16, headLag: .4, shift: .35, shiftRoll: .5,
  legs: {
    R: { mode: 'ik', foot: 'flat', toeOut: 7, ankle: () => [40, 7.5, 10], pole: () => [1, 0, .12] },
    L: { mode: 'ik', foot: 'toes', toeOut: 5, ball: () => [-49, 0, -10], lift: (s, ch) => ch.ankleL, pole: () => [1, -.35, -.05] },
  },
  base: { elbow: 12, palm: 90, wrist: 5, fingers: 25, shAbd: 6, shFlex: 4 },
  keys: {
    top: { rootX: -3, rootY: 81, pitch: 4, ankleL: 40, head: 0 },
    bottom: { rootX: -4, rootY: 53, pitch: 8, lumbar: -2, thoracic: 1, ankleL: 64, head: -5, cervical: -2, shFlex: 8 },
  },
  timeline: rep('top', 'bottom', { p0: .4, ecc: 2, con: 1.1 }),
};
// rear foot laces-down on a bench (fixed foot: toes back, sole up), front foot well forward; sink straight down
const bulgarian_split_squat = {
  name: 'Bulgarian split squat', cam: { az: 30, el: 6 }, floor: true, trail: ['hipR'], still: .22, swap: true,
  muscles: { primary: ['quads', 'glutes'], secondary: ['adductors', 'hamstrings', 'hip_flexors'] },
  lag: .16, headLag: .4, shift: .35, shiftRoll: .5,
  legs: {
    R: { mode: 'ik', foot: 'flat', toeOut: 7, ankle: () => [44, 7.5, 10], pole: () => [1, 0, .12] },
    L: { mode: 'ik', foot: 'fixed', ankle: () => [-58, BOX_H + 3.6, -10], pole: () => [1, -.6, 0],
      axes: (sd, s) => [[-.94, -.34, 0], [.34, -.94, 0], [0, 0, s]] },
  },
  base: { elbow: 12, palm: 90, wrist: 5, fingers: 25, shAbd: 6, shFlex: 4 },
  keys: {
    top: { rootX: -4, rootY: 82, pitch: 7, head: -2 },
    bottom: { rootX: -2, rootY: 54, pitch: 14, lumbar: -2, thoracic: 2, head: -7, cervical: -3, shFlex: 10 },
  },
  timeline: rep('top', 'bottom', { p0: .4, ecc: 2, con: 1.1 }),
  props: [box([-82, 0, -24], [-46, BOX_H, 24])],
  prep({ settle }) {
    const k = this.keys;   // front knee just soft at the top; front thigh about level at the bottom
    k.top.rootY = solve(60, 100, y => settle({ ...k.top, rootY: y }).reachLeg, .985);
    k.bottom.rootY = solve(35, 70, y => { const S = settle({ ...k.bottom, rootY: y }); return S.pt.hipR[1] - S.pt.kneeR[1]; }, 2);
  },
};

// balls pinned, heels rise; the body stays balanced over the forefoot
function calfRaise(f) {
  const c = {
    cam: { az: 28, el: 5 }, floor: true, trail: ['heelR'], still: .45,
    lag: .12, headLag: .35, shift: .3, shiftRoll: .4, _h0: .9,
    legs: { both: { mode: 'ik', foot: 'toes', toeOut: 8, knee: 3, ball: (sd, s) => [0, 0, 11 * s], pole: s => [1, 0, .2 * s] } },
    balance: S => { const u = Math.min(1, Math.max(0, (S.pt.heelR[1] - c._h0) / 6)); return S.pt.ballR[0] - 9 + 7.5 * u; },
    base: { rootY: 90, pitch: 1, elbow: 12, palm: 90, wrist: 4, fingers: 22, shAbd: 5 },
    keys: { down: { rootY: 90 }, up: { rootY: 99, head: -1, thoracic: -1 } },
    timeline: repUp('down', 'up', { p0: .35, con: .9, p1: .6, ecc: 1.5 }),
    prep({ settle }) {
      const k = c.keys, S0 = settle({ ...k.down, rootY: 70 });
      c._h0 = S0.pt.heelR[1];
      const y = solve(70, 105, y => settle({ ...k.down, rootY: y }).pt.heelR[1], c._h0 + .05);   // highest hip with heels down
      k.down.rootY = y - .6; k.up.rootY = y + 9;
    },
  };
  return Object.assign(c, f(c));
}
const calf_raise = calfRaise(() => ({ name: 'Calf raise', muscles: { primary: ['calves'], secondary: [] } }));
// on the right foot, left foot tucked behind; hips over the standing foot; fingertips on a wall. Sides alternate.
const single_leg_calf_raise = calfRaise(c => ({
  name: 'Single-leg calf raise', swap: true, still: .22, cam: { az: -32, el: 6 },   // from behind: calves and the wall face _wx: 62,
  muscles: { primary: ['calves'], secondary: [] },
  legs: { R: { mode: 'ik', foot: 'toes', toeOut: 6, knee: 3, ball: () => [0, 0, 10], pole: () => [1, 0, .15] } },
  arms: { L: { mode: 'ik', grip: 'palm', normal: () => [-1, 0, 0], pole: [-.3, -1, .6], dir: () => [0, 1, .1], target: () => [c._wx, 118, -16] } },
  base: { rootY: 90, pitch: 1, elbowR: 12, palmR: 90, wristR: 4, fingersR: 22, shAbdR: 5, fingersL: 20,
    hipFlexL: 14, kneeL: 78, ankleL: 25, hipAbdL: -2, rootZ: 7, roll: -2 },
  keys: { down: { rootY: 90 }, up: { rootY: 99, head: -1, thoracic: -1 } },
  timeline: repUp('down', 'up', { p0: .35, con: .9, p1: .6, ecc: 2.4 }),
  props: c => [box([c._wx, 0, -70], [c._wx + 8, 200, 60], -1e4)],
  prep({ settle }) {
    const k = c.keys, S0 = settle({ ...k.down, rootY: 70 }, true);
    c._h0 = S0.pt.heelR[1];
    const y = solve(70, 105, y => settle({ ...k.down, rootY: y }, true).pt.heelR[1], c._h0 + .05);
    k.down.rootY = y - .6; k.up.rootY = y + 9;
    const g = settle(k.up, true).pt.glenoidL;   // wall where the fingertips rest (90% reach at the top)
    c._wx = g[0] + 2.4 + Math.sqrt(Math.max(0, (.9 * 55) ** 2 - (118 - 5.2 - g[1]) ** 2 - (-16 - g[2]) ** 2));
  },
}));

// ---------------------------------------------------------------------------------------------------------------
// supine bridges: the upper back is pinned to the floor, feet flat, palms planted by the hips; the head stays down
// (neck flexion solved per key)
function bridge(single) {
  const c = {
    name: single ? 'Single-leg glute bridge' : 'Glute bridge', cam: { az: 26, el: 11 }, floor: true, trail: ['pelvis'], still: single ? .22 : .45, swap: single,
    muscles: single ? { primary: ['glutes'], secondary: ['hamstrings', 'abs', 'obliques'] } : { primary: ['glutes'], secondary: ['hamstrings', 'abs'] },
    lag: .15, headLag: .1, shift: 0, shiftRoll: 0, _fx: 40, _ax: -20,
    pin: { pt: S => P(S.vert[T_INDEX(4)], [-7.5, 0, 0]), at: [0, 0] },
    legs: { R: { mode: 'ik', foot: 'flat', toeOut: 6, ankle: (sd, s) => [c._fx, 7.5, 11 * s], pole: s => [.35, 1, .1 * s] } },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [.1, 0, 1], dir: s => [1, 0, .06 * s], target: (sd, s) => [c._ax, 0, 23 * s] } },
    base: { pitch: -92, fingers: 0, wrist: 0, ...(single ? { hipFlexL: 116, kneeL: 122, ankleL: 14, hipAbdL: 3 } : {}) },
    keys: {
      down: { pitch: -92, lumbar: 1, cervical: 0, head: 0 },
      up: { pitch: -118, lumbar: 3, thoracic: 2, cervical: 0, head: 0 },
    },
    timeline: repUp('down', 'up', { p0: .4, con: 1.0, p1: .55, ecc: 1.7 }),
    prep({ settle }) {
      const k = c.keys;
      const occ = S => P(S.F.head, [-8.2, 7.5, 0])[1];         // back of the skull
      const sac = S => P(S.F.pelvis, [-10, 1, 0])[1];          // back of the sacrum (with soft tissue)
      const headDown = key => { k[key].cervical = solve(-30, 70, v => occ(settle({ ...k[key], cervical: v }, true)), 2.2); };
      // lying: pelvis resting on the floor
      k.down.pitch = solve(-110, -75, p => sac(settle({ ...k.down, pitch: p }, true)), 3.2);
      headDown('down');
      const S = settle(k.down, true), H = S.pt.hipR, G = S.pt.glenoidR;
      c._fx = H[0] + 46;
      const dz = 23 - G[2], dy = G[1] - 2.4;
      c._ax = G[0] + Math.sqrt(Math.max(0, (.9 * 55) ** 2 - dz * dz - dy * dy)) + 5.2;
      // top: shoulders, hips and knees in one line
      k.up.pitch = solve(-140, -100, p => { const T = settle({ ...k.up, pitch: p }, true); return angXY(T.pt.hipR, T.pt.kneeR) - angXY(T.pt.glenoidR, T.pt.hipR); }, single ? 4 : 2);
      headDown('up');
    },
  };
  if (!single) c.legs.L = c.legs.R;
  return c;
}

// upper back on a bench edge (pinned), feet flat with shins vertical at the top, hands on the hips; chin tucked
const THRUST_H = 42;
const hip_thrust = (() => {
  const c = {
    name: 'Hip thrust', cam: { az: 26, el: 9 }, floor: true, trail: ['pelvis'], still: .45,
    muscles: { primary: ['glutes'], secondary: ['hamstrings', 'quads', 'adductors'] },
    lag: .15, headLag: .15, shift: 0, shiftRoll: 0, _fx: 50,
    pin: { pt: S => P(S.vert[T_INDEX(6)], [-7.5, 0, 0]), at: [0, THRUST_H + 1.5] },
    legs: { both: { mode: 'ik', foot: 'flat', toeOut: 8, ankle: (sd, s) => [c._fx, 7.5, 13 * s], pole: s => [.35, 1, .12 * s] } },
    base: { shFlex: 0, shAbd: 86, elbow: 6, palm: 90, wrist: 0, fingers: 15, cervical: 18, head: 6 },   // arms out along the bench
    keys: { down: { pitch: -48, lumbar: 2 }, up: { pitch: -90, lumbar: 3, thoracic: 1 } },
    timeline: repUp('down', 'up', { p0: .4, con: 1.1, p1: 2, ecc: 1.8 }),
    props: [box([-40, 0, -62], [0, THRUST_H, 62])],
    prep({ settle }) {
      const k = c.keys;
      k.down.pitch = solve(-80, -20, p => P(settle({ ...k.down, pitch: p }, true).F.pelvis, [-10, 1, 0])[1], 17);   // hips low
      for (let i = 0; i < 3; i++) {   // top: shoulders-hips-knees straight, shins vertical
        k.up.pitch = solve(-120, -60, p => { const T = settle({ ...k.up, pitch: p }, true); return angXY(T.pt.hipR, T.pt.kneeR) - angXY(T.pt.glenoidR, T.pt.hipR); }, 1);
        c._fx = settle(k.up, true).pt.kneeR[0] + 2;
      }
    },
  };
  return c;
})();

Object.assign(CLIPS, {
  bodyweight_squat, box_squat, split_squat, bulgarian_split_squat, calf_raise, single_leg_calf_raise,
  glute_bridge: bridge(false), single_leg_glute_bridge: bridge(true), hip_thrust,
});
