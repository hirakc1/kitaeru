// Kitaeru animation v2 clips: Baduanjin (八段锦, Health Qigong standard), the eight pieces plus the ready and closing
// stances of baduanjin_sequence. Slow and even with the breath, a soft pause at the end of each stretch. One camera
// and one frame (`frame: 'bdj'`); the pieces start and end in the ready stance except the three in a horse stance
// (drawing the bow steps out and back each time; swaying and punching stay in the stance). `counts`: counted reps per
// cycle, for the flow player's pace. Every clip follows the fact-checked cues in js/data/exercises.js.
// Hands: arm(el, az, r) raises a straight or soft arm (lib.js); at(X, Y, Z) places the wrist at a world offset from the
// shoulder (x forward, y up, z out to that side; z = -15.5 is the midline), both for an upright trunk.
import { CLIPS, stand, feet, arm, swing } from './lib.js';

const at = (X, Y, Z, extra = {}, side = '') => {
  const o = { handX: +(1.9 + X * .934 - Y * .356).toFixed(1), handY: +(3.3 + X * .356 + Y * .934).toFixed(1), handZ: +(15.5 + Z).toFixed(1), ...extra };
  return side ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k + side, v])) : o;
};
const SW = 16, HW = 32;                                         // ready stance (shoulder-width) and horse stance half widths
const READY = { R: [-5, SW, 4], L: [-5, -SW, 4] }, HORSE = { R: [-5, HW, 2], L: [-5, -HW, 2] };
const HANG = arm(6, 30, 50, { palm: 90, fingers: 15, wrist: 4 });
const CAM = { az: 60, el: 8 };
const bdj = (name, over) => stand(READY, { name, cam: CAM, frame: 'bdj', still: 0, lag: .3, headLag: .45, trail: [], ...over,
  base: { rootY: 86, ...HANG, ...(over.base || {}) } });
const ph = (from, to, dur, breath, via, at_) => ({ from, via, to, at: at_, dur, r1: .25, r2: .3, breath });
const pause = (k, dur = .6, b) => ({ hold: k, dur, b });

// ready (预备势) and closing (收势): quiet standing with the breath; the arms round in front of the belly as if holding
// a ball (ready), or the hands rest on the belly (closing)
const QUIET = { primary: [], secondary: [] };   // (step anims without an exercise: no muscles to highlight)
const baduanjin_ready = bdj('Ready stance', { muscles: QUIET,
  counts: 1, keys: { a: { rootY: 85, ...at(24, -32, -6, { palm: 170, fingers: 20, wrist: 10 }) }, b: { rootY: 84.6, scapElev: .2, ...at(25, -31, -5, { palm: 170, fingers: 20, wrist: 10 }) } },
  timeline: [{ cyclic: ['a', 'b'], dur: 6, breath: 'cycle', breaths: 1 }],
});
const baduanjin_close = bdj('Closing stance', { muscles: QUIET,
  counts: 1, keys: { a: { rootY: 87, ...at(16, -36, -13, { palm: 170, fingers: 5, wrist: 5 }) }, b: { rootY: 86.7, scapElev: .2, ...at(17, -35.5, -13, { palm: 170, fingers: 5, wrist: 5 }) } },
  timeline: [{ cyclic: ['a', 'b'], dur: 6, breath: 'cycle', breaths: 1 }],
});

// 1. Holding up the sky (两手托天理三焦): fingers interlaced in front of the belly; breathe in as they lift, the palms
// turning up overhead (the eyes follow the hands, then look ahead); breathe out as the arms float down to the sides.
const SIDES = { s1: arm(135, 88, 52, { palm: 90 }), s2: arm(90, 88, 52, { palm: 90 }), s3: arm(45, 80, 52, { palm: 90 }) };
const baduanjin_hold_up_sky = bdj('Holding up the sky', {
  counts: 1, trail: ['palmR'],
  keys: {
    a: {}, belly: { ...at(20, -38, -13, { palm: 170, fingers: 60 }) },
    chest: { ...at(18, -8, -13, { palm: 170, fingers: 60 }), head: -10 },
    // a full stretch: arms straight overhead, the interlaced hands meeting over the crown, palms pressing up
    up: { ...at(-1.5, 56.6, -13.4, { palm: 0, fingers: 60, wrist: 75 }), rootY: 88.5, head: -2, thoracic: -2 },
    ...SIDES,
  },
  timeline: [ph('a', 'belly', 2, 'in'), ph('belly', 'up', 3.4, 'in', ['chest']), pause('up', 1.4, 1),
    ph('up', 'a', 4.4, 'out', ['s1', 's2', 's3']), pause('a', .8, 0)],
});

// 2. Drawing the bow to shoot the eagle (左右开弓似射雕): the left foot steps wide and you sink into a horse stance, the
// wrists crossed in front of the chest; the right hand draws the string to the chest (elbow out, fingers curled) while
// the left arm pushes out to the side with the 八字掌 hand (index finger up, thumb spread) and the head turns to look
// past it; rise, the hands circle down, the foot steps back. Then the other side.
const baduanjin_draw_bow = (() => {
  // the left foot steps out to the left: the right foot stays where it is
  const WL = { R: [-5, SW, 4], L: [-5, -SW - 26, 2] };
  const k = {
    a: { ...feet(READY) }, shift: { weight: .85, rootY: 78, ...feet(READY) },   // (swing keys mix whole keys: give the feet)
    wide: { weight: .6, ...feet(WL), rootY: 76 },
    cross: { ...feet(WL), rootY: 74, ...at(18, -10, -14, { palm: 90, fingers: 30 }) },
    draw: { ...feet(WL), rootY: 72, headYaw: 62, twist: 4,
      ...at(-2, 2, 50, { palm: 0, wrist: 75, handShape: 5, fingers: 0 }, 'L'),                       // pushes out: 八字掌, palm out
      ...at(10, -6, -2, { palm: 150, handShape: 2, elbowOut: 1, wrist: 10 }, 'R') },                  // draws to the chest
    rise: { ...feet(WL), rootY: 76, headYaw: 20, ...at(-2, -24, 40, { palm: 150, handShape: 0 }, 'L'), ...at(14, -32, 6, { palm: 150, handShape: 0 }, 'R') },
    back: { weight: .85, ...feet(WL), rootY: 76 },
    home: { weight: .85, rootY: 78, ...feet(READY) },
  };
  k.draw2 = { ...k.draw };
  return bdj('Drawing the bow to shoot the eagle', { floorZ: 58,
    counts: 2, swap: true, trail: ['palmL'], keys: k,
    timeline: [ph('a', 'shift', 1), swing(k, 'oL', 'shift', 'wide', 'L', [-5, -SW, 4], WL.L, { lift: 5, dur: 1.4 }), ph('wide', 'cross', 2, 'in'), ph('cross', 'draw', 3, 'in'), pause('draw2', 1.6, 1),
      ph('draw2', 'rise', 2.4, 'out'), ph('rise', 'back', 1.4, 'out'),
      swing(k, 'iL', 'back', 'home', 'L', WL.L, [-5, -SW, 4], { lift: 5, dur: 1.4 }), ph('home', 'a', 1)],
  });
})();

// 3. Separating heaven and earth (调理脾胃须单举): one palm presses up overhead (fingers pointing in), the other down
// beside the hip (fingers pointing forward); the hands meet in front of the belly and swap slowly with the breath.
const baduanjin_separate_heaven_earth = bdj('Separating heaven and earth', {
  counts: 2, swap: true, trail: ['palmR'],
  keys: {
    a: {}, belly: { ...at(22, -36, -8, { palm: 170, fingers: 10 }) },
    mid: { ...at(16, 0, 0, { palm: 170, wrist: 40 }, 'R'), ...at(20, -30, -4, { palm: 170 }, 'L') },
    press: { rootY: 88, ...at(0, 51, -6, { palm: 170, wrist: 80, fingers: 0 }, 'R'), ...at(6, -42, 4, { palm: 175, wrist: 75, fingers: 0 }, 'L'), scapElev: .4 },
  },
  timeline: [ph('a', 'belly', 1.8, 'out'), ph('belly', 'press', 3.6, 'in', ['mid']), pause('press', 1.4, 1), ph('press', 'belly', 3, 'out', ['mid']), ph('belly', 'a', 1.6)],
});

// 4. Wise owl looks back (五劳七伤往后瞧): arms by the sides, palms turning outwards, the chest opens and the head and
// upper chest turn slowly to look behind; back to the centre. Small and easy. This side: turning left.
const baduanjin_look_back = bdj('Wise owl looks back', {
  counts: 2, swap: true,
  keys: {
    a: {}, out: { ...arm(12, 40, 50, { palm: 10, fingers: 5 }), thoracic: -4, scapProt: -6 },
    turn: { ...arm(14, 42, 50, { palm: 5, fingers: 5 }), thoracic: -4, scapProt: -8, twist: 24, headYaw: 58, head: -2 },
  },
  timeline: [ph('a', 'out', 1.6, 'in'), ph('out', 'turn', 3, 'in'), pause('turn', 1.2, 1), ph('turn', 'out', 2.8, 'out'), ph('out', 'a', 1.6, 'out')],
});

// 5. Swaying the head and tail (摇头摆尾去心火): in a horse stance with the hands on the thighs, the trunk leans to one
// side, then circles down and across; neck relaxed, range small. Stays in the horse stance.
const THIGHS = { ...at(26, -44, -2, { palm: 170, fingers: 10 }), elbowOut: .6 };
const baduanjin_sway_head_tail = bdj('Swaying the head and tail', {
  counts: 2, swap: true, joins: false,   // (starts in the horse stance: the flow player dips into it)
  base: { ...feet(HORSE), rootY: 72, ...THIGHS },
  keys: {
    c: { pitch: 6 },
    r: { pitch: 14, bend: 20, weight: .7, headYaw: -6 },                     // lean to the right
    d: { pitch: 34, bend: 6, twist: -6, weight: .55, head: 8 },              // circle down
    l: { pitch: 20, bend: -14, twist: -10, weight: .35, headYaw: 12, head: 4 },   // across, the head swaying the other way
  },
  timeline: [ph('c', 'r', 2.4, 'in'), ph('r', 'l', 4.2, 'out', ['d']), ph('l', 'c', 2.4, 'in')],
});

// 6. Two hands hold the feet (两手攀足固肾腰): the long arms rise forwards and up; they come down in front and the hands
// go round to the back; they slide down the backs of the legs (trace) as you fold towards the feet with soft knees; then
// rise slowly, leading with the arms, which stay long and in line with the trunk (Kitaeru softens the knees; the
// standard keeps them straight).
const LONG_UP = arm(172, 10, 57.3, { palm: 0, fingers: 5 });        // straight overhead (in the trunk's frame)
const baduanjin_touch_toes = bdj('Two hands hold the feet', {
  counts: 1, trail: ['palmR'],
  keys: {
    a: {}, fwd: { ...arm(92, 8, 53.5, { palm: 175, fingers: 5 }) }, up: { ...LONG_UP, rootY: 87 },
    side: { ...arm(30, 70, 50, { palm: 90 }) },                                        // down past the sides
    waist: { ...arm(30, 70, 50, { palm: 90 }), trace: 1, traceAt: 0, pitch: 4 },       // hands on the back of the hips
    slide: { pitch: 50, rootY: 84, lumbar: 5, trace: 1, traceAt: .2 },                  // down the backs of the thighs
    fold: { pitch: 88, lumbar: 12, thoracic: 10, head: 8, rootY: 80, trace: 1, traceAt: .84 },   // down to the lower calves
    feet: { pitch: 76, lumbar: 8, thoracic: 6, head: 8, rootY: 83, ...LONG_UP },       // the arms long past the head, at the feet
    lead: { pitch: 45, lumbar: 5, thoracic: 3, head: 4, rootY: 85, ...LONG_UP },       // rising, the arms leading
  },
  timeline: [ph('a', 'up', 2.6, 'in', ['fwd']), pause('up', .6, 1), ph('up', 'side', 2.4, 'out', ['fwd']), ph('side', 'waist', 1, 'in'),
    ph('waist', 'fold', 3.2, 'out', ['slide']), pause('fold', .8, 0), ph('fold', 'feet', 1.2, 'in'),
    ph('feet', 'up', 3.2, 'in', ['lead']), ph('up', 'a', 2.4, 'out', ['fwd'])],
});

// 7. Punching with angry eyes (攒拳怒目增气力): in a horse stance with the fists at the waist, punch slowly forward,
// turning the fist to face down; open the hand, turn and grasp, and draw the fist back to the waist. The gaze is fierce
// and steady. Stays in the horse stance; the other fist next.
const WAIST = at(6, -34, 2, { handShape: 2, palm: 0, wrist: 0 });            // fist at the waist, palm up
const baduanjin_clench_fists = bdj('Punching with angry eyes', {
  counts: 2, swap: true, joins: false, trail: ['palmL'],
  arms: { both: { mode: 'ik', grip: 'free', pole: [-1, -.25, .12] } },   // elbows point back
  base: { ...feet(HORSE), rootY: 72, ...WAIST },
  keys: {
    c: {}, punch: { ...arm(84, 4, 52, { handShape: 2, palm: 180, wrist: 0 }, 'L'), yaw: -4, head: -3 },
    open: { ...arm(84, 4, 52, { handShape: 1, palm: 180, wrist: -30 }, 'L'), yaw: -4, head: -3 },
    grasp: { ...arm(84, 4, 52, { handShape: 2, palm: 0, wrist: 0 }, 'L'), yaw: -4, head: -3 },
  },
  timeline: [ph('c', 'punch', 2.6, 'out'), pause('punch', .4), ph('punch', 'open', 1, 'in'), ph('open', 'grasp', 1.4, 'in'),
    ph('grasp', 'c', 2.4, 'in'), pause('c', .6)],
});

// 8. Bouncing on the toes (背后七颠百病消): rise onto the balls of the feet and pause, then drop gently onto the heels.
// Feet together, arms by the sides.
const TOG = { R: [-5, 8, 4], L: [-5, -8, 4] };
const baduanjin_heel_bounce = bdj('Bouncing on the toes', {
  counts: 1, joins: false,
  base: { ...feet(TOG), rootY: 87 },
  keys: { a: {}, pre: { onBalls: 1 }, up: { rootY: 92.5, footPitchR: -24, footPitchL: -24, onBalls: 1, scapElev: .3 }, drop: { rootY: 86, onBalls: .3 } },
  timeline: [ph('a', 'up', 1.2, 'in', ['pre'], [0, .3, 1]), pause('up', 1, 1), ph('up', 'drop', .45, 'out', ['pre'], [0, .6, 1]),
    ph('drop', 'a', .6, 'out'), pause('a', .75)],
});

Object.assign(CLIPS, { baduanjin_ready, baduanjin_hold_up_sky, baduanjin_draw_bow, baduanjin_separate_heaven_earth, baduanjin_look_back,
  baduanjin_sway_head_tail, baduanjin_touch_toes, baduanjin_clench_fists, baduanjin_heel_bounce, baduanjin_close });
