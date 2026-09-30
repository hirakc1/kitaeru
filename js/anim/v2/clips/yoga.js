// Kitaeru animation v2 clips (v1.3b): yoga āsana. Surya Namaskar (the Sivananda 12 positions: one clip per position in one
// shared frame 'sn', plus the whole round for the Library), tree pose, Warrior II and triangle pose. See lib.js / taichi.js
// for the conventions (stepping legs, keyed weight, free hands in the T4 frame). Every clip follows the fact-checked cues in
// js/data/exercises.js. No breath is ever held: the plank (position 5) breathes normally.
import { CLIPS, R, solve, feet, feetOf, mix, swing, stand, stepLegs, arm } from './lib.js';

const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const nrm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const smooth = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const NEUT = { handX: 20, handY: -47, handZ: 19, palm: 90, fingers: 20, wrist: 4 };   // arms hanging, relaxed
const PRAYER = { handX: 17, handY: -13, handZ: 2.5, palm: 90, wrist: -50, fingers: 0, handShape: 1 };   // palms together at the chest

// ---------------------------------------------------------------------------------------------------------------
// Tree pose (वृक्षासन): standing on the left leg, the right foot slides up the inside of the standing leg to the inner thigh
// (the full pose, CYP), knee out to the side and never pressing on the knee; palms together at the chest (Kitaeru's
// default level); a calm sway over the standing foot. Front three-quarter view; sides alternate.
// The lifted leg is a fixed-foot limb driven by one sided channel, plantY (0 = the foot flat on the floor beside the
// standing foot, 1 = the sole on the inner thigh of the standing leg): the foot rises along an arc outside the standing leg.
const TREE_FLOOR = [-5, 9, 4];                                         // the right foot's heel spot on the floor (x, lateral z, toe-out)
const treeThigh = (s, ch) => [ch.rootX + 3, ch.rootY - 21, ch.rootZ + 3.5 * s];   // ankle, sole on the inner left thigh
const treeFloor = s => [TREE_FLOOR[0] + 5.6, 7.5, TREE_FLOOR[1] * s];
const treeLeg = {
  mode: 'ik', foot: 'fixed',
  ankle: (sd, s, ch) => {
    const u = ch['plantY' + sd] || 0, e = smooth(u), p = lerp(treeFloor(s), treeThigh(s, ch), e), a = Math.sin(Math.PI * Math.min(1, u));
    return [p[0] + 7 * a, p[1], p[2] + 11 * a * s];                   // out and a little forward on the way up: clear of the standing leg
  },
  axes: (sd, s, ch) => {
    const e = smooth(ch['plantY' + sd] || 0);
    const x = nrm(lerp([1, 0, 0], [.28, -1, 0], e)), y0 = lerp([0, 1, 0], [0, 0, s], e);
    const y = nrm(y0.map((v, i) => v - x[i] * (x[0] * y0[0] + x[1] * y0[1] + x[2] * y0[2])));
    return [x, y, cross(x, y).map(v => v * s)];
  },
  pole: (s, ch) => nrm(lerp([1, .05, .1 * s], [.35, -.15, s], smooth(ch[s > 0 ? 'plantYR' : 'plantYL'] || 0))),
};
const vrikshasana = (() => {
  const base = { weight: 0, rootY: 88.5, ...feet({ L: [-5, -9, 4] }), plantYR: 0, ...NEUT };
  const k = {
    a: { ...base },
    up: { ...base, plantYR: 1, ...PRAYER, rootY: 88 },
    sA: { ...base, plantYR: 1, ...PRAYER, rootY: 88, rootZ: .6, roll: 1 },
    sB: { ...base, plantYR: 1, ...PRAYER, rootY: 88, rootZ: -.5, roll: -.8 },
  };
  return stand({}, {
    name: 'Tree pose', cam: { az: 76, el: 8 }, swap: true, still: .4, trail: [], keys: k, lag: .3, headLag: .3,
    legs: { L: stepLegs.both, R: treeLeg },
    arms: { both: { mode: 'ik', grip: 'free', pole: [-.3, -1, .9] } },
    base: { rootY: 88.5 },
    timeline: [{ hold: 'a', dur: .5, b: .3 }, { from: 'a', to: 'up', dur: 2.4, r1: .3, r2: .35, breath: 'in' },
      { cyclic: ['up', 'sA', 'up', 'sB'], dur: 6, breath: 'cycle', breaths: 1.5 }, { from: 'up', to: 'a', dur: 2, r1: .3, r2: .35, breath: 'out' }],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// Warrior II (वीरभद्रासन): feet wide, the front (right) foot turned out 90°, the back foot turned in a little; the front knee
// bends over the ankle (Kitaeru: a shallow bend, the thigh above level) and the back leg stays straight, its heel down; arms
// long at shoulder height, the head turned to look over the front hand (Art of Living; BIYOME). Palms down is the teaching
// choice shown. Front view; sides alternate.
const W2_FEET = feet({ R: [-5, 50, 90], L: [-5, -50, -10] });
const virabhadrasana_2 = stand({}, {
  name: 'Warrior II', cam: { az: 82, el: 7 }, swap: true, still: .5, trail: [], lag: .3, headLag: .3, floorZ: 80,
  keys: {
    a: { weight: .5, rootY: 79, ...W2_FEET, ...NEUT },
    w: { weight: .64, rootY: 73.5, ...W2_FEET, ...arm(90, 90, 53, { palm: 90, fingers: 5 }), headYaw: -62 },
    w2: { weight: .65, rootY: 73.3, ...W2_FEET, ...arm(90, 90, 53, { palm: 90, fingers: 5 }), headYaw: -62, thoracic: -1 },
  },
  timeline: [{ hold: 'a', dur: .5, b: .3 }, { from: 'a', to: 'w', dur: 2.2, r1: .3, r2: .35, breath: 'in' },
    { cyclic: ['w', 'w2'], dur: 5, breath: 'cycle', breaths: 1 }, { from: 'w', to: 'a', dur: 2, r1: .3, r2: .35, breath: 'out' }],
});

// ---------------------------------------------------------------------------------------------------------------
// Triangle pose (त्रिकोणासन): feet wide, the front (right) foot turned out, arms out at shoulder height; breathe out and tilt
// sideways from the hip over the front leg, the lower hand on the shin (Kitaeru's starting height), the top arm reaching up in
// line, the chest facing forward, the eyes on the top hand; legs long, knees soft; breathe in to come up (CYP). Front view;
// sides alternate. Arms are world-placed: release 0 = out to the side, 1 = on the shin (lower hand) / straight up (top hand).
const TR_FEET = feet({ R: [-5, 41, 88], L: [-5, -41, 0] });
const trikonasana = stand({}, {
  name: 'Triangle pose', cam: { az: 84, el: 8 }, swap: true, still: .5, trail: ['palmR'], lag: .3, headLag: .3, floorZ: 76,
  arms: {
    R: { mode: 'ik', grip: 'world', pole: [-.2, -1, .3], at: (sd, s, ch, S, G) => {
      const e = smooth(ch['release' + sd] || 0), out = [G[0] + 3, G[1] + 1, G[2] + 52 * s];
      const shin = lerp(S.pt['knee' + sd], S.pt['ankle' + sd], .3); shin[0] += 6;
      const t = lerp(out, shin, e), d = Math.hypot(...t.map((v, i) => v - G[i])), m = .96 * 55;
      return d <= m ? t : lerp(G, t, m / d); } },
    L: { mode: 'ik', grip: 'world', pole: [-.2, -1, .3], at: (sd, s, ch, S, G) => {
      const e = smooth(ch['release' + sd] || 0);
      return lerp([G[0] + 3, G[1] + 1, G[2] + 52 * s], [G[0] + 2, G[1] + 52.5, G[2] + 3 * s], e); } },
  },
  base: { palm: 90, fingers: 6, wrist: 0, handShape: 1 },
  keys: {
    a: { weight: .5, rootY: 80, ...TR_FEET, release: 0 },
    t: { weight: .47, rootY: 71, ...TR_FEET, release: 1, bend: 58, roll: 16, headYaw: 40, cervical: -4 },
    t2: { weight: .47, rootY: 70.9, ...TR_FEET, release: 1, bend: 59.5, roll: 16, headYaw: 40, cervical: -4, thoracic: -1 },
  },
  timeline: [{ hold: 'a', dur: .5, b: .8 }, { from: 'a', to: 't', dur: 2.4, r1: .3, r2: .35, breath: 'out' },
    { cyclic: ['t', 't2'], dur: 5, breath: 'cycle', breaths: 1 }, { from: 't', to: 'a', dur: 2.2, r1: .3, r2: .35, breath: 'in' }],
});

// ---------------------------------------------------------------------------------------------------------------
// Surya Namaskar (सूर्य नमस्कार), the Sivananda 12 positions (Sivananda; Kerala Tourism). Side view from the right; one
// camera and view box for every position (frame 'sn'). Each position is a clip of one breath (`counts: 1`); in the flow the
// player blends from one to the next, and a foot that changes its spot steps (lifts) rather than slides (core blendPose).
// Hands stay where they land (plantX), from the forward fold until the rise; planted palms (release 0) bear weight, so the
// stepping balance is off on the floor (noBalance). One round: right leg back first (position 4), then the left.
const SN_CAM = { az: 16, el: 8 };
const HX = 4, HZ = 20, F0 = -5, FZ = 7;                                 // palms beside the feet; feet together under the hips
const snArms = { both: { mode: 'ik', grip: 'palm', arc: 10, pole: [-.8, -.6, .5], dir: s => [1, 0, .08 * s], target: (sd, s, ch) => [ch['plantX' + sd], ch['plantY' + sd], HZ * s] } };
const SN_BASE = { rootY: 88.5, pitch: 1, weight: .5, release: 1, plantX: HX, plantY: 0, noBalance: 0, footPoint: 0, knee: 0, ...NEUT };
// the knees track the toes, as stepLegs; on the floor the sided `knee` channel (unused by IK legs) turns the knee down
// towards the floor instead (kneeling, prone), where a forward pole would lie along the leg
const snLegs = { both: { mode: 'ik', foot: 'step', pole: (s, ch) => { const sd = s > 0 ? 'R' : 'L', t = (ch['footTurn' + sd] || 0) * R, dn = ch['knee' + sd] || 0;
  return [Math.cos(t), .05 - dn, s * (Math.sin(t) + .08)]; } } };
const snRig = over => stand({ R: [F0, FZ, 2], L: [F0, -FZ, 2] }, { cam: SN_CAM, frame: 'sn', still: 0, trail: ['sternum'], lag: .2, headLag: .35,
  arms: snArms, legs: snLegs, ...over, base: { ...SN_BASE, ...(over.base || {}) } });
const FOOT0 = { R: [F0, FZ, 2], L: [F0, -FZ, 2] };
// the key poses, solved once (every sn clip shares the same limb specs and base, so one solution serves all)
let GEO = null;
function snGeo(settle) {
  if (GEO) return GEO;
  const K = {}, P = (S, n) => S.pt[n];
  const st = { ...feet(FOOT0), weight: .5, rootY: 88.5 };
  K.stand = { ...st, ...NEUT };
  K.prayer = { ...st, ...PRAYER };
  K.up = { ...st, rootY: 88.8, ...arm(186, 10, 55.5, { palm: 0, fingers: 0, handShape: 1 }), thoracic: -9, lumbar: -7, cervical: -5, head: -9, scapElev: .6 };
  // forward fold: hips over the heels, knees soft, palms flat beside the feet (arms at 95% reach)
  const floor = { release: 0, noBalance: 1, ...NEUT, wrist: 0, fingers: 5, handShape: 0 };
  const fold = { ...floor, ...feet(FOOT0), rootX: -13, rootY: 70, pitch: 118, lumbar: 14, thoracic: 12, cervical: 6, head: 6 };
  for (let i = 0; i < 4; i++) {
    fold.rootY = solve(40, 95, y => settle({ ...fold, rootY: y }).reachLeg, .95);
    fold.pitch = solve(80, 160, p => settle({ ...fold, pitch: p }).reach, .95);
  }
  K.fold = fold;
  // plank: a straight line from the balls of the feet, shoulders over the hands (inchworm geometry), feet placed from the hands
  const plank = { ...floor, pitch: 78, lumbar: 1, thoracic: -2, cervical: 3, head: -8, ...feet({ R: [0, FZ, 2], L: [0, -FZ, 2] }) };
  const at = x => { plank.rootX = x; plank.rootY = solve(10, 100, y => settle({ ...plank, rootY: y }).reachLeg, .985); return P(settle(plank, true), 'glenoidR'); };
  const XP = solve(30, 180, x => at(x)[1], 2.4 + .97 * 55), gx = at(XP)[0];
  const shift = HX - (gx + 5.2);
  const XB = shift, BALL = XB + 19.8;                                 // back feet: heel spot (flat), the heels peel as the legs need
  plank.rootX += shift; Object.assign(plank, feet({ R: [XB, FZ, 2], L: [XB, -FZ, 2] }));
  K.plank = plank;
  // low lunge: the front foot where it was in the fold, the back foot at the plank spot on its toes, back knee down;
  // chest up, a gentle look up; arms nearly straight to the planted palms
  const lunge = (back) => {
    const front = back === 'R' ? 'L' : 'R', fz = { R: FZ, L: -FZ };
    const L = { ...floor, pitch: 60, lumbar: -10, thoracic: -8, cervical: -10, head: -12, rootX: BALL + 74, rootY: 34, ['knee' + back]: 1.5,
      ...feet({ [front]: [F0, fz[front], 2], [back]: [XB, fz[back], 2, 0, -62] }) };
    for (let i = 0; i < 5; i++) {
      L.rootY = solve(10, 70, y => P(settle({ ...L, rootY: y }, true), 'patella' + back)[1], 1.6);
      L.pitch = solve(20, 110, p => settle({ ...L, pitch: p }).reach, .955);
    }
    return L;
  };
  K.lungeR = lunge('R'); K.lungeL = lunge('L');
  // knees, chest and forehead: knees down, hips up, the chest down between the hands, the forehead on the floor
  const kc = { ...plank, pitch: 128, lumbar: -16, thoracic: -8, cervical: 4, head: 10, rootX: HX - 55, rootY: 28, knee: 1.5, ...feet({ R: [XB, FZ, 2, 0, -62], L: [XB, -FZ, 2, 0, -62] }) };
  for (let i = 0; i < 8; i++) {
    kc.pitch = solve(95, 175, p => P(settle({ ...kc, pitch: p }, true), 'sternum')[1], 12);
    kc.rootX = solve(HX - 120, HX + 10, x => P(settle({ ...kc, rootX: x }, true), 'sternum')[0], HX - 20);
    kc.rootY = solve(5, 70, y => P(settle({ ...kc, rootY: y }, true), 'patellaR')[1], 1.6);
  }
  const lowHead = S => Math.min(S.pt.nose[1], S.pt.chin[1], S.pt.headTop[1]);
  const hu = solve(-1.2, 2, u => lowHead(settle({ ...kc, cervical: -22 * u, head: -30 * u }, true)), 2.6);   // extend the neck until the face just touches
  Object.assign(kc, { cervical: -22 * hu, head: -30 * hu });
  K.kc = kc;
  // cobra: hips and thighs down, the toes pointed (footPoint), the chest lifted into a low cobra with the elbows bent
  const cb = { ...plank, pitch: 90, lumbar: -24, thoracic: -16, cervical: -10, head: -10, footPoint: 1, knee: -.2, ...feet({ R: [XB, FZ, 2], L: [XB, -FZ, 2] }) };
  const hipFront = S => { const p = S.F.pelvis; return p.o[1] + p.x[1] * 8.5; };
  for (let i = 0; i < 5; i++) {
    cb.rootY = solve(-10, 40, y => hipFront(settle({ ...cb, rootY: y }, true)), 4.5);
    cb.rootX = solve(XB - 20, HX + 20, x => settle({ ...cb, rootX: x }, true).reachLeg, .993);
  }
  K.cobra = cb;
  // inverted V: the feet back on their toes, hips high, arms and back in one line, heels towards the floor
  const dg = { ...plank, pitch: 132, lumbar: -2, thoracic: -4, cervical: -4, head: -4, rootX: (BALL + HX) / 2 - 8, rootY: 70, ...feet({ R: [XB, FZ, 2, 0, -30], L: [XB, -FZ, 2, 0, -30] }) };
  for (let i = 0; i < 4; i++) {
    dg.rootY = solve(20, 110, y => settle({ ...dg, rootY: y }).reachLeg, .985);
    dg.pitch = solve(95, 175, p => settle({ ...dg, pitch: p }).reach, .975);
  }
  K.dog = dg;
  GEO = { K, XB };
  return GEO;
}
// Each position is reached by its own arrival (the step's `clip` in the flow): a move through safe in-between keys (hands
// land before the weight goes on them, the hips stay up while a foot passes under the body, the knees lower before the
// hips slide forward), then a still hold for the rest of the breath. One clip cycle = one position = one breath.
// Arrivals by [from, to]: the Library's whole round below chains the same arrivals.
const DUR = 5;                                                           // one breath per position (the flow's pace stretches it)
function arrival(k, from, to, br) {
  const B = br ? { breath: br } : { b: .5 };
  const fa = feetOf(k[from]), fb = feetOf(k[to]);
  const moving = ['R', 'L'].filter(sd => Math.hypot(fa[sd][0] - fb[sd][0], fa[sd][1] - fb[sd][1]) > 2);
  const via = (name, key) => { k[name] = key; return name; };
  if (from === 'up' && to === 'fold') {                                  // fold down, the hands hanging, then landing beside the feet
    via('uf', { ...mix(k.up, k.fold, .55), release: 1, handX: 36, handY: -8, handZ: 17, noBalance: .4 });
    return [{ from, via: ['uf'], to, at: [0, .55, 1], dur: 2.2, r1: .3, r2: .3, ...B }];
  }
  if (from === 'fold' && to === 'up') {                                  // the hands leave the floor first, then rise forward and up
    via('fu', { ...mix(k.fold, k.up, .45), release: 1, handX: 40, handY: -2, handZ: 17, noBalance: .4 });
    via('fu2', { ...mix(k.fold, k.up, .8), release: 1, ...arm(120, 10, 55, { palm: 0, handShape: 1 }), noBalance: 0 });
    return [{ from, via: ['fu', 'fu2'], to, at: [0, .4, .75, 1], dur: 2.4, r1: .3, r2: .3, ...B }];
  }
  if (from === 'kc' && to === 'cobra') {                                 // hips forward over straightening legs, toes rolling over, then down
    via('kcb', { ...mix(k.kc, k.cobra, .5), rootY: Math.max(k.kc.rootY, k.cobra.rootY) + 2, footPoint: .5, knee: .6, straight: .96 });
    return [{ from, via: ['kcb'], to, at: [0, .5, 1], dur: 2, r1: .3, r2: .3, ...B }];
  }
  if (from === 'cobra' && to === 'dog') {                                // toes tuck first, the hips lift and go back
    via('cbd', { ...mix(k.cobra, k.dog, .3), footPoint: .1, knee: -.5, rootY: k.cobra.rootY + 14, straight: .97, pitch: k.cobra.pitch + 12, lumbar: -4, thoracic: -2, cervical: -10, head: -8 });
    return [{ from, via: ['cbd'], to, at: [0, .35, 1], dur: 2, r1: .3, r2: .3, ...B }];
  }
  if (moving.length === 1) {                                             // one foot steps: it lifts clear, the hips keep it room
    const sd = moving[0], name = `${from}_${to}`;
    const ph = swing(k, name, from, to, sd, fa[sd], fb[sd], { lift: 14, dur: 2.2, breath: br || undefined });
    const hi = Math.max(k[from].rootY, k[to].rootY), fwd = fb[sd][0] > fa[sd][0];
    ph.via.forEach((v, i) => {
      Object.assign(k[v], { noBalance: 1, ['knee' + sd]: 0 });
      k[v].rootY = Math.max(k[v].rootY, hi + (fwd ? [0, -4, -14] : [6, 8, 4])[i]);   // the hips stay up while the foot passes (then settle)
    });
    if (!br) ph.b = .5;
    return [ph];
  }
  return [{ from, to, dur: 1.8, r1: .3, r2: .3, ...B }];
}
// in-between keys made by the arrivals: planted arms within reach (the trunk pitches), legs never overstretched (the hips
// lower), the head and knees clear of the floor
function fixVias(k, names, settle) {
  const low = S => Math.min(S.pt.chin[1], S.pt.nose[1], S.pt.headTop[1], S.pt.patellaR[1], S.pt.patellaL[1]);
  for (const n of names) {
    const v = k[n];
    if (v.straight) {   // legs kept long while the hips travel: the hips sit on the legs' arc about the feet
      const want = v.straight; delete v.straight;
      v.rootX = solve(v.rootX - 60, v.rootX + 60, x => settle({ ...v, rootX: x }).reachLeg, want);
    }
    for (let i = 0; i < 3; i++) {
      if (v.release < .5 && settle(v).reach > .93) v.pitch = solve(10, 175, p => settle({ ...v, pitch: p }).reach, .93);
      if (settle(v).reachLeg > .99) v.rootY = solve(v.rootY - 50, v.rootY, y => settle({ ...v, rootY: y }).reachLeg, .98);
      if (low(settle(v)) < 2.5) v.rootY = solve(v.rootY, v.rootY + 40, y => low(settle({ ...v, rootY: y })), 2.5);
    }
  }
}
const KEYS_OF = settle => { const k = {}; for (const [n, v] of Object.entries(snGeo(settle).K)) k[n] = { ...v }; return k; };
// muscles for the review pages (the player passes the step exercise's own): the position's main movers
const SN_MUSCLES = { prayer: [[], ['chest']], up: [['front_delts', 'upper_back'], ['abs', 'lower_back']], fold: [['hamstrings'], ['lower_back', 'calves']],
  lungeR: [['hip_flexors', 'quads'], ['glutes']], lungeL: [['hip_flexors', 'quads'], ['glutes']], plank: [['abs', 'front_delts'], ['triceps', 'chest', 'quads']],
  kc: [['triceps', 'chest'], ['front_delts']], cobra: [['lower_back'], ['abs', 'hip_flexors']], dog: [['hamstrings', 'calves'], ['front_delts', 'upper_back']], stand: [[], ['side_delts']] };
const snStep = (name, from, to, br) => {
  const [primary, secondary] = SN_MUSCLES[to];
  const c = snRig({ name, counts: 1, cut: true, muscles: { primary, secondary }, keys: { [to]: {} }, timeline: [{ hold: to, dur: DUR }] });
  c.prep = ({ settle }) => {
    const k = c.keys = KEYS_OF(settle);
    const tl = arrival(k, from, to, br), d = tl.reduce((t, p) => t + p.dur, 0);
    fixVias(k, tl.flatMap(p => p.via || []), settle);
    c.timeline = [...tl, { hold: to, dur: DUR - d, b: br === 'in' ? 1 : br === 'out' ? 0 : .5 }];
  };
  return c;
};
const sn_prayer = snStep('Standing, palms together', 'stand', 'prayer', 'out');
const sn_raised_arms = snStep('Arms up and back', 'prayer', 'up', 'in');
const sn_forward_fold = snStep('Forward fold', 'up', 'fold', 'out');
const sn_lunge_r = snStep('Low lunge, right leg back', 'fold', 'lungeR', 'in');
const sn_lunge_l = snStep('Low lunge, left leg back', 'fold', 'lungeL', 'in');
const sn_plank = snStep('Plank (keep breathing)', 'lungeR', 'plank', null);
const sn_plank_l = snStep('Plank (keep breathing)', 'lungeL', 'plank', null);
const sn_knees_chest = snStep('Knees, chest and forehead', 'plank', 'kc', 'out');
const sn_cobra = snStep('Cobra', 'kc', 'cobra', 'in');
const sn_dog = snStep('Inverted V', 'cobra', 'dog', 'out');
const sn_lunge_in_r = snStep('Low lunge, right foot forward', 'dog', 'lungeL', 'in');
const sn_lunge_in_l = snStep('Low lunge, left foot forward', 'dog', 'lungeR', 'in');
const sn_fold_in_l = snStep('Forward fold', 'lungeL', 'fold', 'out');
const sn_fold_in_r = snStep('Forward fold', 'lungeR', 'fold', 'out');
const sn_rise = snStep('Arms up and back', 'fold', 'up', 'in');
const sn_stand = snStep('Standing, arms down', 'up', 'stand', 'out');

// the whole round (Library): 24 positions, one breath each, chaining the same arrivals
const SEQ = ['prayer', 'up', 'fold', 'lungeR', 'plank', 'kc', 'cobra', 'dog', 'lungeL', 'fold', 'up', 'stand',
  'prayer', 'up', 'fold', 'lungeL', 'plank', 'kc', 'cobra', 'dog', 'lungeR', 'fold', 'up', 'stand'];
const BREATH = ['out', 'in', 'out', 'in', null, 'out', 'in', 'out', 'in', 'out', 'in', 'out'];
const surya_namaskar = snRig({ name: 'Surya Namaskar', still: 0, keys: { stand: {} }, timeline: [{ hold: 'stand', dur: 1 }] });
surya_namaskar.prep = ({ settle }) => {
  const k = surya_namaskar.keys = KEYS_OF(settle), tl = [];
  SEQ.forEach((to, i) => {
    const from = i ? SEQ[i - 1] : 'stand', br = BREATH[i % 12];
    const a = arrival(k, from, to, br);
    fixVias(k, a.flatMap(p => p.via || []), settle);
    tl.push(...a, { hold: to, dur: 1.2, b: br === 'in' ? 1 : br === 'out' ? 0 : .5 });
  });
  surya_namaskar.timeline = tl;
};

Object.assign(CLIPS, { vrikshasana, virabhadrasana_2, trikonasana, surya_namaskar, sn_prayer, sn_raised_arms, sn_forward_fold, sn_lunge_r, sn_lunge_l, sn_plank, sn_plank_l,
  sn_knees_chest, sn_cobra, sn_dog, sn_lunge_in_r, sn_lunge_in_l, sn_fold_in_l, sn_fold_in_r, sn_rise, sn_stand });
