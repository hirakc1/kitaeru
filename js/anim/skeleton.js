// Kitaeru skeletal animation renderer: 2D forward kinematics drawn as SVG.
//
// Pose format (all angles in degrees, every key optional, default 0):
//   lean   whole-trunk tilt; + = top of trunk towards +x (forward in side view, screen-right in front view)
//   spine  flexion of the upper trunk relative to the lower trunk (+ = rounding forward)
//   neck   head flexion (+ = chin towards chest)
//   rot    base rotation of the whole body about the pelvis (e.g. 90 = lying with head towards -x ... see poses.js)
//   air    lift above the anchor (jumps)
//   per limb, suffix N (near / screen-right in front view) or F (far / screen-left in front view):
//     sh  shoulder flexion (side) / abduction (front)      el  elbow flexion (>= 0)
//     wr  wrist flexion                                    hip hip flexion (side) / abduction (front)
//     kn  knee flexion (>= 0)                              an  ankle plantar-flexion (+ = toes point)
//     foot / hand  absolute world angle override for the sole / hand (90 = pointing +x, 180 = up)
// Absolute angle convention: direction(a) = (sin a, cos a) in SVG space, so 0 = down, 90 = +x, 180 = up.
import { ANIMS } from './poses.js';
import { V2_IDS, V2_GROUP_OF } from './v2/ids.js';
import { getState } from '../store.js';

export const ANIM_IDS = Object.keys(ANIMS);

const D2R = Math.PI / 180;
const LEN = { torsoL: 20, torsoU: 31, neck: 8, arm: 33, fore: 26.5, hand: 18, grip: 7.5,
  thigh: 44, shin: 44, ankleH: 7, heel: 5.5, ball: 15, toe: 20.5 };
const FRONT = { sh: 20, hip: 9 };
const MASS = { head: .081, trunk: .497, arm: .028, fore: .016, hand: .006, thigh: .1, shin: .0465, foot: .0145 };

const dir = a => [Math.sin(a * D2R), Math.cos(a * D2R)];
const fv = a => [Math.cos(a * D2R), -Math.sin(a * D2R)]; // "front" normal for a segment whose down-angle is a
const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
const mul = (p, k) => [p[0] * k, p[1] * k];
const lerp = (a, b, u) => a + (b - a) * u;
const mid = (p, q, u = .5) => [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];

// ---------- forward kinematics ----------
export function fk(p, view = 'side', extraRot = 0) {
  const g = k => p[k] || 0;
  const front = view === 'front';
  const T = -g('lean') + g('rot') + extraRot;       // down-angle of lower trunk
  const U = T - g('spine');                          // down-angle of upper trunk
  const root = [0, 0];
  const waist = add(root, mul(dir(T + 180), LEN.torsoL * (p.fsTorso ?? 1)));
  const top = add(waist, mul(dir(U + 180), LEN.torsoU * (p.fsTorso ?? 1)));
  const S = { T, U, front, root, waist, top, seg: {}, p };
  S.seg.torsoL = { a: root, b: waist, down: T, len: LEN.torsoL };
  S.seg.torsoU = { a: waist, b: top, down: U, len: LEN.torsoU };
  const neckAng = U + 180 - g('neck');
  const neckTop = add(top, mul(dir(neckAng), LEN.neck));
  S.seg.neck = { a: top, b: neckTop, down: neckAng - 180, len: LEN.neck };
  S.head = add(add(neckTop, mul(dir(neckAng), 9.5)), front ? [0, 0] : mul(fv(neckAng - 180), 2.5));
  S.headAng = neckAng;
  const latT = fv(T), latU = fv(U);
  for (const side of ['N', 'F']) {
    const s = front && side === 'F' ? -1 : 1;
    const shoulder = front ? add(add(top, mul(latU, s * FRONT.sh)), mul(dir(U), 3)) : add(top, mul(fv(U), 1));
    const hipJ = front ? add(root, mul(latT, s * FRONT.hip)) : root;
    const ov = (k, computed) => {
      const w = p[k + '_w'] ?? (p[k] != null ? 1 : 0);
      if (!w) return computed;
      let d = ((p[k] - computed) % 360 + 540) % 360 - 180;
      return computed + d * w;
    };
    const armA = U + s * g('sh' + side);
    const foreA = armA + s * g('el' + side);
    const handA = ov('hand' + side, foreA + s * g('wr' + side));
    const elbow = add(shoulder, mul(dir(armA), LEN.arm * (p['fsArm' + side] ?? 1)));
    const wrist = add(elbow, mul(dir(foreA), LEN.fore * (p['fsFore' + side] ?? 1)));
    const hu = dir(handA);
    const thighA = T + s * g('hip' + side);
    const shinA = thighA - s * g('kn' + side);
    const footA = ov('foot' + side, shinA + s * (90 - g('an' + side)));
    const knee = add(hipJ, mul(dir(thighA), LEN.thigh * (p['fsThigh' + side] ?? 1)));
    const ankle = add(knee, mul(dir(shinA), LEN.shin * (p['fsShin' + side] ?? 1)));
    const fu = dir(footA);
    const fn = mul([fu[1], -fu[0]], s);        // unit normal pointing from sole up towards the ankle
    const fs = front ? .38 : 1;               // foreshortening of the foot in front view
    const sole = k => add(add(ankle, mul(fn, -LEN.ankleH)), mul(fu, k * fs));
    S.seg['arm' + side] = { a: shoulder, b: elbow, down: armA, len: LEN.arm, s };
    S.seg['fore' + side] = { a: elbow, b: wrist, down: foreA, len: LEN.fore, s };
    S.seg['hand' + side] = { a: wrist, b: add(wrist, mul(hu, LEN.hand * (p['fsFore' + side] ?? 1))), down: handA, len: LEN.hand, s };
    S.seg['thigh' + side] = { a: hipJ, b: knee, down: thighA, len: LEN.thigh, s };
    S.seg['shin' + side] = { a: knee, b: ankle, down: shinA, len: LEN.shin, s };
    S.seg['foot' + side] = { a: ankle, heel: sole(-LEN.heel), ball: sole(LEN.ball), toe: sole(LEN.toe), down: footA, s };
    S['shoulder' + side] = shoulder; S['hip' + side] = hipJ;
    S['elbow' + side] = elbow; S['wrist' + side] = wrist; S['knee' + side] = knee; S['ankle' + side] = ankle;
    S['grip' + side] = add(wrist, mul(hu, LEN.grip));
    S['palm' + side] = add(wrist, mul(hu, 6));
    S['finger' + side] = S.seg['hand' + side].b;
    S['heel' + side] = S.seg['foot' + side].heel; S['ball' + side] = S.seg['foot' + side].ball; S['toe' + side] = S.seg['foot' + side].toe;
  }
  // centre of mass
  let cx = 0, cy = 0;
  const acc = (m, q) => { cx += m * q[0]; cy += m * q[1]; };
  acc(MASS.head, S.head); acc(MASS.trunk, mid(root, top, .55));
  for (const sd of ['N', 'F']) {
    acc(MASS.arm, mid(S['shoulder' + sd], S['elbow' + sd])); acc(MASS.fore, mid(S['elbow' + sd], S['wrist' + sd]));
    acc(MASS.hand, S['palm' + sd]); acc(MASS.thigh, mid(S['hip' + sd], S['knee' + sd], .43));
    acc(MASS.shin, mid(S['knee' + sd], S['ankle' + sd], .43)); acc(MASS.foot, mid(S['heel' + sd], S['toe' + sd]));
  }
  S.com = [cx, cy];
  return S;
}

// Named contact points: [x, y, r] where r is the distance from the point down to the surface it rests on.
const avg = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
export function point(S, name) {
  const P = (q, r = 0) => [q[0], q[1], r];
  const sides = n => avg(point(S, n + 'N'), point(S, n + 'F'));
  switch (name) {
    case 'hands': return sides('palm');
    case 'grips': return sides('grip');
    case 'feet': return sides('mid');
    case 'toes': return sides('toe');
    case 'balls': return sides('ball');
    case 'heels': return sides('heel');
    case 'knees': return sides('knee');
    case 'elbows': return sides('elbow');
    case 'ankles': return sides('ankle');
    case 'wrists': return sides('wrist');
    case 'hip': case 'seat': return P(S.root, 10);
    case 'sacrum': return P(add(S.root, mul(fv(S.T), -6)), 4);
    case 'upperBack': return P(add(mid(S.waist, S.top, .6), mul(fv(S.U), -9)), 1);
    case 'chest': return P(add(mid(S.waist, S.top, .6), mul(fv(S.U), 11)), 1);
    case 'head': return P(S.head, 11);
    case 'com': return P(S.com, 0);
  }
  const side = name.slice(-1), base = name.slice(0, -1);
  if (side !== 'N' && side !== 'F') return P(S.root, 10);
  const R = { palm: 2.5, grip: 0, wrist: 4, elbow: 4.5, knee: 5.5, ankle: 5, heel: 1.2, ball: 1.2, toe: 1.2, shoulder: 7, hip: 10, finger: 1 };
  if (base === 'mid') return P(mid(S['heel' + side], S['ball' + side]), 1.2);
  const q = S[base + side];
  return q ? P(q, R[base] ?? 0) : P(S.root, 10);
}

// ---------- solving a pose into world space ----------
// A frame config says which named point is pinned (anchor) at a world point (at), plus optional constraints:
//   contact: { pt, dy = 0, key = 'rot', dx?, keyX = 'rot' } (or an array of them): surface of pt sits dy above/below
//            the anchor surface (and optionally dx ahead of it), solved by adjusting pose key(s) ('rot' = whole body)
//   balance: true | point name   keeps the centre of mass (or that point) over the anchor, adjusting balanceKey
function secant(f, x0, x1) {
  let f0 = f(x0), f1 = f(x1);
  for (let i = 0; i < 16 && Math.abs(f1) > .02; i++) {
    if (f1 === f0) break;
    let x2 = x1 - f1 * (x1 - x0) / (f1 - f0);
    x2 = Math.max(x1 - 30, Math.min(x1 + 30, x2));
    x0 = x1; f0 = f1; x1 = x2; f1 = f(x1);
  }
  return Number.isFinite(x1) ? x1 : 0;
}

function applyKeys(pose, v) {
  const p = { ...pose };
  for (const k in v) if (k !== 'rot') for (const kk of k.split(',')) p[kk] = (p[kk] || 0) + v[k];
  return p;
}

function constraints(cfg) {
  const cons = [];
  for (const c of cfg.contact ? [].concat(cfg.contact) : []) {
    if (c.dy !== null) cons.push({ key: c.key || 'rot', f: S => {
      const A = point(S, cfg.anchor), C = point(S, c.pt); return (C[1] + C[2]) - (A[1] + A[2]) - (c.dy || 0); } });
    if (typeof c.dx === 'number') cons.push({ key: c.keyX || 'rot', f: S => point(S, c.pt)[0] - point(S, cfg.anchor)[0] - c.dx });
  }
  if (cfg.balance) {
    const over = cfg.balance === true ? 'com' : cfg.balance;
    cons.push({ key: cfg.balanceKey || 'rot', f: S => point(S, over)[0] - point(S, cfg.anchor)[0] - (cfg.balanceDx || 0) });
  }
  return cons;
}

// Solve n x n linear system (n <= 5) by Gaussian elimination with partial pivoting.
function linSolve(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let m = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
    if (Math.abs(A[i][i]) < 1e-9) return null;
    for (let r = i + 1; r < n; r++) { const k = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= k * A[i][c]; b[r] -= k * b[i]; }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let t = b[i]; for (let c = i + 1; c < n; c++) t -= A[i][c] * x[c]; x[i] = t / A[i][i]; }
  return x;
}

export function solve(pose, cfg, view, init) {
  const v = { rot: 0 };
  const cons = constraints(cfg);
  const keys = cons.map(c => c.key);
  if (init) for (const k of keys) if (Number.isFinite(init[k])) v[k] = init[k];   // warm start, solved keys only
  const run = () => fk(applyKeys(pose, v), view, v.rot);
  if (cons.length === 1) {
    const c = cons[0];
    const x0 = v[c.key] || 0;
    v[c.key] = secant(x => { v[c.key] = x; return c.f(run()); }, x0, x0 + 3);
  } else if (cons.length > 1 && new Set(keys).size === keys.length) {
    // damped Newton from the authored pose: converges to the nearest valid configuration
    for (const k of keys) v[k] = v[k] || 0;
    for (let it = 0; it < 24; it++) {
      const S = run(), Fv = cons.map(c => c.f(S));
      if (Math.max(...Fv.map(Math.abs)) < .02) break;
      const J = cons.map(() => []);
      keys.forEach((k, j) => {
        const old = v[k]; v[k] = old + .5; const Sj = run(); v[k] = old;
        cons.forEach((c, i) => { J[i][j] = (c.f(Sj) - Fv[i]) / .5; });
      });
      const dx = linSolve(J, Fv.map(f => -f));
      if (!dx || dx.some(d => !Number.isFinite(d))) break;
      const m = Math.max(...dx.map(Math.abs)), sc = m > 12 ? 12 / m : 1;
      keys.forEach((k, j) => { v[k] += dx[j] * sc; });
    }
  } else if (cons.length > 1) {        // shared keys: Gauss-Seidel sweeps
    for (let r = 0; r < 8; r++) for (const c of cons) {
      const x0 = v[c.key] || 0;
      v[c.key] = secant(x => { v[c.key] = x; return c.f(run()); }, x0, x0 + 3);
    }
  }
  const S = run();
  return { S, v, off: offsetFor(S, cfg, pose) };
}

function offsetFor(S, cfg, pose) {
  const A = point(S, cfg.anchor), at = cfg.at || [0, 0];
  return [at[0] - A[0], at[1] - A[2] - A[1] - (pose.air || 0)];
}

// ---------- keyframe interpolation ----------
const ease = u => .5 - .5 * Math.cos(Math.PI * u);
const OVR = /^(foot|hand)[NF]$/;
const DEF = k => (k.startsWith('fs') ? 1 : 0);
function blendPose(a, b, u) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (OVR.test(k)) {
      const wa = a[k] != null ? 1 : 0, wb = b[k] != null ? 1 : 0;
      out[k] = lerp(a[k] ?? b[k], b[k] ?? a[k], u);
      out[k + '_w'] = lerp(wa, wb, u);
    } else if (!k.endsWith('_w')) out[k] = lerp(a[k] ?? DEF(k), b[k] ?? DEF(k), u);
  }
  return out;
}

const cfgKey = c => JSON.stringify([c.anchor, c.at, c.contact, c.balance, c.balanceDx, c.balanceKey]);

// Build per-frame configs; when the anchor changes, the new anchor is pinned where it was in the previous frame.
function prepare(anim) {
  if (anim._prep) return anim._prep;
  const frames = anim.frames.slice().sort((x, y) => x.t - y.t);
  if (frames[0].t > 0) frames.unshift({ ...frames[0], t: 0 });
  if (frames[frames.length - 1].t < 1) frames.push({ ...frames[0], t: 1, _loop: true });
  const view = anim.view || 'side';
  const cfgs = [];
  const pick = (f, k, d) => (k in f ? f[k] : (anim[k] ?? d));
  frames.forEach((f, i) => {
    const c = { anchor: pick(f, 'anchor', 'feet'), contact: pick(f, 'contact', null), balance: pick(f, 'balance', false),
      balanceDx: pick(f, 'balanceDx', 0), balanceKey: pick(f, 'balanceKey', 'rot') };
    if (f._loop || (f.t === 1 && !f.at && i > 0 && c.anchor === cfgs[0].anchor)) { cfgs.push(cfgs[0]); return; }
    if (f.at) c.at = f.at;
    else if (i === 0) c.at = anim.at || [0, 0];
    else if (c.anchor === cfgs[i - 1].anchor) c.at = cfgs[i - 1].at;
    else {
      const pr = solve(frames[i - 1].pose, cfgs[i - 1], view);
      const q = point(pr.S, c.anchor);
      c.at = [q[0] + pr.off[0], q[1] + q[2] + pr.off[1]];
      if (anim.floor !== false && Math.abs(c.at[1]) < 20) c.at[1] = 0;   // a new support that is near the floor is on it
    }
    cfgs.push(c);
  });
  // dx: '@0' plants a point at its frame-0 world x
  const has0 = c => [].concat(c.contact || []).some(k => k.dx === '@0');
  if (cfgs.some(has0)) {
    const strip = c => ({ ...c, contact: [].concat(c.contact || []).filter(k => !(k.dx === '@0' && k.dy === null)).map(k => (k.dx === '@0' ? { ...k, dx: undefined } : k)) });
    const r0 = solve(frames[0].pose, strip(cfgs[0]), view);
    const memo = new Map([[cfgs[0], strip(cfgs[0])]]);   // frame 0 defines the planted positions
    for (let i = 0; i < cfgs.length; i++) {
      const c = cfgs[i];
      if (!has0(c) && c !== cfgs[0]) continue;
      if (!memo.has(c)) memo.set(c, { ...c, contact: [].concat(c.contact).map(k => {
        if (k.dx !== '@0') return k;
        const X = point(r0.S, k.pt)[0] + r0.off[0];
        return { ...k, dx: X - c.at[0] };
      }) });
      cfgs[i] = memo.get(c);
    }
  }
  return (anim._prep = { frames, cfgs, view });
}

// Returns { S (local skeleton), off (world translation) } for time t in [0,1]; ms drives breathing on holds.
// Solutions are tracked along a fine time grid (warm-started from the previous sample) so the solver
// always follows the same continuous branch, whatever time is requested.
const GRID = 160;
function grid(anim) {
  if (anim._grid) return anim._grid;
  const g = []; let prev = null;
  anim._grid = g;                                   // guard against re-entry
  for (let k = 0; k <= GRID; k++) { prev = core(anim, k / GRID, 0, prev); g.push(prev.memo); }
  return g;
}

export function evalAnim(anim, t, ms = 0) {
  const g = grid(anim);
  return core(anim, t, ms, { memo: g[Math.round(Math.min(1, Math.max(0, t)) * GRID)] });
}

function core(anim, t, ms, prev) {
  const { frames, cfgs, view } = prepare(anim);
  let i = 0;
  while (i < frames.length - 2 && t > frames[i + 1].t) i++;
  const a = frames[i], b = frames[i + 1];
  const u = b.t > a.t ? ease(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))) : 0;
  const pose = blendPose(a.pose, b.pose, u);
  if (anim.hold) {                      // breathing micro-motion for isometric holds
    const w = Math.sin(ms / 4200 * 2 * Math.PI);
    pose.spine = (pose.spine || 0) + w * 1.5;
    pose.neck = (pose.neck || 0) - w * 1.2;
    pose.shN = (pose.shN || 0) + w * .8; pose.shF = (pose.shF || 0) + w * .8;
  }
  const ca = cfgs[i], cb = cfgs[i + 1];
  const pm = prev && prev.memo;
  const initA = pm ? (pm.i === i ? pm.va : pm.i === i - 1 ? pm.vb : null) : null;
  const initB = pm ? (pm.i === i ? pm.vb : pm.i === i + 1 ? pm.va : null) : null;
  const ra = solve(pose, ca, view, initA);
  let S = ra.S, off = ra.off, rb = null;
  if (u > 0 && cfgKey(ca) !== cfgKey(cb)) {
    rb = solve(pose, cb, view, initB || ra.v);
    const v = {};
    for (const k of new Set([...Object.keys(ra.v), ...Object.keys(rb.v)])) v[k] = lerp(ra.v[k] || 0, rb.v[k] || 0, u);
    S = fk(applyKeys(pose, v), view, v.rot);
    const oa = offsetFor(S, ca, pose), ob = offsetFor(S, cb, pose);
    off = [lerp(oa[0], ob[0], u), lerp(oa[1], ob[1], u)];
  }
  // ground safety: nothing sinks below the floor
  if (anim.floor !== false) {
    let maxY = -Infinity;
    for (const n of GROUND_PTS) { const q = point(S, n); maxY = Math.max(maxY, q[1] + q[2] * .8 + off[1]); }
    if (maxY > 0.5) off = [off[0], off[1] - (maxY - 0.5)];
  }
  return { S, off, view, pose, memo: { i, va: ra.v, vb: rb ? rb.v : ra.v } };
}
const GROUND_PTS = ['toeN', 'toeF', 'heelN', 'heelF', 'kneeN', 'kneeF', 'palmN', 'palmF', 'fingerN', 'fingerF', 'elbowN', 'elbowF', 'hip', 'head', 'upperBack', 'chest'];

// Debug helper: world-space named points for an animation at time t.
export function debugPoints(animId, t) {
  const anim = ANIMS[animId]; if (!anim) return null;
  const { S, off } = evalAnim(anim, t);
  const names = ['hands', 'grips', 'palmN', 'palmF', 'gripN', 'gripF', 'toeN', 'toeF', 'heelN', 'heelF', 'ballN', 'ballF', 'kneeN', 'kneeF', 'elbowN', 'elbowF', 'hip', 'head', 'com', 'upperBack'];
  const o = {};
  for (const n of names) { const q = point(S, n); o[n] = [+(q[0] + off[0]).toFixed(1), +(q[1] + off[1] + q[2]).toFixed(1)]; }
  o._T = +S.T.toFixed(1); o._U = +S.U.toFixed(1);
  o._p = {}; for (const k of ['knN', 'knF', 'elN', 'elF', 'hipN', 'hipF', 'shN', 'shF']) o._p[k] = +(S.p[k] || 0).toFixed(1);
  return o;
}

// ---------- rendering ----------
const NS = 'http://www.w3.org/2000/svg';
const f1 = n => Math.round(n * 10) / 10;
const P = q => `${f1(q[0])},${f1(q[1])}`;
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];

// Muscle shapes: [segment, u (fraction along segment), offset (+ front / outward), rx (along), ry (across), back?]
const M_SIDE = {
  chest: [['torsoU', .7, 10, 9, 5.5]],
  front_delts: [['arm', .13, 3.5, 7.5, 4]],
  side_delts: [['arm', .08, -.5, 6.5, 5.5]],
  rear_delts: [['arm', .13, -4, 7, 3.5]],
  biceps: [['arm', .55, 3.6, 11.5, 4]],
  triceps: [['arm', .5, -3.8, 13, 4.2]],
  forearms: [['fore', .3, .6, 10, 4]],
  traps: [['torsoU', .93, -6, 7, 4], ['neck', .35, -3.5, 5, 2.5]],
  upper_back: [['torsoU', .62, -9.5, 9, 3.5]],
  lats: [['torsoU', .32, -8, 13, 5]],
  lower_back: [['torsoL', .45, -9, 11, 2.8]],
  abs: [['torsoL', .45, 9.5, 12, 3.2], ['torsoU', .12, 10.5, 6, 3]],
  obliques: [['torsoL', .6, 3.5, 10, 5.5]],
  glutes: [['torsoL', -.3, -9, 9.5, 7.5]],
  hip_flexors: [['thigh', .1, 5, 8, 3.2], ['torsoL', .15, 4.5, 6, 2.5]],
  quads: [['thigh', .5, 5.2, 17, 5.5]],
  hamstrings: [['thigh', .55, -5, 16, 4.5]],
  adductors: [['thigh', .28, 0, 11, 3.5]],
  calves: [['shin', .3, -4.5, 11, 5]],
};
const M_FRONT = {
  chest: [['torsoU', .7, 8, 6.5, 8]],
  front_delts: [['arm', .1, 1.5, 6, 5]],
  side_delts: [['arm', .08, 4.5, 6, 3.5]],
  rear_delts: [['arm', .12, 3, 5, 3, 1]],
  biceps: [['arm', .55, -.5, 11, 4]],
  triceps: [['arm', .5, 3.6, 11, 2.6]],
  forearms: [['fore', .3, 0, 10, 4]],
  traps: [['torsoU', .96, 8, 3, 7]],
  upper_back: [['torsoU', .65, 11, 8, 3.5, 1]],
  lats: [['torsoU', .3, 13.5, 12, 3.5]],
  lower_back: [['torsoL', .45, 4.5, 9, 2.5, 1]],
  abs: [['torsoL', .25, 3.2, 3.5, 2.8], ['torsoL', .7, 3.2, 3.5, 2.8], ['torsoU', .15, 3.2, 3.5, 2.8]],
  obliques: [['torsoL', .55, 10, 9, 3.5]],
  glutes: [['torsoL', -.3, 10, 8, 7, 1]],
  hip_flexors: [['thigh', .1, -3, 7, 3]],
  quads: [['thigh', .5, 1, 17, 6]],
  hamstrings: [['thigh', .55, 0, 15, 4.5, 1]],
  adductors: [['thigh', .3, -4, 12, 3]],
  calves: [['shin', .3, 0, 10, 4.5]],
};
const LIMB_SEGS = { arm: 1, fore: 1, thigh: 1, shin: 1 };

// Retained-mode layer: elements are created on the first frame and only their attributes change afterwards.
class Layer {
  constructor(parent, attrs = {}) {
    this.g = document.createElementNS(NS, 'g');
    for (const k in attrs) this.g.setAttribute(k, attrs[k]);
    parent.appendChild(this.g); this.els = []; this.i = 0;
  }
  reset() { this.g.textContent = ''; this.els = []; this.i = 0; }
  begin() { this.i = 0; }
  add(tag, attrs, cls) {
    let e = this.els[this.i];
    if (!e || e._tag !== tag) {
      const n = document.createElementNS(NS, tag); n._tag = tag; n._a = {};
      if (e) this.g.replaceChild(n, e); else this.g.appendChild(n);
      this.els[this.i] = e = n;
    }
    this.i++;
    if (cls !== undefined && e._cls !== cls) { e.setAttribute('class', cls); e._cls = cls; }
    for (const k in attrs) { const v = attrs[k]; if (e._a[k] !== v) { e.setAttribute(k, v); e._a[k] = v; } }
    if (e._hid) { e.removeAttribute('display'); e._hid = false; }
    return e;
  }
  end() { for (let j = this.i; j < this.els.length; j++) if (!this.els[j]._hid) { this.els[j].setAttribute('display', 'none'); this.els[j]._hid = true; } }
}

// smooth closed path through points (Catmull-Rom -> cubic Bezier)
function smoothClosed(pts) {
  const n = pts.length; let d = `M${P(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  return d + 'Z';
}

// tapered "bone" with a slightly waisted shaft and rounded ends
function bonePath(a, b, w0, w1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const n = [-dy / L, dx / L], m = mid(a, b), wm = Math.min(w0, w1) * .72;
  const A1 = add(a, mul(n, w0 / 2)), A2 = add(a, mul(n, -w0 / 2));
  const B1 = add(b, mul(n, w1 / 2)), B2 = add(b, mul(n, -w1 / 2));
  return `M${P(A1)}Q${P(add(m, mul(n, wm / 2)))} ${P(B1)}A${f1(w1 / 2)} ${f1(w1 / 2)} 0 0 0 ${P(B2)}Q${P(add(m, mul(n, -wm / 2)))} ${P(A2)}A${f1(w0 / 2)} ${f1(w0 / 2)} 0 0 0 ${P(A1)}Z`;
}

function segFrame(seg) {
  const a = seg.a, b = seg.b, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return { a, b, u: [(b[0] - a[0]) / L, (b[1] - a[1]) / L], f: fv(seg.down), L };
}

const muscleClass = (id, ctx) => ctx.prim.has(id) ? 'm mp' : ctx.sec.has(id) ? 'm ms' : 'm mi';

// limbSide: 'N' | 'F' draws that limb's muscles; null draws trunk muscles
function drawMuscles(layer, S, ctx, limbSide) {
  const front = S.front, table = front ? M_FRONT : M_SIDE;
  for (const id in table) {
    const cls = muscleClass(id, ctx);
    for (const [sname, u, off, rx, ry, back] of table[id]) {
      const limb = !!LIMB_SEGS[sname];
      if (limb !== !!limbSide) continue;
      const seg = S.seg[limb ? sname + limbSide : sname];
      const F = segFrame(seg);
      const ang = f1(Math.atan2(F.u[1], F.u[0]) / D2R);
      for (const s of limb ? [seg.s || 1] : front ? [1, -1] : [1]) {
        const c = add(add(F.a, mul(F.u, u * F.L)), mul(F.f, off * s));
        layer.add('ellipse', { cx: f1(c[0]), cy: f1(c[1]), rx, ry, transform: `rotate(${ang} ${f1(c[0])} ${f1(c[1])})`,
          'fill-opacity': back ? .5 : 1 }, cls);
      }
    }
  }
}

function drawLimbGhost(layer, S, sd) {
  const sg = n => S.seg[n + sd], ft = sg('foot');
  const gw = S.front ? { arm: 10, fore: 8, thigh: 15, shin: 11 } : { arm: 11, fore: 9, thigh: 17, shin: 12 };
  for (const n of ['thigh', 'shin', 'arm', 'fore']) layer.add('path', { d: `M${P(sg(n).a)}L${P(sg(n).b)}`, 'stroke-width': gw[n] }, 'gh');
  layer.add('path', { d: `M${P(ft.a)}L${P(ft.heel)}L${P(ft.toe)}Z`, 'stroke-width': 5 }, 'gh');
  layer.add('path', { d: `M${P(sg('hand').a)}L${P(sg('hand').b)}`, 'stroke-width': 6 }, 'gh');
}

function drawLimb(layer, S, sd, ctx) {
  const sg = n => S.seg[n + sd], ft = sg('foot');
  const W = { arm: [5, 4], fore: [4, 3.4], thigh: [6.4, 5.2], shin: [5.2, 4], hand: [3.4, 1.8] };
  for (const n of ['thigh', 'shin', 'arm', 'fore', 'hand']) layer.add('path', { d: bonePath(sg(n).a, sg(n).b, W[n][0], W[n][1]) }, 'bn');
  layer.add('path', { d: `M${P(ft.a)}L${P(add(ft.heel, mul(sub(ft.a, ft.heel), .3)))}L${P(ft.heel)}L${P(ft.ball)}L${P(ft.toe)}Z` }, 'bn');
  drawMuscles(layer, S, ctx, sd);
  for (const [n, r] of [['shoulder', 4], ['elbow', 3.1], ['wrist', 2.3], ['hip', 4.4], ['knee', 3.7], ['ankle', 2.9]]) {
    const q = S[n + sd]; layer.add('circle', { cx: f1(q[0]), cy: f1(q[1]), r }, 'jt');
  }
}

// points in the trunk frame: [along (up from segment start), front/lateral]
function trunkPts(S, list, upper) {
  const base = upper ? S.waist : S.root, down = upper ? S.U : S.T;
  const up = dir(down + 180), fr = fv(down);
  return list.map(([a, f]) => add(add(base, mul(up, a)), mul(fr, f)));
}

function drawTrunkGhost(layer, S) {
  layer.add('path', { d: `M${P(add(S.root, mul(dir(S.T), 3)))}L${P(S.waist)}L${P(add(S.top, mul(dir(S.U), 2)))}`, 'stroke-width': S.front ? 34 : 28 }, 'gh');
  layer.add('path', { d: `M${P(S.seg.neck.a)}L${P(S.seg.neck.b)}`, 'stroke-width': 9 }, 'gh');
  layer.add('circle', { cx: f1(S.head[0]), cy: f1(S.head[1]), r: 12.5 }, 'ghf');
}

function drawTrunk(layer, S) {
  const front = S.front;
  const pel = front
    ? trunkPts(S, [[9, -16], [-1, -12], [-7, -5], [-7, 5], [-1, 12], [9, 16], [4, 7], [5, 0], [4, -7]])
    : trunkPts(S, [[10, -3], [7, 6], [2, 7.5], [-3, 3], [-9, -2], [-6, -6], [2, -8], [8, -8]]);
  layer.add('path', { d: smoothClosed(pel) }, 'bn bs');
  const rib = front
    ? trunkPts(S, [[4, -13], [15, -16], [26, -14], [30, -6], [30, 6], [26, 14], [15, 16], [4, 13], [8, 5], [8, -5]], true)
    : trunkPts(S, [[6, -7], [16, -9.5], [26, -8], [31, -3], [30, 5], [24, 11], [13, 11.5], [5, 7.5]], true);
  layer.add('path', { d: smoothClosed(rib) }, 'bn bs');
  if (front) {
    for (const r of [12, 18, 24]) {
      const [l0, lc, l1, r0, rc, r1] = trunkPts(S, [[r, -14], [r - 1, -9], [r - 4, -3], [r, 14], [r - 1, 9], [r - 4, 3]], true);
      layer.add('path', { d: `M${P(l0)}Q${P(lc)} ${P(l1)}M${P(r0)}Q${P(rc)} ${P(r1)}` }, 'rb');
    }
    const [cl, cr] = trunkPts(S, [[30, -2], [30, 2]], true);
    layer.add('path', { d: `M${P(cl)}L${P(S.shoulderF)}M${P(cr)}L${P(S.shoulderN)}` }, 'cv');
  } else {
    for (const r of [11, 17, 23]) {
      const [a, m, b] = trunkPts(S, [[r, -9], [r - 3, 3], [r - 5, 10.5]], true);
      layer.add('path', { d: `M${P(a)}Q${P(m)} ${P(b)}` }, 'rb');
    }
  }
  const sp = front
    ? [...trunkPts(S, [[-2, 0], [10, 0], [20, 0]]), ...trunkPts(S, [[10, 0], [31, 0]], true), S.seg.neck.b]
    : [...trunkPts(S, [[-3, -6], [8, -6.5], [20, -6]]), ...trunkPts(S, [[10, -7], [22, -6.5], [31, -3.5]], true), add(S.seg.neck.b, mul(fv(S.seg.neck.down), -1.5))];
  layer.add('path', { d: 'M' + sp.map(P).join('L') }, 'sp');
  // skull
  const ha = S.headAng - 180, hu = dir(ha + 180), hf = fv(ha);
  const rot = f1(Math.atan2(hu[1], hu[0]) / D2R);
  const ell = (c, rx, ry) => layer.add('ellipse', { cx: f1(c[0]), cy: f1(c[1]), rx, ry, transform: `rotate(${rot} ${f1(c[0])} ${f1(c[1])})` }, 'bn');
  if (front) {
    ell(add(S.head, mul(hu, -6.5)), 4.8, 5.5);
    ell(add(S.head, mul(hu, 1)), 10.5, 8.8);
    for (const s of [-1, 1]) { const e = add(add(S.head, mul(hf, 3.4 * s)), mul(hu, -1)); layer.add('circle', { cx: f1(e[0]), cy: f1(e[1]), r: 1.7 }, 'ey'); }
  } else {
    ell(add(add(S.head, mul(hu, -6.5)), mul(hf, 4)), 3.6, 5);
    ell(add(S.head, mul(hf, -1)), 10.5, 9.2);
    const eye = add(add(S.head, mul(hf, 6)), mul(hu, .5));
    layer.add('circle', { cx: f1(eye[0]), cy: f1(eye[1]), r: 1.7 }, 'ey');
  }
}

// ---------- props ----------
function drawProps(layer, props, ctx, S, off, which) {
  const vb = ctx.vb, fr = ctx.view === 'front';
  const live = v => { if (typeof v === 'string') { const q = point(S, v); return [q[0] + off[0], q[1] + off[1]]; } return v; };
  for (const pr of props) {
    const x = pr.x ?? 0, y = pr.y ?? 0;
    if (pr.type === 'bar' && !fr && which === 'back' && pr.frame !== false) {   // doorway-style frame holding the bar
      const fx = x + (pr.frameX ?? -46);
      layer.add('path', { d: `M${f1(x)},${f1(y)}L${f1(fx)},${f1(y)}L${f1(fx)},0`, 'stroke-width': 2.2 }, 'pl pfr');
    }
    const isFront = pr.type === 'bar' || pr.type === 'rings' || pr.type === 'band';
    if ((which === 'front') !== isFront) continue;
    switch (pr.type) {
      case 'bar':
        if (fr) layer.add('path', { d: `M${f1(x - 45)},${f1(y)}L${f1(x + 45)},${f1(y)}`, 'stroke-width': 3.4 }, 'pl');
        else layer.add('circle', { cx: x, cy: y, r: 4 }, 'pf');
        break;
      case 'rings':
        layer.add('path', { d: `M${f1(x)},${f1(vb[1] - 5)}L${f1(x)},${f1(y - 7)}`, 'stroke-width': 1.6 }, 'st');
        layer.add('circle', { cx: x, cy: y, r: 7 }, 'rg');
        break;
      case 'dip': {
        const w = pr.w || 44;
        layer.add('path', { d: `M${f1(x - w / 2)},${f1(y)}L${f1(x + w / 2)},${f1(y)}M${f1(x - w / 2 + 3)},${f1(y)}L${f1(x - w / 2 + 3)},0M${f1(x + w / 2 - 3)},${f1(y)}L${f1(x + w / 2 - 3)},0`, 'stroke-width': 3 }, 'pl');
        break; }
      case 'box': {
        const w = pr.w || 40;
        layer.add('rect', { x: f1(x - w / 2), y: f1(y), width: w, height: f1(-y), rx: 2 }, 'pb');
        break; }
      case 'table': {
        const w = pr.w || 70, left = pr.side === 'left';
        layer.add('rect', { x: f1(left ? x - w : x), y: f1(y - 4), width: w, height: 4, rx: 1 }, 'pb');
        const l1 = left ? x - w + 4 : x + w - 4;   // only the far leg: the near one would hide the body
        layer.add('path', { d: `M${f1(l1)},${f1(y)}L${f1(l1)},0`, 'stroke-width': 3 }, 'pl');
        break; }
      case 'wall':
        layer.add('rect', { x: f1(pr.side === 'left' ? x - 10 : x), y: f1(vb[1] - 10), width: 10, height: f1(-vb[1] + 10), rx: 0 }, 'pb');
        break;
      case 'post':          // door frame / upright seen side-on
        layer.add('rect', { x: f1(x - 3), y: f1(vb[1] - 10), width: 6, height: f1(-vb[1] + 10), rx: 1 }, 'pb pp');
        break;
      case 'parallettes': {
        const h = pr.h || 14;
        layer.add('path', { d: `M${f1(x - 14)},0L${f1(x - 8)},${f1(-h)}L${f1(x + 8)},${f1(-h)}L${f1(x + 14)},0`, 'stroke-width': 2.4 }, 'pl');
        break; }
      case 'band': {
        const a = live(pr.from), b = live(pr.to);
        const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + (pr.sag ?? 6)];
        layer.add('path', { d: `M${P(a)}Q${P(m)} ${P(b)}`, 'stroke-width': 2.6 }, 'bd');
        break; }
    }
  }
}

// ---------- view box ----------
const BODY_PTS = ['head', 'hip', 'toeN', 'toeF', 'heelN', 'heelF', 'kneeN', 'kneeF', 'fingerN', 'fingerF', 'elbowN', 'elbowF', 'shoulderN', 'shoulderF', 'chest', 'upperBack'];
function resolveProps(anim) {
  if (anim._props) return anim._props;
  return (anim._props = (anim.props || []).map(p => {
    const o = { ...p };
    let r0 = null;
    for (const k of ['x', 'y']) if (typeof o[k] === 'string' && o[k][0] === '@') {
      r0 = r0 || evalAnim(anim, p.t || 0);
      const q = point(r0.S, o[k].slice(1));
      o[k] = (k === 'x' ? q[0] + r0.off[0] : q[1] + q[2] + r0.off[1]) + (p[k + 'Off'] || 0);
    }
    return o;
  }));
}
export function computeViewBox(anim) {
  if (anim._vb) return anim._vb;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const inc = (x, y, r = 0) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); };
  for (let i = 0; i <= 24; i++) {
    const { S, off } = evalAnim(anim, i / 24);
    for (const n of BODY_PTS) { const q = point(S, n); inc(q[0] + off[0], q[1] + off[1], n === 'head' ? 13 : 7); }
  }
  for (const p of resolveProps(anim)) {
    if (/^(bar|rings|dip|box|parallettes)$/.test(p.type)) inc(p.x ?? 0, p.y ?? 0, 8);
    if (p.type === 'table') inc(p.x + (p.side === 'left' ? -20 : 20), p.y, 6);
  }
  if (anim.floor !== false) inc((x0 + x1) / 2, 4);
  const pad = 10;
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  let w = x1 - x0, h = y1 - y0;
  const ar = anim.aspect || (h > w * 1.05 ? 1 : 4 / 3);   // tall movements (hangs, handstands) get a square frame
  if (w < 200) { x0 -= (200 - w) / 2; w = 200; }
  if (w / h < ar) { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; }
  else { const nh = w / ar; y0 -= (nh - h) * (anim.floor !== false ? .85 : .5); h = nh; }
  return (anim._vb = [f1(x0), f1(y0), f1(w), f1(h)]);
}

// ---------- player ----------
const STYLE = `
.kt-sk{display:block;width:100%;height:auto;margin:0 auto;overflow:hidden}
.kt-sk .gh{fill:none;stroke:var(--ink-muted,#6B665C);stroke-opacity:.09;stroke-linecap:round;stroke-linejoin:round}
.kt-sk .ghf{fill:var(--ink-muted,#6B665C);fill-opacity:.09}
.kt-sk .bn{fill:var(--bone,#EDE5D3);stroke:var(--ink-muted,#6B665C);stroke-width:.8;stroke-linejoin:round}
.kt-sk .bs{fill-opacity:.55}
.kt-sk .rb{fill:none;stroke:var(--ink-muted,#6B665C);stroke-width:.8;stroke-opacity:.55;stroke-linecap:round}
.kt-sk .cv{fill:none;stroke:var(--bone,#EDE5D3);stroke-width:3;stroke-linecap:round}
.kt-sk .sp{fill:none;stroke:var(--ink-muted,#6B665C);stroke-width:3.4;stroke-dasharray:2.6 1.3;stroke-linejoin:round;stroke-opacity:.7}
.kt-sk .ey{fill:var(--ink-muted,#6B665C);fill-opacity:.7}
.kt-sk .jt{fill:var(--joint,#8A8374);stroke:var(--bone,#EDE5D3);stroke-width:.8}
.kt-sk .m{stroke:none}
.kt-sk .mp{fill:var(--muscle-primary,#C8372D);opacity:.85;animation:ktPulse 1.8s ease-in-out infinite}
.kt-sk .ms{fill:var(--muscle-secondary,#D9A441);opacity:.6}
.kt-sk .mi{fill:var(--ink-muted,#6B665C);opacity:.07}
.kt-sk .far{opacity:.45}
.kt-sk .fl{stroke:var(--ink-muted,#6B665C);stroke-width:1.2;stroke-opacity:.55}
.kt-sk .flh{stroke:var(--ink-muted,#6B665C);stroke-width:.8;stroke-opacity:.22}
.kt-sk .pl,.kt-sk .st{fill:none;stroke:var(--ink-muted,#6B665C);stroke-linecap:round;stroke-linejoin:round}
.kt-sk .pf{fill:var(--ink-muted,#6B665C)}
.kt-sk .pfr{stroke-opacity:.35}
.kt-sk .pp{opacity:.6}
.kt-sk .pb{fill:var(--line,#E3DCCB);stroke:var(--ink-muted,#6B665C);stroke-width:1}
.kt-sk .rg{fill:none;stroke:var(--ink-muted,#6B665C);stroke-width:2.4}
.kt-sk .bd{fill:none;stroke:var(--accent-2,#D9A441);stroke-linecap:round}
@keyframes ktPulse{0%,100%{opacity:.9}50%{opacity:.6}}
@media (prefers-reduced-motion:reduce){.kt-sk .mp{animation:none}}`;
function injectStyle() {
  if (typeof document === 'undefined' || document.getElementById('kt-sk-style')) return;
  const s = document.createElement('style'); s.id = 'kt-sk-style'; s.textContent = STYLE; document.head.appendChild(s);
}

const FALLBACK = { view: 'side', anchor: 'feet', balance: true, duration: 4000, hold: true, props: [], frames: [{ t: 0, pose: { footN: 90, footF: 90, shN: 4, elN: 8, shF: -4, elF: 8 } }] };

export function createV1Player(container, animId, { primary = [], secondary = [], size = 280, playing = true } = {}) {
  injectStyle();
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'kt-sk'); svg.setAttribute('role', 'img');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.maxWidth = size + 'px';
  container.appendChild(svg);
  const L = {};
  for (const k of ['floor', 'back', 'far', 'ghost', 'trunk', 'trunkM', 'mid', 'near', 'front']) L[k] = new Layer(svg);
  const st = { anim: null, ctx: null, playing: playing && !reduce, visible: true, elapsed: 0, last: 0, raf: 0, fixedT: null };

  function setAnim(id, prim = primary, sec = secondary) {
    primary = prim || []; secondary = sec || [];
    st.anim = ANIMS[id] || FALLBACK;
    const vb = computeViewBox(st.anim);
    svg.setAttribute('viewBox', vb.join(' '));
    svg.setAttribute('aria-label', `${String(id || 'standing').replace(/_/g, ' ')} animation`);
    st.ctx = { prim: new Set(primary), sec: new Set(secondary), vb, view: st.anim.view || 'side' };
    L.far.g.setAttribute('class', st.ctx.view === 'front' ? '' : 'far');
    st.elapsed = 0;
    for (const k in L) L[k].reset();
    draw();
  }

  function tNow() {
    if (st.fixedT != null) return st.fixedT;
    if (!st.playing && st.elapsed === 0) return st.anim.still ?? .5;
    return (st.elapsed % st.anim.duration) / st.anim.duration;
  }

  function draw() {
    const anim = st.anim, ctx = st.ctx;
    const { S, off } = evalAnim(anim, tNow(), st.elapsed);
    const tr = `translate(${f1(off[0])} ${f1(off[1])})`;
    for (const k of ['far', 'ghost', 'trunk', 'trunkM', 'mid', 'near']) L[k].g.setAttribute('transform', tr);
    for (const k in L) L[k].begin();
    const vb = ctx.vb;
    if (anim.floor !== false) {
      L.floor.add('line', { x1: vb[0], x2: f1(vb[0] + vb[2]), y1: 0, y2: 0 }, 'fl');
      for (let x = Math.ceil(vb[0] / 12) * 12; x < vb[0] + vb[2] + 6; x += 12) L.floor.add('line', { x1: x, x2: x - 5, y1: 1.5, y2: 6 }, 'flh');
    }
    const props = resolveProps(anim);
    drawProps(L.back, props, ctx, S, off, 'back');
    drawLimbGhost(L.far, S, 'F');
    drawTrunkGhost(L.ghost, S);
    drawLimbGhost(L.ghost, S, 'N');
    if (ctx.view === 'front') drawLimb(L.mid, S, 'F', ctx); else drawLimb(L.far, S, 'F', ctx);
    drawTrunk(L.trunk, S);
    drawMuscles(L.trunkM, S, ctx, null);
    drawLimb(L.near, S, 'N', ctx);
    drawProps(L.front, props, ctx, S, off, 'front');
    for (const k in L) L[k].end();
  }

  function loop(ts) {
    st.raf = 0;
    if (!st.playing || !st.visible) return;
    const dt = st.last ? Math.min(100, ts - st.last) : 16;
    st.last = ts; st.elapsed += dt;
    draw();
    st.raf = requestAnimationFrame(loop);
  }
  function kick() { if (st.playing && st.visible && !st.raf) { st.last = 0; st.raf = requestAnimationFrame(loop); } }

  let io = null;
  if (typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; kick(); });
    io.observe(svg);
  }
  setAnim(animId, primary, secondary);
  kick();

  const api = {
    play() { st.fixedT = null; st.playing = true; kick(); },
    pause() { st.playing = false; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; },
    setAnim(id, prim, sec) { st.fixedT = null; setAnim(id, prim, sec); kick(); },
    destroy() { api.pause(); if (io) io.disconnect(); svg.remove(); },
    seek(t) { st.fixedT = t; draw(); },   // debug / scrubbing: freeze at t in [0,1]; play() resumes
    svg,
  };
  return api;
}

// ---------- public player: the human body (v3) or the v2 anatomical plate where a clip exists, v1 otherwise ----------
// Same contract as before. setAnim() swaps renderer in place when crossing kinds. ?anim=v1 forces v1, ?anim=v2 the v2
// plate (classic skeleton), ?anim=v3 the human body (A/B review).
// Me -> Animation chooses the figure: 'human' (default: the v3 human body, driven live by the v2 motion) or 'classic'
// (the v2 plate). v3 needs WebGL2; without it, or if it fails to load or loses its context, the v2 plate takes over for
// the rest of the session. Both are lazy: the renderer, the body (0.5 MB, once) and the exercise's clip group are
// imported the first time an animated exercise is shown (a blank placeholder holds the space meanwhile).
const FORCE = typeof location !== 'undefined' ? (/[?&]anim=(v1|v2|v3)(&|$)/.exec(location.search) || [])[1] : null;
const FORCE_V1 = FORCE === 'v1';
export const isV2 = id => !FORCE_V1 && V2_IDS.has(id);
/**
 * The figure the player draws, from Me -> Animation: figure 'human' | 'classic', sex 'f' | 'm' (default: the profile's
 * sex, female when unspecified), skeleton: the skeleton inside the see-through body (default off).
 */
export function figurePrefs(state) {
  let st = state;
  if (!st) { try { st = getState(); } catch { st = null; } }
  const s = st?.settings || {}, p = st?.profile;
  const figure = FORCE === 'v3' ? 'human' : FORCE === 'v2' ? 'classic' : s.animFigure === 'classic' ? 'classic' : 'human';
  const sex = s.animBody === 'm' || s.animBody === 'f' ? s.animBody : p?.sex === 'male' ? 'm' : 'f';
  return { figure, sex, skeleton: s.animSkeleton === true };
}
let plateMod = null, v3Mod = null, v3Broken = false;
const groups = new Map(), loaded = new Set();   // clip group -> import promise; groups ready
function loadGroup(id) {
  const g = V2_GROUP_OF[id];
  if (!groups.has(g)) groups.set(g, import(`./v2/clips/${g}.js`).then(() => loaded.add(g), e => { groups.delete(g); throw e; }));
  return groups.get(g);
}
export function loadV2(id) {
  return Promise.all([import('./v2/plate.js'), loadGroup(id)]).then(([m]) => { plateMod = m; });
}
// v3: the body player, the clip group and the chosen body; rejects without WebGL2 (the caller falls back to v2)
export function loadV3(id, sex) {
  return Promise.all([import('./v3/body-player.js'), loadGroup(id)]).then(async ([m]) => {
    if (!m.hasWebGL()) throw new Error('WebGL2 unavailable');
    await m.ensureBody(sex);
    v3Mod = m;
  });
}
const v2Ready = id => !!plateMod && loaded.has(V2_GROUP_OF[id]);
const v3Ready = (id, sex) => !!v3Mod && loaded.has(V2_GROUP_OF[id]) && v3Mod.bodyReady(sex);
/** v3 failed on this device (no WebGL2, load error, lost context): the v2 plate for the rest of the session. */
export const v3Failed = () => v3Broken;
function placeholder(container, size) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 4 3'); svg.setAttribute('class', 'kt-ph'); svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = `display:block;width:100%;height:auto;max-width:${size}px;margin:0 auto`;
  container.appendChild(svg);
  const nop = () => {};
  return { svg, play: nop, pause: nop, seek: nop, setAnim: nop, destroy() { svg.remove(); } };
}
// opts.breath / opts.trail (default off): v2 breath ring and motion trail; v1 ignores both
// opts.muscles (default true): false draws the figure with no muscle highlight (v1 and v2), e.g. for a tradition whose
// card sets showMuscles: false (the Morning Taisō); setAnim's opts.muscles changes it for the next clip
// opts.look (human body only): 'xray' (default: see-through body, muscles, optional skeleton) or 'solid' (the solid
// figure in sportswear: a tradition card's bodyLook, the Morning Taisō); setAnim's opts.look changes it.
// opts.figure / opts.sex / opts.skeleton override Me -> Animation (review pages, tests).
export function createSkeletonPlayer(container, animId, opts = {}) {
  const pref = figurePrefs();
  const o = { primary: [], secondary: [], size: 280, playing: true, breath: false, trail: false, pace: null, fit: null, muscles: true, look: 'xray',
    figure: pref.figure, sex: pref.sex, skeleton: pref.skeleton, ...opts };
  const mus = () => (o.muscles === false ? { primary: [], secondary: [] } : { primary: o.primary, secondary: o.secondary });
  let p = null, kind = null, cur = null, gen = 0, dead = false, fixedT = null;
  const wantV3 = id => o.figure === 'human' && !v3Broken && isV2(id);
  function fail(e) {
    console.warn('anim v3 unavailable, using v2', e);
    v3Broken = true;
    if (dead) return;
    const my = ++gen;
    if (v2Ready(cur)) show(cur, { flow: o.flow });
    else loadV2(cur).then(() => { if (!dead && my === gen) show(cur, { flow: o.flow }); }, () => { if (!dead && my === gen) mount('v1'); });
  }
  function mount(k) {
    const old = p;
    if (k === 'v3') {
      try { p = v3Mod.createBodyPlayer(container, cur, { ...o, ...mus(), onLost: e => fail(e) }); } catch (e) { p = old; fail(e); return; }
    } else p = k === 'v2' ? plateMod.createPlatePlayer(container, cur, { ...o, ...mus() }) : k === 'v1' ? createV1Player(container, cur, { ...o, ...mus() }) : placeholder(container, o.size);
    kind = k;
    if (old) { if (old.svg.parentNode === container) container.insertBefore(p.svg, old.svg); old.destroy(); }
    if (fixedT != null) p.seek(fixedT);
  }
  function show(id, opts) {
    const k = wantV3(id) ? 'v3' : isV2(id) ? 'v2' : 'v1';
    if (p && kind === k) { const m = mus(); p.setAnim(id, m.primary, m.secondary, { ...opts, muscles: o.muscles !== false, look: o.look }); } else mount(k);
  }
  // opts (v2 / v3): { flow, blend } for flow steps: no fades at the step's ends, and a pose blend from the previous step
  function load(id, prim, sec, opts = {}) {
    cur = id; if (prim) o.primary = prim; if (sec) o.secondary = sec; o.flow = !!opts.flow; if ('muscles' in opts) o.muscles = opts.muscles !== false;
    if (opts.look) o.look = opts.look;
    const my = ++gen;
    if (wantV3(id)) {
      if (v3Ready(id, o.sex)) { show(id, opts); return; }
      if (kind !== 'ph' && kind !== 'v3') mount('ph');
      // (if v3 failed meanwhile for another player, load() takes the v2 route for this one)
      loadV3(id, o.sex).then(() => { if (!dead && my === gen) { if (wantV3(id)) show(id, opts); else load(id, null, null, opts); } },
        e => { if (!dead && my === gen) fail(e); else v3Broken = true; });
      return;
    }
    if (!isV2(id) || v2Ready(id)) { show(id, opts); return; }
    if (kind !== 'ph') mount('ph');
    loadV2(id).then(() => { if (!dead && my === gen) show(id, opts); },
      e => { console.warn('anim v2 unavailable, using v1', e); if (!dead && my === gen) mount('v1'); });
  }
  load(animId, null, null, { flow: o.flow, look: o.look });
  return {
    play() { o.playing = true; fixedT = null; p.play(); },
    pause() { o.playing = false; p.pause(); },
    setAnim(id, prim, sec, opts) { fixedT = null; load(id, prim, sec, opts); },
    destroy() { dead = true; p.destroy(); },
    seek(t) { fixedT = t; p.seek(t); },
    setBreath(on) { o.breath = !!on; p.setBreath?.(o.breath); },
    setTrail(on) { o.trail = !!on; p.setTrail?.(o.trail); },
    // flows: seconds per count of the current step (v2 clips with `counts` fit their cycle to it); fit: a timed step's
    // seconds (a whole number of cycles in them); null = natural tempo
    setPace(sec, fit) { o.pace = sec > 0 ? sec : null; o.fit = fit > 0 ? fit : null; p.setPace?.(o.pace, o.fit); },
    get svg() { return p.svg; },
    get renderer() { return kind; },   // 'v3' | 'v2' | 'v1' | 'ph' (still loading)
    get ready() { return kind !== 'ph'; },
    get look() { return o.look; },
    stats() { return p.stats ? p.stats() : null; },   // frame cost of the renderer inside (v2 plate / v3 body); review and bench pages
  };
}
