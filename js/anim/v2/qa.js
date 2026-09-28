// Kitaeru animation v2: clip QA (compare page only, not in the app bundle).
// Samples a clip over one cycle and reports what the eye would catch as a bug:
//   reach / reachLeg  > 1 means an IK chain was clamped (the hand or foot would detach from its contact)
//   slide             worst horizontal travel of any point while it rests on the floor (y < 1.5 and within 3 mm of the
//                     height it landed at), or of a pinned point
//   floor             lowest skeleton point (should be >= -0.3; contacts sit at 0..2.4)
//   humerus           worst upper-arm stretch in forearm-plank contacts (cm)
import { poseAt, period, swapTime } from './core.js';

export function qaClip(clip, { n = 240, pins = [] } = {}) {
  const T = period(clip), anc = {};
  const r = { reach: 0, reachLeg: 0, slide: 0, slideAt: '', floor: 1e9, floorAt: '', humerus: 0, ms: 0 };
  const t0 = performance.now();
  const h = swapTime(clip);
  for (let i = 0; i <= n; i++) {
    if (h && i / n * T >= h && (i - 1) / n * T < h) for (const k in anc) delete anc[k];   // side switch: new contacts
    const S = poseAt(clip, i / n * T);
    r.reach = Math.max(r.reach, S.reach || 0); r.reachLeg = Math.max(r.reachLeg, S.reachLeg || 0);
    r.humerus = Math.max(r.humerus, S.humerusErr || 0);
    for (const k in S.pt) {
      const p = S.pt[k];
      if (p[1] < r.floor) { r.floor = p[1]; r.floorAt = k; }
      // contact: anchored where it lands; re-anchored while it is still rising or settling (height change >= 3 mm)
      const pin = pins.includes(k), a = anc[k];
      if (p[1] < 1.5 || pin) {
        if (!a || (!pin && Math.abs(p[1] - a[1]) >= .3)) anc[k] = p;
        else { const d = Math.hypot(p[0] - a[0], p[2] - a[2]); if (d > r.slide) { r.slide = d; r.slideAt = k; } }
      } else delete anc[k];
    }
  }
  r.ms = (performance.now() - t0) / (n + 1);
  for (const k of ['reach', 'reachLeg', 'slide', 'floor', 'humerus', 'ms']) r[k] = Math.round(r[k] * 1000) / 1000;
  r.ok = r.reach <= 1 && r.reachLeg <= 1 && r.slide < .05 && r.floor > -.3 && r.humerus < .6;
  return r;
}
