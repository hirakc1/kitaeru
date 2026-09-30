// Kitaeru animation v3: one 3D stage = scene + camera + one posable human body + the clip's props, floor, trail.
// Used by the big player (its own WebGL canvas) and by the thumbnail painter (one shared renderer for every thumbnail).
import * as THREE from '../../vendor/three.module.min.js';
import * as K from '../v2/core.js';
import { instantiate } from './glb.js';
import { createLooks } from './look.js';
import { buildSkeleton } from './bones.js';

const FOV = 22;

function blobTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  r.addColorStop(0, 'rgba(0,0,0,.5)'); r.addColorStop(.55, 'rgba(0,0,0,.2)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.fill();
  return new THREE.CanvasTexture(c);
}
let BLOB = null, DOT = null;

/**
 * @param tpl  body template (glb.js), rt: retargeter for it (retarget.js)
 * @param opt  { lod: 0 | 1 } 1 = thumbnail (no trail, no grid)
 */
export function createStage(tpl, rt, opt = {}) {
  const lod = opt.lod || 0;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, .05, 60);
  const looks = createLooks(lod);
  const inst = instantiate(tpl, looks.solid);
  scene.add(inst.root);
  const bodyDepth = new THREE.SkinnedMesh(tpl.geo, looks.depth);
  bodyDepth.frustumCulled = false; inst.root.add(bodyDepth); bodyDepth.bind(inst.skeleton, new THREE.Matrix4());
  let skel = null;                                              // built on first use (about 35 ms)
  inst.mesh.renderOrder = 2; bodyDepth.renderOrder = 1;
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x8a8070, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-1, 3, 2); scene.add(sun);
  // contact shadow
  BLOB = BLOB || blobTexture(); DOT = DOT || dotTexture();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: BLOB, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = -2; scene.add(shadow);
  // floor mat for floor clips
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xe3dccb, transparent: true, opacity: .35, depthWrite: false }));
  mat.rotation.x = -Math.PI / 2; mat.position.y = -.001; mat.renderOrder = -3; scene.add(mat);
  const props = new THREE.Group(), propsM = new THREE.Group(); scene.add(props, propsM);
  const trail = new THREE.Group(); scene.add(trail);
  const grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x6b665c, transparent: true, opacity: .25 }));
  grid.visible = false; scene.add(grid);
  const band = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xd9a441 }));
  band.visible = false; scene.add(band);

  const st = { look: 'xray', skeleton: false, dark: false, clip: null, bands: [], view: null, trailPts: null, trailPtsM: null, comets: null };

  function setLook(look, skeletonOn) {
    st.look = look === 'solid' ? 'solid' : 'xray'; st.skeleton = !!skeletonOn;
    const see = st.look === 'xray';
    inst.mesh.material = see ? looks.xray : looks.solid;
    bodyDepth.visible = see;
    if (see && st.skeleton && !skel) {
      // (built on the rest pose: reset the bones first; the next draw poses them again)
      inst.bones.forEach((b, i) => { b.quaternion.identity(); b.position.fromArray(tpl.bones[i].t); });
      inst.root.updateMatrixWorld(true);
      skel = buildSkeleton(inst.mesh, looks.bone);
      skel.renderOrder = 0; inst.root.add(skel);
    }
    if (skel) skel.visible = see && st.skeleton;
    looks.core(see && st.skeleton);
  }
  const setMuscles = (p, s) => looks.muscles(p, s);
  function theme() {
    st.dark = looks.theme();
    shadow.material.opacity = st.dark ? .95 : .7;
    mat.material.color.set(st.dark ? 0x2e2b27 : 0xe3dccb); mat.material.opacity = st.dark ? .5 : .35;
    grid.material.color.set(st.dark ? 0xa39d90 : 0x6b665c);
    for (const m of trail.children) if (m.userData.kind) m.material.color.set(m.userData.kind === 'comet' ? (st.dark ? 0xe0503f : 0xc8372d) : (st.dark ? 0xe3b45a : 0xd9a441));
  }

  // ---- props (v2 world, cm -> this body's metres) ----
  const T = p => new THREE.Vector3(...rt.toRig(p));
  function buildProps(list, group) {
    group.clear();
    for (const p of list) {
      let m = null;
      if (p.t === 'box') {
        const a = T(p.a), b = T(p.b), sz = b.clone().sub(a);
        m = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(sz.x), Math.abs(sz.y), Math.abs(sz.z)), looks.prop);
        m.position.copy(a.add(b).multiplyScalar(.5));
      } else if (p.t === 'tube') {
        const g = new THREE.Group();
        for (let i = 1; i < p.pts.length; i++) g.add(cyl(T(p.pts[i - 1]), T(p.pts[i]), p.r * rt.s));
        m = g;
      } else if (p.t === 'ring') {
        m = new THREE.Mesh(new THREE.TorusGeometry(p.r * rt.s, .012, 8, 32), looks.prop);
        m.position.copy(T(p.c));
        const n = new THREE.Vector3(-p.n[2], p.n[1], p.n[0]).normalize();
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      } else if (p.t === 'band') st.bands.push({ p, group });
      if (m) group.add(m);
    }
  }
  function cyl(a, b, r) {
    const d = b.clone().sub(a), L = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 12), looks.prop);
    m.position.copy(a).add(b).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function buildBar(b, group) {
    const y = b.y, x = b.x || 0;
    group.add(cyl(T([x, y, -b.w - 5]), T([x, y, b.w + 5]), 1.6 * rt.s));
    if (b.posts !== 'down') for (const z of [-b.w - 5, b.w + 5]) group.add(cyl(T([x, y - 1, z]), T([x, y + 16, z]), 1.4 * rt.s));
    else for (const z of [-b.w - 5, b.w + 5]) group.add(cyl(T([x, 0, z]), T([x, y + 1, z]), 1.6 * rt.s));
  }

  // ---- clip ----
  function setClip(clip, S0, opts = {}) {
    st.clip = clip; st.bands = [];
    const list = (typeof clip.props === 'function' ? clip.props(clip) : clip.props) || [];
    buildProps(list, props);
    if (clip.bar) buildBar(clip.bar, props);
    const fz = v => (typeof v === 'function' ? v : [v[0], v[1], -v[2]]);
    const mirrorList = clip.swap && !clip.keepArms ? list.map(p => ({ ...p, ...(p.a ? { a: fz(p.a) } : {}),
      ...(p.b && p.t === 'box' ? { a: [p.a[0], p.a[1], -p.b[2]], b: [p.b[0], p.b[1], -p.a[2]] } : p.b ? { b: fz(p.b) } : {}),
      ...(p.pts ? { pts: p.pts.map(fz) } : {}), ...(p.c ? { c: fz(p.c) } : {}), ...(p.n ? { n: fz(p.n) } : {}) })) : null;
    if (mirrorList) { const keep = st.bands; st.bands = []; buildProps(mirrorList, propsM); st.bandsM = st.bands; st.bands = keep; } else { propsM.clear(); st.bandsM = null; }
    propsM.visible = false;
    mat.visible = !!clip.floor && !clip.travel && !clip.grid;
    grid.visible = !lod && !!(clip.travel || clip.grid);
    if (grid.visible) buildGrid();
    st.trailOn = false;
    void S0; void opts;
  }
  function buildGrid() {
    const pts = [], step = 25 * rt.s, e = .018;
    for (let i = -12; i <= 12; i++) for (let j = -10; j <= 10; j++) {
      const x = i * step, z = j * step;
      pts.push(x - e, .001, z, x + e, .001, z, x, .001, z - e, x, .001, z + e);
    }
    grid.geometry.dispose(); grid.geometry = new THREE.BufferGeometry(); grid.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    grid.userData.step = step;
  }
  // trail: pts in world (rig) space, already in the camera's frame for travelling clips; mirrored copy for swap clips
  function setTrail(paths, pathsM) {
    trail.clear(); st.trailPts = paths; st.trailPtsM = pathsM; st.comets = [];
    if (!paths) return;
    for (const [name, P] of Object.entries(paths)) {
      const mk = (pts, kind) => {
        const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
        const m = new THREE.Points(g, new THREE.PointsMaterial({ size: kind === 'comet' ? 4 : 2.2, sizeAttenuation: false, map: DOT, transparent: true, alphaTest: .2,
          color: kind === 'comet' ? 0xc8372d : 0xd9a441, depthWrite: false, opacity: kind === 'comet' ? .7 : .5 }));
        m.userData.kind = kind; m.userData.name = name; m.renderOrder = 5; trail.add(m); return m;
      };
      const path = mk(dotsAlong(P, .022), 'path'); path.userData.P = P;
      const comet = mk(new Array(6).fill(P[0]), 'comet'); comet.userData.P = P;
      if (pathsM && pathsM[name]) { path.userData.PM = pathsM[name]; path.userData.dotsM = dotsAlong(pathsM[name], .022); path.userData.dots = dotsAlong(P, .022); comet.userData.PM = pathsM[name]; }
      st.comets.push(comet);
    }
    theme();
  }
  function dotsAlong(P, gap) {
    const out = [];
    let acc = 0;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      while (acc <= L) { const u = acc / (L || 1); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]); acc += gap; }
      acc -= L;
    }
    return out.length ? out : P.slice();
  }
  // tn: 0..1 of the cycle; second: in the mirrored half of a swap clip (u: progress within that half)
  function updateTrail(u, second, off) {
    trail.position.copy(off);
    for (const m of trail.children) {
      const d = m.userData;
      if (d.kind === 'path' && d.PM) {
        const want = second ? 'M' : '';
        if (d.side !== want) { d.side = want; m.geometry.setFromPoints((second ? d.dotsM : d.dots).map(p => new THREE.Vector3(...p))); }
      }
      if (d.kind !== 'comet') continue;
      const P = second && d.PM ? d.PM : d.P, n = P.length - 1, i = u * n, a = m.geometry.attributes.position;
      for (let j = 0; j < 6; j++) {
        const w = ((i - j * 1.1) % n + n) % n, k = Math.floor(w), f = w - k, p = P[k], q = P[Math.min(n, k + 1)];
        a.setXYZ(j, p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f);
      }
      a.needsUpdate = true;
    }
  }

  // ---- pose ----
  const v3 = new THREE.Vector3();
  function applyPose(o, S) {
    const b = inst.bones, q = o.q;
    for (let i = 0; i < b.length; i++) b[i].quaternion.set(q[i * 4], q[i * 4 + 1], q[i * 4 + 2], q[i * 4 + 3]);
    const pi = rt.index.pelvis;
    b[pi].position.set(o.pelvis[0], o.pelvis[1], o.pelvis[2]);
    // contact shadow: under the body's low points, stretched along the body when it lies down
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const n of ['foot_l', 'foot_r', 'ball_l', 'ball_r', 'hand_l', 'hand_r', 'pelvis', 'head', 'calf_l', 'calf_r']) {
      const p = o.P[rt.index[n]]; if (!p) continue;
      const wgt = n === 'pelvis' || n === 'head' ? (p[1] < .4 ? 1 : 0) : 1;
      if (!wgt || p[1] > .7) continue;
      x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]);
    }
    if (x0 > x1) { const p = o.P[pi]; x0 = x1 = p[0]; z0 = z1 = p[2]; }
    shadow.position.set((x0 + x1) / 2, .001, (z0 + z1) / 2);
    shadow.scale.set(Math.max(.45, x1 - x0 + .3), Math.max(.4, z1 - z0 + .3), 1);
    // bands follow the body (v2 points, mapped)
    const bl = st.second && st.bandsM ? st.bandsM : st.bands;
    band.visible = bl.length > 0;
    if (bl.length) {
      const p = bl[0].p, at = v => (typeof v === 'function' ? v(S) : v);
      const a = T(at(p.a)), c = T(at(p.b)), pos = band.geometry.attributes.position;
      pos.setXYZ(0, a.x, a.y, a.z); pos.setXYZ(1, c.x, c.y, c.z); pos.needsUpdate = true;
    }
    void v3;
  }
  function showMirrored(second) { st.second = second; if (propsM.children.length) { propsM.visible = second; props.visible = !second; } }
  function follow(offRig) {
    if (grid.visible) {
      const s = grid.userData.step;
      grid.position.set(Math.round(offRig.x / s) * s, 0, Math.round(offRig.z / s) * s);
    }
  }

  // ---- camera ----
  // view = { c: unit vector target -> camera (rig space), target: Vector3, dist } from frame()
  function place(view, aspect, off = new THREE.Vector3()) {
    const t = view.target.clone().add(off);
    const tanV = Math.tan(FOV / 2 * Math.PI / 180), tanH = tanV * aspect;
    const dist = Math.max(view.h / 2 / tanV, view.w / 2 / tanH) + view.depth * .6;
    camera.aspect = aspect; camera.near = Math.max(.05, dist - 4); camera.far = dist + 6;
    camera.position.copy(t).addScaledVector(view.c, dist);
    camera.up.set(0, 1, 0);
    camera.lookAt(t);
    camera.updateProjectionMatrix();
  }

  return { scene, camera, inst, looks, setLook, setMuscles, theme, setClip, setTrail, updateTrail, applyPose, showMirrored, follow, place,
    dispose() { looks.dispose(); scene.traverse(o => { if (o.geometry && o.geometry !== tpl.geo) o.geometry.dispose(); }); },
    get skel() { return skel; } };
}

/** Camera direction for a v2 clip camera (az, el in degrees; v2 axes) in rig space. */
export function viewDir(cam) {
  const a = cam.az * K.DEG, e = cam.el * K.DEG;
  const c = [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)];   // v2: x fwd, y up, z right
  return new THREE.Vector3(-c[2], c[1], c[0]);
}
