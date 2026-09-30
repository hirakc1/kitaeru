"""QA: replay a .kclip.json on its rig (forward kinematics) and report how well joint DIRECTIONS match the cleaned
landmarks, plus foot sliding and floor penetration of the result.

    python check_clip.py clip.kclip.json body.glb landmarks.json
"""
import sys, json, base64
import numpy as np
from scipy.spatial.transform import Rotation as R
from rig import GLTF, Rig
import landmarks_to_clip as L2C


def decode(k):
    q = np.frombuffer(base64.b64decode(k['q']), '<i2').reshape(k['frames'], len(k['bones']), 3) * k['qScale']
    w = np.sqrt(np.clip(1 - (q ** 2).sum(-1), 0, 1))[..., None]
    t = np.frombuffer(base64.b64decode(k['t']), '<i2').reshape(k['frames'], 3) * k['tScale']
    return np.concatenate([q, w], -1), t


def main(clip, glb, lmk):
    k = json.load(open(clip))
    rig = Rig(GLTF(glb))
    Q, T = decode(k)
    d = json.load(open(lmk))
    names = d['names']
    F = np.array(d['frames'], float).reshape(len(d['frames']), len(names), 3)
    F = L2C.cleanup(F, names, d['fps'], k['fps'], k['cleanup']['cutoffHz'], k['cleanup']['inplace'], lambda *a: None)
    bi = {b: i for i, b in enumerate(k['bones'])}
    order = rig.names                                     # joints are listed parent-first in these exports
    pairs = {'upperarm_l': ('shoulder_l', 'elbow_l'), 'lowerarm_l': ('elbow_l', 'wrist_l'), 'thigh_l': ('hip_l', 'knee_l'),
             'calf_l': ('knee_l', 'ankle_l'), 'upperarm_r': ('shoulder_r', 'elbow_r'), 'lowerarm_r': ('elbow_r', 'wrist_r'),
             'thigh_r': ('hip_r', 'knee_r'), 'calf_r': ('knee_r', 'ankle_r')}
    child = {'upperarm_l': 'lowerarm_l', 'lowerarm_l': 'hand_l', 'thigh_l': 'calf_l', 'calf_l': 'foot_l',
             'upperarm_r': 'lowerarm_r', 'lowerarm_r': 'hand_r', 'thigh_r': 'calf_r', 'calf_r': 'foot_r'}
    ix = {n: i for i, n in enumerate(names)}
    errs = {b: [] for b in pairs}
    toe_y, ank_xz = [], []
    for f in range(0, len(Q)):
        W = {}
        for b in order:
            loc = rig.L[b].copy()
            if b in bi:
                sc = np.linalg.norm(loc[:3, :3], axis=0)
                loc[:3, :3] = R.from_quat(Q[f, bi[b]]).as_matrix() * sc
                if b == k['root']:
                    loc[:3, 3] = T[f]
            W[b] = (W[rig.parent[b]] if rig.parent[b] in W else rig.parent_world(b)) @ loc
        for b, (a, c) in pairs.items():
            v1 = W[child[b]][:3, 3] - W[b][:3, 3]
            v2 = F[f, ix[c]] - F[f, ix[a]]
            cos = np.dot(v1, v2) / np.linalg.norm(v1) / np.linalg.norm(v2)
            errs[b].append(np.degrees(np.arccos(np.clip(cos, -1, 1))))
        toe_y.append([W['ball_leaf_l'][1, 3], W['ball_leaf_r'][1, 3], W['foot_l'][1, 3], W['foot_r'][1, 3]])
        ank_xz.append([W['foot_l'][[0, 2], 3], W['foot_r'][[0, 2], 3]])
    print('limb direction error vs landmarks (deg): median / p95')
    for b, e in errs.items():
        print(f'  {b:11s} {np.median(e):5.1f} / {np.percentile(e, 95):5.1f}')
    toe_y = np.array(toe_y)
    print(f'lowest toe-tip height over clip: {toe_y[:, :2].min()*100:.1f} cm; ankle min {toe_y[:, 2:].min()*100:.1f} cm')
    a = np.array(ank_xz)
    for s, i in (('l', 0), ('r', 1)):
        planted = toe_y[:, 2 + i] < np.percentile(toe_y[:, 2 + i], 3) + .02
        v = np.linalg.norm(np.gradient(a[:, i], axis=0), axis=-1) * k['fps']
        print(f'  foot {s}: planted {planted.sum()} frames, slide p95 {np.percentile(v[planted], 95)*100:.1f} cm/s')


if __name__ == '__main__':
    main(*sys.argv[1:4])
