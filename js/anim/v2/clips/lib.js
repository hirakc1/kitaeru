// Kitaeru animation v2 clips (Direction A): shared helpers, factories and the clip registry.
// Keys are sparse joint-angle / target poses; the core adds the spline, tempo, IK contacts, root pins and secondary motion.
// Tempo is in real seconds (eccentric ~2 s, pause, concentric ~1 s). Every ground contact is planted by construction: an
// IK target (hands, feet, forearms, bar) or a root pin (knees, upper back, pelvis). prep() solves the geometry once (reach,
// hand / foot spots, straight body lines, head on the floor). World: x = forward, y = up, z = the body's right (camera
// side). Prone moves face +x, supine moves have the head at -x.
// Group files (push / pull / legs / trunk / flow) register into CLIPS; the app loads a group only when one of its
// exercises is first shown (see ../ids.js). Props: see plate.js (box / tube / ring / band).
export const CLIPS = {};
export const R = Math.PI / 180;
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const angXY = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) / R;
// x in [lo, hi] with g(x) = y (g monotone, either direction)
export function solve(lo, hi, g, y = 0, n = 22) {
  const inc = g(hi) > g(lo);
  for (let i = 0; i < n; i++) { const m = (lo + hi) / 2; if ((g(m) > y) === inc) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
// secant fit of a free parameter (a pitch offset) so that err() = 0
export function fit(get, set, err, n = 5) {
  for (let i = 0; i < n; i++) {
    const x = get(), e = err(); if (Math.abs(e) < .02) return;
    set(x + .5); const e1 = err(); const k = (e1 - e) / .5 || 1; set(x - e / k);
  }
}
// timelines. rep: lower first (push-ups, squats). repUp: effort first (pulls, bridges, raises). hold: breathing hold.
export const rep = (a, b, { p0 = .45, ecc = 2, p1 = .3, con = 1, via1, via2, at1, at2 } = {}) => [
  { hold: a, dur: p0, b: .15 },
  { from: a, via: via1, to: b, at: at1, dur: ecc, r1: .26, r2: .4, breath: 'in' },
  { hold: b, dur: p1, b: 1 },
  { from: b, via: via2, to: a, at: at2, dur: con, r1: .2, r2: .42, breath: 'out', effort: 1 },
];
export const repUp = (a, b, { p0 = .45, con = 1.1, p1 = .4, ecc = 2 } = {}) => [
  { hold: a, dur: p0, b: .9 },
  { from: a, to: b, dur: con, r1: .22, r2: .42, breath: 'out', effort: 1 },
  { hold: b, dur: p1, b: .05 },
  { from: b, to: a, dur: ecc, r1: .3, r2: .4, breath: 'in' },
];
export const hold = (a, b, dur = 4.4) => [{ cyclic: [a, b], dur, breath: 'cycle', breaths: 1 }];

// props
export const box = (a, b, bias) => ({ t: 'box', a, b, bias });
export const rod = (pts, r = 1.6, bias, nv) => ({ t: 'tube', pts, r, bias, nv });   // nv: not used to frame the view
// a free-standing frame: top bar along z at height y (half-width w), uprights to the floor with a foot under each.
// Only the top bar frames the view (none of it with nv, e.g. rings hanging from high up): the rest may run out of the
// picture, which keeps the figure large.
// back: uprights stand at x = back (behind the body) and reach the top bar with a horizontal arm, so none crosses it.
export const frame = (y, w, x = 0, nv = 0, back = x) => [rod([[x, y, -w], [x, y, w]], 1.6, 0, nv),
  ...[-w, w].flatMap(z => [rod([[back, y, z], [back, 0, z]], 1.3, 0, 1), rod([[back - 26, 1.2, z], [back + 26, 1.2, z]], 1.3, 0, 1),
    ...(back !== x ? [rod([[back, y, z], [x, y, z]], 1.3, 0, 1)] : [])])];

// ---------------------------------------------------------------------------------------------------------------
// floor plank family: a rigid body line pivoting on the balls of the feet (at height fy). Hips on a circle of radius L
// about the pivot; pitch keeps the shoulders on the pivot-hip line (_poff); the hips trail the chest a little.
// Hands planted at (_hx, _hy, ±_hz).
// ---------------------------------------------------------------------------------------------------------------
export function floorPlank(f) {
  const c = {
    floor: true, lag: .14, headLag: .45, shift: .25, shiftRoll: .7, trail: ['sternum'], L: 93, fy: 0, _poff: 0, _hx: 0, _hy: 0, _hz: 21,
    legs: { both: { mode: 'ik', foot: 'toes', knee: 3, toeOut: 4, ball: (sd, s) => [0, c.fy, 10 * s], pole: () => [.25, -1, 0] } },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.55, -1, .85], dir: s => [1, 0, .12 * s], target: (sd, s) => [c._hx, c._hy, c._hz * s] } },
    base: { cervical: 3, head: -8, thoracic: -2, lumbar: 1, wrist: 0 },
    derive(ch, lag) {
      const th = ch.bodyAngle, r = (th + .45 * (lag.bodyAngle - th)) * R;
      ch.rootX = c.L * Math.cos(r); ch.rootY = c.L * Math.sin(r) + c.fy + 1.2;
      ch.pitch = 90 - th + c._poff - .8 * (lag.bodyAngle - th);
    },
  };
  return Object.assign(c, f(c));
}
// shoulders a touch above the pivot-hip line (no sag)
export function straighten(c, settle, key, th, piv = () => [0, c.fy || 0], lift = .8) {
  const k = { ...c.keys[key], bodyAngle: th };
  fit(() => c._poff, v => { c._poff = v; }, () => { const S = settle(k, true); return angXY(S.pt.pelvis, S.pt.glenoidR) - angXY(piv(S), S.pt.pelvis) - lift; });
}
// bodyAngle where palms on a surface at height h, under the shoulders (+dx forward, +dz out, or at |z| = z), are at
// `reach` of the arm; sets the hand spot
export function palmsUnder(c, settle, key, { reach = .975, dx = 3, dz = 4, z, h = 0, lo = 6, hi = 50 } = {}) {
  const k = c.keys[key], G = th => settle({ ...k, bodyAngle: th }, true).pt.glenoidR;
  const W = g => [g[0] + dx, h + 2.4, z ?? g[2] + dz];
  k.bodyAngle = solve(lo, hi, th => { const g = G(th); return dist(g, W(g)); }, reach * 55);
  const w = W(G(k.bodyAngle)), d = fingers(c); c._hx = w[0] + 5.2 * d[0]; c._hy = h; c._hz = w[2] + 5.2 * d[2];
}
const fingers = c => { const d = c.arms.both.dir(1), l = Math.hypot(...d); return d.map(v => v / l); };   // right hand
// bodyAngle where the (already placed) palms are at `reach`
export function palmsReach(c, settle, key, reach, lo = 6, hi = 50) {
  const d = fingers(c), k = c.keys[key], W = [c._hx - 5.2 * d[0], c._hy + 2.4, c._hz - 5.2 * d[2]];
  k.bodyAngle = solve(lo, hi, th => dist(settle({ ...k, bodyAngle: th }, true).pt.glenoidR, W), reach * 55);
}
// forearm contacts: bodyAngle where the elbow sits under the shoulder at the true humerus length. Fixed point, because
// the scapula (and so the shoulder) moves with the arm: solve FK first, then re-solve with the planted forearm.
export function elbowsUnder(c, settle, keys, sd, { dx = .5, dz = -1.5, lo = 4, hi = 45 } = {}) {
  const k = c.keys[keys[0]], h = 3.4 + Math.sqrt(30 * 30 - dx * dx - dz * dz);
  for (let i = 0; i < 5; i++) {
    const fk = i === 0;
    const th = solve(lo, hi, t => settle({ ...k, bodyAngle: t }, fk).pt['glenoid' + sd][1], h);
    const g = settle({ ...k, bodyAngle: th }, fk).pt['glenoid' + sd];
    c._ex = g[0] + dx; c._ez = g[2] + dz * Math.sign(g[2] || 1);
    for (const n of keys) c.keys[n].bodyAngle = th;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// pike family: inverted V, balls of the feet at height fy, hands on the floor where the hip-shoulder line meets it
// ---------------------------------------------------------------------------------------------------------------
export function pike(f) {
  const c = {
    floor: true, trail: ['headTop'], still: .45, fy: 0, pitch0: 136, reachLeg: 93,
    lag: .14, headLag: .3, shift: .2, shiftRoll: .4, _hx: 60, _hz: 20, _bx: -40,
    legs: { both: { mode: 'ik', foot: 'toes', knee: 4, toeOut: 5, ball: (sd, s) => [c._bx, c.fy, 10 * s], pole: () => [.87, -.5, 0] } },
    arms: { both: { mode: 'ik', grip: 'palm', pole: [-.2, -1, .4], dir: s => [1, 0, .1 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { wrist: 0, fingers: 0 },
    keys: { top: {}, bottom: {} },
    timeline: rep('top', 'bottom', { ecc: 2, con: 1.1 }),
    prep({ settle }) {
      const k = c.keys, t = k.top = { rootX: 0, rootY: 80, pitch: c.pitch0, lumbar: -2, thoracic: -3, cervical: -2, head: -4, scapElev: .8, scapProt: 4, ...k.top };
      // top: arms continue the hip-shoulder line to the floor at 97.5% reach (upside-down V)
      const aim = S => { const G = S.pt.glenoidR, d = nrm3(sub3(G, S.pt.pelvis)), u = (G[1] - 2.4) / -d[1]; return { G, W: [G[0] + d[0] * u, 2.4, G[2] + 2.5] }; };
      t.rootY = solve(40, 140, y => { const { G, W } = aim(settle({ ...t, rootY: y }, true)); return dist(G, W); }, .975 * 55);
      const S = settle(t, true), { W } = aim(S), H = S.pt.hipR;
      c._hx = W[0] + 5.2; c._hz = W[2];
      c._bx = H[0] - Math.sqrt(Math.max(0, c.reachLeg ** 2 - (H[1] - c.fy) ** 2));
      // bottom: hips drift forward, trunk goes vertical, head lowers in front of the hands
      const path = u => ({ ...t, rootX: 16 * u, rootY: t.rootY - 7 * u, pitch: t.pitch + 6 * u, cervical: -2 - 14 * u, head: -4 - 6 * u,
        thoracic: -3 - 2 * u, scapElev: .8 - 1 * u, scapProt: 4 - 6 * u });
      const low = S => Math.min(S.pt.headTop[1], S.pt.nose[1], S.pt.chin[1]);
      k.bottom = path(solve(0, 2.5, u => low(settle(path(u))), 6.5));
    },
  };
  return Object.assign(c, f(c));
}
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm3 = a => { const l = Math.hypot(...a) || 1; return a.map(v => v / l); };

// ---------------------------------------------------------------------------------------------------------------
// hanging family (pull-up frame): bar at BAR_Y along z, grip at ±gz, legs hang. Keys hang / init / mid / top.
// ---------------------------------------------------------------------------------------------------------------
export const BAR_Y = 226;
export function hang(f) {
  const c = {
    cam: { az: 24, el: 6 }, floor: true, bar: { y: BAR_Y, w: 52, posts: 'down' }, trail: ['chin'], still: .1,   // free-standing frame
    lag: .15, headLag: .3, shift: .3, shiftRoll: .5, gz: 25,
    arms: { both: { mode: 'ik', grip: 'bar', pole: [.35, -.25, 1], target: (sd, s) => [0, BAR_Y, c.gz * s] } },
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
    prep({ build }) { hangHeights(c, build); },
  };
  return Object.assign(c, f(c));
}
// dead hang: arms at 99.3% of full reach; top: chin 3 cm over the bar
export function hangHeights(c, build) {
  const k = c.keys;
  k.hang.rootY = solve(80, 160, y => build({ ...k.hang, rootY: y }).reach, .993); k.init.rootY = k.hang.rootY + 4;
  k.top.rootY = solve(130, 190, y => build({ ...k.top, rootY: y }).pt.chin[1], BAR_Y + 3) + .05;
  k.mid.rootY = k.hang.rootY + (k.top.rootY - k.hang.rootY) * .6;
}

// ---------------------------------------------------------------------------------------------------------------
// row family: supine rigid body pivoting on the heels (the feet rock on the heel), hands on a grip line at (0, gy, ±gz)
// ---------------------------------------------------------------------------------------------------------------
export function row(f) {
  const c = {
    cam: { az: 24, el: 8 }, floor: true, trail: ['sternum'], still: .1, gy: 100, gz: 26,
    lag: .14, headLag: .35, shift: .2, shiftRoll: .4, L: 91, _fx: 120, _poff: 0,
    legs: { both: { mode: 'ik', foot: 'heel', knee: 2, toeOut: 6, heel: (sd, s) => [c._fx, 0, 10 * s], pole: () => [0, 1, 0] } },
    arms: { both: { mode: 'ik', grip: 'bar', pole: [-1, -.35, .75], target: (sd, s) => [0, c.gy, c.gz * s] } },
    base: { cervical: 2, head: -3, fingers: 200, thoracic: -2 },
    derive(ch, lag) {
      const th = ch.bodyAngle, r = (th + .4 * (lag.bodyAngle - th)) * R;
      ch.rootX = c._fx - c.L * Math.cos(r); ch.rootY = c.L * Math.sin(r) + 1;
      ch.pitch = th - 90 + c._poff + .6 * (lag.bodyAngle - th);
    },
    keys: {
      bottom: { bodyAngle: 18, scapProt: 9, scapElev: .6 },
      top: { bodyAngle: 30, scapProt: -15, scapElev: -.6, thoracic: -7, head: -5 },
    },
    timeline: repUp('bottom', 'top', { con: 1.0, p1: .45, ecc: 1.9 }),
    prep({ settle }) { rowGeometry(c, settle); },
  };
  return Object.assign(c, f(c));
}
export function rowGeometry(c, settle, topGap = 7, reach = .985) {
  const k = c.keys, B = [0, c.gy, c.gz];
  fit(() => c._poff, v => { c._poff = v; }, () => { const S = settle({ ...k.bottom, bodyAngle: 20 }, true); return angXY(S.pt.pelvis, S.pt.glenoidR) - angXY([c._fx, 0], S.pt.pelvis) + .8; });
  // bottom: shoulders under the grip, arms at 98.5% reach
  const place = th => { c._fx = 0; const G = settle({ ...k.bottom, bodyAngle: th }, true).pt.glenoidR; c._fx = -1 - G[0]; };
  k.bottom.bodyAngle = solve(3, 45, th => { place(th); return dist(settle({ ...k.bottom, bodyAngle: th }, true).pt.glenoidR, B); }, 6.6 + reach * 55);
  place(k.bottom.bodyAngle);
  // top: chest topGap cm under the grip line
  k.top.bodyAngle = solve(k.bottom.bodyAngle, 60, th => settle({ ...k.top, bodyAngle: th }).pt.sternum[1], c.gy - topGap);
}

// ---------------------------------------------------------------------------------------------------------------
// stepping helpers (core leg mode 'step'; see taichi.js for the conventions)
// ---------------------------------------------------------------------------------------------------------------
// feet in world terms: { R: [x, worldZ, toeOut, lift, pitch, pivot], L: [...] } -> sided channels (footZ is lateral: *side).
// x / z locate the heel, or the ball when pivot = 1 (a foot that turns on its ball: woodchop back foot)
export const feet = f => Object.fromEntries(Object.entries(f).flatMap(([sd, [x, z, turn = 4, lift = 0, pitch = 0, pivot = 0]]) => {
  const s = sd === 'R' ? 1 : -1;
  return [['footX' + sd, x], ['footZ' + sd, z * s], ['footTurn' + sd, turn], ['footLift' + sd, lift], ['footPitch' + sd, pitch], ['footPivot' + sd, pivot]];
}));
// read back world feet from a key (to shift / mirror the second half of a cycle)
export const feetOf = k => Object.fromEntries(['R', 'L'].map(sd => [sd, [k['footX' + sd], k['footZ' + sd] * (sd === 'R' ? 1 : -1), k['footTurn' + sd], k['footLift' + sd], k['footPitch' + sd]]]));
export const mix = (a, b, u) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(k => [k, (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * u]));
export const noFeet = k => Object.fromEntries(Object.entries(k).filter(([n]) => !n.startsWith('foot')));
// swing keys for one foot between footholds fa -> fb ([heelX, worldZ, toeOut, lift, pitch]); a, b = the phase's end
// keys. The foot clears the floor before it travels and travels before it sets down (no scuffing); mid overrides the
// mid-swing foothold (e.g. passing the standing ankle). Returns [keys, phase] for a timeline entry.
export function swing(k, name, from, to, sd, fa, fb, { mid, lift = 6, dur, breath } = {}) {
  const U = [.22, .5, .78], T = [.06, .5, .95], H = [lift * .75, lift, lift * .7];
  const vias = U.map((u, i) => {
    const t = T[i], f = i === 1 && mid ? mid.slice() : fa.map((v, j) => v + (fb[j] - v) * t);
    f[3] = H[i]; if (!(i === 1 && mid)) f[4] = i === 0 ? Math.min(0, fa[4] ?? 0) * .5 : i === 2 ? (fb[4] ?? 0) * .5 : 0;   // heel strike only at the end
    k[name + i] = { ...mix(k[from], k[to], u), ...feet({ [sd]: f }) };
    return name + i;
  });
  return { from, via: vias, to, at: [0, ...U, 1], dur, r1: .2, r2: .25, breath };
}
// knees track the toes
export const stepLegs = { both: { mode: 'ik', foot: 'step', pole: (s, ch) => { const t = ch['footTurn' + (s > 0 ? 'R' : 'L')] * R; return [Math.cos(t), .05, s * (Math.sin(t) + .08)]; } } };


// ---------------------------------------------------------------------------------------------------------------
// side plank rig on the left forearm, facing the camera: body line tilted up by bodyAngle in the picture plane
// (yaw -90, roll = bodyAngle - 90). Feet stacked (left foot on its outer edge); the elbow under the shoulder is solved
// in prep. The right arm is the clip's (FK by default).
// ---------------------------------------------------------------------------------------------------------------
// all fours: the right knee pinned, hands planted under the shoulders at 97% reach (bird dog, thread the needle, cat-cow)
export function quad(f) {
  const c = {
    floor: true, lag: .2, headLag: .3, shift: 0, shiftRoll: 0, _hx: 50, _hz: 18,
    pin: { pt: S => S.pt.kneeR, at: [0, 6.2] },
    arms: { both: { mode: 'ik', grip: 'palm', arc: 6, pole: [-.5, -1, .6], dir: s => [1, 0, .08 * s], target: (sd, s) => [c._hx, 0, c._hz * s] } },
    base: { pitch: 90, hipFlex: 90, knee: 96, ankle: 86, cervical: 2, head: -6, thoracic: 0, lumbar: 1, wrist: 0 },
    prep({ settle }) {
      const q = c.keys.quad;   // pitch so the arm hangs straight (97%) to a hand under the shoulder
      q.pitch = solve(75, 110, p => { const g = settle({ ...q, pitch: p }, true).pt.glenoidR; return g[1] - 2.4; }, .97 * 55);
      const g = settle(q, true).pt.glenoidR; c._hx = g[0] + 5.2; c._hz = g[2] + 1;
      for (const k in c.keys) if (c.keys[k].pitch == null) c.keys[k].pitch = q.pitch + (c.keys[k].dp || 0);   // dp: lower the chest
    },
  };
  const o = f(c);
  return Object.assign(c, o, { prep: c.prep });
}

// standing: two planted feet (stepping legs, constant), weight shared by the keyed 'weight'; free hands
// a free hand target for an arm raised el degrees from hanging (90 = horizontal, 180 = overhead), in a plane turned az
// degrees from straight ahead (0) to straight out to the side (90; negative: across the body), r cm from the shoulder
// to the wrist (about 53 straight, less for soft elbows). Returns the T4-frame target of a standing trunk (the T4 frame
// leans forward about 21°; the glenoid sits at about (2, 3, 15.5) in it), with optional extra channels. side: 'R'/'L'
// for one hand only (sided channel names), else both.
export function arm(el, az, r = 52.8, extra = {}, side = '') {
  const e = el * R, a = az * R, wx = Math.sin(e) * Math.cos(a), wy = -Math.cos(e), wz = Math.sin(e) * Math.sin(a);
  const o = { handX: +(1.9 + r * (wx * .934 - wy * .356)).toFixed(1), handY: +(3.3 + r * (wx * .356 + wy * .934)).toFixed(1), handZ: +(15.5 + r * wz).toFixed(1), ...extra };
  return side ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k + side, v])) : o;
}
export const HANG = { handX: 3, handY: -42, handZ: 21, palm: 90, fingers: 25, wrist: 4 };   // arms hanging loose by the thighs
export const stand = (feetAt, over) => ({
  floor: true, lag: .2, headLag: .4, shift: 0, shiftRoll: 0, stepBalance: true, legs: stepLegs,
  arms: { both: { mode: 'ik', grip: 'free', pole: [-.3, -1, .5] } },
  ...over,
  base: { rootY: 88, pitch: 2, weight: .5, ...HANG, ...feet(feetAt), ...(over.base || {}) },
});

export function sidePlank(f) {
  const c = {
    cam: { az: 14, el: 13 }, floor: true, floorZ: 42, lag: .2, headLag: .2, shift: 0, shiftRoll: 0, L: 85.3, _ex: 100, _ez: 0,
    // left ankle 4.3 cm up (foot on its outer edge), right ankle stacked 8.6 cm above it along the body's right
    legs: { both: { mode: 'ik', foot: 'fixed', pole: () => [0, 0, 1],
      ankle: (sd, s, ch) => { const r = ch.bodyAngle * R, k = s > 0 ? 8.6 : 0; return [-k * Math.sin(r), 4.3 + k * Math.cos(r), 0]; },
      axes: (sd, s, ch) => { const r = ch.bodyAngle * R; return [[0, 0, 1], [Math.cos(r), Math.sin(r), 0], [-s * Math.sin(r), s * Math.cos(r), 0]]; } } },
    arms: { L: { mode: 'ik', grip: 'forearm', dir: () => [.3, 0, 1], target: () => [c._ex, 3.4, c._ez] } },
    derive(ch) {
      const r = ch.bodyAngle * R, up = [Math.cos(r), Math.sin(r)], rt = [-Math.sin(r), Math.cos(r)];
      const m = [4.3 * rt[0], 4.3 + 4.3 * rt[1]];              // between the stacked ankles
      ch.rootX = m[0] + up[0] * c.L; ch.rootY = m[1] + up[1] * c.L; ch.rootZ = 0;
      ch.roll = ch.bodyAngle - 90; ch.pitch = 0;
    },
    prep({ settle }) { elbowsUnder(c, settle, Object.keys(c.keys), 'L', { dx: 0, dz: 0, lo: 5 }); },
  };
  const o = f(c), arms = o.arms ? { ...c.arms, ...o.arms } : c.arms;
  return Object.assign(c, o, { arms });
}
