// Kitaeru animation v3, REVIEW PILOT: the human body played from a real motion-capture clip (assets/v3/mocap/<id>.<f|m>.kclip.json,
// made offline by assets/v3/pipeline/mocap_pilot.py) instead of the live v2 bridge. A sibling of body-player.js: the same
// stage (stage.js: looks, muscles, skeleton inside, contact shadow, floor mat, theme) and the same framing rules (the v2
// clip's camera, the box of the whole cycle), so a mocap clip and the current animation can be compared side by side.
// Not used by the app: only anim-review.html imports it (dynamically), and nothing here is in sw.js.
//   createMocapPlayer(container, id, { sex, look, skeleton, muscles, primary, secondary, size, playing, cam, floor })
//   -> { ready (Promise), play, pause, seek(0..1), destroy, setLook, stats, svg, period, meta }
import * as THREE from '../../vendor/three.module.min.js';
import { ensureBody } from './body-player.js';
import { createStage, viewDir } from './stage.js';

export const MOCAP_DIR = new URL('../../../assets/v3/mocap/', import.meta.url).href;
const files = new Map();                                       // url -> Promise<kclip json>
function fetchJson(url) {
  if (!files.has(url)) {
    const p = fetch(url).then(r => { if (!r.ok) throw new Error(`mocap ${url}: ${r.status}`); return r.json(); });
    p.catch(() => files.delete(url));
    files.set(url, p);
  }
  return files.get(url);
}
/** the pilot's index: { clips: { id: { name, period, source, licence, note, steps, qa } }, credit } */
export const loadMocapIndex = () => fetchJson(MOCAP_DIR + 'index.json');
export const mocapUrl = (id, sex) => `${MOCAP_DIR}${id}.${sex === 'm' ? 'm' : 'f'}.kclip.json`;

function i16(b64) {
  const s = atob(b64), n = s.length, u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = s.charCodeAt(i);
  return new Int16Array(u.buffer, 0, n >> 1);
}
// kclip v2 -> per-frame local quaternions for EVERY bone of this body (identity / fixed / track) + pelvis local position
function decode(k, tpl) {
  const N = tpl.names.length, F = k.frames, B = k.bones.length, q = i16(k.q), t = i16(k.t);
  const Q = new Float32Array(F * N * 4), T = new Float32Array(F * 3);
  const base = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) base[i * 4 + 3] = 1;
  for (const [b, v] of Object.entries(k.fixed || {})) { const i = tpl.names.indexOf(b); if (i >= 0) base.set(v, i * 4); }
  const idx = k.bones.map(b => tpl.names.indexOf(b));
  for (let f = 0; f < F; f++) {
    Q.set(base, f * N * 4);
    for (let j = 0; j < B; j++) {
      const i = idx[j]; if (i < 0) continue;
      const o = (f * B + j) * 3, x = q[o] * k.qScale, y = q[o + 1] * k.qScale, z = q[o + 2] * k.qScale, d = (f * N + i) * 4;
      Q[d] = x; Q[d + 1] = y; Q[d + 2] = z; Q[d + 3] = Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z));
    }
    for (let c = 0; c < 3; c++) T[f * 3 + c] = t[f * 3 + c] * k.tScale;
  }
  // finger shapes (offline: relaxed / palm / prayer per hand over time), cross-faded by the sampler
  const fg = k.fingers && k.fingers.track ? { fade: k.fingers.fade || .25, sides: [] } : null;
  if (fg) for (const sd of ['l', 'r']) {
    const tr = k.fingers.track[sd] || [];
    const shp = tr.map(([, n]) => Object.entries(k.fingers.shapes[n] || {}).filter(([b]) => b.endsWith('_' + sd)).map(([b, q]) => [tpl.names.indexOf(b), q]).filter(([i]) => i >= 0));
    fg.sides.push({ t: tr.map(([t]) => t), shp });
  }
  return { Q, T, F, N, fps: k.fps, period: F / k.fps, loop: k.loop !== false, fg };
}
function applyFingers(fg, t, q) {
  for (const sd of fg.sides) {
    if (!sd.t.length) continue;
    let j = 0; while (j + 1 < sd.t.length && sd.t[j + 1] <= t) j++;
    const cur = sd.shp[j], prev = j > 0 ? sd.shp[j - 1] : cur;
    let w = Math.min(1, Math.max(0, (t - sd.t[j]) / fg.fade)); w = w * w * (3 - 2 * w);
    for (let n = 0; n < cur.length; n++) {
      const [i, a] = prev[n] && prev[n][0] === cur[n][0] ? prev[n] : cur[n], b = cur[n][1], o = cur[n][0] * 4;
      let d = 0; for (let c = 0; c < 4; c++) d += a[c] * b[c];
      const sg = d < 0 ? -1 : 1; let l = 0;
      for (let c = 0; c < 4; c++) { q[o + c] = a[c] * (1 - w) + sg * b[c] * w; l += q[o + c] * q[o + c]; }
      l = 1 / Math.sqrt(l || 1); for (let c = 0; c < 4; c++) q[o + c] *= l;
      void i;
    }
  }
}

// ---- tiny quaternion / FK kit (arrays) ----
function qmul(a, ao, b, bo, out, oo) {
  const ax = a[ao], ay = a[ao + 1], az = a[ao + 2], aw = a[ao + 3], bx = b[bo], by = b[bo + 1], bz = b[bo + 2], bw = b[bo + 3];
  out[oo] = aw * bx + ax * bw + ay * bz - az * by; out[oo + 1] = aw * by - ax * bz + ay * bw + az * bx;
  out[oo + 2] = aw * bz + ax * by - ay * bx + az * bw; out[oo + 3] = aw * bw - ax * bx - ay * by - az * bz;
}
function qrot(q, o, v) {   // rotate v by quaternion q[o..o+3]
  const x = q[o], y = q[o + 1], z = q[o + 2], w = q[o + 3];
  const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}

/** sample frame time t (s) into a pose { q (local, per bone), pelvis (local), P (world heads) } */
function sampler(D, tpl) {
  const N = D.N, q = new Float32Array(N * 4), W = new Float32Array(N * 4), P = new Array(N), pel = [0, 0, 0];
  const pi = tpl.names.indexOf('pelvis');
  return function at(t) {
    let x = t * D.fps;
    if (D.loop) x = ((x % D.F) + D.F) % D.F; else x = Math.max(0, Math.min(D.F - 1, x));
    const i0 = Math.floor(x), i1 = D.loop ? (i0 + 1) % D.F : Math.min(D.F - 1, i0 + 1), u = x - i0;
    const a = i0 * N * 4, b = i1 * N * 4;
    for (let i = 0; i < N; i++) {   // nlerp (neighbouring frames)
      const o = i * 4;
      let d = 0; for (let c = 0; c < 4; c++) d += D.Q[a + o + c] * D.Q[b + o + c];
      const s = d < 0 ? -1 : 1;
      let n = 0;
      for (let c = 0; c < 4; c++) { const v = D.Q[a + o + c] * (1 - u) + s * D.Q[b + o + c] * u; q[o + c] = v; n += v * v; }
      n = 1 / Math.sqrt(n || 1); for (let c = 0; c < 4; c++) q[o + c] *= n;
    }
    for (let c = 0; c < 3; c++) pel[c] = D.T[i0 * 3 + c] * (1 - u) + D.T[i1 * 3 + c] * u;
    if (D.fg) applyFingers(D.fg, x / D.fps, q);
    // world heads (rest rotations are identity: local offset = rest translation)
    for (let i = 0; i < N; i++) {
      const p = tpl.parent[i];
      if (p < 0) { W.set(q.subarray(i * 4, i * 4 + 4), i * 4); P[i] = tpl.bones[i].t.slice(); continue; }
      qmul(W, p * 4, q, i * 4, W, i * 4);
      const off = i === pi ? pel : tpl.bones[i].t, r = qrot(W, p * 4, off);
      P[i] = [P[p][0] + r[0], P[p][1] + r[1], P[p][2] + r[2]];
    }
    return { q, pelvis: pel, P, W };
  };
}

// framing: the box of the whole cycle seen from the v2 clip's camera (as body-player.js frameOf)
function frameOf(at, D, tpl, cam) {
  const c = viewDir(cam || { az: 30, el: 6 });
  const r = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), c).normalize(), u = new THREE.Vector3().crossVectors(c, r);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, d0 = 1e9, d1 = -1e9;
  const v = new THREE.Vector3();
  const inc = (p, pad) => { v.set(p[0], p[1], p[2]); const x = v.dot(r), y = v.dot(u), d = v.dot(c);
    x0 = Math.min(x0, x - pad); x1 = Math.max(x1, x + pad); y0 = Math.min(y0, y - pad); y1 = Math.max(y1, y + pad); d0 = Math.min(d0, d); d1 = Math.max(d1, d); };
  const hi = tpl.names.indexOf('head'), mids = ['middle_01_l', 'middle_01_r'].map(n => tpl.names.indexOf(n));
  const n = Math.max(24, Math.min(96, Math.round(D.period * 6)));
  for (let i = 0; i < n; i++) {
    const o = at(i / n * D.period);
    for (const p of o.P) inc(p, .085);
    const top = qrot(o.W, hi * 4, [0, .2, 0]); inc([o.P[hi][0] + top[0], o.P[hi][1] + top[1], o.P[hi][2] + top[2]], .03);
    for (const m of mids) inc(o.P[m], .05);
  }
  inc([0, 0, 0], .02);
  const w = x1 - x0, h = y1 - y0;
  const target = r.clone().multiplyScalar((x0 + x1) / 2).addScaledVector(u, (y0 + y1) / 2).addScaledVector(c, (d0 + d1) / 2);
  return { c, target, w: w * 1.04, h: h * 1.04, depth: (d1 - d0) / 2, aspect: Math.max(.85, Math.min(1.5, w / h)) };
}

const live = new Set();
let watching = false;
function watchTheme() {
  if (watching || typeof MutationObserver !== 'function') return;
  watching = true;
  const again = () => requestAnimationFrame(() => { for (const p of live) p._theme(); });
  new MutationObserver(again).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', again); } catch { /* old Safari */ }
}

// thumbnails (size < 160 px) share one renderer and paint into their own 2D canvases, as body-player.js does
let TH = null;
function thumbShared() {
  if (TH) return TH;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0); renderer.setSize(320, 320, false);
  TH = { renderer, size: 320 };
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); TH = null; });
  return TH;
}

/**
 * @param container element to append to
 * @param id        the app clip id (assets/v3/mocap/<id>.<sex>.kclip.json must exist)
 * @param opt       { sex 'f'|'m', look 'xray'|'solid', skeleton, muscles, primary, secondary, size, playing, cam {az, el}, floor, onReady }
 */
export function createMocapPlayer(container, id, opt = {}) {
  const o = { sex: 'f', look: 'xray', skeleton: false, muscles: true, primary: [], secondary: [], size: 320, playing: true, cam: null, floor: false, ...opt };
  const sex = o.sex === 'm' ? 'm' : 'f', lod = o.size < 160 ? 1 : 0;
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const st = { playing: o.playing && !reduce, fixedT: null, elapsed: 0, last: 0, raf: 0, dead: false, ms: [], op: 1, D: null, at: null, view: null, meta: null };
  let root, canvas, renderer = null, ctx2d = null, stage = null;
  if (lod) {
    root = canvas = document.createElement('canvas'); canvas.className = 'kt-v3 lod mocap'; ctx2d = canvas.getContext('2d');
  } else {
    root = document.createElement('div');
    root.className = 'kt-v3 mocap'; root.setAttribute('role', 'img');
    root.style.cssText = `position:relative;width:100%;max-width:${o.size}px;margin:0 auto;aspect-ratio:1`;
  }
  container.appendChild(root);
  watchTheme();

  function applyLook() {
    if (!stage) return;
    stage.setLook(o.look, o.look !== 'solid' && !!o.skeleton);
    const m = o.muscles !== false && o.look !== 'solid';
    stage.setMuscles(m ? o.primary || [] : [], m ? o.secondary || [] : []);
  }
  function draw() {
    if (!st.D || st.dead) return;
    const t0 = performance.now(), D = st.D;
    const tn = st.fixedT != null ? st.fixedT : (st.elapsed / 1000 / D.period) % 1;
    const pose = st.at(tn * D.period);
    if (lod) { applyLook(); }
    stage.applyPose(pose, null);
    // a side change inside the clip (mirrored second half): dip through the paper, as v2 swap clips do
    let op = 1;
    const sw = st.meta.swapAt, wrap = !!st.meta.dipWrap;
    if (sw || wrap) {
      const ts = tn * D.period, d = Math.min(sw ? Math.abs(ts - sw) : 1e9, wrap ? ts : 1e9, wrap ? D.period - ts : 1e9);
      const u = Math.min(1, d / .35); op = .15 + .85 * u * u * (3 - 2 * u);
    }
    const opv = Math.round(op * 20) / 20;
    if (lod) {
      const S = TH || thumbShared(), w = canvas.width, h = canvas.height;
      stage.place(st.view, w / h);
      S.renderer.setViewport(0, 0, w, h); S.renderer.render(stage.scene, stage.camera);
      ctx2d.clearRect(0, 0, w, h); ctx2d.globalAlpha = opv; ctx2d.drawImage(S.renderer.domElement, 0, S.size - h, w, h, 0, 0, w, h);
    } else {
      const w = root.clientWidth || o.size, h = root.clientHeight || w / st.view.aspect;
      stage.place(st.view, w / h);
      renderer.render(stage.scene, stage.camera);
      if (st.op !== opv) { st.op = opv; root.style.opacity = opv >= 1 ? '' : opv; }
    }
    st.ms.push(performance.now() - t0); if (st.ms.length > 120) st.ms.shift();
  }
  function loop(ts) {
    st.raf = 0;
    if (!st.playing || st.dead) return;
    const dt = st.last ? Math.min(100, ts - st.last) : 16;
    st.last = ts; st.elapsed += dt;
    draw();
    st.raf = requestAnimationFrame(loop);
  }
  function kick() { if (st.playing && !st.raf && st.D && !st.dead) { st.last = 0; st.raf = requestAnimationFrame(loop); } }
  function resize() {
    if (lod || !renderer) return;
    renderer.setSize(Math.max(40, root.clientWidth), Math.max(40, root.clientHeight), false); draw();
  }
  let ro = null;

  const ready = Promise.all([ensureBody(sex), fetchJson(mocapUrl(id, sex))]).then(([body, k]) => {
    if (st.dead) return api;
    const { tpl, rt } = body;
    st.meta = k; st.D = decode(k, tpl); st.at = sampler(st.D, tpl);
    stage = createStage(tpl, rt, { lod });
    stage.theme();
    stage.setClip({ floor: !!o.floor, props: [] });
    st.view = frameOf(st.at, st.D, tpl, o.cam);
    if (lod) {
      const a = Math.max(.85, Math.min(1.3, st.view.aspect)), px = Math.min(320, Math.round(o.size * Math.min(2, devicePixelRatio || 1)));
      canvas.width = a >= 1 ? px : Math.round(px * a); canvas.height = a >= 1 ? Math.round(px / a) : px;
      canvas.style.cssText = `display:block;margin:0 auto;max-width:${o.size}px`;
    } else {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
      canvas = renderer.domElement;
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
      root.appendChild(canvas);
      root.style.aspectRatio = String(st.view.aspect);
      canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); st.lost = true; });
      ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; ro && ro.observe(root);
      renderer.setSize(Math.max(40, root.clientWidth || o.size), Math.max(40, root.clientHeight || o.size / st.view.aspect), false);
    }
    root.setAttribute('aria-label', `${k.name || id}: real motion capture`);
    applyLook();
    draw(); kick();
    o.onReady && o.onReady(api);
    return api;
  });
  ready.catch(e => console.warn('mocap player', id, e));

  const api = {
    ready,
    play() { st.fixedT = null; st.playing = true; kick(); },
    pause() { st.playing = false; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; },
    seek(t) { st.fixedT = Math.max(0, Math.min(1, t)); if (st.D && t >= 1) st.fixedT = 1 - 1e-6; draw(); },
    /** restart the clock (synchronised starts) */
    restart() { st.elapsed = 0; st.last = 0; st.fixedT = null; draw(); },
    setLook(look, skeleton) { o.look = look; if (skeleton !== undefined) o.skeleton = skeleton; applyLook(); draw(); },
    setMuscles(p, s) { o.primary = p || []; o.secondary = s || []; applyLook(); draw(); },
    stats() { const a = st.ms.slice().sort((x, y) => x - y); return { median: a[a.length >> 1] || 0, p95: a[Math.floor(a.length * .95)] || 0, n: a.length }; },
    destroy() {
      st.dead = true; api.pause(); live.delete(api); ro && ro.disconnect();
      if (renderer) { stage && stage.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
      root.remove();
    },
    _theme() { if (stage) { stage.theme(); draw(); } },
    get period() { return st.D ? st.D.period : 0; },
    get meta() { return st.meta; },
    get svg() { return root; },
    kind: 'mocap', lod: !!lod,
  };
  live.add(api);
  root.ktPlayer = api;
  return api;
}
