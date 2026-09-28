// Kitaeru animation v2, Direction B: procedural 3D anatomical skeleton rendered with three.js (vendored, MIT).
// Same motion core (core.js) and bone shapes (anatomy.js) as Direction A. Every bone is a static procedural mesh
// attached to a frame that the rig updates each frame; muscles are dynamic tubes that thicken as they shorten.
import * as THREE from '../../vendor/three.module.min.js';
import * as K from './core.js';
import { PROFILE, BLOBS, handShape, PELVIS, STERNUM, vertebraShape, SKULL, PALM, FOOT_BODY, TOES } from './anatomy.js';
import { CLIPS } from './clips.js';

// ---------------------------------------------------------------------------------------------------------------
// geometry helpers (all in cm, local to a frame: x anterior, y along / up, z lateral)
// ---------------------------------------------------------------------------------------------------------------
const SIDES = 12;
// elliptic tube through rows [cx, cy, cz, rA (along axA), rB (along axB)] with per-row axes (defaults x / z)
function tubeGeom(rows, sides = SIDES, axA = [1, 0, 0], axB = [0, 0, 1]) {
  const n = rows.length, pos = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) {
    const [cx, cy, cz, ra, rb, A = axA, B = axB] = rows[i];
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2, c = Math.cos(a) * ra, s = Math.sin(a) * rb;
      pos.push(cx + A[0] * c + B[0] * s, cy + A[1] * c + B[1] * s, cz + A[2] * c + B[2] * s);
      uv.push(j / sides, i / (n - 1));
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) {
    const a = i * (sides + 1) + j, b = a + sides + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // end caps
  const cap = (i, flip) => {
    const c = pos.length / 3, r = rows[i]; pos.push(r[0], r[1], r[2]); uv.push(.5, i / (n - 1));
    for (let j = 0; j < sides; j++) { const a = i * (sides + 1) + j; flip ? idx.push(c, a + 1, a) : idx.push(c, a, a + 1); }
  };
  cap(0, false); cap(n - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function profileGeom(prof, L) { return tubeGeom(prof.map(([u, oa, ol, ra, rl]) => [oa, u * L, ol, ra, rl])); }
function ellGeom(c, r, rot = 0, seg = 18) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * .7));
  const m = new THREE.Matrix4().makeTranslation(c[0], c[1], c[2]).multiply(new THREE.Matrix4().makeRotationZ(rot * Math.PI / 180)).multiply(new THREE.Matrix4().makeScale(r[0], r[1], r[2]));
  g.applyMatrix4(m); return g;
}
function segGeom(a, b, r, sides = 8) {
  const d = K.sub(b, a), L = K.len(d) || 1e-3;
  const g = new THREE.CylinderGeometry(r * .85, r, L, sides, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...K.mul(d, 1 / L)));
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...K.lerp3(a, b, .5)), q, new THREE.Vector3(1, 1, 1)));
  const s1 = new THREE.SphereGeometry(r, 8, 6); s1.translate(...b);
  return merge([g, s1]);
}
function curveGeom(pts, ra, rb = ra, sides = 8) {       // tube along a polyline, cross-section frame from the tangent
  const rows = [];
  for (let i = 0; i < pts.length; i++) {
    const t = K.nrm(K.sub(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)]));
    const A = K.perp(Math.abs(t[1]) > .9 ? [1, 0, 0] : [0, 1, 0], t), B = K.nrm(K.cross(t, A));
    const f = typeof ra === 'function' ? ra(i / (pts.length - 1)) : ra;
    rows.push([...pts[i], f, typeof rb === 'function' ? rb(i / (pts.length - 1)) : rb, A, B]);
  }
  return tubeGeom(rows, sides);
}
function fanGeom(pts, bulge = [0, 0, 0]) {             // closed outline -> fan from the (pushed) centroid, double sided
  const c = pts.reduce((a, p) => K.add(a, p), [0, 0, 0]).map(v => v / pts.length);
  const cc = K.add(c, bulge), pos = [...cc], idx = [];
  const n = pts.length, sm = [];
  for (let i = 0; i < n; i++) {                        // smooth the outline (Catmull-Rom, 3 sub-steps)
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < 3; k++) {
      const t = k / 3, t2 = t * t, t3 = t2 * t;
      sm.push([0, 1, 2].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  for (const p of sm) pos.push(...p);
  for (let i = 0; i < sm.length; i++) idx.push(0, 1 + i, 1 + (i + 1) % sm.length);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function merge(list) {
  const pos = [], nor = [], uv = [];
  for (let g of list) {
    g = g.index ? g.toNonIndexed() : g;
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    if (g.attributes.uv) uv.push(...g.attributes.uv.array); else for (let i = 0; i < g.attributes.position.count; i++) uv.push(0, 0);
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return m;
}
const mirrorZ = g => { const m = g.clone(); m.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, -1)); const i = m.index; if (i) { const a = i.array; for (let k = 0; k < a.length; k += 3) { const t = a[k + 1]; a[k + 1] = a[k + 2]; a[k + 2] = t; } } m.computeVertexNormals(); return m; };

// fibre striation texture for muscles (procedural)
function fibreTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const g = c.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, 64, 256);
  for (let x = 0; x < 64; x += 2) { g.fillStyle = `rgba(0,0,0,${.18 + .22 * Math.abs(Math.sin(x * 1.7))})`; g.fillRect(x, 0, 1, 256); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 1);
  return t;
}

// ---------------------------------------------------------------------------------------------------------------
const css = (name, fb) => { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fb; };

export function createThreePlayer(container, animId, { primary, secondary, size = 320, playing = true, trail = false, breath = false } = {}) {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wrap = document.createElement('div'); wrap.style.cssText = `position:relative;width:100%;max-width:${size}px;aspect-ratio:1/1;margin:0 auto`;
  container.appendChild(wrap);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement; canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;cursor:grab';
  wrap.appendChild(canvas);
  const ring = document.createElement('div');
  ring.style.cssText = 'position:absolute;right:10px;top:10px;width:28px;height:28px;border-radius:50%;border:1.5px solid var(--accent-2,#D9A441);display:none;place-items:center';
  ring.innerHTML = '<div style="width:100%;height:100%;border-radius:50%;background:var(--accent-2,#D9A441);opacity:.3;transform-origin:center"></div>';
  wrap.appendChild(ring);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 5, 2000);
  scene.add(new THREE.HemisphereLight(0xfff6ea, 0x7d7263, 1.25));
  const key = new THREE.DirectionalLight(0xfff1e0, 2.2); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0005; key.shadow.normalBias = .6; key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, near: 10, far: 700 });
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xdfe8ff, .8); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.ShadowMaterial({ opacity: .2 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const M = {
    bone: new THREE.MeshStandardMaterial({ color: 0xeee4cf, roughness: .62, metalness: 0 }),
    boneDS: new THREE.MeshStandardMaterial({ color: 0xe9dfc8, roughness: .7, side: THREE.DoubleSide }),
    cart: new THREE.MeshStandardMaterial({ color: 0xc9d6d4, roughness: .45 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3b312a, roughness: .9 }),
    teeth: new THREE.MeshStandardMaterial({ color: 0xf6f0e0, roughness: .35 }),
    prop: new THREE.MeshStandardMaterial({ color: 0x8a8274, roughness: .4, metalness: .5 }),
  };
  const fib = fibreTexture();
  M.mp = new THREE.MeshStandardMaterial({ color: 0xc8372d, roughness: .48, bumpMap: fib, bumpScale: 1.2 });
  M.ms = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: .5, bumpMap: fib, bumpScale: 1.2 });
  function refreshTheme() {
    M.mp.color.set(css('--muscle-primary', '#C8372D')); M.ms.color.set(css('--muscle-secondary', '#D9A441'));
    const dark = new THREE.Color(css('--bg', '#F5F1E8')).getHSL({}).l < .3;
    M.bone.color.set(dark ? 0xd8cdb6 : 0xeee4cf); M.boneDS.color.set(dark ? 0xd0c5ad : 0xe9dfc8);
    floor.material.opacity = dark ? .45 : .2;
    draw();
  }

  // ---------- skeleton meshes ----------
  const root = new THREE.Group(); scene.add(root);
  const nodes = [];                                       // { obj, frame: S => frame, scale?: S => [sx,sy,sz] }
  const add = (geom, mat, frame, opt = {}) => {
    const m = new THREE.Mesh(geom, mat); m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false;
    root.add(m); nodes.push({ obj: m, frame, ...opt }); return m;
  };
  const merged = parts => merge(parts);
  for (const [sd, s] of K.SIDES) {
    const ms = g => (s < 0 ? g : g);                       // sided frames already mirror via z = lateral
    add(merged([profileGeom(PROFILE.humerus, 30), ...BLOBS.filter(b => b[0] === 'humerus').map(b => ellGeom(b[1], b[2]))]), M.bone, S => S.F['humerus' + sd]);
    add(merged([profileGeom(PROFILE.ulna, 25), profileGeom(PROFILE.radius, 25)]), M.bone, S => S.F['fore' + sd]);
    add(merged([profileGeom(PROFILE.femur, 44), ...BLOBS.filter(b => b[0] === 'femur').map(b => ellGeom(b[1], b[2]))]), M.bone, S => S.F['femur' + sd]);
    add(merged([profileGeom(PROFILE.tibia, 42), profileGeom(PROFILE.fibula, 42)]), M.bone, S => S.F['tibia' + sd]);
    add(tubeGeom(FOOT_BODY.map(([x, y, z, ru, rl]) => [x, y, z, ru, rl]), SIDES, [0, 1, 0], [0, 0, 1]), M.bone, S => S.F['foot' + sd]);
    add(tubeGeom(TOES.map(([x, y, z, ru, rl]) => [x, y + .45, z, ru, rl]), SIDES, [0, 1, 0], [0, 0, 1]), M.bone, S => toeFrame(S, sd));
    add(ellGeom([0, 0, 0], [1.1, 2.3, 2.1]), M.bone, S => ({ ...S.F['femur' + sd], o: S.pt['patella' + sd] }));
    // scapula: blade + spine + glenoid
    add(merged([fanGeom(K.SCAP.outline, [-.6, 0, 0]), curveGeom(K.SCAP.spine.map(p => [p[0] - .8, p[1], p[2]]), .7), curveGeom(K.SCAP.coracoid, .55), ellGeom(K.SCAP.glenoid, [.9, 1.9, .7])]), M.boneDS, S => S.F['scapula' + sd]);
    // clavicle: unit cylinder stretched between its ends
    add(new THREE.CylinderGeometry(.62, .75, 1, 10).translate(0, .5, 0), M.bone, S => segFrame(S.pt['clavSternal' + sd], S.pt['acromion' + sd], S.F.T4.x), { stretch: S => K.len(K.sub(S.pt['acromion' + sd], S.pt['clavSternal' + sd])) });
    // ribs (bone + cartilage) in the rib frames
    for (let k = 1; k <= 12; k++) {
      const cart = K.ribCartilage(k), n = 16, bone = [], car = [];
      for (let i = 0; i <= n; i++) { const f = i / n, p = K.ribPoint(k, s, f, .5); if (f <= cart + 1e-6) bone.push(p); if (f >= cart - 1 / n) car.push(p); }
      const r = k < 3 ? .5 : k > 10 ? .42 : .6;
      const sc = S => { const e = 1 + .03 * (S.breath - .5); return [e, 1, e]; };
      add(curveGeom(bone, u => r * (.75 + .35 * Math.sin(Math.PI * Math.min(1, u * 1.2))), u => r * 1.6, 7), M.bone, S => S.rib[k], { scale: sc });
      if (cart < 1 && car.length > 1) add(curveGeom(car, r * .8, r * 1.1, 6), M.cart, S => S.rib[k], { scale: sc });
    }
    // pelvis halves
    const mz = p => [p[0], p[1], p[2] * s];
    const ilium = fanGeom(PELVIS.ilium.map(mz), [0, 0, -1.8 * s]);
    const ringG = fanGeom(PELVIS.ring.map(mz), [0, 0, -.4 * s]);
    add(merged([ilium, ringG, ellGeom(mz(PELVIS.acetabulum.c), [2.6, 2.6, .9])]), M.boneDS, S => S.F.pelvis);
    add(fanGeom(PELVIS.obturator.map(p => mz([p[0], p[1], p[2] + .15]))), M.dark, S => S.F.pelvis);
    // hand: rebuilt when the clip changes (finger curl / grip)
    const hm = add(new THREE.BufferGeometry(), M.bone, S => S.F['hand' + sd]); hm.userData.hand = sd;
    void ms;
  }
  add(tubeGeom(PELVIS.sacrum.map(([x, y, z, ra, rl]) => [x, y, z, ra, rl])), M.bone, S => S.F.pelvis);
  add(tubeGeom(STERNUM.map(([y, ra, rl]) => [0, y, 0, ra, rl])), M.bone, S => S.F.sternum);
  for (let i = 0; i < K.SPINE.length; i++) {
    const v = K.SPINE[i], sh = vertebraShape(v);
    const body = new THREE.CylinderGeometry(1, 1, 2 * sh.body.r[1], 14); body.applyMatrix4(new THREE.Matrix4().makeScale(sh.body.r[0], 1, sh.body.r[2])); body.translate(...sh.body.c);
    const sp = curveGeom(sh.spinous, u => sh.spR[1] * (1 - .6 * u), u => sh.spR[0] * (1 - .5 * u), 6);
    const tr = [segGeom(sh.trans[0], sh.trans[1], v.reg === 'L' ? .45 : .3, 6), segGeom(sh.trans[0], [sh.trans[1][0], sh.trans[1][1], -sh.trans[1][2]], v.reg === 'L' ? .45 : .3, 6)];
    add(merged([body, sp, ...tr]), M.bone, S => S.vert[i]);
  }
  // skull (3D primitives from anatomy.SKULL)
  const skullParts = { head: [], jaw: [], dark: [], teeth: [] };
  for (const it of SKULL) for (const s of it.sym ? [1, -1] : [1]) {
    const mz = p => [p[0], p[1], p[2] * s];
    if (it.t === 'ell') (it.dark ? skullParts.dark : skullParts[it.f]).push(ellGeom(mz(it.c), it.r, it.rot || 0, it.main ? 28 : 14));
    else if (it.t === 'tube') skullParts[it.f].push(curveGeom(it.pts.map(mz), it.r[0], it.r[1], 8));
    else if (it.t === 'teeth') skullParts.teeth.push({ f: it.f, g: curveGeom(it.pts.map(mz), it.r * .9, it.r * 1.1, 6) });
  }
  add(merge(skullParts.head), M.bone, S => S.F.head);
  add(merge(skullParts.jaw), M.bone, S => S.F.jaw);
  add(merge(skullParts.dark.map(g => g)), M.dark, S => S.F.head);
  add(merge(skullParts.teeth.filter(t => t.f === 'head').map(t => t.g)), M.teeth, S => S.F.head);
  add(merge(skullParts.teeth.filter(t => t.f === 'jaw').map(t => t.g)), M.teeth, S => S.F.jaw);
  // pull-up bar
  const bar = new THREE.Group(); scene.add(bar);

  function toeFrame(S, sd) {
    const ft = S.F['foot' + sd];
    if (ft.toeFlat) return K.frameR(S.pt['ball' + sd], ft.toeFlat);
    return { ...ft, o: K.P(ft, [14.2, -7.1, 0]) };
  }
  function segFrame(a, b, ref) { const y = K.nrm(K.sub(b, a)), x = K.perp(ref, y), z = K.cross(x, y); return { o: a, x, y, z }; }

  // ---------- muscles ----------
  const RINGS = 13, MS = 10;
  const muscleMeshes = new Map();
  function muscleMesh(key, prim) {
    let m = muscleMeshes.get(key);
    if (!m) {
      const rows = []; for (let i = 0; i < RINGS; i++) rows.push([0, i, 0, 1, 1]);
      const g = tubeGeom(rows, MS);
      m = new THREE.Mesh(g, prim ? M.mp : M.ms); m.castShadow = true; m.frustumCulled = false;
      scene.add(m); muscleMeshes.set(key, m);
    }
    m.material = prim ? M.mp : M.ms; m.visible = true;
    return m;
  }
  function updateMuscles(S) {
    for (const m of muscleMeshes.values()) m.visible = false;
    for (const stn of K.strands(S, st.groups)) {
      const prim = st.prim.has(stn.group), m = muscleMesh(stn.key, prim);
      const pts = K.strandCurve(stn, RINGS - 1), L = K.curveLen(pts), k = K.bulge(L, st.avg[stn.key] || L);
      const out0 = stn.via ? K.sub(stn.via, K.lerp3(stn.o, stn.e, .5)) : [0, 1, 0];
      const P = m.geometry.attributes.position.array;
      let o = 0;
      for (let i = 0; i < RINGS; i++) {
        const t = K.nrm(K.sub(pts[Math.min(RINGS - 1, i + 1)], pts[Math.max(0, i - 1)]));
        let a = K.madd(out0, t, -K.dot(out0, t)); if (K.len(a) < 1e-4) a = K.perp([0, 1, 0], t); a = K.nrm(a);
        const b = K.nrm(K.cross(t, a)), pr = K.bellyProfile(i / (RINGS - 1), stn);
        const ra = .15 + stn.th * pr * k, rb = .22 + stn.w * pr * Math.sqrt(k), c = pts[i];
        for (let j = 0; j <= MS; j++) {
          const ang = j / MS * Math.PI * 2, ca = Math.cos(ang) * ra, sa = Math.sin(ang) * rb;
          P[o++] = c[0] + a[0] * ca + b[0] * sa; P[o++] = c[1] + a[1] * ca + b[1] * sa; P[o++] = c[2] + a[2] * ca + b[2] * sa;
        }
      }
      for (const [ri, cp] of [[0, pts[0]], [RINGS - 1, pts[RINGS - 1]]]) { void ri; P[o++] = cp[0]; P[o++] = cp[1]; P[o++] = cp[2]; }
      m.geometry.attributes.position.needsUpdate = true;
      m.geometry.computeVertexNormals();
    }
  }

  // ---------- trail ----------
  const trailGroup = new THREE.Group(); scene.add(trailGroup);
  const trailMat = new THREE.LineDashedMaterial({ color: 0xd9a441, dashSize: 1.2, gapSize: 1.6, transparent: true, opacity: .9 });
  const cometMat = new THREE.MeshBasicMaterial({ color: 0xc8372d });
  const comets = [];

  // ---------- state ----------
  const st = { clip: null, playing: playing && !reduce, visible: true, elapsed: 0, last: 0, raf: 0, fixedT: null, trail, breath,
    prim: new Set(), sec: new Set(), groups: new Set(), avg: {}, ms: [], target: [0, 90, 0], dist: 400, drag: { az: 0, el: 0, t: -1e9 } };
  const mat4 = new THREE.Matrix4();
  function setMatrix(obj, F, sc) {
    const sx = sc ? sc[0] : 1, sy = sc ? sc[1] : 1, sz = sc ? sc[2] : 1;
    mat4.set(F.x[0] * sx, F.y[0] * sy, F.z[0] * sz, F.o[0], F.x[1] * sx, F.y[1] * sy, F.z[1] * sz, F.o[1], F.x[2] * sx, F.y[2] * sy, F.z[2] * sz, F.o[2], 0, 0, 0, 1);
    obj.matrix.copy(mat4); obj.matrixWorldNeedsUpdate = true;
  }

  function draw() {
    if (!st.clip) return;
    const t0 = performance.now();
    const clip = st.clip, T = K.period(clip);
    const tn = st.fixedT != null ? st.fixedT : (!st.playing && st.elapsed === 0 ? (clip.still ?? .45) : (st.elapsed / 1000 % T) / T);
    const S = K.poseAt(clip, tn * T);
    for (const n of nodes) {
      const F = n.frame(S); if (!F) continue;
      const sc = n.stretch ? [1, n.stretch(S), 1] : n.scale ? n.scale(S) : null;
      setMatrix(n.obj, F, sc);
    }
    updateMuscles(S);
    // camera: slow orbit around the clip's base view, plus drag
    const now = st.elapsed / 1000, idle = Math.min(1, Math.max(0, (performance.now() - st.drag.t - 2500) / 2500));
    if (idle >= 1 && !st.dragging) { st.drag.az *= .985; st.drag.el *= .985; }
    const az = (clip.cam.az + (reduce ? 0 : 16 * Math.sin(now * 2 * Math.PI / 20)) * idle + st.drag.az) * K.DEG;
    const el = (Math.max(-5, Math.min(60, clip.cam.el + 6 + st.drag.el))) * K.DEG;
    const c = [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)];
    camera.position.set(st.target[0] + c[0] * st.dist, st.target[1] + c[1] * st.dist, st.target[2] + c[2] * st.dist);
    camera.lookAt(st.target[0], st.target[1], st.target[2]);
    key.position.set(st.target[0] + 60 + c[2] * 40, st.target[1] + 260, st.target[2] + 120 + c[0] * 30); key.target.position.set(st.target[0], 0, st.target[2]);
    rim.position.set(st.target[0] - c[0] * 200, st.target[1] + 80, st.target[2] - c[2] * 200);
    // trail comet
    if (st.trail && st.trailPts) {
      comets.forEach((m, i) => { const P = st.trailPts[m.userData.name], n = P.length - 1, w = ((tn * n - i % 6 * 1.1) % n + n) % n, k = Math.floor(w); m.position.set(...K.lerp3(P[k], P[k + 1], w - k)); m.scale.setScalar(1 - (i % 6) * .14); });
    }
    if (st.breath) { ring.style.display = 'grid'; ring.firstChild.style.transform = `scale(${(.35 + .65 * S.breath).toFixed(3)})`; } else ring.style.display = 'none';
    renderer.render(scene, camera);
    st.ms.push(performance.now() - t0); if (st.ms.length > 120) st.ms.shift();
    st.S = S;
  }

  function setAnim(id, prim = primary, sec = secondary) {
    const clip = CLIPS[id] || CLIPS.push_up; st.clip = clip;
    st.prim = new Set(prim ?? clip.muscles.primary); st.sec = new Set(sec ?? clip.muscles.secondary); st.groups = new Set([...st.prim, ...st.sec]);
    const an = K.analyse(clip, st.groups, clip.trail || []); st.avg = an.avg;
    // hands for this clip's grip
    const S0 = K.poseAt(clip, 0);
    for (const n of nodes) if (n.obj.userData.hand) {
      const H = S0.F['hand' + n.obj.userData.hand], hs = handShape(H.fingers, H.grip);
      n.obj.geometry.dispose();
      n.obj.geometry = merge([tubeGeom(PALM.map(([y, ra, rl]) => [0, y, 0, ra, rl])), ...hs.segs.map(([a, b, r]) => segGeom(a, b, r * 1.1, 6))]);
    }
    // bar
    bar.clear();
    if (clip.bar) {
      const b = clip.bar, g = new THREE.CylinderGeometry(1.6, 1.6, 2 * b.w + 10, 20); g.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(g, M.prop); m.position.set(0, b.y, 0); m.castShadow = true; bar.add(m);
      for (const z of [-b.w - 5, b.w + 5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 16, 12), M.prop); p.position.set(0, b.y + 8, z); bar.add(p); }
    }
    // framing: bounding sphere of the whole cycle
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    const T = K.period(clip);
    for (let i = 0; i < 12; i++) { const S = K.poseAt(clip, i / 12 * T); for (const p of [...Object.values(S.pt), K.P(S.F.head, [1, 17, 0])]) { lo = lo.map((v, j) => Math.min(v, p[j])); hi = hi.map((v, j) => Math.max(v, p[j])); } }
    if (clip.bar) hi[1] = Math.max(hi[1], clip.bar.y + 4);
    st.target = K.lerp3(lo, hi, .5);
    const rad = K.len(K.sub(hi, lo)) / 2 + 6;
    st.dist = rad / Math.sin(camera.fov / 2 * K.DEG) * .92;
    floor.position.set(st.target[0], 0, st.target[2]); floor.visible = true;
    // trail
    trailGroup.clear(); comets.length = 0; st.trailPts = an.trail;
    for (const name in an.trail) {
      const geo = new THREE.BufferGeometry().setFromPoints(an.trail[name].map(p => new THREE.Vector3(...p)));
      const line = new THREE.Line(geo, trailMat); line.computeLineDistances(); trailGroup.add(line);
      for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.9, 10, 8), cometMat); m.userData.name = name; comets.push(m); trailGroup.add(m); }
    }
    comets.forEach((m, i) => { m.userData.name = Object.keys(an.trail)[Math.floor(i / 6)]; });
    trailGroup.visible = st.trail;
    st.elapsed = 0;
    draw();
  }

  function resize() {
    const w = Math.max(50, wrap.clientWidth), h = Math.max(50, wrap.clientHeight);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); draw();
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; ro && ro.observe(wrap);

  // drag to rotate
  canvas.addEventListener('pointerdown', e => { st.dragging = { x: e.clientX, y: e.clientY, az: st.drag.az, el: st.drag.el }; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', e => { if (!st.dragging) return; st.drag.az = st.dragging.az - (e.clientX - st.dragging.x) * .5; st.drag.el = st.dragging.el + (e.clientY - st.dragging.y) * .3; st.drag.t = performance.now(); if (!st.playing) draw(); });
  const end = () => { st.dragging = null; st.drag.t = performance.now(); canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  function loop(ts) {
    st.raf = 0;
    if (!st.playing || !st.visible) return;
    const dt = st.last ? Math.min(100, ts - st.last) : 16;
    st.last = ts; st.elapsed += dt;
    draw();
    st.raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (st.playing && st.visible && !st.raf) { st.last = 0; st.raf = requestAnimationFrame(loop); } };
  let io = null;
  if (typeof IntersectionObserver === 'function') { io = new IntersectionObserver(es => { for (const e of es) st.visible = e.isIntersecting; kick(); }); io.observe(wrap); }
  setAnim(animId, primary, secondary);
  refreshTheme();
  resize();
  kick();

  const api = {
    play() { st.fixedT = null; st.playing = true; kick(); },
    pause() { st.playing = false; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; },
    setAnim(id, p, s) { st.fixedT = null; setAnim(id, p, s); kick(); },
    destroy() { api.pause(); io && io.disconnect(); ro && ro.disconnect(); renderer.dispose(); wrap.remove(); },
    seek(t) { st.fixedT = t; draw(); },
    setTrail(on) { st.trail = on; trailGroup.visible = on; draw(); }, setBreath(on) { st.breath = on; draw(); },
    refreshTheme,
    hiRes(px) { if (px) { renderer.setSize(px, px, false); camera.aspect = 1; camera.updateProjectionMatrix(); } else resize(); },
    stats() { const a = st.ms.slice().sort((x, y) => x - y); return { median: a[a.length >> 1] || 0, p95: a[Math.floor(a.length * .95)] || 0, n: a.length, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; },
    get skeleton() { return st.S; },
    canvas,
  };
  return api;
}
