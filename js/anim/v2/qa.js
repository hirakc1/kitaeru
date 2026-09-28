// Kitaeru animation v2: clip QA (compare page only, not in the app bundle).
// Samples a clip over one cycle and reports what the eye would catch as a bug:
//   reach / reachLeg  > 1 means an IK chain was clamped (the hand or foot would detach from its contact)
//   slide             worst horizontal travel of any point while it rests on the floor (y < 1.5 and within 3 mm of the
//                     height it landed at), or of a pinned point
//   floor             lowest skeleton point (should be >= -0.3; contacts sit at 0..2.4)
//   humerus           worst upper-arm stretch in forearm-plank contacts (cm)
//   offMat            cm any point near the floor (y < 6) lies beyond the drawn floor's edge: lying poses (a limb resting
//                     past the mat reads as dropping through the floor)
import { poseAt, period, swapTime } from './core.js';

// pins: points that must not move at all (contacts off the floor: palms on a bench, knees); default clip.qaPins
export function qaClip(clip, { n = 240, pins = clip.qaPins || [] } = {}) {
  const T = period(clip), anc = {};
  const r = { reach: 0, reachLeg: 0, slide: 0, slideAt: '', floor: 1e9, floorAt: '', offMat: 0, offMatAt: '', humerus: 0, ms: 0, com: 0, comAt: 0 };
  const zN = clip.floor && !clip.travel && !clip.grid ? Math.max(34, clip.floorZ || 0, (clip.bar?.w ?? 0) + 12) : 1e9;   // plate.js drawFloor
  const t0 = performance.now();
  const h = swapTime(clip);
  for (let i = 0; i < n; i++) {   // (one cycle, not the wrap: travelling clips end where they started + travel)
    if (h && i / n * T >= h && (i - 1) / n * T < h) for (const k in anc) delete anc[k];   // side switch: new contacts
    const S = poseAt(clip, i / n * T);
    r.reach = Math.max(r.reach, S.reach || 0); r.reachLeg = Math.max(r.reachLeg, S.reachLeg || 0);
    r.humerus = Math.max(r.humerus, S.humerusErr || 0);
    if (S.support?.length) {   // stepping: the centre of mass over the base of support (weight transfer; not in flight)
      const pts = [];
      for (const sd of ['R', 'L']) for (const n of ['heel', 'ball', 'toe']) { const p = S.pt[n + sd]; if (p[1] < 1.6) pts.push([p[0], p[2]]); }
      const d = pts.length ? outside([S.com[0], S.com[2]], pts) : 0;   // (airborne: no support to be over)
      if (d > r.com) { r.com = d; r.comAt = Math.round(i / n * 100) / 100; }
    }
    for (const k in S.pt) {
      const p = S.pt[k];
      if (p[1] < r.floor) { r.floor = p[1]; r.floorAt = k; }
      if (p[1] < 6 && Math.abs(p[2]) - zN > r.offMat) { r.offMat = Math.abs(p[2]) - zN; r.offMatAt = k; }
      // contact: anchored where it lands; re-anchored while it is still rising or settling (height change >= 3 mm)
      const pin = pins.includes(k), a = anc[k], side = k.slice(-1), foot = /^(heel|ball|toe)[RL]$/.test(k);
      // stepping clips: a foot is a contact only while it is down (lift < 0.5 mm), whatever its height
      // (a foot turning on its ball: the ball is the contact, the toes sweep round it)
      const down = S.support && foot ? S.support.includes(side) && p[1] < 1.5 && !(k.startsWith('toe') && S.pivoting?.includes(side)) : p[1] < 1.5;
      if (down || pin) {
        if (!a || (!pin && Math.abs(p[1] - a[1]) >= .3)) anc[k] = p;
        else { const d = Math.hypot(p[0] - a[0], p[2] - a[2]); if (d > r.slide) { r.slide = d; r.slideAt = k; } }
      } else delete anc[k];
    }
  }
  r.ms = (performance.now() - t0) / (n + 1);
  for (const k of ['reach', 'reachLeg', 'slide', 'floor', 'offMat', 'humerus', 'ms', 'com']) r[k] = Math.round(r[k] * 1000) / 1000;
  // com: cm the centre of mass strays outside the support hull (feet are drawn as lines, so allow ~half a foot width)
  r.ok = r.reach <= 1 && r.reachLeg <= 1 && r.slide < .05 && r.floor > -.3 && r.offMat < 1 && r.humerus < .6 && r.com < 4;
  return r;
}
// distance from p to the convex hull of pts (0 inside); 2D
function outside(p, pts) {
  const h = hull(pts);
  if (h.length > 2 && h.every((a, i) => { const b = h[(i + 1) % h.length]; return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0; })) return 0;
  let d = 1e9;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length], ab = [b[0] - a[0], b[1] - a[1]], L = ab[0] ** 2 + ab[1] ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / L));
    d = Math.min(d, Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]));
  }
  return d;
}
function hull(P) {   // monotone chain, counter-clockwise
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
