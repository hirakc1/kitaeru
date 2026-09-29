// Kitaeru animation v2 clips: Moments (short everyday pauses). See lib.js for conventions. Every clip follows the
// cues and key-pose notes in js/data/exercises.js.
import { P } from '../core.js';
import { CLIPS, R, solve, box, feet, stand } from './lib.js';

const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = u => u * u * (3 - 2 * u);

// ---------------------------------------------------------------------------------------------------------------
// standing hip flexor stretch: an upright split stance (right foot forward, the back heel lifted); tuck the pelvis
// under (posterior tilt) and squeeze the back glute, the hips shifting a little forward; the torso stays vertical. Not
// a deep lunge, no low-back arch. Hands on the hips. Sides alternate.
const standing_hip_flexor_stretch = (() => {
  const RF = [18, 11, 6], LB = [-42, -11, 6, 0, -38, 1];   // back foot placed by its ball, heel up
  const k = {
    a: { weight: .5, rootY: 85, pitch: 0, lumbar: 0, ...feet({ R: RF, L: LB }) },
    b: { weight: .66, rootY: 83.5, pitch: -9, lumbar: 7, thoracic: 1.5, ...feet({ R: RF, L: LB }) },   // pelvis tucked, torso still vertical
  };
  return stand({}, {
    name: 'Standing hip flexor stretch', cam: { az: 28, el: 7 }, swap: true, still: .5, trail: ['pelvis'], keys: k,
    base: { rootY: 85, handX: 2, handY: -30, handZ: 22, palm: 90, fingers: 10 },
    arms: { both: { mode: 'ik', grip: 'free', pole: [-1, -.4, .4] } },
    timeline: [{ hold: 'a', dur: .5, b: .5 }, { from: 'a', to: 'b', dur: 2.2, r1: .3, r2: .4, breath: 'out' }, { hold: 'b', dur: 2.6, b: 0 },
      { from: 'b', to: 'a', dur: 1.8, r1: .3, r2: .4, breath: 'in' }],
  });
})();

// ---------------------------------------------------------------------------------------------------------------
// wall angel: side view. Back, head and arms against a wall, feet a step out, knees soft, ribs down. The arms start
// in a goalpost (upper arms out at shoulder height, elbows at 90°, backs of the hands to the wall) and slide up to
// about 140° with the forearms staying upright, then back down; the shoulder blades rotate (scapulohumeral rhythm),
// no shrug, no lumbar arch. About 4 s a rep. The wall is behind the figure (it never covers it). release = how far up.
const wall_angel = (() => {
  const c = stand({ R: [-2, 11, 6], L: [-2, -11, 6] }, {
    name: 'Wall angel', cam: { az: 32, el: 6 }, stepBalance: false, still: .1, trail: ['palmR'], _wx: -30,
    arms: { both: { mode: 'ik', grip: 'world', pole: [-.2, -.6, 1], at: (sd, s, ch, S, G) => {
      const a = (90 + 50 * smooth(ch['release' + sd])) * R;   // upper-arm abduction; the forearm stays vertical
      return [G[0] - 3, G[1] - 29 * Math.cos(a) + 24.5, G[2] + 29 * Math.sin(a) * s]; } } },
    // noBalance: leaning on the wall, which takes some of the weight
    base: { noBalance: 1, rootX: -14, rootY: 86.5, pitch: -5, lumbar: -1, thoracic: -1, cervical: -2, head: 4, palm: 0, fingers: 5, wrist: 0 },
    keys: { low: { release: 0 }, high: { release: 1, thoracic: -2 } },
    timeline: [{ from: 'low', to: 'high', dur: 2, r1: .3, r2: .35, breath: 'in' }, { from: 'high', to: 'low', dur: 2, r1: .3, r2: .35, breath: 'out' }],
    props: C => [box([C._wx - 12, 0, -70], [C._wx, 205, 70], -1e4)],
    prep({ settle }) {   // the wall face touches the back (sacrum / upper back / back of the head, whichever is furthest back)
      const S = settle(c.keys.low);
      c._wx = Math.min(P(S.F.pelvis, [-12, 4, 0])[0], P(S.F.T4, [-5, 0, 0])[0], P(S.F.head, [-9, 8, 0])[0]) - .3;
    },
  });
  return c;
})();

// ---------------------------------------------------------------------------------------------------------------
// seated on a chair (sit bones pinned on the seat), side view; shared by the seated moments
const SEAT = 45;
const chair = [box([-40, 0, -22], [4, SEAT, 22]), box([-44, 0, -22], [-38, 90, 22])];
function seated(over) {
  const c = {
    floor: true, still: .3, lag: .25, headLag: .4, shift: 0, shiftRoll: 0, _bx: 40,
    pin: { pt: S => P(S.F.pelvis, [-3.7, -7.5, 0]), at: [-16, SEAT + 2.5] },
    props: chair,
    base: { pitch: -2, lumbar: -2, cervical: 1, palm: 170, fingers: 20, wrist: 10 },
    ...over,
  };
  return c;
}
// the balls of the feet planted under the knees (shins vertical); foot pitch keyed by footPitch (heel up)
const seatedLegs = c => ({ both: { mode: 'ik', foot: 'toes', toeOut: 6, ball: (sd, s) => [c._bx, 0, 12 * s], lift: (s, ch) => ch[s > 0 ? 'footPitchR' : 'footPitchL'],
  pole: s => [1, .1, .1 * s] } });
function shinsVertical(c, settle, key) {
  c._bx = solve(10, 80, x => { c._bx = x; const S = settle(key); return S.pt.kneeR[0] - S.pt.ankleR[0]; }, 0);
}
// a hand resting on the thigh (u = from hip to knee)
const onThigh = (S, sd, s, u) => { const p = lerp(S.pt['hip' + sd], S.pt['knee' + sd], u); return [p[0], p[1] + 8, p[2] + 2 * s]; };

// seated calf raise: sit tall, feet flat, knees over the heels; lift the heels (3–5 cm) while the balls of the feet
// stay down, then lower; a small, steady rhythm (about 2 s a rep)
const seated_calf_raise = (() => {
  const c = seated({ name: 'Seated calf raise', cam: { az: 14, el: 6 }, trail: [], counts: 1,
    arms: { both: { mode: 'ik', grip: 'world', pole: [-.3, -1, .5], at: (sd, s, ch, S) => onThigh(S, sd, s, .62) } },
    keys: { down: { footPitch: 0 }, up: { footPitch: 14 } },
    timeline: [{ from: 'down', to: 'up', dur: .9, r1: .35, r2: .35, effort: 1 }, { hold: 'up', dur: .15, b: .5 }, { from: 'up', to: 'down', dur: .95, r1: .35, r2: .35 }],
    prep({ settle }) { shinsVertical(c, settle, c.keys.down); },
  });
  c.legs = seatedLegs(c);
  return c;
})();

// paced breathing: sitting tall and still, shoulders soft; the ribcage and belly rise gently over about 4 s and fall
// more slowly over about 6 s (about six breaths a minute), one hand resting on the belly. The breath ring follows the
// same 4 s in / 6 s out.
const paced_breathing = (() => {
  const c = seated({ name: 'Paced breathing', cam: { az: 38, el: 6 }, trail: [], still: 0,
    arms: {
      R: { mode: 'ik', grip: 'world', pole: [-.2, -1, .6], at: (sd, s, ch, S) => P(S.F.pelvis, [13 + 1.6 * S.breath, 21, 4 * s]) },   // on the belly
      L: { mode: 'ik', grip: 'world', pole: [-.3, -1, .5], at: (sd, s, ch, S) => onThigh(S, sd, s, .6) },
    },
    base: { pitch: -2, lumbar: -2, cervical: 1, palm: 170, fingers: 20, wrist: 10, palmR: 100, fingersR: 10, wristR: 20 },
    keys: { out: {}, in: { thoracic: -1.6, lumbar: -2.6, cervical: .5, head: -1, scapElev: .15 } },
    timeline: [{ from: 'out', to: 'in', dur: 4, r1: .4, r2: .4, breath: 'in' }, { from: 'in', to: 'out', dur: 6, r1: .35, r2: .45, breath: 'out' }],
    prep({ settle }) { shinsVertical(c, settle, c.keys.out); },
  });
  c.legs = seatedLegs(c);
  return c;
})();

Object.assign(CLIPS, { standing_hip_flexor_stretch, wall_angel, seated_calf_raise, paced_breathing });
