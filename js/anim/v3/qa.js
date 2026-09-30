// Kitaeru animation v3: bridge QA (review page only, not in the app bundle). For every v2 clip, samples the cycle on a
// human body and reports what the eye would catch:
//   nan        any non-finite bone rotation
//   sole       worst gap (cm) between a v2 flat, planted foot and the floor under this body's sole (+ floats, - sinks)
//   palm       worst gap (cm) between a v2 palm planted on the floor and this body's palm (+ floats, - sinks)
//   floor      lowest skin point (cm; a little below 0 is contact, much below is through the floor)
//   slide      worst horizontal travel (cm) of a planted foot's sole between samples (should be ~0)
//   corr       largest root correction (cm) the retarget needed for planted limbs this body could not reach
//   ms         mean retarget time per pose (the v2 pose itself not included)
import * as THREE from '../../vendor/three.module.min.js';
import * as K from '../v2/core.js';
import { instantiate } from './glb.js';

export function qaBody(body) {
  const { tpl, rt } = body;
  const inst = instantiate(tpl, new THREE.MeshBasicMaterial());
  const mesh = inst.mesh, N = tpl.names, pos = tpl.geo.attributes.position, si = tpl.geo.attributes.skinIndex;
  const groups = { soleL: [], soleR: [], palmL: [], palmR: [], all: [] };
  for (let v = 0; v < pos.count; v++) {
    const b = N[si.getX(v)], y = pos.getY(v) * 1e-4;
    if (/^(foot|ball)_l$/.test(b) && y < .03) groups.soleL.push(v);
    if (/^(foot|ball)_r$/.test(b) && y < .03) groups.soleR.push(v);
    if (b === 'hand_l') groups.palmL.push(v);
    if (b === 'hand_r') groups.palmR.push(v);
    if (v % 5 === 0) groups.all.push(v);
  }
  const v3 = new THREE.Vector3();
  const minY = list => { let m = 1e9, at = null, vi = -1; for (const v of list) { mesh.getVertexPosition(v, v3); if (v3.y < m) { m = v3.y; at = v3.clone(); vi = v; } } return { y: m, at, bone: vi >= 0 ? N[si.getX(vi)] : '' }; };
  function apply(o) {
    const b = inst.bones, q = o.q;
    for (let i = 0; i < b.length; i++) b[i].quaternion.set(q[i * 4], q[i * 4 + 1], q[i * 4 + 2], q[i * 4 + 3]);
    b[rt.index.pelvis].position.set(...o.pelvis);
    inst.root.updateMatrixWorld(true);
    mesh.skeleton.update();
  }
  const planted = S => {
    const c = S.src || {}, out = {};
    for (const sd of ['R', 'L']) { const sp = c.arms?.[sd] || c.arms?.both; out[sd] = sp && sp.mode === 'ik' && ['palm', 'forearm', 'bar', 'world'].includes(sp.grip) ? 1 - K.clamp(S.ch['release' + sd] || 0, 0, 1) : K.clamp(S.ch['trace' + sd] || 0, 0, 1); }
    return out;
  };
  return function qaClip(clip, n = 48) {
    const r = { nan: 0, sole: 0, soleAt: 0, palm: 0, palmAt: 0, floor: 1e9, floorAt: 0, slide: 0, corr: 0, ms: 0 };
    const T = K.period(clip);
    let prev = {};
    let tt = 0;
    for (let i = 0; i < n; i++) {
      const S = K.poseAt(clip, i / n * T);
      const legsPlanted = !!(S.src?.legs && Object.values(S.src.legs).some(l => l && l.mode === 'ik'));
      const t0 = performance.now();
      const o = rt.pose(S, { planted: planted(S), legsPlanted });
      tt += performance.now() - t0;
      for (let k = 0; k < o.q.length; k++) if (!Number.isFinite(o.q[k])) r.nan++;
      r.corr = Math.max(r.corr, Math.hypot(...o.corr) * 100 - o.lift * 100);
      apply(o);
      const f = minY(groups.all);
      if (f.y * 100 < r.floor) { r.floor = f.y * 100; r.floorAt = i / n; r.floorBone = f.bone; }
      const cur = {};
      for (const [sd, s] of [['R', 'R'], ['L', 'L']]) {
        const heel = S.pt['heel' + sd], ball = S.pt['ball' + sd];
        if (heel[1] < 1.6 && ball[1] < 1.6 && !(S.ch['footLift' + sd] > .3)) {
          const m = minY(groups['sole' + s]);
          const gap = m.y * 100;
          if (Math.abs(gap) > Math.abs(r.sole)) { r.sole = gap; r.soleAt = i / n; }
          cur[sd] = m.at;
          if (prev[sd]) r.slide = Math.max(r.slide, Math.hypot(m.at.x - prev[sd].x, m.at.z - prev[sd].z) * 100);
        }
        const hd = S.F['hand' + sd];
        if (hd.grip === 'palm' && S.pt['palm' + sd][1] < 4 && !(S.ch['release' + sd] > .05)) {
          const m = minY(groups['palm' + s]);
          const want = Math.max(0, S.pt['palm' + sd][1] - 2.4) * rt.s;         // the floor under that palm
          const gap = (m.y - want) * 100;
          if (Math.abs(gap) > Math.abs(r.palm)) { r.palm = gap; r.palmAt = i / n; }
        }
      }
      prev = cur;
    }
    r.ms = tt / n;
    return r;
  };
}
