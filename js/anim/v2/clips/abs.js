// Kitaeru animation v2 clips: core and skill (batch 3): supine core, hanging raises, L-sit, side plank hip dip,
// bird dog, crow and handstands. See lib.js for conventions. Every clip follows the fact-checked cues in
// js/data/exercises.js.
import { P, T_INDEX } from '../core.js';
import { CLIPS, solve, hold, rep, repUp, hang, BAR_Y, sidePlank, quad, rod, box, angXY } from './lib.js';

// ---------------------------------------------------------------------------------------------------------------
// supine: lying on the back, head at -x. pin: the upper back (T4) on the floor; each key's pitch is solved so the
// pelvis rests too (lower back flat), and the neck so the back of the head rests (unless the key lifts it: headUp).
const occ = S => P(S.F.head, [-8.2, 7.5, 0])[1];         // back of the skull
const sac = S => P(S.F.pelvis, [-10, 1, 0])[1];          // back of the sacrum (with soft tissue)
function supine(f) {
  const c = {
    floor: true, lag: .15, headLag: .1, shift: 0, shiftRoll: 0, still: .3,
    pin: { pt: S => P(S.vert[T_INDEX(4)], [-7.5, 0, 0]), at: [0, 0] },
    base: { pitch: -92, fingers: 10, wrist: 0, palm: 90 },
    prep({ settle }) {
      for (const n in c.keys) {
        const k = c.keys[n];
        if (k.pitch == null) k.pitch = solve(-115, -70, p => sac(settle({ ...k, pitch: p }, true)), 3.2);
        if (!k.headUp) k.cervical = solve(-30, 70, v => occ(settle({ ...k, cervical: v }, true)), 2.2);
      }
      c.prep2?.({ settle });
    },
  };
  return Object.assign(c, f(c));
}

// dead bug: on the back, arms reaching to the ceiling, hips and knees at 90°; lower back pressed into the floor;
// breathe out as the right arm reaches overhead and the left leg extends long just off the floor; back; other side.
const dead_bug = supine(() => ({
  name: 'Dead bug', cam: { az: 28, el: 14 }, swap: true, trail: ['palmR'],
  base: { pitch: null, shFlex: 92, shAbd: 4, elbow: 4, hipFlex: 90, knee: 90, ankle: 12, hipAbd: 3, lumbar: 3 },
  keys: {
    a: {},
    b: { shFlexR: 172, hipFlexL: 14, kneeL: 4, ankleL: 25 },
  },
  timeline: [{ hold: 'a', dur: .4, b: .9 }, { from: 'a', to: 'b', dur: 1.5, r1: .3, r2: .4, breath: 'out', effort: 1 }, { hold: 'b', dur: .5, b: 0 },
    { from: 'b', to: 'a', dur: 1.4, r1: .3, r2: .4, breath: 'in' }],
}));

// lying leg raise: hands by the sides, palms down; straight legs lift to vertical and lower slowly without the back
// arching (they stop just off the floor)
const lying_leg_raise = supine(c => ({
  name: 'Lying leg raise', cam: { az: 28, el: 12 }, trail: ['ankleR'], _ax: -20,
  arms: { both: { mode: 'ik', grip: 'palm', pole: [.1, 0, 1], dir: s => [1, 0, .06 * s], target: (sd, s) => [c._ax, 0, 24 * s] } },
  base: { knee: 3, ankle: 20, hipAbd: 2, lumbar: 3 },
  keys: { down: { hipFlex: 12 }, up: { hipFlex: 90 } },
  timeline: repUp('down', 'up', { p0: .4, con: 1.3, p1: .4, ecc: 2.4 }),
  prep2({ settle }) {
    const S = settle(c.keys.down, true), H = S.pt.hipR;
    c._ax = H[0] + 6;   // palms by the hips
  },
}));

// hollow body hold: lower back glued to the floor (the pelvis pinned, spine flexed), shoulders and legs just off it;
// arms by the ears, legs long and low, toes pointed; a breathing hold
const hollow_body_hold = (() => {
  const c = {
    name: 'Hollow body hold', cam: { az: 28, el: 12 }, floor: true, trail: [], still: 0,
    lag: .15, headLag: .1, shift: 0, shiftRoll: 0,
    pin: { pt: S => P(S.F.pelvis, [-10, 1, 0]), at: [0, 3.2] },
    base: { pitch: -80, lumbar: 8, thoracic: 10, cervical: 18, head: 6, shFlex: 172, shAbd: 4, elbow: 4, palm: 90, fingers: 5, wrist: 0,
      hipFlex: 24, knee: 2, ankle: 35, hipAbd: 2 },
    keys: { a: {}, b: { hipFlex: 25, thoracic: 10.6, shFlex: 173 } },
    timeline: hold('a', 'b', 4.4),
    prep({ settle }) {   // the shoulder blades just clear the floor
      for (const n in c.keys) c.keys[n].pitch = solve(-95, -60, p => P(settle({ ...c.keys[n], pitch: p }, true).vert[T_INDEX(4)], [-7.5, 0, 0])[1], 7);
    },
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// hanging from the bar (lib.js hang), shoulders active, no swinging: knees to the chest with the pelvis curling up, or
// straight legs to bar height
function hangRaise(name, top, muscles) {
  return hang(c => ({
    name, cam: { az: 70, el: 6 }, trail: ['ankleR'], still: .1, muscles,
    base: { hipFlex: 4, knee: 6, ankle: 25, hipFlexL: 4, kneeL: 6, fingers: 200 },
    keys: { hang: { rootY: 110, scapElev: -.6, scapProt: -4, thoracic: -2, head: 0 }, top: { rootY: 110, scapElev: -.8, scapProt: -6, head: -3, ...top } },
    timeline: repUp('hang', 'top', { p0: .5, con: 1.3, p1: .4, ecc: 2.2 }),
    prep({ build }) { for (const n of ['hang', 'top']) c.keys[n].rootY = solve(80, 160, y => build({ ...c.keys[n], rootY: y }).reach, .975); },
  }));
}
const hanging_knee_raise = hangRaise('Hanging knee raise', { hipFlex: 110, knee: 118, hipFlexL: 110, kneeL: 118, lumbar: 14, pitch: -4, ankle: 30, ankleL: 30 });
const hanging_leg_raise = hangRaise('Hanging leg raise', { hipFlex: 108, knee: 2, hipFlexL: 108, kneeL: 2, lumbar: 18, pitch: -8, ankle: 38, ankleL: 38 });

// ---------------------------------------------------------------------------------------------------------------
// L-sit on parallettes: arms locked, shoulders pushed down, legs straight and level, toes pointed; a breathing hold
const PH = 22, PG = 23;
const parallettes = [-1, 1].flatMap(s => [rod([[-20, PH, PG * s], [20, PH, PG * s]], 1.8),
  rod([[-16, PH, PG * s], [-20, 0, PG * s]], 1.4, 0, 1), rod([[16, PH, PG * s], [20, 0, PG * s]], 1.4, 0, 1),
  rod([[-24, 1, PG * s], [-14, 1, PG * s]], 1.4, 0, 1), rod([[14, 1, PG * s], [24, 1, PG * s]], 1.4, 0, 1)]);
const l_sit = (() => {
  const c = {
    name: 'L-sit', cam: { az: 38, el: 8 }, floor: true, trail: [], still: 0, props: parallettes,
    lag: .15, headLag: .3, shift: 0, shiftRoll: 0,
    arms: { both: { mode: 'ik', grip: 'bar', palm: s => [0, 0, s], pole: [-1, -.2, .2], target: (sd, s) => [0, PH, PG * s] } },
    balance: () => 0,   // the centre of mass over the hands (x = 0)
    base: { pitch: 14, lumbar: 4, thoracic: 3, cervical: 0, head: -4, scapElev: -1.2, scapProt: 4, knee: 0, ankle: 40, fingers: 150, hipAbd: 0 },
    keys: { a: { rootY: 60, hipFlex: 96 }, b: { rootY: 60, hipFlex: 97, thoracic: 3.6 } },
    timeline: hold('a', 'b', 4.4),
    prep({ settle }) {
      for (const n in c.keys) {
        const k = c.keys[n];
        k.rootY = solve(PH + 10, PH + 80, y => settle({ ...k, rootY: y }).reach, .985);
        k.hipFlex = solve(60, 130, h => { const S = settle({ ...k, hipFlex: h }, true); return S.pt.ankleR[1] - S.pt.hipR[1]; }, 0);   // legs level
      }
    },
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// side plank hip dip: from a side plank on the left forearm, the hips lower towards the floor, then lift back up past
// neutral; smooth and controlled (sidePlank rig, lib.js)
const side_plank_hip_dip = sidePlank(() => ({
  name: 'Side plank hip dip', trail: ['pelvis'], still: .3,
  muscles: { primary: ['obliques'], secondary: ['abs', 'glutes'] },
  base: { yaw: -90, shAbdR: 86, shFlexR: 4, elbowR: 4, palmR: 0, fingersR: 12, wristR: 0, cervical: 2, head: 0, fingersL: 25 },
  keys: { mid: { bodyAngle: 20 }, dip: { bodyAngle: 5 }, up: { bodyAngle: 28 } },
  timeline: [{ hold: 'mid', dur: .3, b: .5 }, { from: 'mid', to: 'dip', dur: 1.2, r1: .3, r2: .4, breath: 'in' },
    { from: 'dip', via: ['mid'], to: 'up', dur: 1.4, r1: .3, r2: .4, breath: 'out', effort: 1 }, { hold: 'up', dur: .3, b: 0 },
    { from: 'up', to: 'mid', dur: .9, r1: .3, r2: .4, breath: 'in' }],
}));

// ---------------------------------------------------------------------------------------------------------------
// bird dog: on all fours (hands under the shoulders, knees under the hips), the right arm and the left leg reach long
// and level; the back stays still (a glass of water on it); back down; sides alternate
const bird_dog = quad(c => ({
  name: 'Bird dog', cam: { az: 20, el: 12 }, swap: true, still: .3, trail: ['palmR'],
  keys: {
    quad: {},
    lift: { releaseR: .5, handXR: 18, handYR: 30, handZR: 8, palmR: 90, hipFlexL: 70, kneeL: 110, ankleL: 45 },
    reach: { releaseR: 1, handXR: -18, handYR: 51, handZR: 6, palmR: 90, scapUpR: 20, hipFlexL: -8, kneeL: 3, ankleL: 30, head: -2 },
  },
  timeline: [{ hold: 'quad', dur: .4, b: .8 }, { from: 'quad', via: ['lift'], to: 'reach', at: [0, .35, 1], dur: 1.5, r1: .25, r2: .35, breath: 'out' },
    { hold: 'reach', dur: 1, b: 0 }, { from: 'reach', via: ['lift'], to: 'quad', at: [0, .65, 1], dur: 1.4, r1: .3, r2: .4, breath: 'in' }],
}));

// ---------------------------------------------------------------------------------------------------------------
// crow pose: hands shoulder-width, fingers spread; the knees rest high on the backs of the upper arms; lean forward
// until the feet float, eyes ahead; a breathing hold (a pillow in front of the face)
const crow_pose = (() => {
  const c = {
    name: 'Crow pose', cam: { az: 26, el: 8 }, floor: true, trail: [], still: 0, _hx: 30, _hz: 20,
    lag: .15, headLag: .3, shift: 0, shiftRoll: 0,
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.9, -1, .35], dir: s => [1, 0, .15 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { pitch: 72, lumbar: 16, thoracic: 14, cervical: -30, head: -16, scapProt: 8, hipFlex: 142, knee: 156, ankle: 45, hipAbd: 18, fingers: 0, wrist: 0 },
    keys: { a: { rootX: 0, rootY: 50 }, b: { rootX: .6, rootY: 50, thoracic: 14.6 } },
    timeline: hold('a', 'b', 4.4),
    props: c => [box([c._hx + 18, 0, -22], [c._hx + 48, 12, 22], -1e4)],   // the pillow
    prep({ settle }) {   // palms a little in front of the shoulders; arms bent (the knees rest on the backs of the upper arms)
      for (let i = 0; i < 3; i++) {
        const a = c.keys.a, G = settle(a, true).pt.glenoidR;
        c._hx = G[0] + 12; c._hz = G[2] + 2;
        for (const n in c.keys) c.keys[n].rootY = solve(20, 90, y => settle({ ...c.keys[n], rootY: y }).reach, .8);
      }
    },
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// handstands: upside down, palms planted shoulder-width, arms locked (97.5%). pitch ~180: the chest faces -x.
function handstand(f) {
  const c = {
    floor: true, trail: [], still: 0, _hz: 19, lag: .15, headLag: .3, shift: 0, shiftRoll: 0,
    arms: { both: { mode: 'ik', grip: 'palm', pole: [.3, 1, .3], dir: s => [-1, 0, .12 * s], target: (sd, s) => [0, 0, c._hz * s] } },
    base: { scapElev: 1.6, scapUp: 18, cervical: -6, head: -10, hipFlex: 0, knee: 0, ankle: 40, fingers: 0, wrist: 0, lumbar: -2, thoracic: -2 },
    prep({ settle }) {
      for (const n in c.keys) {
        const k = c.keys[n];
        k.rootY = solve(80, 170, y => settle({ ...k, rootY: y }).reach, k.reach ?? .975);
        if (k.balance !== false) k.rootX = solve(-40, 40, x => settle({ ...k, rootX: x }).com[0], k.comX ?? 0);   // over the hands
      }
      c.prep2?.({ settle });
    },
  };
  return Object.assign(c, f(c));
}
// wall handstand, chest to the wall: hands a hand-length from the wall, feet walked up it; push tall, glutes
// squeezed, ribs in; a breathing hold
const WALL_X = -26;
const wall_handstand = handstand(c => ({
  name: 'Wall handstand', cam: { az: 50, el: 6 },
  keys: { a: { pitch: 186, balance: false, rootX: -6 }, b: { pitch: 186, balance: false, rootX: -6, scapElev: 1.8 } },
  timeline: hold('a', 'b', 4.4),
  props: [box([WALL_X - 16, 0, -60], [WALL_X, 230, 60], -1e4)],
  prep2({ settle }) {   // feet lean on the wall: toes just touching it
    for (const n in c.keys) { const k = c.keys[n]; k.pitch = solve(178, 200, p => settle({ ...k, pitch: p }, true).pt.toeR[0], WALL_X + .6); }
  },
}));
// freestanding handstand: kick up with control, then balance on the fingertips, wrists, shoulders and hips stacked:
// small corrections over the hands
const freestanding_handstand = handstand(() => ({
  name: 'Freestanding handstand', cam: { az: 30, el: 6 },
  keys: { a: { pitch: 180, comX: -1.2 }, b: { pitch: 181.2, comX: 1.2, scapElev: 1.7 } },
  timeline: [{ cyclic: ['a', 'b'], dur: 3.6, breath: 'cycle', breaths: 1 }],
}));

// wall handstand push-up, back to the wall: hands about 20 cm from it, heels resting on it; lower under control to a
// head tripod (the crown just above the floor), then press hard, glutes and legs squeezed
const WHX = 24;
const wall_handstand_push_up = handstand(c => ({
  name: 'Wall handstand push-up', cam: { az: -36, el: 6 }, trail: ['headTop'], still: .1,
  muscles: { primary: ['front_delts', 'triceps'], secondary: ['side_delts', 'traps', 'upper_back'] },
  keys: { top: { pitch: 175, balance: false }, bottom: { pitch: 172, balance: false, scapElev: 2.2, scapUp: 6, cervical: -10, head: -14 } },
  timeline: rep('top', 'bottom', { p0: .4, ecc: 2.2, con: 1.2 }),
  props: [box([WHX, 0, -50], [WHX + 14, 205, 50], -1e4)],
  prep2({ settle }) {
    const k = c.keys, b = k.bottom;
    for (let i = 0; i < 3; i++) {
      for (const n in k) { const kk = k[n]; kk.pitch = solve(160, 185, p => settle({ ...kk, pitch: p }).pt.heelR[0], WHX - 1.5); }   // heels on the wall
      k.top.rootY = solve(80, 170, y => settle({ ...k.top, rootY: y }).reach, .975);
      b.rootY = solve(40, k.top.rootY, y => settle({ ...b, rootY: y }).pt.headTop[1], 3);   // crown 3 cm off the floor
    }
  },
}));

Object.assign(CLIPS, { wall_handstand_push_up, dead_bug, lying_leg_raise, hollow_body_hold, hanging_knee_raise, hanging_leg_raise, l_sit, side_plank_hip_dip,
  bird_dog, crow_pose, wall_handstand, freestanding_handstand });
