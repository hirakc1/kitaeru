// Kitaeru animation v2 clips: Morning Taisō (v1.2), the 13 steps of radio_taiso_1 plus Kitaeru's heel-raise swap.
// Brisk, on the count (about 1 count per second). Every step shares one stance, one camera and one frame (`frame: 'rt'`)
// and starts and ends standing tall with the arms hanging, so the flow player can chain them without a jump.
// `counts`: the counted reps in one clip cycle. The flow player sets the pace from the step (sec / count), so one cycle
// lasts counts × that; on its own (library, warm-ups) a clip plays at its natural brisk tempo.
// Free hands are placed in the upper-chest (T4) frame: handX forward, handY up the spine, handZ out to that hand's side.
// Every clip follows the fact-checked cues in js/data/exercises.js.
import { CLIPS, stand, feet } from './lib.js';

const W = 20;                                           // half stance width (cm): feet about hip-width apart
const RT_FEET = { R: [-5, W, 8], L: [-5, -W, 8] };
const CAM = { az: 60, el: 8 };
// The T4 frame leans forward about 21° when standing tall, so world directions from the shoulder (glenoid at about
// (2, 3, 15.5) in it) are: straight down (19, -50), straight up (-19, 50), forward (50, 19), for an arm of ~53 cm.
const NEUT = { handX: 20, handY: -47, handZ: 19, palm: 90, fingers: 20, wrist: 4 };   // arms hanging straight, relaxed
const rt = (name, over) => stand(RT_FEET, { name, cam: CAM, frame: 'rt', still: 0, ...over, base: { ...NEUT, ...(over.base || {}) } });
const heels = up => ({ footPitchR: -up, footPitchL: -up, onBalls: 1 });   // heels rise (about the balls), degrees; weight on the balls
// hand targets (T4 frame), both sides mirrored unless given per side
const H = (x, y, z, extra = {}) => ({ handX: x, handY: y, handZ: z, ...extra });
// a straight arm (r cm to the wrist) raised el degrees from hanging (90 = horizontal, 180 = overhead), in a plane turned
// az degrees from straight ahead (0) to straight out to the side (90), as a T4-frame target for a standing trunk
const ARM = (el, az, extra = {}, r = 52.8) => {
  const e = el * Math.PI / 180, a = az * Math.PI / 180, wx = Math.sin(e) * Math.cos(a), wy = -Math.cos(e), wz = Math.sin(e) * Math.sin(a);
  return H(+(1.9 + r * (wx * .934 - wy * .356)).toFixed(1), +(3.3 + r * (wx * .356 + wy * .934)).toFixed(1), +(15.5 + r * wz).toFixed(1), extra);
};
const UP = ARM(172, 12, { palm: 0, fingers: 5 }, 54.5);          // arms straight overhead, palms in
const FRONT = ARM(90, 8, { palm: 0, fingers: 10 });          // arms forward at shoulder height
const SIDE = ARM(90, 88, { palm: 90, fingers: 10 });         // arms out to the sides, palms down
// the arcs between them (targets in straight lines would pass the head with bent elbows)
const ARC = { f1: ARM(45, 8, { palm: 0 }), f: FRONT, f2: ARM(135, 8, { palm: 0 }), s1: ARM(135, 88, { palm: 90 }), s: SIDE, s2: ARM(45, 88, { palm: 90 }) };
const ARC_UP = { from: 'a', via: ['f1', 'f', 'f2'], to: 'up' }, ARC_DOWN = { from: 'up', via: ['s1', 's', 's2'], to: 'a' };
const HIPS = H(-6, -30, 20, { palm: 90, fingers: 0, elbow: 60 });   // hands on the hips, elbows out

// 1. Stretch up (伸びの運動): arms swing forward and up overhead, stretch tall, lower out to the sides. 1 rep ≈ 5 s.
const rt_stretch_up = rt('Stretch up', {
  counts: 1, trail: ['palmR'],
  keys: { a: {}, ...ARC, up: { ...UP, rootY: 89, scapElev: .6, head: -4 } },
  timeline: [{ ...ARC_UP, dur: 1.8, r1: .3, r2: .3, breath: 'in' }, { hold: 'up', dur: .6, b: 1 },
    { ...ARC_DOWN, dur: 2.2, r1: .3, r2: .35, breath: 'out' }, { hold: 'a', dur: .4, b: 0 }],
});

// 2 and 12. Arm swing and knee bend: the arms cross in front as the knees bend, then swing out to the sides as the
// legs straighten and the heels lower and lift, in time; light and springy. 1 rep ≈ 1.5 s.
const rt_arm_swing_knee_bend = rt('Arm swing and knee bend', {
  counts: 1, trail: ['palmR'],
  keys: {
    a: {},
    cross: { ...H(24, -34, -6, { palm: 90, fingers: 15 }), rootY: 83, pitch: 5, onBalls: .8 },
    open: { ...H(15, -29, 51, { palm: 90, fingers: 10 }), rootY: 90, ...heels(18) },
    down: { onBalls: .8 },
  },
  timeline: [{ from: 'a', to: 'cross', dur: .5, r1: .3, r2: .3 }, { from: 'cross', to: 'open', dur: .55, r1: .3, r2: .3 },
    { from: 'open', via: ['down'], to: 'a', at: [0, .75, 1], dur: .45, r1: .3, r2: .3 }],
});

// 3. Arm circles: big, loose circles from the shoulders, outwards then inwards; shoulders relaxed. 2 reps ≈ 5 s.
// straight arms sweep a big circle: crossing low in front, up the front, overhead, out to the side and down
const CIRC = { x: H(31, -28, -2, { palm: 90 }), m: H(32, 36, 6, { palm: 0 }), u: H(-11, 48, 17, { palm: 0 }), s: H(-2, 14, 61, { palm: 90 }),
  l: H(15, -26, 49, { palm: 90 }) };
const rt_arm_circles = rt('Arm circles', {
  counts: 2, trail: ['palmR'],
  keys: { a: {}, ...CIRC },
  timeline: [{ cyclic: ['a', 'x', 'm', 'u', 's', 'l'], dur: 2.5 },   // outwards: across the front, up, out to the side, down
    { cyclic: ['a', 'l', 's', 'u', 'm', 'x'], dur: 2.5 }],             // inwards
});

// 4. Chest opener (胸を反らす運動): arms swing across the front, then out and up; the chest lifts and opens and the eyes
// look up a little; the lower back stays easy. 1 rep ≈ 3 s.
const rt_chest_opener = rt('Chest opener', {
  counts: 1, trail: ['palmR'],
  keys: {
    a: {},
    x: { ...H(24, -30, -6, { palm: 90 }), rootY: 86 },
    open: { ...H(-15, 33, 54, { palm: 0, fingers: 5 }), thoracic: -9, lumbar: -3, cervical: -6, head: -12, scapProt: -6 },
  },
  timeline: [{ from: 'a', to: 'x', dur: .8, r1: .3, r2: .3, breath: 'out' }, { from: 'x', to: 'open', dur: 1, r1: .3, r2: .3, breath: 'in' },
    { hold: 'open', dur: .3, b: 1 }, { from: 'open', to: 'a', dur: .9, r1: .3, r2: .35, breath: 'out' }],
});

// 5. Side bend (体を横に曲げる運動): one arm sweeps up overhead, the other hand on the hip; bend sideways with a small,
// easy bounce, come back up; two per side, then switch. bend + is to the right: this side bends left, right arm up.
const OVER = { handXR: -14, handYR: 46, handZR: -3, palmR: 0, fingersR: 5 };
const HIP_L = { handXL: -6, handYL: -30, handZL: 20, palmL: 90, fingersL: 0, elbowL: 60 };
const rt_side_bend = rt('Side bend', {
  counts: 4, swap: true, trail: ['palmR'],
  keys: {
    a: {},
    up: { ...OVER, ...HIP_L },
    b1: { ...OVER, ...HIP_L, bend: -24, headYaw: 0, weight: .42 },
    b2: { ...OVER, ...HIP_L, bend: -30, weight: .4 },
  },
  timeline: [{ from: 'a', to: 'up', dur: 1, r1: .3, r2: .3, breath: 'in' },
    { from: 'up', to: 'b1', dur: .9, r1: .3, r2: .25, breath: 'out' }, { from: 'b1', to: 'b2', dur: .5, r1: .3, r2: .3 },
    { from: 'b2', to: 'up', dur: .9, r1: .3, r2: .3, breath: 'in' },
    { from: 'up', to: 'b1', dur: .9, r1: .3, r2: .25, breath: 'out' }, { from: 'b1', to: 'b2', dur: .5, r1: .3, r2: .3 },
    { from: 'b2', to: 'up', dur: .9, r1: .3, r2: .3 }, { from: 'up', to: 'a', dur: .9, r1: .3, r2: .35 }],
});

// 6. Forward and back bend (体を前後に曲げる運動): three light bounces forward with the hands towards the floor, then hands
// on the hips and a gentle lean back; knees soft, a comfortable range. 1 rep ≈ 8 s.
// the hands hang towards the floor: world down in the T4 frame of a trunk bent forward by pitch (+ the spine's own flexion)
const FWD = pitch => { const a = (pitch + 33) * Math.PI / 180;
  return { pitch, rootY: 85, ...H(+(1.9 + 51 * Math.sin(a)).toFixed(1), +(3.3 - 51 * Math.cos(a)).toFixed(1), 13, { palm: 90, fingers: 20 }), head: 6, lumbar: 6, thoracic: 6 }; };
const rt_forward_back_bend = rt('Forward and back bend', {
  counts: 1, trail: ['palmR'],
  keys: {
    a: {},
    f1: FWD(52), f1u: FWD(42), f2: FWD(62), f2u: FWD(50), f3: FWD(72),
    hips: { ...HIPS, pitch: 0 },
    back: { ...HIPS, pitch: -6, lumbar: -8, thoracic: -8, cervical: -6, head: -8, rootY: 87 },
  },
  timeline: [{ from: 'a', to: 'f1', dur: 1.1, r1: .3, r2: .3, breath: 'out' }, { from: 'f1', to: 'f1u', dur: .45, r1: .3, r2: .3 },
    { from: 'f1u', to: 'f2', dur: .55, r1: .3, r2: .3 }, { from: 'f2', to: 'f2u', dur: .45, r1: .3, r2: .3 },
    { from: 'f2u', to: 'f3', dur: .6, r1: .3, r2: .3 },
    { from: 'f3', to: 'hips', dur: 1.5, r1: .3, r2: .3, breath: 'in' }, { from: 'hips', to: 'back', dur: 1, r1: .3, r2: .3 },
    { hold: 'back', dur: .5, b: 1 }, { from: 'back', to: 'hips', dur: .9, r1: .3, r2: .3, breath: 'out' }, { from: 'hips', to: 'a', dur: .95, r1: .3, r2: .35 }],
});

// 7. Trunk twist (体をねじる運動): feet planted apart, loose arms swing around the body one way then the other, then two
// bigger twists with the eyes following the hands. 4 counts ≈ 5 s. (Also standalone in the library.)
const twistKey = (yaw, twist, big) => ({ yaw, twist, headYaw: big ? Math.sign(yaw) * 32 : Math.sign(yaw) * 8, weight: .5 - Math.sign(yaw) * .12,
  // turning left: the right arm wraps across the front, the left behind the back (and the mirror image turning right)
  ...(yaw > 0 ? { handXR: 26, handYR: -20, handZR: -24, handXL: -18, handYL: -24, handZL: 24 } : { handXL: 26, handYL: -20, handZL: -24, handXR: -18, handYR: -24, handZR: 24 }),
  palm: 90, fingers: 30, elbow: 20 });
const rt_trunk_twist = rt('Trunk twist', {
  counts: 4, still: .15, trail: ['palmR'],
  keys: { c: {}, l1: twistKey(16, 32), r1: twistKey(-16, -32), l2: twistKey(26, 56, 1), r2: twistKey(-26, -56, 1) },
  timeline: [{ from: 'c', to: 'l1', dur: .7, r1: .3, r2: .3 }, { from: 'l1', to: 'r1', dur: 1, r1: .3, r2: .3 },
    { from: 'r1', to: 'l2', dur: 1.1, r1: .3, r2: .3 }, { from: 'l2', to: 'r2', dur: 1.3, r1: .3, r2: .3 }, { from: 'r2', to: 'c', dur: .9, r1: .3, r2: .4 }],
});

// 8. Arms up and down (腕を上下に伸ばす運動): hands to the shoulders, stretch straight up (heels rise), back to the
// shoulders, then stretch down to the sides; crisp, on the count. 1 rep = 4 counts ≈ 4 s.
const SH = H(10, 4, 16, { palm: 0, fingers: 60, elbow: 130 });
const rt_arms_up_down = rt('Arms up and down', {
  counts: 1, trail: ['palmR'],
  keys: { a: {}, sh: SH, shB: { ...SH, onBalls: 1 }, up: { ...UP, rootY: 92, ...heels(22) }, dn: H(19, -47, 18, { palm: 0, fingers: 5 }) },
  timeline: [{ from: 'a', to: 'sh', dur: .5, r1: .25, r2: .3 }, { from: 'sh', via: ['shB'], to: 'up', at: [0, .3, 1], dur: .6, r1: .2, r2: .35 }, { hold: 'up', dur: .3, b: 1 },
    { from: 'up', via: ['shB'], to: 'sh', at: [0, .7, 1], dur: .6, r1: .25, r2: .3 }, { hold: 'sh', dur: .3 }, { from: 'sh', to: 'dn', dur: .5, r1: .2, r2: .35 },
    { hold: 'dn', dur: .3 }, { from: 'dn', to: 'sh', dur: .5, r1: .25, r2: .3 }, { from: 'sh', to: 'a', dur: .4, r1: .3, r2: .35 }],
});

// 9. Diagonal bend and chest opener (体を斜め下に曲げ胸を反らす運動): bend down diagonally towards one foot with small
// bounces, rise facing forward and open the arms wide, arching the chest; two per side, then switch. This side: left foot.
const DIAG = (pitch) => ({ pitch, yaw: 22, twist: 8, rootY: 84, weight: .38, handXR: 20, handYR: -36, handZR: -12, handXL: 18, handYL: -36, handZL: 6,
  palm: 90, fingers: 20, head: 6 });
const WIDE = { ...H(-15, 33, 54, { palm: 0, fingers: 5 }), thoracic: -9, lumbar: -3, cervical: -5, head: -12, scapProt: -6 };
const rt_diagonal_bend = rt('Diagonal bend and chest opener', {
  counts: 4, swap: true, trail: ['palmR'],
  keys: { a: {}, d1: DIAG(60), d1u: DIAG(50), d2: DIAG(68), open: WIDE },
  timeline: [{ from: 'a', to: 'd1', dur: .9, r1: .3, r2: .3, breath: 'out' }, { from: 'd1', to: 'd1u', dur: .35, r1: .3, r2: .3 },
    { from: 'd1u', to: 'd2', dur: .45, r1: .3, r2: .3 }, { from: 'd2', to: 'open', dur: 1.2, r1: .3, r2: .3, breath: 'in' },
    { from: 'open', to: 'd1', dur: 1.1, r1: .3, r2: .3, breath: 'out' }, { from: 'd1', to: 'd1u', dur: .35, r1: .3, r2: .3 },
    { from: 'd1u', to: 'd2', dur: .45, r1: .3, r2: .3 }, { from: 'd2', to: 'open', dur: 1.2, r1: .3, r2: .3, breath: 'in' },
    { from: 'open', to: 'a', dur: 1, r1: .3, r2: .35, breath: 'out' }],
});

// 10. Trunk circle (体を回す運動): feet apart, a big slow circle of the upper body from the hips with the arms swinging
// wide with it; two one way, then two the other (the mirrored half). bend + is to the right.
const TC = {
  l: { bend: -26, pitch: 8, ...H(-8, 40, 24, { palm: 0 }), handZR: -10, weight: .4 },   // over to the left, arms overhead
  f: { pitch: 52, rootY: 85, ...H(30, -36, 10, { palm: 90 }) },                        // down in front
  r: { bend: 26, pitch: 8, ...H(-8, 40, 24, { palm: 0 }), handZL: -10, weight: .6 },     // over to the right
  b: { pitch: -5, lumbar: -7, thoracic: -8, head: -8, ...H(-16, 42, 20, { palm: 0 }) },   // up and a little back
};
const rt_trunk_circle = rt('Trunk circle', {
  counts: 4, swap: true, trail: ['palmR'],
  keys: { a: {}, ...TC },
  timeline: [{ from: 'a', to: 'l', dur: .9, r1: .35, r2: 0 }, { cyclic: ['l', 'f', 'r', 'b'], dur: 3.6 }, { cyclic: ['l', 'f', 'r', 'b'], dur: 3.6 },
    { from: 'l', to: 'a', dur: .9, r1: 0, r2: .35 }],
});

// 11. Two-foot hops: small, springy hops on both feet, then hops with the feet apart and together; land softly.
// 4 hops ≈ 3.5 s.
const AIR = (w) => ({ rootY: 92, onBalls: 1, ...feet({ R: [-5, w, 8, 4, -12], L: [-5, -w, 8, 4, -12] }) });
const rt_two_foot_hops = rt('Two-foot hops', {
  counts: 4, trail: [],
  keys: {
    a: { rootY: 86, onBalls: 1 }, air: AIR(W), land: { rootY: 85, onBalls: 1 },
    airN: AIR(14), shut: { rootY: 85, onBalls: 1, ...feet({ R: [-5, 8, 6], L: [-5, -8, 6] }) }, airW: AIR(20),
  },
  // each hop: spring up (0.3 s), come down (0.3 s), a short soft landing on the balls (0.28 s)
  timeline: [['a', 'air', 'land'], ['land', 'air', 'land'], ['land', 'airN', 'shut'], ['shut', 'airW', 'a']].flatMap(([g, air, l]) => [
    { from: g, to: air, dur: .3, r1: .2, r2: .6 }, { from: air, to: l, dur: .3, r1: .6, r2: .2 }, { hold: l, dur: .28 }]),
});

// Heel raises (no-hop option; Kitaeru's own swap for the hops, not part of the sequence): rise onto the balls of the
// feet, lower with control, in time with the count. 1 rep ≈ 0.9 s.
const rt_heel_raise = rt('Heel raises', {
  counts: 1, trail: ['heelR'],
  keys: { a: {}, pre: { onBalls: 1 }, up: { rootY: 92.5, ...heels(26) } },
  timeline: [{ from: 'a', via: ['pre'], to: 'up', at: [0, .3, 1], dur: .45, r1: .3, r2: .35 }, { hold: 'up', dur: .1, b: 1 },
    { from: 'up', via: ['pre'], to: 'a', at: [0, .7, 1], dur: .45, r1: .3, r2: .35 }],
});

// 13. Deep breath (深呼吸): the arms rise forwards and up as you breathe in and lower out to the sides as you breathe
// out; slow and full, no breath holding. 1 rep ≈ 5 s.
const rt_deep_breath = rt('Deep breath', {
  counts: 1, trail: ['palmR'],
  keys: { a: {}, ...ARC, up: { ...UP, head: -6, cervical: -3, thoracic: -3 } },
  timeline: [{ ...ARC_UP, dur: 2.4, r1: .35, r2: .35, breath: 'in' }, { ...ARC_DOWN, dur: 2.6, r1: .35, r2: .4, breath: 'out' }],
});

Object.assign(CLIPS, {
  rt_stretch_up, rt_arm_swing_knee_bend, rt_arm_circles, rt_chest_opener, rt_side_bend, rt_forward_back_bend, rt_trunk_twist,
  rt_arms_up_down, rt_diagonal_bend, rt_trunk_circle, rt_two_foot_hops, rt_heel_raise, rt_deep_breath,
});
