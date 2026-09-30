"""Pack a rigged glTF character into a small GLB for Kitaeru anim v3.

    python pack_model.py <in.gltf> <basecolor.png> <out.glb> [--female]

What it does
  * keeps only the body mesh (drops eyes / eyebrows) and all skin joints;
  * keeps POSITION, NORMAL, JOINTS_0, WEIGHTS_0 (weights re-quantised to normalised uint8, top-4, summing to 255);
  * drops every texture / UV / colour set (the app shades the body procedurally);
  * adds one custom vertex attribute _REGION (VEC4 uint8):
        x = muscle-group id (see MUSCLES below, 0 = none)
        y = muscle highlight intensity 0..255 (soft edges)
        z = garment mask 0..255 (the underwear painted in the source texture: low-saturation pixels)
        w = 0
    Groups are derived from rest-pose (T-pose) position, normal and bone weights: a cheap stand-in for a painted mask.
Source model: Quaternius "Universal Base Characters" (CC0). See assets/v3/LICENSES.md.
"""
import sys, json, struct
import numpy as np
from PIL import Image
from rig import GLTF, Rig

MUSCLES = ['none', 'quads', 'hamstrings', 'glutes', 'calves', 'core', 'chest', 'upperback', 'lats', 'shoulders',
           'biceps', 'triceps', 'forearms']
MID = {m: i for i, m in enumerate(MUSCLES)}


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def band(x, lo, hi, soft):
    return smooth(lo - soft, lo + soft, x) * (1 - smooth(hi - soft, hi + soft, x))


def main(src, tex, out):
    g = GLTF(src)
    rig = Rig(g)
    # body = the skinned mesh with the most vertices
    best = None
    for ni, n in enumerate(g.nodes):
        if 'mesh' in n:
            p = g.j['meshes'][n['mesh']]['primitives'][0]
            cnt = g.j['accessors'][p['attributes']['POSITION']]['count']
            if best is None or cnt > best[2]:
                best = (ni, p, cnt)
    body_node, prim, nv = best
    A = prim['attributes']
    pos = g.acc(A['POSITION']).astype(np.float32)
    nor = g.acc(A['NORMAL']).astype(np.float32)
    uv = g.acc(A['TEXCOORD_0']).astype(np.float32)
    jnt = g.acc(A['JOINTS_0']).astype(np.int32)
    wgt = g.acc(A['WEIGHTS_0']).astype(np.float32)
    idx = g.acc(prim['indices']).reshape(-1).astype(np.uint32)
    # mesh node transform (usually identity under the armature)
    M = g.world(body_node)
    assert np.allclose(M, np.eye(4), atol=1e-5), 'body mesh node must be at identity'

    names = rig.names
    nb = len(names)
    W = np.zeros((nv, nb), np.float32)
    for k in range(4):
        np.add.at(W, (np.arange(nv), jnt[:, k]), wgt[:, k])

    def w(*bones):
        return sum(W[:, names.index(b)] for b in bones)

    # ---- landmarks (rest pose, metres, +Y up, character faces +Z) ----
    H = {b: rig.head(b) for b in names}
    hipY = (H['thigh_l'][1] + H['thigh_r'][1]) / 2
    kneeY = (H['calf_l'][1] + H['calf_r'][1]) / 2
    ankY = (H['foot_l'][1] + H['foot_r'][1]) / 2
    shY = (H['upperarm_l'][1] + H['upperarm_r'][1]) / 2
    shX = abs(H['upperarm_l'][0])
    chestLow = H['spine_02'][1] + .02
    x, y, z = pos.T
    nx, ny, nz = nor.T
    ax = np.abs(x)
    # distance along the arm from the shoulder joint (arms are along +-X in the T-pose)
    along = ax - shX

    legT = w('thigh_l', 'thigh_r')
    legC = w('calf_l', 'calf_r')
    pel = w('pelvis')
    s12 = w('spine_01', 'spine_02')
    s3 = w('spine_03')
    clav = w('clavicle_l', 'clavicle_r')
    neck = w('neck_01')
    ua = w('upperarm_l', 'upperarm_r')
    fa = w('lowerarm_l', 'lowerarm_r')
    torso = ax < shX - .02

    cand = {
        'glutes': (pel + legT) * smooth(-.15, -.55, nz) * band(y, hipY - .1, hipY + .1, .05) * (ax > .02),
        'quads': legT * smooth(.0, .45, nz + .35 * np.abs(nx)) * band(y, kneeY + .06, hipY - .06, .04),
        'hamstrings': legT * smooth(-.05, -.5, nz) * band(y, kneeY + .06, hipY - .13, .04),
        'calves': legC * smooth(-.05, -.5, nz) * band(y, ankY + .1, kneeY - .03, .04),
        'core': (s12 + pel) * smooth(.05, .45, nz + .4 * np.abs(nx)) * band(y, hipY + .07, chestLow + .02, .03) * torso,
        'chest': (s3 + clav) * smooth(.15, .5, nz) * band(y, shY - .2, shY - .01, .03) * (ax > .015) * torso,
        'upperback': (s3 + neck + clav) * smooth(-.15, -.5, nz) * band(y, shY - .17, shY + .12, .03) * torso,
        'lats': (s12 + s3) * smooth(-.0, -.45, nz - .3 * np.abs(nx)) * band(y, chestLow - .05, shY - .15, .03) * (ax > .07) * torso,
        'shoulders': (ua + clav) * band(along, -.07, .1, .03) * smooth(-.4, .2, ny + .2) * (ax > shX - .08),
        'biceps': ua * band(along, .1, .27, .03) * smooth(.1, .5, nz),
        'triceps': ua * band(along, .08, .27, .03) * smooth(-.1, -.5, nz),
        'forearms': fa * band(along, .28, .5, .03),
    }
    keys = list(cand)
    C = np.stack([np.clip(cand[k], 0, 1) for k in keys], 1)
    best_i = C.argmax(1)
    inten = C.max(1)
    mid = np.where(inten > .02, np.array([MID[k] for k in keys])[best_i], 0)

    # ---- garment mask from the texture (low saturation = fabric) ----
    im = np.asarray(Image.open(tex).convert('RGB'), np.float32) / 255
    th, tw = im.shape[:2]
    px = np.clip((uv[:, 0] % 1) * tw, 0, tw - 1).astype(int)
    py = np.clip((uv[:, 1] % 1) * th, 0, th - 1).astype(int)
    c = im[py, px]
    sat = c.max(1) - c.min(1)
    cloth = smooth(.14, .06, sat)

    # a small garment mask texture too (per-pixel edge instead of the jagged per-vertex one)
    from PIL import ImageFilter
    import io
    msk = np.clip((.14 - (im.max(2) - im.min(2))) / .08, 0, 1)
    mimg = Image.fromarray((msk * 255).astype(np.uint8), 'L').resize((512, 512), Image.LANCZOS).filter(ImageFilter.GaussianBlur(.8))
    bio = io.BytesIO(); mimg.save(bio, 'PNG', optimize=True); mask_png = np.frombuffer(bio.getvalue(), np.uint8)

    region = np.stack([mid, np.round(inten * 255), np.round(cloth * 255), np.zeros(nv)], 1).astype(np.uint8)

    # ---- weights -> uint8 normalised, summing to 255 ----
    order = np.argsort(-wgt, 1)
    jnt = np.take_along_axis(jnt, order, 1)
    wgt = np.take_along_axis(wgt, order, 1)
    wgt = wgt / wgt.sum(1, keepdims=True)
    w8 = np.floor(wgt * 255).astype(np.int32)
    w8[:, 0] += 255 - w8.sum(1)
    jnt[w8 == 0] = 0

    # ---- write GLB ----
    blob = bytearray()
    views, accs = [], []

    def add(arr, ctype, typ, target=None, minmax=False, normalized=False):
        while len(blob) % 4:
            blob.append(0)
        off = len(blob)
        b = arr.tobytes()
        blob.extend(b)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(b)}
        if target:
            v['target'] = target
        views.append(v)
        if arr.dtype == np.uint8 and arr.ndim == 1:            # raw image bytes: no accessor needed
            accs.append(None); return None
        a = {'bufferView': len(views) - 1, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': typ}
        if normalized:
            a['normalized'] = True
        if minmax:
            a['min'] = arr.min(0).tolist()
            a['max'] = arr.max(0).tolist()
        accs.append(a)
        return len(accs) - 1

    a_pos = add(pos, 5126, 'VEC3', 34962, True)
    a_nor = add(nor / np.linalg.norm(nor, axis=1, keepdims=True).clip(1e-6), 5126, 'VEC3', 34962)
    a_jnt = add(jnt.astype(np.uint8), 5121, 'VEC4', 34962)
    a_wgt = add(w8.astype(np.uint8), 5121, 'VEC4', 34962, normalized=True)
    a_reg = add(region, 5121, 'VEC4', 34962)
    a_idx = add(idx.astype(np.uint16 if nv < 65536 else np.uint32), 5123 if nv < 65536 else 5125, 'SCALAR', 34963)
    ibm = g.acc(g.j['skins'][0]['inverseBindMatrices']).astype(np.float32)
    a_ibm = add(ibm, 5126, 'MAT4')
    a_uv = add(uv.astype(np.float32), 5126, 'VEC2', 34962)
    add(mask_png, 5121, 'SCALAR')
    img_view = len(views) - 1
    accs.pop()

    # nodes: armature + joints + body mesh node (remap indices)
    keep = set(rig.joints) | {body_node}
    arm = [i for i, n in enumerate(g.nodes) if body_node in n.get('children', [])]
    keep |= set(arm)
    # also keep ancestors of joints
    for j in list(keep):
        while j in g.parent:
            j = g.parent[j]
            keep.add(j)
    keep = sorted(keep)
    remap = {o: i for i, o in enumerate(keep)}
    nodes = []
    for o in keep:
        n = {k: v for k, v in g.nodes[o].items() if k in ('name', 'translation', 'rotation', 'scale', 'matrix')}
        ch = [remap[c] for c in g.nodes[o].get('children', []) if c in remap]
        if ch:
            n['children'] = ch
        if o == body_node:
            n['mesh'] = 0
            n['skin'] = 0
            n['name'] = 'Body'
        nodes.append(n)
    roots = [remap[o] for o in keep if o not in g.parent or g.parent[o] not in remap]
    gl = {
        'asset': {'version': '2.0', 'generator': 'Kitaeru anim v3 pack_model.py',
                  'copyright': 'Model: Quaternius, Universal Base Characters (CC0 1.0). Packed for Kitaeru.'},
        'scene': 0, 'scenes': [{'nodes': roots}], 'nodes': nodes,
        'meshes': [{'name': 'Body', 'primitives': [{'attributes': {'POSITION': a_pos, 'NORMAL': a_nor, 'JOINTS_0': a_jnt,
                    'WEIGHTS_0': a_wgt, '_REGION': a_reg, 'TEXCOORD_0': a_uv}, 'indices': a_idx, 'material': 0}]}],
        # baseColorTexture = garment mask (white = fabric); the app's shaders read it, it is not a colour map
        'materials': [{'name': 'Skin', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': .7,
                       'baseColorTexture': {'index': 0}}}],
        'images': [{'bufferView': img_view, 'mimeType': 'image/png', 'name': 'garment_mask'}],
        'samplers': [{'magFilter': 9729, 'minFilter': 9987}], 'textures': [{'sampler': 0, 'source': 0}],
        'skins': [{'name': 'Armature', 'joints': [remap[j] for j in rig.joints], 'inverseBindMatrices': a_ibm}],
        'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(blob)}],
        'extras': {'kitaeruMuscles': MUSCLES},
    }
    js = json.dumps(gl, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    while len(blob) % 4:
        blob.append(0)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    cnt = {m: int((mid == i).sum()) for i, m in enumerate(MUSCLES)}
    print(f'{out}: {total/1024:.0f} KB, {nv} verts, {len(idx)//3} tris, {nb} joints; cloth verts {int((cloth>.5).sum())}; muscles {cnt}')


if __name__ == '__main__':
    main(*sys.argv[1:4])
