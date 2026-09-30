"""Build Kitaeru's v3 bodies (everyday proportions, sportswear, muscle regions) from the MakeHuman CC0 assets.

    python build_body.py <MPFB2 src/mpfb/data folder> <out folder>        -> human_f.glb, human_m.glb

Source: the MakeHuman base mesh, macro targets, 'game engine' rig and weights, all CC0 1.0 (they ship in MPFB2's data
folder; see assets/v3/LICENSES.md). See mh_body.py for how the body is shaped and rigged.

What goes into each GLB (about 0.45 MB):
  * the body mesh (plus the two low-poly eyes), no UVs, no textures, no normals (the player computes them: smooth);
  * positions as int16 in 0.1 mm (KHR_mesh_quantization): the 1e-4 scale is folded into the inverse bind matrices;
  * the 53-bone rig with IDENTITY rest rotations (every joint is a pure translation from its parent), so a clip or
    the in-browser retarget sets world rotations directly (rest world rotation = I for every bone);
  * skin weights (top 4, uint8);
  * _REGION (uint8 x4): two muscle-region slots per vertex, (id, intensity, id, intensity); ids index MUSCLES below,
    which are the app's muscle ids (js/data/muscles.js), 0 = none. Painted from the rig's bone weights and the rest-pose
    geometry: cylindrical patches around each limb bone (along-bone position x angle around it) and torso patches
    (height x width x front/back) placed from the joints, so they follow each body's own proportions;
  * _CLOTH (uint8 x4, normalised): garment masks (top, bottoms, hair, eyes), soft over ~1.5 cm so the shader can cut a
    crisp hem anywhere, not only along triangle edges. The top and the bottoms are pushed out a few mm from the skin.
"""
import sys, os, json, struct
import numpy as np
import mh_body

# the app's muscle ids (js/data/muscles.js); 0 = none
MUSCLES = ['none', 'chest', 'front_delts', 'side_delts', 'rear_delts', 'triceps', 'biceps', 'forearms', 'traps', 'upper_back',
           'lats', 'lower_back', 'abs', 'obliques', 'glutes', 'hip_flexors', 'quads', 'hamstrings', 'adductors', 'calves']
MID = {m: i for i, m in enumerate(MUSCLES)}
Q = 1e-4                       # position quantum (m)


def sm(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def band(x, lo, hi, soft):
    return sm(lo - soft, lo + soft, x) * (1 - sm(hi - soft, hi + soft, x))


def vnormals(V, T):
    n = np.zeros_like(V)
    fn = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
    for k in range(3):
        np.add.at(n, T[:, k], fn)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def neighbours(nv, T):
    e = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    e = np.concatenate([e, e[:, ::-1]])
    e = np.unique(e, axis=0)
    return e


def laplace(x, E, nv, it=1, lam=.5, mask=None):
    """smooth a per-vertex field (N,) or (N,3) over mesh edges; mask (N,) in 0..1 limits where it moves"""
    x = x.astype(np.float64).copy()
    deg = np.bincount(E[:, 0], minlength=nv).astype(np.float64)
    for _ in range(it):
        acc = np.zeros_like(x)
        np.add.at(acc, E[:, 0], x[E[:, 1]])
        avg = acc / np.maximum(deg, 1).reshape(-1, *([1] * (x.ndim - 1)))
        k = lam if mask is None else lam * mask.reshape(-1, *([1] * (x.ndim - 1)))
        x = x + (avg - x) * k
    return x


def main(data_dir, out_dir):
    for sex, tag in (('female', 'f'), ('male', 'm')):
        build_one(data_dir, sex, os.path.join(out_dir, f'human_{tag}.glb'))


def build_one(data_dir, sex, out):
    B = mh_body.build(data_dir, sex)
    mh, V0, names, bones = B['mh'], B['V'], B['names'], B['bones']
    keep_groups = ['body', 'helper-l-eye', 'helper-r-eye']
    quads = [f for f, g in zip(mh.F, mh.FG) if g in keep_groups]
    used = np.unique(np.array(quads).reshape(-1))
    remap = -np.ones(len(V0), np.int64); remap[used] = np.arange(len(used))
    Tq = remap[np.array(quads)]
    T = np.concatenate([Tq[:, [0, 1, 2]], Tq[:, [0, 2, 3]]])
    V = V0[used].copy()
    nv = len(V)
    J, Wt, Wf = B['J'][used], B['W'][used], B['Wfull'][used]
    eyes = np.isin(used, np.concatenate([mh.group('helper-l-eye'), mh.group('helper-r-eye')]))
    N = vnormals(V, T)
    E = neighbours(nv, T)
    bi = {n: i for i, n in enumerate(names)}
    H = {n: bones[n]['head'] for n in names}
    Tl = {n: bones[n]['tail'] for n in names}

    def w(*bs):
        return sum(Wf[:, bi[b]] for b in bs)
    x, y, z = V.T
    nx, ny, nz = N.T
    ax = np.abs(x)
    sx = np.sign(x) + (x == 0)

    # ---- landmarks from the joints (so every patch follows this body's proportions) ----
    yHip = (H['thigh_l'][1] + H['thigh_r'][1]) / 2
    yP1 = H['spine_01'][1]; yS2 = H['spine_02'][1]; yS3 = H['spine_03'][1]
    yNeck = H['neck_01'][1]; yClav = H['clavicle_l'][1]
    shX = H['upperarm_l'][0]; shY = H['upperarm_l'][1]
    hipX = H['thigh_l'][0]
    torsoW = shX                                                   # half shoulder width (joint to joint)
    eyeY = V[eyes, 1].mean() if eyes.any() else H['head'][1] + .03
    # torso centre depth at each height (from the spine joints, pushed forward a little: the joints sit behind centre)
    sp = np.array([H['pelvis'], H['spine_01'], H['spine_02'], H['spine_03'], H['neck_01']])
    zc = np.interp(y, sp[:, 1], sp[:, 2]) + .02

    # ---- limb cylinders: t along the bone (0 head .. 1 tail), angle around it (0 anterior, +90 lateral, +-180 posterior)
    def cyl(bone, side, tail=None):
        h = H[bone]; e = Tl[bone] if tail is None else H[tail]
        a = e - h; L = np.linalg.norm(a); a = a / L
        d = V - h
        t = d @ a / L
        r = d - np.outer(d @ a, a)
        ant = np.array([0, 0, 1.]) - a[2] * a; ant /= np.linalg.norm(ant)
        lat = np.cross(a, ant) * (1 if side == 'l' else -1)
        lat *= np.sign(lat[0] * (1 if side == 'l' else -1)) or 1   # lateral = away from the midline
        ang = np.degrees(np.arctan2(r @ lat, r @ ant))
        return t, ang

    def near(ang, c, half, soft=25):
        d = np.abs((ang - c + 180) % 360 - 180)
        return 1 - sm(half - soft, half + soft, d)

    cand = {m: np.zeros(nv) for m in MUSCLES[1:]}
    for s in 'lr':
        side = (sx > 0) if s == 'l' else (sx < 0)
        ua = Wf[:, bi['upperarm_' + s]]; cl = Wf[:, bi['clavicle_' + s]]
        t, ang = cyl('upperarm_' + s, s, 'lowerarm_' + s)
        cap = (ua + cl) * side
        cand['front_delts'] += cap * band(t, -.1, .33, .06) * near(ang, -15, 50)
        cand['side_delts'] += cap * band(t, -.12, .36, .06) * near(ang, 90, 55)
        cand['rear_delts'] += cap * band(t, -.1, .33, .06) * near(ang, 175, 50)
        cand['biceps'] += ua * side * band(t, .34, .9, .05) * near(ang, -10, 60)
        cand['triceps'] += ua * side * band(t, .22, .95, .05) * near(ang, 180, 80)
        t, ang = cyl('lowerarm_' + s, s, 'hand_' + s)
        cand['forearms'] += Wf[:, bi['lowerarm_' + s]] * side * band(t, -.02, .72, .05)
        th = Wf[:, bi['thigh_' + s]]
        t, ang = cyl('thigh_' + s, s, 'calf_' + s)
        cand['quads'] += th * side * band(t, .1, .92, .05) * near(ang, 30, 80)
        cand['adductors'] += th * side * band(t, .03, .62, .06) * near(ang, -95, 45)
        cand['hamstrings'] += th * side * band(t, .12, .9, .05) * near(ang, 180, 60)
        cand['hip_flexors'] += (th + w('pelvis')) * side * band(t, -.12, .1, .05) * near(ang, -20, 40) * (nz > .1)
        t, ang = cyl('calf_' + s, s, 'foot_' + s)
        cand['calves'] += Wf[:, bi['calf_' + s]] * side * band(t, .04, .62, .05) * near(ang, 180, 85)
    torso = w('pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'clavicle_l', 'clavicle_r') * (ax < torsoW + .02)
    front = sm(.05, .45, nz) * (z > zc - .02)
    back = sm(-.05, -.45, nz) * (z < zc + .02)
    u = ax / torsoW                                                     # 0 midline .. 1 shoulder joint
    cand['abs'] += torso * front * band(y, yHip + .02, yS3 + .03, .02) * (1 - sm(.36, .5, u))
    cand['obliques'] += torso * band(y, yHip + .06, yS3 - .01, .025) * sm(.34, .5, u) * (1 - sm(-.35, -.6, nz)) * sm(-.2, .2, nz + .3)
    cand['chest'] += torso * front * band(y, shY - .17, shY - .005, .02) * sm(.04, .14, u) * (1 - sm(.95, 1.12, u))
    cand['lower_back'] += torso * back * band(y, yHip + .03, yS3 - .02, .025) * (1 - sm(.3, .45, u))
    cand['lats'] += torso * sm(-.1, -.5, nz - .25 * np.abs(nx)) * band(y, yS2 - .02, shY - .1, .03) * sm(.3, .5, u)
    cand['upper_back'] += torso * back * band(y, shY - .2, shY - .035, .02) * sm(.06, .15, u) * (1 - sm(.62, .78, u))
    upper_t = (torso + w('neck_01') * .8) * band(y, shY - .05, yNeck + .07, .02) * (1 - sm(.95, 1.1, u)) * sm(-.3, .1, -nz + .6 * ny)
    lower_t = torso * back * band(y, yS2 + .02, shY - .04, .02) * (1 - sm(.18 + .5 * (y - yS2) / (shY - yS2), .3 + .5 * (y - yS2) / (shY - yS2), u))
    cand['traps'] += np.maximum(upper_t, lower_t * .9)
    glute_back = (w('pelvis') + w('thigh_l', 'thigh_r') * .8) * back * band(y, yHip - .11, yHip + .08, .03) * sm(.02, .08, u)
    glute_med = w('pelvis') * band(y, yHip + .0, yHip + .09, .02) * sm(.55, .8, np.abs(nx)) * (ax > hipX * .9)
    cand['glutes'] += np.maximum(glute_back, glute_med * .8)
    keys = MUSCLES[1:]
    C = np.stack([np.clip(cand[k], 0, 1) for k in keys], 1)
    C[eyes] = 0
    # a little smoothing so patch borders are soft and follow the surface, not triangle edges
    C = laplace(C, E, nv, it=3, lam=.5)
    order = np.argsort(-C, 1)
    i1, i2 = order[:, 0], order[:, 1]
    k1 = C[np.arange(nv), i1]; k2 = C[np.arange(nv), i2]
    ids = np.array([MID[k] for k in keys])
    region = np.stack([np.where(k1 > .03, ids[i1], 0), np.round(np.clip(k1, 0, 1) * 255) * (k1 > .03),
                       np.where(k2 > .03, ids[i2], 0), np.round(np.clip(k2, 0, 1) * 255) * (k2 > .03)], 1).astype(np.uint8)

    # ---- sportswear ----
    headw = w('head')
    neckw = w('neck_01')
    t_ua_l = cyl('upperarm_l', 'l', 'lowerarm_l')[0]; t_ua_r = cyl('upperarm_r', 'r', 'lowerarm_r')[0]
    t_ua = np.where(x > 0, t_ua_l, t_ua_r)
    t_th = np.where(x > 0, cyl('thigh_l', 'l', 'calf_l')[0], cyl('thigh_r', 'r', 'calf_r')[0])
    t_ca = np.where(x > 0, cyl('calf_l', 'l', 'foot_l')[0], cyl('calf_r', 'r', 'foot_r')[0])
    arm = w('upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r', 'hand_l', 'hand_r') + sum(Wf[:, bi[n]] for n in names if n[:-2] in ('thumb_01', 'thumb_02', 'thumb_03') or n.split('_')[0] in ('index', 'middle', 'ring', 'pinky'))
    leg = w('thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r', 'ball_l', 'ball_r')
    # every garment edge is the 0.5 level set of a field that is LINEAR across the edge (a 6 cm ramp of signed distance):
    # the shader's per-pixel threshold then cuts straight hems through the triangles, not a zigzag along their edges
    ramp = lambda v, at, w=.03: np.clip(.5 + (v - at) / (2 * w), 0, 1)
    armness = np.clip(laplace(np.clip(arm, 0, 1), E, nv, it=6), 0, 1)
    legness = np.clip(laplace(np.clip(leg, 0, 1), E, nv, it=6), 0, 1)
    # T-shirt: crew neck, short sleeves to mid upper arm, hem at the hip
    hem = yHip + (.035 if sex == 'female' else .02)
    nkz = H['neck_01'][2]
    front_k = sm(nkz - .01, nkz + .05, z)                                 # 0 behind the neck .. 1 in front
    neckline = (yNeck - .01) + ((yClav - .03 - .015 * (1 - sm(0, .35, u))) - (yNeck - .01)) * front_k
    neckline = neckline + .3 * sm(.075, .1, np.hypot(x, z - nkz))         # (only around the neck: the shoulders stay covered)
    torso_top = np.minimum(ramp(y, hem), 1 - ramp(y, neckline, .02))
    sleeve = 1 - ramp(t_ua, .42, .1)
    top = (torso_top * (1 - armness) + sleeve * armness) * (1 - sm(.3, .6, legness)) * (1 - sm(.3, .6, headw))
    # bottoms: female 7/8 leggings (to mid calf), male shorts to just above the knee; waistband below the navel
    waist = yHip + .09
    yKnee = (H['calf_l'][1] + H['calf_r'][1]) / 2; yAnk = (H['foot_l'][1] + H['foot_r'][1]) / 2
    cut = yAnk + .42 * (yKnee - yAnk) if sex == 'female' else yKnee + .2 * (yHip - yKnee)
    bot = np.minimum(ramp(y, cut), 1 - ramp(y, waist)) * (1 - sm(.2, .5, armness))
    # hair (painted cap): the scalp above the brow line, down to the nape (lower at the back for the female body)
    hz = H['head'][2]
    brow = eyeY + .05
    nape = (H['neck_01'][1] + .05) if sex == 'female' else (eyeY - .025)
    back_k = sm(hz + .03, hz - .06, z)                                    # 0 at the front of the head .. 1 at the back
    hairline = brow + (nape - brow) * back_k
    ear = sm(.055, .065, ax) * sm(hz - .045, hz - .025, z) * (1 - sm(hz + .03, hz + .05, z)) * (1 - sm(eyeY + .015, eyeY + .035, y))
    hair = np.clip(headw + neckw, 0, 1) * ramp(y, hairline, .015) * (1 - ear)
    hair = np.clip(hair * (1 - sm(.3, .6, top)), 0, 1)
    top, bot, hair = (np.clip(laplace(m, E, nv, it=2), 0, 1) for m in (top, bot, hair))
    eye = eyes.astype(float)
    cloth = np.stack([top, bot, hair, eye], 1)
    cloth = np.clip(cloth, 0, 1)

    # push the garments out from the skin: 3.5 mm for the top, 2 mm for the bottoms. Fabric bridges hollows and does
    # not show small details: the top is smoothed over the chest (no nipples, a softer bust line), the bottoms over the
    # crotch and the seat
    off = (3.5e-3 * np.clip(cloth[:, 0] * 2, 0, 1) + 2e-3 * np.clip(cloth[:, 1] * 2, 0, 1) + 2e-3 * np.clip(cloth[:, 2] * 2, 0, 1))
    Vd = V + N * off[:, None]
    chest = np.clip(cloth[:, 0] * 2, 0, 1) * front * band(y, shY - .24, shY - .01, .03) * (1 - sm(.75, .95, u))
    crotch = np.clip(cloth[:, 1] * 2, 0, 1) * band(y, yHip - .16, yHip + .02, .03) * (1 - sm(.35, .6, ax / hipX))
    # (it, max inward mm, outward only): small bumps go (a local pass that may sink ~1 cm); hollows fill (a wide pass that
    # only moves outwards: the fabric bridges the under-bust and between the breasts)
    # the nipples: the most forward chest point on each side, smoothed away within 3.5 cm
    nip = np.zeros(nv)
    for sgn in (1, -1):
        cand_i = np.where((chest > .5) & (x * sgn > .03))[0]
        if len(cand_i):
            c0 = V[cand_i[np.argmax(V[cand_i, 2])]]
            nip = np.maximum(nip, 1 - sm(.04, .07, np.linalg.norm(V - c0, axis=1)))
    passes = [(nip, 150, .04, False), (chest, 14, .02, False), (chest, 40 if sex == 'female' else 15, 0, True), (crotch, 25, .008, False)]
    for m, it, sink, out_only in passes:
        Vs = laplace(Vd, E, nv, it=it, lam=.5, mask=m)
        disp = Vs - Vd
        dn = (disp * N).sum(1)
        if out_only:
            disp = N * np.maximum(dn, 0)[:, None]
        else:
            disp -= N * np.minimum(dn + sink, 0)[:, None]            # never sink further than this into the body
        Vd = Vd + disp
    V = Vd

    # ---- skin weights -> uint8 (sum 255) ----
    o = np.argsort(-Wt, 1)
    J = np.take_along_axis(J, o, 1); Wt = np.take_along_axis(Wt, o, 1)
    Wt = Wt / Wt.sum(1, keepdims=True)
    w8 = np.floor(Wt * 255).astype(np.int32); w8[:, 0] += 255 - w8.sum(1)
    J[w8 == 0] = 0

    # ---- GLB ----
    qpos = np.round(V / Q).astype(np.int16)
    assert np.abs(V / Q).max() < 32767
    pos8 = np.zeros((nv, 4), np.int16); pos8[:, :3] = qpos
    blob = bytearray(); views = []; accs = []

    def add(raw, target=None, stride=None):
        while len(blob) % 4:
            blob.append(0)
        off = len(blob); blob.extend(raw)
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(raw)}
        if target: v['target'] = target
        if stride: v['byteStride'] = stride
        views.append(v); return len(views) - 1

    def acc(view, ctype, typ, count, **kw):
        a = {'bufferView': view, 'componentType': ctype, 'count': int(count), 'type': typ, **kw}
        accs.append(a); return len(accs) - 1
    a_pos = acc(add(pos8.tobytes(), 34962, 8), 5122, 'VEC3', nv, min=qpos.min(0).tolist(), max=qpos.max(0).tolist())
    a_jnt = acc(add(J.astype(np.uint8).tobytes(), 34962), 5121, 'VEC4', nv)
    a_wgt = acc(add(w8.astype(np.uint8).tobytes(), 34962), 5121, 'VEC4', nv, normalized=True)
    a_reg = acc(add(region.tobytes(), 34962), 5121, 'VEC4', nv)
    a_clo = acc(add(np.round(cloth * 255).astype(np.uint8).tobytes(), 34962), 5121, 'VEC4', nv, normalized=True)
    a_idx = acc(add(T.astype(np.uint16).tobytes(), 34963), 5123, 'SCALAR', T.size)
    ibm = []
    for n in names:
        m = np.eye(4); m[:3, 3] = -H[n]
        m = m @ np.diag([Q, Q, Q, 1])
        ibm.append(m.T.reshape(-1))                                 # column-major
    a_ibm = acc(add(np.array(ibm, np.float32).tobytes()), 5126, 'MAT4', len(names))
    nodes = []
    for n in names:
        p = bones[n]['parent']
        t = H[n] - (H[p] if p else 0)
        nd = {'name': n, 'translation': [round(float(v), 6) for v in t]}
        ch = [bi[c] for c in names if bones[c]['parent'] == n]
        if ch: nd['children'] = ch
        nodes.append(nd)
    nodes.append({'name': 'Body', 'mesh': 0, 'skin': 0})
    roots = [bi[n] for n in names if not bones[n]['parent']] + [len(nodes) - 1]
    gl = {
        'asset': {'version': '2.0', 'generator': 'Kitaeru anim v3 build_body.py',
                  'copyright': 'Body: MakeHuman base mesh, targets, game-engine rig and weights (CC0 1.0), shaped and dressed for Kitaeru.'},
        'extensionsUsed': ['KHR_mesh_quantization'], 'extensionsRequired': ['KHR_mesh_quantization'],
        'scene': 0, 'scenes': [{'nodes': roots}], 'nodes': nodes,
        'meshes': [{'name': 'Body', 'primitives': [{'attributes': {'POSITION': a_pos, 'JOINTS_0': a_jnt, 'WEIGHTS_0': a_wgt,
                    '_REGION': a_reg, '_CLOTH': a_clo}, 'indices': a_idx, 'material': 0}]}],
        'materials': [{'name': 'Body', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': .8}}],
        'skins': [{'name': 'Armature', 'joints': list(range(len(names))), 'inverseBindMatrices': a_ibm, 'skeleton': bi['Root']}],
        'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(blob)}],
        'extras': {'kitaeruMuscles': MUSCLES, 'kitaeruCloth': ['top', 'bottoms', 'hair', 'eyes'], 'sex': sex, 'restRotations': 'identity',
                   'height': round(float(V[:, 1].max()), 3), 'source': 'MakeHuman CC0 assets (MPFB2 v2.0.17 data)',
                   'targets': [[r, round(w_, 4)] for r, w_, _ in B['applied']]},
    }
    js = json.dumps(gl, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
    while len(blob) % 4: blob.append(0)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(blob), 0x004E4942)); f.write(blob)
    cnt = {m: int((region[:, 0] == i).sum()) for i, m in enumerate(MUSCLES) if i}
    print(f'{out}: {total/1024:.0f} KB, {nv} verts, {len(T)} tris, {len(names)} joints, height {V[:,1].max():.3f} m; '
          f'top {int((cloth[:,0]>.5).sum())} bottoms {int((cloth[:,1]>.5).sum())} hair {int((cloth[:,2]>.5).sum())}; muscles {cnt}')


if __name__ == '__main__':
    main(*sys.argv[1:3])
