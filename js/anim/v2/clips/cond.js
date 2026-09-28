// Kitaeru animation v2 clips: conditioning (batch 4). Standing moves use the stepping legs (feet placed per key, a
// swing foot lifts along a spline, the balance keeps the centre of mass over the feet that are down); jumps use the
// short airborne mode (both feet leave the floor: the balance aims at where they land). See lib.js / taichi.js for
// the conventions. Every clip follows the fact-checked cues in js/data/exercises.js.
import { CLIPS, solve, feet, mix, swing, stand, arm, rep } from './lib.js';

const FW = 12;                                                    // hip-width stance (half)
const ST = { R: [-5, FW, 6], L: [-5, -FW, 6] };
// arms swinging in opposition: sd's arm forward, the other back (free hands, T4 frame)
const armsSwing = (fwd, deg = 38, bend = 0) => {
  const back = fwd === 'R' ? 'L' : 'R';
  return { ...arm(deg, 6, 50 - bend, { palm: 90, fingers: 20 }, fwd), ...arm(-deg * .7, 12, 50 - bend, { palm: 90, fingers: 20 }, back) };
};

// ---------------------------------------------------------------------------------------------------------------
// marching in place: knees up to hip height in turn, the opposite arm swinging forward; tall. 2 steps ≈ 1.3 s
const marching_in_place = (() => {
  const k = {
    s: { weight: .5, rootY: 88, ...feet(ST), ...armsSwing('R', 5) },
    wL: { weight: 0, rootY: 88, ...feet(ST), ...armsSwing('L', 10) },
    upR: { weight: 0, rootY: 88.5, ...feet(ST), ...armsSwing('L', 36) },
    s2: { weight: .5, rootY: 88, ...feet(ST), ...armsSwing('L', 5) },
    wR: { weight: 1, rootY: 88, ...feet(ST), ...armsSwing('R', 10) },
  };
  const knee = sd => ({ mid: [16, (sd === 'R' ? 1 : -1) * FW, 6, 0, -35], lift: 42 });   // thigh level, the foot under the knee
  return stand({}, {
    name: 'Marching in place', cam: { az: 36, el: 6 }, counts: 2, still: .25, trail: [], keys: k, base: { rootY: 88 },
    timeline: [{ from: 's', to: 'wL', dur: .12, r1: .3, r2: .3 },
      swing(k, 'mR', 'wL', 's2', 'R', ST.R, ST.R, { ...knee('R'), dur: .5 }),
      { from: 's2', to: 'wR', dur: .12, r1: .3, r2: .3 },
      swing(k, 'mL', 'wR', 's', 'L', ST.L, ST.L, { ...knee('L'), dur: .5 })],
  });
})();

// high knees: sprinting on the spot, knees to hip height, quick light feet on the balls; arms pumping, elbows bent
const high_knees = (() => {
  const pump = (fwd, deg) => { const b = fwd === 'R' ? 'L' : 'R';
    return { ...arm(deg, 4, 36, { palm: 90, fingers: 40 }, fwd), ...arm(-deg * .8, 10, 36, { palm: 90, fingers: 40 }, b) }; };
  const HK = { R: [-2, FW, 6, 0, -25], L: [-2, -FW, 6, 0, -25] };   // on the balls, heels up
  const k = {
    a: { weight: 0, rootY: 89, onBalls: 1, pitch: 4, ...feet(HK), ...pump('R', 30) },
    b: { weight: 1, rootY: 89, onBalls: 1, pitch: 4, ...feet(HK), ...pump('L', 30) },
  };
  const knee = sd => ({ mid: [18, (sd === 'R' ? 1 : -1) * FW, 6, 0, -40], lift: 44 });
  return stand({}, {
    name: 'High knees', cam: { az: 36, el: 6 }, counts: 2, still: .25, trail: [], keys: k, base: { rootY: 89 },
    timeline: [swing(k, 'kR', 'a', 'b', 'R', HK.R, HK.R, { ...knee('R'), dur: .32 }), swing(k, 'kL', 'b', 'a', 'L', HK.L, HK.L, { ...knee('L'), dur: .32 })],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// a short hop between two stances (both feet leave the floor): keys from -> air -> to; the feet travel mid-air
function hop(k, name, from, to, fa, fb, { lift = 5, up = 5, dur = .5, air = {} } = {}) {
  // the feet lift before they travel and travel before they land (no scuffing)
  const A = (sd, u, h) => [fa[sd][0] + (fb[sd][0] - fa[sd][0]) * u, fa[sd][1] + (fb[sd][1] - fa[sd][1]) * u, u < .5 ? fa[sd][2] : fb[sd][2], h, -4];
  const top = Math.max(k[from].rootY, k[to].rootY) + up;
  k[name + 'a'] = { ...mix(k[from], k[to], .2), rootY: top - up * .4, onBalls: 1, ...feet({ R: A('R', .03, lift * .6), L: A('L', .03, lift * .6) }) };
  k[name] = { ...mix(k[from], k[to], .5), rootY: top, onBalls: 1, ...feet({ R: A('R', .5, lift), L: A('L', .5, lift) }), ...air };
  k[name + 'b'] = { ...mix(k[from], k[to], .8), rootY: top - up * .4, onBalls: 1, ...feet({ R: A('R', .97, lift * .6), L: A('L', .97, lift * .6) }) };
  return { from, via: [name + 'a', name, name + 'b'], to, at: [0, .18, .5, .82, 1], dur, r1: .15, r2: .3 };
}
// jumping jack: light on the balls of the feet; the feet jump wide as the arms swing overhead, then back together with
// the arms down; a steady rhythm. 1 jack ≈ 1.1 s
const jumping_jack = (() => {
  const IN = { R: [-4, 10, 6], L: [-4, -10, 6] }, OUT = { R: [-4, 36, 14], L: [-4, -36, 14] };
  const k = {
    in: { weight: .5, rootY: 86, onBalls: 1, ...feet(IN), ...arm(8, 30, 50, { palm: 90 }) },
    out: { weight: .5, rootY: 84, onBalls: 1, ...feet(OUT), ...arm(168, 70, 52, { palm: 0 }) },
  };
  return stand({}, {
    name: 'Jumping jack', cam: { az: 72, el: 6 }, floorZ: 52, counts: 1, still: .3, trail: ['palmR'], keys: k, base: { rootY: 86 },
    timeline: [hop(k, 'u1', 'in', 'out', IN, OUT, { air: arm(95, 85, 52, { palm: 90 }) , dur: .52 }), { hold: 'out', dur: .06 },
      hop(k, 'u2', 'out', 'in', OUT, IN, { air: arm(95, 85, 52, { palm: 90 }), dur: .52 }), { hold: 'in', dur: .06 }],
  });
})();

// squat jump: squat to parallel, explode up with the arms swinging, land soft and quiet with the knees bent, back into
// the squat. 1 rep ≈ 2.2 s
const squat_jump = (() => {
  const SJ = { R: [-5, 14, 12], L: [-5, -14, 12] };
  const k = {
    top: { weight: .5, rootY: 88, ...feet(SJ), ...arm(10, 20, 50, { palm: 90 }) },
    bot: { weight: .5, rootY: 50, pitch: 32, lumbar: -4, thoracic: 4, head: -10, ...feet(SJ), ...arm(-38, 16, 50, { palm: 90 }) },
    drive: { weight: .5, rootY: 62, pitch: 22, onBalls: 1, ...feet(SJ), ...arm(40, 16, 50, { palm: 90 }) },
    push: { weight: .5, rootY: 90, pitch: 4, onBalls: 1, ...feet({ R: [-5, 14, 12, 0, -40], L: [-5, -14, 12, 0, -40] }), ...arm(150, 14, 52, { palm: 90 }) },
    land: { weight: .5, rootY: 72, pitch: 16, onBalls: .5, ...feet(SJ), ...arm(40, 14, 50, { palm: 90 }) },
  };
  k.air = { ...k.push, rootY: 104, ...feet({ R: [-5, 14, 12, 10, -30], L: [-5, -14, 12, 10, -30] }), ...arm(165, 14, 52, { palm: 90 }) };
  return stand({}, {
    name: 'Squat jump', cam: { az: 36, el: 6 }, counts: 1, still: .3, trail: ['hipR'], keys: k, base: { rootY: 88 },
    timeline: [{ from: 'top', to: 'bot', dur: .8, r1: .3, r2: .4, breath: 'in' }, { hold: 'bot', dur: .15, b: 1 },
      { from: 'bot', via: ['drive'], to: 'push', at: [0, .45, 1], dur: .34, r1: .2, r2: .1, breath: 'out', effort: 1 }, { from: 'push', to: 'air', dur: .2, r1: 0, r2: .6 },
      { from: 'air', to: 'land', dur: .32, r1: .6, r2: .1 }, { from: 'land', to: 'top', dur: .5, r1: .2, r2: .4 }],
    prep({ settle }) {
      k.bot.rootY = solve(35, 70, y => { const S = settle({ ...k.bot, rootY: y }); return S.pt.hipR[1] - S.pt.kneeR[1]; }, 1);   // thighs parallel
      k.push.rootY = solve(80, 105, y => settle({ ...k.push, rootY: y }).reachLeg, .99);   // legs straight, on the toes
      k.air.rootY = k.push.rootY + 10;
    },
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// mountain climber: a strong high plank, shoulders over the hands; drive one knee to the chest, then the other,
// quickly; the hips stay low. Hands planted; each foot placed by its ball (footX / footLift channels).
const mountain_climber = (() => {
  const c = {
    name: 'Mountain climber', cam: { az: 22, el: 10 }, floor: true, trail: ['kneeR'], still: .25, counts: 2, _hx: 60, _hz: 20,
    lag: .1, headLag: .3, shift: 0, shiftRoll: 0,
    legs: { both: { mode: 'ik', foot: 'toes', toeOut: 4,
      ball: (sd, s, ch) => [ch['footX' + sd], ch['footLift' + sd], 10 * s], lift: () => 50,   // on the balls, heels well up
      pole: (s, ch) => { const u = Math.min(1, Math.max(0, ch[s > 0 ? 'footLiftR' : 'footLiftL'] / 8)); return [.3 + .7 * u, -1 + .8 * u, 0]; } } },   // the driving knee points forwards
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.55, -1, .85], dir: s => [1, 0, .12 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { rootX: 0, rootY: 44, pitch: 76, cervical: 3, head: -8, thoracic: -1, lumbar: 1, wrist: 0, footX: -84, footLift: 0, knee: 3, scapProt: 6 },
    keys: {
      plank: {},
      Ru: {}, Rd: {}, Lu: {}, Ld: {},
      R: { footXR: -16, footLiftR: 14, kneeR: 105 },
      L: { footXL: -16, footLiftL: 14, kneeL: 105 },
    },
    timeline: [{ from: 'plank', via: ['Ru'], to: 'R', at: [0, .4, 1], dur: .3, r1: .2, r2: .3 }, { from: 'R', via: ['Rd'], to: 'plank', at: [0, .6, 1], dur: .3, r1: .2, r2: .3 },
      { from: 'plank', via: ['Lu'], to: 'L', at: [0, .4, 1], dur: .3, r1: .2, r2: .3 }, { from: 'L', via: ['Ld'], to: 'plank', at: [0, .6, 1], dur: .3, r1: .2, r2: .3 }],
    prep({ settle }) {
      const p = c.keys.plank;   // hips low, body in one line from the balls of the feet; hands under the shoulders
      for (let i = 0; i < 3; i++) {
        const G = settle(p, true).pt.glenoidR;
        c._hx = G[0] + 5.2; c._hz = G[2] + 2;
        p.rootY = solve(20, 70, y => settle({ ...p, rootY: y }).reach, .97);
        p.footX = solve(-120, -40, x => settle({ ...p, footX: x, footXR: x, footXL: x }).reachLeg, .972);   // legs straight
      }
      for (const n of ['R', 'L']) Object.assign(c.keys[n], { rootY: p.rootY + .5, [n === 'R' ? 'footXL' : 'footXR']: p.footX });
      c.base.footX = p.footX;
      for (const n of ['R', 'L']) {   // the foot lifts before it travels and lands after it arrives
        const K = c.keys[n], lift = { ['footLift' + n]: 20 };
        c.keys[n + 'u'] = { ...K, ['footX' + n]: p.footX + (K['footX' + n] - p.footX) * .04, ['knee' + n]: 70, ...lift, rootY: p.rootY, pitch: c.base.pitch };
        c.keys[n + 'd'] = { ...K, ['footX' + n]: p.footX + (K['footX' + n] - p.footX) * .04, ['knee' + n]: 60, ...lift, rootY: p.rootY, pitch: c.base.pitch };
        for (const m of [n, n + 'u', n + 'd']) {   // the hips rise a little as the knee drives in; the pitch keeps the arms straight
          const q = c.keys[m]; q.rootY = p.rootY + (m === n ? 4.5 : 3.5);
          q.pitch = solve(60, 100, v => settle({ ...q, pitch: v }).reach, .975);
        }
      }
    },
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// bear crawl: on hands and feet with the knees hovering just off the floor, back flat; small steps forward, the
// opposite hand and foot together. Hands placed by handX (and lifted by handY), feet by footX / footLift.
const BC = 16;                                                    // step length
const bear_crawl = (() => {
  const c = {
    name: 'Bear crawl', cam: { az: 24, el: 10 }, floor: true, trail: [], still: .25, travel: [2 * BC, 0, 0], counts: 2, _hz: 20,
    lag: .1, headLag: .3, shift: 0, shiftRoll: .4,
    legs: { both: { mode: 'ik', foot: 'toes', toeOut: 6,
      ball: (sd, s, ch) => [ch['footX' + sd], ch['footLift' + sd], 12 * s], knee: (s, ch) => ch[s > 0 ? 'kneeR' : 'kneeL'], pole: () => [.8, -.5, 0] } },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.5, -1, .8], dir: s => [1, 0, .12 * s], target: (sd, s, ch) => [ch['handX' + sd], ch['handY' + sd], c._hz * s] } },
    base: { rootY: 50, pitch: 84, cervical: -4, head: -14, lumbar: 1, thoracic: 0, wrist: 0, fingers: 10, knee: 95, scapProt: 4 },
    prep({ settle }) {   // hands under the shoulders at 97% reach, feet under the hips, knees ~95°: rootY and the spots
      const k = c.keys;
      const S = settle({ ...k.k0 }, true);
      const hx = S.pt.glenoidR[0] + 5.2, fx = S.pt.hipR[0] - 8;
      const place = (key, rh, lh, rf, lf, lift) => Object.assign(k[key], { handXR: hx + rh, handXL: hx + lh, footXR: fx + rf, footXL: fx + lf,
        handYR: 0, handYL: 0, footLiftR: 0, footLiftL: 0, ...lift });
      // cycle: right hand + left foot step, then left hand + right foot
      place('k0', 0, BC, BC, 0);
      place('k0a', 0, BC, BC, 0, { handYR: 10, footLiftL: 12, rootX: BC * .1 });
      place('k1', BC, BC, BC, BC, { handYR: 7, footLiftL: 8, rootX: BC / 2 });
      place('k1a', 2 * BC, BC, BC, 2 * BC, { handYR: 10, footLiftL: 12, rootX: BC * .9 });
      place('k2', 2 * BC, BC, BC, 2 * BC, { rootX: BC });
      place('k2a', 2 * BC, BC, BC, 2 * BC, { handYL: 10, footLiftR: 12, rootX: BC * 1.1 });
      place('k3', 2 * BC, 2 * BC, 2 * BC, 2 * BC, { handYL: 7, footLiftR: 8, rootX: 3 * BC / 2 });
      place('k3a', 2 * BC, 3 * BC, 3 * BC, 2 * BC, { handYL: 10, footLiftR: 12, rootX: BC * 1.9 });
      place('k4', 2 * BC, 3 * BC, 3 * BC, 2 * BC, { rootX: 2 * BC });
      for (const n in k) { k[n].rootX = k[n].rootX ?? 0; }
      const R = k.k0.rootY = solve(30, 70, y => settle({ ...k.k0, rootY: y }).reach, .96);
      for (const n in k) k[n].rootY = R + (n === 'k1' || n === 'k3' ? .8 : 0);   // (a slight rise mid-step)
    },
    keys: { k0: {}, k0a: {}, k1: {}, k1a: {}, k2: {}, k2a: {}, k3: {}, k3a: {}, k4: {} },
    timeline: [{ from: 'k0', via: ['k0a', 'k1', 'k1a'], to: 'k2', at: [0, .2, .5, .8, 1], dur: .75, r1: .15, r2: .25 },
      { from: 'k2', via: ['k2a', 'k3', 'k3a'], to: 'k4', at: [0, .2, .5, .8, 1], dur: .75, r1: .15, r2: .25 }],
  };
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// burpee: hands down, jump the feet back to a plank, chest to the floor, press up, jump the feet in, jump and clap
// overhead; land soft. The hands plant (release 0) from the squat to the jump; in the plank the balance is off (the
// hands bear weight too).
const burpee = (() => {
  const S0 = { R: [-5, 13, 10], L: [-5, -13, 10] };
  const back = x => ({ R: [x, 11, 4, 0, -62, 1], L: [x, -11, 4, 0, -62, 1] });   // on the balls of the feet, heels up
  const down = { handX: 20, handY: -36, handZ: 18, palm: 90, fingers: 15 };
  const c = stand({}, {
    name: 'Burpee', cam: { az: 28, el: 8 }, counts: 1, still: .3, trail: ['sternum'], _hx: 30, _hz: 18,
    arms: { both: { mode: 'ik', grip: 'palm', arc: 6, pole: [-.6, -1, .6], dir: s => [1, 0, .1 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { rootY: 88, release: 1, ...down },
    keys: {
      st: { weight: .5, rootY: 88, ...feet(S0) },
      sq: { weight: .5, rootY: 46, pitch: 64, lumbar: 6, thoracic: 6, head: -10, release: 0, ...feet(S0) },
      pl: { noBalance: 1, rootX: -30, rootY: 44, pitch: 78, head: -8, release: 0, ...feet(back(-100)) },
      ch: { noBalance: 1, rootX: -20, rootY: 16, pitch: 86, head: -10, release: 0, ...feet(back(-100)) },
      air: { weight: .5, rootY: 104, pitch: 2, release: 1, handX: -2, handY: 54, handZ: -12, palm: 0, ...feet({ R: [-5, 13, 10, 10, -30], L: [-5, -13, 10, 10, -30] }) },
      land: { weight: .5, rootY: 76, pitch: 10, onBalls: .5, release: 1, ...feet(S0) },
    },
    timeline: [],
    prep({ settle }) {
      const k = c.keys;
      // squat: the palms on the floor just in front of the feet, arms nearly straight
      k.sq.rootY = solve(15, 70, y => settle({ ...k.sq, rootY: y }, true).pt.glenoidR[1], .86 * 55);
      const G = settle(k.sq, true).pt.glenoidR; c._hx = G[0] + 12; c._hz = G[2] + 1;
      // plank: shoulders over the hands at 97% reach, the body straight to the balls of the feet
      for (let i = 0; i < 4; i++) {
        k.pl.rootX = solve(-80, 20, x => settle({ ...k.pl, rootX: x }).pt.glenoidR[0], c._hx - 5.2);
        k.pl.rootY = solve(20, 70, y => settle({ ...k.pl, rootY: y }).reach, .97);
        const fx = solve(-160, -60, x => settle({ ...k.pl, ...feet(back(x)) }).reachLeg, .98);   // legs straight to the balls of the feet
        Object.assign(k.pl, feet(back(fx))); Object.assign(k.ch, feet(back(fx)));
      }
      // the jumps back and in: mid-air, the shoulders stay over the planted hands
      const mid = feet({ R: [-45, 12, 6, 10, -40, 1], L: [-45, -12, 6, 10, -40, 1] });
      for (const [n, pitch] of [['jb', 100], ['jf', 100], ['jbA', 78], ['jfA', 78]]) {
        const j = k[n] = { ...mix(k.sq, k.pl, .5), pitch, noBalance: 1, release: 0, ...(pitch > 90 ? mid : feet(S0)) };   // hips up mid-jump
        for (let i = 0; i < 4; i++) {   // shoulders over the hands at 92% reach
          j.rootX = solve(-80, 40, x => settle({ ...j, rootX: x }).pt.glenoidR[0], c._hx - 5.2 - 3);
          j.rootY = solve(30, 90, y => settle({ ...j, rootY: y }).reach, .92);
        }
      }
      k.pl2 = { ...k.pl }; k.sq2 = { ...k.sq, noBalance: .6 };
      const fx = k.pl.footXR;
      k.jf0 = { ...k.pl, ...feet({ R: [fx, 11, 4, 8, -62, 1], L: [fx, -11, 4, 8, -62, 1] }) };   // the feet leave before they travel
      k.jfL = { ...k.jfA, ...feet({ R: [S0.R[0], S0.R[1], S0.R[2], 8, -20], L: [S0.L[0], S0.L[1], S0.L[2], 8, -20] }) };   // over the landing spot, then down
      k.jbL = { ...k.jbA, ...feet({ R: [S0.R[0] - 4, S0.R[1], S0.R[2], 5, -30], L: [S0.L[0] - 4, S0.L[1], S0.L[2], 5, -30] }) };   // up before back
      k.rise = { ...mix(k.sq2, k.air, .3), release: 1, noBalance: 0, ...feet(S0) };   // the hands leave the floor first
      k.sqa = { ...mix(k.st, k.sq, .9), release: 1, ...feet(S0) };                         // they reach the floor last
      k.ch.rootX = k.pl.rootX + 4;
      k.ch.rootY = solve(5, k.pl.rootY, y => settle({ ...k.ch, rootY: y }).pt.sternum[1], 7.5);   // chest to the floor
    },
  });
  // the two jumps of the feet (back and in) lift both feet mid-way
  const k = c.keys;
  Object.assign(k, { jb: {}, jf: {}, jf0: {}, jbA: {}, jfA: {}, jbL: {}, jfL: {}, pl2: {}, sq2: {}, rise: {}, sqa: {} });   // (solved in prep)
  c.timeline = [{ hold: 'st', dur: .2, b: .5 }, { from: 'st', via: ['sqa'], to: 'sq', at: [0, .8, 1], dur: .6, r1: .3, r2: .3, breath: 'in' },
    { from: 'sq', via: ['jbL', 'jb'], to: 'pl', at: [0, .25, .6, 1], dur: .5, r1: .2, r2: .3 }, { from: 'pl', to: 'ch', dur: .6, r1: .3, r2: .3 },
    { from: 'ch', to: 'pl2', dur: .5, r1: .2, r2: .3, breath: 'out', effort: 1 }, { from: 'pl2', via: ['jf0', 'jf'], to: 'jfL', at: [0, .2, .55, 1], dur: .38, r1: .2, r2: .1 },
    { from: 'jfL', to: 'jfA', dur: .1, r1: .1, r2: .3 }, { from: 'jfA', to: 'sq2', dur: .12, r1: .2, r2: .3 },
    { from: 'sq2', via: ['rise'], to: 'air', at: [0, .35, 1], dur: .55, r1: .2, r2: .5, breath: 'in', effort: 1 }, { from: 'air', to: 'land', dur: .35, r1: .5, r2: .2 },
    { from: 'land', to: 'st', dur: .45, r1: .2, r2: .4, breath: 'out' }];
  return c;
})();

Object.assign(CLIPS, { marching_in_place, high_knees, jumping_jack, squat_jump, mountain_climber, bear_crawl, burpee });
