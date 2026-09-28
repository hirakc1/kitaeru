// Kitaeru animation v2 clips: mobility and warm-up (batch 5). See lib.js for conventions. Every clip follows the
// fact-checked cues in js/data/exercises.js; where a cue has several variations (e.g. fingers turned back and
// sideways) the clip shows the first and the comment says so. (thoracic_opener lives in rot.js, with the open book.)
import { P } from '../core.js';
import { CLIPS, R, solve, hold, box, rod, feet, mix, swing, stand, stepLegs, quad } from './lib.js';

const FW = 12, ST = { R: [-5, FW, 6], L: [-5, -FW, 6] };
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// ---------------------------------------------------------------------------------------------------------------
// all fours (quad() in lib.js). level(): each named key's pitch solved so the planted arms stay at `reach` (the spine
// or hips move, the hands and knees stay put). The thighs stay vertical unless the key sets hipFlex (a rock); the knee
// angle follows so the shins stay flat on the floor.
function level(c, names, reach = .97) {
  const p0 = c.prep;
  c.prep = ctx => {
    p0(ctx);
    for (const n of names) {
      const k = c.keys[n], hf = k.hipFlex, pose = p => ({ ...k, pitch: p, hipFlex: hf ?? p });
      k.pitch = solve(55, 125, p => ctx.settle(pose(p)).reach, reach);
      k.hipFlex = hf ?? k.pitch; k.knee = k.hipFlex - k.pitch + 96;
    }
  };
  return c;
}
// cat-cow: on all fours; round up with the chin to the chest, then let the belly sag and look ahead, with the breath
const cat_cow = level(quad(() => ({
  name: 'Cat-cow', cam: { az: 16, el: 10 }, still: .3, trail: ['sternum'],
  keys: {
    quad: {},
    cat: { thoracic: 24, lumbar: 18, cervical: 24, head: 12, scapProt: 10 },
    cow: { thoracic: -14, lumbar: -24, cervical: -24, head: -18, scapProt: -6 },
  },
  timeline: [{ from: 'quad', to: 'cat', dur: 1.8, r1: .3, r2: .4, breath: 'out' }, { from: 'cat', via: ['quad'], to: 'cow', dur: 2.6, r1: .3, r2: .4, breath: 'in' },
    { from: 'cow', to: 'quad', dur: 1.4, r1: .3, r2: .4, breath: 'out' }],
})), ['quad', 'cat', 'cow']);
// wrist prep: on all fours, fingers forward; rock gently forwards (the shoulders past the hands) and back (the fingers-
// back and sideways variations are the same rock with the hands turned: not shown)
const wrist_prep = level(quad(() => ({
  name: 'Wrist prep', cam: { az: 20, el: 10 }, still: .5, trail: ['acromionR'],
  keys: { quad: {}, fwd: { hipFlex: 72, scapProt: 4, head: -10 }, back: { hipFlex: 112, scapProt: -2 } },
  timeline: [{ from: 'quad', to: 'fwd', dur: 1.2, r1: .3, r2: .4 }, { from: 'fwd', via: ['quad'], to: 'back', dur: 2, r1: .3, r2: .4 }, { from: 'back', to: 'quad', dur: 1.1, r1: .3, r2: .4 }],
})), ['quad', 'fwd', 'back'], .96);

// ---------------------------------------------------------------------------------------------------------------
// child's pose: knees wide, big toes touching; sit back to the heels, arms reaching long on the floor, forehead down;
// breathe into the back. The knees pinned; the thighs 72° from vertical so the seat rests on the heels; the palms far
// forward at 95% reach.
const TH = 72;
const childs_pose = (() => {
  const c = {
    name: 'Child’s pose', cam: { az: 22, el: 12 }, floor: true, trail: [], still: 0, _hx: 80, _hz: 18,
    lag: .2, headLag: .3, shift: 0, shiftRoll: 0,
    pin: { pt: S => S.pt.kneeR, at: [0, 6] },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.2, -1, .6], dir: s => [1, 0, .05 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { pitch: 110, lumbar: 16, thoracic: 14, cervical: 8, head: 8, hipAbd: 16, knee: 160, ankle: 70, wrist: 0, fingers: 5 },
    keys: { a: {}, b: { lumbar: 17, thoracic: 15.2 } },
    timeline: hold('a', 'b', 5),
    prep({ settle }) {   // forehead to the floor
      const fh = S => P(S.F.head, [10, 9, 0])[1];
      for (const n in c.keys) {
        const k = c.keys[n];
        k.pitch = solve(70, 170, p => fh(settle({ ...k, pitch: p, hipFlex: p + TH }, true)), 4.5); k.hipFlex = k.pitch + TH;
      }
      const G = settle(c.keys.a, true).pt.glenoidR;
      c._hx = G[0] + Math.sqrt(Math.max(0, (.95 * 55) ** 2 - (G[1] - 2.4) ** 2)) + 5.2; c._hz = G[2] + 2;
    },
  };
  return c;
})();

// cobra: face down, hands under the shoulders; press up gently (arms not locked) with the hips staying down,
// shoulders away from the ears
const cobra_stretch = (() => {
  const c = {
    name: 'Cobra stretch', cam: { az: 24, el: 10 }, floor: true, trail: ['sternum'], still: .5, _hx: 30, _hz: 22,
    lag: .2, headLag: .3, shift: 0, shiftRoll: 0,
    pin: { pt: S => P(S.F.pelvis, [8.5, 0, 0]), at: [0, 2.6] },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-1, -.2, .5], dir: s => [1, 0, .1 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { pitch: 92, knee: 2, ankle: 72, hipAbd: 3, hipFlex: 0, wrist: 0, fingers: 5, scapElev: -.6, cervical: -10, head: -8 },
    keys: { down: { lumbar: 0, thoracic: 0, cervical: -24, head: -12 }, up: { lumbar: -30, thoracic: -22, cervical: -12, head: -12, scapElev: -1 } },
    timeline: [{ hold: 'down', dur: .4, b: .5 }, { from: 'down', to: 'up', dur: 2, r1: .3, r2: .4, breath: 'in' }, { hold: 'up', dur: 2.4, b: 1 },
      { from: 'up', to: 'down', dur: 1.8, r1: .3, r2: .4, breath: 'out' }],
    prep({ settle }) {
      const d = c.keys.down, u = c.keys.up;
      d.pitch = solve(80, 105, p => settle({ ...d, pitch: p }, true).pt.sternum[1], 7);
      d.hipFlex = solve(-20, 20, v => settle({ ...d, hipFlex: v }, true).pt.patellaR[1], 2.4);
      Object.assign(u, { pitch: d.pitch, hipFlex: d.hipFlex });
      // up: the spine extends until the shoulders are at 90% of the arm's reach over the hands
      const e = solve(0, 1.4, t => settle({ ...u, lumbar: -30 * t, thoracic: -22 * t }, true).pt.glenoidR[1], 2.4 + .9 * 55);
      Object.assign(u, { lumbar: -30 * e, thoracic: -22 * e });
      const G = settle(u, true).pt.glenoidR; c._hx = G[0] + 5.2 + 2; c._hz = G[2] + 2;
    },
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// deep squat hold: sink all the way down, heels down, elbows gently pushing the knees out, palms together; breathe
const deep_squat_hold = {
  name: 'Deep squat hold', cam: { az: 34, el: 6 }, floor: true, trail: [], still: 0,
  lag: .16, headLag: .4, shift: 0, shiftRoll: 0,
  legs: { both: { mode: 'ik', foot: 'flat', toeOut: 18, ankle: (sd, s) => [0, 7.5, 16 * s], pole: s => [1, 0, .5 * s] } },
  arms: { both: { mode: 'ik', grip: 'free', pole: [-.2, -1, 1] } },
  balance: S => (S.pt.heelR[0] + S.pt.ballR[0]) / 2 + 1,
  base: { rootY: 40, pitch: 30, lumbar: 4, thoracic: 6, cervical: -6, head: -10, handX: 34, handY: -8, handZ: -13, palm: 90, fingers: 0, wrist: 40 },
  keys: { a: {}, b: { thoracic: 6.8, rootY: 40.4 } },
  timeline: hold('a', 'b', 5),
  prep({ settle }) {
    for (const n of ['a', 'b']) this.keys[n].rootY = solve(25, 60, y => { const S = settle({ ...this.base, ...this.keys[n], rootY: y }); return S.pt.hipR[1] - S.pt.kneeR[1]; }, -14) + (n === 'b' ? .4 : 0);
  },
};

// ---------------------------------------------------------------------------------------------------------------
// half-kneeling hip flexor stretch: the left knee on a cushion (pinned), the right foot flat in front; tuck the
// pelvis, squeeze the back glute and shift gently forward; hands on the hips. Sides alternate.
const hip_flexor_stretch = (() => {
  const c = {
    name: 'Hip flexor stretch', cam: { az: 30, el: 8 }, floor: true, swap: true, trail: ['pelvis'], still: .5, _fx: 40,
    lag: .2, headLag: .3, shift: 0, shiftRoll: 0,
    pin: { pt: S => S.pt.kneeL, at: [-4, 10.2] },
    legs: { R: { mode: 'ik', foot: 'flat', toeOut: 6, ankle: () => [c._fx, 7.5, 12], pole: () => [1, 0, .15] } },
    arms: { both: { mode: 'ik', grip: 'free', pole: [-1, -.4, .4] } },
    base: { pitch: -2, lumbar: 4, hipFlexL: -8, kneeL: 90, ankleL: 60, hipAbdL: 2, handX: 2, handY: -30, handZ: 22, palm: 90, fingers: 10 },
    keys: { a: { rootX: 0 }, b: { pitch: -4, lumbar: 6, hipFlexL: -18, kneeL: 96, rootX: 0 } },
    timeline: [{ hold: 'a', dur: .5, b: .5 }, { from: 'a', to: 'b', dur: 2.2, r1: .3, r2: .4, breath: 'out' }, { hold: 'b', dur: 2.5, b: 0 },
      { from: 'b', to: 'a', dur: 1.8, r1: .3, r2: .4, breath: 'in' }],
    props: [box([-20, 0, -26], [12, 4, 2])],   // cushion under the back knee
    prep({ settle }) { const S = settle(c.keys.a, true); c._fx = S.pt.hipR[0] + 46; },
  };
  return c;
})();

// standing hamstring stretch: the right heel on a low step, leg straight, toes up; hinge forward with a flat back,
// hands resting on the thigh (release = how far down it they slide); sides alternate
const STEP_H = 30;
const standing_hamstring_stretch = (() => {
  const L = [-5, -10, 6];
  const k = {
    a: { weight: 0, rootY: 88.5, pitch: 6, release: .25, ...feet({ L }) },
    b: { weight: 0, rootY: 87.5, pitch: 46, lumbar: -5, thoracic: -5, head: -4, release: .7, ...feet({ L }) },
  };
  return stand({}, {
    name: 'Standing hamstring stretch', cam: { az: 24, el: 7 }, swap: true, still: .4, trail: ['sternum'], keys: k,
    base: { rootY: 88, palm: 170, fingers: 20, wrist: 10 },
    legs: { L: stepLegs.both, R: { mode: 'ik', foot: 'heel', knee: 2, toeOut: 6, heel: () => [53, STEP_H, 10], pole: () => [0, 1, 0] } },
    arms: { both: { mode: 'ik', grip: 'world', pole: [-.3, -1, .6], at: (sd, s, ch, S, G) => {   // (skeleton points: mirror correctly)
      const p = lerp(S.pt.hipR, S.pt.kneeR, ch['release' + sd]), t = [p[0], p[1] + 9, p[2] + 5 * s], d = Math.hypot(...t.map((v, i) => v - G[i])), m = .96 * 55;
      return d <= m ? t : lerp(G, t, m / d); } } },
    timeline: [{ hold: 'a', dur: .5, b: .5 }, { from: 'a', to: 'b', dur: 2.2, r1: .3, r2: .4, breath: 'out' }, { hold: 'b', dur: 2.5, b: 0 },
      { from: 'b', to: 'a', dur: 1.8, r1: .3, r2: .4, breath: 'in' }],
    props: [box([40, 0, -6], [92, STEP_H, 26])],
  });
})();

// pigeon: the right shin across the front of the body (the foot on its outer edge by the left hip), the left leg long
// behind (the top of the foot on the floor); hips square and low; fold forward over the front shin, palms walking
// out (a breathing hold). Sides alternate.
const pigeon_stretch = (() => {
  const c = {
    name: 'Pigeon stretch', cam: { az: 60, el: 24 }, floor: true, floorZ: 40, swap: true, trail: [], still: .3, _hx: 40, _hz: 16,
    lag: .2, headLag: .3, shift: 0, shiftRoll: 0,
    legs: {
      R: { mode: 'ik', foot: 'fixed', ankle: () => [20, 5, -16], pole: () => [.5, 0, 1], axes: () => [[0, 0, -1], [1, 0, 0], [0, -1, 0]] },
      L: { mode: 'ik', foot: 'fixed', ankle: () => [-85, 5, -12], pole: () => [0, -1, 0], axes: () => [[-1, 0, 0], [0, -1, 0], [0, 0, -1]] },
    },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.4, -1, .7], dir: s => [1, 0, .08 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { rootX: 0, rootY: 14, pitch: 70, lumbar: 12, thoracic: 12, cervical: 2, head: -2, wrist: 0, fingers: 5 },
    keys: { up: { pitch: 30, lumbar: 2, thoracic: 2, cervical: -2, head: -6 }, fold: {}, fold2: { thoracic: 13 } },
    timeline: [{ hold: 'up', dur: .4, b: .5 }, { from: 'up', to: 'fold', dur: 2.4, r1: .3, r2: .4, breath: 'out' }, { cyclic: ['fold', 'fold2'], dur: 4.4, breath: 'cycle', breaths: 1 },
      { from: 'fold', to: 'up', dur: 2, r1: .3, r2: .4, breath: 'in' }],
    prep({ settle }) {
      const f = c.keys.fold, G = settle(f, true).pt.glenoidR;   // palms where the folded arms reach 75% (elbows soft)
      c._hx = G[0] + Math.sqrt(Math.max(0, (.75 * 55) ** 2 - (G[1] - 2.4) ** 2)) + 5.2; c._hz = G[2] + 2;
      c.keys.up.pitch = solve(10, 70, p => settle({ ...c.keys.up, pitch: p }).reach, .985);   // up as tall as the palms allow
    },
  };
  return c;
})();

// calf stretch: hands on a wall, staggered stance; the back (left) leg straight with the heel pressed down; lean in
// until you feel it; then bend the back knee slightly. Sides alternate.
const WALLX = 47;
const calf_stretch = (() => {
  const R = [12, 12, 6], L = [-40, -12, 6];
  const k = {
    a: { weight: .5, rootY: 84, pitch: 12, ...feet({ R, L }) },
    lean: { weight: .45, rootY: 82, pitch: 20, ...feet({ R, L }) },
    bend: { weight: .45, rootY: 77, pitch: 18, ...feet({ R, L }) },
  };
  return stand({}, {
    name: 'Calf stretch', cam: { az: 24, el: 7 }, swap: true, still: .4, trail: [], keys: k, base: { rootY: 86 },
    arms: { both: { mode: 'ik', grip: 'palm', normal: () => [-1, 0, 0], pole: [-.3, -1, .5], dir: s => [0, 1, .2 * s], target: (sd, s) => [WALLX, 128, 22 * s] } },
    timeline: [{ hold: 'a', dur: .4, b: .5 }, { from: 'a', to: 'lean', dur: 2, r1: .3, r2: .4, breath: 'out' }, { hold: 'lean', dur: 2, b: 0 },
      { from: 'lean', to: 'bend', dur: 1.4, r1: .3, r2: .4 }, { hold: 'bend', dur: 1.6, b: .5 }, { from: 'bend', to: 'a', dur: 1.4, r1: .3, r2: .4, breath: 'in' }],
    props: [box([WALLX, 0, -50], [WALLX + 12, 190, 50], -1e4)],
  });
})();

// doorway chest stretch: hands and forearms up on the door frame, elbows at shoulder height; step through gently,
// ribs down. (The core plants forearms on the floor only: here the palms hold the frame, forearms upright.)
const DOOR_X = 4, DOOR_Z = 42;
const doorway_chest_stretch = (() => {
  const R = [30, 12, 6], L = [-14, -12, 6];
  const k = {
    a: { weight: .45, rootY: 86, pitch: 2, ...feet({ R, L }) },
    b: { weight: .7, rootY: 85, pitch: 6, thoracic: -3, ...feet({ R, L }) },
  };
  return stand({}, {
    name: 'Doorway chest stretch', cam: { az: 55, el: 8 }, still: .4, trail: [], keys: k, base: { rootY: 86 },
    arms: { both: { mode: 'ik', grip: 'palm', normal: () => [-1, 0, 0], pole: [-.2, -1, .9], dir: s => [0, 1, .1 * s], target: (sd, s) => [DOOR_X, 158, DOOR_Z * s] } },
    timeline: [{ hold: 'a', dur: .4, b: .5 }, { from: 'a', to: 'b', dur: 2, r1: .3, r2: .4, breath: 'out' }, { hold: 'b', dur: 2.6, b: 0 },
      { from: 'b', to: 'a', dur: 1.6, r1: .3, r2: .4, breath: 'in' }],
    props: [box([DOOR_X, 0, -66], [DOOR_X + 12, 205, -DOOR_Z + 6], -1e4), box([DOOR_X, 0, DOOR_Z - 6], [DOOR_X + 12, 205, 66], -1e4),
      box([DOOR_X, 205, -66], [DOOR_X + 12, 218, 66], -1e4)],
  });
})();

// shoulder dislocate: a wide grip on a band in front of the hips; straight arms over the head and down behind, ribs
// down; back over the top. The hands travel a circle in a sagittal plane about 30 cm out from each shoulder.
const disl = (el, w = 30, r = 52.5) => {   // (T4 frame of a standing trunk, as arm() in lib.js)
  const rs = Math.sqrt(r * r - w * w), e = el * R, x = rs * Math.sin(e), y = -rs * Math.cos(e);
  return { handX: +(1.9 + x * .934 - y * .356).toFixed(1), handY: +(3.3 + x * .356 + y * .934).toFixed(1), handZ: +(15.5 + w).toFixed(1), palm: 170, fingers: 200 };
};
const shoulder_dislocate = (() => {
  const b = { rootY: 88, ...feet(ST) };
  const k = {
    front: { ...b, ...disl(15) }, f2: { ...b, ...disl(90) }, up: { ...b, ...disl(175), lumbar: 1 },
    b2: { ...b, ...disl(245, 34), scapProt: -8 }, back: { ...b, ...disl(295, 38), scapProt: -12 },
  };
  return stand({}, {
    name: 'Shoulder dislocate', cam: { az: 30, el: 8 }, still: .3, trail: ['palmR'], keys: k, base: { rootY: 88 },
    timeline: [{ from: 'front', via: ['f2', 'up', 'b2'], to: 'back', dur: 2.6, r1: .3, r2: .3, breath: 'in' }, { hold: 'back', dur: .4, b: 1 },
      { from: 'back', via: ['b2', 'up', 'f2'], to: 'front', dur: 2.4, r1: .3, r2: .3, breath: 'out' }, { hold: 'front', dur: .4, b: 0 }],
    props: [{ t: 'band', a: S => S.pt.palmR, b: S => S.pt.palmL }],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// arm circles: arms out to the sides; small circles growing bigger; reverse halfway. Front three-quarter view.
const arm_circles = (() => {
  const A = (el, az) => { const e = el * R, a = az * R, r = 53, wx = Math.sin(e) * Math.cos(a), wy = -Math.cos(e), wz = Math.sin(e) * Math.sin(a);
    return { handX: +(1.9 + r * (wx * .934 - wy * .356)).toFixed(1), handY: +(3.3 + r * (wx * .356 + wy * .934)).toFixed(1), handZ: +(15.5 + r * wz).toFixed(1), palm: 90 }; };
  const ring = (r, n) => Array.from({ length: n }, (_, i) => { const a = i / n * 2 * Math.PI; return A(90 + r * Math.sin(a), 90 - r * Math.cos(a)); });
  const k = { a: { rootY: 88, ...feet(ST), ...A(90, 90) } };
  ring(12, 4).forEach((h, i) => { k['s' + i] = { ...k.a, ...h }; }); ring(28, 4).forEach((h, i) => { k['g' + i] = { ...k.a, ...h }; });
  const fwd = p => ({ cyclic: [0, 1, 2, 3].map(i => p + i), dur: 1.1 });
  const rev = p => ({ cyclic: [0, 3, 2, 1].map(i => p + i), dur: 1.1 });
  return stand({}, {
    name: 'Arm circles', cam: { az: 48, el: 6 }, counts: 4, still: .1, trail: ['palmR'], keys: k, base: { rootY: 88 },
    timeline: [{ from: 'a', to: 's0', dur: .4, r1: .3, r2: .3 }, fwd('s'), fwd('g'), { from: 'g0', to: 's0', dur: .3, r1: .3, r2: .3 }, rev('s'), rev('g'),
      { from: 'g0', to: 'a', dur: .4, r1: .3, r2: .3 }],
  });
})();

// leg swings: the left hand holds a post for balance; the right leg swings front to back, then side to side across
// the front; the range builds gradually. Sides alternate.
const POST_X = 40, POST_Z = 26;
const leg_swings = (() => {
  const L = [-5, -10, 6];
  const base = { weight: 0, rootY: 89.5, ...feet({ L }), handXR: 8, handYR: -34, handZR: 24, palmR: 90, ankleR: -28 };
  const k = {
    a: { ...base, hipFlexR: 12, kneeR: 60 },
    f1: { ...base, hipFlexR: 40, kneeR: 30 }, b1: { ...base, hipFlexR: -18, kneeR: 55, pitch: 5 },
    f2: { ...base, hipFlexR: 64, kneeR: 20, pitch: -3 }, b2: { ...base, hipFlexR: -28, kneeR: 60, pitch: 8 },
    in1: { ...base, hipFlexR: 30, hipAbdR: -16, kneeR: 40 }, out1: { ...base, hipFlexR: 26, hipAbdR: 32, kneeR: 40, roll: 4 },
  };
  return stand({}, {
    name: 'Leg swings', cam: { az: 30, el: 6 }, floorZ: 50, swap: true, still: .2, trail: ['ankleR'], keys: k, base: { rootY: 89.5 },
    legs: { L: stepLegs.both },
    arms: { R: { mode: 'ik', grip: 'free', pole: [-.3, -1, .5] },
      L: { mode: 'ik', grip: 'bar', palm: s => [0, 0, s], pole: [-.3, -1, .3], target: (sd, s) => [POST_X, 100, POST_Z * s] } },
    timeline: [{ from: 'a', via: ['f1', 'b1'], to: 'f2', dur: 1.6, r1: .2, r2: .2 }, { from: 'f2', via: ['b2'], to: 'a', dur: 1.2, r1: .2, r2: .3 },
      { from: 'a', via: ['in1', 'out1', 'in1', 'out1'], to: 'a', dur: 2.6, r1: .2, r2: .3 }],
    props: [rod([[POST_X, 0, -POST_Z], [POST_X, 130, -POST_Z]], 2.2), rod([[POST_X - 16, 1, -POST_Z], [POST_X + 16, 1, -POST_Z]], 1.6)],   // a post to hold
  });
})();

// hip circles: on the left leg, the right knee lifted; draw a big circle outwards with the knee, the torso still;
// hands on the hips. Sides alternate.
const hip_circles = (() => {
  const L = [-5, -10, 6];
  const base = { weight: 0, rootY: 89.5, ...feet({ L }), handX: 2, handY: -30, handZ: 22, palm: 90, fingers: 10, ankleR: -28 };
  const k = {
    a: { ...base, hipFlexR: 20, kneeR: 65 },
    k0: { ...base, hipFlexR: 85, kneeR: 95, hipAbdR: 0 }, k1: { ...base, hipFlexR: 65, kneeR: 95, hipAbdR: 40, roll: 3 },
    k2: { ...base, hipFlexR: 25, kneeR: 95, hipAbdR: 45, roll: 4 }, k3: { ...base, hipFlexR: 35, kneeR: 95, hipAbdR: 5 },
  };
  return stand({}, {
    name: 'Hip circles', cam: { az: 50, el: 7 }, swap: true, still: .2, trail: ['kneeR'], keys: k, base: { rootY: 89.5 },
    legs: { L: stepLegs.both },
    arms: { both: { mode: 'ik', grip: 'free', pole: [-1, -.4, .4] } },
    timeline: [{ from: 'a', to: 'k0', dur: .8, r1: .3, r2: .3 }, { cyclic: ['k0', 'k1', 'k2', 'k3'], dur: 2.6 }, { cyclic: ['k0', 'k1', 'k2', 'k3'], dur: 2.6 },
      { from: 'k0', to: 'a', dur: .8, r1: .3, r2: .3 }],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// world's greatest stretch: a deep lunge (right foot forward, the back knee off the floor), the left palm planted
// inside the front foot; the right elbow drops to the instep, then the chest turns and the right arm reaches to the
// ceiling, the eyes following the hand. Sides alternate. The hands bear weight: the stepping balance is off.
const worlds_greatest_stretch = (() => {
  const RF = [22, 11, 6], LB = [-78, -11, 6];
  const k = {
    low: { noBalance: 1, rootX: -26, rootY: 42, pitch: 72, lumbar: 4, thoracic: 6, head: -8, releaseR: 0, ...feet({ R: RF, L: LB }) },
    open: { noBalance: 1, rootX: -26, rootY: 42, pitch: 68, twist: -58, headYaw: -50, head: -16, releaseR: 1, ...feet({ R: RF, L: LB }) },
  };
  const c = stand({}, {
    name: 'World’s greatest stretch', cam: { az: 30, el: 12 }, swap: true, still: .3, trail: ['palmR'], keys: k, _lx: 30, _lz: -14,
    arms: {
      L: { mode: 'ik', grip: 'palm', pole: [-.4, -1, .5], dir: s => [1, 0, .1 * s], target: () => [c._lx, 0, c._lz] },
      // the right hand from the instep (the elbow down by it) up to straight over the shoulder (releaseR = how far)
      R: { mode: 'ik', grip: 'world', pole: [-.2, -1, -.4], at: (sd, s, ch, S, G) => {
        const u = ch['release' + sd], e = u * u * (3 - 2 * u), lo = [S.pt['ball' + sd][0] - 8, 13, S.pt['ball' + sd][2] - 7 * s], hi = [G[0] - 2, G[1] + 53, G[2]];
        const m = lerp(lo, hi, e); m[0] += 18 * Math.sin(Math.PI * e); return m; } },
    },
    base: { rootY: 42, palmR: 90, fingersR: 10, palmL: 0, wristL: 0 },
    timeline: [{ hold: 'low', dur: .6, b: .5 }, { from: 'low', to: 'open', dur: 2, r1: .3, r2: .4, breath: 'in' }, { hold: 'open', dur: 1.2, b: 1 },
      { from: 'open', to: 'low', dur: 1.8, r1: .3, r2: .4, breath: 'out' }],
    prep({ settle }) {
      // the left shoulder over its hand at 95% reach; the palm by the inside of the front foot
      const lo = c.keys.low;
      for (let i = 0; i < 3; i++) {
        lo.rootY = solve(30, 70, y => settle({ ...lo, rootY: y }, true).pt.patellaL[1], 6);
        lo.pitch = solve(40, 100, p => settle({ ...lo, pitch: p }, true).pt.glenoidL[1], 2.4 + .95 * 55);
        const G = settle(lo, true).pt.glenoidL; c._lx = G[0] + 5.2; c._lz = G[2] + 1;
      }
      c.keys.open.pitch = lo.pitch - 4; c.keys.open.rootY = lo.rootY;
    },
  });
  return c;
})();

// pancake: sitting tall, legs wide and straight, toes up (heels planted); hinge forward from the hips with a flat
// back, the hands on the floor in front (elbows softening as the chest lowers)
const pancake_stretch = (() => {
  const c = {
    name: 'Pancake stretch', cam: { az: 60, el: 16 }, floor: true, trail: ['sternum'], still: .4, _hx: 40, _hz: 16, _fx: 60, _fz: 50,
    floorZ: 92, lag: .2, headLag: .3, shift: 0, shiftRoll: 0,
    pin: { pt: S => P(S.F.pelvis, [-3.7, -7.5, 0]), at: [-10, 2.5] },   // on the sit bones
    legs: { both: { mode: 'ik', foot: 'heel', lift: () => -12, toeOut: 50, heel: (sd, s) => [c._fx, 0, c._fz * s], pole: s => [.2, 1, .9 * s] } },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.3, -1, .8], dir: s => [1, 0, .15 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { pitch: 16, lumbar: -2, thoracic: -2, cervical: -2, head: -4, wrist: 0, fingers: 5 },
    keys: { up: {}, fold: { pitch: 50, lumbar: 0, thoracic: 3, cervical: -6, head: -10 } },
    timeline: [{ hold: 'up', dur: .5, b: .5 }, { from: 'up', to: 'fold', dur: 2.4, r1: .3, r2: .4, breath: 'out' }, { hold: 'fold', dur: 2, b: 0 },
      { from: 'fold', to: 'up', dur: 2, r1: .3, r2: .4, breath: 'in' }],
    prep({ settle }) {
      // legs straight at 42° out, heels on the floor; the palms where the sitting arms reach 97%
      const H = settle(c.keys.up, true).pt.hipR, a = 42 * R;
      const D = solve(60, 110, d => { c._fx = H[0] + d * Math.cos(a); c._fz = H[2] + d * Math.sin(a); return settle(c.keys.up).reachLeg; }, .985);
      c._fx = H[0] + D * Math.cos(a); c._fz = H[2] + D * Math.sin(a);
      const G = settle(c.keys.up, true).pt.glenoidR;
      c._hx = G[0] + Math.sqrt(Math.max(0, (.97 * 55) ** 2 - (G[1] - 2.4) ** 2)) + 5.2; c._hz = G[2] + 4;
    },
  };
  return c;
})();

// inchworm: fold forward and put the hands on the floor; walk the hands out to a plank; walk the feet in towards the
// hands; roll up to standing. The body travels forward by the distance the feet walked. Palms placed by plantX (and
// lifted by plantY); the feet step with the stepping legs (the heels peel as the legs need). The hands bear weight
// from the fold to the roll-up (the stepping balance is off).
const inchworm = (() => {
  const F0 = { R: [-5, FW, 6], L: [-5, -FW, 6] }, HZ = 18, A = 34, XF = -8;   // palms land at A; hips at XF in the fold
  const c = stand(F0, {
    name: 'Inchworm', cam: { az: 22, el: 9 }, still: .2, trail: ['sternum'], travel: [100, 0, 0],
    arms: { both: { mode: 'ik', grip: 'palm', arc: 6, pole: [-.5, -1, .6], dir: s => [1, 0, .1 * s], target: (sd, s, ch) => [ch['plantX' + sd], ch['plantY' + sd], HZ * s] } },
    base: { release: 1 },
    keys: { st: { weight: .5, rootY: 88 } },
    timeline: [],
  });
  const k = c.keys;
  c.prep = ({ settle }) => {
    const FOLD = { pitch: 118, lumbar: 14, thoracic: 12, cervical: 6, head: 6 }, PLANK = { pitch: 78, lumbar: 1, thoracic: -2, cervical: 3, head: -8 };
    const pose = (u, hr, hl, dxR, dxL) => ({ noBalance: 1, release: 0, ...mix(FOLD, PLANK, u), plantXR: hr, plantXL: hl, plantYR: 0, plantYL: 0,
      ...feet({ R: [F0.R[0] + dxR, FW, 6], L: [F0.L[0] + dxL, -FW, 6] }) });
    // hips at x: the height that keeps the legs at `leg`, then the pitch that puts the arms at `reach`
    const body = (b, x, reach, leg) => {
      b.rootX = x;
      const knees = y => { const S = settle({ ...b, rootY: y }); return Math.min(S.pt.patellaR[1], S.pt.patellaL[1]); };
      for (let i = 0; i < 3; i++) {
        b.rootY = solve(20, 100, y => settle({ ...b, rootY: y }).reachLeg, leg);
        if (knees(b.rootY) < 7) b.rootY = solve(b.rootY, 110, knees, 7);   // a stepping knee clear of the floor (the back heel peels)
        b.pitch = solve(60, 165, p => settle({ ...b, pitch: p }).reach, reach);
      }
      return b;
    };
    // the plank: pitch 78, legs straight; hips placed so the shoulders sit over the hands at 97% reach
    const pl = pose(1, 0, 0, 0, 0);
    const at = x => { pl.rootX = x; pl.rootY = solve(20, 100, y => settle({ ...pl, rootY: y }).reachLeg, .985); return settle(pl, true).pt.glenoidR; };
    const XP = solve(30, 160, x => at(x)[1], 2.4 + .97 * 55), P = at(XP)[0] + 5.2;
    const D = P - A, q = D / 3;
    c.travel = [D, 0, 0];
    k.st = { weight: .5, rootY: 88, rootX: 0, plantXR: A, plantXL: A, plantYR: 0, plantYL: 0, ...feet(F0) };
    k.fold = body(pose(0, A, A, 0, 0), XF, .93, .97);
    k.dn = { ...mix(k.st, k.fold, .8), release: .35, handX: 36, handY: -6, handZ: 18 };   // (free hands: straight down from a trunk bent ~100°)   // the palms reach the floor last (arms hanging)
    k.dn0 = { ...mix(k.st, k.fold, .55), release: 1, handX: 30, handY: -18, handZ: 18 };
    const tl = [{ hold: 'st', dur: .3, b: .5 }, { from: 'st', via: ['dn0', 'dn'], to: 'fold', at: [0, .45, .8, 1], dur: 1.6, r1: .3, r2: .4, breath: 'out' }];
    let prev = 'fold';
    // the hands walk out (right then left), the hips lowering towards the plank
    [[A + q, A], [A + q, A + q], [A + 2 * q, A + q], [A + 2 * q, A + 2 * q], [P, A + 2 * q], [P, P]].forEach(([hr, hl], i) => {
      const n = 'h' + i, u = (i + 1) / 6, sd = i % 2 ? 'L' : 'R';
      k[n] = body(pose(u, hr, hl, 0, 0), XF + (XP - XF) * u ** .7, .93 + .04 * u, .92 + .065 * u);   // (knees soft early on)
      const a = k[prev], x0 = a['plantX' + sd], x1 = k[n]['plantX' + sd];
      k[n + 'a'] = { ...mix(a, k[n], .15), ['plantX' + sd]: x0, ['plantY' + sd]: 5 };
      k[n + 'b'] = { ...mix(a, k[n], .6), ['plantX' + sd]: x0 + (x1 - x0) * .7, ['plantY' + sd]: 6 };
      for (const v of [n + 'a', n + 'b']) k[v].pitch = solve(60, 150, p => settle({ ...k[v], pitch: p }).reach, .95);
      tl.push({ from: prev, via: [n + 'a', n + 'b'], to: n, at: [0, .25, .7, 1], dur: .6, r1: .2, r2: .3 });
      prev = n;
    });
    tl.push({ hold: prev, dur: .5, b: 0 });
    // the feet walk in (small steps), the hips rising back to the fold
    const f = D / 3;
    [[f, 0], [f, f], [2 * f, f], [2 * f, 2 * f], [D, 2 * f], [D, D]].forEach(([dR, dL], i) => {
      const n = 'f' + i, u = 1 - (i + 1) / 6, sd = i % 2 ? 'L' : 'R';
      k[n] = body(pose(u, P, P, dR, dL), XF + D + (XP - XF - D) * u ** .7, .93 + .04 * u, .92 + .065 * u);
      const a = k[prev], z = sd === 'R' ? FW : -FW;
      const ph = swing(k, n + 's', prev, n, sd, [a['footX' + sd], z, 6], [k[n]['footX' + sd], z, 6], { lift: 4, dur: .55 });
      for (const v of ph.via) { const w = k[v]; w.rootY = Math.max(a.rootY, k[n].rootY) + 3; w.pitch = solve(60, 150, p => settle({ ...w, pitch: p }).reach, .95); }
      tl.push(ph);
      prev = n;
    });
    // roll up to standing, the travel on
    k.st2 = { ...k.st, rootX: D, plantXR: P, plantXL: P, ...feet({ R: [F0.R[0] + D, FW, 6], L: [F0.L[0] + D, -FW, 6] }) };
    k.up = { ...k[prev], release: .6, rootY: k[prev].rootY + 1, handX: 36, handY: -6, handZ: 18 };   // the palms leave the floor first (arms hanging)
    tl.push({ from: prev, via: ['up'], to: 'st2', at: [0, .2, 1], dur: 1.8, r1: .3, r2: .4, breath: 'in' });
    c.timeline = tl;
  };
  return c;
})();

Object.assign(CLIPS, { cat_cow, wrist_prep, childs_pose, cobra_stretch, deep_squat_hold, hip_flexor_stretch, standing_hamstring_stretch, pigeon_stretch,
  calf_stretch, doorway_chest_stretch, shoulder_dislocate, arm_circles, leg_swings, hip_circles, worlds_greatest_stretch, pancake_stretch, inchworm });
