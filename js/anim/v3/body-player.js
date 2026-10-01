// Kitaeru animation v3 player: the human body (MakeHuman CC0, sportswear) driven live by the v2 motion core.
// Same contract as the v2 plate player (js/anim/v2/plate.js createPlatePlayer), so js/anim/skeleton.js can swap one for
// the other: play / pause / setAnim(id, prim, sec, { flow, blend, muscles, look }) / seek / setTrail / setBreath /
// setPace / destroy / stats / skeleton / svg (the root element).
//   * flows: pace (seconds per count) and fit (whole cycles in a timed step), no fades inside a flow, and a pose blend
//     from the previous step (K.blendPose, which also makes a planted foot step rather than slide);
//   * swap clips (one side, then the other) and loops that restart elsewhere dip through the paper, as in v2;
//   * travelling clips: the camera follows the pelvis along the travel; a floor grid scrolls under it;
//   * breath ring (HTML overlay) and motion trail (the clip's trail points on this body), camera from the clip (az / el);
//     drag sideways to look around, it drifts back to the clip's view.
// Real motion: where a motion-capture clip exists for the id (mocap.js, MOCAP_CLIPS) and has been fetched (ensureMocap,
// done by skeleton.js before it shows the clip), the body plays it instead of the v2 bridge, with the same contract: the
// v2 clip still gives the camera, floor and props, the count (pace / fit), the breath ring's phase and the trail points.
// opt.mocap: false keeps the v2 bridge (review pages). A flow step that blends into or out of a real-motion step (or
// between two of them) blends in the rig's own rotations, its planted feet kept on the floor (blendRig below).
// Big players (size >= 160 px) own a WebGL canvas. Thumbnails share ONE renderer and one stage per body: each paints
// its pose into its own small 2D canvas, once (static thumbnails) or at 12 fps (playing ones), so a Library list of
// many thumbnails costs no extra WebGL contexts.
import * as THREE from '../../vendor/three.module.min.js';
import * as K from '../v2/core.js';
import { CLIPS } from '../v2/clips/lib.js';
import { parseBody } from './glb.js';
import { createRetarget } from './retarget.js';
import { createStage, viewDir } from './stage.js';
import { hasMocap, mocapState, mocapClip, ensureMocap, prefetchMocap, sampler, fkPose, poseBuffer, qrot } from './mocap.js';

export const BODY_URL = sex => new URL(`../../../assets/v3/human_${sex === 'm' ? 'm' : 'f'}.glb`, import.meta.url).href;
const bodies = {};                                          // sex -> Promise<{ tpl, rt }>
export function loadBody(sex) {
  const k = sex === 'm' ? 'm' : 'f';
  if (!bodies[k]) {
    bodies[k] = fetch(BODY_URL(k)).then(r => { if (!r.ok) throw new Error(`body ${k}: ${r.status}`); return r.arrayBuffer(); })
      .then(buf => { const tpl = parseBody(buf); return { tpl, rt: createRetarget(tpl) }; });
    bodies[k].catch(() => { delete bodies[k]; });
  }
  return bodies[k];
}
let ready = {};                                               // sex -> { tpl, rt } once loaded
export async function ensureBody(sex) { const b = await loadBody(sex); ready[sex === 'm' ? 'm' : 'f'] = b; return b; }
export const bodyReady = sex => !!ready[sex === 'm' ? 'm' : 'f'];
/** real motion for this id and body: fetched and decoded (resolves false when there is none or it failed: the v2 bridge) */
export async function ensureMotion(id, sex) { const b = await ensureBody(sex); return ensureMocap(id, sex === 'm' ? 'm' : 'f', b.tpl); }
/** has the real-motion question for this id been settled (loaded, failed or none)? */
export const motionSettled = (id, sex) => mocapState(id, sex === 'm' ? 'm' : 'f') !== null;
export { hasMocap };

let webgl = null;
/** WebGL2 available (three.js r170 needs it)? Checked once. */
export function hasWebGL() {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2');
    webgl = !!gl;
    gl && gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { webgl = false; }
  return webgl;
}

// ---------- players registry: theme changes repaint every live player ----------
const live = new Set();
let watching = false;
function watchTheme() {
  if (watching || typeof MutationObserver !== 'function') return;
  watching = true;
  const again = () => requestAnimationFrame(() => { for (const p of live) p._theme(); });
  new MutationObserver(again).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', again); } catch { /* old Safari */ }
}

// ---------- per-clip analysis on this body: framing (cached) and trail paths ----------
function follow(clip, S) {
  const d = K.nrm(clip.travel), p0 = clip._p0 || (clip._p0 = K.poseAt(clip, 0).pt.pelvis);
  return K.mul(d, K.dot(K.sub(S.pt.pelvis, p0), d));
}
function plantedOf(S) {
  const c = S.src || {}, out = {};
  for (const sd of ['R', 'L']) {
    const sp = c.arms?.[sd] || c.arms?.both;
    let w = 0;
    if (sp && sp.mode === 'ik' && ['palm', 'forearm', 'bar', 'world'].includes(sp.grip)) w = 1 - K.clamp(S.ch['release' + sd] || 0, 0, 1);
    w = Math.max(w, K.clamp(S.ch['trace' + sd] || 0, 0, 1));
    if (c.props && [].concat(typeof c.props === 'function' ? [] : c.props).some(p => p.t === 'band')) w = 1;
    out[sd] = w;
  }
  return out;
}
const poseOpts = S => ({ planted: plantedOf(S), legsPlanted: !!(S.src?.legs && Object.values(S.src.legs).some(l => l && l.mode === 'ik')) });

// a shared frame (e.g. every Surya Namaskar position) that has real-motion clips is framed a little wider, for every clip in
// it (real or bridged), so the camera never jumps between flow steps; a clip of its own is framed around both motions
const MOCAP_PAD = 1.08;
const groupHasMocap = clip => !!clip.frame && Object.entries(CLIPS).some(([id, c]) => c.frame === clip.frame && hasMocap(id));
function frameOf(clip, rt, tag, extra = null) {
  const pad = tag.endsWith('+') && groupHasMocap(clip) ? MOCAP_PAD : 1;
  const key = '_v3view_' + tag + (extra ? '_' + extra.key : '');
  if (clip[key]) return clip[key];
  const grp = clip.frame ? Object.values(CLIPS).filter(c => c.frame === clip.frame) : [clip];
  const c = viewDir(clip.cam);
  const r = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), c).normalize(), u = new THREE.Vector3().crossVectors(c, r);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, d0 = 1e9, d1 = -1e9;
  const v = new THREE.Vector3();
  const inc = (p, pad) => { v.set(p[0], p[1], p[2]); const x = v.dot(r), y = v.dot(u), d = v.dot(c);
    x0 = Math.min(x0, x - pad); x1 = Math.max(x1, x + pad); y0 = Math.min(y0, y - pad); y1 = Math.max(y1, y + pad); d0 = Math.min(d0, d); d1 = Math.max(d1, d); };
  for (const cl of grp) {
    const T = K.period(cl);
    for (let i = 0; i < 16; i++) {
      const S = K.poseAt(cl, i / 16 * T), o = rt.pose(S, poseOpts(S));
      const off = cl.travel ? rt.toRig(follow(cl, S)).map((x, k) => x - rt.toRig([0, 0, 0])[k]) : [0, 0, 0];
      const q = p => [p[0] - off[0], p[1] - off[1], p[2] - off[2]];
      for (const p of o.P) if (p) inc(q(p), .085);
      inc(q(rt.point('headTop', o)), .03);
      for (const n of ['palmR', 'palmL']) inc(q(rt.point(n, o)), .05);
    }
    if (cl.bar) for (const z of [-cl.bar.w * .7, cl.bar.w * .7]) inc(rt.toRig([cl.bar.x || 0, cl.bar.y, z]), .03);
    if (cl.floor && !cl.travel) inc([0, 0, 0], .02);
  }
  if (extra) for (const [p, pd] of extra.pts) inc(p, pd);
  let w = x1 - x0, h = y1 - y0;
  const target = r.clone().multiplyScalar((x0 + x1) / 2).addScaledVector(u, (y0 + y1) / 2).addScaledVector(c, (d0 + d1) / 2);
  w *= pad; h *= pad;
  const view = { c, target, w: w * 1.04, h: h * 1.04, depth: (d1 - d0) / 2, aspect: K.clamp(w / h, .85, 1.5) };
  if (extra) clip[key] = view; else for (const cl of grp) cl[key] = view;
  return view;
}
// the points a real-motion clip covers (for framing a clip that has no shared frame)
function mocapPts(at, D, rt) {
  const pts = [], n = Math.max(24, Math.min(96, Math.round(D.period * 6))), hi = rt.index.head;
  for (let i = 0; i < n; i++) {
    const o = at(i / n * D.period);
    for (const p of o.P) if (p) pts.push([p.slice(), .085]);
    const t = qrot(o.W, hi * 4, [0, .2, 0]); pts.push([[o.P[hi][0] + t[0], o.P[hi][1] + t[1], o.P[hi][2] + t[2]], .03]);
    for (const nm of ['palmR', 'palmL']) pts.push([rt.point(nm, o), .05]);
  }
  return pts;
}
// a real-motion clip sits where the v2 clip's first pose has its feet (the flow step before it ends there)
const shifts = new Map();
function mocapShift(id, clip, D, tpl, rt, sex) {
  const k = id + '.' + sex;
  if (shifts.has(k)) return shifts.get(k);
  const S0 = K.poseAt(clip, 0), o0 = rt.pose(S0, poseOpts(S0)), fl = rt.index.foot_l, fr = rt.index.foot_r;
  const v2x = (o0.P[fl][0] + o0.P[fr][0]) / 2, v2z = (o0.P[fl][2] + o0.P[fr][2]) / 2;
  const m0 = sampler(D, tpl)(0), mx = (m0.P[fl][0] + m0.P[fr][0]) / 2, mz = (m0.P[fl][2] + m0.P[fr][2]) / 2;
  const sh = clip.travel ? [0, 0, 0] : [v2x - mx, 0, v2z - mz];
  shifts.set(k, sh);
  return sh;
}
function trailPathsMocap(clip, D, at, rt, key) {
  const names = clip.trail || [];
  if (!names.length) return [null, null];
  if (clip[key]) return clip[key];
  const out = Object.fromEntries(names.map(p => [p, []]));
  for (let i = 0; i <= 72; i++) { const o = at(i / 72 * D.period * .9999); for (const p of names) { const q = rt.point(p, o); if (q) out[p].push(q.slice()); } }
  return (clip[key] = [out, null]);
}
function trailPaths(clip, rt, lodTag) {
  const names = clip.trail || [];
  if (!names.length) return [null, null];
  const key = '_v3trail_' + lodTag;
  if (clip[key]) return clip[key];
  const base = rt.toRig([0, 0, 0]);
  const sample = (t0, t1, n) => {
    const out = Object.fromEntries(names.map(p => [p, []]));
    for (let i = 0; i <= n; i++) {
      const S = K.poseAt(clip, t0 + (t1 - t0) * i / n), o = rt.pose(S, poseOpts(S));
      const off = clip.travel ? rt.toRig(K.mul(clip.travel, i / n)).map((x, k) => x - base[k]) : [0, 0, 0];
      for (const p of names) { const q = rt.point(p, o); if (q) out[p].push([q[0] - off[0], q[1] - off[1], q[2] - off[2]]); }
    }
    return out;
  };
  let res;
  if (clip.swap) {
    const h = K.swapTime(clip), a = sample(0, h * .999, 48), m = {};
    for (const p in a) m[p] = a[p].map(q => [-q[0], q[1], q[2]]);
    res = [a, m];
  } else res = [sample(0, K.period(clip), 72), null];
  return (clip[key] = res);
}

// ---------- shared thumbnail renderer ----------
let TH = null;
function thumbShared() {
  if (TH) return TH;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
  renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
  renderer.setSize(320, 320, false);
  TH = { renderer, stages: {}, size: 320, playing: new Set(), raf: 0, last: 0 };
  // context lost (Android drops it when the app goes to the background or memory runs low): retire this renderer, so the
  // next thumbnail builds a fresh one, and tell its players (the caller rebuilds them)
  const S = TH;
  renderer.domElement.addEventListener('webglcontextlost', e => {
    e.preventDefault(); S.lost = true; if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; if (TH === S) TH = null;
    for (const p of live) if (p.lod && p._ts === S) p._lost();
  });
  return TH;
}
function thumbStage(sex, body) {
  const S = thumbShared();
  if (!S.stages[sex]) { S.stages[sex] = createStage(body.tpl, body.rt, { lod: 1 }); S.stages[sex].theme(); S.stages[sex].clip = null; }
  return S.stages[sex];
}
function thumbTick(S, ts) {
  S.raf = 0;
  if (S.lost || !S.playing.size) return;
  S.raf = requestAnimationFrame(t => thumbTick(S, t));
  if (ts - S.last < 80) return;                               // ~12 fps is plenty for a 64 px thumbnail
  const dt = S.last ? Math.min(200, ts - S.last) : 80; S.last = ts;
  for (const p of S.playing) p._tick(dt);
}

/**
 * @param {HTMLElement} container
 * @param {string} animId  a v2 clip id (its clip group must be loaded)
 * @param opt  { primary, secondary, size, playing, trail, breath, pace, fit, flow, muscles, look: 'solid'|'xray', skeleton, sex: 'f'|'m' }
 *             The body for opt.sex must be loaded (ensureBody) before calling.
 */
export function createBodyPlayer(container, animId, opt = {}) {
  const o = { primary: null, secondary: null, size: 320, playing: true, trail: false, breath: false, pace: null, fit: null, flow: false,
    muscles: true, look: 'xray', skeleton: false, sex: 'f', mocap: true, ...opt };
  const sex = o.sex === 'm' ? 'm' : 'f', body = ready[sex];
  if (!body) throw new Error('v3 body not loaded');
  const { rt } = body;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lod = o.size < 160 ? 1 : 0;
  const TS = lod ? thumbShared() : null;                       // this thumbnail's shared renderer (replaced after a context loss)
  watchTheme();
  const st = { clip: null, id: null, playing: o.playing && !reduce, visible: true, elapsed: 0, last: 0, raf: 0, fixedT: null, rate: 1,
    pace: o.pace, fit: o.fit, flow: !!o.flow, trail: !lod && !!o.trail, breath: !lod && !!o.breath, mus: o.muscles !== false, look: o.look,
    off: [0, 0, 0], S: null, blend: null, ms: [], n: 0, slow: false, odd: false, drag: 0, dragT: -1e9, view: null, dirty: true,
    mo: null, at: null, rblend: null, lastPose: null };
  const tagV = sex + (o.mocap !== false ? '+' : '');                 // framing key (a shared frame with real motion is wider)
  const bufB = poseBuffer(body.tpl);                                  // the blended pose (rig blends)

  // ---- DOM ----
  let root, canvas, ctx2d = null, renderer = null, stage, ring = null, detail = null;
  const dCam = new THREE.PerspectiveCamera(30, 1, .02, 20), clipPlane = new THREE.Plane();
  if (lod) {
    root = canvas = document.createElement('canvas');
    canvas.className = 'kt-v3 lod'; canvas.setAttribute('role', 'img');
    ctx2d = canvas.getContext('2d');
    stage = thumbStage(sex, body);
  } else {
    root = document.createElement('div');
    root.className = 'kt-v3'; root.setAttribute('role', 'img');
    root.style.cssText = `position:relative;width:100%;max-width:${o.size}px;margin:0 auto;`;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
    canvas = renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';
    root.appendChild(canvas);
    ring = document.createElement('div');
    ring.className = 'kt-v3-breath';
    ring.style.cssText = 'position:absolute;right:6%;top:5%;width:26px;height:26px;border-radius:50%;border:1.5px solid var(--accent-2,#D9A441);display:none;place-items:center;pointer-events:none';
    ring.innerHTML = '<div style="width:100%;height:100%;border-radius:50%;background:var(--accent-2,#D9A441);opacity:.28"></div>';
    root.appendChild(ring);
    // detail inset (clip.detail, e.g. the diamond push-up's hands): a round close-up from its own camera
    detail = document.createElement('div');
    detail.className = 'kt-v3-detail';
    detail.style.cssText = 'position:absolute;display:none;border-radius:50%;overflow:hidden;border:1px solid color-mix(in srgb,var(--ink-muted,#6B665C) 85%,transparent);background:var(--surface,#FFFDF7);pointer-events:none';
    detail.innerHTML = '<canvas style="width:100%;height:100%;display:block"></canvas><span style="position:absolute;left:0;right:0;bottom:6%;text-align:center;font:700 10px system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--ink,#1C1B19)"></span>';
    root.appendChild(detail);
    stage = createStage(body.tpl, rt, { lod: 0 });
    stage.theme();
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); if (st.dead) return; st.lost = true; api._lost(); });   // (not our own destroy())
  }
  container.appendChild(root);

  function applyLook() {
    stage.setLook(st.look, st.look !== 'solid' && !!o.skeleton);
    const m = st.mus && st.look !== 'solid';
    stage.setMuscles(m ? [...st.prim] : [], m ? [...st.sec] : []);
  }

  // ---- drawing ----
  function aspectNow() {
    if (lod) return canvas.width / canvas.height;
    const w = root.clientWidth || o.size, h = root.clientHeight || w / (st.view?.aspect || 1);
    return w / h;
  }
  // real motion: the clip's own pose at the same point of the cycle; the v2 clip gives the breath ring's phase
  function poseMocap() {
    const clip = st.clip, D = st.mo, T = D.period;
    const tn = st.fixedT != null ? st.fixedT : (!st.playing && st.elapsed === 0 ? (clip.still ?? .45) : (st.elapsed / 1000 % T) / T);
    const out = st.at(tn * T);
    const S = st.breath ? K.poseAt(clip, tn * K.period(clip)) : null;
    let u = 1;
    const sw = D.swapAt, wrap = D.dipWrap && !st.flow;
    if (sw || wrap) { const ts = tn * T, d = Math.min(sw ? Math.abs(ts - sw) : 1e9, wrap ? ts : 1e9, wrap ? T - ts : 1e9); u = Math.min(1, d / .35); }
    return { S, out, tn, T, op: .15 + .85 * u * u * (3 - 2 * u) };
  }
  function pose() {
    const clip = st.clip, T = K.period(clip);
    const tn = st.fixedT != null ? st.fixedT : (!st.playing && st.elapsed === 0 ? (clip.still ?? .45) : (st.elapsed / 1000 % T) / T);
    let S = K.poseAt(clip, tn * T);
    st.off = clip.travel ? follow(clip, S) : [0, 0, 0];
    if (st.blend) {
      const v = (performance.now() - st.blend.t0) / st.blend.ms;
      if (v >= 1 || st.fixedT != null) st.blend = null;
      else S = K.blendPose(st.blend.S, st.blend.off, S, st.off, v * v * (3 - 2 * v));
    }
    let u = 1;
    if (clip.swap || clip.cut) {
      const sm = K.seams(clip), h = clip.swap && !sm.h ? K.swapTime(clip) : -1, ts = tn * T, wrap = !sm.w && !st.flow;
      const d = Math.min(wrap ? ts : 1e9, h < 0 ? 1e9 : Math.abs(ts - h), wrap ? T - ts : 1e9);
      u = Math.min(1, d / .35);
    }
    return { S, tn, T, op: .15 + .85 * u * u * (3 - 2 * u) };
  }
  function draw() {
    if (!st.clip || st.lost) return;
    const t0 = performance.now();
    const mo = !!st.mo;
    const { S, tn, T, op, out: mout } = mo ? poseMocap() : pose();
    let out = mo ? mout : rt.pose(S, poseOpts(S));
    st.rawP = out.P;                                            // (the clip's own pose, before a blend: tests)
    if (st.rblend) out = blendRig(out);
    keepLast(out);
    const second = !mo && !!(st.clip.swap && tn * T >= K.swapTime(st.clip));
    if (lod && stage.clip !== st.clip) { stage.setClip(st.clip); stage.clip = st.clip; }
    applyLookIfShared();
    stage.showMirrored(second);
    stage.applyPose(out, S);
    const off = new THREE.Vector3(...rt.toRig(st.off)).sub(new THREE.Vector3(...rt.toRig([0, 0, 0])));
    stage.follow(off);
    if (!lod && st.trail && st.trailOn) {
      const h = !mo && st.clip.swap ? K.swapTime(st.clip) : 0;
      stage.updateTrail(h ? (tn * T - (second ? h : 0)) / h : tn, second, off);
    }
    // camera: the clip's view (+ a sideways drag that drifts back)
    const idle = K.clamp((performance.now() - st.dragT - 2500) / 2500, 0, 1);
    if (idle > 0 && !st.dragging) st.drag *= 1 - .06 * idle;
    let view = st.view;
    if (st.drag) { const c = view.c.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), st.drag * K.DEG); view = { ...view, c }; }
    const opv = Math.round(op * 20) / 20;
    if (lod) {
      if (TS.lost) return;
      const S2 = TS, w = canvas.width, h = canvas.height;
      stage.place(view, w / h, off);
      S2.renderer.setViewport(0, 0, w, h);
      S2.renderer.render(stage.scene, stage.camera);
      ctx2d.clearRect(0, 0, w, h);
      ctx2d.globalAlpha = opv;
      ctx2d.drawImage(S2.renderer.domElement, 0, S2.size - h, w, h, 0, 0, w, h);
    } else {
      if (st.clip.detail && !mo) drawDetail(out);
      stage.place(view, aspectNow(), off);
      renderer.render(stage.scene, stage.camera);
      if (st.op !== opv) { st.op = opv; root.style.opacity = opv >= 1 ? '' : opv; }
      if (st.breath && S) { ring.style.display = 'grid'; ring.firstChild.style.transform = `scale(${(.35 + .65 * S.breath).toFixed(3)})`; } else ring.style.display = 'none';
    }
    st.S = mo ? null : S;
    st.ms.push(performance.now() - t0); if (st.ms.length > 120) st.ms.shift();
  }
  // the detail inset: render the close-up into a corner of the canvas, copy it into the round inset, then the main view
  // (drawn next) covers that corner again
  function drawDetail(out) {
    const d = st.clip.detail, w = canvas.width, h = canvas.height;
    const R = Math.round(Math.min(.45 * h, Math.max(.15 * w, 110 * (renderer.getPixelRatio() || 1))) * 1.15);
    const pts = d.at.map(n => rt.point(n, out)).filter(Boolean);
    if (!pts.length || R < 20) { detail.style.display = 'none'; return; }
    const c = pts.reduce((a, p) => a.add(new THREE.Vector3(...p).multiplyScalar(1 / pts.length)), new THREE.Vector3());
    const dir = viewDir(d.cam || { az: 90, el: 70 }), rad = (d.r || 20) * rt.s;
    dCam.position.copy(c).addScaledVector(dir, rad / Math.tan(15 * K.DEG)); dCam.up.set(0, 1, 0); dCam.lookAt(c);
    const pr = renderer.getPixelRatio() || 1, css = R / pr, sz = renderer.getSize(new THREE.Vector2());   // (viewport / scissor: CSS px)
    renderer.setScissorTest(true); renderer.setScissor(0, 0, css, css); renderer.setViewport(0, 0, css, css);
    // (only the hands and forearms, as in v2: everything more than 7 cm above the highest detail point is cut away)
    clipPlane.set(new THREE.Vector3(0, -1, 0), Math.max(...pts.map(p => p[1])) + .07);
    renderer.clippingPlanes = [clipPlane];
    renderer.render(stage.scene, dCam);
    renderer.clippingPlanes = [];
    const dc = detail.firstChild; if (dc.width !== R) { dc.width = dc.height = R; }
    const g = dc.getContext('2d'); g.clearRect(0, 0, R, R); g.drawImage(canvas, 0, h - R, R, R, 0, 0, R, R);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, sz.x, sz.y);
    const crn = d.corner || 'tl', m = 8;
    detail.style.cssText = detail.style.cssText.replace(/display:none;?/, '') + `;display:block;width:${css}px;height:${css}px;${crn[0] === 't' ? 'top' : 'bottom'}:${m}px;${crn[1] === 'l' ? 'left' : 'right'}:${m}px`;
    detail.lastChild.textContent = d.label || '';
  }
  // thumbnails share a stage: set this player's look and muscles before each paint
  function applyLookIfShared() { if (lod) applyLook(); }

  // the last drawn pose (a copy), for blends out of it
  function keepLast(p) {
    const L = st.lastPose || (st.lastPose = { q: new Float32Array(p.q.length), pelvis: [0, 0, 0], P: [], pq: new Float32Array(p.q.length), ppel: [0, 0, 0], t: 0, pt: 0 });
    L.pq.set(L.q); for (let c = 0; c < 3; c++) L.ppel[c] = L.pelvis[c]; L.pt = L.t; L.t = performance.now();   // (the one before: velocity)
    L.q.set(p.q); for (let c = 0; c < 3; c++) L.pelvis[c] = p.pelvis[c];
    L.P = p.P.map(x => (x ? x.slice() : x));
    L.G = p.G.map(x => (x ? x.slice() : x));
  }
  // rig blend (into, out of, or between real-motion steps): every bone's local rotation and the pelvis eased from the last
  // pose to the new clip's; a foot on the floor in both poses stays on it (a straight path) and steps (lifts) if it moves
  function blendRig(cur) {
    const B = st.rblend;
    if (B.ms == null) {                                         // its length: by how far apart the poses are (as the v2 blend)
      let gap = 0;
      for (let i = 0; i < cur.P.length; i++) if (cur.P[i] && B.P[i]) gap = Math.max(gap, Math.hypot(cur.P[i][0] - B.P[i][0], cur.P[i][1] - B.P[i][1], cur.P[i][2] - B.P[i][2]));
      B.ms = K.clamp(450 + 2200 * gap, 500, 1500); B.t0 = performance.now();
    }
    const v = st.fixedT != null ? 1 : (performance.now() - B.t0) / B.ms;
    if (v >= 1) { st.rblend = null; return cur; }
    const e = v * v * (3 - 2 * v), q = bufB.q, b = cur.q;
    // the pose blended from keeps moving the way it was (its last frame-to-frame step, extrapolated and dying away over
    // ~0.15 s), so a step that starts while the previous one is still moving does not stop dead and restart
    const a = B.qa, el = performance.now() - B.t0, tau = 150, x = B.dt > 5 && B.dt < 200 ? tau * (1 - Math.exp(-el / tau)) / B.dt : 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = B.q[i] * B.pq[i] + B.q[i + 1] * B.pq[i + 1] + B.q[i + 2] * B.pq[i + 2] + B.q[i + 3] * B.pq[i + 3], sg = d < 0 ? -1 : 1;
      let n = 0; for (let c = 0; c < 4; c++) { a[i + c] = B.q[i + c] + (B.q[i + c] - sg * B.pq[i + c]) * x; n += a[i + c] * a[i + c]; }
      n = 1 / Math.sqrt(n || 1); for (let c = 0; c < 4; c++) a[i + c] *= n;
    }
    for (let c = 0; c < 3; c++) B.pa[c] = B.pelvis[c] + (B.pelvis[c] - B.ppel[c]) * x;
    // each bone's target quaternion kept in one hemisphere from frame to frame (its sign is chosen against the target's
    // previous frame, not against the start): a bone whose start and target are ~half a turn apart would otherwise flip
    // between the two ways round as the target moves
    const pb = B.pb || (B.pb = new Float32Array(q.length).fill(NaN));
    for (let i = 0; i < q.length; i += 4) {
      let sg;
      if (Number.isNaN(pb[i])) sg = a[i] * b[i] + a[i + 1] * b[i + 1] + a[i + 2] * b[i + 2] + a[i + 3] * b[i + 3] < 0 ? -1 : 1;
      else sg = pb[i] * b[i] + pb[i + 1] * b[i + 1] + pb[i + 2] * b[i + 2] + pb[i + 3] * b[i + 3] < 0 ? -1 : 1;
      for (let c = 0; c < 4; c++) pb[i + c] = sg * b[i + c];
      let n = 0;
      for (let c = 0; c < 4; c++) { q[i + c] = a[i + c] * (1 - e) + sg * b[i + c] * e; n += q[i + c] * q[i + c]; }
      n = 1 / Math.sqrt(n || 1); for (let c = 0; c < 4; c++) q[i + c] *= n;
    }
    for (let c = 0; c < 3; c++) bufB.pelvis[c] = B.pa[c] * (1 - e) + cur.pelvis[c] * e;
    fkPose(body.tpl, q, bufB.pelvis, bufB);
    plantFeet(B, cur, e);
    return bufB;
  }
  const tpl = body.tpl, I = n => rt.index[n];
  // limbs that can rest on the floor: [key, root, mid, end bones, end height below which it counts as resting, the mid
  // joint's bend direction in the root bone's frame when the limb is straight (knees forwards, elbows backwards)]
  const LIMBS = ['l', 'r'].flatMap(sd => [['leg' + sd, I('thigh_' + sd), I('calf_' + sd), I('foot_' + sd), .08, [0, 0, 1]],
    ['arm' + sd, I('upperarm_' + sd), I('lowerarm_' + sd), I('hand_' + sd), .1, [0, 0, -1]]]);
  // a foot or hand near the floor in both poses keeps to it (a straight path, lifting a little if it moves: a step) instead
  // of swinging through or along the floor with the blended rotations; one in the air in either pose blends freely. The
  // weight is set once per blend (never toggled while it runs) and eased out over its last quarter, so the hand-over to
  // the clip's own limbs has no step.
  function plantFeet(B, cur, e) {
    let moved = false;
    const W = B.feetW || (B.feetW = {});
    for (const [key, ia, ib, ic, low, fwd] of LIMBS) {
      const fa = B.P[ic], fb = cur.P[ic];
      if (!fa || !fb) continue;
      if (W[key] == null) { const hi = Math.max(fa[1], fb[1]), wf = 1 - K.clamp((hi - low) / .1, 0, 1); W[key] = wf * wf * (3 - 2 * wf); }
      const ws = W[key];
      if (ws <= 0) continue;
      const dist = Math.hypot(fb[0] - fa[0], fb[2] - fa[2]), lift = dist > .04 ? Math.min(.08, dist * .6) * Math.sin(Math.PI * e) : 0;
      const cb = bufB.P[ic];
      const g = [fa[0] + (fb[0] - fa[0]) * e, fa[1] + (fb[1] - fa[1]) * e + lift, fa[2] + (fb[2] - fa[2]) * e];
      const goal = [cb[0] + (g[0] - cb[0]) * ws, cb[1] + (g[1] - cb[1]) * ws, cb[2] + (g[2] - cb[2]) * ws];
      const keepQ = [ia, ib, ic].map(i => [i, bufB.q.slice(i * 4, i * 4 + 4)]);
      limbTo(bufB, ia, ib, ic, goal, bendDir(B, key, ia, ib, ic, fwd, e, cur));
      moved = true;
      const k = 1 - K.clamp((e - .75) / .25, 0, 1), kk = k * k * (3 - 2 * k);
      if (kk < 1) for (const [i, q0] of keepQ) {
        const o = i * 4, d = q0[0] * bufB.q[o] + q0[1] * bufB.q[o + 1] + q0[2] * bufB.q[o + 2] + q0[3] * bufB.q[o + 3], sg = d < 0 ? -1 : 1;
        let n = 0; for (let c = 0; c < 4; c++) { bufB.q[o + c] = q0[c] * (1 - kk) + sg * bufB.q[o + c] * kk; n += bufB.q[o + c] ** 2; }
        n = 1 / Math.sqrt(n || 1); for (let c = 0; c < 4; c++) bufB.q[o + c] *= n;
      }
      fkPose(tpl, bufB.q, bufB.pelvis, bufB);
    }
    return moved;
  }
  const qinv = q => [-q[0], -q[1], -q[2], q[3]];
  const mulq = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  function qFromTo(a, b) {
    const la = Math.hypot(a[0], a[1], a[2]) || 1, lb = Math.hypot(b[0], b[1], b[2]) || 1;
    const x = [a[0] / la, a[1] / la, a[2] / la], y = [b[0] / lb, b[1] / lb, b[2] / lb], d = x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
    if (d < -.9999) return [0, 0, 0, 1];
    const c = [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]], w = 1 + d, n = Math.hypot(c[0], c[1], c[2], w);
    return [c[0] / n, c[1] / n, c[2] / n, w / n];
  }
  // the mid joint's bend direction in the root bone's own frame, in the pose blended from (B) and the one blended to (cur),
  // eased: at the start the IK changes nothing, at the end it agrees with the new clip, and it never flips side in between
  const mt = (G, v) => [G[0] * v[0] + G[3] * v[1] + G[6] * v[2], G[1] * v[0] + G[4] * v[1] + G[7] * v[2], G[2] * v[0] + G[5] * v[1] + G[8] * v[2]];
  function bendLocal(P, G, ia, ib, ic, fwd) {
    const H = P[ia], Kp = P[ib], A = P[ic];
    const ax = [A[0] - H[0], A[1] - H[1], A[2] - H[2]], la = Math.hypot(...ax) || 1;
    let o = [Kp[0] - (H[0] + A[0]) / 2, Kp[1] - (H[1] + A[1]) / 2, Kp[2] - (H[2] + A[2]) / 2];
    const pd = (o[0] * ax[0] + o[1] * ax[1] + o[2] * ax[2]) / (la * la); o = o.map((v, i) => v - ax[i] * pd);
    const l = mt(G[ia], o), n = Math.hypot(...l), w = Math.min(1, n / .03);         // (straight: the default direction)
    const v = [l[0] / (n || 1) * w + fwd[0] * (1 - w), l[1] / (n || 1) * w + fwd[1] * (1 - w), l[2] / (n || 1) * w + fwd[2] * (1 - w)], m = Math.hypot(...v) || 1;
    return v.map(x => x / m);
  }
  function bendDir(B, key, ia, ib, ic, fwd, e, cur) {
    const K0 = B.kd || (B.kd = {});
    if (!K0[key]) K0[key] = bendLocal(B.P, B.G, ia, ib, ic, fwd);
    const a = K0[key], b = bendLocal(cur.P, cur.G, ia, ib, ic, fwd);
    return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
  }
  // two-bone IK on the blended pose: the end joint (ankle / wrist) to goal, the mid joint (knee / elbow) bending along `bend`
  // (root frame), soft near full reach (a straight limb never flicks); the end bone (foot / hand) keeps its world rotation
  function limbTo(p, th, ca, ft, goal, bend) {
    const H = p.P[th], Kp = p.P[ca], A = p.P[ft];
    const l1 = Math.hypot(Kp[0] - H[0], Kp[1] - H[1], Kp[2] - H[2]), l2 = Math.hypot(A[0] - Kp[0], A[1] - Kp[1], A[2] - Kp[2]);
    const d = [goal[0] - H[0], goal[1] - H[1], goal[2] - H[2]], L0 = Math.hypot(d[0], d[1], d[2]) || 1e-6, dir = d.map(x => x / L0);
    const Lm = l1 + l2, Ls = Lm * .98, Lsoft = L0 > Ls ? Ls + Lm * .02 * (1 - Math.exp(-(L0 - Ls) / (Lm * .02))) : L0;
    const L = Math.max(Math.abs(l1 - l2) + 1e-4, Math.min(Lm - 1e-5, Lsoft));
    const x = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    let pole = qrot(p.W, th * 4, bend);
    const pd = pole[0] * dir[0] + pole[1] * dir[1] + pole[2] * dir[2];
    pole = pole.map((v, i) => v - dir[i] * pd);
    const pl = Math.hypot(pole[0], pole[1], pole[2]) || 1;
    pole = pole.map(v => v / pl);
    const K2 = [H[0] + dir[0] * x + pole[0] * h, H[1] + dir[1] * x + pole[1] * h, H[2] + dir[2] * x + pole[2] * h];
    const A2 = [H[0] + dir[0] * L, H[1] + dir[1] * L, H[2] + dir[2] * L];
    const W = p.W, wq = i => [W[i * 4], W[i * 4 + 1], W[i * 4 + 2], W[i * 4 + 3]];
    const Wth = mulq(qFromTo([Kp[0] - H[0], Kp[1] - H[1], Kp[2] - H[2]], [K2[0] - H[0], K2[1] - H[1], K2[2] - H[2]]), wq(th));
    const Kr = qrot(Wth, 0, tpl.bones[ca].t), Kn = [H[0] + Kr[0], H[1] + Kr[1], H[2] + Kr[2]];
    const Wca0 = mulq(Wth, mulq(qinv(wq(th)), wq(ca)));        // the mid bone carried along with the root bone
    const Ar = qrot(Wca0, 0, tpl.bones[ft].t);
    const Wca = mulq(qFromTo(Ar, [A2[0] - Kn[0], A2[1] - Kn[1], A2[2] - Kn[2]]), Wca0);
    const set = (i, q4) => { for (let c = 0; c < 4; c++) p.q[i * 4 + c] = q4[c]; };
    set(th, mulq(qinv(wq(tpl.parent[th])), Wth)); set(ca, mulq(qinv(Wth), Wca)); set(ft, mulq(qinv(Wca), wq(ft)));
  }

  function setAnim(id, prim, sec, opts = {}) {
    const clip = CLIPS[id];
    if (!clip) throw new Error(`anim v3: clip '${id}' not loaded`);
    st.blend = null; st.rblend = null;
    const D = o.mocap !== false ? mocapClip(id, sex) : null;
    if (opts.blend && st.lastPose && st.clip && st.playing && (D || st.mo || !st.S)) {
      const L = st.lastPose;
      st.rblend = { q: L.q.slice(), pelvis: L.pelvis.slice(), P: L.P.map(x => (x ? x.slice() : x)), G: L.G.map(x => (x ? x.slice() : x)), t0: 0, ms: null,
        pq: L.pq.slice(), ppel: L.ppel.slice(), dt: L.t - L.pt, qa: new Float32Array(L.q.length), pa: [0, 0, 0] };
    } else if (opts.blend && st.S && st.clip && st.playing) {
      const S0 = K.poseAt(clip, 0), o0 = clip.travel ? follow(clip, S0) : [0, 0, 0];
      let gap = 0;
      for (const p in S0.pt) if (st.S.pt[p]) gap = Math.max(gap, K.len(K.sub(K.sub(st.S.pt[p], st.off), K.sub(S0.pt[p], o0))));
      st.blend = { S: st.S, off: st.off.slice(), t0: performance.now(), ms: K.clamp(450 + 22 * gap, 500, 1500) };
    }
    st.flow = !!opts.flow;
    if ('muscles' in opts) st.mus = opts.muscles !== false;
    if (opts.look) st.look = opts.look;
    st.clip = clip; st.id = id;
    st.mo = D; st.at = D ? sampler(D, body.tpl, mocapShift(id, clip, D, body.tpl, rt, sex)) : null;
    if (o.mocap !== false && clip.frame) prefetchMocap(Object.keys(CLIPS).filter(k => CLIPS[k].frame === clip.frame), sex, body.tpl);   // (the rest of a flow)
    st.prim = new Set(prim ?? o.primary ?? clip.muscles?.primary ?? []); st.sec = new Set(sec ?? o.secondary ?? clip.muscles?.secondary ?? []);
    if (prim) o.primary = prim; if (sec) o.secondary = sec;
    st.view = D && !clip.frame ? frameOf(clip, rt, tagV, { key: 'mo', pts: mocapPts(st.at, D, rt) }) : frameOf(clip, rt, tagV);
    if (!lod) {
      stage.setClip(clip);
      if (!clip.detail) detail.style.display = 'none';
      root.style.aspectRatio = String(st.view.aspect);
      applyLook();
      setTrailPaths();
    } else {
      const a = K.clamp(st.view.aspect, .85, 1.3), px = Math.min(TS.size, Math.round(o.size * Math.min(2, devicePixelRatio || 1)));
      canvas.width = a >= 1 ? px : Math.round(px * a); canvas.height = a >= 1 ? Math.round(px / a) : px;
      canvas.style.cssText = `display:block;margin:0 auto;max-width:${o.size}px`;   // (CSS fits it in its box: object-fit contain)
    }
    root.setAttribute('aria-label', `${clip.name || id} ${D ? 'real motion' : 'animation'}`);
    st.elapsed = 0; st.rate = rateOf(clip);
    draw();
  }
  function setTrailPaths() {
    st.trailOn = false;
    if (lod || !st.trail) { stage.setTrail(null); return; }
    const [a, m] = st.mo ? trailPathsMocap(st.clip, st.mo, st.at, rt, '_v3trailmo_' + sex) : trailPaths(st.clip, rt, sex);
    stage.setTrail(a, m); st.trailOn = !!a;
  }
  function rateOf(clip) {
    const T = st.mo ? st.mo.period : K.period(clip);
    if (st.pace > 0 && clip.counts) return T / (clip.counts * st.pace);
    if (st.fit > 0) return T * Math.max(1, Math.round(st.fit / T)) / st.fit;
    return 1;
  }

  // ---- loop ----
  function loop(ts) {
    st.raf = 0;
    if (!st.playing || !st.visible) return;
    const dt = st.last ? Math.min(100, ts - st.last) : 16;
    st.last = ts; st.elapsed += dt * st.rate;
    if (!st.slow || (st.odd = !st.odd)) draw();
    if (++st.n % 30 === 0 && st.ms.length >= 40) st.slow = api.stats().median > 8;
    st.raf = requestAnimationFrame(loop);
  }
  function kick() {
    if (lod) {
      if (TS.lost) return;
      if (st.playing && st.visible) { TS.playing.add(api); if (!TS.raf) { TS.last = 0; TS.raf = requestAnimationFrame(t => thumbTick(TS, t)); } } else TS.playing.delete(api);
      return;
    }
    if (st.playing && st.visible && !st.raf) { st.last = 0; st.raf = requestAnimationFrame(loop); }
  }
  // drag sideways to look around
  if (!lod) {
    canvas.addEventListener('pointerdown', e => { st.dragging = { x: e.clientX, a: st.drag }; st.dragT = performance.now(); canvas.style.cursor = 'grabbing'; });
    canvas.addEventListener('pointermove', e => { if (!st.dragging) return; st.drag = K.clamp(st.dragging.a - (e.clientX - st.dragging.x) * .45, -150, 150); st.dragT = performance.now(); if (!st.playing) draw(); });
    const end = () => { st.dragging = null; st.dragT = performance.now(); canvas.style.cursor = 'grab'; };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('pointerleave', end);
  }
  function resize() {
    if (lod || !renderer) return;
    const w = Math.max(40, root.clientWidth), h = Math.max(40, root.clientHeight);
    renderer.setSize(w, h, false); draw();
  }
  const ro = !lod && typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; ro && ro.observe(root);
  let io = null;
  if (typeof IntersectionObserver === 'function') { io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; kick(); }); io.observe(root); }

  const api = {
    play() { st.fixedT = null; st.playing = true; kick(); },
    pause() { st.playing = false; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; if (lod) TS.playing.delete(api); },
    setAnim(id, p, s, opts) { st.fixedT = null; setAnim(id, p, s, opts); kick(); },
    destroy() {
      st.dead = true; api.pause(); live.delete(api); io && io.disconnect(); ro && ro.disconnect();
      if (renderer) { stage.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
      root.remove();
    },
    seek(t) { st.fixedT = t; draw(); },
    setTrail(on) { on = !!on && !lod; if (on !== st.trail) { st.trail = on; if (st.clip) { setTrailPaths(); draw(); } } },
    setBreath(on) { on = !!on && !lod; if (on !== st.breath) { st.breath = on; draw(); } },
    setPace(sec, fit) { st.pace = sec > 0 ? sec : null; st.fit = fit > 0 ? fit : null; if (st.clip) st.rate = rateOf(st.clip); },
    setLook(look, skeleton) { st.look = look; if (skeleton !== undefined) o.skeleton = skeleton; applyLook(); draw(); },
    stats() { const a = st.ms.slice().sort((x, y) => x - y); return { median: a[a.length >> 1] || 0, p95: a[Math.floor(a.length * .95)] || 0, n: a.length,
      calls: renderer ? renderer.info.render.calls : TS.renderer.info.render.calls, tris: renderer ? renderer.info.render.triangles : TS.renderer.info.render.triangles }; },
    resetStats() { st.ms.length = 0; },
    orbit(deg) { st.drag = deg; st.dragT = deg ? 1e12 : -1e9; draw(); },   // review pages: look from another side (0 = the clip's view)
    // the WebGL context is gone (GPU reset, too many contexts): the caller swaps in the v2 plate
    _lost() { if (st.lostSent || st.dead) return; st.lostSent = true; st.lost = true; const e = new Error('WebGL context lost'); e.lost = true; setTimeout(() => o.onLost && o.onLost(e), 0); },
    _tick(dt) { if (!st.visible) return; st.elapsed += dt * st.rate; draw(); },
    _theme() { if (!lod) stage.theme(); else for (const s of Object.values(TS.stages)) s.theme(); draw(); },
    get skeleton() { return st.S; },
    get motion() { return st.mo ? 'mocap' : 'bridge'; },   // real motion capture, or the v2 motion on the body
    get look() { return st.look; },
    get svg() { return root; },
    kind: 'v3', lod: !!lod, _ts: TS,
  };
  live.add(api);
  root.ktPlayer = api;                                          // (debugging and the bench page)
  api._st = st;
  setAnim(animId, o.primary, o.secondary, { flow: o.flow, look: o.look, muscles: o.muscles });
  kick();
  return api;
}
