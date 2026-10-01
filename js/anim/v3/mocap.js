// Kitaeru animation v3: real motion (motion capture) for the human body.
// Clips are made offline (assets/v3/pipeline/mocap_clips.py) from open mocap data (CMU, HDM05: assets/v3/LICENSES.md) and
// stored per body as assets/v3/mocap/<id>.<f|m>.kclip.json (kclip v2: int16 quaternions of the driven bones + pelvis).
// MOCAP_CLIPS (mocap-index.js, written by the pipeline) says which app clip ids have one. Nothing here is fetched at start:
// a clip is fetched the first time it is shown (body-player.js / skeleton.js call ensureMocap), decoded once per body and
// kept for the session; sw.js keeps the files in a long-lived cache for offline use.
//   ensureMocap(id, sex, tpl) -> Promise<bool>   (true: ready; false: none for this id, or it failed: use the v2 bridge)
//   mocapClip(id, sex)        -> decoded clip or null (synchronous, once ensureMocap resolved true)
//   sampler(D, tpl)           -> at(t) => { q, pelvis, P, G } (the same shape as retarget.js pose())
import { MOCAP_CLIPS } from './mocap-index.js';

export { MOCAP_CLIPS };
export const MOCAP_DIR = new URL('../../../assets/v3/mocap/', import.meta.url).href;
export const mocapUrl = (id, sex) => `${MOCAP_DIR}${id}.${sex === 'm' ? 'm' : 'f'}.kclip.json`;
export const hasMocap = id => Object.prototype.hasOwnProperty.call(MOCAP_CLIPS, id);

const decoded = new Map();      // `${id}.${sex}` -> decoded clip
const pending = new Map();      // `${id}.${sex}` -> Promise<bool>
const failed = new Set();       // ids whose file did not load (this session: the v2 bridge plays them)
let fetchImpl = (u) => fetch(u);
/** tests only: replace fetch (e.g. to make a clip fail), and forget what was loaded */
export function _mocapTest({ fetch: f, reset } = {}) { if (f) fetchImpl = f; if (reset) { decoded.clear(); pending.clear(); failed.clear(); } }

const key = (id, sex) => `${id}.${sex === 'm' ? 'm' : 'f'}`;
/** loaded (true), failed or none (false), or still unknown (null) */
export function mocapState(id, sex) {
  if (!hasMocap(id) || failed.has(key(id, sex))) return false;
  return decoded.has(key(id, sex)) ? true : null;
}
export const mocapClip = (id, sex) => decoded.get(key(id, sex)) || null;

/** fetch + decode one clip for this body (tpl from glb.js). Never rejects: false means "play the v2 bridge". */
export function ensureMocap(id, sex, tpl) {
  const k = key(id, sex);
  if (!hasMocap(id) || failed.has(k)) return Promise.resolve(false);
  if (decoded.has(k)) return Promise.resolve(true);
  if (!pending.has(k)) {
    pending.set(k, fetchImpl(mocapUrl(id, sex)).then(r => { if (!r.ok) throw new Error(`mocap ${id}: ${r.status}`); return r.json(); })
      .then(j => { decoded.set(k, decode(j, tpl)); return true; })
      .catch(e => { console.warn('mocap clip unavailable, using the v2 bridge', id, e); failed.add(k); return false; })
      .finally(() => pending.delete(k)));
  }
  return pending.get(k);
}
/** fetch (not decode) a few clips ahead, e.g. the rest of a flow's steps: the browser / service worker caches them */
export function prefetchMocap(ids, sex, tpl) { for (const id of ids) if (hasMocap(id) && mocapState(id, sex) === null) ensureMocap(id, sex, tpl); }

function i16(b64) {
  const s = atob(b64), n = s.length, u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = s.charCodeAt(i);
  return new Int16Array(u.buffer, 0, n >> 1);
}
// kclip v2 -> per-frame local quaternions for EVERY bone of this body (identity / fixed / track) + pelvis local position
export function decode(k, tpl) {
  if (k.v !== 2 || k.rig !== 'makehuman-ge') throw new Error('mocap: not a kclip v2 for this rig');
  const N = tpl.names.length, F = k.frames, B = k.bones.length, q = i16(k.q), t = i16(k.t);
  if (q.length !== F * B * 3 || t.length !== F * 3) throw new Error('mocap: truncated clip');
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
    const shp = tr.map(([, n]) => Object.entries(k.fingers.shapes[n] || {}).filter(([b]) => b.endsWith('_' + sd)).map(([b, qq]) => [tpl.names.indexOf(b), qq]).filter(([i]) => i >= 0));
    fg.sides.push({ t: tr.map(([tt]) => tt), shp });
  }
  return { Q, T, F, N, fps: k.fps, period: F / k.fps, loop: k.loop !== false, fg, swapAt: k.swapAt || 0, dipWrap: !!k.dipWrap, name: k.name || k.id,
    align: k.align || null, id: k.id };
}
function applyFingers(fg, t, q) {
  for (const sd of fg.sides) {
    if (!sd.t.length) continue;
    let j = 0; while (j + 1 < sd.t.length && sd.t[j + 1] <= t) j++;
    const cur = sd.shp[j], prev = j > 0 ? sd.shp[j - 1] : cur;
    let w = Math.min(1, Math.max(0, (t - sd.t[j]) / fg.fade)); w = w * w * (3 - 2 * w);
    for (let n = 0; n < cur.length; n++) {
      const a = prev[n] && prev[n][0] === cur[n][0] ? prev[n][1] : cur[n][1], b = cur[n][1], o = cur[n][0] * 4;
      let d = 0; for (let c = 0; c < 4; c++) d += a[c] * b[c];
      const sg = d < 0 ? -1 : 1; let l = 0;
      for (let c = 0; c < 4; c++) { q[o + c] = a[c] * (1 - w) + sg * b[c] * w; l += q[o + c] * q[o + c]; }
      l = 1 / Math.sqrt(l || 1); for (let c = 0; c < 4; c++) q[o + c] *= l;
    }
  }
}

// ---- quaternion / FK kit (flat arrays) ----
export function qmul(a, ao, b, bo, out, oo) {
  const ax = a[ao], ay = a[ao + 1], az = a[ao + 2], aw = a[ao + 3], bx = b[bo], by = b[bo + 1], bz = b[bo + 2], bw = b[bo + 3];
  out[oo] = aw * bx + ax * bw + ay * bz - az * by; out[oo + 1] = aw * by - ax * bz + ay * bw + az * bx;
  out[oo + 2] = aw * bz + ax * by - ay * bx + az * bw; out[oo + 3] = aw * bw - ax * bx - ay * by - az * bz;
}
export function qrot(q, o, v) {   // rotate v by quaternion q[o..o+3]
  const x = q[o], y = q[o + 1], z = q[o + 2], w = q[o + 3];
  const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}
// quaternion -> row-major 3x3 (retarget.js / core.js layout)
export function qmat(q, o) {
  const x = q[o], y = q[o + 1], z = q[o + 2], w = q[o + 3];
  return [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
}
/** forward kinematics from local quaternions q (per bone) and the pelvis local position: world quats W, heads P, matrices G */
export function fkPose(tpl, q, pel, out) {
  const N = tpl.names.length, pi = out.pi;
  const W = out.W, P = out.P, G = out.G;
  for (let i = 0; i < N; i++) {
    const p = tpl.parent[i];
    if (p < 0) { W.set(q.subarray(i * 4, i * 4 + 4), i * 4); P[i] = tpl.bones[i].t.slice(); }
    else {
      qmul(W, p * 4, q, i * 4, W, i * 4);
      const off = i === pi ? pel : tpl.bones[i].t, r = qrot(W, p * 4, off);
      P[i] = [P[p][0] + r[0], P[p][1] + r[1], P[p][2] + r[2]];
    }
    G[i] = qmat(W, i * 4);
  }
  return out;
}
export function poseBuffer(tpl) {
  const N = tpl.names.length;
  return { q: new Float32Array(N * 4), W: new Float32Array(N * 4), P: new Array(N), G: new Array(N), pelvis: [0, 0, 0], pi: tpl.names.indexOf('pelvis') };
}

/** sample clip time t (s) into a pose { q (local, per bone), pelvis (local), P (world heads), G (world 3x3), W } */
export function sampler(D, tpl, shift = [0, 0, 0]) {
  const N = D.N, o = poseBuffer(tpl), q = o.q, pel = o.pelvis;
  return function at(t) {
    let x = t * D.fps;
    if (D.loop) x = ((x % D.F) + D.F) % D.F; else x = Math.max(0, Math.min(D.F - 1, x));
    const i0 = Math.floor(x), i1 = D.loop ? (i0 + 1) % D.F : Math.min(D.F - 1, i0 + 1), u = x - i0;
    const a = i0 * N * 4, b = i1 * N * 4;
    for (let i = 0; i < N; i++) {   // nlerp (neighbouring frames)
      const oo = i * 4;
      let d = 0; for (let c = 0; c < 4; c++) d += D.Q[a + oo + c] * D.Q[b + oo + c];
      const s = d < 0 ? -1 : 1;
      let n = 0;
      for (let c = 0; c < 4; c++) { const v = D.Q[a + oo + c] * (1 - u) + s * D.Q[b + oo + c] * u; q[oo + c] = v; n += v * v; }
      n = 1 / Math.sqrt(n || 1); for (let c = 0; c < 4; c++) q[oo + c] *= n;
    }
    for (let c = 0; c < 3; c++) pel[c] = D.T[i0 * 3 + c] * (1 - u) + D.T[i1 * 3 + c] * u + shift[c];
    if (D.fg) applyFingers(D.fg, x / D.fps, q);
    return fkPose(tpl, q, pel, o);
  };
}
