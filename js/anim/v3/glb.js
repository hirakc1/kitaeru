// Kitaeru animation v3: a tiny reader for our own body GLBs (assets/v3/human_{f,m}.glb, written by
// assets/v3/pipeline/build_body.py). It reads exactly that layout (one skinned mesh, KHR_mesh_quantization int16
// positions, uint8 joints / weights / _REGION / _CLOTH, identity rest rotations), so the app does not need three.js's
// GLTFLoader (about 100 KB of JS) just to open two files it wrote itself.
import * as THREE from '../../vendor/three.module.min.js';

const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

/** Parse a body GLB into a template: shared geometry + rig description. Bones are made per instance (instantiate). */
export function parseBody(buf) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('not a GLB');
  const jl = dv.getUint32(12, true);
  const j = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)));
  const binOff = 20 + jl + 8;
  const acc = i => {
    const a = j.accessors[i], v = j.bufferViews[a.bufferView], T = CT[a.componentType], n = NC[a.type];
    const off = binOff + (v.byteOffset || 0) + (a.byteOffset || 0), stride = v.byteStride || 0, size = T.BYTES_PER_ELEMENT * n;
    if (stride && stride !== size) {
      const ib = new THREE.InterleavedBuffer(new T(buf, binOff + (v.byteOffset || 0), v.byteLength / T.BYTES_PER_ELEMENT), stride / T.BYTES_PER_ELEMENT);
      return new THREE.InterleavedBufferAttribute(ib, n, (a.byteOffset || 0) / T.BYTES_PER_ELEMENT, !!a.normalized);
    }
    return new THREE.BufferAttribute(new T(buf, off, a.count * n), n, !!a.normalized);
  };
  const prim = j.meshes[0].primitives[0], A = prim.attributes;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', acc(A.POSITION));
  geo.setAttribute('skinIndex', acc(A.JOINTS_0));
  geo.setAttribute('skinWeight', acc(A.WEIGHTS_0));
  if (A._REGION != null) geo.setAttribute('_region', acc(A._REGION));
  if (A._CLOTH != null) geo.setAttribute('_cloth', acc(A._CLOTH));
  geo.setIndex(acc(prim.indices));
  geo.computeVertexNormals();                                   // smooth normals (not stored: saves ~55 KB)
  const skin = j.skins[0], ibm = acc(skin.inverseBindMatrices).array;
  const bones = skin.joints.map((ni, k) => {
    const n = j.nodes[ni];
    return { name: n.name, t: n.translation || [0, 0, 0], children: n.children || [], node: ni, ibm: Array.from(ibm.slice(k * 16, k * 16 + 16)) };
  });
  // world rest heads (rest rotations are identity: heads are running sums of translations)
  const byNode = new Map(bones.map((b, i) => [b.node, i]));
  const parent = new Array(bones.length).fill(-1);
  bones.forEach((b, i) => b.children.forEach(c => { if (byNode.has(c)) parent[byNode.get(c)] = i; }));
  const head = bones.map(() => null);
  const H = i => head[i] || (head[i] = parent[i] < 0 ? bones[i].t.slice() : H(parent[i]).map((v, k) => v + bones[i].t[k]));
  bones.forEach((_, i) => H(i));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, .9, 0), 1.2);
  return { geo, bones, parent, head, names: bones.map(b => b.name), extras: j.extras || {}, bytes: buf.byteLength };
}

/** A posable instance: fresh bones + a SkinnedMesh on the shared geometry (material set by the caller). */
export function instantiate(tpl, material) {
  const bones = tpl.bones.map(b => { const o = new THREE.Bone(); o.name = b.name; o.position.fromArray(b.t); return o; });
  tpl.parent.forEach((p, i) => { if (p >= 0) bones[p].add(bones[i]); });
  const inv = tpl.bones.map(b => new THREE.Matrix4().fromArray(b.ibm));
  const skeleton = new THREE.Skeleton(bones, inv);
  const mesh = new THREE.SkinnedMesh(tpl.geo, material);
  mesh.frustumCulled = false;
  const root = new THREE.Group();
  tpl.parent.forEach((p, i) => { if (p < 0) root.add(bones[i]); });
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(skeleton, new THREE.Matrix4());
  const byName = Object.fromEntries(bones.map((b, i) => [b.name, i]));
  return { root, mesh, skeleton, bones, byName };
}
