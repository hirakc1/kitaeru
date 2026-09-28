// Kitaeru animation v2 clips: rotation and anti-rotation (v1.2). See lib.js for conventions.
// Channels: yaw turns the whole body (pelvis up) about the vertical, + to the left; twist rotates the spine over the
// pelvis (lumbar little, thoracic most, then the neck), + to the left; headYaw turns the head, + to the left; bend is
// side bending, + to the right. Free hands (grip 'free') are placed in the upper-chest (T4) frame: handX forward,
// handY up the spine, handZ out to that hand's side. Every clip follows the fact-checked cues in js/data/exercises.js.
import { P } from '../core.js';
import { CLIPS, R, solve, dist, hold, repUp, box, rod, feet, mix, swing, stepLegs, floorPlank, straighten, palmsUnder, sidePlank, HANG, stand } from './lib.js';

const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const palms = S => mid(S.pt.palmR, S.pt.palmL);
// a band anchored to a post at (x, y, z): the post stands on the floor, the band runs to both hands
const bandPost = (x, y, z) => [rod([[x, 0, z], [x, Math.max(160, y + 25), z]], 2.4), rod([[x - 14, 1.3, z], [x + 14, 1.3, z]], 1.4),
  { t: 'band', a: [x, y, z + Math.sign(-z || 1) * 2.4], b: palms }];


// Pallof press: side-on to a band at chest height (anchored on the left); press straight out, pause 2 s, return
// without turning. Sides alternate (the band moves to the other side).
// hands pressed straight out from the chest (horizontal, meeting at the midline; the T4 frame leans forward ~21°)
const OUT = { handX: 52, handY: 12, handZ: 1.5 };
const PALLOF_FEET = { R: [-6, 15, 8], L: [-6, -15, 8] };
function pallof(f) {
  const c = stand(PALLOF_FEET, {
    cam: { az: 58, el: 9 }, swap: true, still: .2, trail: ['palmR'], _by: 122,
    base: { rootY: 87, pitch: 3, handShape: 2, palm: 90, wrist: 0, handX: 12, handY: -8, handZ: 3 },
    keys: { chest: {}, out: { ...OUT, scapProt: 6, twist: 1.5 } },
    props: c => bandPost(4, c._by, -110),
  });
  return Object.assign(c, f(c));
}
const bandHeight = (c, settle, key) => { c._by = palms(settle(c.keys[key])); c._by = c._by[1]; };
const pallof_press = pallof(c => ({
  name: 'Pallof press',
  timeline: [{ hold: 'chest', dur: .4, b: .8 }, { from: 'chest', to: 'out', dur: 1.1, r1: .25, r2: .4, breath: 'out' },
    { hold: 'out', dur: 2, b: .2 }, { from: 'out', to: 'chest', dur: 1.3, r1: .3, r2: .4, breath: 'in' }],
  prep({ settle }) { bandHeight(c, settle, 'chest'); },
}));
const pallof_press_overhead = pallof(c => ({
  name: 'Pallof press with overhead reach',
  keys: { chest: {}, out: { ...OUT, scapProt: 6, twist: 1.5 }, rise: { handX: 34, handY: 30, scapProt: 3, scapUp: 10, twist: 1 },
    up: { handX: 9, handY: 51, handZ: 4, scapUp: 22, scapElev: 1.5, twist: 1, thoracic: -2 } },
  timeline: [{ hold: 'chest', dur: .4, b: .8 }, { from: 'chest', to: 'out', dur: 1, r1: .25, r2: .4, breath: 'out' },
    { from: 'out', via: ['rise'], to: 'up', dur: 1.3, r1: .3, r2: .35, breath: 'in' }, { hold: 'up', dur: .4, b: 1 },
    { from: 'up', via: ['rise'], to: 'out', dur: 1.2, r1: .3, r2: .35, breath: 'out' }, { from: 'out', to: 'chest', dur: 1.1, r1: .3, r2: .4, breath: 'in' }],
  prep({ settle }) { bandHeight(c, settle, 'chest'); },
}));

// half-kneeling Pallof hold: the knee nearest the band down (pinned), the other foot flat in front; hands pressed out;
// a breathing hold. Sides alternate.
const half_kneeling_pallof_hold = (() => {
  const c = {
    name: 'Half-kneeling Pallof hold', cam: { az: 56, el: 9 }, floor: true, swap: true, still: 0, trail: [], _by: 80, _fx: 40,
    lag: .2, headLag: .3, shift: 0, shiftRoll: 0,
    pin: { pt: S => S.pt.kneeL, at: [-4, 5.2] },
    legs: { R: { mode: 'ik', foot: 'flat', toeOut: 6, ankle: () => [c._fx, 7.5, 13], pole: () => [1, 0, .15] } },
    arms: { both: { mode: 'ik', grip: 'free', pole: [-.3, -1, .5] } },
    base: { pitch: 0, hipFlexL: -4, kneeL: 92, ankleL: 58, hipAbdL: 2, handShape: 2, palm: 90, wrist: 0, ...OUT, scapProt: 6 },
    keys: { a: { twist: 1 }, b: { twist: 1.6, thoracic: -1, head: -1 } },
    timeline: hold('a', 'b', 5),
    props: c => bandPost(-4, c._by, -95),
    prep({ settle }) {
      const S = settle(c.keys.a);
      c._fx = S.pt.hipR[0] + 44; c._by = palms(settle(c.keys.a))[1];
    },
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// plank shoulder tap: high plank, feet wider than the hips; one hand lifts to tap the opposite shoulder while the
// hips stay still (a small weight shift onto the standing hand, no rocking); then the other hand
const plank_shoulder_tap = floorPlank(c => ({
  name: 'Plank shoulder tap', cam: { az: 24, el: 14 }, shift: 0, shiftRoll: 0, trail: ['palmR'],
  legs: { both: { mode: 'ik', foot: 'toes', knee: 3, toeOut: 6, ball: (sd, s) => [0, 0, 17 * s], pole: () => [.25, -1, 0] } },
  arms: { both: { mode: 'ik', grip: 'palm', arc: 12, pole: [-.55, -1, .85], dir: s => [1, 0, .12 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
  base: { cervical: 3, head: -8, thoracic: -2, lumbar: 1, wrist: 0, handXR: 6, handYR: 4, handZR: -13, handXL: 6, handYL: 4, handZL: -13 },
  keys: {
    top: { bodyAngle: 19, scapProt: 10 },
    tapR: { bodyAngle: 19, scapProt: 10, releaseR: 1, rootZ: -2.5, wristR: 10 },
    tapL: { bodyAngle: 19, scapProt: 10, releaseL: 1, rootZ: 2.5, wristL: 10 },
  },
  timeline: [{ hold: 'top', dur: .3, b: .5 }, { from: 'top', to: 'tapR', dur: .6, r1: .3, r2: .4 }, { hold: 'tapR', dur: .2, b: .5 },
    { from: 'tapR', to: 'top', dur: .6, r1: .3, r2: .4 }, { hold: 'top', dur: .3, b: .5 }, { from: 'top', to: 'tapL', dur: .6, r1: .3, r2: .4 },
    { hold: 'tapL', dur: .2, b: .5 }, { from: 'tapL', to: 'top', dur: .6, r1: .3, r2: .4 }],
  prep({ settle }) {
    straighten(c, settle, 'top', 12); palmsUnder(c, settle, 'top', { lo: 8, hi: 30 });
    for (const k of ['tapR', 'tapL']) c.keys[k].bodyAngle = c.keys.top.bodyAngle;
  },
}));

// ---------------------------------------------------------------------------------------------------------------
// all fours: both knees pinned under the hips, hands planted under the shoulders; the trunk pitch is solved so the
// arms are straight. The right hand can lift off (release) to a free target; the left leg is free (FK).
function quad(f) {
  const c = {
    floor: true, lag: .2, headLag: .3, shift: 0, shiftRoll: 0, _hx: 50, _hz: 18,
    pin: { pt: S => S.pt.kneeR, at: [0, 6.2] },
    arms: { both: { mode: 'ik', grip: 'palm', arc: 6, pole: [-.5, -1, .6], dir: s => [1, 0, .08 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { pitch: 90, hipFlex: 90, knee: 96, ankle: 86, cervical: 2, head: -6, thoracic: 0, lumbar: 1, wrist: 0 },
    prep({ settle }) {
      const q = c.keys.quad;   // pitch so the arm hangs straight (97%) to a hand under the shoulder
      q.pitch = solve(75, 110, p => { const g = settle({ ...q, pitch: p }, true).pt.glenoidR; return g[1] - 2.4; }, .97 * 55);
      const g = settle(q, true).pt.glenoidR; c._hx = g[0] + 5.2; c._hz = g[2] + 1;
      for (const k in c.keys) if (c.keys[k].pitch == null) c.keys[k].pitch = q.pitch + (c.keys[k].dp || 0);   // dp: lower the chest
    },
  };
  const o = f(c);
  return Object.assign(c, o, { prep: c.prep });
}
// bird dog reach-through: reach the right arm forward and the left leg back; draw elbow and knee together under the
// body; reach long again; hips level. Sides alternate.
const bird_dog_row = quad(c => ({
  name: 'Bird dog reach-through', cam: { az: 20, el: 12 }, swap: true, still: .15, trail: ['palmR'],
  keys: {
    quad: {},
    lift: { releaseR: .5, handXR: 10, handYR: 40, handZR: 8, palmR: 90, hipFlexL: 72, kneeL: 112, ankleL: 45 },   // the knee leaves the floor first
    reach: { releaseR: 1, handXR: -18, handYR: 51, handZR: 6, palmR: 90, scapUpR: 20, hipFlexL: -8, kneeL: 3, ankleL: 30, head: -2 },
    tuck: { releaseR: 1, handXR: 14, handYR: 22, handZR: 4, palmR: 90, hipFlexL: 40, kneeL: 112, ankleL: 30, thoracic: 5, lumbar: 3 },   // the knee folds first
    crunch: { releaseR: 1, handXR: 28, handYR: -14, handZR: 1, palmR: 90, hipFlexL: 126, kneeL: 128, ankleL: 62, thoracic: 12, lumbar: 8, cervical: 12, head: -2 },
  },
  timeline: [{ hold: 'quad', dur: .4, b: .5 }, { from: 'quad', via: ['lift'], to: 'reach', at: [0, .3, 1], dur: 1.3, r1: .25, r2: .35, breath: 'in' },
    { from: 'reach', via: ['tuck'], to: 'crunch', dur: 1.2, r1: .3, r2: .35, breath: 'out' }, { from: 'crunch', via: ['tuck'], to: 'reach', dur: 1.2, r1: .3, r2: .35, breath: 'in' },
    { from: 'reach', via: ['lift'], to: 'quad', at: [0, .7, 1], dur: 1.2, r1: .3, r2: .4, breath: 'out' }],
}));
// thread the needle: the right arm reaches under the body towards the left, shoulder towards the floor, then sweeps up
// to the ceiling; the eyes follow the hand. Sides alternate.
const thread_the_needle = quad(c => ({
  name: 'Thread the needle', cam: { az: 30, el: 18 }, swap: true, still: .3, trail: ['palmR'],
  keys: {
    quad: {},
    under: { releaseR: 1, handXR: 14, handYR: 4, handZR: -26, palmR: 180, twist: 38, headYaw: 30, cervical: 4, pitch: null, dp: 14, thoracic: 6 },
    open: { releaseR: 1, handXR: -40, handYR: 6, handZR: 10, palmR: 0, twist: -48, headYaw: -45, head: -14 },
  },
  timeline: [{ hold: 'quad', dur: .4, b: .3 }, { from: 'quad', to: 'under', dur: 1.6, r1: .3, r2: .4, breath: 'out' }, { hold: 'under', dur: .3, b: 0 },
    { from: 'under', to: 'open', dur: 1.8, r1: .3, r2: .4, breath: 'in' }, { hold: 'open', dur: .3, b: 1 }, { from: 'open', to: 'quad', dur: 1.1, r1: .3, r2: .4, breath: 'out' }],
}));

// ---------------------------------------------------------------------------------------------------------------
// open book: lying on the left side, knees stacked and bent to 90° on a small cushion under the head; the top arm sweeps
// over and the chest turns to the ceiling, the eyes following the hand; the knees and hips stay still. One side shown.
const open_book = (() => {
  const c = {
    name: 'Open book', cam: { az: 8, el: 66 }, floor: true, still: .55, trail: ['palmR'], _lx: 0, _lz: 45,
    lag: .25, headLag: .5, shift: 0, shiftRoll: 0,
    pin: { pt: S => P(S.F.pelvis, [0, -2, -12.5]), at: [null, 4] },   // the lower hip on the floor
    arms: { L: { mode: 'ik', grip: 'palm', pole: [.2, -1, .1], dir: () => [.12, 0, 1], target: () => [c._lx, 0, c._lz] },
      R: { mode: 'ik', grip: 'free', pole: [-.4, -1, .4] } },
    base: { yaw: -90, roll: -90, bend: 11, hipFlex: 88, knee: 92, ankle: 15, hipAbdR: -4, cervical: 6, head: 2, wrist: 0, fingers: 15,
      handXR: 46, handYR: -2, handZR: -4, palmR: 0 },
    keys: {
      start: {},
      over: { handXR: 12, handYR: 4, handZR: 46, twist: -30, headYaw: -25 },
      open: { handXR: -28, handYR: 2, handZR: 42, twist: -72, headYaw: -62, head: -4 },
    },
    timeline: [{ hold: 'start', dur: .5, b: .9 }, { from: 'start', via: ['over'], to: 'open', dur: 2.4, r1: .3, r2: .4, breath: 'out' },
      { hold: 'open', dur: .8, b: 0 }, { from: 'open', via: ['over'], to: 'start', dur: 2.2, r1: .3, r2: .4, breath: 'in' }],
    props: c => [box([c._hx - 13, 0, -13], [c._hx + 13, 7, 13], -1e4)],   // cushion under the head
    prep({ settle }) {
      const S = settle(c.keys.start, true), g = S.pt.glenoidL;
      c._lx = g[0] + 2; c._lz = g[2] + Math.sqrt(Math.max(0, (.96 * 55) ** 2 - (g[1] - 2.4) ** 2 - 4)) + 5.2; c._hx = S.pt.headTop[0] - 8;   // lower arm straight along the floor
      c.floorZ = Math.ceil(c._lz + 14);   // the mat reaches past the lower hand (it rests on the floor, not off the edge)
    },
  };
  return c;
})();

// seated trunk rotation: sitting tall on a chair (pelvis pinned on the seat), feet flat, arms crossed on the chest;
// the ribcage turns to one side while the hips and knees keep facing forward. Sides alternate.
const SEAT = 45;
const seated_trunk_rotation = (() => {
  const c = {
    name: 'Seated trunk rotation', cam: { az: 74, el: 14 }, floor: true, swap: true, still: .2, trail: ['acromionR'], _fx: 40,
    lag: .25, headLag: .4, shift: 0, shiftRoll: 0,
    pin: { pt: S => P(S.F.pelvis, [-3.7, -7.5, 0]), at: [-16, SEAT + 2.5] },
    legs: { both: { mode: 'ik', foot: 'flat', toeOut: 6, ankle: (sd, s) => [c._fx, 7.5, 13 * s], pole: s => [1, .1, .12 * s] } },
    arms: { both: { mode: 'ik', grip: 'free', pole: [-.3, -1, .9] } },
    base: { pitch: -2, lumbar: -2, handXR: 13, handYR: 1, handZR: -17, handXL: 10, handYL: -4, handZL: -17, palm: 170, fingers: 25, cervical: 1 },
    keys: { mid: {}, turn: { twist: 58, headYaw: 22, cervical: 1 } },
    timeline: [{ hold: 'mid', dur: .4, b: .9 }, { from: 'mid', to: 'turn', dur: 1.5, r1: .3, r2: .4, breath: 'out' }, { hold: 'turn', dur: .3, b: 0 },
      { from: 'turn', to: 'mid', dur: 1.7, r1: .3, r2: .4, breath: 'in' }],
    props: [box([-40, 0, -22], [4, SEAT, 22]), box([-44, 0, -22], [-38, 90, 22])],   // chair: seat and back
    prep({ settle }) { c._fx = settle(c.keys.mid, true).pt.kneeR[0] + 2; },
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// trunk twist (Radio Taisō): feet planted apart, loose arms swing around the body one way then the other, then two
// bigger twists with the eyes following the hands. Brisk (about one count a second).
// woodchop: hands together high over the right shoulder, chop diagonally down towards the left knee; the hips lead and
// the back (right) foot pivots on its ball. Sides alternate. band_woodchop: the same against a band anchored high on
// the right, arms long.
const CHOP_FEET = { L: [0, -17, 14], R: [22, 17, 8, 0, 0, 1] };   // right foot placed by its ball: it turns on it
function chop(f) {
  const c = stand(CHOP_FEET, {
    cam: { az: 76, el: 10 }, swap: true, still: .3, trail: ['palmR'],
    base: { handShape: 2, palm: 90, wrist: 0, fingers: 0 },
    keys: {
      high: { yaw: -26, twist: -24, pitch: -2, rootY: 90, weight: .62, headYaw: -12,
        handXR: 14, handYR: 38, handZR: 19, handXL: 14, handYL: 38, handZL: -19 },
      low: { yaw: 26, twist: 22, pitch: 30, rootY: 79, weight: .3, headYaw: 6, head: -10, lumbar: 2, thoracic: 6,
        handXR: 36, handYR: -36, handZR: -2, handXL: 36, handYL: -36, handZL: 2, scapProt: 14, footTurnR: 48, footPitchR: -34 },
    },
    timeline: [{ hold: 'high', dur: .3, b: .9 }, { from: 'high', via: ['mid'], to: 'low', dur: .8, r1: .25, r2: .4, breath: 'out', effort: 1 },
      { hold: 'low', dur: .2, b: 0 }, { from: 'low', via: ['mid'], to: 'high', dur: 1.1, r1: .3, r2: .4, breath: 'in' }],
  });
  Object.assign(c, f(c));
  c.keys.mid = { ...mix(c.keys.high, c.keys.low, .4), footPitchR: -24, footTurnR: 14 };   // heel up first, then the pivot
  return c;
}
const bodyweight_woodchop = chop(() => ({ name: 'Woodchop' }));
const band_woodchop = chop(c => ({
  name: 'Band woodchop', props: bandPost(26, 196, 96),
  keys: { ...c.keys, high: { ...c.keys.high, handXR: 22, handYR: 34, handZR: 22, handXL: 22, handYL: 34, handZL: -22 },
    low: { ...c.keys.low, handXR: 40, handYR: -32, handZR: -2, handXL: 40, handYL: -32, handZL: 2 } },
  timeline: [{ hold: 'high', dur: .3, b: .9 }, { from: 'high', via: ['mid'], to: 'low', dur: 1.1, r1: .25, r2: .4, breath: 'out', effort: 1 },
    { hold: 'low', dur: .3, b: 0 }, { from: 'low', via: ['mid'], to: 'high', dur: 1.5, r1: .3, r2: .4, breath: 'in' }],
}));

// reverse lunge with rotation: the right foot steps back into a lunge; the chest turns over the (left) front leg with
// the arms reaching forward; back to the centre; push up through the front foot and step back in. Sides alternate.
const rotational_lunge = (() => {
  const L = [0, -11, 6], Rin = [20, 11, 6, 0, 0, 1], Rback = [-45, 11, 6, 0, 0, 1];   // right foot placed by its ball
  const arms = { handX: 44, handY: -6, handZ: 7, palm: 90, fingers: 10 };
  const k = {
    s0: { weight: .5, rootY: 88, ...feet({ L, R: Rin }) },
    s1: { weight: 0, rootY: 87, ...feet({ L, R: Rin }) },
    b0: { weight: .3, rootY: 72, pitch: 4, ...arms, ...feet({ L, R: Rback }) },
    b1: { weight: .35, rootY: 56, pitch: 5, ...arms, ...feet({ L, R: Rback }) },
    t: { weight: .35, rootY: 56, pitch: 5, ...arms, twist: 44, yaw: 8, headYaw: 20, ...feet({ L, R: Rback }) },
    b2: { weight: .3, rootY: 70, pitch: 4, ...arms, ...feet({ L, R: Rback }) },
    b3: { weight: 0, rootY: 80, pitch: 3, ...feet({ L, R: Rback }) },
  };
  const c = stand({}, {
    name: 'Reverse lunge with rotation', cam: { az: 40, el: 8 }, swap: true, still: .3, trail: ['palmR'], keys: k,
    base: { rootY: 88 },
    timeline: [{ hold: 's0', dur: .3, b: .5 }, { from: 's0', to: 's1', dur: .5, r1: .3, r2: .3 },
      swing(k, 'sb', 's1', 'b0', 'R', Rin, Rback, { dur: 1, lift: 5 }),
      { from: 'b0', to: 'b1', dur: .7, r1: .3, r2: .4, breath: 'in' }, { from: 'b1', to: 't', dur: .9, r1: .3, r2: .4, breath: 'out' },
      { hold: 't', dur: .3, b: 0 }, { from: 't', to: 'b1', dur: .8, r1: .3, r2: .4, breath: 'in' },
      { from: 'b1', to: 'b3', dur: .9, r1: .3, r2: .4, breath: 'out', effort: 1 }, swing(k, 'sf', 'b3', 's0', 'R', Rback, Rin, { dur: 1, lift: 5 })],
  });
  return c;
})();

// windmill: feet wide, the right arm straight up; hinge sideways at the hip, the left hand sliding down the left leg;
// the eyes stay on the top hand; up slowly. The top arm points at the ceiling throughout (world target); the lower hand
// is placed on the leg (release = how far down the leg). Sides alternate.
const standing_windmill = stand({ R: [-4, 30, 4], L: [-4, -30, 40] }, {
  name: 'Windmill', cam: { az: 64, el: 8 }, floorZ: 50, swap: true, still: .4, trail: ['palmL'],
  arms: {
    R: { mode: 'ik', grip: 'world', pole: [-.3, -1, .4], at: (sd, s, ch, S, G) => [G[0], G[1] + 53.5, G[2]] },
    L: { mode: 'ik', grip: 'world', pole: [-.3, -1, .4], at: (sd, s, ch, S, G) => {   // (skeleton points: mirror correctly)
      const u = ch.releaseL, p = S.pt, lp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
      const top = lp(p.hipL, p.kneeL, .12), bot = lp(p.kneeL, p.ankleL, .75);
      // slide down the leg only as far as the arm reaches (96%) at this moment of the hinge
      let lo = 0, hi = u;
      const at = t => { const q = lp(top, bot, t); return [q[0] + 4.5, q[1], q[2] + 1.5]; };
      if (dist(at(hi), G) > .96 * 55) { for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (dist(at(m), G) > .96 * 55) hi = m; else lo = m; } return at(lo); }
      return at(hi); } },
  },
  base: { palmR: 0, fingersR: 5, palmL: 120, fingersL: 15, releaseL: 0 },
  keys: {
    up: { rootY: 88, headYaw: -10, head: -8 },
    down: { rootY: 80, yaw: 22, pitch: 50, roll: -18, bend: -44, twist: -34, headYaw: -40, head: -26, releaseL: .55 },
  },
  timeline: [{ hold: 'up', dur: .5, b: .9 }, { from: 'up', to: 'down', dur: 2, r1: .3, r2: .4, breath: 'out' }, { hold: 'down', dur: .4, b: 0 },
    { from: 'down', to: 'up', dur: 2.3, r1: .3, r2: .4, breath: 'in' }],
});

// side plank reach-through: side plank on the left forearm, top arm up; thread it under the body with a slow controlled
// turn (the chest turns to the floor), then open back to the ceiling; the hips stay high. One side shown.
const side_plank_reach_through = sidePlank(() => ({
  name: 'Side plank reach-through', still: .15, trail: ['palmR'],
  arms: { R: { mode: 'ik', grip: 'free', pole: [-.3, -1, .6] } },
  base: { yaw: -90, cervical: 2, head: 0, fingersL: 25, palmR: 0, fingersR: 10, wristR: 0, handXR: 2, handYR: 3, handZR: 68 },   // top arm straight up (the glenoid sits 15.5 out in the T4 frame)
  keys: {
    open: { bodyAngle: 20 },
    thread: { bodyAngle: 20, twist: 30, handXR: 6, handYR: -6, handZR: -20, palmR: 90, headYaw: 24, head: 6, scapProtR: 12 },
  },
  timeline: [{ hold: 'open', dur: .5, b: .9 }, { from: 'open', to: 'thread', dur: 1.8, r1: .3, r2: .4, breath: 'out' }, { hold: 'thread', dur: .3, b: 0 },
    { from: 'thread', to: 'open', dur: 1.8, r1: .3, r2: .4, breath: 'in' }],
}));

Object.assign(CLIPS, {
  open_book, thread_the_needle, seated_trunk_rotation, bodyweight_woodchop, rotational_lunge, band_woodchop,
  standing_windmill, bird_dog_row, half_kneeling_pallof_hold, plank_shoulder_tap, pallof_press, pallof_press_overhead, side_plank_reach_through,
});
