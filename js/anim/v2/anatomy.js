// Kitaeru animation v2: bone shapes, shared by the SVG plate renderer and the three.js renderer.
// All shapes are procedural (no external assets). Coordinates are local to a frame from core.js (cm):
//   long bones: x = anterior, y = along the bone, z = lateral. Profile rows: [u (fraction of length), offAnt, offLat, rAnt, rLat].
import { DEG } from './core.js';

export const PROFILE = {
  humerus: [[-.06, 0, 0, .8, .8], [-.02, -.2, .2, 2.0, 2.0], [.04, -.2, .5, 2.1, 2.2], [.12, .1, .4, 1.5, 1.6], [.3, .1, .2, 1.15, 1.2],
    [.6, 0, 0, 1.1, 1.15], [.83, -.1, 0, 1.25, 1.8], [.93, 0, 0, 1.35, 2.6], [.99, .2, 0, 1.25, 2.2], [1.03, .2, 0, .6, 1.1]],
  radius: [[0, .7, 1.2, .8, .8], [.08, .7, 1.2, .7, .7], [.5, .8, 1.3, .7, .8], [.88, .8, 1.3, 1.0, 1.3], [.98, .6, 1.2, 1.2, 1.6], [1.02, .5, 1.1, .7, 1.0]],
  ulna: [[-.11, -1.6, -1, .8, .8], [-.06, -1.8, -1, 1.2, 1.0], [.03, -1.1, -1.1, 1.3, 1.1], [.12, -.5, -1.2, .9, .8], [.5, -.2, -1.2, .62, .62],
    [.94, 0, -1.4, .7, .7], [1.0, 0, -1.4, .8, .8], [1.03, 0, -1.3, .4, .4]],
  femur: [[-.05, 0, -.3, 1.2, 1.2], [0, 0, 0, 2.3, 2.3], [.04, 0, 1.6, 1.4, 1.5], [.075, -.4, 2.8, 2.2, 2.1], [.15, 0, 2.2, 1.7, 1.6], [.35, .25, 1.4, 1.45, 1.4],
    [.65, .15, .7, 1.4, 1.4], [.86, -.2, .3, 1.8, 2.1], [.95, -.5, 0, 2.6, 3.4], [1.0, -.3, 0, 2.3, 3.2], [1.035, 0, 0, .9, 1.7]],
  tibia: [[-.025, 0, 0, 1.4, 2.5], [.02, .1, 0, 2.2, 3.1], [.08, .6, 0, 2.0, 2.3], [.2, .5, 0, 1.45, 1.5], [.5, .3, 0, 1.15, 1.15],
    [.85, .2, -.1, 1.25, 1.35], [.96, .2, -.4, 1.6, 1.9], [1.0, .2, -.9, 1.1, 1.2], [1.03, .2, -1.2, .5, .5]],
  fibula: [[.02, -1.3, 2.5, .9, .9], [.07, -1.2, 2.6, .55, .55], [.5, -1.0, 2.7, .45, .45], [.95, -.9, 2.6, .7, .7], [1.03, -.8, 2.5, 1.0, .9], [1.08, -.8, 2.4, .45, .45]],
};
export const BONE_OF = { humerus: 'humerus', radius: 'fore', ulna: 'fore', femur: 'femur', tibia: 'tibia', fibula: 'tibia' };

// extra rounded masses on long bones: [bone, centre (local), radii (x, y, z)]
export const BLOBS = [
  ['femur', [-.8, 2.2, 3.6], [1.6, 2.2, 1.5]],        // greater trochanter
  ['femur', [0, 0, 0], [2.4, 2.4, 2.4]],              // femoral head
  ['humerus', [-.4, .2, .3], [2.3, 2.3, 2.3]],        // humeral head
];

// hand: segments [a, b, r] in hand-local space (x palmar, y along, z thumb side), curled by `fingers` degrees
export function handShape(fingers = 0, grip = 'free') {
  const segs = [];
  const zb = [1.5, .5, -.5, -1.5], zk = [2.4, .8, -.8, -2.2], ky = [9.4, 9.7, 9.2, 8.5];
  const L = [[4, 2.4, 1.8], [4.4, 2.8, 1.9], [4.1, 2.6, 1.8], [3.2, 1.9, 1.6]];
  const share = [.42, .33, .25];
  for (let i = 0; i < 4; i++) {
    const a = [0, 2.6, zb[i]], k = [0, ky[i], zk[i]];
    segs.push([a, k, .42]);
    let p = k, ang = 0;
    const spread = (zk[i] - zb[i]) / 7 * .5;
    for (let j = 0; j < 3; j++) {
      ang += fingers * share[j] * DEG;
      const d = [Math.sin(ang), Math.cos(ang), spread * Math.cos(ang)];
      const q = [p[0] + d[0] * L[i][j], p[1] + d[1] * L[i][j], p[2] + d[2] * L[i][j]];
      segs.push([p, q, .36 - j * .05]); p = q;
    }
  }
  // thumb: opposes when gripping
  let p = [.6, 1.4, 2.4], ang = 0;
  const td = grip === 'bar' ? [.55, .55, .45] : grip === 'palm' ? [.05, .72, .7] : [.35, .7, .6];
  const q0 = [p[0] + td[0] * 4.6, p[1] + td[1] * 4.6, p[2] + td[2] * 4.6];
  segs.push([p, q0, .5]); p = q0;
  for (const l of [3.1, 2.4]) {
    ang += (grip === 'bar' ? 55 : fingers * .35) * DEG;
    const d = [td[0] + Math.sin(ang) * .6, td[1] * Math.cos(ang), td[2] * Math.cos(ang) - Math.sin(ang) * .3];
    const n = Math.hypot(...d); const q = [p[0] + d[0] / n * l, p[1] + d[1] / n * l, p[2] + d[2] / n * l];
    segs.push([p, q, .36]); p = q;
  }
  return { segs, blobs: [[[.2, 1.4, .2], [1.1, 1.7, 2.7]]] };
}

// Plate (A) hand art pass: every bone as its own tapered tube with joint gaps, so the hand reads as a hand at any angle.
// Returns [{ c: [p0, p1, p2], r: [r0, r1, r2] }] in hand-local space (x palmar, y distal, z thumb side).
// Carpus = a rounded block; metacarpals fan from it; fingers curl by `fingers` degrees (share .42/.33/.25 per joint);
// the thumb leaves the palm plane at the trapezium and opposes around a bar, lies flat on the floor, or rests curled.
const MC = { base: [[.2, 2.5, 1.7], [.2, 2.7, .55], [.2, 2.6, -.55], [.2, 2.4, -1.6]], head: [[0, 9.3, 2.3], [0, 9.7, .75], [0, 9.2, -.8], [0, 8.4, -2.2]] };
const PH = [[3.9, 2.3, 1.7], [4.4, 2.8, 1.9], [4.1, 2.6, 1.8], [3.2, 1.9, 1.6]];
const PR = [[.44, .36], [.36, .3], [.3, .2]];
// Hand shapes (core channel handShape): per-finger curl (index..little, degrees over three joints), fan (+ spread,
// - converge the tips) and the thumb's direction / curl. relaxed = the `fingers` channel with the default thumb.
//   palm: open, fingers together, thumb alongside (Tai Chi palm). fist: fingers rolled in, thumb across the middle
//   phalanges. hook (勾手): fingertips drawn together, pointing down with a flexed wrist. point: index out.
//   bazi (八字掌, "figure-eight palm"): index straight up, thumb out wide, the other three curled (Baduanjin draw-the-bow).
const SHAPES = {
  palm: { curl: [4, 4, 4, 4], fan: .4, thumb: [.05, .75, .6], tc: 2 },
  fist: { curl: [235, 245, 245, 235], fan: .6, thumb: [.78, .45, -.25], tc: 42 },
  hook: { curl: [95, 100, 100, 95], fan: -1.4, thumb: [.85, .5, -.12], tc: 30 },
  point: { curl: [0, 235, 245, 235], fan: .8, thumb: [.78, .45, -.25], tc: 42 },
  bazi: { curl: [0, 235, 245, 235], fan: .8, thumb: [-.12, .12, .98], tc: 0 },
};
export function handBones(fingers = 0, grip = 'free', shape = 'relaxed') {
  const out = [], gap = .18, sh = [.42, .33, .25], S = SHAPES[shape];
  const seg = (a, b, r0, r1) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d), k = gap / L;
    const p = [a[0] + d[0] * k, a[1] + d[1] * k, a[2] + d[2] * k], q = [b[0] - d[0] * k, b[1] - d[1] * k, b[2] - d[2] * k];
    out.push({ c: [p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], q], r: [r0, (r0 + r1) / 2 * .85, r1] }); };
  out.push({ c: [[.1, .1, .3], [.2, 1.3, .3], [.2, 2.4, .1]], r: [1.3, 2.3, 2.15], carpus: 1 });
  for (let i = 0; i < 4; i++) {
    const a = MC.base[i], h = MC.head[i];
    seg(a, h, .46, .5);
    let p = h, ang = 0;
    const spread = S ? (S.fan < 0 ? -h[2] / 4 * -S.fan * .5 : (h[2] - a[2]) / 7 * .5 * S.fan) : (h[2] - a[2]) / 7 * .5, fc = S ? S.curl[i] : fingers;
    for (let j = 0; j < 3; j++) {
      ang += fc * sh[j] * DEG;
      const d = [Math.sin(ang), Math.cos(ang), spread * Math.cos(ang)], l = PH[i][j];
      const q = [p[0] + d[0] * l, p[1] + d[1] * l, p[2] + d[2] * l];
      seg(p, q, PR[j][0] - i * .02, PR[j][1] - i * .02); p = q;
    }
  }
  // thumb: CMC at the trapezium; metacarpal 4.4, phalanges 3.0 / 2.3
  const bar = grip === 'bar', flat = grip === 'palm';
  let p = [.6, 1.9, 2.1], d = bar ? [.66, .66, .2] : flat ? [-.04, .62, .78] : S ? S.thumb.slice() : [.55, .8, .24];
  const curl = bar ? 32 : flat ? 0 : S ? S.tc : 8 + fingers * .35;
  const n0 = Math.hypot(...d); d = d.map(v => v / n0);
  const lens = [4.4, 3.0, 2.3], rad = [[.5, .46], [.42, .34], [.34, .22]];
  for (let j = 0; j < 3; j++) {
    const q = [p[0] + d[0] * lens[j], p[1] + d[1] * lens[j], p[2] + d[2] * lens[j]];
    seg(p, q, rad[j][0], rad[j][1]); p = q;
    const a = curl * DEG, c = Math.cos(a), s = Math.sin(a);
    // bar: wraps up the front of the bar towards the fingers; otherwise flexes towards the palm and the index
    d = bar ? [d[0] * c - d[1] * s, d[0] * s + d[1] * c, d[2] * c] : [d[0] + s * .55, d[1] * c - s * .15, d[2] * c - s * .45];
    const n = Math.hypot(...d); d = d.map(v => v / n);
  }
  return out;
}

// foot (x along the foot, y up, z lateral); toes returned separately (relative to the ball) so they can stay flat
export function footShape() {
  const segs = [], toes = [];
  const zb = [-2.2, -1.1, 0, 1, 2], zh = [-3.3, -1.7, -.3, 1.1, 2.4], hx = [14.4, 14.4, 13.9, 13.2, 12.2], rr = [.85, .55, .5, .5, .5];
  const tl = [[3.2, 2.6], [2.4, 1.5, 1.1], [2.2, 1.4, 1.0], [2.0, 1.3, .9], [1.7, 1.1, .8]];
  const ball = [14.2, -7.1, 0];
  for (let i = 0; i < 5; i++) {
    const h = [hx[i], -7.0 + (i ? .25 * i : 0), zh[i]];
    segs.push([[7.6, -4.7, zb[i]], h, rr[i]]);
    let p = [h[0] - ball[0], h[1] - ball[1], h[2]];
    for (const l of tl[i]) { const q = [p[0] + l, p[1] - .05 * l, p[2] + (i - 2) * .08 * l]; toes.push([p, q, i ? .34 : .55]); p = q; }
  }
  const blobs = [
    [[-3.6, -4.9, .2], [3.4, 2.3, 1.7]],    // calcaneus
    [[.4, -2.3, 0], [2.8, 1.6, 2.1]],       // talus
    [[5.2, -4.2, .2], [2.6, 1.8, 3.1]],     // navicular / cuneiforms / cuboid
  ];
  return { segs, toes, blobs };
}

// skull parts in head-local space (x fwd, y up, z right); frame: 'head' | 'jaw'. dark = cavity; n = facing normal
export const SKULL = [
  { t: 'ell', f: 'head', c: [1.2, 8.8, 0], r: [9.6, 8.3, 7.3], rot: -12, main: 1 },
  { t: 'ell', f: 'head', c: [7.4, 2.0, 0], r: [3.9, 4.4, 4.9] },
  { t: 'ell', f: 'head', c: [-1.8, -.2, 4.7], r: [1.3, 1.6, 1.1], sym: 1 },                 // mastoid
  { t: 'tube', f: 'head', pts: [[8.8, 2.4, 4.9], [4.4, 2.3, 6.5], [.4, 2.6, 6.1]], r: [.55, .9], sym: 1 },   // zygomatic arch
  { t: 'tube', f: 'head', pts: [[9.7, 6.7, -4.8], [10.7, 6.9, -1.5], [10.8, 6.9, 1.5], [9.7, 6.7, 4.8]], r: [.7, .8] },   // brow
  { t: 'ell', f: 'head', c: [8.9, 4.8, 3.2], r: [1.0, 1.85, 1.65], dark: 1, n: [1, 0, .55], sym: 1 },     // orbit
  { t: 'ell', f: 'head', c: [10.5, 1.8, 0], r: [.6, 1.5, 1.0], dark: 1, n: [1, -.1, 0] },               // nasal aperture
  { t: 'ell', f: 'head', c: [-1.2, 2.4, 6.3], r: [.6, .6, .3], dark: 1, n: [0, 0, 1], sym: 1 },          // ear canal
  { t: 'tube', f: 'jaw', pts: [[.9, 1.1, 5.4], [.5, -2.2, 5.3], [.4, -5.3, 5.0], [2.6, -7.3, 4.6], [6.6, -8.4, 3.2], [9.6, -8.8, 1.2], [10.3, -8.8, 0]], r: [.9, 1.1], sym: 1 },
  { t: 'tube', f: 'jaw', pts: [[4.2, .3, 4.9], [4.4, -2.6, 4.9]], r: [.5, .7], sym: 1 },                 // coronoid
  { t: 'teeth', f: 'head', pts: [[5.4, -3.2, 3.6], [8.4, -3.3, 2.9], [10.3, -3.5, 1.3], [10.6, -3.5, 0]], r: .55, sym: 1 },
  { t: 'teeth', f: 'jaw', pts: [[5.4, -4.4, 3.4], [8.3, -4.6, 2.7], [10.0, -4.7, 1.2], [10.3, -4.7, 0]], r: .5, sym: 1 },
];
export const SKULL_MAIN = SKULL[0];

// pelvis (right side; x fwd, y up, z right) in pelvis space; hip joint centre at [0, 0, 9].
// Plate (A) art pass: one os coxae outline traced through real landmarks (Harrington-scaled: ASIS 4.8 fwd / 8.4 up of the
// hip centre, inter-ASIS 24, PSIS 15 behind the ASIS), obturator foramen cut out, cup facing out / forward / down.
// The older ilium / ring / obturator / acetabulum shapes stay for the three.js renderer (B).
export const COXA = {
  outline: [
    [4.8, 8.4, 12.2], [2.6, 11.4, 13.6], [.4, 13.1, 14.1], [-2.8, 14.3, 12.8], [-6.2, 13.6, 9.6], [-8.9, 11.9, 6.1],   // ASIS, crest, tubercle
    [-9.8, 10.4, 4.5], [-9.5, 8.9, 4.2], [-9.3, 7.4, 4.3], [-8.3, 5.9, 5.1], [-6.9, 3.7, 6.2], [-6.1, 1.4, 6.1],       // PSIS, PIIS, sciatic notch
    [-5.8, -1.1, 5.0], [-5.1, -2.6, 5.5], [-5.2, -4.4, 6.0], [-4.3, -6.7, 6.5], [-2.6, -8.1, 6.1], [-.3, -8.0, 4.8],  // spine, lesser notch, tuberosity
    [2.2, -7.1, 2.6], [3.8, -6.1, 1.0], [4.6, -4.6, .6], [5.1, -2.5, .6], [5.4, -1.6, 2.0], [4.7, -.9, 3.6],         // ramus, symphysis, tubercle
    [3.9, .2, 5.6], [3.6, 1.6, 7.6], [4.7, 3.4, 9.6], [5.2, 4.8, 10.5], [4.3, 6.3, 11.1], [4.8, 7.4, 11.8],          // pecten, eminence, AIIS, notch
  ],
  foramen: [[4.1, -2.3, 3.6], [3.8, -4.3, 3.1], [2.4, -6.1, 3.7], [.6, -6.2, 5.2], [-.8, -4.4, 6.4], [-.4, -2.5, 6.6], [1.5, -1.7, 5.6]],
  fossa: [[3.4, 9.2, 11.0], [1.2, 5.4, 9.2], [-3.6, 6.0, 7.0], [-6.8, 9.6, 5.8], [-4.4, 12.9, 10.2], [.8, 12.4, 12.4]],
  crest: [[4.8, 8.4, 12.2], [2.6, 11.4, 13.6], [.4, 13.1, 14.1], [-2.8, 14.3, 12.8], [-6.2, 13.6, 9.6], [-8.9, 11.9, 6.1], [-9.8, 10.4, 4.5]],
  brim: [[-8.6, 6.8, 3.8], [-5.2, 3.8, 5.0], [-1.6, 1.8, 6.2], [2.2, .8, 5.6], [4.4, -.6, 3.4], [5.3, -1.5, 1.6]],    // arcuate line + pecten
  acet: { c: [.9, -.2, 10.5], n: [.42, -.52, 1], r: 2.9 },
  tuber: { c: [-3.7, -6.9, 6.3], r: [1.4, 2.3, 1.1] },
  coccyx: [[-7.6, -4.6, 0, .55, .7], [-6.9, -5.8, 0, .45, .55], [-6.0, -6.8, 0, .35, .4], [-5.1, -7.4, 0, .22, .25]],
};
export const PELVIS = {
  ilium: [[6, 9.6, 11.6], [5.4, 5, 10.2], [2, 2.6, 10.4], [-2.2, 3.2, 8], [-5.4, 4.6, 6.2], [-8.2, 10, 4.6], [-7, 14.6, 8],
    [-2.4, 17.2, 12], [2.8, 15.4, 13.6], [5.8, 12, 12.6]],
  fossa: [[4.2, 10, 10.5], [1.8, 5.2, 9], [-3.6, 6.5, 6.8], [-5.4, 11.5, 7.2], [-2, 15.4, 10.5], [2.4, 14, 11.8]],
  ring: [[5.8, -1.6, .9], [5.2, -5, .9], [1.6, -6.2, 3], [-2.6, -7.2, 5.4], [-3.8, -4.4, 6.4], [-2.4, -.8, 8.6], [1.4, .6, 8.6], [4.2, .4, 5.6], [5.6, -.6, 2.2]],
  obturator: [[3.6, -2.2, 5.4], [2.8, -4.6, 5.6], [-.2, -4.9, 6.4], [-1.4, -2.8, 7.4], [.8, -1.1, 7.2]],
  acetabulum: { c: [.6, 0, 9.6], r: [2.7, 2.7, .8] },
  sacrum: [[-4.6, 9.4, 0, 1.6, 5.2], [-6.4, 6.4, 0, 1.5, 4.4], [-8.2, 3.2, 0, 1.3, 3.2], [-9, .4, 0, 1.0, 2.1], [-8.8, -2.2, 0, .8, 1.2], [-7.6, -4.6, 0, .5, .6]],
};

// sternum profile in sternum space (y down along the sternum): [y, rAnt, rLat]
export const STERNUM = [[-.4, .5, 1.6], [.6, .7, 2.6], [3.2, .7, 2.2], [4.4, .6, 1.4], [8, .6, 1.6], [11, .6, 1.8], [13, .5, 1.2], [14.6, .4, .6], [16, .3, .3]];

// vertebra (local frame at the lower endplate; x fwd, y up, z right)
export function vertebraShape(v) {
  const h = v.h, d = v.d, w = v.w;
  const spLen = v.reg === 'L' ? 3.3 : v.reg === 'T' ? 3.8 : (v.name === 'C7' ? 3.2 : 1.9);
  const spDrop = v.reg === 'L' ? .3 : v.reg === 'T' ? 2.4 : .8;
  return {
    body: { c: [.2, h * .5, 0], r: [d / 2, h * .38, w / 2] },
    spinous: [[-d / 2 - .3, h * .62, 0], [-d / 2 - spLen, h * .5 - spDrop, 0]], spR: v.reg === 'L' ? [.55, 1.1] : [.35, .6],
    trans: [[-d / 2 - .1, h * .6, 0], [-d / 2 - .9, h * .62, (w / 2 + (v.reg === 'L' ? 3.2 : v.reg === 'T' ? 2.4 : 1.5))]],
  };
}

// Textbook-plate skull outlines. Lateral: (x fwd, y up) in the head's sagittal plane; frontal: (z, y) for the right half,
// mirrored. Origin at the occipital condyles. The mandible is in the jaw frame.
export const SKULL_LAT = {
  cranium: [[2, 15.8], [5.2, 15.4], [7.9, 13.9], [9.9, 11.4], [10.8, 8.9], [11.0, 7.4], [10.5, 6.3], [11.1, 5.4], [11.9, 4.2], [11.1, 3.8],
    [10.7, 2.6], [11.2, 1.6], [11.6, 1.1], [11.3, -.2], [11.2, -1.5], [9.2, -1.6], [6.6, -1.3], [4.6, -.1], [2.3, .7], [.9, -.3],
    [-1.1, -1.5], [-2.4, -.4], [-4.4, .4], [-6.9, 2.6], [-8.6, 5.4], [-8.9, 8.8], [-7.2, 12.8], [-3.4, 15.2]],
  mandible: [[1.2, 1.1], [1.7, -.3], [1.0, -2.2], [.9, -4.4], [1.5, -6.1], [3.6, -6.9], [6.6, -7.4], [9.4, -7.6], [10.7, -7.2], [11.3, -5.8],
    [11.0, -4.2], [11.3, -2.9], [9.4, -2.7], [7, -2.6], [5.2, -1.8], [4.4, -.4], [4.7, 1.0], [3.7, .3], [2.8, -.2], [2.1, .5]],
  orbit: [[8.3, 7.3], [9.9, 6.9], [10.5, 5.3], [9.8, 3.7], [8.5, 3.6], [7.7, 4.9]],
  nasal: [[11.1, 3.9], [10.3, 3.5], [10.1, 2.1], [10.9, 1.4]],
  zyg: [[9.6, 3.4], [8.8, 2.3], [7.4, 1.6], [4.2, 1.9], [2.2, 2.2], [2.4, 3.3], [4.4, 3.1], [7.2, 3.2], [8.2, 4.2]],
  meatus: [.3, 2.3, .6],
  lines: [[[8.9, 11.9], [5.5, 14.2], [.5, 14.6], [-4.4, 13.2], [-6.6, 9.4], [-5.9, 5.2]],        // temporal line
    [[5.9, 15.3], [5.2, 12.2], [5.6, 8.4], [6.6, 5.6]],                                             // coronal suture
    [[-4.6, 14.3], [-6.6, 11.2], [-7.4, 7.6]],                                                       // lambdoid suture
    [[6.8, 5.8], [4.8, 4.4], [2.8, 4.9], [.8, 4.3]]],                                                // squamous suture
  teethU: [[6.4, -1.4], [11.1, -1.5]], teethL: [[6.6, -2.7], [11.0, -2.9]],
};
export const SKULL_FRONT = {
  cranium: [[0, 16.2], [3.6, 15.8], [6.2, 13.9], [7.2, 11], [7.0, 7.8], [6.4, 5.8], [6.8, 3.8], [6.1, 2.2], [4.4, 1.2], [3.6, -.6], [2.6, -1.6], [0, -1.8]],
  mandible: [[4.9, .9], [5.0, -1.8], [4.9, -4.6], [3.9, -6.3], [2.2, -7.2], [0, -7.5]],
  orbit: [[1.3, 6.9], [3.5, 7.4], [5.3, 6.5], [5.2, 4.2], [3.4, 3.6], [1.5, 4.2]],
  nasal: [[0, 4.4], [.9, 3.6], [1.3, 1.9], [.7, 1.2], [0, 1.4]],
  teethU: [[0, -1.5], [2.6, -1.3]], teethL: [[0, -2.8], [2.5, -2.6]],
};
// palm: elliptic tube along the hand (x palmar, y along, z lateral): [y, rAnt, rLat]
export const PALM = [[.2, .6, 1.2], [1.2, .95, 2.2], [3, .85, 2.7], [6.5, .7, 3.1], [9.3, .7, 3.3], [9.9, .4, 2.6]];
// foot body: [x, y, z, rUp, rLat] along the foot, heel to ball
export const FOOT_BODY = [[-7.2, -5.2, .3, 1.2, 1.0], [-6.2, -4.9, .3, 2.3, 1.7], [-3.4, -4.1, .2, 2.5, 1.9], [0, -2.9, 0, 2.3, 2.3],
  [3.6, -3.6, 0, 2.0, 2.9], [7.8, -4.9, -.2, 1.5, 3.4], [12, -6.3, -.4, .9, 3.8], [14.6, -6.8, -.4, .6, 3.6]];
// toes: tube from the ball (in the toe frame, relative to the ball) to the tips
export const TOES = [[0, 0, -.4, .75, 3.6], [2.4, -.1, -.5, .6, 3.3], [4.6, -.1, -.6, .45, 2.9], [6.4, -.05, -.7, .3, 2.2]];
