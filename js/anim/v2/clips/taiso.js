// Kitaeru animation v2 clips: Morning Taisō (v1.2), the 13 steps of radio_taiso_1 plus Kitaeru's heel-raise swap.
// Brisk, on the count (about 1 count per second). Every step shares one camera and one frame (`frame: 'rt'`) and starts
// and ends standing tall; the flow player blends from one step to the next.
// Stance (fact-check 2026-09-29, Kampo standing guide figs 1-13 and the NHK sheet): heels together, toes turned out
// (TOG) for steps 1-3, 11 (the first hops), 12 and 13 and the heel-raise swap; feet apart (APART, 開脚) for steps 4-7,
// 9 and 10 (step 4 opens with 左あしを横に出しながら, steps 7 and 10 end with 左あしをもどして直立); step 8 steps out and
// back on every rep (左あしを出す (1) … 左あしをもどす (4), then the right).
// `counts`: the counted reps in one clip cycle. The flow player sets the pace from the step (sec / count), so one cycle
// lasts counts × that; on its own (library, warm-ups) a clip plays at its natural brisk tempo.
// Free hands are placed in the upper-chest (T4) frame: handX forward, handY up the spine, handZ out to that hand's side.
// Every clip follows the fact-checked cues in js/data/exercises.js.
import { CLIPS, stand, feet, arm, swing } from './lib.js';

const W = 20;                                           // half stance width (cm) of the open stance: feet a little wider than the hips
const APART = { R: [-5, W, 8], L: [-5, -W, 8] };
const TOG = { R: [-5, 4.5, 26], L: [-5, -4.5, 26] };   // heels together, toes turned out (about 50° between the feet)
const CAM = { az: 60, el: 8 };
// The T4 frame leans forward about 21° when standing tall, so world directions from the shoulder (glenoid at about
// (2, 3, 15.5) in it) are: straight down (19, -50), straight up (-19, 50), forward (50, 19), for an arm of ~53 cm.
const NEUT = { handX: 20, handY: -47, handZ: 19, palm: 90, fingers: 20, wrist: 4 };   // arms hanging straight, relaxed
const rt = (name, over, at = APART) => stand(at, { name, cam: CAM, frame: 'rt', still: 0, ...over, base: { ...NEUT, ...(over.base || {}) } });
const heels = up => ({ footPitchR: -up, footPitchL: -up, onBalls: 1 });   // heels rise (about the balls), degrees; weight on the balls
// hand targets (T4 frame), both sides mirrored unless given per side
const H = (x, y, z, extra = {}) => ({ handX: x, handY: y, handZ: z, ...extra });
// a straight arm (r cm to the wrist) raised el degrees from hanging (90 = horizontal, 180 = overhead), in a plane turned
// az degrees from straight ahead (0) to straight out to the side (90), as a T4-frame target for a standing trunk
const ARM = (el, az, extra = {}, r = 52.9) => arm(el, az, r, extra);
const UP = ARM(172, 12, { palm: 0, fingers: 5 }, 56.6);          // arms straight overhead, palms in
const FRONT = ARM(90, 8, { palm: 0, fingers: 10 });          // arms forward at shoulder height
const SIDE = ARM(90, 88, { palm: 90, fingers: 10 });         // arms out to the sides, palms down
// the arcs between them (targets in straight lines would pass the head with bent elbows)
const ARC = { f1: ARM(45, 8, { palm: 0 }), f: FRONT, f2: ARM(135, 8, { palm: 0 }), s1: ARM(135, 88, { palm: 90 }), s: SIDE, s2: ARM(45, 88, { palm: 90 }) };
const ARC_UP = { from: 'a', via: ['f1', 'f', 'f2'], to: 'up' }, ARC_DOWN = { from: 'up', via: ['s1', 's', 's2'], to: 'a' };
const HIPS = H(-6, -30, 20, { palm: 90, fingers: 0, elbow: 60 });   // hands on the hips, elbows out

// 1. Stretch up (伸びの運動): arms swing forward and up overhead, stretch tall, lower out to the sides. 1 rep ≈ 5 s.
// Heels together (Kampo fig. 1, NHK fig. 1; founder observation 2026-09-29).
const rt_stretch_up = rt('Stretch up', {
  counts: 1, trail: ['palmR'],
  keys: { a: {}, ...ARC, up: { ...UP, rootY: 89, scapElev: .6, head: -4 } },
  timeline: [{ ...ARC_UP, dur: 1.8, r1: .3, r2: .3, breath: 'in' }, { hold: 'up', dur: .6, b: 1 },
    { ...ARC_DOWN, dur: 2.2, r1: .3, r2: .35, breath: 'out' }, { hold: 'a', dur: .4, b: 0 }],
}, TOG);

// 2 and 12. Arm swing and knee bend (腕を振って脚を曲げ伸ばす運動), heels together. From the arms crossed in front at chest
// height with the heels up (Kampo fig. 2 かかとを引き上げ腕を交差した状態から), the arms swing down and out to the sides
// as the knees bend deeply and straighten (NHK 腕を横に振りながらあしのまげのばし (1); knees over the toes), then swing
// back and cross as the heels lower and lift (腕を振りもどして交差しながら、かかとをおろしてあげる (2)). NHK: bend and
// lift じゅうぶんに (fully). Fact-check 2026-09-29 (founder observation: the knees bend more deeply than they did).
// 1 rep (2 counts) ≈ 1.5 s at the natural tempo; the loop runs from the crossed position back to it.
const XR = arm(84, -38, 44, {}, 'R'), XL = arm(84, -38, 44, {}, 'L');
XR.handXR += 3; XR.handYR += 1.5;   // (the right forearm crosses in front of the left)
const rt_arm_swing_knee_bend = rt('Arm swing and knee bend', {
  counts: 1, trail: ['palmR'],
  keys: {
    x: { ...XR, ...XL, palm: 90, fingers: 10, rootY: 89.5, ...heels(16) },                                   // crossed, heels up
    bend: { ...ARM(34, 78, { palm: 90, fingers: 15 }, 51), rootY: 80, pitch: 5, onBalls: .9 },                  // arms swing down and out, knees deep
    open: { ...ARM(90, 86, { palm: 90, fingers: 10 }, 51), rootY: 89, ...heels(8) },                            // legs straight, arms out to the sides
    back: { ...ARM(42, 62, { palm: 90, fingers: 15 }, 51), rootY: 87, onBalls: .8 },                            // swinging back in, heels down
  },
  timeline: [{ cyclic: ['x', 'bend', 'open', 'back'], dur: 1.5 }],
}, TOG);

// 3. Arm circles (腕を回す運動): big, loose circles from the shoulders, alternating one each way; shoulders relaxed.
// Fact-check 2026-09-29 (Kampo seated sheet, NHK fig. 1, Federation FAQ): the first circle (外まわし) goes out and up the
// sides, the arms cross overhead and come down in front; the second goes up in front and down the sides.
// One cycle = one circle each way = one counted rep (NHK 4呼間×4回: four of these). ≈ 5 s at the natural tempo.
// Heels together. At the top of both circles the straight arms reach right up and cross at the wrists overhead, the upper
// arms by the ears (Kampo fig. 3 and NHK fig. 3 draw both tops this way; NHK: ひじをよくのばし、肩を中心に大きく円を描く).
// Fact-check 2026-09-29 (founder observation: the arms went only about head-high, elbows bent).
const OVERX = ARM(161, -78, { palm: 0, fingers: 5 }, 52.5);   // straight arms, wrists crossed overhead
const CIRC = { x: H(31, -28, -2, { palm: 90 }), m: ARM(125, -8, { palm: 0 }, 49), u: OVERX, s: H(-2, 14, 61, { palm: 90 }),
  l: H(15, -26, 49, { palm: 90 }), su: ARM(150, 72, { palm: 90 }, 52), ux: OVERX };   // su: high at the side; ux: crossed overhead
const rt_arm_circles = rt('Taisō arm circles', {
  counts: 1, trail: ['palmR'],
  keys: { a: H(19, -45.5, 19), ...CIRC },   // (a: elbows a touch soft, so the circles' curve never overreaches)
  timeline: [{ cyclic: ['a', 'l', 's', 'su', 'ux', 'm', 'x'], dur: 2.6 },   // out and up the sides, cross overhead, down in front
    { cyclic: ['a', 'x', 'm', 'u', 's', 'l'], dur: 2.4 }],                  // then back: across and up the front, overhead, down the sides
}, TOG);

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
// The right arm rises out to the side (a straight arm in the shoulder's side plane, palm down turning to face the head
// as it passes horizontal: the natural external rotation of abduction) and ends just past vertical, over the head; the
// shoulder blade rotates up with it (the core's scapulohumeral rhythm). Down the same way.
const SARM = el => arm(el, 86, 52.4, { palm: 90, fingers: el > 150 ? 5 : 12 }, 'R');
const OVER = SARM(188);
const HIP_L = { handXL: -6, handYL: -30, handZL: 20, palmL: 90, fingersL: 0, elbowL: 60 };
const rt_side_bend = rt('Side bend', {
  counts: 4, swap: true, trail: ['palmR'],
  keys: {
    a: {},
    s1: { ...SARM(50), ...HIP_L }, s2: { ...SARM(100), ...HIP_L }, s3: { ...SARM(145), ...HIP_L },
    up: { ...OVER, ...HIP_L },
    b1: { ...OVER, ...HIP_L, bend: -24, headYaw: 0, weight: .42 },
    b2: { ...OVER, ...HIP_L, bend: -30, weight: .4 },
  },
  timeline: [{ from: 'a', via: ['s1', 's2', 's3'], to: 'up', dur: 1.1, r1: .3, r2: .3, breath: 'in' },
    { from: 'up', to: 'b1', dur: .9, r1: .3, r2: .25, breath: 'out' }, { from: 'b1', to: 'b2', dur: .5, r1: .3, r2: .3 },
    { from: 'b2', to: 'up', dur: .9, r1: .3, r2: .3, breath: 'in' },
    { from: 'up', to: 'b1', dur: .9, r1: .3, r2: .25, breath: 'out' }, { from: 'b1', to: 'b2', dur: .5, r1: .3, r2: .3 },
    { from: 'b2', to: 'up', dur: .9, r1: .3, r2: .3 }, { from: 'up', via: ['s3', 's2', 's1'], to: 'a', dur: 1, r1: .3, r2: .35 }],
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
// shoulders, then stretch straight down; crisp, on the count. 1 rep = 4 counts ≈ 4 s. The last extension is down (NHK
// 腕を下にのばし; fact-check 2026-09-29): the rep ends there, with no extra return to the shoulders.
// Stance (fact-check 2026-09-29, NHK fig. 8 and Kampo fig. 8): from heels together, the left foot steps out to the side
// as the hands come to the shoulders (左あしを出す (1)) and back in as the arms stretch down (左あしをもどす (4)); the next
// rep steps out with the right (次に右あしを出してくり返す). One cycle = one rep each side = 2 counted reps.
const SH = H(10, 4, 16, { palm: 0, fingers: 60, elbow: 130 });
const OUT8 = feet({ L: [-5, -22, 12] });   // the left foot a short step out: feet about hip-width
const rt_arms_up_down = (() => {
  const k = { a: {}, aS: { weight: .9 }, sh: { ...SH, ...OUT8 }, shB: { ...SH, ...OUT8, onBalls: 1 }, up: { ...UP, rootY: 92, ...heels(22), ...OUT8 },
    dnS: { ...H(19, -47, 18, { palm: 0, fingers: 5 }), ...OUT8, weight: .9 }, dn: H(19, -47, 18, { palm: 0, fingers: 5 }) };   // dnS: arms down, weight on the right
  return rt('Arms up and down', {
    counts: 2, swap: true, trail: ['palmR'], keys: k,
    timeline: [{ from: 'a', to: 'aS', dur: .15, r1: .3, r2: .3 }, swing(k, 'o', 'aS', 'sh', 'L', TOG.L, [-5, -22, 12], { lift: 3, dur: .4 }),
      { from: 'sh', via: ['shB'], to: 'up', at: [0, .3, 1], dur: .6, r1: .2, r2: .35 }, { hold: 'up', dur: .3, b: 1 },
      { from: 'up', via: ['shB'], to: 'sh', at: [0, .7, 1], dur: .6, r1: .25, r2: .3 }, { hold: 'sh', dur: .3 }, { from: 'sh', to: 'dnS', dur: .55, r1: .2, r2: .35 },
      swing(k, 'i', 'dnS', 'dn', 'L', [-5, -22, 12], TOG.L, { lift: 3, dur: .45 }), { hold: 'dn', dur: .15 }, { from: 'dn', to: 'a', dur: .5, r1: .3, r2: .35 }],
  }, TOG);
})();

// 9. Diagonal bend and chest opener (体を斜め下に曲げ胸を反らす運動): bend down diagonally towards one foot with small
// bounces, rise facing forward and open the arms wide, arching the chest; two per side, then switch. This side: left foot.
// The arms open diagonally down, elbows straight (NHK 起こして正面を向いて腕を斜め下に開き胸をそらせる; Kampo fig. 9 and
// tip 肘を伸ばし; fact-check 2026-09-29: they used to open up and out, like step 4).
const DIAG = (pitch) => ({ pitch, yaw: 22, twist: 8, rootY: 84, weight: .38, handXR: 20, handYR: -36, handZR: -12, handXL: 18, handYL: -36, handZL: 6,
  palm: 90, fingers: 20, head: 6 });
const WIDE = { ...ARM(50, 78, { palm: 20, fingers: 5 }, 52), thoracic: -9, lumbar: -3, cervical: -5, head: -12, scapProt: -8 };
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
  keys: { a: {}, ...TC, o1: ARM(45, 88, { palm: 90 }, 49), o2: ARM(100, 88, { palm: 90 }, 49) },   // (the arms rise out to the sides: no path through the body)
  timeline: [{ from: 'a', via: ['o1', 'o2'], to: 'l', dur: 1.1, r1: .35, r2: 0 }, { cyclic: ['l', 'f', 'r', 'b'], dur: 3.6 }, { cyclic: ['l', 'f', 'r', 'b'], dur: 3.6 },
    { from: 'l', via: ['o2', 'o1'], to: 'a', dur: 1.1, r1: 0, r2: .35 }],
});

// 11. Two-foot hops (両脚で跳ぶ運動): four light hops with the feet together, then big open-and-close jumps, the arms
// rising out to the sides as the feet land apart and lowering as they close; land softly on the balls of the feet.
// Fact-check 2026-09-29 (Kampo fig. 11 両脚を揃えて軽く4回跳ぶ / 腕を横へ上げながら大きく開脚跳び, tip 前半は軽く、後半の
// 開脚跳びは大きく; NHK fig. 11 両あしをそろえて4回とび (1-4), 開いて閉じて… 腕を横にあげておろす (5-8)): they used to
// hop with the feet apart and without the arms. One cycle = 8 hops ≈ 7 s (NHK 8呼間: two of these in the flow).
const AIR = (at, up = 91) => ({ rootY: up, onBalls: 1, ...feet({ R: [at.R[0], at.R[1], at.R[2], 4, -12], L: [at.L[0], at.L[1], at.L[2], 4, -12] }) });
const WIDE11 = { R: [-5, 22, 10], L: [-5, -22, 10] };
const HOP_ARMS = ARM(88, 86, { palm: 90, fingers: 10 });
const rt_two_foot_hops = rt('Two-foot hops', {
  counts: 8, trail: [],
  keys: {
    a: { rootY: 86, onBalls: 1 }, air: AIR(TOG), land: { rootY: 85, onBalls: 1 },
    airO: { ...AIR({ R: [-5, 14, 18], L: [-5, -14, 18] }, 94), ...ARM(60, 86, { palm: 90 }) },          // a big jump, the feet opening
    wide: { rootY: 84, onBalls: 1, ...feet(WIDE11), ...HOP_ARMS },                                        // lands apart, arms out to the sides
    airC: { ...AIR({ R: [-5, 14, 18], L: [-5, -14, 18] }, 94), ...ARM(50, 86, { palm: 90 }) },          // closing
  },
  // each hop: spring up (0.3 s), come down (0.3 s), a short soft landing on the balls (0.28 s)
  timeline: [['a', 'air', 'land'], ['land', 'air', 'land'], ['land', 'air', 'land'], ['land', 'air', 'land'],
    ['land', 'airO', 'wide'], ['wide', 'airC', 'land'], ['land', 'airO', 'wide'], ['wide', 'airC', 'a']].flatMap(([g, air, l]) => [
    { from: g, to: air, dur: .3, r1: .2, r2: .6 }, { from: air, to: l, dur: .3, r1: .6, r2: .2 }, { hold: l, dur: .28 }]),
}, TOG);

// Heel raises (no-hop option; Kitaeru's own swap for the hops, not part of the sequence): rise onto the balls of the
// feet, lower with control, in time with the count. 1 rep ≈ 0.9 s. Heels together, as the steps around it.
const rt_heel_raise = rt('Heel raises', {
  counts: 1, trail: ['heelR'],
  keys: { a: {}, pre: { onBalls: 1 }, up: { rootY: 92.5, ...heels(26) } },
  timeline: [{ from: 'a', via: ['pre'], to: 'up', at: [0, .3, 1], dur: .45, r1: .3, r2: .35 }, { hold: 'up', dur: .1, b: 1 },
    { from: 'up', via: ['pre'], to: 'a', at: [0, .7, 1], dur: .45, r1: .3, r2: .35 }],
}, TOG);

// 13. Deep breath (深呼吸): the arms rise forwards and up as you breathe in and lower out to the sides as you breathe
// out; slow and full, no breath holding. On its own (v1.3a single, breath blocks) 1 rep ≈ 10 s: about 4.5 s in and 5.5 s out
// (flow-and-breath.md §2.1.8, [practice]); in the flow the count sets the pace (about 5 s). Heels together (Kampo fig. 13).
const rt_deep_breath = rt('Deep breath', {
  counts: 1, trail: ['palmR'],
  keys: { a: {}, ...ARC, up: { ...UP, head: -6, cervical: -3, thoracic: -3 } },
  timeline: [{ ...ARC_UP, dur: 4.5, r1: .35, r2: .35, breath: 'in' }, { ...ARC_DOWN, dur: 5.5, r1: .35, r2: .4, breath: 'out' }],
}, TOG);

Object.assign(CLIPS, {
  rt_stretch_up, rt_arm_swing_knee_bend, rt_arm_circles, rt_chest_opener, rt_side_bend, rt_forward_back_bend, rt_trunk_twist,
  rt_arms_up_down, rt_diagonal_bend, rt_trunk_circle, rt_two_foot_hops, rt_heel_raise, rt_deep_breath,
});
