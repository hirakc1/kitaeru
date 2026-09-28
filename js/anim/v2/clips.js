// Kitaeru animation v2: prototype clips. Keys are sparse joint-angle / target poses; the core adds the spline,
// tempo, IK contacts and secondary motion. Tempo is in real seconds (eccentric ~2 s, pause, concentric ~1 s).
import { mirrorPose } from './core.js';

const BAR_Y = 226;

export const CLIPS = {
  // ---------------------------------------------------------------------------------------------------------
  push_up: {
    name: 'Push-up', cam: { az: 20, el: 7 }, floor: true, trail: ['sternum'],
    muscles: { primary: ['chest', 'triceps'], secondary: ['front_delts', 'abs'] },
    lag: .14, headLag: .45, shift: .25, shiftRoll: .7,
    legs: { both: { mode: 'ik', foot: 'toes', knee: 3, toeOut: 4, ball: (sd, s) => [0, 0, 10 * s], pole: () => [.25, -1, 0] } },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.55, -1, .85], dir: s => [1, 0, .12 * s], target: (sd, s) => [CLIPS.push_up._hx, 0, CLIPS.push_up._hz * s] } },
    base: { cervical: 3, head: -8, thoracic: -2, lumbar: 1, wrist: 0 },
    keys: {
      top: { bodyAngle: 19, scapProt: 11, scapElev: .3 },
      bottom: { bodyAngle: 6.6, scapProt: -9, scapElev: -.2, cervical: -4, head: -14 },
    },
    timeline: [
      { hold: 'top', dur: .45, b: .15 },
      { from: 'top', to: 'bottom', dur: 2.0, r1: .26, r2: .4, breath: 'in' },
      { hold: 'bottom', dur: .3, b: 1 },
      { from: 'bottom', to: 'top', dur: 1.0, r1: .2, r2: .42, breath: 'out', effort: 1 },
    ],
    // rigid plank that pivots about the balls of the feet; the hips trail the chest slightly (follow-through)
    derive(ch, lag) {
      const c = CLIPS.push_up, th = ch.bodyAngle, thH = th + .45 * (lag.bodyAngle - th);
      const L = 93, r = thH * Math.PI / 180;
      ch.rootX = L * Math.cos(r); ch.rootY = L * Math.sin(r) + 1.2;
      ch.pitch = 90 - th + (c._poff || 0) - .8 * (lag.bodyAngle - th);
    },
    prep({ build }) {
      const c = CLIPS.push_up;
      c._hx = 0; c._hz = 21; c._poff = 0;
      const pose = th => { const ch = { ...c.keys.top, bodyAngle: th }; c.derive(ch, ch); return ch; };
      // straight body line: pelvis pitch offset so the shoulders sit on the ankle-hip line
      for (let i = 0; i < 3; i++) {
        const S = build(pose(12), true);
        const g = S.pt.glenoidR, h = S.pt.pelvis;
        const ang = Math.atan2(g[1] - h[1], g[0] - h[0]) * 180 / Math.PI;
        c._poff += ang - 12.8;
      }
      // hands under the shoulders at the top, arms at 98.5% of full reach
      let lo = 8, hi = 30;
      for (let i = 0; i < 30; i++) {
        const m = (lo + hi) / 2, S = build(pose(m), true), g = S.pt.glenoidR;
        const W = [g[0] + 3, 2.4, g[2] + 4];
        const d = Math.hypot(g[0] - W[0], g[1] - W[1], g[2] - W[2]);
        if (d > .975 * 55) hi = m; else lo = m;
      }
      c.keys.top.bodyAngle = lo;
      const S = build(pose(lo), true);
      c._hx = S.pt.glenoidR[0] + 3 + 5.2; c._hz = S.pt.glenoidR[2] + 4;
    },
  },

  // ---------------------------------------------------------------------------------------------------------
  bodyweight_squat: {
    name: 'Bodyweight squat', cam: { az: 30, el: 6 }, floor: true, trail: ['hipR'],
    muscles: { primary: ['quads', 'glutes'], secondary: ['adductors', 'hamstrings', 'calves'] },
    lag: .16, headLag: .4, shift: .6, shiftRoll: .8,
    legs: { both: { mode: 'ik', foot: 'flat', toeOut: 13, ankle: (sd, s) => [0, 7.5, 13.5 * s], pole: s => [1, 0, .34 * s] } },
    balance: S => (S.pt.heelR[0] + S.pt.ballR[0]) / 2 + .5,
    base: { rootY: 91, pitch: 3, elbow: 10, palm: 90, wrist: 5, fingers: 25, shAbd: 5 },
    keys: {
      top: { rootY: 91.5, pitch: 2, shFlex: 6, elbow: 12, head: 0, cervical: 0 },
      down: { rootY: 73, rootX: -9, pitch: 17, lumbar: -2, thoracic: 2, shFlex: 44, elbow: 8, head: -7, cervical: -3 },
      bottom: { rootY: 47, rootX: -19, pitch: 36, lumbar: -5, thoracic: 5, shFlex: 86, shAbd: 7, elbow: 5, head: -16, cervical: -9, fingers: 10 },
      up: { rootY: 65, rootX: -13, pitch: 27, lumbar: -4, thoracic: 3, shFlex: 64, elbow: 6, head: -12, cervical: -6 },
    },
    timeline: [
      { hold: 'top', dur: .5, b: .15 },
      { from: 'top', via: ['down'], to: 'bottom', at: [0, .42, 1], dur: 2.0, r1: .28, r2: .38, breath: 'in' },
      { hold: 'bottom', dur: .3, b: 1 },
      { from: 'bottom', via: ['up'], to: 'top', at: [0, .45, 1], dur: 1.0, r1: .2, r2: .42, breath: 'out', effort: 1 },
    ],
  },

  // ---------------------------------------------------------------------------------------------------------
  pull_up: {
    name: 'Pull-up', cam: { az: 24, el: 4 }, floor: false, bar: { y: BAR_Y, w: 52 }, trail: ['chin'],
    muscles: { primary: ['lats', 'upper_back'], secondary: ['biceps', 'rear_delts', 'forearms', 'abs'] },
    lag: .15, headLag: .3, shift: .3, shiftRoll: .5,
    arms: { both: { mode: 'ik', grip: 'bar', pole: [.35, -.25, 1], target: (sd, s) => [0, BAR_Y, 25 * s] } },
    balance: () => 0,
    base: { hipFlex: 8, knee: 16, ankle: 30, kneeL: 22, hipFlexL: 12, fingers: 200 },
    keys: {
      hang: { rootY: 110, scapElev: 2.6, scapProt: 5, thoracic: 3, head: 2, hipFlex: 5, knee: 12 },
      init: { rootY: 114, scapElev: -.8, scapProt: -5, thoracic: -3, head: 0, hipFlex: 9, knee: 15 },
      mid: { rootY: 140, scapElev: -1.4, scapProt: -10, thoracic: -8, head: -4, hipFlex: 14, knee: 20, pitch: -3 },
      top: { rootY: 160, scapElev: -2, scapProt: -14, thoracic: -11, head: -9, cervical: -3, pitch: -6, hipFlex: 17, knee: 22 },
    },
    timeline: [
      { hold: 'hang', dur: .5, b: .9 },
      { from: 'hang', via: ['init', 'mid'], to: 'top', at: [0, .2, .58, 1], dur: 1.15, r1: .22, r2: .42, breath: 'out', effort: 1 },
      { hold: 'top', dur: .4, b: .05 },
      { from: 'top', via: ['mid'], to: 'hang', at: [0, .45, 1], dur: 2.0, r1: .3, r2: .4, breath: 'in' },
    ],
    prep({ build }) {
      const c = CLIPS.pull_up, k = c.keys;
      // dead hang: arms at 99.3% of full reach
      let lo = 80, hi = 160;
      for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; const S = build({ ...k.hang, rootY: m }); if (S.reach > .993) hi = m; else lo = m; }
      k.hang.rootY = lo; k.init.rootY = lo + 4;
      // top: chin 3 cm over the bar
      lo = 130; hi = 190;
      for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; const S = build({ ...k.top, rootY: m }); if (S.pt.chin[1] > BAR_Y + 3) hi = m; else lo = m; }
      k.top.rootY = hi; k.mid.rootY = k.hang.rootY + (hi - k.hang.rootY) * .6;
    },
  },

  // ---------------------------------------------------------------------------------------------------------
  // simplified Yang-style cloud hands (yún shǒu), stationary: waist turn, weight transfer, hands circling,
  // gaze following the upper hand. Continuous (cyclic spline, no pauses), 8 s per cycle, two breaths.
  taichi_cloud_hands: {
    name: 'Cloud hands (yún shǒu, simplified)', cam: { az: 58, el: 9 }, floor: true, trail: ['palmR', 'palmL'],
    muscles: { primary: ['quads', 'obliques'], secondary: ['glutes', 'side_delts', 'adductors'] },
    lag: .35, headLag: .5, shift: 0, shiftRoll: 0,
    legs: { both: { mode: 'ik', foot: 'flat', toeOut: 4, ankle: (sd, s) => [0, 7.5, 22 * s], pole: s => [1, 0, .12 * s] } },
    arms: { both: { mode: 'ik', grip: 'free', pole: [-.15, -1, .75] } },
    base: { rootY: 85, pitch: 2, fingers: 14, wrist: 6, cervical: 2 },
    keys: {},
    timeline: [{ cyclic: ['L', 'LR', 'R', 'RL'], dur: 8, breath: 'cycle', breaths: 2 }],
    prep() {
      const k = CLIPS.taichi_cloud_hands.keys;
      // turned to the left: weight on the left leg, left hand up in front of the face (palm in), right hand low
      k.L = { yaw: 24, twist: 16, rootZ: -8, rootY: 84, headYaw: 14, head: 3, bend: -2,
        handXL: 30, handYL: 17, handZL: 7, palmL: 40, wristL: 12,
        handXR: 27, handYR: -19, handZR: -10, palmR: 120, wristR: -6 };
      // passing the centre: right hand rising in front of the chest, left hand sinking
      k.LR = { yaw: 0, twist: 0, rootZ: 0, rootY: 86, headYaw: 0, head: 4,
        handXR: 33, handYR: 2, handZR: -3, palmR: 70, wristR: 4,
        handXL: 30, handYL: -6, handZL: 3, palmL: 110, wristL: 0 };
      k.R = mirrorPose(k.L); k.RL = mirrorPose(k.LR);
    },
  },
};

export const CLIP_IDS = Object.keys(CLIPS);
