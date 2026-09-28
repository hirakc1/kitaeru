// Kitaeru animation v2 clips: trunk (planks, back extension). See lib.js for conventions.
import { P } from '../core.js';
import { CLIPS, solve, hold, floorPlank, straighten, elbowsUnder, sidePlank } from './lib.js';

// forearm plank: elbows planted under the shoulders, forearms flat; a breathing hold
const plank = floorPlank(c => ({
  name: 'Plank', cam: { az: 20, el: 8 }, still: 0, shift: 0, shiftRoll: 0, trail: [], headLag: .2,
  muscles: { primary: ['abs'], secondary: ['obliques', 'front_delts', 'glutes', 'quads'] },
  arms: { both: { mode: 'ik', grip: 'forearm', dir: s => [1, 0, -.14 * s], target: (sd, s) => [c._ex, 3.4, c._ez * s] } },
  base: { cervical: 4, head: -10, thoracic: -1, lumbar: 1, fingers: 20 },
  keys: { a: { bodyAngle: 12, scapProt: 6 }, b: { bodyAngle: 12, scapProt: 7.5, head: -8.5 } },
  timeline: hold('a', 'b'),
  prep({ settle }) { straighten(c, settle, 'a', 12); elbowsUnder(c, settle, ['a', 'b'], 'R', { hi: 30 }); },
}));

// side plank on the left forearm, facing the camera (rig in lib.js). Stays on one side: a mirror would turn the body
// away from the camera.
const side_plank = sidePlank(() => ({
  name: 'Side plank', trail: [], still: 0,
  muscles: { primary: ['obliques'], secondary: ['abs', 'glutes', 'side_delts'] },
  base: { yaw: -90, shAbdR: 86, shFlexR: 4, elbowR: 4, palmR: 0, fingersR: 12, wristR: 0, cervical: 2, head: 0, fingersL: 25 },
  keys: { a: { bodyAngle: 20 }, b: { bodyAngle: 20, head: 1.5, scapProtL: 1 } },
  timeline: hold('a', 'b'),
}));

// prone: the pelvis front is pinned; spine and hips extend to lift chest, arms and legs, then a breathing hold
const superman = (() => {
  const c = {
    name: 'Superman', cam: { az: 22, el: 10 }, floor: true, trail: ['palmR'], still: .5,
    muscles: { primary: ['lower_back', 'glutes'], secondary: ['upper_back', 'hamstrings', 'rear_delts'] },
    lag: .2, headLag: .3, shift: 0, shiftRoll: 0,
    pin: { pt: S => P(S.F.pelvis, [8.5, 0, 0]), at: [0, 2.6] },
    base: { pitch: 92, shFlex: 172, shAbd: 12, elbow: 6, palm: 90, wrist: 0, fingers: 10, knee: 2, ankle: 72, hipAbd: 3 },
    keys: { rest: { pitch: 92, lumbar: 2, thoracic: 1, cervical: 0, head: -4, shFlex: 172, hipFlex: 0 }, top: {}, top2: {} },
    timeline: [
      { hold: 'rest', dur: .5, b: .5 },
      { from: 'rest', to: 'top', dur: 1.2, r1: .3, r2: .42, breath: 'out', effort: 1 },
      { from: 'top', to: 'top2', dur: 1.4, r1: .5, r2: .5, breath: 'in' },
      { from: 'top2', to: 'top', dur: 1.4, r1: .5, r2: .5, breath: 'out' },
      { from: 'top', to: 'rest', dur: 1.3, r1: .3, r2: .4, breath: 'in' },
    ],
    prep({ settle }) {
      const k = c.keys, r = k.rest;
      const face = S => Math.min(S.pt.nose[1], S.pt.chin[1]);
      r.pitch = solve(80, 105, p => settle({ ...r, pitch: p }).pt.sternum[1], 6);            // chest resting (with soft tissue)
      r.cervical = -30; r.head = solve(-50, -15, v => face(settle({ ...r, head: v })), 2.2);    // long neck, face just off the floor
      r.shFlex = solve(150, 200, v => settle({ ...r, shFlex: v }).pt.palmR[1], 2.4);          // hands on the floor
      r.hipFlex = solve(-20, 20, v => settle({ ...r, hipFlex: v }).pt.patellaR[1], 2.4);      // thighs on the floor
      // lift: spine extends through the lumbar and thoracic levels, chest ~9 cm and legs ~20 cm up, neck stays long
      k.top = { ...r, pitch: r.pitch + 1, lumbar: -11, thoracic: -9, cervical: r.cervical + 6, shFlex: r.shFlex + 3, scapUp: 4, hipFlex: r.hipFlex - 10 };
      k.top2 = { ...k.top, lumbar: k.top.lumbar - 1, thoracic: k.top.thoracic - 1, shFlex: k.top.shFlex + 2, hipFlex: k.top.hipFlex - 1.2 };
    },
  };
  return c;
})();

Object.assign(CLIPS, { plank, side_plank, superman });
