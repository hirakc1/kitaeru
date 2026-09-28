// Kitaeru keyframes: one animation per exercise id.
// Pose keys are documented at the top of skeleton.js. Side view faces +x; lean 90 = prone (head +x),
// lean -90 = supine (head -x). Anchors, contacts and balance are solved by the renderer so contacts stay planted.
//
// Entry: { view, anchor, at, contact, balance, duration, hold, props: [...], frames: [{ t, pose, ...cfg overrides }] }

// ---------- helpers ----------
const LIMB = /^(sh|el|wr|hip|kn|an|foot|hand|fsArm|fsFore|fsThigh|fsShin)$/;
// B({ sh: 10 }) -> { shN: 10, shF: 10 }; keys that already end in N/F are kept as is.
const B = (...parts) => {
  const o = {};
  for (const p of parts) for (const k in p) {
    if (LIMB.test(k)) { if (!((k + 'N') in p)) o[k + 'N'] = p[k]; if (!((k + 'F') in p)) o[k + 'F'] = p[k]; }
    else o[k] = p[k];
  }
  return o;
};
const X = (base, o) => ({ ...base, ...B(o) });
const F = (t, pose, cfg = {}) => ({ t, pose, ...cfg });
// down-up rep: pause at top, lower, brief pause at bottom, rise
const rep = (top, bottom, { pause = .08, down = .46, hold = .06 } = {}) =>
  [F(0, top), F(pause, top), F(pause + down, bottom), F(Math.min(.97, pause + down + hold), bottom), F(1, top)];
const holdFrames = pose => [F(0, pose), F(1, pose)];
const there = (a, b, { wait = .1, go = .35, hold = .15 } = {}) =>
  [F(0, a), F(wait, a), F(wait + go, b), F(wait + go + hold, b), F(1, a)];

// ---------- base poses ----------
const FLAT = { footN: 90, footF: 90 };
const FFLAT = { footN: 90, footF: -90 };             // front view: feet point outward
const STAND = B(FLAT, { sh: 3, el: 8, shF: -3, elF: 10, kn: 2 });
const PLANK = B({ lean: 90, sh: 88, el: 0, hand: 90, hip: 0, kn: 0, an: 5, neck: -4 });
const HANGP = B({ sh: 176, el: 0, hand: 180, hip: 4, kn: 14, an: 25 });
// strict top: chin over the bar, elbows driven to the ribs, slight hollow with legs together just in front (~10 deg lean back)
const PULL_TOP = X(HANGP, { lean: 0, spine: 8, sh: -35, el: 150, hip: 15, kn: 10, an: 20, neck: -8 });
// in-between poses: elbows travel out to the sides (foreshortened upper arm, forearm vertical) so the body rises
// straight up instead of swinging
const PULL_MID = X(HANGP, { sh: 130, el: 52, fsArm: .4, hip: 12, kn: 8, spine: 4 });
const PULL_HIGH = X(PULL_TOP, { sh: 0, el: 175, fsArm: .45, hip: 20, spine: 6 });
const pullRep = (bottom, top, o = {}) => [F(0, bottom), F(.06, bottom), F(.24, X(PULL_MID, o)), F(.38, X(PULL_HIGH, o)), F(.52, top), F(.6, top),
  F(.74, X(PULL_HIGH, o)), F(.86, X(PULL_MID, o)), F(1, bottom)];
const QUAD = B({ lean: 90, sh: 90, el: 0, hand: 90, hip: 90, kn: 90, an: 90, neck: -8 });
const PRONE = B({ lean: 90, sh: 180, el: 0, hip: 0, kn: 0, an: 85, neck: -5 });
const SUPINE = B({ lean: -90, sh: 0, el: 0, hip: 0, kn: 0, an: 10 });
const SQUAT_BOT = X(STAND, { hip: 112, kn: 118, sh: 85, el: 8, shF: 85, elF: 8, spine: 6, neck: -12 });

// ---------- anchor configs ----------
const STANDING = { view: 'side', anchor: 'feet', balance: true };
const PLANK_CFG = { view: 'side', anchor: 'hands', contact: { pt: 'toes' } };
const BAR_Y = -235;
const HANG = { view: 'side', anchor: 'grips', at: [0, BAR_Y], balance: true, props: [{ type: 'bar', x: 0, y: BAR_Y }] };
const QUAD_CFG = { view: 'side', anchor: 'knees', contact: { pt: 'hands' } };
const BOX_H = 45;

export const ANIMS = {
  // ================= push_horizontal =================
  wall_push_up: { ...PLANK_CFG, anchor: 'hands', at: [-2, -125], contact: { pt: 'feet', dy: 125 }, duration: 2400,
    props: [{ type: 'wall', x: 0, side: 'right' }],
    frames: rep(B(FLAT, { lean: 22, sh: 112, el: 0, hand: 180 }), B(FLAT, { lean: 22, sh: 66, el: 92, fsArm: .75, hand: 180 })) },
  incline_push_up: { ...PLANK_CFG, at: [0, -BOX_H], contact: { pt: 'toes', dy: BOX_H }, duration: 2400,
    props: [{ type: 'box', x: 4, y: -BOX_H, w: 40 }],
    frames: rep(X(PLANK, { lean: 65 }), X(PLANK, { lean: 65, sh: 18, el: 100 })) },
  knee_push_up: { ...PLANK_CFG, contact: { pt: 'knees' }, duration: 2400,
    frames: rep(X(PLANK, { kn: 88, an: 35 }), X(PLANK, { kn: 88, an: 35, sh: 14, el: 96 })) },
  push_up: { ...PLANK_CFG, duration: 2400,
    frames: rep(PLANK, X(PLANK, { sh: 12, el: 96 })) },
  decline_push_up: { ...PLANK_CFG, contact: { pt: 'toes', dy: -BOX_H }, duration: 2600,
    props: [{ type: 'box', x: '@toeN', xOff: -6, y: -BOX_H, w: 40 }],
    frames: rep(X(PLANK, { lean: 110, sh: 80 }), X(PLANK, { lean: 110, sh: 18, el: 100 })) },
  diamond_push_up: { ...PLANK_CFG, duration: 2600,
    frames: rep(X(PLANK, { sh: 76 }), X(PLANK, { sh: 4, el: 112 })) },
  archer_push_up: { ...PLANK_CFG, anchor: 'palmN', contact: [{ pt: 'toes' }, { pt: 'palmF', key: 'shF' }], duration: 3000,
    frames: rep(X(PLANK, { shF: 108 }), X(PLANK, { shN: 12, elN: 108, shF: 118, elF: 0 })) },
  pseudo_planche_push_up: { ...PLANK_CFG, duration: 2800,
    frames: rep(X(PLANK, { sh: 52, hand: -90, neck: -10 }), X(PLANK, { sh: 8, el: 78, hand: -90, neck: -10 })) },

  // ================= push_vertical =================
  pike_push_up: { ...PLANK_CFG, duration: 2800,
    frames: rep(B({ lean: 130, sh: 168, el: 0, hand: 90, hip: 92, kn: 0, an: 0, neck: 8 }),
      B({ lean: 130, sh: 128, el: 100, hand: 90, hip: 88, kn: 0, an: 0, neck: 0 })) },
  elevated_pike_push_up: { ...PLANK_CFG, contact: { pt: 'toes', dy: -BOX_H }, duration: 3000,
    props: [{ type: 'box', x: '@toeN', xOff: -4, y: -BOX_H, w: 40 }],
    frames: rep(B({ lean: 160, sh: 172, el: 0, hand: 90, hip: 88, kn: 0, an: 10, neck: 8 }),
      B({ lean: 160, sh: 132, el: 100, hand: 90, hip: 84, kn: 0, an: 10 })) },
  wall_handstand_push_up: { view: 'side', anchor: 'hands', balance: true, duration: 3400,
    props: [{ type: 'wall', x: '@sacrum', xOff: 6, side: 'right' }],
    frames: rep(B({ lean: 180, sh: 172, el: 0, hand: -90, hip: -4, kn: 0, an: 20, neck: -12 }),
      B({ lean: 180, sh: 140, el: 100, hand: -90, hip: -2, kn: 0, an: 20, neck: -20 })) },

  // ================= dip =================
  bench_dip: { view: 'side', anchor: 'hands', at: [0, -BOX_H], contact: { pt: 'heels', dy: BOX_H }, duration: 2600,
    props: [{ type: 'box', x: '@palmN', xOff: -14, y: -BOX_H, w: 36 }],
    frames: rep(B({ lean: -4, sh: -30, el: 0, hand: 90, hip: 82, kn: 8, foot: 150 }),
      B({ lean: 0, sh: -78, el: 92, hand: 90, hip: 88, kn: 8, foot: 150 })) },
  bar_dip: { view: 'side', anchor: 'hands', at: [0, -125], duration: 2600,
    props: [{ type: 'dip', x: 2, y: -125, w: 50 }],
    frames: rep(B({ lean: 6, sh: -6, el: 0, hand: 90, hip: -12, kn: 80, an: 25 }),
      B({ lean: 28, sh: -72, el: 96, hand: 90, hip: 2, kn: 86, an: 25 })) },
  ring_dip: { view: 'side', anchor: 'grips', at: [0, -125], duration: 2800,
    props: [{ type: 'rings', x: 0, y: -125 }],
    frames: rep(B({ lean: 4, sh: -4, el: 0, hand: 90, hip: -10, kn: 70, an: 25 }),
      B({ lean: 24, sh: -74, el: 98, hand: 90, hip: 0, kn: 78, an: 25 })) },

  // ================= pull_vertical =================
  dead_hang: { ...HANG, duration: 4200,
    frames: [F(0, HANGP), F(.45, X(HANGP, { sh: 170, spine: -4, neck: -3 })), F(.6, X(HANGP, { sh: 170, spine: -4, neck: -3 })), F(1, HANGP)] },
  scapular_pull: { ...HANG, duration: 2400,
    frames: rep(X(HANGP, { sh: 179 }), X(HANGP, { sh: 164, spine: -9, neck: -4 }), { down: .35, hold: .15 }) },
  negative_pull_up: { ...HANG, duration: 5600,
    frames: [F(0, PULL_TOP), F(.1, PULL_TOP), F(.34, PULL_HIGH), F(.6, PULL_MID), F(.8, HANGP), F(.86, HANGP), F(.92, PULL_MID), F(.96, PULL_HIGH), F(1, PULL_TOP)] },
  band_assisted_pull_up: { ...HANG, duration: 3000,
    props: [{ type: 'bar', x: 0, y: BAR_Y }, { type: 'band', from: [-1, BAR_Y], to: 'ballN', sag: 0 }, { type: 'band', from: [1, BAR_Y], to: 'ballF', sag: 0 }],
    frames: pullRep(X(HANGP, { hip: 10, kn: 6, an: 10 }), X(PULL_TOP, { an: 10 }), { an: 10 }) },
  chin_up: { ...HANG, duration: 2800, frames: pullRep(HANGP, X(PULL_TOP, { sh: -30, el: 154 })) },
  pull_up: { ...HANG, duration: 2800, frames: pullRep(HANGP, PULL_TOP) },
  archer_pull_up: { view: 'front', anchor: 'gripN', at: [36, BAR_Y], contact: { pt: 'gripF', dy: 0, key: 'shF', dx: '@0', keyX: 'elF' }, duration: 3200,
    props: [{ type: 'bar', x: 0, y: BAR_Y }],
    frames: rep(B({ sh: 164, el: 0, hand: 180, handF: 180, hip: 3, kn: 8, footF: -90 }),
      B({ lean: 8, shN: 40, elN: 140, shF: 100, elF: 0, handN: 180, handF: 180, hip: 3, kn: 8, footF: -90 })) },

  // ================= pull_horizontal =================
  band_row: { view: 'side', anchor: 'hip', contact: { pt: 'heels' }, duration: 2400,
    props: [{ type: 'band', from: 'toeN', to: 'gripN', sag: 3 }],
    frames: rep(B({ lean: 6, sh: 88, el: 0, hand: 90, hip: 88, kn: 6, an: 0 }),
      B({ lean: -6, sh: -28, el: 118, hand: 90, hip: 94, kn: 6, an: 0, neck: 4 }), { pause: .06, down: .3, hold: .14 }) },
  table_row: { view: 'side', anchor: 'grips', at: [0, -80], contact: { pt: 'heels', dy: 80 }, duration: 2600,
    props: [{ type: 'table', x: 5, y: -77, w: 90, side: 'left' }],
    frames: rep(B({ lean: -80, sh: 100, el: 0, hand: 180, foot: 170 }), B({ lean: -80, sh: -48, el: 132, hand: 180, foot: 170, neck: 8 }),
      { pause: .06, down: .32, hold: .12 }) },
  inverted_row: { view: 'side', anchor: 'grips', at: [0, -105], contact: { pt: 'heels', dy: 105 }, duration: 2600,
    props: [{ type: 'bar', x: 0, y: -105 }],
    frames: rep(B({ lean: -75, sh: 105, el: 0, hand: 180, foot: 165 }), B({ lean: -75, sh: -45, el: 130, hand: 180, foot: 165, neck: 8 }),
      { pause: .06, down: .32, hold: .12 }) },
  archer_row: { view: 'side', anchor: 'gripN', at: [0, -105], contact: [{ pt: 'heels', dy: 105 }, { pt: 'gripF', key: 'shF' }], duration: 3000,
    props: [{ type: 'bar', x: 0, y: -105 }],
    frames: rep(B({ lean: -75, sh: 105, el: 0, hand: 180, foot: 165 }), B({ lean: -75, shN: -45, elN: 130, shF: 120, elF: 0, fsArmF: .5, fsForeF: .5, hand: 180, foot: 165, neck: 8 }),
      { pause: .06, down: .34, hold: .12 }) },

  // ================= pull_noequip =================
  prone_ytw: { view: 'side', anchor: 'hip', duration: 4800,
    frames: [F(0, X(PRONE, { sh: 182 })), F(.1, X(PRONE, { sh: 192, spine: -6, neck: -10 })), F(.25, X(PRONE, { sh: 192, spine: -6, neck: -10 })),
      F(.4, X(PRONE, { sh: 268, fsArm: .38, fsFore: .38, spine: -7, neck: -10 })), F(.55, X(PRONE, { sh: 268, fsArm: .38, fsFore: .38, spine: -7, neck: -10 })),
      F(.7, X(PRONE, { sh: 300, el: 85, fsArm: .6, fsFore: .7, spine: -7, neck: -10 })), F(.85, X(PRONE, { sh: 300, el: 85, fsArm: .6, fsFore: .7, spine: -7, neck: -10 })),
      F(1, X(PRONE, { sh: 182 }))] },
  superman_pull: { view: 'side', anchor: 'hip', duration: 2800,
    frames: rep(X(PRONE, { sh: 192, spine: -10, hip: -8, neck: -10 }), X(PRONE, { sh: 300, el: 100, fsArm: .7, spine: -16, hip: -10, neck: -12 }),
      { pause: .1, down: .3, hold: .15 }) },

  // ================= squat =================
  box_squat: { ...STANDING, duration: 3000,
    props: [{ type: 'box', x: '@hip', xOff: -8, y: '@hip', t: .55, w: 36 }],
    frames: rep(STAND, X(STAND, { hip: 98, kn: 96, sh: 80, shF: 80, el: 5, elF: 5, spine: 4, neck: -8 }), { down: .44, hold: .1 }) },
  bodyweight_squat: { ...STANDING, duration: 2600, frames: rep(STAND, SQUAT_BOT) },
  split_squat: { view: 'side', anchor: 'midN', balance: true, balanceDx: -14,
    contact: { pt: 'ballF', key: 'hipF', dx: '@0', keyX: 'knF' }, duration: 2800,
    frames: rep(B({ footN: 90, footF: 42, hipN: 24, knN: 6, hipF: -20, knF: 12, sh: 4, el: 10 }),
      B({ footN: 90, footF: 32, hipN: 84, knN: 94, hipF: -4, knF: 100, sh: 4, el: 10 })) },
  reverse_lunge: { view: 'side', anchor: 'midN', balance: true, duration: 3200,
    frames: [F(0, STAND, { balanceDx: 0 }), F(.08, STAND, { balanceDx: 0 }),
      F(.25, X(STAND, { hipN: 20, knN: 20, hipF: -20, knF: 60, footF: null, anF: 20 }), { balanceDx: -4 }),
      F(.5, B({ footN: 90, footF: 32, hipN: 86, knN: 94, hipF: -6, knF: 100, sh: 4, el: 10 }), { balanceDx: -14, contact: { pt: 'ballF', key: 'hipF' } }),
      F(.58, B({ footN: 90, footF: 32, hipN: 86, knN: 94, hipF: -6, knF: 100, sh: 4, el: 10 }), { balanceDx: -14, contact: { pt: 'ballF', key: 'hipF' } }),
      F(.8, X(STAND, { hipN: 20, knN: 20, hipF: -20, knF: 60, footF: null, anF: 20 }), { balanceDx: -4 }),
      F(1, STAND, { balanceDx: 0 })] },
  bulgarian_split_squat: { view: 'side', anchor: 'midN', balance: true, balanceDx: -8,
    contact: { pt: 'toeF', dy: -BOX_H, key: 'hipF', dx: '@0', keyX: 'knF' }, duration: 3000,
    props: [{ type: 'box', x: '@toeF', xOff: 4, y: -BOX_H, w: 34 }],
    frames: rep(B({ footN: 90, footF: -70, hipN: 22, knN: 8, hipF: -30, knF: 70, sh: 4, el: 10 }),
      B({ footN: 90, footF: -70, hipN: 92, knN: 96, hipF: -10, knF: 110, sh: 4, el: 10 })) },
  cossack_squat: { view: 'front', anchor: 'midN',
    contact: { pt: 'heelF', key: 'hipF', dx: '@0', keyX: 'rot' }, duration: 3400,
    frames: rep(B({ hipN: 26, knN: 0, hipF: 26, knF: 0, footN: 90, footF: -90, sh: 25, el: -115, fsArm: .6, fsFore: .8 }),
      B({ hipN: 76, knN: 118, hipF: 60, knF: 0, footN: 90, footF: -150, sh: 25, el: -115, fsArm: .6, fsFore: .8, lean: 6 })) },
  shrimp_squat: { view: 'side', anchor: 'midN', balance: true, duration: 3200,
    frames: rep(B(STAND, { hipF: -8, knF: 105, footF: null, anF: 40, sh: 80, el: 5, footN: 90 }),
      B(STAND, { hipN: 102, knN: 118, hipF: -18, knF: 118, footF: null, anF: 40, sh: 95, el: 5, spine: 12, neck: -10, footN: 90 })) },
  pistol_squat: { view: 'side', anchor: 'midN', balance: true, duration: 3600,
    frames: rep(B(STAND, { hipF: 35, knF: 4, footF: null, anF: 10, sh: 80, el: 5, footN: 90 }),
      B(STAND, { hipN: 128, knN: 140, hipF: 100, knF: 2, footF: null, anF: 10, sh: 92, el: 5, spine: 16, neck: -12, footN: 90 })) },

  // ================= hinge =================
  glute_bridge: { view: 'side', anchor: 'upperBack', duration: 2600,
    contact: [{ pt: 'heelN', key: 'knN', dx: '@0', keyX: 'hipN' }, { pt: 'heelF', key: 'knF', dx: '@0', keyX: 'hipF' }],
    frames: rep(B({ lean: -90, hip: 62, kn: 100, foot: 90, sh: 0, hand: 90 }), B({ lean: -118, hip: 2, kn: 90, foot: 90, sh: -28, hand: 90 }),
      { pause: .06, down: .34, hold: .16 }) },
  single_leg_glute_bridge: { view: 'side', anchor: 'upperBack', duration: 2800,
    contact: [{ pt: 'heelN', key: 'knN', dx: '@0', keyX: 'hipN' }],
    frames: rep(B({ lean: -90, hipN: 62, knN: 100, footN: 90, hipF: 75, knF: 5, anF: 10, sh: 0, hand: 90 }),
      B({ lean: -116, hipN: 2, knN: 90, footN: 90, hipF: 22, knF: 5, anF: 10, sh: -26, hand: 90 }), { pause: .06, down: .34, hold: .16 }) },
  hip_thrust: { view: 'side', anchor: 'upperBack', at: [0, -40], duration: 2800,
    contact: [{ pt: 'heelN', dy: 40, key: 'knN', dx: '@0', keyX: 'hipN' }, { pt: 'heelF', dy: 40, key: 'knF', dx: '@0', keyX: 'hipF' }],
    props: [{ type: 'box', x: -14, y: -40, w: 34 }],
    frames: rep(B({ lean: -58, hip: 60, kn: 100, foot: 90, sh: 165, el: 0, fsArm: .4, fsFore: .5 }), B({ lean: -92, hip: 0, kn: 90, foot: 90, sh: 165, el: 0, fsArm: .4, fsFore: .5, neck: 12 }),
      { pause: .06, down: .34, hold: .16 }) },
  single_leg_rdl: { view: 'side', anchor: 'midN', balance: true, duration: 3400,
    frames: rep(B(STAND, { footF: null, anF: 5 }), B({ footN: 90, hipN: 84, knN: 16, hipF: -4, knF: 4, anF: 5, sh: 84, el: 4, neck: -6 })) },
  nordic_curl_negative: { view: 'side', anchor: 'knees', contact: { pt: 'toes' }, duration: 5600,
    frames: [F(0, B({ hip: 0, kn: 92, an: 0, sh: 15, el: 135, fsArm: .7, fsFore: .6 })), F(.1, B({ hip: 0, kn: 92, an: 0, sh: 15, el: 135, fsArm: .7, fsFore: .6 })),
      F(.66, B({ hip: 0, kn: 30, an: 0, sh: 60, el: 70, neck: -6 })), F(.76, B({ hip: 5, kn: 14, an: 0, sh: 88, el: 30, hand: 90, neck: -8 })),
      F(.84, B({ hip: 5, kn: 14, an: 0, sh: 88, el: 30, hand: 90, neck: -8 })), F(1, B({ hip: 0, kn: 92, an: 0, sh: 15, el: 135, fsArm: .7, fsFore: .6 }))] },

  // ================= calves =================
  calf_raise: { view: 'side', anchor: 'balls', balance: true, duration: 2000,
    frames: rep(STAND, B(STAND, { foot: 56 }), { pause: .08, down: .32, hold: .15 }) },
  single_leg_calf_raise: { view: 'side', anchor: 'ballN', balance: true, duration: 2200,
    frames: rep(B(STAND, { footN: 90, footF: null, hipF: 12, knF: 75, anF: 20 }), B(STAND, { footN: 54, footF: null, hipF: 12, knF: 75, anF: 20 }),
      { pause: .08, down: .32, hold: .15 }) },
};

const TABLETOP = B({ lean: -90, sh: 90, el: 0, hip: 90, kn: 90, an: 10 });
const BEAR = B({ lean: 80, sh: 82, el: 0, hand: 90, hip: 95, kn: 95, an: 0, neck: -10 });
const JJ_CLOSED = B({ sh: 8, el: 6, hip: 2, kn: 2, footN: 90, footF: -90 });
const JJ_OPEN = B({ sh: 165, el: 8, hip: 17, kn: 2, footN: 90, footF: -90 });
const JJ_AIR = B({ sh: 90, el: 8, hip: 9, kn: 6, an: 30, air: 14 });
const SQ_HANDS = B(FLAT, { hip: 132, kn: 132, sh: 70, el: 0, hand: 90, spine: 28, neck: -16 });
const SQ_HANDS_CFG = { anchor: 'feet', at: [0, 0], balance: true, balanceDx: 12, contact: { pt: 'hands', key: 'shN,shF' } };
const CROW = B({ lean: 70, spine: 26, neck: -28, sh: 38, el: 62, hand: 90, hip: 138, kn: 148, an: 45 });
const HS = B({ lean: 180, sh: 172, el: 0, hand: -90, hip: -4, kn: 0, an: 20, neck: -12 });
const LUNGE_WGS = B({ lean: 58, spine: 10, neck: -10, footN: 90, footF: 40, hipN: 112, knN: 84, hipF: -18, knF: 14, sh: 64, el: 0, hand: 90 });

Object.assign(ANIMS, {
  // ================= core_anterior =================
  dead_bug: { view: 'side', anchor: 'hip', duration: 4400,
    frames: [F(0, TABLETOP), F(.1, TABLETOP), F(.35, X(TABLETOP, { shN: 172, hipF: 18, knF: 0 })), F(.42, X(TABLETOP, { shN: 172, hipF: 18, knF: 0 })),
      F(.6, TABLETOP), F(.85, X(TABLETOP, { shF: 172, hipN: 18, knN: 0 })), F(.92, X(TABLETOP, { shF: 172, hipN: 18, knN: 0 })), F(1, TABLETOP)] },
  plank: { view: 'side', anchor: 'elbows', contact: { pt: 'toes' }, hold: true, duration: 4000,
    frames: holdFrames(X(PLANK, { sh: 90, el: 90 })) },
  hollow_body_hold: { view: 'side', anchor: 'hip', hold: true, duration: 4000,
    frames: holdFrames(B({ lean: -90, spine: 22, neck: 16, sh: 160, el: 0, hip: 26, kn: 0, an: 25 })) },
  lying_leg_raise: { view: 'side', anchor: 'hip', duration: 3000,
    frames: rep(X(SUPINE, { hip: 8, hand: 90 }), X(SUPINE, { hip: 90, hand: 90 }), { pause: .08, down: .4, hold: .1 }) },
  hanging_knee_raise: { ...HANG, duration: 2600,
    frames: rep(HANGP, X(HANGP, { hip: 105, kn: 110, spine: 8, neck: 4 }), { pause: .1, down: .36, hold: .12 }) },
  hanging_leg_raise: { ...HANG, duration: 3000,
    frames: rep(HANGP, X(HANGP, { hip: 96, kn: 2, an: 20, spine: 12, neck: 4 }), { pause: .1, down: .38, hold: .12 }) },
  l_sit: { view: 'side', anchor: 'hands', at: [0, -14], balance: true, hold: true, duration: 4000,
    props: [{ type: 'parallettes', x: 1, h: 14 }],
    frames: holdFrames(B({ sh: 10, el: 0, hand: 90, hip: 92, kn: 0, an: 25, spine: 12, neck: 6 })) },

  // ================= core_lateral =================
  side_plank: { view: 'front', anchor: 'elbowN', contact: { pt: 'ankleN' }, hold: true, duration: 4000,
    frames: holdFrames(B({ lean: 70, shN: 70, elN: 0, fsForeN: .25, shF: 110, elF: 0, hip: 0, kn: 0, an: 0 })) },
  side_plank_hip_dip: { view: 'front', anchor: 'elbowN', contact: { pt: 'ankleN' }, duration: 2600,
    frames: rep(B({ lean: 70, shN: 70, elN: 0, fsForeN: .25, shF: 4, elF: 0, hip: 0, kn: 0 }),
      B({ lean: 58, spine: -14, shN: 72, elN: 0, fsForeN: .25, shF: 4, elF: 0, hip: -14, kn: 0 }), { pause: .08, down: .38, hold: .08 }) },

  // ================= core_posterior =================
  bird_dog: { view: 'side', anchor: 'kneeN', contact: { pt: 'palmF' }, duration: 3200,
    frames: rep(QUAD, X(QUAD, { shN: 178, hipF: 0, knF: 2, anF: 50 }), { pause: .1, down: .32, hold: .2 }) },
  superman: { view: 'side', anchor: 'hip', duration: 3000,
    frames: rep(X(PRONE, { sh: 180 }), X(PRONE, { sh: 196, spine: -16, hip: -14, neck: -10 }), { pause: .08, down: .3, hold: .24 }) },

  // ================= conditioning =================
  marching_in_place: { view: 'side', anchor: 'midF', balance: true, duration: 1400,
    frames: [F(0, X(STAND, { hipN: 78, knN: 88, footN: null, anN: 15, shN: -28, elN: 80, shF: 30, elF: 80 })),
      F(.25, X(STAND, { sh: 0, el: 60 })),
      F(.5, X(STAND, { hipF: 78, knF: 88, footF: null, anF: 15, shF: -28, elF: 80, shN: 30, elN: 80 }), { anchor: 'midN' }),
      F(.75, X(STAND, { sh: 0, el: 60 }), { anchor: 'midN' }),
      F(1, X(STAND, { hipN: 78, knN: 88, footN: null, anN: 15, shN: -28, elN: 80, shF: 30, elF: 80 }))] },
  jumping_jack: { view: 'front', anchor: 'feet', duration: 1300,
    frames: [F(0, JJ_CLOSED), F(.2, JJ_AIR), F(.4, JJ_OPEN), F(.55, JJ_OPEN), F(.75, JJ_AIR), F(.92, JJ_CLOSED), F(1, JJ_CLOSED)] },
  mountain_climber: { view: 'side', anchor: 'hands', contact: { pt: 'toeF' }, duration: 900,
    frames: [F(0, X(PLANK, { hipN: 100, knN: 115, anN: 20 })), F(.5, X(PLANK, { hipF: 100, knF: 115, anF: 20 }), { contact: { pt: 'toeN' } }),
      F(1, X(PLANK, { hipN: 100, knN: 115, anN: 20 }))] },
  bear_crawl: { view: 'side', anchor: 'palmF', contact: { pt: 'toeN' }, duration: 1800,
    frames: [F(0, BEAR), F(.25, X(BEAR, { shN: 100, elN: 25, hipF: 118, knF: 118, anF: 20 })), F(.5, BEAR),
      F(.75, X(BEAR, { shF: 100, elF: 25, hipN: 118, knN: 118, anN: 20 }), { anchor: 'palmN', contact: { pt: 'toeF' } }),
      F(.97, BEAR, { anchor: 'palmN', contact: { pt: 'toeF' } }), F(1, BEAR)] },
  high_knees: { view: 'side', anchor: 'midF', balance: true, duration: 800,
    frames: [F(0, X(STAND, { hipN: 95, knN: 100, footN: null, anN: 20, shN: -35, elN: 85, shF: 45, elF: 85, air: 3 })),
      F(.25, X(STAND, { sh: 5, el: 80, footF: null, anF: 20 })),
      F(.5, X(STAND, { hipF: 95, knF: 100, footF: null, anF: 20, shF: -35, elF: 85, shN: 45, elN: 85, air: 3 }), { anchor: 'midN' }),
      F(.75, X(STAND, { sh: 5, el: 80, footN: null, anN: 20 }), { anchor: 'midN' }),
      F(1, X(STAND, { hipN: 95, knN: 100, footN: null, anN: 20, shN: -35, elN: 85, shF: 45, elF: 85, air: 3 }))] },
  squat_jump: { ...STANDING, duration: 2000,
    frames: [F(0, STAND), F(.28, X(SQUAT_BOT, { sh: -30, shF: -30, el: 10, elF: 10 })), F(.42, B({ hip: 0, kn: 0, an: 40, sh: 120, el: 5, air: 4 })),
      F(.52, B({ hip: 4, kn: 6, an: 35, sh: 165, el: 5, air: 30 })), F(.64, B({ hip: 8, kn: 8, an: 25, sh: 120, el: 5, air: 0 })),
      F(.8, X(SQUAT_BOT, { hip: 95, kn: 100, hipF: 95, knF: 100, sh: 60, shF: 60 })), F(1, STAND)] },
  burpee: { ...STANDING, duration: 4200,
    frames: [F(0, STAND), F(.14, SQ_HANDS, SQ_HANDS_CFG),
      F(.28, PLANK, { anchor: 'hands', balance: false, contact: { pt: 'toes' } }), F(.4, X(PLANK, { sh: 12, el: 96 }), { anchor: 'hands', balance: false, contact: { pt: 'toes' } }),
      F(.52, PLANK, { anchor: 'hands', balance: false, contact: { pt: 'toes' } }), F(.64, SQ_HANDS, SQ_HANDS_CFG),
      F(.76, STAND, { at: [0, 0] }), F(.86, B({ hip: 4, kn: 6, an: 35, sh: 170, el: 5, air: 22 }), { at: [0, 0] }), F(1, STAND)] },

  // ================= skill_balance =================
  crow_pose: { view: 'side', anchor: 'hands', contact: { pt: 'balls' }, duration: 4200,
    frames: [F(0, B({ lean: 70, spine: 24, neck: -20, sh: 30, el: 45, hand: 90, hip: 128, kn: 140, an: 10 })),
      F(.3, CROW, { contact: null, balance: true }), F(.75, CROW, { contact: null, balance: true }),
      F(1, B({ lean: 70, spine: 24, neck: -20, sh: 30, el: 45, hand: 90, hip: 128, kn: 140, an: 10 }))] },
  wall_handstand: { view: 'side', anchor: 'hands', balance: true, hold: true, duration: 4000,
    props: [{ type: 'wall', x: '@sacrum', xOff: 6, side: 'right' }], frames: holdFrames(HS) },
  freestanding_handstand: { view: 'side', anchor: 'hands', balance: true, duration: 3000,
    frames: [F(0, X(HS, { hip: 0, an: 25 })), F(.33, X(HS, { sh: 168, hip: -8, an: 30 })), F(.66, X(HS, { sh: 176, hip: 4, an: 20 })), F(1, X(HS, { hip: 0, an: 25 }))] },

  // ================= mobility =================
  cat_cow: { ...QUAD_CFG, duration: 4400,
    frames: [F(0, QUAD), F(.22, X(QUAD, { spine: -24, hip: 78, neck: -30 })), F(.38, X(QUAD, { spine: -24, hip: 78, neck: -30 })),
      F(.7, X(QUAD, { spine: 30, hip: 102, neck: 30 })), F(.86, X(QUAD, { spine: 30, hip: 102, neck: 30 })), F(1, QUAD)] },
  worlds_greatest_stretch: { view: 'side', anchor: 'midN', duration: 7000,
    contact: [{ pt: 'ballF', key: 'hipF', dx: '@0', keyX: 'knF' }, { pt: 'hands', key: 'shN,shF' }],
    frames: [F(0, LUNGE_WGS), F(.1, LUNGE_WGS),
      F(.25, X(LUNGE_WGS, { shN: 20, elN: 110, handN: null }), { contact: [{ pt: 'ballF', key: 'hipF', dx: '@0', keyX: 'knF' }, { pt: 'palmF', key: 'shF' }] }),
      F(.33, X(LUNGE_WGS, { shN: 20, elN: 110, handN: null }), { contact: [{ pt: 'ballF', key: 'hipF', dx: '@0', keyX: 'knF' }, { pt: 'palmF', key: 'shF' }] }),
      F(.5, X(LUNGE_WGS, { shN: 238, elN: 0, handN: null, neck: -40, spine: 4 }), { contact: [{ pt: 'ballF', key: 'hipF', dx: '@0', keyX: 'knF' }, { pt: 'palmF', key: 'shF' }] }),
      F(.6, X(LUNGE_WGS, { shN: 238, elN: 0, handN: null, neck: -40, spine: 4 }), { contact: [{ pt: 'ballF', key: 'hipF', dx: '@0', keyX: 'knF' }, { pt: 'palmF', key: 'shF' }] }),
      F(.72, LUNGE_WGS),
      F(.84, X(LUNGE_WGS, { lean: 60, hipN: 92, knN: 4, footN: 120, spine: 16, neck: -4 }), { anchor: 'heelN' }),
      F(.93, X(LUNGE_WGS, { lean: 60, hipN: 92, knN: 4, footN: 120, spine: 16, neck: -4 }), { anchor: 'heelN' }),
      F(1, LUNGE_WGS)] },
  deep_squat_hold: { ...STANDING, hold: true, duration: 4000,
    frames: holdFrames(X(SQUAT_BOT, { hip: 124, kn: 140, hipF: 124, knF: 140, sh: 32, shF: 32, el: 105, elF: 105, spine: 10, neck: -6 })) },
  hip_flexor_stretch: { view: 'side', anchor: 'kneeF', duration: 4400,
    contact: [{ pt: 'toeF', key: 'knF' }, { pt: 'midN', key: 'knN', dx: '@0', keyX: 'hipN' }],
    frames: there(B({ hipF: -8, knF: 85, anF: 85, hipN: 88, knN: 88, footN: 90, sh: 4, el: 12 }),
      B({ hipF: -30, knF: 85, anF: 85, hipN: 70, knN: 75, footN: 90, shN: 4, elN: 12, shF: 172, elF: 5, spine: -6 }), { wait: .1, go: .3, hold: .3 }) },
  standing_hamstring_stretch: { view: 'side', anchor: 'midF', balance: true, balanceDx: 4, duration: 4400,
    contact: { pt: 'heelN', key: 'hipN' },
    frames: there(B({ footF: 90, hipF: 0, knF: 6, hipN: 28, knN: 0, anN: -25, sh: 8, el: 70, fsArm: .8 }),
      B({ footF: 90, hipF: 62, knF: 14, hipN: 88, knN: 0, anN: -25, sh: 72, el: 5, spine: 12, neck: -4 }), { wait: .1, go: .3, hold: .3 }) },
  pigeon_stretch: { view: 'side', anchor: 'hip', at: [0, -2], duration: 5000,
    contact: [{ pt: 'kneeF', key: 'hipF' }, { pt: 'kneeN', key: 'hipN' }, { pt: 'hands', key: 'shN,shF' }],
    frames: there(B({ lean: 6, hipN: 55, knN: 100, fsShinN: .4, anN: 20, hipF: -12, knF: 0, anF: 85, sh: 20, el: 0, hand: 90 }),
      B({ lean: 62, spine: 18, neck: 10, hipN: 110, knN: 100, fsShinN: .4, anN: 20, hipF: -12, knF: 0, anF: 85, sh: 150, el: 0, hand: 90 }), { wait: .1, go: .3, hold: .3 }) },
  childs_pose: { view: 'side', anchor: 'knees', contact: [{ pt: 'toes' }, { pt: 'hands', key: 'shN,shF' }], hold: true, duration: 4000,
    frames: holdFrames(B({ kn: 152, hip: 140, an: 88, lean: 0, spine: 24, neck: 20, sh: 165, el: 0, hand: 90 })) },
  cobra_stretch: { view: 'side', anchor: 'hip', duration: 4400,
    contact: { pt: 'hands', key: 'elN,elF', dx: '@0', keyX: 'shN,shF' },
    frames: there(B({ lean: 90, hip: 0, kn: 0, an: 85, sh: -30, el: 140, hand: 90, neck: -4 }),
      B({ lean: 90, hip: -6, kn: 0, an: 85, sh: 0, el: 40, hand: 90, spine: -44, neck: -18 }), { wait: .1, go: .32, hold: .3 }) },
  calf_stretch: { view: 'side', anchor: 'midF', duration: 4400,
    contact: [{ pt: 'midN', key: 'knN', dx: '@0', keyX: 'hipN' }, { pt: 'palmN', dy: null, dx: '@0', keyX: 'elN,elF' }],
    props: [{ type: 'wall', x: '@fingerN', xOff: 1, side: 'right' }],
    frames: there(B({ lean: 26, footN: 90, footF: 90, hipF: -2, knF: 0, hipN: 60, knN: 60, sh: 92, el: 20, hand: 180 }),
      B({ lean: 34, footN: 90, footF: 90, hipF: -2, knF: 0, hipN: 72, knN: 78, sh: 92, el: 40, hand: 180 }), { wait: .1, go: .32, hold: .3 }) },
  shoulder_dislocate: { view: 'front', anchor: 'feet', duration: 3600,
    props: [{ type: 'band', from: 'gripF', to: 'gripN', sag: 2 }],
    frames: [F(0, B(FFLAT, { sh: 32, el: 0, hand: null, hip: 5 })), F(.25, B(FFLAT, { sh: 170, el: 0, hip: 5 })),
      F(.5, B(FFLAT, { sh: 38, el: 0, fsArm: .88, fsFore: .88, hip: 5, neck: -6 })), F(.75, B(FFLAT, { sh: 170, el: 0, hip: 5 })), F(1, B(FFLAT, { sh: 32, el: 0, hip: 5 }))] },
  thoracic_opener: { ...QUAD_CFG, contact: { pt: 'palmF' }, duration: 4400,
    frames: [F(0, QUAD), F(.1, QUAD), F(.2, X(QUAD, { shN: 60, elN: 70, handN: null })),
      F(.45, X(QUAD, { shN: 268, elN: 0, handN: null, neck: -40, spine: -6 })), F(.65, X(QUAD, { shN: 268, elN: 0, handN: null, neck: -40, spine: -6 })),
      F(.85, X(QUAD, { shN: 60, elN: 70, handN: null })), F(1, QUAD)] },
  wrist_prep: { view: 'side', anchor: 'hands', contact: { pt: 'knees' }, duration: 3000,
    frames: [F(0, QUAD), F(.3, X(QUAD, { sh: 112, hip: 70 })), F(.4, X(QUAD, { sh: 112, hip: 70 })), F(.75, X(QUAD, { sh: 72, hip: 112 })), F(.85, X(QUAD, { sh: 72, hip: 112 })), F(1, QUAD)] },
  pancake_stretch: { view: 'front', anchor: 'hip', duration: 5000,
    frames: there(B({ hip: 72, kn: 0, foot: 180, sh: 12, el: 20, fsArm: .8 }),
      B({ hip: 74, kn: 0, foot: 180, fsTorso: .55, neck: 30, sh: 14, el: 0, fsArm: .45, fsFore: .5 }), { wait: .1, go: .3, hold: .3 }) },
  doorway_chest_stretch: { view: 'side', anchor: 'midF', duration: 4400,
    contact: [{ pt: 'midN', key: 'hipN', dx: '@0', keyX: 'knN' }, { pt: 'elbowN', dy: null, dx: '@0', keyX: 'shN,shF' }],
    props: [{ type: 'post', x: '@elbowN', xOff: -1 }],
    frames: there(B({ footN: 90, footF: 90, hipN: 22, knN: 10, hipF: -8, knF: 2, sh: 70, fsArm: .3, el: 105, hand: 180 }),
      B({ lean: 14, footN: 90, footF: 90, hipN: 38, knN: 26, hipF: -12, knF: 2, sh: 70, fsArm: .3, el: 105, hand: 180, neck: -4 }), { wait: .1, go: .32, hold: .3 }) },

  // ================= warmup =================
  arm_circles: { view: 'front', anchor: 'feet', duration: 1400,
    frames: [F(0, B(FFLAT, { sh: 90, el: 0, hip: 5 })), F(.25, B(FFLAT, { sh: 106, el: 0, hip: 5, fsArm: .95, fsFore: .92 })),
      F(.5, B(FFLAT, { sh: 90, el: 0, hip: 5, fsArm: .9, fsFore: .86 })), F(.75, B(FFLAT, { sh: 74, el: 0, hip: 5, fsArm: .95, fsFore: .92 })), F(1, B(FFLAT, { sh: 90, el: 0, hip: 5 }))] },
  leg_swings: { view: 'side', anchor: 'midF', balance: true, duration: 1800,
    frames: [F(0, X(STAND, { hipN: -28, knN: 6, footN: null, anN: 15, sh: 70, el: 10 })), F(.5, X(STAND, { hipN: 72, knN: 4, footN: null, anN: 5, sh: 70, el: 10 })),
      F(1, X(STAND, { hipN: -28, knN: 6, footN: null, anN: 15, sh: 70, el: 10 }))] },
  hip_circles: { view: 'front', anchor: 'midF', at: [-14, 0], duration: 2800,
    contact: { pt: 'midN', key: 'hipN', dx: '@0', keyX: 'knN' },
    frames: [F(0, B(FFLAT, { rot: -8, lean: -8, hip: 9, sh: 38, el: -110 })), F(.25, B(FFLAT, { rot: 0, lean: 0, spine: 4, hip: 9, sh: 38, el: -110, kn: 8 })),
      F(.5, B(FFLAT, { rot: 8, lean: 8, hip: 9, sh: 38, el: -110 })), F(.75, B(FFLAT, { rot: 0, lean: 0, spine: -4, hip: 9, sh: 38, el: -110 })), F(1, B(FFLAT, { rot: -8, lean: -8, hip: 9, sh: 38, el: -110 }))] },
  scapular_push_up: { ...PLANK_CFG, duration: 2000,
    frames: rep(X(PLANK, { spine: 8, sh: 86 }), X(PLANK, { spine: -6, sh: 92 }), { pause: .1, down: .35, hold: .15 }) },
  inchworm: { view: 'side', anchor: 'balls', duration: 6400,
    frames: [F(0, STAND, { balance: true }), F(.08, STAND, { balance: true }),
      F(.22, B(FLAT, { hip: 150, kn: 12, sh: 165, el: 0, hand: 90, neck: 10 }), { contact: { pt: 'hands' } }),
      F(.45, X(PLANK, { lean: 90 }), { contact: { pt: 'hands' } }), F(.55, X(PLANK, { lean: 90 }), { contact: { pt: 'hands' } }),
      F(.78, B(FLAT, { hip: 150, kn: 12, sh: 165, el: 0, hand: 90, neck: 10 }), { contact: { pt: 'hands' } }),
      F(.92, STAND, { balance: true }), F(1, STAND, { balance: true })] },
});
