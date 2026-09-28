// Kitaeru animation v2 clips: pull (vertical, horizontal). See lib.js for conventions.
import { CLIPS, dist, solve, repUp, hold, box, rod, frame, hang, hangHeights, BAR_Y, row, rowGeometry } from './lib.js';

const PULL = { primary: ['lats', 'upper_back'], secondary: ['biceps', 'rear_delts', 'forearms', 'abs'] };
const pull_up = hang(() => ({ name: 'Pull-up', muscles: PULL }));
// underhand, shoulder-width grip; elbows travel in front of the body
const chin_up = hang(c => ({
  name: 'Chin-up', gz: 17,
  muscles: { primary: ['lats', 'biceps'], secondary: ['upper_back', 'forearms', 'abs'] },
  arms: { both: { mode: 'ik', grip: 'bar', sup: true, pole: [.9, -.3, .45], target: (sd, s) => [0, BAR_Y, c.gz * s] } },
}));

// ---------------------------------------------------------------------------------------------------------------
// batch 2
// ---------------------------------------------------------------------------------------------------------------
// a breathing dead hang: shoulders relax up to the ears and settle, arms straight
const dead_hang = hang(() => ({
  name: 'Dead hang', still: 0, trail: [],
  muscles: { primary: ['forearms'], secondary: ['lats', 'upper_back'] },
  timeline: hold('hang', 'hang2', 5),
  prep({ build }) {
    const k = this.keys;
    k.hang.rootY = solve(80, 160, y => build({ ...k.hang, rootY: y }).reach, .993);
    k.hang2 = { ...k.hang, scapElev: 3, thoracic: 3.5, head: 3 };
    k.hang2.rootY = solve(80, 160, y => build({ ...k.hang2, rootY: y }).reach, .993);
  },
}));
// straight arms: shoulders pull down and back, the body rises a few cm
const scapular_pull = hang(() => ({
  name: 'Scapular pull', trail: ['sternum'], still: .3,
  muscles: { primary: ['lats', 'traps'], secondary: ['upper_back', 'forearms'] },
  timeline: repUp('hang', 'set', { p0: .5, con: .9, p1: .6, ecc: 1.4 }),
  prep({ build }) {
    const k = this.keys;
    k.set = { ...k.hang, scapElev: -2.2, scapProt: -9, thoracic: -5, head: -2, pitch: -2 };
    for (const n of ['hang', 'set']) k[n].rootY = solve(80, 170, y => build({ ...k[n], rootY: y }).reach, .993);
  },
}));
// chin over the bar, a slow 4 s lowering, then the loop cuts back to the top (you'd jump or step up)
const negative_pull_up = hang(() => ({
  name: 'Negative pull-up', cut: true, still: .3,
  muscles: { primary: ['lats', 'biceps'], secondary: ['upper_back', 'rear_delts', 'forearms'] },
  timeline: [
    { hold: 'top', dur: .7, b: .1 },
    { from: 'top', via: ['mid'], to: 'hang', at: [0, .5, 1], dur: 4.2, r1: .15, r2: .35, breath: 'in' },
    { hold: 'hang', dur: .8, b: .9 },
  ],
}));
// a band looped over the bar, the right foot standing in it (knee bent)
const band_assisted_pull_up = hang(c => ({
  name: 'Band-assisted pull-up',
  muscles: { primary: ['lats', 'biceps'], secondary: ['upper_back', 'rear_delts', 'forearms'] },
  base: { hipFlex: 8, knee: 16, ankle: 30, kneeL: 22, hipFlexL: 12, hipFlexR: 16, kneeR: 92, ankleR: 8, fingers: 200 },
  props: [-3, 3].map(z => ({ t: 'band', a: [0, BAR_Y - 1.6, z], b: S => z < 0 ? S.pt.heelR : S.pt.ballR, bias: 3 })),
}));
// wide grip; pull towards one hand while the other arm straightens along the bar. Sides alternate.
const archer_pull_up = hang(c => ({
  name: 'Archer pull-up', gz: 46, swap: true, still: .1, trail: ['chin'], cam: { az: 68, el: 7 },
  muscles: { primary: ['lats', 'biceps'], secondary: ['upper_back', 'rear_delts', 'forearms'] },
  bar: { y: BAR_Y, w: 64, posts: 'down' },
  prep({ build }) {
    const k = c.keys;
    hangHeights(c, build);
    // top: chin at the bar beside the right hand, left arm straight (98.5%)
    const t = k.top = { ...k.top, rootZ: 18, roll: 5, scapElevL: 1.5, scapProtL: 2 };
    for (let i = 0; i < 3; i++) {
      t.rootY = solve(120, 200, y => build({ ...t, rootY: y }).pt.chin[1], BAR_Y);
      t.rootZ = solve(0, 40, z => dist(build({ ...t, rootZ: z }).pt.glenoidL, [0, BAR_Y, -c.gz]), 6.6 + .985 * 55);
    }
    k.mid = { ...k.mid, rootZ: t.rootZ * .55, rootY: k.hang.rootY + (t.rootY - k.hang.rootY) * .6 };
  },
}));

// ---------------------------------------------------------------------------------------------------------------
// rows
// ---------------------------------------------------------------------------------------------------------------
const ROWM = { primary: ['upper_back', 'lats'], secondary: ['biceps', 'rear_delts', 'forearms', 'abs'] };
const inverted_row = row(() => ({ name: 'Inverted row', bar: { x: 0, y: 100, w: 46, posts: 'down' }, muscles: ROWM }));
// under a sturdy table, gripping its edge
const TABLE_Y = 74;
const table_row = row(() => ({
  name: 'Table row', gy: TABLE_Y, cam: { az: 26, el: 10 },
  muscles: { primary: ['upper_back', 'lats'], secondary: ['biceps', 'rear_delts', 'forearms'] },
  props: [box([-100, TABLE_Y - 3, -78], [2.5, TABLE_Y + 2, 78]),
    ...[-72, 72].flatMap(z => [rod([[-94, 0, z], [-94, TABLE_Y - 3, z]], 2.2), rod([[-4, 0, z], [-4, TABLE_Y - 3, z]], 2.2)])],
}));
// rings set low and wide; row towards one ring, the other arm stays straight. Sides alternate.
const AR_Y = 95, AR_Z = 44;
const archer_row = row(c => ({
  name: 'Archer row', gy: AR_Y, gz: AR_Z, swap: true, L: 87, still: .1, floorZ: 62, cam: { az: 42, el: 14 },
  muscles: { primary: ['upper_back', 'lats'], secondary: ['biceps', 'rear_delts', 'obliques'] },
  arms: { both: { mode: 'ik', grip: 'bar', palm: s => [.2, 0, -.98 * s], pole: [-1, -.35, .75], target: (sd, s) => [0, AR_Y, AR_Z * s] } },
  props: [...frame(236, 62), ...[-1, 1].flatMap(s => [
    { t: 'ring', c: [0, AR_Y + 7, AR_Z * s], n: [0, 0, 1], r: 8.5 }, rod([[0, AR_Y + 15.5, AR_Z * s], [0, 236, AR_Z * s]], .6)])],
  prep({ settle }) {
    rowGeometry(c, settle, 12, .95);
    // top: shift towards the right ring until the left arm is straight (98.5%)
    const t = c.keys.top = { ...c.keys.top, scapProtL: 4, scapElevL: .5 };
    t.rootZ = solve(0, 40, z => dist(settle({ ...t, rootZ: z }).pt.glenoidL, [0, AR_Y, -AR_Z]), 6.6 + .95 * 55);
  },
}));
// standing, a band anchored to a post at chest height; row the handles to the ribs, shoulder blades squeeze
const band_row = (() => {
  const c = {
    name: 'Band row', cam: { az: 28, el: 6 }, floor: true, trail: ['elbowR'], still: .45,
    muscles: { primary: ['upper_back', 'lats'], secondary: ['biceps', 'rear_delts'] },
    lag: .14, headLag: .35, shift: .35, shiftRoll: .5,
    legs: { both: { mode: 'ik', foot: 'flat', toeOut: 8, ankle: (sd, s) => [0, 7.5, 12 * s], pole: s => [1, 0, .2 * s] } },
    arms: { both: { mode: 'ik', grip: 'free', pole: [-.6, -1, .4] } },
    balance: S => (S.pt.heelR[0] + S.pt.ballR[0]) / 2 - 1,
    base: { rootY: 89, pitch: 2, palm: 90, fingers: 160, wrist: 0 },
    keys: {
      out: { handX: 46, handY: -8, handZ: 12, scapProt: 8, thoracic: 1 },
      in: { handX: 4, handY: -16, handZ: 19, scapProt: -15, scapElev: -.4, thoracic: -5, pitch: 0, head: -1 },
    },
    timeline: repUp('out', 'in', { p0: .4, con: 1, p1: .5, ecc: 1.8 }),
    props: [rod([[92, 0, 0], [92, 180, 0]], 2.4), rod([[80, 1.3, 0], [104, 1.3, 0]], 1.5),
      ...['R', 'L'].map(sd => ({ t: 'band', a: [89.5, 108, 0], b: S => S.pt['palm' + sd] }))],
  };
  return c;
})();

Object.assign(CLIPS, {
  pull_up, chin_up, dead_hang, scapular_pull, negative_pull_up, band_assisted_pull_up, archer_pull_up,
  inverted_row, table_row, archer_row, band_row,
});
