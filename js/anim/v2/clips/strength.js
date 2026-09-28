// Kitaeru animation v2 clips: the remaining strength moves (batch 3): prone pulls without equipment, single-leg and
// wide-stance squats, the single-leg RDL and the Nordic curl negative. See lib.js for conventions. Every clip follows
// the fact-checked cues in js/data/exercises.js.
import { P } from '../core.js';
import { CLIPS, solve, rep, repUp, box, feet, swing, stepLegs, stand, arm } from './lib.js';

// ---------------------------------------------------------------------------------------------------------------
// prone (superman rig, trunk.js): the pelvis front pinned, lying face down; forehead hovering (neck long)
function prone(f) {
  const c = {
    floor: true, lag: .2, headLag: .3, shift: 0, shiftRoll: 0, still: .45,
    pin: { pt: S => P(S.F.pelvis, [8.5, 0, 0]), at: [0, 2.6] },
    arms: { both: { mode: 'ik', grip: 'free', pole: [-.6, -.5, .8] } },   // (T4 frame: +x towards the floor, +y to the head)
    base: { pitch: 92, lumbar: 2, thoracic: 1, cervical: -30, head: -24, palm: 90, wrist: 0, fingers: 10, knee: 2, ankle: 72, hipAbd: 3, hipFlex: 0 },
    prep({ settle }) {
      const r = c.keys.rest;
      r.pitch = solve(80, 105, p => settle({ ...r, pitch: p }).pt.sternum[1], 6);   // chest resting
      r.hipFlex = solve(-20, 20, v => settle({ ...r, hipFlex: v }).pt.patellaR[1], 2.4);   // thighs down
      for (const n in c.keys) if (n !== 'rest') c.keys[n] = { pitch: r.pitch, hipFlex: r.hipFlex, ...c.keys[n] };
      c.prep2?.({ settle });
    },
  };
  return Object.assign(c, f(c));
}
// prone Y-T-W: face down, forehead hovering; thumbs up, the arms lift into a Y, then a T, then a W, pausing and
// squeezing the shoulder blades in each shape
const LIFT = { thoracic: -4, cervical: -26, scapProt: -10 };
const prone_ytw = prone(() => ({
  name: 'Prone Y-T-W', cam: { az: 24, el: 22 }, floorZ: 74, trail: ['palmR'],
  muscles: { primary: ['upper_back', 'rear_delts'], secondary: ['traps', 'lower_back'] },
  keys: {
    rest: { handX: -5, handY: 44, handZ: 34, palm: 0 },                               // arms in a Y on the floor, thumbs up
    Y: { ...LIFT, handX: -8, handY: 45, handZ: 36, palm: 0, scapUp: 6 },
    T: { ...LIFT, handX: -10, handY: 2, handZ: 64, palm: -60 },
    W: { ...LIFT, handX: -12, handY: -6, handZ: 38, palm: -40, scapProt: -14 },
  },
  timeline: [{ hold: 'rest', dur: .4, b: .8 }, { from: 'rest', to: 'Y', dur: 1, r1: .3, r2: .4, breath: 'out' }, { hold: 'Y', dur: .8, b: 0 },
    { from: 'Y', to: 'T', dur: 1.1, r1: .3, r2: .4, breath: 'in' }, { hold: 'T', dur: .8, b: .5 },
    { from: 'T', to: 'W', dur: 1, r1: .3, r2: .4, breath: 'out' }, { hold: 'W', dur: .8, b: 0 }, { from: 'W', to: 'rest', dur: 1.2, r1: .3, r2: .4, breath: 'in' }],
}));
// superman pull: face down, arms overhead; lift the arms and chest a little, then pull the elbows down to the ribs as
// in a pull-up; reach again; lower
const superman_pull = prone(() => ({
  name: 'Superman pull', cam: { az: 24, el: 16 }, trail: ['palmR'],
  muscles: { primary: ['lats', 'upper_back'], secondary: ['lower_back', 'rear_delts', 'biceps'] },
  keys: {
    rest: { handX: -9, handY: 52, handZ: 18, palm: 90 },
    lift: { handX: -6, handY: 53, handZ: 18, palm: 90, lumbar: -6, thoracic: -8, cervical: -24, scapUp: 4 },
    pull: { handX: -8, handY: 4, handZ: 30, palm: 60, lumbar: -7, thoracic: -10, cervical: -24, scapProt: -14, scapElev: -1 },
  },
  timeline: [{ hold: 'rest', dur: .4, b: .8 }, { from: 'rest', to: 'lift', dur: 1, r1: .3, r2: .4, breath: 'in' },
    { from: 'lift', to: 'pull', dur: 1.1, r1: .25, r2: .4, breath: 'out', effort: 1 }, { hold: 'pull', dur: .4, b: 0 },
    { from: 'pull', to: 'lift', dur: 1.4, r1: .3, r2: .4, breath: 'in' }, { from: 'lift', to: 'rest', dur: 1, r1: .3, r2: .4, breath: 'out' }],
}));

// ---------------------------------------------------------------------------------------------------------------
// reverse lunge: step straight back (not sideways), the back knee kisses the floor, drive through the front heel to
// stand and step in. The right foot steps back (placed by its ball); sides alternate.
const reverse_lunge = (() => {
  const L = [0, -11, 6], Rin = [20, 11, 6, 0, 0, 1], Rback = [-44, 11, 6, 0, 0, 1];
  const hands = { handX: 12, handY: -30, handZ: 22, palm: 90, fingers: 15 };   // hands on the hips
  const k = {
    s0: { weight: .5, rootY: 88, ...feet({ L, R: Rin }) },
    s1: { weight: 0, rootY: 87, ...feet({ L, R: Rin }) },
    b0: { weight: .3, rootY: 72, pitch: 4, ...hands, ...feet({ L, R: Rback }) },
    b1: { weight: .35, rootY: 52, pitch: 6, ...hands, ...feet({ L, R: Rback }) },
    b2: { weight: .15, rootY: 72, pitch: 5, ...hands, ...feet({ L, R: Rback }) },
    b3: { weight: 0, rootY: 82, pitch: 3, ...hands, ...feet({ L, R: Rback }) },
  };
  const c = stand({}, {
    name: 'Reverse lunge', cam: { az: 40, el: 8 }, swap: true, still: .3, trail: ['hipL'], keys: k,
    base: { rootY: 88 },
    timeline: [{ hold: 's0', dur: .3, b: .5 }, { from: 's0', to: 's1', dur: .5, r1: .3, r2: .3 },
      swing(k, 'sb', 's1', 'b0', 'R', Rin, Rback, { dur: .9, lift: 5 }),
      { from: 'b0', to: 'b1', dur: .9, r1: .3, r2: .4, breath: 'in' }, { hold: 'b1', dur: .2, b: 1 },
      { from: 'b1', via: ['b2'], to: 'b3', dur: 1, r1: .25, r2: .4, breath: 'out', effort: 1 }, swing(k, 'sf', 'b3', 's0', 'R', Rback, Rin, { dur: .9, lift: 5 })],
    prep({ settle }) {   // the back knee just above the floor at the bottom
      k.b1.rootY = solve(35, 75, y => settle({ ...k.b1, rootY: y }).pt.kneeR[1], 8.5);
    },
  });
  return c;
})();

// cossack squat: a very wide stance; sit into the right hip, the left leg straight with its toes pointing up (on the
// heel); chest tall, hands together in front for balance; back through the middle; sides alternate
const cossack_squat = (() => {
  const R = [-5, 42, 30], L = [-5, -42, 30];
  const hands = { handX: 34, handY: -8, handZ: -6, palm: 90, fingers: 15 };
  const k = {
    mid: { weight: .5, rootY: 80, ...feet({ R, L }), ...hands },
    down: { weight: 1, rootY: 40, rootZ: 26, pitch: 22, lumbar: -4, thoracic: 2, head: -8, ...hands, ...feet({ R, L: [-5, -42, 30, 0, 70] }) },
  };
  return stand({}, {
    name: 'Cossack squat', cam: { az: 70, el: 7 }, floorZ: 62, swap: true, still: .3, trail: ['hipR'], keys: k, base: { rootY: 80 },
    timeline: [{ hold: 'mid', dur: .4, b: .8 }, { from: 'mid', to: 'down', dur: 2, r1: .3, r2: .4, breath: 'in' }, { hold: 'down', dur: .4, b: 1 },
      { from: 'down', to: 'mid', dur: 1.3, r1: .25, r2: .4, breath: 'out', effort: 1 }],
    prep({ settle }) { k.down.rootY = solve(25, 70, y => { const S = settle({ ...k.down, rootY: y }); return S.pt.hipR[1] - S.pt.kneeR[1]; }, -6); },   // hip below the knee
  });
})();

// pistol squat: on the right foot, the left leg straight out in front, the arms reaching forward to counterbalance;
// sit all the way down under control, drive up without rocking; sides alternate
const pistol_squat = (() => {
  const R = [-5, 9, 8];
  const k = {
    top: { weight: 1, rootY: 88, pitch: 4, hipFlexL: 42, kneeL: 6, ankleL: 20, ...arm(80, 8, 50, { palm: 90 }), ...feet({ R }) },
    down: { weight: 1, rootY: 60, pitch: 24, hipFlexL: 84, kneeL: 4, ankleL: 20, ...arm(88, 6, 52, { palm: 90 }), ...feet({ R }) },
    bottom: { weight: 1, rootY: 34, pitch: 34, lumbar: 6, thoracic: 6, head: -10, hipFlexL: 138, kneeL: 2, ankleL: 20, ...arm(92, 6, 53, { palm: 90 }), ...feet({ R }) },
  };
  return stand({}, {
    name: 'Pistol squat', cam: { az: 36, el: 6 }, swap: true, still: .3, trail: ['hipR'], keys: k, base: { rootY: 88 },
    legs: { R: stepLegs.both },   // the left leg is free (joint angles)
    timeline: rep('top', 'bottom', { p0: .4, via1: ['down'], via2: ['down'], ecc: 2.6, con: 1.3 }),
    prep({ settle }) { k.bottom.rootY = solve(20, 60, y => { const S = settle({ ...k.bottom, rootY: y }); return S.pt.hipR[1] - S.pt.kneeR[1]; }, -14); },   // all the way down
  });
})();

// shrimp squat: on the right foot, the left hand holds the left foot behind (knee bent); lower until the back knee
// touches the floor, leaning forward to balance; up; sides alternate
const shrimp_squat = (() => {
  const R = [-2, 9, 8];
  const foot = (hf, kn) => ({ hipFlexL: hf, kneeL: kn, ankleL: 30 });
  const k = {
    top: { weight: 1, rootY: 87, pitch: 8, ...foot(-2, 145), ...feet({ R }) },
    bottom: { weight: 1, rootY: 45, pitch: 40, lumbar: 4, thoracic: 4, head: -12, ...foot(-18, 150), ...feet({ R }) },
  };
  return stand({}, {
    name: 'Shrimp squat', cam: { az: 40, el: 6 }, swap: true, still: .3, trail: ['kneeL'], keys: k, base: { rootY: 87, ...arm(70, 8, 48, { palm: 90 }, 'R') },
    legs: { R: stepLegs.both },
    arms: { R: { mode: 'ik', grip: 'free', pole: [-.3, -1, .5] },
      L: { mode: 'ik', grip: 'world', pole: [-.5, -.5, .6], at: (sd, s, ch, S, G) => {   // the hand on the foot, as far as it reaches (96%)
        const a = S.pt['ankle' + sd], t = [a[0] - 2, a[1] + 4, a[2] - 4 * s], d = Math.hypot(t[0] - G[0], t[1] - G[1], t[2] - G[2]), m = .96 * 55;
        return d <= m ? t : t.map((v, i) => G[i] + (v - G[i]) * m / d); } } },
    timeline: rep('top', 'bottom', { p0: .4, ecc: 2.4, con: 1.3 }),
    prep({ settle }) { k.bottom.rootY = solve(25, 70, y => settle({ ...k.bottom, rootY: y }).pt.kneeL[1], 3.5); },   // the back knee touches
  });
})();

// single-leg RDL: soft standing (right) knee; hinge at the hip, the left leg reaching back in line with the trunk; hips
// square to the floor; stand by squeezing the glute; arms hang long; sides alternate
const single_leg_rdl = (() => {
  const R = [-2, 9, 8];
  const k = {
    top: { weight: 1, rootY: 88, pitch: 3, hipFlexL: -4, kneeL: 55, ankleL: 30, ...arm(6, 20, 50, { palm: 90 }), ...feet({ R }) },
    bottom: { weight: 1, rootY: 84, pitch: 80, lumbar: -2, thoracic: -2, head: -4, cervical: -6, hipFlexL: -4, kneeL: 4, ankleL: 10,
      ...arm(86, 10, 52, { palm: 90 }), ...feet({ R }) },   // (the arms hang straight down from the hinged trunk)
  };
  return stand({}, {
    name: 'Single-leg RDL', cam: { az: 20, el: 7 }, swap: true, still: .3, trail: ['sternum'], keys: k, base: { rootY: 88 },
    legs: { R: stepLegs.both },
    timeline: rep('top', 'bottom', { p0: .4, ecc: 2.2, con: 1.3 }),
    prep({ settle }) { k.top.rootY = solve(70, 100, y => settle({ ...k.top, rootY: y }).reachLeg, .975); k.bottom.rootY = solve(60, 100, y => settle({ ...k.bottom, rootY: y }).reachLeg, .965); },
  });
})();

// Nordic curl negative: kneeling on a cushion, heels anchored under a sofa; hips straight, the body one line from the
// knees; lower as slowly as you can, then catch yourself with the hands and push back up
const nordic_curl_negative = (() => {
  const lean = p => ({ pitch: p, hipFlex: 0, knee: 90 - p, ankle: 80 });
  const c = {
    name: 'Nordic curl negative', cam: { az: 24, el: 8 }, floor: true, trail: ['headTop'], still: .1, _hx: 60,
    lag: .15, headLag: .3, shift: 0, shiftRoll: 0,
    pin: { pt: S => S.pt.kneeR, at: [0, 7] },
    arms: { both: { mode: 'ik', grip: 'palm', arc: 8, pole: [-.6, -1, .6], dir: s => [1, 0, .1 * s], target: (sd, s) => [c._hx, 0, 22 * s] } },
    base: { hipAbd: 2, cervical: 2, head: -4, handX: 18, handY: -10, handZ: 10, palm: 90, fingers: 20, wrist: 0 },
    keys: {
      top: { ...lean(2), release: 1 },
      low: { ...lean(56), release: 1, handX: 30, handY: 4 },
      catch: { ...lean(66), release: 0 },
    },
    timeline: [{ hold: 'top', dur: .4, b: .9 }, { from: 'top', via: ['low'], to: 'catch', at: [0, .8, 1], dur: 3.8, r1: .15, r2: .3, breath: 'in' },
      { hold: 'catch', dur: .3, b: 0 }, { from: 'catch', to: 'top', dur: 1.4, r1: .3, r2: .4, breath: 'out', effort: 1 }],
    props: c => [box([-70, 0, -30], [-40, 7, 30]), box([-66, 16, -40], [-22, 40, 40], -1e4)],   // cushion under the knees; the sofa over the heels
    prep({ settle }) {
      const k = c.keys.catch;   // the palms on the floor at 90% reach when caught
      const G = settle(k, true).pt.glenoidR;
      c._hx = G[0] + Math.sqrt(Math.max(0, (.78 * 55) ** 2 - (G[1] - 2.4) ** 2)) + 5.2;
    },
  };
  return c;
})();

Object.assign(CLIPS, { prone_ytw, superman_pull, reverse_lunge, cossack_squat, pistol_squat, shrimp_squat, single_leg_rdl, nordic_curl_negative });
