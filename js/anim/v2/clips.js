// Kitaeru animation v2 clips (Direction A). Keys are sparse joint-angle / target poses; the core adds the spline, tempo,
// IK contacts, root pins and secondary motion. Tempo is in real seconds (eccentric ~2 s, pause, concentric ~1 s).
// Every ground contact is planted by construction: an IK target (hands, feet, forearms, bar) or a root pin (knees, upper
// back, pelvis). prep() solves the geometry once (reach, hand / foot spots, straight body lines, head on the floor).
// World: x = forward, y = up, z = the body's right (camera side). Prone moves face +x, supine moves have the head at -x.
import { mirrorPose, P, T_INDEX, nrm, sub } from './core.js';

const R = Math.PI / 180;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const angXY = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / R;
// x in [lo, hi] with g(x) = y (g monotone, either direction)
function solve(lo, hi, g, y = 0, n = 30) {
  const inc = g(hi) > g(lo);
  for (let i = 0; i < n; i++) { const m = (lo + hi) / 2; if ((g(m) > y) === inc) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
// secant fit of a free parameter (a pitch offset) so that err() = 0
function fit(get, set, err, n = 5) {
  for (let i = 0; i < n; i++) {
    const x = get(), e = err(); if (Math.abs(e) < .02) return;
    set(x + .5); const e1 = err(); const k = (e1 - e) / .5 || 1; set(x - e / k);
  }
}
// timelines. rep: lower first (push-ups, squats). repUp: effort first (pulls, bridges, raises). hold: breathing hold.
const rep = (a, b, { p0 = .45, ecc = 2, p1 = .3, con = 1, via1, via2, at1, at2 } = {}) => [
  { hold: a, dur: p0, b: .15 },
  { from: a, via: via1, to: b, at: at1, dur: ecc, r1: .26, r2: .4, breath: 'in' },
  { hold: b, dur: p1, b: 1 },
  { from: b, via: via2, to: a, at: at2, dur: con, r1: .2, r2: .42, breath: 'out', effort: 1 },
];
const repUp = (a, b, { p0 = .45, con = 1.1, p1 = .4, ecc = 2 } = {}) => [
  { hold: a, dur: p0, b: .9 },
  { from: a, to: b, dur: con, r1: .22, r2: .42, breath: 'out', effort: 1 },
  { hold: b, dur: p1, b: .05 },
  { from: b, to: a, dur: ecc, r1: .3, r2: .4, breath: 'in' },
];
const hold = (a, b, dur = 4.4) => [{ cyclic: [a, b], dur, breath: 'cycle', breaths: 1 }];

// ---------------------------------------------------------------------------------------------------------------
// floor plank family: a rigid body line pivoting on the balls of the feet. Hips on a circle of radius L about the
// pivot; pitch keeps the shoulders on the pivot-hip line (_poff); the hips trail the chest a little (follow-through).
// ---------------------------------------------------------------------------------------------------------------
function plank(f) {
  const c = {
    floor: true, lag: .14, headLag: .45, shift: .25, shiftRoll: .7, trail: ['sternum'], L: 93, y0: 1.2, _poff: 0, _hx: 0, _hz: 21,
    legs: { both: { mode: 'ik', foot: 'toes', knee: 3, toeOut: 4, ball: (sd, s) => [0, 0, 10 * s], pole: () => [.25, -1, 0] } },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.55, -1, .85], dir: s => [1, 0, .12 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { cervical: 3, head: -8, thoracic: -2, lumbar: 1, wrist: 0 },
    derive(ch, lag) {
      const th = ch.bodyAngle, r = (th + .45 * (lag.bodyAngle - th)) * R;
      ch.rootX = c.L * Math.cos(r); ch.rootY = c.L * Math.sin(r) + c.y0;
      ch.pitch = 90 - th + c._poff - .8 * (lag.bodyAngle - th);
    },
  };
  return Object.assign(c, f(c));
}
// shoulders a touch above the pivot-hip line (no sag)
function straighten(c, settle, key, th, piv = S => [0, 0], lift = .8) {
  const k = { ...c.keys[key], bodyAngle: th };
  fit(() => c._poff, v => { c._poff = v; }, () => { const S = settle(k, true); return angXY(S.pt.pelvis, S.pt.glenoidR) - angXY(piv(S), S.pt.pelvis) - lift; });
}
// bodyAngle where palms under the shoulders (+dx forward, +dz out) are at `reach` of the arm; sets the hand spot
function palmsUnder(c, settle, key, { reach = .975, dx = 3, dz = 4, lo = 6, hi = 50 } = {}) {
  const k = c.keys[key], G = th => settle({ ...k, bodyAngle: th }, true).pt.glenoidR;
  k.bodyAngle = solve(lo, hi, th => { const g = G(th); return dist(g, [g[0] + dx, 2.4, g[2] + dz]); }, reach * 55);
  const g = G(k.bodyAngle); c._hx = g[0] + dx + 5.2; c._hz = g[2] + dz;
}
// forearm contacts: bodyAngle where the elbow sits under the shoulder at the true humerus length. Fixed point, because
// the scapula (and so the shoulder) moves with the arm: solve FK first, then re-solve with the planted forearm.
function elbowsUnder(c, settle, keys, sd, { dx = .5, dz = -1.5, lo = 4, hi = 45 } = {}) {
  const k = c.keys[keys[0]], h = 3.4 + Math.sqrt(30 * 30 - dx * dx - dz * dz);
  for (let i = 0; i < 5; i++) {
    const fk = i === 0;
    const th = solve(lo, hi, t => settle({ ...k, bodyAngle: t }, fk).pt['glenoid' + sd][1], h);
    const g = settle({ ...k, bodyAngle: th }, fk).pt['glenoid' + sd];
    c._ex = g[0] + dx; c._ez = g[2] + dz * Math.sign(g[2] || 1);
    for (const n of keys) c.keys[n].bodyAngle = th;
  }
}
// bodyAngle where the (already placed) palms are at `reach`
function palmsReach(c, settle, key, reach, lo = 6, hi = 50) {
  const k = c.keys[key], W = [c._hx - 5.2, 2.4, c._hz];
  k.bodyAngle = solve(lo, hi, th => dist(settle({ ...k, bodyAngle: th }, true).pt.glenoidR, W), reach * 55);
}

const push_up = plank(c => ({
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
const knee_push_up = plank(c => ({
  name: 'Knee push-up', cam: { az: 20, el: 8 }, shift: 0, shiftRoll: 0,
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
const scapular_push_up = plank(c => ({
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

// forearm plank: elbows planted under the shoulders, forearms flat; a breathing hold
const plank_hold = plank(c => ({
  name: 'Plank', cam: { az: 20, el: 8 }, still: 0, shift: 0, shiftRoll: 0, trail: [], headLag: .2,
  muscles: { primary: ['abs'], secondary: ['obliques', 'front_delts', 'glutes', 'quads'] },
  arms: { both: { mode: 'ik', grip: 'forearm', dir: s => [1, 0, -.14 * s], target: (sd, s) => [c._ex, 3.4, c._ez * s] } },
  base: { cervical: 4, head: -10, thoracic: -1, lumbar: 1, fingers: 20 },
  keys: { a: { bodyAngle: 12, scapProt: 6 }, b: { bodyAngle: 12, scapProt: 7.5, head: -8.5 } },
  timeline: hold('a', 'b'),
  prep({ settle }) { straighten(c, settle, 'a', 12); elbowsUnder(c, settle, ['a', 'b'], 'R', { hi: 30 }); },
}));

// ---------------------------------------------------------------------------------------------------------------
const pike_push_up = (() => {
  const c = {
    name: 'Pike push-up', cam: { az: 22, el: 6 }, floor: true, trail: ['headTop'], still: .45,
    muscles: { primary: ['front_delts', 'triceps'], secondary: ['side_delts', 'traps', 'chest'] },
    lag: .14, headLag: .3, shift: .2, shiftRoll: .4, _hx: 60, _hz: 20, _bx: -40,
    legs: { both: { mode: 'ik', foot: 'toes', knee: 4, toeOut: 5, ball: (sd, s) => [c._bx, 0, 10 * s], pole: () => [.87, -.5, 0] } },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.2, -1, .4], dir: s => [1, 0, .1 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { wrist: 0, fingers: 0 },
    keys: {
      top: { rootX: 0, rootY: 80, pitch: 136, lumbar: -2, thoracic: -3, cervical: -2, head: -4, scapElev: .8, scapProt: 4 },
      bottom: {},
    },
    timeline: rep('top', 'bottom', { ecc: 2, con: 1.1 }),
    prep({ settle }) {
      const k = c.keys, t = k.top;
      // top: arms continue the hip-shoulder line to the floor at 97.5% reach (upside-down V)
      const aim = S => { const G = S.pt.glenoidR, d = nrm(sub(G, S.pt.pelvis)), u = (G[1] - 2.4) / -d[1]; return { G, W: [G[0] + d[0] * u, 2.4, G[2] + 2.5] }; };
      t.rootY = solve(40, 110, y => { const { G, W } = aim(settle({ ...t, rootY: y }, true)); return dist(G, W); }, .975 * 55);
      const S = settle(t, true), { W } = aim(S), H = S.pt.hipR;
      c._hx = W[0] + 5.2; c._hz = W[2];
      c._bx = H[0] - Math.sqrt(Math.max(0, 93 * 93 - H[1] * H[1]));
      // bottom: hips drift forward, trunk goes vertical, head lowers in front of the hands
      const path = u => ({ ...t, rootX: 16 * u, rootY: t.rootY - 7 * u, pitch: t.pitch + 6 * u, cervical: -2 - 14 * u, head: -4 - 6 * u,
        thoracic: -3 - 2 * u, scapElev: .8 - 1 * u, scapProt: 4 - 6 * u });
      const low = S => Math.min(S.pt.headTop[1], S.pt.nose[1], S.pt.chin[1]);
      k.bottom = path(solve(0, 2.5, u => low(settle(path(u))), 6.5));
    },
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
const bodyweight_squat = {
  name: 'Bodyweight squat', cam: { az: 30, el: 6 }, floor: true, trail: ['hipR'],
  muscles: { primary: ['quads', 'glutes'], secondary: ['adductors', 'hamstrings', 'calves'] },
  lag: .16, headLag: .4, shift: .6, shiftRoll: .8,
  legs: { both: { mode: 'ik', foot: 'flat', toeOut: 13, ankle: (sd, s) => [0, 7.5, 13.5 * s], pole: s => [1, 0, .34 * s] } },
  balance: S => (S.pt.heelR[0] + S.pt.ballR[0]) / 2 + .5,
  base: { rootY: 91, pitch: 3, elbow: 10, palm: 90, wrist: 5, fingers: 25, shAbd: 5 },
  keys: {
    top: { rootY: 91.5, pitch: 2, shFlex: 6, elbow: 12, head: 0, cervical: 0 },
    down: { rootY: 73, rootX: -9, pitch: 17, lumbar: -2, thoracic: 2, shFlex: 44, elbow: 8, head: -7, cervical: -3 },
    bottom: { rootY: 47, rootX: -19, pitch: 36, lumbar: -5, thoracic: 5, shFlex: 86, shAbd: 7, elbow: 5, head: -16, cervical: -9, fingers: 10 },
    up: { rootY: 65, rootX: -13, pitch: 27, lumbar: -4, thoracic: 3, shFlex: 64, elbow: 6, head: -12, cervical: -6 },
  },
  timeline: rep('top', 'bottom', { p0: .5, via1: ['down'], at1: [0, .42, 1], via2: ['up'], at2: [0, .45, 1] }),
};

// unilateral: right (near) foot forward and flat, left ball planted with the heel up; the back knee drops straight down
const split_squat = {
  name: 'Split squat', cam: { az: 30, el: 6 }, floor: true, trail: ['hipR'], still: .45,
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

// balls pinned, heels rise; the body stays balanced over the forefoot
const calf_raise = (() => {
  const c = {
    name: 'Calf raise', cam: { az: 28, el: 5 }, floor: true, trail: ['heelR'], still: .45,
    muscles: { primary: ['calves'], secondary: [] },
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
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// supine bridges: the upper back is pinned to the floor, feet flat, palms planted by the hips; the head stays down
// (neck flexion solved per key)
function bridge(single) {
  const c = {
    name: single ? 'Single-leg glute bridge' : 'Glute bridge', cam: { az: 26, el: 11 }, floor: true, trail: ['pelvis'], still: .45,
    muscles: single ? { primary: ['glutes'], secondary: ['hamstrings', 'abs', 'obliques'] } : { primary: ['glutes'], secondary: ['hamstrings', 'abs'] },
    lag: .15, headLag: .1, shift: 0, shiftRoll: 0, _fx: 40, _ax: -20,
    pin: { pt: S => P(S.vert[T_INDEX(4)], [-7.5, 0, 0]), at: [0, 0] },
    legs: { R: { mode: 'ik', foot: 'flat', toeOut: 6, ankle: (sd, s) => [c._fx, 7.5, 11 * s], pole: s => [.35, 1, .1 * s] } },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [.1, 0, 1], dir: s => [1, 0, .06 * s], target: (sd, s) => [c._ax, 0, 23 * s] } },
    base: { pitch: -92, fingers: 0, wrist: 0, ...(single ? { hipFlexL: 108, kneeL: 100, ankleL: 12, hipAbdL: 3 } : {}) },
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

// ---------------------------------------------------------------------------------------------------------------
// side plank on the left forearm, facing the camera: body line tilted up by bodyAngle in the picture plane
// (yaw -90, roll = bodyAngle - 90). Feet stacked (left foot on its outer edge), right arm to the ceiling.
const side_plank = (() => {
  const c = {
    name: 'Side plank', cam: { az: 14, el: 13 }, floor: true, trail: [], still: 0,
    muscles: { primary: ['obliques'], secondary: ['abs', 'glutes', 'side_delts'] },
    lag: .2, headLag: .2, shift: 0, shiftRoll: 0, L: 85.3, _ex: 100, _ez: 0,
    // left ankle 4.3 cm up (foot on its outer edge), right ankle stacked 8.6 cm above it along the body's right
    legs: { both: { mode: 'ik', foot: 'fixed', pole: () => [0, 0, 1],
      ankle: (sd, s, ch) => { const r = ch.bodyAngle * R, k = s > 0 ? 8.6 : 0; return [-k * Math.sin(r), 4.3 + k * Math.cos(r), 0]; },
      axes: (sd, s, ch) => { const r = ch.bodyAngle * R; return [[0, 0, 1], [Math.cos(r), Math.sin(r), 0], [-s * Math.sin(r), s * Math.cos(r), 0]]; } } },
    arms: { L: { mode: 'ik', grip: 'forearm', dir: () => [.3, 0, 1], target: () => [c._ex, 3.4, c._ez] } },
    base: { yaw: -90, shAbdR: 86, shFlexR: 4, elbowR: 4, palmR: 0, fingersR: 12, wristR: 0, cervical: 2, head: 0, fingersL: 25 },
    derive(ch) {
      const r = ch.bodyAngle * R, up = [Math.cos(r), Math.sin(r)], rt = [-Math.sin(r), Math.cos(r)];
      const m = [4.3 * rt[0], 4.3 + 4.3 * rt[1]];              // between the stacked ankles
      ch.rootX = m[0] + up[0] * c.L; ch.rootY = m[1] + up[1] * c.L; ch.rootZ = 0;
      ch.roll = ch.bodyAngle - 90; ch.pitch = 0;
    },
    keys: { a: { bodyAngle: 20 }, b: { bodyAngle: 20, head: 1.5, scapProtL: 1 } },
    timeline: hold('a', 'b'),
    prep({ settle }) { elbowsUnder(c, settle, ['a', 'b'], 'L', { dx: 0, dz: 0, lo: 5 }); },
  };
  return c;
})();

// prone: the pelvis front is pinned; spine and hips extend to lift chest, arms and legs, then a breathing hold
const superman = (() => {
  const c = {
    name: 'Superman', cam: { az: 22, el: 10 }, floor: true, trail: ['palmR'], still: .5,
    muscles: { primary: ['lower_back', 'glutes'], secondary: ['upper_back', 'hamstrings', 'rear_delts'] },
    lag: .2, headLag: .3, shift: 0, shiftRoll: 0,
    pin: { pt: S => P(S.F.pelvis, [8.5, 0, 0]), at: [0, 2.6] },
    base: { pitch: 92, shFlex: 172, shAbd: 12, elbow: 6, palm: 90, wrist: 0, fingers: 10, knee: 2, ankle: 72, hipAbd: 3 },
    keys: { rest: { pitch: 92, lumbar: 2, thoracic: 1, cervical: 0, head: -4, shFlex: 172, hipFlex: 0 }, top: {}, top2: {} },
    timeline: [
      { hold: 'rest', dur: .5, b: .5 },
      { from: 'rest', to: 'top', dur: 1.2, r1: .3, r2: .42, breath: 'out', effort: 1 },
      { from: 'top', to: 'top2', dur: 1.4, r1: .5, r2: .5, breath: 'in' },
      { from: 'top2', to: 'top', dur: 1.4, r1: .5, r2: .5, breath: 'out' },
      { from: 'top', to: 'rest', dur: 1.3, r1: .3, r2: .4, breath: 'in' },
    ],
    prep({ settle }) {
      const k = c.keys, r = k.rest;
      const face = S => Math.min(S.pt.nose[1], S.pt.chin[1]);
      r.pitch = solve(80, 105, p => settle({ ...r, pitch: p }).pt.sternum[1], 4.5);          // chest resting
      r.cervical = solve(-40, 30, v => face(settle({ ...r, cervical: v })), 3.5);             // face just off the floor
      r.shFlex = solve(150, 200, v => settle({ ...r, shFlex: v }).pt.palmR[1], 2.4);          // hands on the floor
      r.hipFlex = solve(-20, 20, v => settle({ ...r, hipFlex: v }).pt.patellaR[1], 2.4);      // thighs on the floor
      // lift: spine extends through the lumbar and thoracic levels, arms and legs rise ~10-15 cm, neck stays long
      k.top = { ...r, pitch: r.pitch + 1, lumbar: -8, thoracic: -8, cervical: r.cervical + 4, shFlex: r.shFlex + 9, scapUp: 4, hipFlex: r.hipFlex - 9 };
      k.top2 = { ...k.top, lumbar: k.top.lumbar - 1.2, thoracic: k.top.thoracic - 1.2, shFlex: k.top.shFlex + 2.5, hipFlex: k.top.hipFlex - 1.5 };
    },
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// bars
// ---------------------------------------------------------------------------------------------------------------
const BAR_Y = 226;
function hang(f) {
  const c = {
    cam: { az: 24, el: 4 }, floor: false, bar: { y: BAR_Y, w: 52 }, trail: ['chin'], still: .1,
    lag: .15, headLag: .3, shift: .3, shiftRoll: .5, gz: 25,
    arms: { both: { mode: 'ik', grip: 'bar', pole: [.35, -.25, 1], target: (sd, s) => [0, BAR_Y, c.gz * s] } },
    balance: () => 0,
    base: { hipFlex: 8, knee: 16, ankle: 30, kneeL: 22, hipFlexL: 12, fingers: 200 },
    keys: {
      hang: { rootY: 110, scapElev: 2.6, scapProt: 5, thoracic: 3, head: 2, hipFlex: 5, knee: 12 },
      init: { rootY: 114, scapElev: -.8, scapProt: -5, thoracic: -3, head: 0, hipFlex: 9, knee: 15 },
      mid: { rootY: 140, scapElev: -1.4, scapProt: -10, thoracic: -8, head: -4, hipFlex: 14, knee: 20, pitch: -3 },
      top: { rootY: 160, scapElev: -2, scapProt: -14, thoracic: -11, head: -9, cervical: -3, pitch: -6, hipFlex: 17, knee: 22 },
    },
    timeline: [
      { hold: 'hang', dur: .5, b: .9 },
      { from: 'hang', via: ['init', 'mid'], to: 'top', at: [0, .2, .58, 1], dur: 1.15, r1: .22, r2: .42, breath: 'out', effort: 1 },
      { hold: 'top', dur: .4, b: .05 },
      { from: 'top', via: ['mid'], to: 'hang', at: [0, .45, 1], dur: 2.0, r1: .3, r2: .4, breath: 'in' },
    ],
    prep({ build }) {
      const k = c.keys;
      // dead hang: arms at 99.3% of full reach; top: chin 3 cm over the bar
      k.hang.rootY = solve(80, 160, y => build({ ...k.hang, rootY: y }).reach, .993); k.init.rootY = k.hang.rootY + 4;
      k.top.rootY = solve(130, 190, y => build({ ...k.top, rootY: y }).pt.chin[1], BAR_Y + 3) + .05;
      k.mid.rootY = k.hang.rootY + (k.top.rootY - k.hang.rootY) * .6;
    },
  };
  return Object.assign(c, f(c));
}
const pull_up = hang(() => ({ name: 'Pull-up', muscles: { primary: ['lats', 'upper_back'], secondary: ['biceps', 'rear_delts', 'forearms', 'abs'] } }));
// underhand, shoulder-width grip; elbows travel in front of the body
const chin_up = hang(c => ({
  name: 'Chin-up', gz: 17,
  muscles: { primary: ['lats', 'biceps'], secondary: ['upper_back', 'forearms', 'abs'] },
  arms: { both: { mode: 'ik', grip: 'bar', sup: true, pole: [.9, -.3, .45], target: (sd, s) => [0, BAR_Y, c.gz * s] } },
}));

// low bar at hip height, heels pinned (the foot pivots on the heel), rigid body line rising towards the bar
const ROW_Y = 100;
const inverted_row = (() => {
  const c = {
    name: 'Inverted row', cam: { az: 24, el: 8 }, floor: true, bar: { x: 0, y: ROW_Y, w: 46, posts: 'down' }, trail: ['sternum'], still: .1,
    muscles: { primary: ['upper_back', 'lats'], secondary: ['biceps', 'rear_delts', 'forearms', 'abs'] },
    lag: .14, headLag: .35, shift: .2, shiftRoll: .4, L: 91, _fx: 120, _poff: 0,
    legs: { both: { mode: 'ik', foot: 'heel', knee: 2, toeOut: 6, heel: (sd, s) => [c._fx, 0, 10 * s], pole: () => [0, 1, 0] } },
    arms: { both: { mode: 'ik', grip: 'bar', pole: [-1, -.35, .75], target: (sd, s) => [0, ROW_Y, 26 * s] } },
    base: { cervical: 2, head: -3, fingers: 200, thoracic: -2 },
    derive(ch, lag) {
      const th = ch.bodyAngle, r = (th + .4 * (lag.bodyAngle - th)) * R;
      ch.rootX = c._fx - c.L * Math.cos(r); ch.rootY = c.L * Math.sin(r) + 1;
      ch.pitch = th - 90 + c._poff + .6 * (lag.bodyAngle - th);
    },
    keys: {
      bottom: { bodyAngle: 18, scapProt: 9, scapElev: .6 },
      top: { bodyAngle: 30, scapProt: -15, scapElev: -.6, thoracic: -7, head: -5 },
    },
    timeline: repUp('bottom', 'top', { con: 1.0, p1: .45, ecc: 1.9 }),
    prep({ settle }) {
      const k = c.keys, B = [0, ROW_Y, 26];
      const heel = S => [c._fx, 0];
      fit(() => c._poff, v => { c._poff = v; }, () => { const S = settle({ ...k.bottom, bodyAngle: 20 }, true); return angXY(S.pt.pelvis, S.pt.glenoidR) - angXY(heel(S), S.pt.pelvis) + .8; });
      // bottom: shoulders under the bar, arms at 98.5% reach
      const place = th => { c._fx = 0; const G = settle({ ...k.bottom, bodyAngle: th }, true).pt.glenoidR; c._fx = -1 - G[0]; };
      k.bottom.bodyAngle = solve(5, 45, th => { place(th); return dist(settle({ ...k.bottom, bodyAngle: th }, true).pt.glenoidR, B); }, 6.6 + .985 * 55);
      place(k.bottom.bodyAngle);
      // top: chest 7 cm under the bar
      k.top.bodyAngle = solve(k.bottom.bodyAngle, 60, th => settle({ ...k.top, bodyAngle: th }).pt.sternum[1], ROW_Y - 7);
    },
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// simplified Yang-style cloud hands (yún shǒu), stationary: waist turn, weight transfer, hands circling, gaze following
// the upper hand. Continuous (cyclic spline, no pauses), 8 s per cycle, two breaths. (Prototype for the v1.2 wave.)
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

export const CLIPS = {
  push_up, knee_push_up, scapular_push_up, pike_push_up,
  bodyweight_squat, split_squat, calf_raise,
  glute_bridge: bridge(false), single_leg_glute_bridge: bridge(true),
  plank: plank_hold, side_plank, superman,
  pull_up, chin_up, inverted_row,
  taichi_cloud_hands,
};
export const CLIP_IDS = Object.keys(CLIPS);
