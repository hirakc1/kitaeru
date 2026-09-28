// Kitaeru animation v2 clips: push (horizontal, vertical, dips). See lib.js for conventions.
import { CLIPS, R, dist, solve, rep, box, rod, frame, floorPlank, straighten, palmsUnder, palmsReach, pike } from './lib.js';

const push_up = floorPlank(c => ({
  name: 'Push-up', cam: { az: 20, el: 7 },
  muscles: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'] },
  keys: {
    top: { bodyAngle: 19, scapProt: 11, scapElev: .3 },
    bottom: { bodyAngle: 6.6, scapProt: -9, scapElev: -.2, cervical: -4, head: -14 },
  },
  timeline: rep('top', 'bottom'),
  prep({ settle }) { straighten(c, settle, 'top', 12); palmsUnder(c, settle, 'top', { lo: 8, hi: 30 }); },
}));

// knees pinned on the floor, thighs on the body line (hipFlex = _poff cancels the pelvis offset), shins flat
const knee_push_up = floorPlank(c => ({
  name: 'Knee push-up', cam: { az: 20, el: 8 }, shift: 0, shiftRoll: 0, qaPins: ['kneeR', 'kneeL'],
  muscles: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'] },
  legs: null,
  pin: { pt: S => S.pt.kneeR, at: [0, 5.4] },
  base: { cervical: 3, head: -8, thoracic: -2, lumbar: 1, wrist: 0, ankle: 58, hipAbd: 2 },
  derive(ch, lag) {
    const th = ch.bodyAngle, d = lag.bodyAngle - th;
    ch.pitch = 90 - th + c._poff - .8 * d;
    ch.hipFlexR = ch.hipFlexL = c._poff - .8 * d;
    ch.kneeR = ch.kneeL = th + 3;
  },
  keys: {
    top: { bodyAngle: 30, scapProt: 11, scapElev: .3 },
    bottom: { bodyAngle: 9, scapProt: -9, scapElev: -.2, cervical: -4, head: -14 },
  },
  timeline: rep('top', 'bottom', { ecc: 1.8, con: .9 }),
  prep({ settle }) {
    straighten(c, settle, 'top', 28, S => S.pt.kneeR);
    palmsUnder(c, settle, 'top');
    const b = c.keys.bottom;       // chest ~9 cm off the floor
    b.bodyAngle = solve(2, c.keys.top.bodyAngle, th => settle({ ...b, bodyAngle: th }).pt.sternum[1], 9.5);
  },
}));

// straight-arm plank: only the shoulder blades move (serratus); the chest sinks a little on retraction, arms stay locked
const scapular_push_up = floorPlank(c => ({
  name: 'Scapular push-up', cam: { az: 24, el: 10 }, still: .1, trail: ['acromionR'],
  muscles: { primary: ['upper_back'], secondary: ['chest', 'front_delts', 'abs'] },
  keys: {
    out: { bodyAngle: 19, scapProt: 15, scapElev: .2, thoracic: 0 },
    in: { bodyAngle: 17, scapProt: -14, scapElev: -.3, thoracic: -4, cervical: 1 },
  },
  timeline: [
    { hold: 'out', dur: .4, b: .15 },
    { from: 'out', to: 'in', dur: 1.2, r1: .3, r2: .4, breath: 'in' },
    { hold: 'in', dur: .35, b: 1 },
    { from: 'in', to: 'out', dur: 1.0, r1: .25, r2: .42, breath: 'out', effort: 1 },
  ],
  prep({ settle }) { straighten(c, settle, 'out', 14); palmsUnder(c, settle, 'out', { reach: .96 }); palmsReach(c, settle, 'in', .96); },
}));

// ---------------------------------------------------------------------------------------------------------------
// batch 2: push-up variants
// ---------------------------------------------------------------------------------------------------------------
// standing lean onto a wall: feet flat, body pivots on the ankles, palms on the wall at shoulder height
const wall_push_up = (() => {
  const c = {
    name: 'Wall push-up', cam: { az: -14, el: 5 }, floor: true, qaPins: ['palmR', 'palmL'], trail: ['sternum'], still: .45,
    muscles: { primary: ['chest', 'triceps'], secondary: ['front_delts'] },
    lag: .12, headLag: .4, shift: .2, shiftRoll: .4, L: 85.4, _poff: 0, _wx: 60, _hy: 120, _hz: 20,
    legs: { both: { mode: 'ik', foot: 'flat', toeOut: 6, ankle: (sd, s) => [0, 7.5, 11 * s], pole: s => [1, 0, .1 * s] } },
    arms: { both: { mode: 'ik', grip: 'palm', normal: () => [-1, 0, 0], pole: [-.4, -1, .9], dir: s => [0, 1, -.12 * s], target: (sd, s) => [c._wx, c._hy, c._hz * s] } },
    base: { cervical: 2, head: -4, wrist: 0, fingers: 0 },
    derive(ch, lag) {
      const th = ch.bodyAngle, r = (th + .4 * (lag.bodyAngle - th)) * R;
      ch.rootX = c.L * Math.cos(r); ch.rootY = c.L * Math.sin(r) + 7.5;
      ch.pitch = 90 - th + c._poff - .7 * (lag.bodyAngle - th);
    },
    keys: { top: { bodyAngle: 72, scapProt: 10 }, bottom: { bodyAngle: 60, scapProt: -9, cervical: -3, head: -6 } },
    timeline: rep('top', 'bottom', { ecc: 1.6, con: .9 }),
    props: c => [box([c._wx, 0, -70], [c._wx + 6, 200, 70], -1e4)],   // camera on the person's side of the wall
    prep({ settle }) {
      straighten(c, settle, 'top', 72, () => [0, 7.5]);
      const k = c.keys, g = settle(k.top, true).pt.glenoidR, dy = -4 - 5.2, dz = 3;
      // palms at shoulder height, arms at 97.5% reach at the top; the wall sits under the palms
      c._hy = g[1] - 4; c._hz = g[2] + dz;
      c._wx = g[0] + 2.4 + Math.sqrt((.975 * 55) ** 2 - dy * dy - dz * dz);
      k.bottom.bodyAngle = solve(40, k.top.bodyAngle, th => settle({ ...k.bottom, bodyAngle: th }).pt.sternum[0], c._wx - 12);   // chest near the wall
    },
  };
  return c;
})();

// hands on a bench edge, feet on the floor
const incline_push_up = floorPlank(c => ({
  name: 'Incline push-up', cam: { az: 22, el: 8 }, qaPins: ['palmR', 'palmL'],
  muscles: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'] },
  keys: { top: { bodyAngle: 35, scapProt: 11 }, bottom: { bodyAngle: 25, scapProt: -9, cervical: -4, head: -10 } },
  timeline: rep('top', 'bottom', { ecc: 1.8 }),
  props: c => [box([c._hx - 11, 0, -55], [c._hx + 26, 45, 55])],
  prep({ settle }) {
    straighten(c, settle, 'top', 32);
    palmsUnder(c, settle, 'top', { h: 45, lo: 15, hi: 60 });
    const b = c.keys.bottom;       // chest to the edge
    b.bodyAngle = solve(10, c.keys.top.bodyAngle, th => settle({ ...b, bodyAngle: th }).pt.sternum[1], 45 + 9);
  },
}));

// feet on a bench, hands on the floor; the body line slopes down to the hands, hips level
const decline_push_up = floorPlank(c => ({
  name: 'Decline push-up', cam: { az: 22, el: 8 }, fy: 45, qaPins: ['ballR', 'ballL', 'toeR', 'toeL'],
  muscles: { primary: ['chest', 'front_delts', 'triceps'], secondary: ['abs'] },
  keys: { top: { bodyAngle: -12, scapProt: 11 }, bottom: { bodyAngle: -20, scapProt: -9, cervical: -6, head: -12 } },
  timeline: rep('top', 'bottom', { ecc: 2 }),
  props: () => [box([-30, 0, -32], [7, 45, 32])],
  prep({ settle }) {
    straighten(c, settle, 'top', -14);
    palmsUnder(c, settle, 'top', { lo: -45, hi: 5 });
    const b = c.keys.bottom;       // nose near the floor
    b.bodyAngle = solve(-50, c.keys.top.bodyAngle, th => settle({ ...b, bodyAngle: th }).pt.nose[1], 7);
  },
}));

// hands together under the sternum (thumbs and index fingers form a diamond), elbows brush the ribs
const diamond_push_up = floorPlank(c => ({
  name: 'Diamond push-up', cam: { az: 24, el: 9 },
  muscles: { primary: ['triceps', 'chest'], secondary: ['front_delts', 'abs'] },
  arms: { both: { mode: 'ik', grip: 'palm', pole: [-1, -.9, .3], dir: s => [.6, 0, -.8 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
  keys: { top: { bodyAngle: 19, scapProt: 12 }, bottom: { bodyAngle: 8, scapProt: -7, cervical: -4, head: -12 } },
  timeline: rep('top', 'bottom', { ecc: 2.1 }),
  prep({ settle }) {
    straighten(c, settle, 'top', 12);
    palmsUnder(c, settle, 'top', { dx: -7, z: 7, lo: 8, hi: 30 });
    const b = c.keys.bottom;       // chest just above the hands
    b.bodyAngle = solve(2, c.keys.top.bodyAngle, th => settle({ ...b, bodyAngle: th }).pt.sternum[1], 12);
  },
}));

// very wide hands, fingers turned out; lower towards one hand while the other arm stays long. Sides alternate.
const archer_push_up = floorPlank(c => ({
  name: 'Archer push-up', cam: { az: 18, el: 16 }, swap: true, still: .22, floorZ: 60,
  muscles: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs', 'obliques'] },
  arms: { both: { mode: 'ik', grip: 'palm', pole: [-.6, -1, .7], dir: s => [.35, 0, .94 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
  keys: { top: { bodyAngle: 17, scapProt: 10 }, bottom: { bodyAngle: 9, rootZ: 16, roll: -6, scapProtR: -8, scapProtL: 12, cervical: -4, head: -12 } },
  timeline: rep('top', 'bottom', { ecc: 2, con: 1.1 }),
  prep({ settle }) {
    straighten(c, settle, 'top', 12);
    palmsUnder(c, settle, 'top', { z: 46, reach: .96, lo: 5, hi: 30 });
    const b = c.keys.bottom, W = [c._hx - 5.2 * .35, 2.4, -(c._hz - 5.2 * .94)];
    for (let i = 0; i < 3; i++) {   // chest low over the right hand, left arm straight (98.5%)
      b.bodyAngle = solve(2, c.keys.top.bodyAngle, th => settle({ ...b, bodyAngle: th }).pt.sternum[1], 11);
      b.rootZ = solve(0, 40, z => dist(settle({ ...b, rootZ: z }, true).pt.glenoidL, W), .95 * 55);
    }
  },
}));

// hands by the hips, fingers turned out and back; shoulders lean well past the hands all the way down
const pseudo_planche_push_up = floorPlank(c => ({
  name: 'Pseudo planche push-up', cam: { az: 22, el: 8 },
  muscles: { primary: ['chest', 'front_delts'], secondary: ['triceps', 'abs', 'biceps'] },
  arms: { both: { mode: 'ik', grip: 'palm', pole: [-1, -.5, .35], dir: s => [-.4, 0, .92 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
  base: { cervical: 4, head: -10, thoracic: -1, lumbar: 1, wrist: 0 },
  keys: { top: { bodyAngle: 17, scapProt: 15, scapElev: .2 }, bottom: { bodyAngle: 8, scapProt: 4, cervical: -3, head: -12 } },
  timeline: rep('top', 'bottom', { ecc: 2.2, con: 1.1 }),
  prep({ settle }) {
    straighten(c, settle, 'top', 12);
    palmsUnder(c, settle, 'top', { dx: -20, dz: 6, lo: 6, hi: 30 });
    const b = c.keys.bottom;
    b.bodyAngle = solve(2, c.keys.top.bodyAngle, th => settle({ ...b, bodyAngle: th }).pt.sternum[1], 11);
  },
}));

// ---------------------------------------------------------------------------------------------------------------
const pike_push_up = pike(() => ({
  name: 'Pike push-up', cam: { az: 22, el: 6 },
  muscles: { primary: ['front_delts', 'triceps'], secondary: ['side_delts', 'traps', 'chest'] },
}));
// feet on a bench, hips stacked over the shoulders; the head makes a tripod with the hands
const elevated_pike_push_up = pike(c => ({
  name: 'Elevated pike push-up', cam: { az: 22, el: 6 }, fy: 45, qaPins: ['ballR', 'ballL', 'toeR', 'toeL'], pitch0: 150, reachLeg: 80,
  muscles: { primary: ['front_delts', 'triceps'], secondary: ['side_delts', 'traps', 'chest'] },
  props: () => [box([c._bx - 26, 0, -32], [c._bx + 10, 45, 32])],
}));

// ---------------------------------------------------------------------------------------------------------------
// dips
// ---------------------------------------------------------------------------------------------------------------
// hands on a bench edge behind, fingers forward; knees bent, feet flat; the body drops by the elbows only
const BENCH_H = 45;
const bench_dip = (() => {
  const c = {
    name: 'Bench dip', cam: { az: 36, el: 8 }, floor: true, qaPins: ['palmR', 'palmL'], trail: ['acromionR'], still: .45,
    muscles: { primary: ['triceps'], secondary: ['chest', 'front_delts'] },
    lag: .14, headLag: .35, shift: .15, shiftRoll: .3,
    legs: { both: { mode: 'ik', foot: 'flat', toeOut: 6, ankle: (sd, s) => [64, 7.5, 12 * s], pole: s => [1, .5, .1 * s] } },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-1, -.2, .25], dir: s => [1, 0, .05 * s], target: (sd, s) => [-5, BENCH_H, 20 * s] } },
    base: { pitch: 6, thoracic: 2, cervical: 2, head: -3, wrist: 0, fingers: 45 },
    keys: { top: { rootX: 12, rootY: 50, scapElev: -.4 }, bottom: { rootX: 13, rootY: 28, pitch: 12, scapElev: 1.2, scapProt: 6, head: -6 } },
    timeline: rep('top', 'bottom', { ecc: 1.8, con: 1 }),
    props: [box([-38, 0, -62], [0, BENCH_H, 62])],
    prep({ settle }) {
      const k = c.keys;
      k.top.rootY = solve(30, 80, y => settle({ ...k.top, rootY: y }).reach, .975);
      // bottom: upper arm about parallel to the floor (elbow ~90°)
      k.bottom.rootY = solve(5, k.top.rootY, y => { const S = settle({ ...k.bottom, rootY: y }); return S.pt.glenoidR[1] - S.pt.elbowR[1]; }, 3);
    },
  };
  return c;
})();

// parallel bars (along x) on a grounded station; lean a little forward, shoulders just below the elbows at the bottom
const DIP_Y = 118;
const dipStation = (z, y = DIP_Y) => [-z, z].flatMap(zz => [rod([[-42, y, zz], [42, y, zz]], 1.9),
  rod([[-36, y, zz], [-36, 0, zz]], 1.7), rod([[36, y, zz], [36, 0, zz]], 1.7), rod([[-46, 1.3, zz], [46, 1.3, zz]], 1.4)]);
function dip(f) {
  const c = {
    cam: { az: 30, el: 7 }, floor: true, floorZ: 50, trail: ['acromionR'], still: .45, gz: 26,
    lag: .15, headLag: .35, shift: .3, shiftRoll: .5,
    arms: { both: { mode: 'ik', grip: 'bar', palm: s => [0, 0, s], pole: [-1, -.3, .2], target: (sd, s) => [0, DIP_Y, c.gz * s] } },
    balance: () => 0,
    base: { hipFlex: 25, knee: 85, ankle: 25, hipFlexL: 30, kneeL: 90, fingers: 150, cervical: 2, head: -2 },
    keys: { top: { rootY: 120, pitch: 8, scapElev: -1 }, bottom: { rootY: 95, pitch: 24, scapElev: 1.2, scapProt: 8, thoracic: 3, head: -6 } },
    timeline: rep('top', 'bottom', { ecc: 2, con: 1.1 }),
    prep({ settle }) {
      const k = c.keys;
      k.top.rootY = solve(DIP_Y - 30, DIP_Y + 40, y => settle({ ...k.top, rootY: y }).reach, .985);
      k.bottom.rootY = solve(DIP_Y - 60, k.top.rootY, y => { const S = settle({ ...k.bottom, rootY: y }); return S.pt.glenoidR[1] - S.pt.elbowR[1]; }, -2);
    },
  };
  return Object.assign(c, f(c));
}
const bar_dip = dip(c => ({
  name: 'Bar dip', props: dipStation(c.gz),
  muscles: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'] },
}));
// rings close to the sides, hanging from a frame; the rings turn out at the top
const RING_R = 8.5, FRAME_Y = 236;
const ring_dip = dip(c => ({
  name: 'Ring dip', gz: 23, shift: .6, shiftRoll: 1.1, cam: { az: 30, el: 6 },
  muscles: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'biceps', 'abs'] },
  arms: { both: { mode: 'ik', grip: 'bar', palm: s => [.35, 0, .94 * s], pole: [-1, -.3, .2], target: (sd, s) => [0, DIP_Y, c.gz * s] } },
  props: [...frame(FRAME_Y, 55), ...[-1, 1].flatMap(s => [
    { t: 'ring', c: [0, DIP_Y + RING_R - 1.5, c.gz * s], n: [0, 0, 1], r: RING_R },
    rod([[0, DIP_Y + 2 * RING_R - 1.5, c.gz * s], [0, FRAME_Y, c.gz * s]], .6)])],
}));

Object.assign(CLIPS, {
  push_up, knee_push_up, scapular_push_up, wall_push_up, incline_push_up, decline_push_up, diamond_push_up, archer_push_up,
  pseudo_planche_push_up, pike_push_up, elevated_pike_push_up, bench_dip, bar_dip, ring_dip,
});
