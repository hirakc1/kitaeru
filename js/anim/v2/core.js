// Kitaeru animation v2: renderer-independent 3D motion core (prototype).
//
// One 3D rig drives both prototype renderers (2.5D anatomical plate in SVG, and three.js).
//   Units: cm. World axes: x = forward (the body faces +x), y = up, z = the body's right.
//   Timeline: a clip is a list of phases (hold / move / cyclic) with real tempo in seconds.
//     - move: keys are interpolated with a natural cubic spline (C2) in progress u, and u(t) is a C2 tempo
//       profile with u' = u'' = 0 at both ends, so the loop is C2: joints stop only where the movement really
//       reverses (top / bottom of a rep), never at intermediate keys.
//     - cyclic: a periodic C2 spline through all keys at constant rate (Tai Chi: continuous, no rep bounce).
//   Contacts are planted with analytic two-bone IK (arms and legs); planted points never move.
//   Secondary motion: distributed spine curvature, scapulohumeral rhythm, delayed head follow-through,
//     breathing synced to the rep (inhale lowering, exhale on the effort), a small weight shift.
// Everything is a pure function of time, so seek() and play() always agree, and poses can be mirrored / blended.

export const DEG = Math.PI / 180;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const madd = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const nrm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
export const perp = (v, d) => nrm(madd(v, d, -dot(v, d)));
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// 3x3 rotation matrices, row-major
export const rx = d => { const c = Math.cos(d * DEG), s = Math.sin(d * DEG); return [1, 0, 0, 0, c, -s, 0, s, c]; };
export const ry = d => { const c = Math.cos(d * DEG), s = Math.sin(d * DEG); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
export const rz = d => { const c = Math.cos(d * DEG), s = Math.sin(d * DEG); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
export const mm = (a, b) => {
  const o = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return o;
};
export const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const col = (m, i) => [m[i], m[3 + i], m[6 + i]];
const MZ = [1, 0, 0, 0, 1, 0, 0, 0, -1];

// A frame is { o, x, y, z }. Axial frames: x fwd, y up, z = body right.
// Sided frames (limbs, scapula, hand, foot): x = anterior, y = along the bone (distal) or up, z = lateral (outwards).
export const frameR = (o, R) => ({ o, x: col(R, 0), y: col(R, 1), z: col(R, 2), R });
export const P = (F, v) => [F.o[0] + F.x[0] * v[0] + F.y[0] * v[1] + F.z[0] * v[2],
  F.o[1] + F.x[1] * v[0] + F.y[1] * v[1] + F.z[1] * v[2], F.o[2] + F.x[2] * v[0] + F.y[2] * v[1] + F.z[2] * v[2]];

// ---------------------------------------------------------------------------------------------------------------
// Anatomy (cm, ~175 cm adult)
// ---------------------------------------------------------------------------------------------------------------
export const LEN = { humerus: 30, fore: 25, femur: 44, tibia: 42, ankleH: 7.5 };
export const HIP_W = 9;
export const SACRUM = [-4.6, 9.4, 0];
const SACRAL_TILT = 25;

// spine, bottom-up: L5..L1, T12..T1, C7..C1. k = rest curvature per level (+ = flexion), w* = motion weights
export const SPINE = [];
{
  const lw = [.24, .23, .2, .18, .15];
  for (let i = 0; i < 5; i++) SPINE.push({ name: 'L' + (5 - i), reg: 'L', h: 3.75, k: -7.6, wl: lw[i], wt: 0, wc: 0, wb: .08, wx: .02, d: 3.7, w: 5 });
  let st = 0; const tw = []; for (let i = 0; i < 12; i++) { tw.push(1.5 - i / 11); st += 1.5 - i / 11; }
  for (let i = 0; i < 12; i++) SPINE.push({ name: 'T' + (12 - i), reg: 'T', h: 2.42, k: 3.4, wl: 0, wt: tw[i] / st, wc: 0, wb: .037, wx: .062, d: 2.4 + .1 * (11 - i), w: 3 + .12 * (11 - i) });
  for (let i = 0; i < 7; i++) SPINE.push({ name: 'C' + (7 - i), reg: 'C', h: 1.74, k: -4.6, wl: 0, wt: 0, wc: 1 / 7, wb: .02, wx: .03, d: 1.6, w: 2.3 });
}
export const T_INDEX = k => 5 + (12 - k);

// ribs k = 1..12 in the local frame of Tk: [half-width, half-depth, anterior drop, end angle (x pi), cartilage from]
export const RIBS = [
  null,
  [5.8, 4.4, 3.4, 1, .8], [8.6, 5.6, 5.2, 1, .76], [10.4, 6.8, 6.6, 1, .74], [11.8, 7.8, 7.6, 1, .73],
  [12.8, 8.6, 8.4, 1, .72], [13.5, 9.1, 9, 1, .71], [13.9, 9.5, 9.4, 1, .7], [14, 9.6, 9.4, .92, .7],
  [13.7, 9.4, 8.6, .86, .7], [13.1, 8.9, 7.4, .8, .7], [12, 8.1, 5, .55, 2], [10.6, 7, 3.6, .42, 2],
];
export function ribPoint(k, s, f, b = 0) {
  const [az, ax, drop, end, cart] = RIBS[k];
  const ph = f * end * Math.PI;
  const e = 1 + .035 * b, lift = 1 - .08 * b;                 // bucket handle: wider and less sloped on the inhale
  const back = 3.2 * Math.sin(ph) * Math.pow(1 - ph / Math.PI, 1.5);
  const x = (ax - 2.4 - ax * Math.cos(ph)) * e - back;
  const z = s * (2 + (az - 2) * Math.sin(ph) * e);
  let y = 1.1 - drop * lift * (1 - Math.cos(ph)) / 2;
  if (end < 1 && f > cart / end) y += (f - cart / end) * drop * .9;
  return [x, y, z];
}
export const ribCartilage = k => RIBS[k][4] / RIBS[k][3];

// scapula (right side; x anterior, y up, z lateral)
export const SCAP = {
  pivot: [-2.4, -1.8, 8.6], protCentre: [3, -2, 0], glenoid: [4.3, 4.6, 7.2],
  outline: [[-1, 6.6, -2.1], [1.5, 6.9, 2.4], [3.4, 6.3, 4.6], [4.4, 5.6, 6.6], [4.3, 3.4, 6.9], [3, 1.4, 6.2], [1.4, -3.4, 4.5],
    [-.4, -9.6, 1.4], [-1.4, -5, -1.4], [-1.6, 1.6, -2.3]],
  spine: [[-2.1, 3.4, -1.8], [-1.9, 4.6, 2], [-.6, 6.2, 5.4], [1.4, 7.2, 7.6], [3.6, 7.4, 8.3]],
  coracoid: [[3.4, 6.2, 4.6], [6.3, 6.3, 5.2], [7.4, 5.2, 5.7]],
  acromion: [3.6, 7.4, 8.3],
};
export const FOOT = { heel: [-5.6, -6.2, .3], ball: [14.2, -7.1, 0], toe: [20.8, -7.2, -.6] };
export const TMJ = [.8, 1.3];

// ---------------------------------------------------------------------------------------------------------------
// Tempo + splines
// ---------------------------------------------------------------------------------------------------------------
const I5 = x => x * x * x * x * (x * x - 3 * x + 2.5);        // integral of smootherstep
// progress with a C2 velocity profile: ramp up over r1, cruise, ramp down over r2
export function tempo(tau, r1 = .3, r2 = .3) {
  tau = clamp(tau, 0, 1);
  const A = 1 - (r1 + r2) / 2;
  let U;
  if (tau < r1) U = r1 * I5(tau / r1);
  else if (tau > 1 - r2) U = A - r2 * I5((1 - tau) / r2);
  else U = r1 / 2 + (tau - r1);
  return U / A;
}
function naturalSpline(xs, ys) {
  const n = xs.length;
  if (n === 2) return x => ys[0] + (ys[1] - ys[0]) * (x - xs[0]) / (xs[1] - xs[0]);
  const y2 = new Array(n).fill(0), u = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    const sig = (xs[i] - xs[i - 1]) / (xs[i + 1] - xs[i - 1]), p = sig * y2[i - 1] + 2;
    y2[i] = (sig - 1) / p;
    const d = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) - (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1]);
    u[i] = (6 * d / (xs[i + 1] - xs[i - 1]) - sig * u[i - 1]) / p;
  }
  for (let k = n - 2; k >= 0; k--) y2[k] = y2[k] * y2[k + 1] + u[k];
  return x => segEval(xs, ys, y2, x);
}
function segEval(xs, ys, y2, x) {
  let k = 0; const n = xs.length; while (k < n - 2 && x > xs[k + 1]) k++;
  const h = xs[k + 1] - xs[k], a = (xs[k + 1] - x) / h, b = (x - xs[k]) / h;
  return a * ys[k] + b * ys[k + 1] + ((a * a * a - a) * y2[k] + (b * b * b - b) * y2[k + 1]) * h * h / 6;
}
// periodic cubic spline through n values at uniform spacing on [0,1)
function periodicSpline(vals) {
  const n = vals.length, h = 1 / n;
  const A = [], r = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[(i - 1 + n) % n] += 1; row[i] += 4; row[(i + 1) % n] += 1;
    A.push(row); r.push(6 / (h * h) * (vals[(i + 1) % n] - 2 * vals[i] + vals[(i - 1 + n) % n]));
  }
  const M = gauss(A, r);
  const xs = [...vals.map((_, i) => i * h), 1], ys = [...vals, vals[0]], y2 = [...M, M[0]];
  return x => segEval(xs, ys, y2, ((x % 1) + 1) % 1);
}
function gauss(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
    for (let r = i + 1; r < n; r++) { const k = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= k * A[i][c]; b[r] -= k * b[i]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let t = b[i]; for (let c = i + 1; c < n; c++) t -= A[i][c] * x[c]; x[i] = t / A[i][i]; }
  return x;
}

// ---------------------------------------------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------------------------------------------
const SIDED = ['scapElev', 'scapProt', 'scapUp', 'shFlex', 'shAbd', 'elbow', 'wrist', 'palm', 'fingers', 'handX', 'handY', 'handZ',
  'hipFlex', 'hipAbd', 'knee', 'ankle'];
const AXIAL = ['rootX', 'rootY', 'rootZ', 'pitch', 'yaw', 'roll', 'lumbar', 'thoracic', 'cervical', 'head', 'headYaw', 'bend', 'twist',
  'jaw', 'bodyAngle'];
export const CHANNELS = [...AXIAL, ...SIDED.flatMap(k => [k + 'R', k + 'L'])];
export const expand = pose => {
  const o = {};
  for (const k in pose) {
    if (SIDED.includes(k)) { if (!((k + 'R') in pose)) o[k + 'R'] = pose[k]; if (!((k + 'L') in pose)) o[k + 'L'] = pose[k]; }
    else o[k] = pose[k];
  }
  return o;
};
// Mirror a pose left <-> right (for 'side: both' repeats in flows)
const MIRROR_NEG = new Set(['rootZ', 'yaw', 'roll', 'bend', 'twist', 'headYaw']);
export function mirrorPose(p) {
  const o = {};
  for (const k in p) {
    const m = /^(.*)([RL])$/.exec(k);
    if (m && SIDED.includes(m[1])) o[m[1] + (m[2] === 'R' ? 'L' : 'R')] = p[k];
    else o[k] = MIRROR_NEG.has(k) ? -p[k] : p[k];
  }
  return o;
}

export function compile(clip) {
  prepare(clip);
  if (clip._c) return clip._c;
  const base = expand(clip.base || {});
  const key = name => ({ ...base, ...expand(clip.keys[name]) });
  let t0 = 0;
  const phases = clip.timeline.map(ph => {
    const p = { ...ph, t0 };
    t0 += ph.dur;
    if (ph.hold) { p.pose = key(ph.hold); return p; }
    const names = ph.cyclic ? ph.cyclic : [ph.from, ...(ph.via || []), ph.to];
    const poses = names.map(key);
    const xs = ph.at || names.map((_, i) => i / (names.length - 1));
    p.spl = {};
    for (const c of CHANNELS) {
      const ys = poses.map(q => q[c] ?? 0);
      p.spl[c] = ys.every(y => y === ys[0]) ? (() => ys[0]) : ph.cyclic ? periodicSpline(ys) : naturalSpline(xs, ys);
    }
    return p;
  });
  return (clip._c = { phases, T: t0 });
}

export function sample(clip, ts) {
  const { phases, T } = compile(clip);
  ts = ((ts % T) + T) % T;
  let ph = phases[phases.length - 1];
  for (const p of phases) if (ts < p.t0 + p.dur) { ph = p; break; }
  const tau = (ts - ph.t0) / ph.dur;
  const ch = {};
  let u = 0;
  if (ph.hold) for (const c of CHANNELS) ch[c] = ph.pose[c] ?? 0;
  else {
    u = ph.cyclic ? tau : tempo(tau, ph.r1 ?? .3, ph.r2 ?? .3);
    for (const c of CHANNELS) ch[c] = ph.spl[c](u);
  }
  let b;
  if (ph.breath === 'in') b = u; else if (ph.breath === 'out') b = 1 - u;
  else if (ph.breath === 'cycle') b = .5 - .5 * Math.cos(2 * Math.PI * (u * (ph.breaths || 1)));
  else b = ph.b ?? .5;
  return { ch, ts, T, phase: ph, u, tau, breath: clamp(b, 0, 1) };
}

// ---------------------------------------------------------------------------------------------------------------
// IK
// ---------------------------------------------------------------------------------------------------------------
export function ik2(A, T, la, lb, pole) {
  const d = sub(T, A), L0 = len(d) || 1e-6, dirv = mul(d, 1 / L0);
  const L = clamp(L0, Math.abs(la - lb) + 1e-3, la + lb - 1e-4);
  const x = (la * la - lb * lb + L * L) / (2 * L), h = Math.sqrt(Math.max(0, la * la - x * x));
  const p = perp(pole, dirv);
  const mid = add(A, add(mul(dirv, x), mul(p, h)));
  return { mid, end: madd(A, dirv, L), reach: L0 / (la + lb) };
}
// frames for a two-segment limb A-B-C; ant1 = anterior of the upper segment (elbow flexes towards it)
function limbFrames(A, B, C, ant1, s) {
  const d1 = nrm(sub(B, A)), d2 = nrm(sub(C, B));
  const a1 = perp(ant1, d1);
  const n = nrm(cross(d1, a1));
  const a2 = nrm(cross(n, d2));
  const l = mul(n, s);
  return [{ o: A, x: a1, y: d1, z: l, len: len(sub(B, A)) }, { o: B, x: a2, y: d2, z: l, len: len(sub(C, B)) }];
}

// ---------------------------------------------------------------------------------------------------------------
// Build the skeleton for a channel set
// ---------------------------------------------------------------------------------------------------------------
export const SIDES = [['R', 1], ['L', -1]];

export function build(ch, ctx) {
  const b = ctx.breath ?? .5;
  const S = { F: {}, pt: {}, breath: b, vert: [], ch };
  const Rp = mm(ry(ch.yaw), mm(rz(-ch.pitch), rx(ch.roll)));
  const pel = frameR([ch.rootX, ch.rootY, ch.rootZ], Rp);
  S.F.pelvis = pel;
  let R = mm(Rp, rz(-SACRAL_TILT)), o = P(pel, SACRUM);
  const thor = ch.thoracic - 3 * (b - .5);
  let acc = 0;
  for (const v of SPINE) {
    const flex = v.k + ch.lumbar * v.wl + thor * v.wt + ch.cervical * v.wc;
    R = mm(R, mm(rz(-flex), mm(rx(ch.bend * v.wb), ry(ch.twist * v.wx))));
    acc += v.k;
    const F = frameR(o, R); F.v = v; F.acc = acc;
    S.vert.push(F);
    o = madd(o, F.y, v.h);
  }
  // rib frames: each rib follows its vertebra's motion, but not the rest kyphosis (the cage keeps its oval shape)
  S.rib = [null];
  const acc6 = S.vert[T_INDEX(6)].acc;
  for (let k = 1; k <= 12; k++) { const V = S.vert[T_INDEX(k)]; S.rib.push(frameR(V.o, mm(V.R, rz(V.acc - acc6)))); }
  S.F.head = frameR(o, mm(R, mm(ry(ch.headYaw), rz(-ch.head))));
  S.F.jaw = jawFrame(S.F.head, ch.jaw + 3 * (1 - b));
  S.F.T4 = S.vert[T_INDEX(4)];
  const ribEnd = k => { const T = S.rib[k]; return lerp3(P(T, ribPoint(k, 1, 1, b)), P(T, ribPoint(k, -1, 1, b)), .5); };
  const top = madd(ribEnd(1), S.rib[1].y, 1.2), low = ribEnd(7);
  const sy = nrm(sub(low, top)), sx = perp(S.F.T4.x, sy);
  S.F.sternum = { o: top, x: sx, y: sy, z: nrm(cross(sx, sy)), len: len(sub(low, top)) + 3.4 };
  S.F.sternum.z = mul(S.F.sternum.z, -1);      // z = body right
  for (const [sd, s] of SIDES) leg(S, ch, ctx, sd, s);
  for (const [sd, s] of SIDES) arm(S, ch, ctx, sd, s);
  let cm = [0, 0, 0], mt = 0;
  const m = (k, p) => { cm = madd(cm, p, k); mt += k; };
  m(.081, P(S.F.head, [2, 7, 0])); m(.497, lerp3(pel.o, S.vert[T_INDEX(3)].o, .45));
  for (const [sd] of SIDES) {
    const q = n => S.pt[n + sd];
    m(.028, lerp3(q('glenoid'), q('elbow'), .44)); m(.016, lerp3(q('elbow'), q('wrist'), .43)); m(.006, q('palm'));
    m(.1, lerp3(q('hip'), q('knee'), .43)); m(.0465, lerp3(q('knee'), q('ankle'), .43)); m(.0145, lerp3(q('heel'), q('ball'), .5));
  }
  S.com = mul(cm, 1 / mt);
  S.pt.sternum = P(S.F.sternum, [0, 6, 0]);
  S.pt.chin = P(S.F.jaw, [10.9, -7.2, 0]);
  S.pt.headTop = P(S.F.head, [2.5, 16, 0]);
  S.pt.nose = P(S.F.head, [11, 2, 0]);
  S.pt.pelvis = pel.o;
  return S;
}

function jawFrame(H, ang) {
  const R = mm(H.R, rz(-ang));
  const piv = P(H, [TMJ[0], TMJ[1], 0]);
  const F = frameR(piv, R);
  F.o = sub(piv, mv(R, [TMJ[0], TMJ[1], 0]));
  return F;
}

function scapula(S, ch, sd, s, extraUp) {
  const T4 = S.F.T4;
  const prot = ch['scapProt' + sd], up = ch['scapUp' + sd] + extraUp, elev = ch['scapElev' + sd];
  const Rl = mm(ry(s * prot), rx(-s * up));
  const pv = [SCAP.pivot[0], SCAP.pivot[1] + elev, SCAP.pivot[2] * s];
  const C = SCAP.protCentre;
  const pv2 = add(C, mv(ry(s * prot), sub(pv, C)));
  const F = frameR(P(T4, pv2), mm(T4.R, s < 0 ? mm(Rl, MZ) : Rl));
  F.side = s;
  return F;
}

function arm(S, ch, ctx, sd, s) {
  const clip = ctx.clip, T4 = S.F.T4;
  const spec = (!ctx.fk && (clip.arms?.[sd] || clip.arms?.both)) || { mode: 'fk' };
  let extra = 0, res;
  for (let it = 0; it < 4; it++) {
    const sc = scapula(S, ch, sd, s, extra);
    const G = P(sc, SCAP.glenoid);
    res = spec.mode === 'ik' ? armIK(S, ch, G, spec, sd, s, T4) : armFK(ch, G, sd, s, T4);
    res.scap = sc; res.G = G;
    // scapulohumeral rhythm: about a third of arm elevation above 25 deg comes from scapular upward rotation
    const elev = Math.acos(clamp(dot(nrm(sub(res.E, G)), mul(T4.y, -1)), -1, 1)) / DEG;
    const want = .34 * Math.max(0, elev - 25) - .15 * Math.max(0, 20 - elev);
    if (Math.abs(want - extra) < .05) break;
    extra = want;
  }
  const { G, E, W, ant, scap } = res;
  if (res.herr != null) S.humerusErr = Math.max(S.humerusErr || 0, res.herr);   // QA: upper-arm stretch with a planted elbow
  S.F['scapula' + sd] = scap;
  const [hu, fo] = limbFrames(G, E, W, ant, s);
  S.F['humerus' + sd] = hu; S.F['fore' + sd] = fo;
  const hand = res.hand || handFrame(fo, ch['wrist' + sd], ch['palm' + sd], s);
  hand.fingers = ch['fingers' + sd] ?? 0;
  S.F['hand' + sd] = hand;
  S.pt['glenoid' + sd] = G; S.pt['elbow' + sd] = E; S.pt['wrist' + sd] = W;
  S.pt['palm' + sd] = P(hand, [0, 5, 0]);
  S.pt['finger' + sd] = P(hand, [0, 17, 0]);
  S.pt['acromion' + sd] = P(scap, SCAP.acromion);
  S.pt['clavSternal' + sd] = madd(P(S.F.sternum, [0, .2, 0]), S.F.sternum.z, 1.5 * s);
  S.pt['clavMid' + sd] = madd(lerp3(S.pt['clavSternal' + sd], S.pt['acromion' + sd], .45), T4.x, 1.2);
}

function armFK(ch, G, sd, s, T4) {
  const Rl = mm(rz(ch['shFlex' + sd]), rx(-s * ch['shAbd' + sd]));
  const R = mm(T4.R, Rl);
  const hd = nrm(mv(R, [0, -1, 0])), ant = nrm(mv(R, [1, 0, 0]));
  const E = madd(G, hd, LEN.humerus);
  const e = ch['elbow' + sd] * DEG;
  const fd = add(mul(hd, Math.cos(e)), mul(ant, Math.sin(e)));
  return { E, W: madd(E, fd, LEN.fore), ant };
}

function armIK(S, ch, G, spec, sd, s, T4) {
  const pl = spec.pole || [0, -1, 0];
  const pole = nrm(add(add(mul(T4.x, pl[0]), mul(T4.y, pl[1])), mul(T4.z, pl[2] * s)));
  let W, hand = null;
  // planted / bar hands: z = thumb side (medial when palm-down or overhand, lateral underhand), as for free hands
  if (spec.grip === 'palm') {                               // flat hand planted on a surface (floor; spec.normal: wall, bench)
    const c = spec.target(sd, s), n = spec.normal ? nrm(spec.normal(s)) : [0, 1, 0];
    const d = nrm(spec.dir(s)), a = mul(n, -1);
    W = madd(madd(c, d, -5.2), n, 2.4);
    hand = { o: W, x: a, y: d, z: mul(nrm(cross(a, d)), -s), len: 18, grip: 'palm' };
  } else if (spec.grip === 'forearm') {                     // forearm flat on the floor (forearm plank): elbow + hand planted
    const E = spec.target(sd, s), d = nrm(spec.dir(s)), a = [0, -1, 0];
    W = madd(E, d, LEN.fore);
    return { E, W, ant: d, herr: Math.abs(len(sub(E, G)) - LEN.humerus), hand: { o: W, x: a, y: d, z: mul(nrm(cross(a, d)), -s), len: 18, grip: 'palm' } };
  } else if (spec.grip === 'bar') {                          // hand wrapped around a bar: pivots about the bar axis
    const B = spec.target(sd, s);
    let dirv = nrm(sub(G, B));
    for (let i = 0; i < 3; i++) {
      W = madd(B, dirv, 6.6);
      const r = ik2(G, W, LEN.humerus, LEN.fore, pole);
      dirv = nrm(lerp3(nrm(sub(r.mid, B)), nrm(sub(G, B)), .35));
    }
    W = madd(B, dirv, 6.6);
    // palm faces forward (overhand); sup: underhand (chin-up); spec.palm(s): any other, e.g. neutral on dip bars / rings
    const d = nrm(sub(B, W)), a = perp(spec.palm ? spec.palm(s) : [spec.sup ? -1 : 1, 0, 0], d);
    hand = { o: W, x: a, y: d, z: mul(nrm(cross(a, d)), -s), len: 18, grip: 'bar', bar: B };
  } else {                                                   // free hand driven by a target in chest space
    W = P(T4, [ch['handX' + sd], ch['handY' + sd], ch['handZ' + sd] * s]);
  }
  const r = ik2(G, W, LEN.humerus, LEN.fore, pole);
  S.reach = Math.max(S.reach || 0, r.reach);
  return { E: r.mid, W: r.end, ant: mul(pole, -1), hand };
}

// hand from forearm: palm = pronation (0 palm forward / anatomical, 90 palm facing in, 180 palm back); wrist = flexion
function handFrame(fo, wr, pr, s) {
  const r = (pr || 0) * DEG, w = (wr || 0) * DEG;
  const a = nrm(add(mul(fo.x, Math.cos(r)), mul(fo.z, -Math.sin(r))));
  const z = nrm(add(mul(fo.z, Math.cos(r)), mul(fo.x, Math.sin(r))));
  const d = nrm(add(mul(fo.y, Math.cos(w)), mul(a, Math.sin(w))));
  const a2 = nrm(add(mul(a, Math.cos(w)), mul(fo.y, -Math.sin(w))));
  return { o: madd(fo.o, fo.y, fo.len), x: a2, y: d, z, len: 18, grip: 'free' };
}

function leg(S, ch, ctx, sd, s) {
  const clip = ctx.clip, pel = S.F.pelvis;
  const H = P(pel, [0, 0, HIP_W * s]);
  const spec = clip.legs?.[sd] || clip.legs?.both || { mode: 'fk' };
  let K, A, foot, ant;
  if (spec.mode === 'ik') {
    const pole = nrm(spec.pole(s, ch));
    if (spec.foot === 'flat') {
      const Rf = mm(ry(-s * (spec.toeOut ?? 10)), [1, 0, 0, 0, 1, 0, 0, 0, s]);
      A = spec.ankle(sd, s, ch);
      foot = frameR(A, Rf);
    } else if (spec.foot === 'fixed') {                     // planted in any orientation: axes = [toes, up, lateral] (world)
      const [x, y, z] = spec.axes(sd, s, ch);
      A = spec.ankle(sd, s, ch);
      foot = { o: A, x: nrm(x), y: nrm(y), z: nrm(z) };
    } else {                                                // pivoting on a planted point: 'toes' = ball + toes planted, heel lifts
      // as needed; 'heel' = heel planted, toes lift (rows). Foot pitch = spec.lift(s, ch) if given (split-squat back foot),
      // else solved so the knee has the flexion spec.knee (number or (s, ch) => deg)
      const heel = spec.foot === 'heel', yaw = -s * (spec.toeOut ?? 4);
      const piv = heel ? spec.heel(sd, s, ch) : spec.ball(sd, s, ch), off = heel ? FOOT.heel : FOOT.ball;
      const at = be => { const Rf = mm(ry(yaw), mm(rz(-be), [1, 0, 0, 0, 1, 0, 0, 0, s])); return { A: sub(piv, mv(Rf, off)), Rf }; };
      let be;
      if (spec.lift) be = spec.lift(s, ch);
      else {
        const kn = typeof spec.knee === 'function' ? spec.knee(s, ch) : (spec.knee ?? 2);
        const D = Math.sqrt(LEN.femur ** 2 + LEN.tibia ** 2 + 2 * LEN.femur * LEN.tibia * Math.cos(kn * DEG));
        const f = b => len(sub(H, at(b).A)) - D;
        let lo = heel ? -115 : 0, hi = heel ? 0 : 115;
        const up = f(lo) > f(hi);
        for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if ((f(m) > 0) === up) lo = m; else hi = m; }
        be = (lo + hi) / 2;
      }
      const r = at(be);
      A = r.A; foot = frameR(A, r.Rf);
      if (!heel) foot.toeFlat = mm(ry(yaw), [1, 0, 0, 0, 1, 0, 0, 0, s]);
    }
    const r = ik2(H, A, LEN.femur, LEN.tibia, pole);
    K = r.mid; A = r.end; ant = pole;
    S.reachLeg = Math.max(S.reachLeg || 0, r.reach);
  } else {
    const Rl = mm(pel.R, mm(rz(ch['hipFlex' + sd]), rx(-s * ch['hipAbd' + sd])));
    const td = nrm(mv(Rl, [0, -1, 0])); ant = nrm(mv(Rl, [1, 0, 0]));
    K = madd(H, td, LEN.femur);
    const k = ch['knee' + sd] * DEG;
    A = madd(K, add(mul(td, Math.cos(k)), mul(ant, -Math.sin(k))), LEN.tibia);
  }
  const [th, sh] = limbFrames(H, K, A, ant, s);
  if (!foot) {
    const an = (ch['ankle' + sd] ?? 0) * DEG;
    const fx = nrm(add(mul(sh.x, Math.cos(an)), mul(sh.y, Math.sin(an))));
    const fy = nrm(cross(mul(sh.z, s), fx));
    foot = { o: A, x: fx, y: fy, z: sh.z };
  }
  S.F['femur' + sd] = th; S.F['tibia' + sd] = sh; S.F['foot' + sd] = foot;
  S.pt['hip' + sd] = H; S.pt['knee' + sd] = K; S.pt['ankle' + sd] = A;
  S.pt['heel' + sd] = P(foot, FOOT.heel); S.pt['ball' + sd] = P(foot, FOOT.ball);
  S.pt['toe' + sd] = foot.toeFlat ? P(frameR(S.pt['ball' + sd], foot.toeFlat), [FOOT.toe[0] - FOOT.ball[0], FOOT.toe[1] - FOOT.ball[1], FOOT.toe[2]]) : P(foot, FOOT.toe);
  const kf = Math.acos(clamp(dot(th.y, sh.y), -1, 1));
  const pd = nrm(add(mul(th.x, Math.cos(kf * .5)), mul(th.y, Math.sin(kf * .5))));
  S.pt['patella' + sd] = madd(madd(K, pd, 3.3), th.y, -1.3);
}

// ---------------------------------------------------------------------------------------------------------------
// Pose at time (seconds): sample -> secondary motion -> derive -> build -> balance
// ---------------------------------------------------------------------------------------------------------------
export function poseAt(clip, ts) {
  prepare(clip);
  if (clip.swap) {                                  // unilateral: every other cycle is the mirror image (the other side)
    const T = compile(clip).T, u = ((ts % (2 * T)) + 2 * T) % (2 * T);
    return u >= T ? pose1(mirrored(clip), u - T) : pose1(clip, u);
  }
  return pose1(clip, ts);
}
function pose1(clip, ts) {
  const sm = sample(clip, ts);
  const ch = { ...sm.ch };
  const lag = clip.lag ? sample(clip, ts - clip.lag).ch : ch;
  const w = 2 * Math.PI * sm.ts / sm.T;
  // head follow-through: the head trails the trunk's rotation a little, then catches up
  ch.head += (clip.headLag ?? .35) * ((lag.pitch - ch.pitch) + (lag.bodyAngle - ch.bodyAngle) * .7);
  ch.headYaw += (clip.headLag ?? .35) * .5 * (lag.yaw + lag.twist - ch.yaw - ch.twist);
  // weight shift
  ch.rootZ += (clip.shift ?? .5) * Math.sin(w + .6);
  ch.roll += (clip.shiftRoll ?? .6) * Math.sin(w + 1.1);
  const ctx = { clip, breath: sm.breath, sm, lag };
  clip.derive?.(ch, lag, sm);
  let S = settle(clip, ch, ctx);
  if (clip.balance) {
    for (let i = 0; i < 3; i++) {
      const err = clip.balance(S) - S.com[0];
      if (Math.abs(err) < .02) break;
      ch.rootX += err;
      S = build(ch, ctx);
    }
  }
  S.sm = sm;
  return S;
}
export const period = clip => { prepare(clip); return compile(clip).T * (clip.swap ? 2 : 1); };
export const swapTime = clip => (clip.swap ? compile(clip).T : 0);   // seconds per side (for the switch fade)

// Mirror a whole clip left <-> right: keys and base mirrored, limb specs swapped between sides with their world
// targets reflected in z, derive / balance / pin run on the mirrored channels and skeleton. Not for clips with
// 'fixed' feet (side plank): a z-mirror would turn the body away from the camera.
const OTHER = { R: 'L', L: 'R' }, fz = v => [v[0], v[1], -v[2]];
const swapPt = S => ({ ...S, pt: Object.fromEntries(Object.entries(S.pt).map(([k, v]) => [/[RL]$/.test(k) ? k.slice(0, -1) + OTHER[k.slice(-1)] : k, fz(v)])) });
function mirrorSpec(sp) {
  if (!sp) return sp;
  const o = { ...sp }, mc = ch => ch && mirrorPose(ch);
  for (const k of ['ankle', 'ball', 'heel', 'target']) if (typeof sp[k] === 'function') o[k] = (sd, s, ch) => fz(sp[k](OTHER[sd], -s, mc(ch)));
  for (const k of ['pole', 'dir', 'normal', 'palm']) if (typeof sp[k] === 'function') o[k] = (s, ch) => fz(sp[k](-s, mc(ch)));
  if (typeof sp.axes === 'function') o.axes = (sd, s, ch) => sp.axes(OTHER[sd], -s, mc(ch)).map(fz);
  for (const k of ['knee', 'lift']) if (typeof sp[k] === 'function') o[k] = (s, ch) => sp[k](-s, mc(ch));
  return o;
}
const mirrorLimbs = L => L && { R: mirrorSpec(L.L || L.both), L: mirrorSpec(L.R || L.both) };
function mirrored(c) {
  if (c._mir) return c._mir;
  const m = { ...c, swap: false, prep: null, _prepped: true, _c: null, _an: null, _mir: null, shift: -(c.shift ?? .5), shiftRoll: -(c.shiftRoll ?? .6),
    base: mirrorPose(expand(c.base || {})), keys: Object.fromEntries(Object.entries(c.keys).map(([k, v]) => [k, mirrorPose(expand(v))])),
    legs: mirrorLimbs(c.legs), arms: mirrorLimbs(c.arms) };
  if (c.derive) m.derive = (ch, lag, sm) => { const x = mirrorPose(ch); c.derive(x, mirrorPose(lag), sm); Object.assign(ch, mirrorPose(x)); };
  if (c.balance) m.balance = S => c.balance(swapPt(S));
  if (c.pin) m.pin = { ...c.pin, pt: S => fz(c.pin.pt(swapPt(S))) };
  return (c._mir = m);
}
// pin: a body point held at a world position (upper back in a bridge, knees in a knee push-up) by translating the root
function settle(clip, ch, ctx) {
  let S = build(ch, ctx);
  const pn = clip.pin;
  if (pn) for (let i = 0; i < 3; i++) {
    const p = pn.pt(S), dx = pn.at[0] == null ? 0 : pn.at[0] - p[0], dy = pn.at[1] == null ? 0 : pn.at[1] - p[1];
    if (Math.abs(dx) + Math.abs(dy) < .01) break;
    ch.rootX += dx; ch.rootY += dy;
    S = build(ch, ctx);
  }
  return S;
}

function prepare(clip) {
  if (clip._prepped) return;
  clip._prepped = true;
  const full = pose => ({ ...zeroCh(), ...expand({ ...(clip.base || {}), ...pose }) });
  clip.prep?.({ build: (pose, fk) => build(full(pose), { clip, breath: .5, fk }),
    // derive + pin, as poseAt does (no secondary motion)
    settle: (pose, fk) => { const ch = full(pose); clip.derive?.(ch, ch, {}); return settle(clip, ch, { clip, breath: .5, fk }); } });
  clip._c = null;
}
const zeroCh = () => Object.fromEntries(CHANNELS.map(c => [c, 0]));

// ---------------------------------------------------------------------------------------------------------------
// Muscles: strands between attachments. [bone, x, y, z]: sided bones take the side suffix (y = cm along long bones);
// axial bones and vertebrae take z * side. ['pt', name] = a named skeleton point; ['rib', k, f] = rib k at fraction f.
// ---------------------------------------------------------------------------------------------------------------
const AXIAL_BONES = new Set(['pelvis', 'head', 'sternum']);
export function attach(S, a, sd, s) {
  const [bone, x, y, z] = a;
  if (bone === 'pt') return S.pt[x + sd];
  if (/^T\d+$/.test(bone)) return P(S.vert[T_INDEX(+bone.slice(1))], [x, y, z * s]);
  if (/^L\d$/.test(bone)) return P(S.vert[5 - +bone.slice(1)], [x, y, z * s]);
  if (bone === 'rib') return P(S.rib[x], ribPoint(x, s, y, S.breath));
  if (bone === 'clav') return lerp3(S.pt['clavSternal' + sd], S.pt['acromion' + sd], x);
  if (AXIAL_BONES.has(bone)) return P(S.F[bone], [x, y, z * s]);
  return P(S.F[bone + sd], [x, y, z]);
}

const M = (group, def) => ({ group, ...def });
export const MUSCLES = [
  M('chest', { fan: 5, from: [['clav', .15, 0, 0], ['sternum', 1.2, 4, .4], ['sternum', 1.2, 13, .4]], via: [['sternum', 3.4, 2, 5.5], ['sternum', 3.8, 11, 6]], to: [['humerus', 1.2, 5.5, .2], ['humerus', 1.1, 8, .2]], w: 2.3, th: 1.4, t: [.06, .22] }),
  M('front_delts', { from: ['clav', .72, 0, 0], via: ['humerus', 2.8, 5, 1], to: ['humerus', .9, 13, .6], w: 1.8, t: [.05, .18] }),
  M('side_delts', { from: ['pt', 'acromion', 0, 0], via: ['humerus', .3, 5, 3.2], to: ['humerus', .3, 13.5, 1.1], w: 2, t: [.04, .16] }),
  M('rear_delts', { fan: 2, from: [['scapula', -1.8, 6, 3], ['scapula', .5, 7.6, 7]], via: [['humerus', -2.8, 5.5, 1.2]], to: ['humerus', -.4, 13, .8], w: 1.7, t: [.05, .18] }),
  M('biceps', { from: ['scapula', 5.6, 5.3, 6.3], via: ['humerus', 3, 17, 0], to: ['fore', 1.1, 4, .2], w: 2, th: 1.9, t: [.2, .16] }),
  M('triceps', { fan: 2, from: [['scapula', 2.8, 2.6, 6.3], ['humerus', -1.2, 9, 1]], via: [['humerus', -3.1, 16, .3], ['humerus', -2.7, 17, .7]], to: ['fore', -2.2, -.8, 0], w: 2, th: 1.9, t: [.12, .2] }),
  M('forearms', { fan: 2, from: [['humerus', .4, 29, -2.5], ['humerus', .2, 29.3, 2.4]], via: [['fore', 1.9, 7, -.4], ['fore', -1.3, 7, 1]], to: [['hand', .8, 1, -.6], ['hand', -.9, 1, .6]], w: 1.4, t: [.06, .42] }),
  M('traps', { fan: 3, from: [['head', -7.5, 4.8, .5], ['T4', -6.5, 5, 0], ['T12', -4.8, 1, 0]], via: [['T1', -8, 4, 8], ['T4', -9.8, 3, 7], ['T7', -9, 2, 5]], to: [['clav', .82, 0, 0], ['pt', 'acromion', 0, 0], ['scapula', -1.8, 3.8, -1]], w: 1.9, th: .9, t: [.1, .1] }),
  M('upper_back', { fan: 3, from: [['T1', -5, 1, 0], ['T5', -5.5, 1, 0]], via: [['T3', -9.8, 1, 4], ['T5', -10.2, 0, 4]], to: [['scapula', -1.4, 5, -2], ['scapula', -1.3, -6, -1.6]], w: 1.6, th: .9, t: [.1, .08] }),
  M('lats', { fan: 5, from: [['T8', -4.6, 1, 0], ['pelvis', -6.5, 15, 6.5]], via: [['rib', 8, .26, 0], ['rib', 11, .38, 0]], to: [['humerus', 1.3, 5.2, -.6], ['humerus', 1.3, 6.2, -.6]], w: 2.2, th: 1.1, t: [.12, .12] }),
  M('lower_back', { fan: 2, from: [['pelvis', -7.5, 9, 2], ['pelvis', -7, 12, 4]], via: [['L2', -5.8, 1, 2.8], ['L1', -5.5, 1, 4]], to: [['T6', -5.4, 1, 2.5], ['T8', -6, 1, 5.5]], w: 1.4, th: 1.5, t: [.08, .15] }),
  M('abs', { from: ['pelvis', 6, -2.4, 1.6], via: ['L3', 10.8, 1, 3.4], to: ['rib', 6, .96, 0], w: 2.2, th: .6, t: [.05, .03], segs: 3 }),
  M('obliques', { fan: 3, from: [['rib', 7, .6, 0], ['rib', 10, .6, 0]], via: [['L3', 6.8, 1, 10.5], ['L4', 4.5, 1, 11]], to: [['pelvis', 5.5, 12, 11.5], ['pelvis', 1, 15.5, 12.5]], w: 2.6, th: 1.2, t: [.1, .08] }),
  M('glutes', { fan: 5, from: [['pelvis', -9, 12, 5.5], ['pelvis', -10, 3, 3]], via: [['pelvis', -11.8, 4, 9], ['pelvis', -10.4, -4, 9]], to: [['femur', -1.5, 9, 1.8], ['femur', -1.2, 12, 1.6]], w: 2.8, th: 2.6, t: [.05, .18] }),
  M('hip_flexors', { from: ['L2', 1.5, 1, 3.2], via: ['pelvis', 5, 2, 7.5], to: ['femur', .3, 5.5, -1.6], w: 1.4, t: [.05, .2] }),
  M('quads', { fan: 3, from: [['pelvis', 5.8, 5.5, 10], ['femur', .2, 7, 2.6]], via: [['femur', 3.8, 20, .2], ['femur', 3.3, 24, 2.4]], to: ['pt', 'patella', 0, 0], w: 2.5, th: 2.4, t: [.08, .14] }),
  M('hamstrings', { fan: 2, from: ['pelvis', -3.4, -6.6, 5.4], via: [['femur', -3.5, 22, .6], ['femur', -3.5, 22, -.8]], to: [['tibia', -1.8, 3.8, 2.2], ['tibia', -1.6, 4.2, -1.8]], w: 1.9, th: 1.9, t: [.12, .2] }),
  M('adductors', { fan: 3, from: [['pelvis', 4, -4.5, 2.4], ['pelvis', -2, -6.8, 4.4]], via: [['femur', 1.5, 14, -3.8], ['femur', -.5, 22, -3.6]], to: [['femur', -.6, 18, -1.2], ['femur', -.4, 36, -1.8]], w: 1.8, th: 1.6, t: [.08, .12] }),
  M('calves', { fan: 2, from: [['femur', -2.4, 41.5, 1.8], ['femur', -2.4, 41.5, -1.8]], via: [['tibia', -4.8, 11, 1.2], ['tibia', -4.8, 11, -1.2]], to: ['pt', 'heel', 0, 0], w: 2.0, th: 2.0, t: [.04, .42] }),
];

export function strands(S, groups) {
  const out = [];
  for (const m of MUSCLES) {
    if (!groups.has(m.group)) continue;
    const n = m.fan || 1;
    for (const [sd, s] of SIDES) {
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? .5 : i / (n - 1);
        const pick = v => {
          if (!Array.isArray(v[0])) return attach(S, v, sd, s);
          if (v.length === 1) return attach(S, v[0], sd, s);
          const k = u * (v.length - 1), j = Math.min(v.length - 2, Math.floor(k));
          return lerp3(attach(S, v[j], sd, s), attach(S, v[j + 1], sd, s), k - j);
        };
        out.push({ key: m.group + sd + i, group: m.group, side: sd, s, o: pick(m.from), via: m.via ? pick(m.via) : null, e: pick(m.to),
          w: m.w * (n > 1 ? 1.3 / Math.sqrt(n) : 1), th: (m.th ?? m.w * .8) * (n > 1 ? .85 : 1), t: m.t, segs: m.segs || 0, fan: n > 1, fi: i });
      }
    }
  }
  return out;
}
export function strandCurve(st, n = 12) {
  const c = st.via ? sub(mul(st.via, 2), lerp3(st.o, st.e, .5)) : lerp3(st.o, st.e, .5);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u;
    pts.push([a * st.o[0] + b * c[0] + d * st.e[0], a * st.o[1] + b * c[1] + d * st.e[1], a * st.o[2] + b * c[2] + d * st.e[2]]);
  }
  return pts;
}
export const curveLen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += len(sub(pts[i], pts[i - 1])); return L; };
// belly profile (0..1) along u for a strand; tendons at both ends
export function bellyProfile(u, st) {
  const [t0, t1] = st.t;
  if (u <= t0 || u >= 1 - t1) return 0;
  const v = (u - t0) / (1 - t0 - t1);
  return Math.pow(Math.sin(Math.PI * v), .8);
}
// contraction gain: volume-preserving thickening when a strand is shorter than its cycle average
export const bulge = (L, Lavg) => clamp(Math.pow(Lavg / L, 1.25), .75, 1.65);

// muscle average lengths over a cycle (for contraction), and a joint path for the motion trail
export function analyse(clip, groups, trailPts = [], n = 36) {
  const key = [...groups].sort().join() + '|' + trailPts.join();
  const memo = clip._an || (clip._an = new Map());
  if (!memo.has(key)) memo.set(key, analyse1(clip, groups, trailPts, n));
  return memo.get(key);
}
function analyse1(clip, groups, trailPts, n) {
  const T = period(clip), avg = {}, trail = Object.fromEntries(trailPts.map(p => [p, []]));
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    const S = poseAt(clip, i / n * T);
    for (const st of strands(S, groups)) avg[st.key] = (avg[st.key] || 0) + curveLen(strandCurve(st, 6));
    cnt++;
  }
  for (const k in avg) avg[k] /= cnt;
  const m = trailPts.length ? 72 : -1;
  for (let i = 0; i <= m; i++) { const S = poseAt(clip, i / m * T); for (const p of trailPts) trail[p].push(S.pt[p]); }
  return { avg, trail };
}
