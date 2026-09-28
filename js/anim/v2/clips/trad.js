// Kitaeru animation v2 clips: strength traditions (v1.2). See lib.js / rot.js for conventions; every clip follows the
// fact-checked cues in js/data/exercises.js.
import { CLIPS, dist, solve, hold, pike } from './lib.js';

// Daṇḍ (Hindu push-up, Pehlwani): from a pike (hips high, hands shoulder-width), dip the chest low between the hands and
// sweep forward, straighten the arms into a gentle arch, then push the hips back to the pike. One smooth arc; the hands
// and the balls of the feet stay planted.
const dand = (() => {
  const c = pike(() => ({
    name: 'Daṇḍ (Hindu push-up)', cam: { az: 20, el: 7 }, pitch0: 132, trail: ['sternum'], still: .45,
    timeline: [{ hold: 'top', dur: .3, b: .1 }, { from: 'top', to: 'dive', dur: 1.1, r1: .3, r2: .2, breath: 'in' },
      { from: 'dive', to: 'arch', dur: .8, r1: .2, r2: .4, breath: 'out', effort: 1 }, { hold: 'arch', dur: .2, b: .3 },
      { from: 'arch', to: 'top', dur: 1.2, r1: .3, r2: .4, breath: 'in' }],
  }));
  const pk = c.prep;
  c.prep = function (ctx) {
    pk.call(c, ctx);
    const { settle } = ctx, k = c.keys, t = k.top, W = [c._hx - 5.2, 2.4, c._hz];
    // dive: trunk near level, chest ~14 cm off the floor just behind the hands, elbows bent, head up
    const dv = k.dive = { ...t, pitch: 100, lumbar: 0, thoracic: -2, cervical: -12, head: -8, scapElev: 0, scapProt: -4 };
    dv.rootX = t.rootX + 26;
    dv.rootY = solve(10, t.rootY, y => settle({ ...dv, rootY: y }).pt.sternum[1], 14);
    // arch: arms straight (97%) with the shoulders just behind the hands, hips low, a gentle back arch, chest up
    const ar = k.arch = { ...t, pitch: 62, lumbar: -18, thoracic: -9, cervical: -10, head: -6, scapElev: -.6, scapProt: 6, rootX: t.rootX + 55, rootY: 30 };
    for (let i = 0; i < 4; i++) {
      ar.rootX = solve(t.rootX, t.rootX + 110, x => settle({ ...ar, rootX: x }, true).pt.glenoidR[0], W[0] - 6);
      ar.rootY = solve(10, 70, y => dist(settle({ ...ar, rootY: y }, true).pt.glenoidR, W), .965 * 55);
    }
  };
  return c;
})();

// Baiṭhak (Hindu squat, Pehlwani): feet shoulder-width, arms forward; the arms swing back as the heels rise and you sink
// into a deep squat on the balls of the feet; they swing forward and up as you stand. A steady rhythm (about 2 s).
const baithak = (() => {
  const c = {
    name: 'Baiṭhak (Hindu squat)', cam: { az: 30, el: 6 }, floor: true, trail: ['hipR'], still: .5,
    lag: .12, headLag: .35, shift: .25, shiftRoll: .4, _h0: .9,
    // the balls stay planted; the heels lift exactly as much as the knee target needs (flat at the top)
    legs: { both: { mode: 'ik', foot: 'toes', toeOut: 10, knee: (s, ch) => ch[s > 0 ? 'kneeR' : 'kneeL'], ball: (sd, s) => [0, 0, 13 * s], pole: s => [1, 0, .22 * s] } },
    balance: S => { const u = Math.min(1, Math.max(0, (S.pt.heelR[1] - c._h0) / 6)); return S.pt.ballR[0] - 8 + 7 * u; },
    base: { pitch: 2, elbow: 10, palm: 90, fingers: 45, wrist: 0 },
    keys: {
      top: { rootY: 90, knee: 3, shFlex: 92, head: 0 },
      down: { rootY: 70, knee: 80, shFlex: 20, pitch: 8, head: -3 },
      bottom: { rootY: 42, knee: 140, shFlex: -42, pitch: 16, thoracic: 4, lumbar: -2, head: -6, cervical: -3 },
      up: { rootY: 68, knee: 80, shFlex: 55, pitch: 8, head: -3 },
    },
    timeline: [{ hold: 'top', dur: .15, b: .2 }, { from: 'top', via: ['down'], to: 'bottom', at: [0, .45, 1], dur: .85, r1: .25, r2: .3, breath: 'in' },
      { from: 'bottom', via: ['up'], to: 'top', at: [0, .5, 1], dur: .95, r1: .25, r2: .35, breath: 'out', effort: 1 }],
    prep({ settle }) {
      const k = c.keys;
      c._h0 = settle({ ...k.top, rootY: 70 }).pt.heelR[1];
      k.top.rootY = solve(70, 105, y => settle({ ...k.top, rootY: y }).pt.heelR[1], c._h0 + .05) - .5;   // heels just down
    },
  };
  return c;
})();

// Horse stance (馬步): feet parallel about two shoulder-widths apart; sink as if sitting on a horse, knees over the toes;
// trunk upright, fists at the waist (palms up), breathing slowly. Front view.
const horse_stance = {
  name: 'Horse stance', cam: { az: 78, el: 7 }, floor: true, trail: [], still: 0, floorZ: 60,
  lag: .3, headLag: .3, shift: .15, shiftRoll: .2,
  legs: { both: { mode: 'ik', foot: 'flat', toeOut: 0, ankle: (sd, s) => [0, 7.5, 39 * s], pole: s => [1, 0, .75 * s] } },   // knees pushed out over the toes
  arms: { both: { mode: 'ik', grip: 'free', pole: [-1, -.25, .12] } },   // elbows point back
  base: { rootY: 65, pitch: 0, lumbar: -3, thoracic: -2, cervical: 0, head: 0, handShape: 2, handX: 7, handY: -28, handZ: 12, palm: 0, wrist: 0 },
  keys: { a: {}, b: { rootY: 64.3, thoracic: -1, scapElev: .3 } },
  timeline: hold('a', 'b', 7),
};

Object.assign(CLIPS, { dand, baithak, horse_stance });
