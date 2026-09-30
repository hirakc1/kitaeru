// Kitaeru animation v2 clips (v1.3b): Makkō-hō (真向法), the four seated stretches, in one shared frame ('mk') and camera.
// Kitaeru's own figures (the association asks that its illustrations are not reused): drawn from the steps as described in
// js/data/exercises.js. Seated on the floor, the sit bones pinned; a slow out-breath on every fold, in as you come up.
// The legs are fixed-foot limbs driven by channels, so the flow player's blend moves them smoothly from one stretch to the
// next: footX / footLift / footZ = the ankle (world; z out to that side), footTurn / footPitch / ankle = the foot's toe-out,
// toes-up and roll (sole turned in), plantX / plantY / hipAbd = the knee's pole (forward, up, out). The arms are placed in
// world space by handX / handY / handZ (hands on the feet, sliding down the legs, on the floor), within reach.
// Step 4 (kneeling, seat between the heels): the shins angle out past the thighs (feet wider than the knees), so the deep
// knee bend never passes the thighs through the calves; Kitaeru leans back onto the hands, not all the way down.
import { P, mm, ry, rz, rx } from '../core.js';
import { CLIPS, solve, hold } from './lib.js';

const D2R = Math.PI / 180;
const nrm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const col = (m, i) => [m[i], m[3 + i], m[6 + i]];
const CAM = { az: 46, el: 16 };
const SEAT = [-10, 2.5];                                               // the sit bones on the floor
// the foot's world axes [toes, up (dorsum), lateral] from toe-out, toes-up and roll (sole turned inwards)
function footAxes(sd, s, ch) {
  const R = mm(ry(-s * (ch['footTurn' + sd] || 0)), mm(rz(ch['footPitch' + sd] || 0), rx(-s * (ch['ankle' + sd] || 0))));
  const M = mm(R, [1, 0, 0, 0, 1, 0, 0, 0, s]);
  return [col(M, 0), col(M, 1), col(M, 2)];
}
// ankle from the channels; its height keeps the lowest foot point (heel, ball, toes, outer edge) on the floor
const FPTS = [[-5.6, -6.2, .3], [14.2, -7.1, 0], [20.8, -7.2, -.6], [4, -5.5, 4.5], [-4, 3.5, 0], [12, 3, 0]];
function ankleAt(sd, s, ch) {
  const [x, y, z] = footAxes(sd, s, ch), lo = Math.min(...FPTS.map(p => x[1] * p[0] + y[1] * p[1] + z[1] * p[2]));
  return [ch['footX' + sd], Math.max(ch['footLift' + sd] || 0, .4 - lo), (ch['footZ' + sd] || 0) * s];
}
const LEGS = { both: { mode: 'ik', foot: 'fixed', ankle: ankleAt, axes: footAxes,
  pole: (s, ch) => { const sd = s > 0 ? 'R' : 'L'; return nrm([ch['plantX' + sd] ?? 0, ch['plantY' + sd] ?? 1, s * (ch['hipAbd' + sd] ?? 0)]); } } };
const ARMS = { both: { mode: 'ik', grip: 'world', pole: [-.3, -1, .8], at: (sd, s, ch, S, G) => {
  const t = [ch['handX' + sd], ch['handY' + sd], ch['handZ' + sd] * s], d = Math.hypot(...t.map((v, i) => v - G[i])), m = .96 * 55;
  return d <= m ? t : G.map((g, i) => g + (t[i] - g) * m / d); } } };
const ARMS_PALM = { both: { mode: 'ik', grip: 'palm', pole: [-.2, -1, .3], dir: s => [-1, 0, .15 * s], target: (sd, s, ch) => [ch['handX' + sd], ch['handY' + sd], ch['handZ' + sd] * s] } };
const ARMS_FLOOR = { both: { mode: 'ik', grip: 'palm', pole: [-.4, -1, .7], dir: s => [1, 0, .15 * s], target: (sd, s, ch) => [ch['handX' + sd], 0, ch['handZ' + sd] * s] } };   // palms on the floor in front
const mk = (name, over) => ({
  name, cam: CAM, frame: 'mk', floor: true, floorZ: 80, trail: ['sternum'], still: 0, lag: .2, headLag: .3, shift: 0, shiftRoll: 0,
  pin: { pt: S => P(S.F.pelvis, [-3.7, -7.5, 0]), at: SEAT },
  legs: LEGS, arms: ARMS, ...over,
  base: { pitch: 4, lumbar: -2, thoracic: -2, cervical: -2, head: -4, palm: 90, fingers: 10, wrist: 0, handShape: 0, ...(over.base || {}) },
});
// legs: [ankle x, ankle z (out), toe-out, toes-up, roll, knee pole forward, up, out]
const legs = ([x, z, turn, pitch, roll, kx, ky, kz]) => ({ footX: x, footZ: z, footTurn: turn, footPitch: pitch, ankle: roll, plantX: kx, plantY: ky, hipAbd: kz });
const both = L => Object.fromEntries(Object.entries(legs(L)).flatMap(([k, v]) => [[k + 'R', v], [k + 'L', v]]));
const hands = (x, y, z) => ({ handX: x, handY: y, handZ: z });

// 1. First stretch (第一体操): the soles together, knees out to the sides; fold forward from the hips on the out-breath,
// the hands on the feet; back up on the in-breath. One rep per cycle (the flow sets the pace: 10 reps).
const B1 = both([28, 5, 8, 0, 80, .2, .7, 1]);                          // soles together near the groin, feet on their outer edges
const makko_1 = mk('First stretch: soles together', {
  counts: 1,
  keys: { up: { ...B1, ...hands(30, 17, 9), wrist: 20 }, fold: { ...B1, ...hands(33, 15, 9), wrist: 20, pitch: 42, lumbar: 10, thoracic: 8, cervical: 4, head: 2 } },
  timeline: [{ from: 'up', to: 'fold', dur: 2.2, r1: .3, r2: .35, breath: 'out' }, { from: 'fold', to: 'up', dur: 1.8, r1: .3, r2: .35, breath: 'in' }],
});
// 2. Second stretch (第二体操): legs straight and together, toes pointing up (ankles flexed); fold forward over the legs, the
// hands sliding down towards the feet. The ankles are placed at the legs' length in prep.
const B2 = both([70, 8, 2, 80, 0, 0, 1, 0]);
const makko_2 = mk('Second stretch: legs together', {
  counts: 1,
  keys: { up: { ...B2, ...hands(40, 16, 13) }, fold: { ...B2, ...hands(72, 12, 13), pitch: 50, lumbar: 10, thoracic: 8, cervical: 2, head: 2 } },
  timeline: [{ from: 'up', to: 'fold', dur: 2.2, r1: .3, r2: .35, breath: 'out' }, { from: 'fold', to: 'up', dur: 1.8, r1: .3, r2: .35, breath: 'in' }],
});
// 3. Third stretch (第三体操): legs wide, toes up, heels pressing away; lengthen the lower back and fold forward, the hands
// walking forward on the floor; back up.
const B3 = both([50, 50, 40, 80, 0, 0, 1, .35]);
const makko_3 = mk('Third stretch: legs wide', {
  counts: 1, arms: ARMS_FLOOR,
  keys: { up: { ...B3, ...hands(30, 3, 22), pitch: 30, lumbar: 2 }, fold: { ...B3, ...hands(60, 3, 24), pitch: 46, lumbar: 6, thoracic: 6, cervical: 0, head: 0 } },
  timeline: [{ from: 'up', to: 'fold', dur: 2.2, r1: .3, r2: .35, breath: 'out' }, { from: 'fold', to: 'up', dur: 1.8, r1: .3, r2: .35, breath: 'in' }],
});
// 4. Fourth stretch (第四体操), Kitaeru's default: kneeling with the seat between the heels, feet hip-width, the tops of the
// feet flat (toes back); lean back onto the hands and breathe slowly and deeply; come back up. A cycle of about 20 s (three
// in the minute of the step).
const B4 = both([-2, 27, 14, -180, 0, 1, -.15, .12]);                       // ankles beside the seat, toes pointing back, knees forward and in
const makko_4 = mk('Fourth stretch: kneeling lean back', {
  arms: ARMS_PALM,
  keys: {
    sit: { ...B4, ...hands(14, 15, 14), pitch: 6 },   // palms resting on the thighs
    back: { ...B4, ...hands(-28, 0, 24), pitch: -34, lumbar: 2, thoracic: 2, cervical: 2, head: -2 },
    back2: { ...B4, ...hands(-28, 0, 24), pitch: -34, lumbar: 2, thoracic: 1, cervical: 2, head: -2 },
  },
  timeline: [{ hold: 'sit', dur: 1, b: .5 }, { from: 'sit', to: 'back', dur: 3.5, r1: .3, r2: .35, breath: 'out' },
    { cyclic: ['back', 'back2'], dur: 12, breath: 'cycle', breaths: 2 }, { from: 'back', to: 'sit', dur: 3.5, r1: .3, r2: .35, breath: 'in' }],
});

// prep: the straight legs (steps 2 and 3) reach their ankles at 98.5% of the leg's length, heels on the floor; the lean-back
// hands in step 4 at the arms' reach behind the seat
for (const c of [makko_2, makko_3]) c.prep = ({ settle }) => {
  const k = c.keys, H = settle(k.up, true).pt.hipR, a = Math.atan2(k.up.footZR - H[2], k.up.footXR - H[0]);
  const place = d => { const x = H[0] + d * Math.cos(a), z = H[2] + d * Math.sin(a); for (const n in k) for (const sd of ['R', 'L']) { k[n]['footX' + sd] = x; k[n]['footZ' + sd] = z; } };
  place(solve(50, 100, d => { place(d); return settle(k.up, true).reachLeg; }, .985));
  if (c === makko_3) for (const [n, r] of [['up', .86], ['fold', .9]]) {   // palms on the floor, the arms within reach
    const x = solve(0, 110, v => settle({ ...k[n], handXR: v, handXL: v }).reach, r); k[n].handXR = k[n].handXL = x;
  }
};
makko_4.prep = ({ settle }) => {
  const k = makko_4.keys;
  const x = solve(-70, 0, v => settle({ ...k.back, handXR: v, handXL: v }).reach, .93);   // the arms nearly straight to the floor behind
  for (const n of ['back', 'back2']) k[n].handXR = k[n].handXL = x;

};

Object.assign(CLIPS, { makko_1, makko_2, makko_3, makko_4 });
