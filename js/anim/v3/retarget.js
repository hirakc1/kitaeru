// Kitaeru animation v3: the v2 motion core drives the v3 human body, live, every frame (the "bridge").
//
// v2 (js/anim/v2/core.js) builds a full skeleton for any time t: world frames for the pelvis, every vertebra, the head,
// both scapulae, humeri, forearms, hands, femurs, tibiae and feet, plus named points (cm; x forward, y up, z right).
// This module turns one such skeleton into bone rotations for the MakeHuman game-engine rig (metres; +Z forward, +Y up,
// +X the body's left). The rig's rest rotations are all identity (build_body.py), so a bone's world rotation is set
// directly and its local rotation is parent^T * world.
//
//   pelvis, spine, neck, head    the v2 frame's rotation relative to v2's neutral stance (so each body keeps its own
//                                rest curvature)
//   clavicles                    the swing of v2's clavicle line (sternal end -> acromion) in the chest frame
//   arms, legs                   two-bone IK to a wrist / ankle target, the elbow / knee bending towards v2's, then
//                                basis matching (the bone's direction + v2's anterior axis) so twist follows v2;
//                                the forearm takes 60 % of the pronation, the hand the rest (no candy-wrapper wrist)
//   hands, feet, toes            basis matching to v2's hand (along + palm normal) and foot (toes + up) frames
//   fingers                      curls from v2's hand shape (relaxed / palm / fist / hook / point / bazi) and 'fingers'
//
// Targets. Planted limbs (feet on the floor in IK clips; palms, forearms or hands on a bar, floor, wall or leg) go to
// v2's own contact point, scaled to this body (leg length), so planted feet and hands never slide. Free arms keep
// v2's arm shape (the wrist relative to the shoulder, scaled by arm length), so hands in front of the chest stay in
// front of this body's chest. Where this body's arms or legs are too short for a planted contact (its proportions are
// not v2's), the whole body moves towards it (root correction). Lying and kneeling poses: a few hundred skin probe
// points are skinned on the CPU and the body is lifted so the flesh (which v2 does not have) rests on the floor.
import * as K from '../v2/core.js';

// ---- small 3x3 / vector kit (row-major 9-arrays, like core.js) ----
const V = (x, y, z) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const madd = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const nrm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const perp = (v, d) => nrm(madd(v, d, -dot(v, d)));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mm = K.mm, mv = K.mv;
const tr = m => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
// columns e1, e2, e3 from a primary and a secondary direction
function basis(p, s) {
  const e1 = nrm(p); let e2 = madd(s, e1, -dot(s, e1));
  if (len(e2) < 1e-6) e2 = perp(Math.abs(e1[1]) < .9 ? [0, 1, 0] : [1, 0, 0], e1); else e2 = nrm(e2);
  const e3 = cross(e1, e2);
  return [e1[0], e2[0], e3[0], e1[1], e2[1], e3[1], e1[2], e2[2], e3[2]];
}
// rotation taking unit a to unit b (minimal)
function rotBetween(a, b) {
  a = nrm(a); b = nrm(b);
  const v = cross(a, b), c = dot(a, b);
  if (c < -.99999) { const ax = perp(Math.abs(a[0]) < .9 ? [1, 0, 0] : [0, 1, 0], a); return axisAngle(ax, Math.PI); }
  const k = 1 / (1 + c);
  return [c + v[0] * v[0] * k, v[0] * v[1] * k - v[2], v[0] * v[2] * k + v[1],
    v[1] * v[0] * k + v[2], c + v[1] * v[1] * k, v[1] * v[2] * k - v[0],
    v[2] * v[0] * k - v[1], v[2] * v[1] * k + v[0], c + v[2] * v[2] * k];
}
function axisAngle(a, t) {
  const c = Math.cos(t), s = Math.sin(t), C = 1 - c, [x, y, z] = a;
  return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
}
// v2 -> rig axes: rig.x = -v2.z (v2 z is the body's right; rig +X its left), rig.y = v2.y, rig.z = v2.x (forward)
const Mv = v => [-v[2], v[1], v[0]];
const MR = [0, 0, -1, 0, 1, 0, 1, 0, 0];
const MRt = tr(MR);
const conj = R => mm(MR, mm(R, MRt));
// rotation matrix -> quaternion [x, y, z, w]
function quat(m, out, o) {
  const t = m[0] + m[4] + m[8];
  let x, y, z, w;
  if (t > 0) { const s = .5 / Math.sqrt(t + 1); w = .25 / s; x = (m[7] - m[5]) * s; y = (m[2] - m[6]) * s; z = (m[3] - m[1]) * s; }
  else if (m[0] > m[4] && m[0] > m[8]) { const s = 2 * Math.sqrt(1 + m[0] - m[4] - m[8]); w = (m[7] - m[5]) / s; x = .25 * s; y = (m[1] + m[3]) / s; z = (m[2] + m[6]) / s; }
  else if (m[4] > m[8]) { const s = 2 * Math.sqrt(1 + m[4] - m[0] - m[8]); w = (m[2] - m[6]) / s; x = (m[1] + m[3]) / s; y = .25 * s; z = (m[5] + m[7]) / s; }
  else { const s = 2 * Math.sqrt(1 + m[8] - m[0] - m[4]); w = (m[3] - m[1]) / s; x = (m[2] + m[6]) / s; y = (m[5] + m[7]) / s; z = .25 * s; }
  out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = w;
}
function ik2(A, T, la, lb, pole) {
  const d = sub(T, A), L0 = len(d) || 1e-6, dir = mul(d, 1 / L0);
  const L = clamp(L0, Math.abs(la - lb) + 1e-4, la + lb - 1e-5);
  const x = (la * la - lb * lb + L * L) / (2 * L), h = Math.sqrt(Math.max(0, la * la - x * x));
  let p = madd(pole, dir, -dot(pole, dir));
  p = len(p) < 1e-6 ? perp(Math.abs(dir[1]) < .9 ? [0, 1, 0] : [1, 0, 0], dir) : nrm(p);
  return { mid: add(A, add(mul(dir, x), mul(p, h))), end: madd(A, dir, L), miss: L0 - L };
}

const LEG_V2 = K.LEN.femur + K.LEN.tibia, ARM_V2 = K.LEN.humerus + K.LEN.fore;
const SPINE_SRC = { spine_01: 2, spine_02: 4, spine_03: K.T_INDEX(6), neck_01: 5 + 12 + 3 };
const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];
// finger curls (deg per joint) by v2 hand shape; the 'fingers' channel adds its degrees spread like v2's handShape
const SHAPES = {
  relaxed: { f: [14, 22, 14], t: [-8, 10, 8], spread: 1 },
  palm: { f: [-10, -12, -8], t: [-40, 0, 0], spread: 1 },           // flat on the floor: MakeHuman's rest fingers are curled a little
  fist: { f: [78, 95, 60], t: [20, 45, 40], spread: 0 },
  hook: { f: [55, 70, 45], t: [18, 30, 25], spread: .3 },
  point: { f: [78, 95, 60], t: [20, 45, 40], spread: 0, index: [4, 6, 2] },
  bazi: { f: [78, 95, 60], t: [0, 4, 0], spread: 0, index: [2, 4, 2] },
};

let S0 = null;                                     // v2 neutral stance (zero channels, arms and legs FK)
function neutral() {
  if (S0) return S0;
  const ch = Object.fromEntries(K.CHANNELS.map(c => [c, 0]));
  S0 = K.build(ch, { clip: {}, breath: .5 });
  return S0;
}

/**
 * Prepare a retargeter for a body template (glb.js parseBody). Returns { pose(S, bones, opts), points, probes }.
 */
export function createRetarget(tpl) {
  const N = tpl.names, bi = Object.fromEntries(N.map((n, i) => [n, i])), H = tpl.head;
  const h = n => H[bi[n]], par = n => (tpl.parent[bi[n]] >= 0 ? N[tpl.parent[bi[n]]] : null);
  const off = n => sub(h(n), h(par(n)));
  const d = (a, b) => len(sub(h(b), h(a)));
  const legLen = d('thigh_l', 'calf_l') + d('calf_l', 'foot_l');
  const armLen = d('upperarm_l', 'lowerarm_l') + d('lowerarm_l', 'hand_l');
  const s = legLen / LEG_V2;                                      // metres per v2 cm
  const dy = h('foot_l')[1] - 7.5 * s;                             // v2 ankle height 7.5 cm
  const hipC = mul(add(h('thigh_l'), h('thigh_r')), .5), pelOff = sub(h('pelvis'), hipC);
  const toRig = p => [-p[2] * s, p[1] * s + dy, p[0] * s];
  const S0n = neutral();
  const n0 = {};
  for (const b in SPINE_SRC) n0[b] = S0n.vert[SPINE_SRC[b]].R;
  n0.head = S0n.F.head.R; n0.pelvis = S0n.F.pelvis.R;
  const T40 = S0n.F.T4.R;
  // rest bases (rig world = rest local: identity rotations)
  const rest = {};
  for (const [sd, side] of [['l', 1], ['r', -1]]) {
    const ua = sub(h('lowerarm_' + sd), h('upperarm_' + sd)), fa = sub(h('hand_' + sd), h('lowerarm_' + sd));
    const along = sub(h('middle_01_' + sd), h('hand_' + sd));
    const across = sub(h('index_01_' + sd), h('pinky_01_' + sd));
    const palm = nrm(mul(cross(along, across), side));
    let ant = perp(fa, ua); if (ant[2] < 0) ant = mul(ant, -1);
    rest['upperarm_' + sd] = basis(ua, ant);
    rest['lowerarm_' + sd] = basis(fa, palm);
    rest['hand_' + sd] = basis(along, palm);
    rest.palm = rest.palm || {}; rest.palm[sd] = palm;
    const th = sub(h('calf_' + sd), h('thigh_' + sd)), ca = sub(h('foot_' + sd), h('calf_' + sd));
    rest['thigh_' + sd] = basis(th, perp([0, 0, 1], th));
    rest['calf_' + sd] = basis(ca, perp([0, 0, 1], ca));
    const f = sub(h('ball_' + sd), h('foot_' + sd)); f[1] = 0;
    rest['foot_' + sd] = basis(f, [0, 1, 0]);
    rest['ball_' + sd] = rest['foot_' + sd];
    // clavicle rest direction; v2's neutral clavicle line in its chest (T4) frame
    rest['clav_' + sd] = nrm(off('upperarm_' + sd));
    const v2s = sd === 'l' ? 'L' : 'R';
    rest['clav0_' + sd] = nrm(sub(S0n.pt['acromion' + v2s], S0n.pt['clavSternal' + v2s]));   // v2 world, neutral
    rest['faDir_' + sd] = nrm(fa);
  }
  // fingers: flexion axis per finger in rest (hand) space: curling turns the finger towards the palm
  const fingerAx = {};
  for (const sd of ['l', 'r']) for (const f of FINGERS) {
    const a = nrm(sub(h(`${f}_02_${sd}`), h(`${f}_01_${sd}`)));
    fingerAx[f + sd] = nrm(cross(a, rest.palm[sd]));
  }

  // ---- probes: skin points for the floor (torso, head, upper arms, thighs; not hands or feet) ----
  const probes = [];
  {
    const pos = tpl.geo.attributes.position, si = tpl.geo.attributes.skinIndex, sw = tpl.geo.attributes.skinWeight;
    const skip = new Set(['hand', 'foot', 'ball', 'calf', 'lowerarm', ...FINGERS].flatMap(b => [b + '_l', b + '_r']).concat(FINGERS.flatMap(f => [1, 2, 3].flatMap(k => [`${f}_0${k}_l`, `${f}_0${k}_r`]))));
    const q = 1e-4;
    for (let v = 0; v < pos.count; v += 23) {
      const j0 = si.getX(v); if (skip.has(N[j0])) continue;
      const p = [pos.getX(v) * q, pos.getY(v) * q, pos.getZ(v) * q];
      const js = [si.getX(v), si.getY(v), si.getZ(v), si.getW(v)], ws = [sw.getX(v), sw.getY(v), sw.getZ(v), sw.getW(v)];
      probes.push({ p, js, ws: ws.map(x => (x > 1 ? x / 255 : x)) });
    }
  }

  const G = new Array(N.length), P = new Array(N.length);
  const qOut = new Float32Array(N.length * 4);
  const setG = (n, R) => { G[bi[n]] = R; };
  const g = n => G[bi[n]] || I3;
  const fk = n => { const p = par(n); P[bi[n]] = add(P[bi[p]], mv(g(p), off(n))); return P[bi[n]]; };

  /**
   * Pose the rig for v2 skeleton S. opts: { planted: {R, L} arm weights (0 free .. 1 planted), legsPlanted: bool,
   * floor: bool (lift the flesh onto the floor) }. Writes local quaternions (qOut, per bone index) and the pelvis's
   * local position. Returns { q: qOut, pelvis: [x, y, z] (local to its parent), P, G }.
   */
  function pose(S, opts = {}) {
    G.fill(null); P.fill(null);
    const Rp = conj(mm(S.F.pelvis.R, tr(n0.pelvis)));
    let root = add(toRig(S.F.pelvis.o), mv(Rp, pelOff));
    const planted = opts.planted || { R: 0, L: 0 };
    // two passes when a planted limb cannot reach: move the body towards it and solve again
    let corr = [0, 0, 0];
    for (let pass = 0; pass < 3; pass++) {
      const miss = solve(S, Rp, add(root, corr), planted, opts);
      if (!miss.n) break;
      const m = mul(miss.v, 1 / miss.n);
      if (len(m) < 5e-4) break;
      corr = add(corr, m);
    }
    // the flesh on the floor: lift so no probe is under it
    let lift = 0;
    if (opts.floor !== false) {
      let low = 1e9;
      for (const pr of probes) {
        let y = 0;
        for (let k = 0; k < 4; k++) { const w = pr.ws[k]; if (!w) continue; const j = pr.js[k]; y += w * (mv(G[j] || I3, sub(pr.p, H[j]))[1] + P[j][1]); }
        if (y < low) low = y;
      }
      lift = .004 - low;
      if (lift > 0) { corr = add(corr, [0, lift, 0]); solve(S, Rp, add(root, corr), planted, opts); } else lift = 0;
    }
    for (let i = 0; i < N.length; i++) {
      const p = tpl.parent[i];
      const R = p >= 0 ? mm(tr(G[p] || I3), G[i] || I3) : (G[i] || I3);
      quat(R, qOut, i * 4);
    }
    const rp = par('pelvis');
    return { q: qOut, pelvis: sub(P[bi.pelvis], rp ? P[bi[rp]] : [0, 0, 0]), P, G, s, toRig, corr, lift };
  }

  function solve(S, Rp, pelvisPos, planted, opts) {
    const miss = { v: [0, 0, 0], n: 0 };
    const rootName = par('pelvis');
    if (rootName) { P[bi[rootName]] = h(rootName); G[bi[rootName]] = I3; }
    setG('pelvis', Rp); P[bi.pelvis] = pelvisPos;
    for (const b of ['spine_01', 'spine_02', 'spine_03', 'neck_01']) { setG(b, conj(mm(S.vert[SPINE_SRC[b]].R, tr(n0[b])))); fk(b); }
    setG('head', conj(mm(S.F.head.R, tr(n0.head)))); fk('head');
    const Rc = g('spine_03'), T4 = S.F.T4.R;
    for (const [sd, v2s, side] of [['l', 'L', 1], ['r', 'R', -1]]) {
      // clavicle: v2's clavicle swing in the chest frame, applied to this body's clavicle
      // (the current clavicle line, re-expressed as if the chest were in its neutral pose)
      const c1 = mv(T40, mv(tr(T4), nrm(sub(S.pt['acromion' + v2s], S.pt['clavSternal' + v2s]))));
      const sw = rotBetween(Mv(rest['clav0_' + sd]), Mv(c1));
      setG('clavicle_' + sd, mm(Rc, sw)); fk('clavicle_' + sd);
      const sh = fk('upperarm_' + sd);
      // wrist target: v2's (planted: its own point; free: its shape relative to the shoulder)
      const Gv = S.pt['glenoid' + v2s], Wv = S.pt['wrist' + v2s], Ev = S.pt['elbow' + v2s];
      const wp = clamp(planted[v2s] || 0, 0, 1);
      const rel = add(sh, mul(Mv(sub(Wv, Gv)), armLen / ARM_V2 * 1));
      const abs = toRig(Wv);
      const W = wp > 0 ? add(mul(rel, 1 - wp), mul(abs, wp)) : rel;
      const la = d('upperarm_' + sd, 'lowerarm_' + sd), lb = d('lowerarm_' + sd, 'hand_' + sd);
      const pole = Mv(sub(Ev, mul(add(Gv, Wv), .5)));
      const r = ik2(sh, W, la, lb, pole);
      if (wp > .5 && r.miss > 1e-3) { miss.v = add(miss.v, mul(nrm(sub(W, sh)), r.miss)); miss.n++; }
      const hu = S.F['humerus' + v2s], hd = S.F['hand' + v2s];
      const Gua = mm(basis(sub(r.mid, sh), Mv(hu.x)), tr(rest['upperarm_' + sd]));
      setG('upperarm_' + sd, Gua); fk('lowerarm_' + sd);
      // forearm: hinge from the upper arm, then 60 % of the twist towards the hand's palm
      const fdir = nrm(sub(r.end, r.mid));
      const hinge = mm(rotBetween(mv(Gua, rest['faDir_' + sd]), fdir), Gua);
      const palmT = Mv(hd.x), pn0 = mv(hinge, rest.palm[sd]);
      const a0 = perp(pn0, fdir), a1 = perp(palmT, fdir);
      const tw = Math.atan2(dot(cross(a0, a1), fdir), dot(a0, a1));
      const Gfa = mm(axisAngle(fdir, tw * .6), hinge);
      setG('lowerarm_' + sd, Gfa); fk('hand_' + sd);
      const Gh = mm(basis(Mv(hd.y), Mv(hd.x)), tr(rest['hand_' + sd]));
      setG('hand_' + sd, Gh);
      fingers(sd, Gh, hd);
      // leg: ankle at v2's ankle (scaled), knee towards v2's knee
      const hip = fk('thigh_' + sd);
      const Av = S.pt['ankle' + v2s], Kv = S.pt['knee' + v2s], Hv = S.pt['hip' + v2s];
      const A = toRig(Av);
      const l1 = d('thigh_' + sd, 'calf_' + sd), l2 = d('calf_' + sd, 'foot_' + sd);
      const rl = ik2(hip, A, l1, l2, Mv(sub(Kv, mul(add(Hv, Av), .5))));
      if (opts.legsPlanted && rl.miss > 1e-3 && Av[1] < 12) { miss.v = add(miss.v, mul(nrm(sub(A, hip)), rl.miss)); miss.n++; }
      const fe = S.F['femur' + v2s], ti = S.F['tibia' + v2s], ft = S.F['foot' + v2s];
      setG('thigh_' + sd, mm(basis(sub(rl.mid, hip), Mv(fe.x)), tr(rest['thigh_' + sd]))); fk('calf_' + sd);
      setG('calf_' + sd, mm(basis(sub(rl.end, rl.mid), Mv(ti.x)), tr(rest['calf_' + sd]))); fk('foot_' + sd);
      const Gf = mm(basis(Mv(ft.x), Mv(ft.y)), tr(rest['foot_' + sd]));
      setG('foot_' + sd, Gf); fk('ball_' + sd);
      if (ft.toeFlat) { const R = ft.toeFlat; setG('ball_' + sd, mm(basis(Mv([R[0], R[3], R[6]]), Mv([R[1], R[4], R[7]])), tr(rest['ball_' + sd]))); }
      else setG('ball_' + sd, Gf);
    }
    return miss;
  }

  function fingers(sd, Gh, hd) {
    const sh = SHAPES[hd.shape] || SHAPES.relaxed, extra = hd.fingers || 0, grip = hd.grip;
    for (const f of FINGERS) {
      let c = f === 'thumb' ? sh.t : f === 'index' && sh.index ? sh.index : sh.f;
      if (grip === 'bar' && f !== 'thumb') c = SHAPES.hook.f;
      if (grip === 'palm') c = f === 'thumb' ? SHAPES.palm.t : SHAPES.palm.f;
      const ax = fingerAx[f + sd];
      let R = Gh;
      for (let k = 1; k <= 3; k++) {
        const n = `${f}_0${k}_${sd}`;
        if (!(n in bi)) continue;
        const deg = c[k - 1] + (f === 'thumb' ? extra * .35 : extra * [.42, .33, .25][k - 1]);
        R = mm(R, axisAngle(ax, deg * K.DEG));
        setG(n, R); fk(n);
      }
    }
  }

  // named v2 points on this body (for the motion trail), from the last pose's joints
  const PT = {
    palm: (sd, o) => add(o.P[bi['hand_' + sd]], mv(o.G[bi['hand_' + sd]], mul(sub(h('middle_01_' + sd), h('hand_' + sd)), .6))),
    wrist: (sd, o) => o.P[bi['hand_' + sd]], elbow: (sd, o) => o.P[bi['lowerarm_' + sd]], acromion: (sd, o) => o.P[bi['upperarm_' + sd]],
    hip: (sd, o) => o.P[bi['thigh_' + sd]], knee: (sd, o) => o.P[bi['calf_' + sd]], ankle: (sd, o) => o.P[bi['foot_' + sd]],
    heel: (sd, o) => add(o.P[bi['foot_' + sd]], mv(o.G[bi['foot_' + sd]], [0, -.055, -.05])),
  };
  const headPt = (o, v) => add(o.P[bi.head], mv(o.G[bi.head], v));
  function point(name, o) {
    const m = /^(.*)([RL])$/.exec(name);
    if (m && PT[m[1]]) return PT[m[1]](m[2] === 'R' ? 'r' : 'l', o);
    if (name === 'pelvis') return o.P[bi.pelvis];
    if (name === 'sternum') return add(o.P[bi.spine_03], mv(o.G[bi.spine_03], [0, .1, .1]));
    if (name === 'headTop') return headPt(o, [0, .2, 0]);
    if (name === 'chin') return headPt(o, [0, -.03, .1]);
    if (name === 'nose') return headPt(o, [0, .04, .11]);
    return null;
  }
  return { pose, point, s, dy, toRig, legLen, armLen, names: N, index: bi, probes };
}
