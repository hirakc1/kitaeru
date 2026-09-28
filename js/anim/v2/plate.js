// Kitaeru animation v2, Direction A: "premium 2D anatomical plate".
// The 3D rig from core.js is projected through an orthographic camera and drawn as an SVG ink-and-wash plate.
// Every shape is defined in 3D (elliptic tubes, ellipsoids, polygons, curves), so the drawing stays correct from
// any camera angle, including 3/4 views and trunk rotation. Depth is handled per anatomical group (painter's
// order re-sorted each frame), and far-side groups fade like a textbook plate.
import * as K from './core.js';
import { PROFILE, BLOBS, handBones, footShape, PELVIS, COXA, STERNUM, vertebraShape, SKULL_LAT, SKULL_FRONT, FOOT_BODY, TOES } from './anatomy.js';
import { CLIPS } from './clips/lib.js';   // registry: the clip group must be loaded first (skeleton.js / clips.js)

const NS = 'http://www.w3.org/2000/svg';
const f2 = n => Math.round(n * 10) / 10;
const PT = q => `${f2(q[0])},${f2(q[1])}`;
let UID = 0;

// ---------- path helpers (2D) ----------
function smoothClosed(pts) {
  const n = pts.length; let d = `M${PT(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${PT([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${PT([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${PT(p2)}`;
  }
  return d + 'Z';
}
function smoothOpen(pts) {
  const n = pts.length; if (n < 2) return ''; let d = `M${PT(pts[0])}`;
  if (n === 2) return d + `L${PT(pts[1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    d += `C${PT([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${PT([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${PT(p2)}`;
  }
  return d;
}

// ---------- retained-mode group ----------
class Grp {
  constructor(parent, name) { this.name = name; this.g = document.createElementNS(NS, 'g'); parent.appendChild(this.g); this.els = []; this.i = 0; this.depth = 0; this.op = 1; }
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
  reset() { this.g.textContent = ''; this.els = []; this.i = 0; }
}

const STYLE = `
.kt-pl{display:block;width:100%;height:auto;margin:0 auto;overflow:visible;
 --pl-ink:color-mix(in srgb,var(--ink,#1C1B19) 78%,transparent);
 --pl-hi:color-mix(in srgb,var(--bone,#EFE8D8) 50%,var(--surface,#FFFDF7));
 --pl-sh:color-mix(in srgb,var(--bone,#EFE8D8) 64%,var(--ink-muted,#6B665C));
 --pl-cart:color-mix(in srgb,var(--bone,#EFE8D8) 75%,#8FB0BC);
 --pl-mp:var(--muscle-primary,#C8372D);--pl-ms:var(--muscle-secondary,#D9A441)}
.kt-pl .pl-b{stroke:var(--pl-ink);stroke-width:.2;stroke-linejoin:round}
.kt-pl .pl-bf{fill:var(--bone,#EFE8D8);stroke:var(--pl-ink);stroke-width:.2;stroke-linejoin:round}
.kt-pl .pl-fs{fill:var(--pl-sh);fill-opacity:.55;stroke:none}
.kt-pl .pl-dk{fill:var(--pl-ink);stroke:none}
.kt-pl .pl-ep{fill:none;stroke:var(--pl-ink);stroke-width:.16;stroke-opacity:.45;stroke-linecap:round}
.kt-pl .pl-hl{fill:none;stroke:var(--pl-hi);stroke-width:.4;stroke-opacity:.9;stroke-linecap:round}
.kt-pl .pl-ri{fill:none;stroke:var(--pl-ink);stroke-linecap:round;stroke-linejoin:round}
.kt-pl .pl-rb{fill:none;stroke:var(--bone,#EFE8D8);stroke-linecap:round;stroke-linejoin:round}
.kt-pl .pl-rc{fill:none;stroke:var(--pl-cart);stroke-linecap:round;stroke-linejoin:round}
.kt-pl .pl-su{fill:none;stroke:var(--pl-ink);stroke-width:.13;stroke-opacity:.4;stroke-dasharray:.45 .25}
.kt-pl .pl-te{fill:none;stroke:var(--pl-hi);stroke-dasharray:.4 .12}
.kt-pl .pl-m{stroke:color-mix(in srgb,var(--pl-mp) 50%,#000);stroke-width:.2;stroke-linejoin:round}
.kt-pl .pl-m2{stroke:color-mix(in srgb,var(--pl-ms) 50%,#000);stroke-width:.2;stroke-linejoin:round}
.kt-pl .pl-fi{fill:none;stroke:color-mix(in srgb,var(--pl-mp) 45%,#000);stroke-width:.12;stroke-opacity:.5;stroke-linecap:round}
.kt-pl .pl-fi2{fill:none;stroke:color-mix(in srgb,var(--pl-ms) 40%,#000);stroke-width:.12;stroke-opacity:.45;stroke-linecap:round}
.kt-pl .pl-tn{fill:none;stroke:color-mix(in srgb,var(--bone,#EFE8D8) 80%,var(--ink-muted,#6B665C));stroke-width:.34;stroke-linecap:round;stroke-opacity:.9}
.kt-pl .pl-trail{fill:none;stroke:var(--accent-2,#D9A441);stroke-width:.7;stroke-dasharray:.1 1.5;stroke-linecap:round}
.kt-pl .pl-comet{fill:none;stroke:var(--accent,#C8372D);stroke-linecap:round}
.kt-pl .pl-fl{stroke:var(--ink-muted,#6B665C);stroke-width:.35;stroke-opacity:.55}
.kt-pl .pl-mat{fill:var(--line,#E3DCCB);fill-opacity:.35;stroke:none}
.kt-pl .pl-flh{stroke:var(--ink-muted,#6B665C);stroke-width:.25;stroke-opacity:.22}
.kt-pl .pl-pr{fill:var(--line,#E3DCCB);stroke:var(--pl-ink);stroke-width:.26}
.kt-pl .pl-br{fill:none;stroke:var(--accent-2,#D9A441);stroke-width:.5}
.kt-pl .pl-brf{fill:var(--accent-2,#D9A441);fill-opacity:.18}
.kt-pl .pl-s0{stop-color:var(--pl-hi)} .kt-pl .pl-s1{stop-color:var(--bone,#EFE8D8)} .kt-pl .pl-s2{stop-color:var(--pl-sh)}
.kt-pl .pl-p0{stop-color:color-mix(in srgb,var(--pl-mp) 62%,#fff)} .kt-pl .pl-p1{stop-color:var(--pl-mp)} .kt-pl .pl-p2{stop-color:color-mix(in srgb,var(--pl-mp) 62%,#000)}
.kt-pl .pl-q0{stop-color:color-mix(in srgb,var(--pl-ms) 60%,#fff)} .kt-pl .pl-q1{stop-color:var(--pl-ms)} .kt-pl .pl-q2{stop-color:color-mix(in srgb,var(--pl-ms) 62%,#000)}
.kt-pl .pl-h0{stop-color:var(--ink,#1C1B19);stop-opacity:.16} .kt-pl .pl-h1{stop-color:var(--ink,#1C1B19);stop-opacity:0}
.kt-pl .pl-pt{fill:color-mix(in srgb,var(--line,#E3DCCB) 70%,var(--surface,#FFFDF7));stroke:var(--pl-ink);stroke-width:.26;stroke-linejoin:round}
.kt-pl .pl-pz{fill:var(--line,#E3DCCB);stroke:var(--pl-ink);stroke-width:.26;stroke-linejoin:round}
.kt-pl .pl-px{fill:color-mix(in srgb,var(--line,#E3DCCB) 78%,var(--ink-muted,#6B665C));stroke:var(--pl-ink);stroke-width:.26;stroke-linejoin:round}
.kt-pl .pl-rgo{stroke:var(--pl-ink);stroke-width:2.2}
.kt-pl .pl-rgi{stroke:var(--line,#E3DCCB);stroke-width:1.6}
.kt-pl .pl-ctR,.kt-pl .pl-ctL{stroke:var(--surface,#FFFDF7);stroke-width:.5}.kt-pl .pl-ctR{fill:var(--accent,#C8372D)}.kt-pl .pl-ctL{fill:var(--ok,#3F7D58)}
.kt-pl .pl-band{fill:none;stroke:var(--accent-2,#D9A441);stroke-width:1.1;stroke-linecap:round;stroke-opacity:.9}
.kt-pl.lod .pl-b,.kt-pl.lod .pl-bf,.kt-pl.lod .pl-m,.kt-pl.lod .pl-m2,.kt-pl.lod .pl-pt,.kt-pl.lod .pl-pz,.kt-pl.lod .pl-px,.kt-pl.lod .pl-pr{vector-effect:non-scaling-stroke;stroke-width:.55px}
.kt-pl.lod .pl-fl{vector-effect:non-scaling-stroke;stroke-width:1px}`;
function injectStyle() {
  if (document.getElementById('kt-pl-style')) return;
  const s = document.createElement('style'); s.id = 'kt-pl-style'; s.textContent = STYLE; document.head.appendChild(s);
}

// ---------- camera ----------
function camera(az, el) {
  const a = az * K.DEG, e = el * K.DEG;
  const c = [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];
  const r = K.nrm(K.cross([0, 1, 0], c)), u = K.cross(c, r);
  return { c, r, u, pr: p => [K.dot(p, r), -K.dot(p, u)], pd: v => [K.dot(v, r), -K.dot(v, u)], depth: p => K.dot(p, c) };
}

// follow camera for travelling clips: the pelvis's progress along the travel direction since the start of the cycle
function follow(clip, S) {
  const d = K.nrm(clip.travel), p0 = clip._p0 || (clip._p0 = K.poseAt(clip, 0).pt.pelvis);
  return K.mul(d, K.dot(K.sub(S.pt.pelvis, p0), d));
}

// ---------- renderer ----------
export function createPlatePlayer(container, animId, { primary, secondary, size = 320, playing = true, trail = false, breath = false, pace = null } = {}) {
  injectStyle();
  const uid = ++UID;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'kt-pl'); svg.setAttribute('role', 'img'); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.maxWidth = size + 'px';
  container.appendChild(svg);
  const defs = document.createElementNS(NS, 'defs'); svg.appendChild(defs);
  const mkGrad = (tag, id, stops, attrs = {}) => {
    const g = document.createElementNS(NS, tag); g.id = id;
    for (const k in attrs) g.setAttribute(k, attrs[k]);
    for (const [off, cls] of stops) { const s = document.createElementNS(NS, 'stop'); s.setAttribute('offset', off); s.setAttribute('class', cls); g.appendChild(s); }
    defs.appendChild(g); return g;
  };
  const SPH = `kt${uid}sph`, SHD = `kt${uid}shd`;
  mkGrad('radialGradient', SPH, [[0, 'pl-s0'], [.55, 'pl-s1'], [1, 'pl-s2']], { cx: .36, cy: .32, r: .8 });
  mkGrad('radialGradient', SHD, [[0, 'pl-h0'], [1, 'pl-h1']], { cx: .5, cy: .5, r: .5 });
  const lin = new Map();
  function linGrad(key, kind, a, b) {
    let g = lin.get(key);
    if (!g) {
      const st = kind === 'b' ? ['pl-s0', 'pl-s1', 'pl-s2'] : kind === 'p' ? ['pl-p0', 'pl-p1', 'pl-p2'] : ['pl-q0', 'pl-q1', 'pl-q2'];
      g = mkGrad('linearGradient', `kt${uid}g${lin.size}`, [[0, st[0]], [.42, st[1]], [1, st[2]]], { gradientUnits: 'userSpaceOnUse' });
      g._a = {}; lin.set(key, g);
    }
    const at = { x1: f2(a[0]), y1: f2(a[1]), x2: f2(b[0]), y2: f2(b[1]) };
    for (const k in at) if (g._a[k] !== at[k]) { g.setAttribute(k, at[k]); g._a[k] = at[k]; }
    return `url(#${g.id})`;
  }

  const root = document.createElementNS(NS, 'g'); svg.appendChild(root);
  const G = {};
  const GROUPS = ['floor', 'barFar', 'bar', 'barNear', 'spine', 'skull', 'sternum', 'pelvisR', 'pelvisL', 'ribsR', 'ribsL', 'shoulderR', 'shoulderL', 'legR', 'legL', 'armR', 'armL'];
  for (const n of GROUPS) G[n] = new Grp(root, n);
  const over = new Grp(svg, 'over');
  const st = { clip: null, cam: null, playing: playing && !reduce, visible: true, t0: 0, elapsed: 0, last: 0, raf: 0, fixedT: null,
    trail, breath, groups: new Set(), prim: new Set(), sec: new Set(), pace, rate: 1, avg: {}, trailPath: {}, trailPathM: {}, order: '', ms: [],
    lod: size < 160 ? 1 : 0, n: 0, slow: false, props: [], props0: [], propsM: [], pnames: [], gnames: GROUPS };   // lod 1: thumbnails (list / plan / today): fewer, bolder strokes
  if (st.lod) { svg.classList.add('lod'); st.trail = st.breath = false; }   // no overlays on thumbnails

  // ---------- primitives ----------
  const LIGHT = [-.55, -.83];
  function tube(cam, centers, axA, rA, axB, rB) {
    const n = centers.length, P2 = centers.map(cam.pr), L = [], R = [], N = [];
    for (let i = 0; i < n; i++) {
      const a = P2[Math.max(0, i - 1)], b = P2[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty);
      if (tl < 1e-6) { tx = 1; ty = 0; } else { tx /= tl; ty /= tl; }
      const nx = -ty, ny = tx;
      const pa = cam.pd(axA[i]), pb = cam.pd(axB[i]);
      const e = Math.hypot(rA[i] * (pa[0] * nx + pa[1] * ny), rB[i] * (pb[0] * nx + pb[1] * ny));
      L.push([P2[i][0] + nx * e, P2[i][1] + ny * e]); R.push([P2[i][0] - nx * e, P2[i][1] - ny * e]); N.push([nx, ny, e]);
    }
    return { P2, L, R, N };
  }
  const tubeD = t => smoothClosed([...t.L, ...t.R.slice().reverse()]);
  function shadeFill(key, kind, t) {                 // gradient across the tube at its middle, lit from upper left
    const m = Math.floor(t.P2.length / 2), [nx, ny, e] = t.N[m], c = t.P2[m];
    const sgn = nx * LIGHT[0] + ny * LIGHT[1] >= 0 ? 1 : -1, r = Math.max(e, .5) * 1.05;
    return linGrad(key, kind, [c[0] + nx * r * sgn, c[1] + ny * r * sgn], [c[0] - nx * r * sgn, c[1] - ny * r * sgn]);
  }
  function splat(cam, c, axes) {
    let a = 0, b = 0, d = 0;
    for (const v of axes) { const p = cam.pd(v); a += p[0] * p[0]; b += p[0] * p[1]; d += p[1] * p[1]; }
    const tr = (a + d) / 2, det = Math.sqrt(((a - d) / 2) ** 2 + b * b);
    const ang = .5 * Math.atan2(2 * b, a - d) / K.DEG, q = cam.pr(c);
    return { cx: f2(q[0]), cy: f2(q[1]), rx: f2(Math.sqrt(tr + det)), ry: f2(Math.sqrt(Math.max(tr - det, 1e-4))), transform: `rotate(${f2(ang)} ${f2(q[0])} ${f2(q[1])})` };
  }
  const ellAxes = (F, r, rot = 0) => {
    const c = Math.cos(rot * K.DEG), s = Math.sin(rot * K.DEG);
    const X = K.add(K.mul(F.x, c), K.mul(F.y, s)), Y = K.add(K.mul(F.y, c), K.mul(F.x, -s));
    return [K.mul(X, r[0]), K.mul(Y, r[1]), K.mul(F.z, r[2])];
  };
  function blob(g, cam, F, c, r, cls = 'pl-b', rot = 0, fill) {
    const at = splat(cam, K.P(F, c), ellAxes(F, r, rot));
    at.fill = fill ?? `url(#${SPH})`;
    g.add('ellipse', at, cls);
  }
  function longBone(g, cam, key, F, prof) {
    const c = [], aA = [], rA = [], aB = [], rB = [];
    for (const [u, oa, ol, ra, rl] of prof) { c.push(K.P(F, [oa, u * F.len, ol])); aA.push(F.x); rA.push(ra); aB.push(F.z); rB.push(rl); }
    const t = tube(cam, c, aA, rA, aB, rB);
    g.add('path', { d: tubeD(t), fill: shadeFill(key, 'b', t) }, 'pl-b');
    if (st.lod) return;
    const n = t.L.length;
    // epiphyseal lines + a highlight along the lit side of the shaft
    const ep = [2, n - 3].map(i => `M${PT(K.lerp3([...t.L[i], 0], [...t.R[i], 0], .12))}Q${PT(t.P2[i].map((v, j) => v + (j ? .35 : 0)))} ${PT(K.lerp3([...t.L[i], 0], [...t.R[i], 0], .88))}`).join('');
    g.add('path', { d: ep }, 'pl-ep');
    const m = Math.floor(n / 2), sgn = t.N[m][0] * LIGHT[0] + t.N[m][1] * LIGHT[1] >= 0 ? 1 : -1;
    const hl = [];
    for (let i = 3; i < n - 3; i++) hl.push(K.lerp3([...t.P2[i], 0], [...(sgn > 0 ? t.L[i] : t.R[i]), 0], .55));
    if (hl.length > 1) g.add('path', { d: smoothOpen(hl) }, 'pl-hl');
  }
  function strokes(g, cam, segs, w, cls = ['pl-ri', 'pl-rb']) {
    let d = '';
    for (const [a, b] of segs) d += `M${PT(cam.pr(a))}L${PT(cam.pr(b))}`;
    g.add('path', { d, 'stroke-width': f2(w + .32) }, cls[0]);
    g.add('path', { d, 'stroke-width': f2(w) }, cls[1]);
  }

  // ---------- anatomy ----------
  function drawSpine(S, cam) {
    const g = G.spine, pel = S.F.pelvis;
    const sc = PELVIS.sacrum, c = [], aA = [], rA = [], aB = [], rB = [];
    for (const [x, y, z, ra, rl] of sc) { c.push(K.P(pel, [x, y, z])); aA.push(pel.x); rA.push(ra); aB.push(pel.z); rB.push(rl); }
    const t = tube(cam, c, aA, rA, aB, rB);
    g.add('path', { d: tubeD(t), fill: shadeFill('sac', 'b', t) }, 'pl-b');
    const cc = COXA.coccyx.map(([x, y, z]) => K.P(pel, [x, y, z]));
    if (!st.lod) g.add('path', { d: tubeD(tube(cam, cc, cc.map(() => pel.x), COXA.coccyx.map(r => r[3]), cc.map(() => pel.z), COXA.coccyx.map(r => r[4]))), fill: 'var(--bone,#EFE8D8)' }, 'pl-b');
    for (let i = 0; i < S.vert.length; i++) {
      const F = S.vert[i], sh = vertebraShape(F.v);
      // body: a short elliptic cylinder, seen side-on
      const side = K.nrm(K.cross(F.y, cam.c));
      const ext = Math.hypot(sh.body.r[0] * K.dot(F.x, side), sh.body.r[2] * K.dot(F.z, side));
      const cc = K.P(F, sh.body.c), hy = K.mul(F.y, sh.body.r[1]);
      const q = [K.add(K.add(cc, K.mul(side, ext)), hy), K.add(K.add(cc, K.mul(side, -ext)), hy), K.sub(K.add(cc, K.mul(side, -ext)), hy), K.sub(K.add(cc, K.mul(side, ext)), hy)].map(cam.pr);
      g.add('path', { d: `M${PT(q[0])}L${PT(q[1])}L${PT(q[2])}L${PT(q[3])}Z`, fill: `url(#${SPH})` }, 'pl-b');
      if (st.lod) continue;
      const sp = sh.spinous.map(p => K.P(F, p));
      const tr = [K.P(F, sh.trans[0]), K.P(F, [sh.trans[1][0], sh.trans[1][1], sh.trans[1][2]]), K.P(F, [sh.trans[1][0], sh.trans[1][1], -sh.trans[1][2]])];
      const tt = tube(cam, sp, [F.y, F.y], [sh.spR[1], .35], [F.z, F.z], [sh.spR[0], .25]);
      g.add('path', { d: tubeD(tt), fill: 'var(--bone,#EFE8D8)' }, 'pl-b');
      strokes(g, cam, [[tr[0], tr[1]], [tr[0], tr[2]]], F.v.reg === 'L' ? .7 : .45);
    }
  }
  // skull: textbook lateral and frontal outlines in the head's planes, cross-faded by viewing angle
  function drawSkull(S, cam) {
    const g = G.skull, H = S.F.head, J = S.F.jaw;
    const lat = Math.abs(K.dot(H.z, cam.c));
    const wl = K.clamp((lat - .38) / .3, 0, 1);
    const sets = [];
    if (wl > .02) sets.push([SKULL_LAT, wl, (F, p) => K.P(F, [p[0], p[1], 0]), false]);
    if (wl < .98) sets.push([SKULL_FRONT, 1 - wl, (F, p, m = 1) => K.P(F, [lat < .5 ? 7 : 3, p[1], p[0] * m]), true]);
    for (const [D, op, at, sym] of sets) {
      const o = f2(op);
      const shape = (F, pts, cls, extra = {}) => {
        const q = sym ? [...pts.map(p => cam.pr(at(F, p))), ...pts.slice().reverse().map(p => cam.pr(at(F, p, -1)))] : pts.map(p => cam.pr(at(F, p)));
        g.add('path', { d: smoothClosed(q), opacity: o, ...extra }, cls);
      };
      shape(J, D.mandible, 'pl-b', { fill: `url(#${SPH})` });
      shape(H, D.cranium, 'pl-b', { fill: `url(#${SPH})` });
      if (sym) { for (const m of [1, -1]) g.add('path', { d: smoothClosed(D.orbit.map(p => cam.pr(at(H, p, m)))), opacity: f2(o * .6) }, 'pl-dk'); }
      else if (st.lod) g.add('path', { d: smoothClosed(D.orbit.map(p => cam.pr(at(H, p)))), opacity: f2(o * .55) }, 'pl-dk');
      else {
        shape(H, D.zyg, 'pl-bf');
        g.add('path', { d: smoothClosed(D.orbit.map(p => cam.pr(at(H, p)))), opacity: f2(o * .55) }, 'pl-dk');
        const mc = cam.pr(at(H, D.meatus));
        g.add('circle', { cx: f2(mc[0]), cy: f2(mc[1]), r: D.meatus[2], opacity: f2(o * .6) }, 'pl-dk');
        let d = ''; for (const L of D.lines) d += smoothOpen(L.map(p => cam.pr(at(H, p))));
        g.add('path', { d, opacity: o }, 'pl-su');
      }
      if (st.lod) continue;
      shape(H, D.nasal, 'pl-dk', { opacity: f2(o * .6) });
      for (const [F, T] of [[H, D.teethU], [J, D.teethL]]) {
        const pts = sym ? [[-T[1][0], T[1][1]], ...T.slice().reverse().map(p => p), ...T].slice(0, 3) : T;
        const q = (sym ? [at(F, T[1], -1), at(F, T[0]), at(F, T[1])] : T.map(p => at(F, p))).map(cam.pr);
        g.add('path', { d: smoothOpen(q), 'stroke-width': 1.3, opacity: o }, 'pl-ri');
        g.add('path', { d: smoothOpen(q), 'stroke-width': 1.05, opacity: o }, 'pl-te');
      }
    }
  }
  function drawRibs(S, cam, sd, s) {
    const g = G['ribs' + sd];
    for (let k = 1; k <= 12; k++) {
      if (st.lod && !(k & 1)) continue;           // thumbnails: every other rib, drawn heavier
      const T = S.rib[k], cart = K.ribCartilage(k), n = st.lod ? 8 : 14;
      const bone = [], car = [];
      for (let i = 0; i <= n; i++) {
        const f = i / n, p = cam.pr(K.P(T, K.ribPoint(k, s, f, S.breath)));
        if (f <= cart + 1e-6) bone.push(p); if (f >= cart - 1 / n) car.push(p);
      }
      const w = (k < 3 ? .75 : k > 10 ? .7 : .95) * (st.lod ? 1.7 : 1);
      const all = smoothOpen([...bone, ...car.slice(1)]);
      g.add('path', { d: all, 'stroke-width': f2(w + (st.lod ? .9 : .3)) }, 'pl-ri');
      g.add('path', { d: st.lod ? all : smoothOpen(bone), 'stroke-width': f2(w) }, 'pl-rb');
      if (!st.lod && car.length > 1 && cart < 1) g.add('path', { d: smoothOpen(car), 'stroke-width': f2(w * .8) }, 'pl-rc');
    }
  }
  function drawSternum(S, cam) {
    const g = G.sternum, F = S.F.sternum;
    const c = [], aA = [], rA = [], aB = [], rB = [];
    for (const [y, ra, rl] of STERNUM) { c.push(K.P(F, [0, y, 0])); aA.push(F.x); rA.push(ra); aB.push(F.z); rB.push(rl); }
    const t = tube(cam, c, aA, rA, aB, rB);
    g.add('path', { d: tubeD(t), fill: shadeFill('ste', 'b', t) }, 'pl-b');
  }
  // os coxae: one landmark outline with the obturator foramen cut out (even-odd), lit from the upper left; iliac fossa
  // shading, crest highlight, pelvic brim, a shadowed acetabular cup (lunate rim) and the ischial tuberosity
  function drawPelvis(S, cam, sd, s) {
    const g = G['pelvis' + sd], F = S.F.pelvis, M = p => K.P(F, [p[0], p[1], p[2] * s]), Q = p => cam.pr(M(p));
    const V = v => K.add(K.add(K.mul(F.x, v[0]), K.mul(F.y, v[1])), K.mul(F.z, v[2] * s));
    const out = COXA.outline.map(Q);
    g.add('path', { d: smoothClosed(out) + smoothClosed(COXA.foramen.map(Q)), fill: boxGrad('cx' + sd, out), 'fill-rule': 'evenodd' }, 'pl-b');
    if (st.lod) return;
    g.add('path', { d: smoothClosed(COXA.fossa.map(Q)) }, 'pl-fs');
    g.add('path', { d: smoothOpen(COXA.brim.map(Q)) }, 'pl-ep');
    g.add('path', { d: smoothOpen(COXA.crest.map(Q)) }, 'pl-hl');
    const tb = COXA.tuber, ta = splat(cam, M(tb.c), [K.mul(F.x, tb.r[0]), K.mul(F.y, tb.r[1]), K.mul(F.z, tb.r[2])]);
    ta.fill = `url(#${SPH})`; g.add('ellipse', ta, 'pl-b');
    const ac = COXA.acet, n = K.nrm(V(ac.n)), u = K.perp(F.y, n), w = K.cross(n, u);
    const cup = splat(cam, M(ac.c), [K.mul(u, ac.r), K.mul(w, ac.r), K.mul(n, .3)]);
    g.add('ellipse', { ...cup, fill: 'var(--pl-sh)', 'fill-opacity': .8 }, 'pl-b');
    const fo = splat(cam, K.madd(M(ac.c), n, -.2), [K.mul(u, ac.r * .5), K.mul(w, ac.r * .45), K.mul(n, .2)]);   // acetabular fossa
    g.add('ellipse', { ...fo, 'fill-opacity': .3 }, 'pl-dk');
  }
  // linear bone gradient across a projected shape's bounding box (light from the upper left)
  function boxGrad(key, pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    return linGrad(key, 'b', [x0, y0], [x1, y1]);
  }
  function drawShoulder(S, cam, sd) {
    const g = G['shoulder' + sd], F = S.F['scapula' + sd];
    g.add('path', { d: smoothClosed(K.SCAP.outline.map(p => cam.pr(K.P(F, p)))), fill: `url(#${SPH})` }, 'pl-b');
    const sp = K.SCAP.spine.map(p => K.P(F, [p[0] - .8, p[1], p[2]]));
    const t = tube(cam, sp, sp.map(() => F.x), [.5, .8, .9, .9, .7], sp.map(() => F.y), [.4, .5, .6, .9, 1.1]);
    g.add('path', { d: tubeD(t), fill: 'var(--bone,#EFE8D8)' }, 'pl-b');
    strokes(g, cam, K.SCAP.coracoid.slice(1).map((p, i) => [K.P(F, K.SCAP.coracoid[i]), K.P(F, p)]), .9);
    blob(g, cam, F, K.SCAP.glenoid, [1.1, 1.9, .7]);
    // clavicle: gentle S-curve tube from the sternum to the acromion
    const cl = [S.pt['clavSternal' + sd], S.pt['clavMid' + sd], S.pt['acromion' + sd]];
    const ax = K.nrm(K.cross(K.sub(cl[2], cl[0]), S.F.T4.y));
    const tc = tube(cam, cl, [ax, ax, ax], [.75, .6, .7], [S.F.T4.y, S.F.T4.y, S.F.T4.y], [.8, .6, .6]);
    g.add('path', { d: tubeD(tc), fill: shadeFill('cl' + sd, 'b', tc) }, 'pl-b');
  }
  function drawLeg(S, cam, sd, s) {
    const g = G['leg' + sd], fe = S.F['femur' + sd], ti = S.F['tibia' + sd];
    for (const [b, c, r] of BLOBS) if (b === 'femur') blob(g, cam, fe, c, r);
    longBone(g, cam, 'fe' + sd, fe, PROFILE.femur);
    longBone(g, cam, 'fi' + sd, ti, PROFILE.fibula);
    longBone(g, cam, 'ti' + sd, ti, PROFILE.tibia);
    const pa = S.pt['patella' + sd];
    g.add('ellipse', { ...splat(cam, pa, [K.mul(fe.x, 1), K.mul(fe.y, 2.3), K.mul(fe.z, 2.1)]), fill: `url(#${SPH})` }, 'pl-b');
    const ft = S.F['foot' + sd], fs = footShape();
    {
      const c = [], aA = [], rA = [], aB = [], rB = [];
      for (const [x, y, z, ru, rl] of FOOT_BODY) { c.push(K.P(ft, [x, y, z])); aA.push(ft.y); rA.push(ru); aB.push(ft.z); rB.push(rl); }
      const t = tube(cam, c, aA, rA, aB, rB);
      g.add('path', { d: tubeD(t), fill: shadeFill('ft' + sd, 'b', t) }, 'pl-b');
      if (!st.lod) {
        let d = ''; for (const [a, b] of fs.segs) d += `M${PT(cam.pr(K.P(ft, a)))}L${PT(cam.pr(K.P(ft, b)))}`;
        g.add('path', { d }, 'pl-ep');
        const cal = splat(cam, K.P(ft, [-3.4, -4.4, .2]), ellAxes(ft, [2.6, 1.7, 1.2])); cal.fill = 'none'; g.add('ellipse', cal, 'pl-ep');
      }
    }
    const tf = ft.toeFlat ? K.frameR(S.pt['ball' + sd], ft.toeFlat) : { ...ft, o: K.P(ft, [14.2, -7.1, 0]) };
    {
      const c = [], aA = [], rA = [], aB = [], rB = [];
      for (const [x, y, z, ru, rl] of TOES) { c.push(K.P(tf, [x, y + .45, z])); aA.push(tf.y); rA.push(ru); aB.push(tf.z); rB.push(rl); }
      const t = tube(cam, c, aA, rA, aB, rB);
      g.add('path', { d: tubeD(t), fill: 'var(--bone,#EFE8D8)' }, 'pl-b');
      if (!st.lod) {
        let d = ''; for (const [a, b] of fs.toes) d += `M${PT(cam.pr(K.P(tf, a)))}L${PT(cam.pr(K.P(tf, b)))}`;
        g.add('path', { d }, 'pl-ep');
      }
    }
    muscles(g, cam, S, sd, LEG_M);
  }
  function drawArm(S, cam, sd) {
    const g = G['arm' + sd], hu = S.F['humerus' + sd], fo = S.F['fore' + sd];
    for (const [b, c, r] of BLOBS) if (b === 'humerus') blob(g, cam, hu, c, r);
    longBone(g, cam, 'hu' + sd, hu, PROFILE.humerus);
    longBone(g, cam, 'ul' + sd, fo, PROFILE.ulna);
    longBone(g, cam, 'ra' + sd, fo, PROFILE.radius);
    drawHand(g, cam, S.F['hand' + sd], sd);
    muscles(g, cam, S, sd, ARM_M);
  }
  // hand: carpal block, five metacarpals, fourteen phalanges; each a tapered tube, painted far to near
  function drawHand(g, cam, H, sd) {
    const bones = handBones(H.fingers, H.grip, H.shape).map(b => ({ ...b, w: b.c.map(p => K.P(H, p)) }));
    if (st.lod) {                                 // thumbnails: palm block + one stroke per digit
      const b0 = bones[0], t = tube(cam, b0.w, b0.w.map(() => H.x), b0.r.map(r => r * .42), b0.w.map(() => H.z), b0.r);
      g.add('path', { d: tubeD(t), fill: 'var(--bone,#EFE8D8)' }, 'pl-b');
      strokes(g, cam, bones.slice(1).map(b => [b.w[0], b.w[2]]), 1.1);
      return;
    }
    for (const b of bones) b.d = cam.depth(b.w[1]);
    bones.sort((a, b) => a.d - b.d);
    for (const b of bones) {
      let t;
      if (b.carpus) t = tube(cam, b.w, b.w.map(() => H.x), b.r.map(r => r * .42), b.w.map(() => H.z), b.r);
      else {
        const dir = K.nrm(K.sub(b.w[2], b.w[0])), a1 = K.perp(H.z, dir), a2 = K.cross(dir, a1);
        t = tube(cam, b.w, b.w.map(() => a1), b.r, b.w.map(() => a2), b.r);
      }
      g.add('path', { d: tubeD(t), fill: b.carpus ? shadeFill('ca' + sd, 'b', t) : 'var(--bone,#EFE8D8)' }, 'pl-b');
    }
  }

  // ---------- muscles ----------
  const LEG_M = new Set(['quads', 'hamstrings', 'adductors', 'calves']);
  const ARM_M = new Set(['biceps', 'triceps', 'forearms', 'front_delts', 'side_delts', 'rear_delts']);
  const HIP_M = new Set(['glutes', 'hip_flexors']);
  const TRUNK_M = new Set(['chest', 'lats', 'traps', 'upper_back', 'lower_back', 'abs', 'obliques']);
  function muscles(g, cam, S, sd, set) {
    for (const stn of S._strands) {
      if (stn.side !== sd || !set.has(stn.group)) continue;
      const prim = st.prim.has(stn.group), kind = prim ? 'p' : 'q';
      const pts = K.strandCurve(stn, 12), n = pts.length;
      const L = K.curveLen(pts), k = K.bulge(L, st.avg[stn.key] || L);
      const out0 = stn.via ? K.sub(stn.via, K.lerp3(stn.o, stn.e, .5)) : [0, 1, 0];
      const aA = [], aB = [], rA = [], rB = [];
      let b0 = -1, b1 = -1;
      for (let i = 0; i < n; i++) {
        const t = K.nrm(K.sub(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]));
        let a = K.madd(out0, t, -K.dot(out0, t)); if (K.len(a) < 1e-4) a = K.perp([0, 1, 0], t); a = K.nrm(a);
        const pr = K.bellyProfile(i / (n - 1), stn);
        if (pr > 0 && b0 < 0) b0 = i; if (pr > 0) b1 = i;
        aA.push(a); aB.push(K.nrm(K.cross(t, a)));
        rA.push(.15 + stn.th * pr * k); rB.push(.22 + stn.w * pr * Math.sqrt(k));
      }
      const t = tube(cam, pts, aA, rA, aB, rB);
      g.add('path', { d: tubeD(t), fill: shadeFill('m' + stn.key, kind, t), 'fill-opacity': prim ? .94 : .86, 'stroke-opacity': stn.fan ? .35 : 1 }, prim ? 'pl-m' : 'pl-m2');
      if (st.lod) continue;
      if (b0 > 0 || b1 < n - 1) {
        let d = '';
        if (b0 > 0) d += `M${PT(t.P2[0])}L${PT(t.P2[b0])}`;
        if (b1 < n - 1) d += `M${PT(t.P2[b1])}L${PT(t.P2[n - 1])}`;
        g.add('path', { d }, 'pl-tn');
      }
      let fd = '';
      for (const f of [.22, .5, .78]) {
        const q = []; for (let i = Math.max(1, b0); i <= Math.min(n - 2, b1); i++) q.push(K.lerp3([...t.L[i], 0], [...t.R[i], 0], f));
        if (q.length > 1) fd += smoothOpen(q);
      }
      if (stn.segs) for (const f of [.3, .5, .7]) { const i = Math.round(f * (n - 1)); fd += `M${PT(t.L[i])}L${PT(t.R[i])}`; }
      g.add('path', { d: fd }, prim ? 'pl-fi' : 'pl-fi2');
    }
  }

  // ---------- props / floor / overlay ----------
  function drawFloor(S, cam) {
    const g = G.floor, vb = st.vb;
    if (!st.clip.floor) return;
    // soft contact shadow under the body
    let x0 = 1e9, x1 = -1e9;
    for (const n of ['toeR', 'toeL', 'heelR', 'heelL', 'palmR', 'palmL', 'headTop', 'pelvis', 'kneeR', 'kneeL']) { const p = S.pt[n]; if (!p) continue; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
    const cx = (x0 + x1) / 2, cz = S.com[2], hw = Math.max(18, (x1 - x0) / 2 + 6);
    const at = splat(cam, [cx, 0, cz], [[hw, 0, 0], [0, .01, 0], [0, 0, 20]]);
    at.fill = `url(#${SHD})`; g.add('ellipse', at, '');
    const zN = Math.max(34, (st.clip.floorZ || 0), (st.clip.bar?.w ?? 0) + 12), zF = -zN, xa = vb[0] - 20, xb = vb[0] + vb[2] + 20;
    if (st.clip.travel) {   // travelling clip: a wide floor with a world grid of marks that scrolls under the panning camera
      const c = S.com, o = c, W = 180;
      const q = [[c[0] - W, 0, c[2] - W], [c[0] + W, 0, c[2] - W], [c[0] + W, 0, c[2] + W], [c[0] - W, 0, c[2] + W]].map(cam.pr);
      g.add('path', { d: `M${PT(q[0])}L${PT(q[1])}L${PT(q[2])}L${PT(q[3])}Z` }, 'pl-mat');
      let h = '';
      const g0 = v => Math.ceil(v / 25) * 25;
      for (let x = g0(o[0] - 120); x < o[0] + 120; x += 25) for (let z = g0(o[2] - 90); z < o[2] + 90; z += 25) {
        const a = cam.pr([x - 2, 0, z]), b = cam.pr([x + 2, 0, z]), d = cam.pr([x, 0, z - 2]), e = cam.pr([x, 0, z + 2]);
        h += `M${PT(a)}L${PT(b)}M${PT(d)}L${PT(e)}`;
      }
      if (!st.lod) g.add('path', { d: h }, 'pl-flh');
      return;
    }
    const q = [[xa, 0, zF], [xb, 0, zF], [xb, 0, zN], [xa, 0, zN]].map(cam.pr);
    g.add('path', { d: `M${PT(q[0])}L${PT(q[1])}L${PT(q[2])}L${PT(q[3])}Z` }, 'pl-mat');
    g.add('line', { x1: f2(q[3][0]), x2: f2(q[2][0]), y1: f2(q[3][1]), y2: f2(q[2][1]) }, 'pl-fl');
    if (st.lod) return;
    let h = '';
    const y = q[3][1];
    for (let x = Math.ceil(vb[0] / 6) * 6; x < vb[0] + vb[2] + 3; x += 6) h += `M${x},${f2(y + .9)}L${x - 2.4},${f2(y + 3.2)}`;
    g.add('path', { d: h }, 'pl-flh');
  }
  function drawBar(cam) {
    const b = st.clip.bar; if (!b) return;
    const x = b.x || 0, line = (a, c, n = 6) => Array.from({ length: n }, (_, i) => K.lerp3(a, c, i / (n - 1)));
    const pts = line([x, b.y, -b.w - 5], [x, b.y, b.w + 5]);
    const t = tube(cam, pts, pts.map(() => [1, 0, 0]), pts.map(() => 1.6), pts.map(() => [0, 1, 0]), pts.map(() => 1.6));
    G.bar.add('path', { d: tubeD(t) }, 'pl-pr');
    for (const [grp, z] of [['barFar', -b.w - 5], ['barNear', b.w + 5]]) {
      const q = line([x, b.y, z], [x, b.posts === 'down' ? 0 : b.y + 16, z], 4);   // low bar: uprights to the floor
      const p = tube(cam, q, q.map(() => [1, 0, 0]), q.map(() => 1.3), q.map(() => [0, 0, 1]), q.map(() => 1.3));
      G[grp].add('path', { d: tubeD(p) }, 'pl-pr');
      if (b.posts === 'down') {                    // floor-standing frame: a foot under each upright
        const f = line([x - 26, 1.2, z], [x + 26, 1.2, z], 4);
        G[grp].add('path', { d: tubeD(tube(cam, f, f.map(() => [0, 1, 0]), f.map(() => 1.2), f.map(() => [0, 0, 1]), f.map(() => 1.4))) }, 'pl-pr');
      }
    }
  }
  // ---------- props (clip.props: array, or c => array after prep). Each prop is its own depth-sorted group. ----------
  //   { t: 'box', a: [x0, y0, z0], b: [x1, y1, z1], bias }   visible faces only, top lighter than the sides
  //   { t: 'tube', pts: [[x, y, z], ...], r }                  bars, uprights, straps, legs
  //   { t: 'ring', c, n, r }                                   gymnastic ring (circle of radius r facing n)
  //   { t: 'band', a: S => p | p, b: S => p }                  resistance band, follows the body
  // bias shifts the painter depth (boxes default -20: supports sit behind whatever rests on them)
  const PROP = p => (p.t === 'box' ? K.lerp3(p.a, p.b, .5) : p.t === 'tube' ? K.lerp3(p.pts[0], p.pts[p.pts.length - 1], .5) : p.c);
  const at = (v, S) => (typeof v === 'function' ? v(S) : v);
  function drawProp(g, cam, p, S) {
    if (p.t === 'box') {
      const [x0, y0, z0] = p.a, [x1, y1, z1] = p.b;
      const F = [[[1, 0, 0], [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]], [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]],
        [[0, 1, 0], [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]]], [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]],
        [[0, 0, -1], [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]]]];
      for (const [n, q] of F) if (K.dot(n, cam.c) > 1e-3) g.add('path', { d: 'M' + q.map(v => PT(cam.pr(v))).join('L') + 'Z' }, n[1] ? 'pl-pt' : n[0] ? 'pl-px' : 'pl-pz');
    } else if (p.t === 'tube') {
      const d = K.nrm(K.sub(p.pts[p.pts.length - 1], p.pts[0])), a1 = K.perp(Math.abs(d[1]) > .9 ? [1, 0, 0] : [0, 1, 0], d), a2 = K.cross(d, a1);
      const t = tube(cam, p.pts, p.pts.map(() => a1), p.pts.map(() => p.r), p.pts.map(() => a2), p.pts.map(() => p.r));
      g.add('path', { d: tubeD(t) }, 'pl-pr');
    } else if (p.t === 'ring') {
      const n = K.nrm(p.n), u = K.perp([0, 1, 0], n), w = K.cross(n, u);
      g.add('ellipse', { ...splat(cam, p.c, [K.mul(u, p.r), K.mul(w, p.r), K.mul(n, .01)]), fill: 'none' }, 'pl-rgo');
      g.add('ellipse', { ...splat(cam, p.c, [K.mul(u, p.r), K.mul(w, p.r), K.mul(n, .01)]), fill: 'none' }, 'pl-rgi');
    } else if (p.t === 'band') {
      g.add('path', { d: `M${PT(cam.pr(at(p.a, S)))}L${PT(cam.pr(at(p.b, S)))}` }, 'pl-band');
    }
  }
  function propPts(p) {
    if (p.t === 'box') { const r = []; for (const x of [p.a[0], p.b[0]]) for (const y of [p.a[1], p.b[1]]) for (const z of [p.a[2], p.b[2]]) r.push([x, y, z]); return r; }
    if (p.t === 'tube') return p.pts;
    if (p.t === 'ring') return [K.add(p.c, [0, p.r, 0]), K.add(p.c, [0, -p.r, 0]), K.add(p.c, [p.r, 0, 0]), K.add(p.c, [-p.r, 0, 0])];
    return [];
  }
  function setProps(clip) {
    for (const n of st.pnames) { G[n].g.remove(); delete G[n]; }
    st.props = st.props0 = (typeof clip.props === 'function' ? clip.props(clip) : clip.props) || [];
    // sides alternate (swap): the props swap too (a band anchored on the other side)
    const fz = v => (typeof v === 'function' ? v : [v[0], v[1], -v[2]]);
    st.propsM = clip.swap ? st.props0.map(p => ({ ...p, ...(p.a ? { a: fz(p.a) } : {}), ...(p.b && p.t === 'box' ? { a: [p.a[0], p.a[1], -p.b[2]], b: [p.b[0], p.b[1], -p.a[2]] } : p.b ? { b: fz(p.b) } : {}),
      ...(p.pts ? { pts: p.pts.map(fz) } : {}), ...(p.c ? { c: fz(p.c) } : {}), ...(p.n ? { n: fz(p.n) } : {}) })) : st.props0;
    st.pnames = st.props.map((_, i) => 'prop' + i);
    st.props.forEach((p, i) => { G[st.pnames[i]] = new Grp(root, st.pnames[i]); });
    st.gnames = [...GROUPS, ...st.pnames];
  }

  function drawOverlay(S, cam, tn) {
    const g = over;
    if (st.trail) for (const name of st.clip.trail || []) {
      const T = K.period(st.clip), h = st.clip.swap ? K.swapTime(st.clip) : 0, second = h && tn * T >= h;
      const P = (second ? st.trailPathM : st.trailPath)[name]; if (!P) continue;
      g.add('path', { d: smoothOpen(P) }, 'pl-trail');
      const n = P.length - 1, i = (h ? (tn * T - (second ? h : 0)) / h : tn) * n;
      for (let j = 0; j < 7; j++) {
        const a = i - j * 1.2, b = a - 1.4;
        const pt = u => { const w = ((u % n) + n) % n, k = Math.floor(w), f = w - k; return [P[k][0] + (P[k + 1][0] - P[k][0]) * f, P[k][1] + (P[k + 1][1] - P[k][1]) * f]; };
        g.add('path', { d: `M${PT(pt(b))}L${PT(pt(a))}`, 'stroke-width': f2(1.6 - j * .2), 'stroke-opacity': f2(.75 - j * .1) }, 'pl-comet');
      }
    }
    if (st.contacts) {                              // QA overlay: heel / ball / toe resting on the floor
      for (const [sd] of K.SIDES) for (const n of ['heel', 'ball', 'toe']) {
        const p = S.pt[n + sd]; if (!p || p[1] > 1.6) continue;
        const q = st.cam.pr(K.sub(p, st.off || [0, 0, 0]));
        g.add('circle', { cx: f2(q[0]), cy: f2(q[1]), r: 1.6 }, sd === 'R' ? 'pl-ctR' : 'pl-ctL');
      }
    }
    if (st.breath) {
      const vb = st.vb, r = 3 + 4 * S.breath, c = [vb[0] + vb[2] - 10, vb[1] + 10];
      g.add('circle', { cx: f2(c[0]), cy: f2(c[1]), r: f2(r) }, 'pl-brf');
      g.add('circle', { cx: f2(c[0]), cy: f2(c[1]), r: 7 }, 'pl-br');
    }
  }

  // ---------- frame ----------
  function depthOf(S, cam) {
    const d = p => cam.depth(p);
    const mid = (a, b) => K.lerp3(a, b, .5);
    const D = {
      floor: -1e6, barFar: st.clip.bar ? d([0, 0, -st.clip.bar.w]) : -1e5, bar: st.clip.bar ? d([st.clip.bar.x || 0, st.clip.bar.y, 0]) - 2 : -1e5, barNear: st.clip.bar ? d([0, 0, st.clip.bar.w]) : -1e5,
      spine: d(K.P(S.vert[K.T_INDEX(9)], [-4, 0, 0])), skull: d(K.P(S.F.head, [2, 7, 0])), sternum: d(S.pt.sternum) - .5,
    };
    for (const [sd, s] of K.SIDES) {
      D['pelvis' + sd] = d(K.P(S.F.pelvis, [1, 6, 8 * s]));
      D['ribs' + sd] = d(K.P(S.rib[6], K.ribPoint(6, s, .5)));
      D['shoulder' + sd] = d(S.pt['glenoid' + sd]) - 1;
      D['leg' + sd] = d(mid(S.pt['knee' + sd], S.pt['hip' + sd]));
      D['arm' + sd] = d(mid(S.pt['elbow' + sd], S.pt['glenoid' + sd])) + 1;
    }
    st.props.forEach((p, i) => { D[st.pnames[i]] = (p.t === 'band' ? d(K.lerp3(at(p.a, S), at(p.b, S), .5)) : d(PROP(p))) + (p.bias ?? (p.t === 'box' ? -20 : 0)); });
    return D;
  }

  function draw() {
    const t0 = performance.now();
    const clip = st.clip, cam = st.cam, T = K.period(clip);
    const tn = st.fixedT != null ? st.fixedT : (!st.playing && st.elapsed === 0 ? (clip.still ?? .45) : (st.elapsed / 1000 % T) / T);
    const S = K.poseAt(clip, tn * T);
    if (clip.travel) {                              // stepping clips travel: the camera follows the pelvis along the travel
      st.off = follow(clip, S);                     // direction (it ends the cycle exactly one travel on, so the loop wraps)
      const p = st.cam.pr(st.off), tr = `translate(${f2(-p[0])} ${f2(-p[1])})`;
      if (st.tr !== tr) { st.tr = tr; root.setAttribute('transform', tr); }
    }
    // side switch (swap) or a loop that restarts elsewhere (cut: negatives): a quick dip through the paper, not a teleport
    let u = 1;
    if (clip.swap || clip.cut) {
      const h = clip.swap ? K.swapTime(clip) : -1, ts = tn * T, d = Math.min(ts, h < 0 ? 1e9 : Math.abs(ts - h), T - ts);
      u = Math.min(1, d / .35);
    }
    // a flow moving on to the next step's clip (setAnim while playing): the same quick dip, unless the clips share a frame
    if (st.dip) { const v = (performance.now() - st.dip) / 450; if (v >= 1) st.dip = 0; else u = Math.min(u, Math.max(0, v)); }
    const op = f2(.15 + .85 * u * u * (3 - 2 * u));
    if (st.op !== op) { st.op = op; if (op >= 1) root.removeAttribute('opacity'); else root.setAttribute('opacity', op); }
    S._strands = K.strands(S, st.groups);
    for (const k in G) G[k].begin(); over.begin();
    st.props = clip.swap && tn * T >= K.swapTime(clip) ? st.propsM : st.props0;
    drawFloor(S, cam); drawBar(cam);
    st.props.forEach((p, i) => drawProp(G[st.pnames[i]], cam, p, S));
    drawSpine(S, cam); drawSkull(S, cam); drawSternum(S, cam);
    for (const [sd, s] of K.SIDES) {
      drawPelvis(S, cam, sd, s); muscles(G['pelvis' + sd], cam, S, sd, HIP_M);
      drawRibs(S, cam, sd, s); muscles(G['ribs' + sd], cam, S, sd, TRUNK_M);
      drawShoulder(S, cam, sd); drawLeg(S, cam, sd, s); drawArm(S, cam, sd);
    }
    drawOverlay(S, cam, tn);
    for (const k in G) G[k].end(); over.end();
    // painter's order by anatomical group, far groups fade
    const D = depthOf(S, cam), cd = cam.depth(S.F.pelvis.o);
    const ord = st.gnames.slice().sort((a, b) => D[a] - D[b]);
    const key = ord.join();
    if (key !== st.order) { for (const n of ord) root.appendChild(G[n].g); st.order = key; }
    for (const n of GROUPS) {
      if (n === 'floor' || n.startsWith('bar')) continue;
      const op = Math.round(K.clamp(.62 + (D[n] - cd) / 26, .5, 1) * 20) / 20;
      if (G[n].op !== op) { G[n].op = op; if (op >= 1) G[n].g.removeAttribute('opacity'); else G[n].g.setAttribute('opacity', op); }
    }
    st.ms.push(performance.now() - t0); if (st.ms.length > 120) st.ms.shift();
    st.S = S;
  }

  function setAnim(id, prim = primary, sec = secondary) {
    const clip = CLIPS[id];
    if (!clip) throw new Error(`anim v2: clip '${id}' not loaded`);
    // (clip.joins false: it does not start in its frame's shared stance, e.g. the Baduanjin horse-stance pieces)
    if (st.clip && st.clip !== clip && st.playing && !(clip.frame && clip.frame === st.clip.frame && clip.joins !== false && st.clip.joins !== false)) st.dip = performance.now();
    st.clip = clip; st.id = id;
    st.prim = new Set(prim ?? clip.muscles.primary); st.sec = new Set(sec ?? clip.muscles.secondary);
    st.groups = new Set([...st.prim, ...st.sec]);
    st.cam = camera(clip.cam.az, clip.cam.el);
    st.off = [0, 0, 0]; st.tr = ''; root.removeAttribute('transform');
    st.avg = K.analyse(clip, st.groups).avg;   // (also runs prep, which props may depend on)
    setProps(clip);
    trailPaths();
    svg.setAttribute('viewBox', viewBox(clip, st.cam).join(' '));
    svg.setAttribute('aria-label', `${clip.name} animation`);
    for (const k in G) G[k].reset(); over.reset(); st.order = '';
    st.elapsed = 0; st.rate = rateOf(clip);
    draw();
  }
  // flow pace: one clip cycle lasts clip.counts × pace seconds (the flow step's seconds per count); otherwise natural tempo
  function rateOf(clip) { return st.pace > 0 && clip.counts ? K.period(clip) / (clip.counts * st.pace) : 1; }
  function trailPaths() {
    st.trailPath = {};
    if (!st.trail) return;
    const clip = st.clip, tv = clip.travel;
    if (clip.swap) {                                // one side's path, and its mirror image for the second half
      const h = K.swapTime(clip), m = 48, pts = clip.trail || [];
      st.trailPathM = {};
      for (const p of pts) { st.trailPath[p] = []; st.trailPathM[p] = []; }
      for (let i = 0; i <= m; i++) {
        const S = K.poseAt(clip, i / m * h * .999);
        for (const p of pts) { const q = S.pt[p]; st.trailPath[p].push(st.cam.pr(q)); st.trailPathM[p].push(st.cam.pr([q[0], q[1], -q[2]])); }
      }
      return;
    }
    const an = K.analyse(clip, st.groups, clip.trail || []);   // (camera frame when travelling)
    for (const p in an.trail) st.trailPath[p] = an.trail[p].map((q, i, a) => st.cam.pr(tv ? K.sub(q, K.mul(tv, i / (a.length - 1))) : q));
  }
  // view box from the whole cycle (cached per clip)
  function viewBox(clip, cam) {
    const ck = st.lod ? '_vb1' : '_vb';
    if (clip[ck]) return (st.vb = clip[ck]);
    // clips chained in a flow (clip.frame, e.g. the Morning Taisō steps) share one view: the union of all of them
    const grp = clip.frame ? Object.values(CLIPS).filter(c => c.frame === clip.frame) : [clip];
    const bs = grp.map(c => bounds(c, cam, c === clip ? [...st.props0, ...st.propsM] : []));
    let [x0, y0, x1, y1] = bs.reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]);
    const pad = st.lod ? 2 : 8; x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
    let w = x1 - x0, h = y1 - y0;
    const ar = clip.aspect || K.clamp(w / h, .85, st.lod ? 1.3 : 1.5);
    if (w / h < ar) { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / ar; y0 -= (nh - h) * .7; h = nh; }
    const vb = [f2(x0), f2(y0), f2(w), f2(h)];
    for (const c of grp) c[ck] = vb;
    return (st.vb = vb);
  }
  function bounds(clip, cam, props) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const inc = (q, r = 0) => { x0 = Math.min(x0, q[0] - r); x1 = Math.max(x1, q[0] + r); y0 = Math.min(y0, q[1] - r); y1 = Math.max(y1, q[1] + r); };
    const T = K.period(clip);
    for (let i = 0; i < 16; i++) {                  // (travelling clips: in the panning camera's frame)
      const S = K.poseAt(clip, i / 16 * T), o = clip.travel ? follow(clip, S) : [0, 0, 0], pr = q => cam.pr(K.sub(q, o));
      for (const n in S.pt) inc(pr(S.pt[n]), 4); inc(pr(K.P(S.F.head, [1, 17, 0])), 3);
    }
    const b = clip.bar;
    // the bar frames the view; floor-standing uprights and their feet may run out of the picture (figure stays large)
    if (b) for (const z of [-b.w * .7, b.w * .7]) inc(cam.pr([b.x || 0, b.y, z]), 3);
    if (b && b.posts !== 'down') for (const z of [-b.w - 5, b.w + 5]) inc(cam.pr([b.x || 0, b.y + 16, z]), 2);
    for (const p of props) if (!p.nv) for (const q of propPts(p)) inc(cam.pr(q), 1);   // nv: may run out of frame
    if (clip.floor && !clip.travel) inc(cam.pr([0, 0, 0]), st.lod ? 2 : 5);
    return [x0, y0, x1, y1];
  }

  function loop(ts) {
    st.raf = 0;
    if (!st.playing || !st.visible) return;
    const dt = st.last ? Math.min(100, ts - st.last) : 16;
    st.last = ts; st.elapsed += dt * st.rate;
    // thumbnails, and any player whose median frame costs > 8 ms (slow phones), redraw at half rate
    if (!(st.lod || st.slow) || (st.odd = !st.odd)) draw();
    if (++st.n % 30 === 0 && st.ms.length >= 40) st.slow = api.stats().median > 8;
    st.raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (st.playing && st.visible && !st.raf) { st.last = 0; st.raf = requestAnimationFrame(loop); } };
  let io = null;
  if (typeof IntersectionObserver === 'function') { io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; kick(); }); io.observe(svg); }
  setAnim(animId, primary, secondary);
  kick();
  const api = {
    play() { st.fixedT = null; st.playing = true; kick(); },
    pause() { st.playing = false; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; },
    setAnim(id, p, s) { st.fixedT = null; setAnim(id, p, s); kick(); },
    destroy() { api.pause(); if (io) io.disconnect(); svg.remove(); },
    seek(t) { st.fixedT = t; draw(); },
    setTrail(on) { on = !!on && !st.lod; if (on !== st.trail) { st.trail = on; trailPaths(); draw(); } },
    setBreath(on) { on = !!on && !st.lod; if (on !== st.breath) { st.breath = on; draw(); } },
    setPace(sec) { st.pace = sec > 0 ? sec : null; st.rate = rateOf(st.clip); },   // (elapsed is clip time: no jump)
    setContacts(on) { st.contacts = !!on; draw(); },   // compare page: show which foot points bear weight
    stats() { const a = st.ms.slice().sort((x, y) => x - y); return { median: a[a.length >> 1] || 0, p95: a[Math.floor(a.length * .95)] || 0, n: a.length }; },
    get skeleton() { return st.S; }, get cam() { return st.cam; },
    svg,
  };
  return api;
}
