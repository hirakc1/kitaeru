// Kitaeru animation v3: an anatomical skeleton that rides inside the rigged body.
// Bone shapes are reused from v2 (js/anim/v2/anatomy.js: long-bone profiles, skull, pelvis, vertebrae, hands, feet);
// ribs are procedural. Everything is placed on the rig's rest (bind) pose and merged into ONE rigidly skinned mesh
// (each vertex 100 % on one rig bone), so the whole skeleton costs a single draw call and follows the mocap for free.
import * as THREE from '../../vendor/three.module.min.js';
import { PROFILE, BLOBS, SKULL, PELVIS, STERNUM, PALM, FOOT_BODY, TOES, handShape, vertebraShape } from '../v2/anatomy.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SIDES = 10;

// ---- small geometry kit (same conventions as v2 three-player.js: rows [cx, cy, cz, rA, rB, axA?, axB?]) ----
function tube(rows, sides = SIDES, axA = [1, 0, 0], axB = [0, 0, 1]) {
  const n = rows.length, pos = [], idx = [];
  for (let i = 0; i < n; i++) {
    const [cx, cy, cz, ra, rb, A = axA, B = axB] = rows[i];
    for (let j = 0; j <= sides; j++) {
      const a = j / sides * Math.PI * 2, c = Math.cos(a) * ra, s = Math.sin(a) * rb;
      pos.push(cx + A[0] * c + B[0] * s, cy + A[1] * c + B[1] * s, cz + A[2] * c + B[2] * s);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < sides; j++) {
    const a = i * (sides + 1) + j, b = a + sides + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const cap = (i, flip) => {
    const c = pos.length / 3, r = rows[i]; pos.push(r[0], r[1], r[2]);
    for (let j = 0; j < sides; j++) { const a = i * (sides + 1) + j; flip ? idx.push(c, a + 1, a) : idx.push(c, a, a + 1); }
  };
  cap(0, false); cap(n - 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}
const profile = (prof, L) => tube(prof.map(([u, oa, ol, ra, rl]) => [oa, u * L, ol, ra, rl]));
function ell(c, r, rot = 0, seg = 14) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * .7));
  g.applyMatrix4(new THREE.Matrix4().makeTranslation(c[0], c[1], c[2]).multiply(new THREE.Matrix4().makeRotationZ(rot * Math.PI / 180)).multiply(new THREE.Matrix4().makeScale(r[0], r[1], r[2])));
  return g;
}
function curve(pts, ra, rb = ra, sides = 7) {
  const rows = [];
  for (let i = 0; i < pts.length; i++) {
    const t = V(...pts[Math.min(pts.length - 1, i + 1)]).sub(V(...pts[Math.max(0, i - 1)])).normalize();
    const ref = Math.abs(t.y) > .9 ? V(1, 0, 0) : V(0, 1, 0);
    const A = ref.clone().sub(t.clone().multiplyScalar(ref.dot(t))).normalize(), B = t.clone().cross(A).normalize();
    const u = i / (pts.length - 1);
    rows.push([...pts[i], typeof ra === 'function' ? ra(u) : ra, typeof rb === 'function' ? rb(u) : rb, A.toArray(), B.toArray()]);
  }
  return tube(rows, sides);
}
function seg(a, b, r, sides = 6) {
  const d = V(...b).sub(V(...a)), L = d.length() || 1e-3;
  const g = new THREE.CylinderGeometry(r * .85, r, L, sides, 1);
  g.applyMatrix4(new THREE.Matrix4().compose(V(...a).add(V(...b)).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1)));
  return g;
}
function fan(pts, bulge = [0, 0, 0]) {
  const n = pts.length, c = [0, 0, 0];
  for (const p of pts) for (let k = 0; k < 3; k++) c[k] += p[k] / n;
  const pos = [c[0] + bulge[0], c[1] + bulge[1], c[2] + bulge[2]], idx = [];
  for (const p of pts) pos.push(...p);
  for (let i = 0; i < n; i++) idx.push(0, 1 + i, 1 + (i + 1) % n, 0, 1 + (i + 1) % n, 1 + i);   // double sided
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}

/**
 * Build the skeleton for a rig in its bind pose.
 * @param {THREE.SkinnedMesh} body  the rigged body (its skeleton must be in the rest pose)
 * @param {THREE.Material} material
 * @returns {THREE.SkinnedMesh}
 */
export function buildSkeleton(body, material) {
  const bones = body.skeleton.bones, bi = {};
  bones.forEach((b, i) => { bi[b.name] = i; });
  // rig names: Quaternius (pilot) 'Head'; MakeHuman game-engine rig (app) 'head'
  if (bi.Head == null && bi.head != null) bi.Head = bi.head;
  body.updateMatrixWorld(true);
  const P = n => bones[bi[n]].getWorldPosition(new THREE.Vector3());
  // back of the torso on the midline at height y (so the spinal column sits under the skin of the back for any body)
  const bp = body.geometry.attributes.position, qs = bp.array instanceof Int16Array || bp.data?.array instanceof Int16Array ? 1e-4 : 1;
  const backAt = y => { let z = 1e9; for (let i = 0; i < bp.count; i++) { const x = bp.getX(i) * qs, yy = bp.getY(i) * qs; if (Math.abs(x) < .012 && Math.abs(yy - y) < .012) z = Math.min(z, bp.getZ(i) * qs); } return z; };
  const MH = bi.index_01_l != null && bi.head != null && bi.Head === bi.head;
  const parts = [];                                 // { g, bone }
  // place geometry given in a v2 frame (cm): x, y, z axes (world, unit), origin (world, m), extra uniform scale
  const put = (g, bone, o, x, y, z, k = 1) => {
    const m = new THREE.Matrix4().makeBasis(x.clone().multiplyScalar(.01 * k), y.clone().multiplyScalar(.01 * k), z.clone().multiplyScalar(.01 * k));
    m.setPosition(o);
    g.applyMatrix4(m); parts.push({ g, bone });
  };
  const perpTo = (v, axis) => v.clone().sub(axis.clone().multiplyScalar(v.dot(axis))).normalize();
  const FWD = V(0, 0, 1), UP = V(0, 1, 0);
  const hipC = P('thigh_l').add(P('thigh_r')).multiplyScalar(.5);
  const hipHalf = P('thigh_l').sub(P('thigh_r')).length() / 2;          // m
  const shHalf = P('upperarm_l').sub(P('upperarm_r')).length() / 2;

  for (const [s, sx] of [['l', 1], ['r', -1]]) {
    const out = V(sx, 0, 0);
    // arms (T-pose, palms down): anterior = +Z, "lateral" of the abducted humerus = up
    const sh = P('upperarm_' + s), el = P('lowerarm_' + s), wr = P('hand_' + s), mid = P('middle_01_' + s);
    let y = el.clone().sub(sh), L = y.length() * 100; y.normalize();
    let x = perpTo(FWD, y), z = perpTo(UP, y);
    put(profile(PROFILE.humerus, L), 'upperarm_' + s, sh, x, y, z);
    for (const b of BLOBS.filter(b => b[0] === 'humerus')) put(ell(b[1], b[2]), 'upperarm_' + s, sh, x, y, z);
    y = wr.clone().sub(el); L = y.length() * 100; y.normalize(); x = perpTo(FWD, y); z = perpTo(UP, y);
    put(profile(PROFILE.ulna, L), 'lowerarm_' + s, el, x, y, z);
    put(profile(PROFILE.radius, L), 'lowerarm_' + s, el, x, y, z);
    // hand: x palmar (down), y along, z thumb side (+Z); MakeHuman's A-pose: from the finger bases (palms face the thighs)
    y = mid.clone().sub(wr).normalize(); x = perpTo(V(0, -1, 0), y); z = perpTo(FWD, y);
    if (MH) {
      const across = P('index_01_' + s).sub(P('pinky_01_' + s));
      x = perpTo(mid.clone().sub(wr).cross(across).multiplyScalar(sx), y); z = perpTo(across, y);
    }
    const hk = mid.distanceTo(wr) * 100 / 9.4;
    put(tube(PALM.map(([yy, ra, rl]) => [0, yy, 0, ra, rl])), 'hand_' + s, wr, x, y, z, hk);
    for (const [a, b, r] of handShape(12, 'free').segs) put(seg(a, b, r * 1.1), 'hand_' + s, wr, x, y, z, hk);
    // legs: anterior +Z, lateral = outward
    const hp = P('thigh_' + s), kn = P('calf_' + s), an = P('foot_' + s), ball = P('ball_' + s);
    y = kn.clone().sub(hp); L = y.length() * 100; y.normalize(); x = perpTo(FWD, y); z = perpTo(out, y);
    put(profile(PROFILE.femur, L), 'thigh_' + s, hp, x, y, z);
    for (const b of BLOBS.filter(b => b[0] === 'femur')) put(ell(b[1], b[2]), 'thigh_' + s, hp, x, y, z);
    put(ell([3.6, L * .985, 0], [1.1, 2.3, 2.1]), 'thigh_' + s, hp, x, y, z);          // patella
    y = an.clone().sub(kn); L = y.length() * 100; y.normalize(); x = perpTo(FWD, y); z = perpTo(out, y);
    put(profile(PROFILE.tibia, L), 'calf_' + s, kn, x, y, z);
    put(profile(PROFILE.fibula, L), 'calf_' + s, kn, x, y, z);
    // foot: x along the foot, y up, z lateral; origin at the ankle
    const fx = ball.clone().sub(an); fx.y = 0; const fk = fx.length() * 100 / 14.2; fx.normalize();
    const fz = perpTo(out, fx);
    put(tube(FOOT_BODY.map(([a, b, c, ru, rl]) => [a, b, c, ru, rl]), SIDES, [0, 1, 0], [0, 0, 1]), 'foot_' + s, an, fx, UP, fz, fk);
    const ballPos = an.clone().add(fx.clone().multiplyScalar(.142 * fk)).add(V(0, -.071 * fk, 0));
    put(tube(TOES.map(([a, b, c, ru, rl]) => [a, b + .45, c, ru, rl]), SIDES, [0, 1, 0], [0, 0, 1]), 'ball_' + s, ballPos, fx, UP, fz, fk);
    // clavicle: straight strut from the sternal end to the shoulder
    const cs = hipC.clone().setY(sh.y - .02).setZ(sh.z + .03).add(V(sx * .02, 0, 0));
    parts.push({ g: seg(cs.toArray(), sh.toArray(), .0075, 8), bone: 'clavicle_' + s });
    // pelvis half (v2 right half: x fwd, y up, z right; hip centre at z = 9 cm)
    // the v2 half is the right one (z = right); mirroring = pointing z outward on each side
    const pk = hipHalf * 100 / 9.6;
    const ilium = fan(PELVIS.ilium, [0, 0, -1.8]), ring = fan(PELVIS.ring, [0, 0, -.4]);
    const ac = ell(PELVIS.acetabulum.c, [2.6, 2.6, .9]);
    for (const g of [ilium, ring, ac]) put(g, 'pelvis', hipC, FWD, UP, out, pk);
  }
  const pk = hipHalf * 100 / 9.6;
  put(tube(PELVIS.sacrum.map(([x, y, z, ra, rl]) => [x, y, z, ra, rl])), 'pelvis', hipC, FWD, UP, V(-1, 0, 0), pk);

  // ---- spinal column: a polyline through the rig's spine bones, pushed back toward the real spine ----
  const back = V(0, 0, -1);
  // (MakeHuman: vertebral bodies about 5.5 cm in front of the skin of the back; lumbar a little deeper)
  const onBack = (n, d) => { const p = P(n), b = backAt(p.y); if (b < 1e8) p.z = b + d; return p; };
  const ctrl = MH ? [
    [hipC.clone().add(V(0, .08 * pk, -.075 * pk)), 'pelvis'],
    [onBack('spine_01', .06), 'spine_01'],
    [onBack('spine_02', .06), 'spine_02'],
    [onBack('spine_03', .055), 'spine_03'],
    [onBack('neck_01', .045), 'neck_01'],
    [P('Head').add(back.clone().multiplyScalar(.01)), 'Head'],
  ] : [
    [hipC.clone().add(V(0, .08 * pk, -.075 * pk)), 'pelvis'],
    [P('spine_01').add(back.clone().multiplyScalar(.045)), 'spine_01'],
    [P('spine_02').add(back.clone().multiplyScalar(.05)), 'spine_02'],
    [P('spine_03').add(back.clone().multiplyScalar(.055)), 'spine_03'],
    [P('neck_01').add(back.clone().multiplyScalar(.035)), 'neck_01'],
    [P('Head').add(back.clone().multiplyScalar(.01)), 'Head'],
  ];
  // vertebra counts per segment: sacrum-top..spine_01 L5-L4, spine_01..02 L3-T12, 02..03 T11-T6, 03..neck T5-T1, neck..head C7-C1
  const plan = [['L', 2], ['L', 4], ['T', 6], ['T', 5], ['C', 7]];
  const verts = [];                                                                     // thoracic attach points for ribs
  plan.forEach(([reg, n], si) => {
    const a = ctrl[si][0], b = ctrl[si + 1][0], bone = ctrl[si][1] === 'pelvis' ? 'spine_01' : ctrl[si][1];
    const yv = b.clone().sub(a), step = yv.length() / n; yv.normalize();
    const xv = perpTo(FWD, yv), zv = V(-1, 0, 0);
    for (let i = 0; i < n; i++) {
      const size = reg === 'L' ? { d: 3.6, w: 5 } : reg === 'T' ? { d: 2.7, w: 3.4 } : { d: 1.7, w: 2.3 };
      const h = step * 100 * .78, o = a.clone().add(yv.clone().multiplyScalar(step * i));
      const sh = vertebraShape({ h, d: size.d, w: size.w, reg, name: reg === 'C' && i === 0 ? 'C7' : '' });
      const body = new THREE.CylinderGeometry(1, 1, 2 * sh.body.r[1], 12);
      body.applyMatrix4(new THREE.Matrix4().makeScale(sh.body.r[0], 1, sh.body.r[2])); body.translate(...sh.body.c);
      const sp = curve(sh.spinous, u => sh.spR[1] * (1 - .6 * u), u => sh.spR[0] * (1 - .5 * u), 5);
      const tr1 = seg(sh.trans[0], sh.trans[1], reg === 'L' ? .45 : .3), tr2 = seg(sh.trans[0], [sh.trans[1][0], sh.trans[1][1], -sh.trans[1][2]], reg === 'L' ? .45 : .3);
      for (const g of [body, sp, tr1, tr2]) put(g, bone, o, xv, yv, zv);
      if (reg === 'T') verts.push({ o, bone, xv, yv });
    }
  });
  // thoracic vertebrae were generated bottom-up (T12 first); ribs 1..12 map top-down
  verts.reverse();
  // ---- ribs: procedural half-hoops from each thoracic vertebra round to the sternum ----
  const ck = shHalf * 100 / 19;
  const A = [6.5, 8.8, 10.4, 11.5, 12.2, 12.6, 12.8, 12.8, 12.5, 11.9, 10.8, 9.6];
  const B = [4.2, 5.6, 6.8, 7.6, 8.2, 8.6, 8.8, 8.8, 8.6, 8.2, 7.6, 7.0];
  const DROP = [1.5, 3, 4.5, 6, 7, 8, 8.5, 8.5, 7.5, 6, 3, 2];
  const REACH = [1, 1, 1, 1, 1, 1, 1, .96, .92, .88, .5, .42];
  const ribBone = k => (k < 7 ? 'spine_03' : 'spine_02');
  for (let k = 0; k < 12 && k < verts.length; k++) {
    const { o } = verts[k];
    for (const sx of [1, -1]) {
      const pts = [], cart = [];
      const n = 16;
      for (let i = 0; i <= n; i++) {
        const u = i / n * REACH[k];
        const th = Math.PI * u;
        // local: x fwd, y up, z lateral (cm), hoop starts at the vertebra (behind) and ends at the front
        const p = [(-Math.cos(th)) * B[k] * ck + B[k] * ck - .8, -DROP[k] * Math.pow(u, 1.4), Math.sin(th) * A[k] * ck * .98 + 1.2 * (1 - u)];
        (u <= .78 || k >= 10 ? pts : cart).push(p);
        if (Math.abs(u - .78) < .5 / n * REACH[k] + 1e-6 && k < 10) cart.push(p);
      }
      const z = V(sx, 0, 0);
      const r = k < 2 ? .45 : .55;
      put(curve(pts, u => r * (.8 + .3 * Math.sin(Math.PI * u)), r * 1.5, 6), ribBone(k), o, FWD, UP, z);
      if (cart.length > 1) put(curve(cart, r * .8, r * 1.1, 5), ribBone(k), o, FWD, UP, z);
    }
  }
  // sternum: hangs from the first rib's front end
  if (verts.length) {
    const top = verts[0].o.clone().add(V(0, -.012 * ck, (B[0] * 2 * ck - .8) / 100));
    put(tube(STERNUM.map(([y, ra, rl]) => [0, -y, 0, ra, rl])), 'spine_03', top, FWD, UP, V(1, 0, 0), ck);
  }
  // ---- skull (v2 head frame: x fwd, y up, z right, origin at the occipital condyles) ----
  const hd = P('Head').add(V(0, .005, .0));
  for (const it of SKULL) for (const s of it.sym ? [1, -1] : [1]) {
    if (it.dark) continue;
    const mz = p => [p[0], p[1], p[2] * s];
    let g;
    if (it.t === 'ell') g = ell(mz(it.c), it.r, it.rot || 0, it.main ? 24 : 12);
    else if (it.t === 'tube') g = curve(it.pts.map(mz), it.r[0], it.r[1], 7);
    else if (it.t === 'teeth') g = curve(it.pts.map(mz), it.r * .9, it.r * 1.1, 5);
    if (g) put(g, 'Head', hd, FWD, UP, V(-1, 0, 0), .92);
  }

  // ---- merge into one rigidly skinned mesh ----
  const pos = [], si = [], sw = [], idx = [];
  for (const { g, bone } of parts) {
    const b = bi[bone] ?? 0, base = pos.length / 3, p = g.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); si.push(b, 0, 0, 0); sw.push(1, 0, 0, 0); }
    if (g.index) for (const i of g.index.array) idx.push(base + i); else for (let i = 0; i < p.length / 3; i++) idx.push(base + i);
    g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  // (a quantised body's inverse bind matrices carry its 1e-4 position scale: give the skeleton the same units)
  if (qs !== 1) for (let i = 0; i < pos.length; i++) pos[i] /= qs;
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.name = 'Skeleton';
  mesh.frustumCulled = false;
  mesh.bind(body.skeleton, body.bindMatrix);
  return mesh;
}
