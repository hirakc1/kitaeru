"""Landmark track -> cleaned-up, retargeted Kitaeru clip (.kclip.json) for a packed GLB rig.

    python landmarks_to_clip.py in.landmarks.json ../body_m.glb out.kclip.json [--fps 30] [--cutoff 6] [--inplace]
                                [--start s] [--end s] [--name "..."]

Stages (all numpy/scipy, offline, deterministic):
  1. smooth    zero-phase Butterworth low-pass (default 6 Hz) on every landmark coordinate, then resample to --fps
  2. lengths   bone-length normalisation: every limb segment fixed to its median length (removes estimator 'stretch')
  3. frame     face +Z, start centred on the origin
  4. feet      foot-contact detection (low + slow) and foot-lock: planted feet are pinned, knees re-solved with
               two-bone IK (lengths kept, bend plane from the original knee), blended in/out over 3 frames
  5. retarget  direction-matching retarget onto the rig's rest pose (no joint-name mapping in the source needed):
               every driven bone gets  G = B(now) * B(rest)^T * G_rest  where B is an orthonormal basis built from
               landmark directions (primary = the bone's own direction, secondary = a twist reference).
               Knees and elbows are solved as hinges from the parent bone; spine = slerp(pelvis, chest).
  6. encode    local quaternions (x,y,z as int16, w >= 0 reconstructed) + pelvis translation (int16, 0.1 mm), base64

The input is the same landmark set MediaPipe BlazePose / FreeMoCap produce, so filmed motion uses this same script.
"""
import sys, json, base64, argparse
import numpy as np
from scipy.signal import butter, filtfilt
from scipy.spatial.transform import Rotation as R, Slerp
from rig import GLTF, Rig

DRIVEN = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head',
          'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r',
          'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r']


def nrm(v):
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-9)


def perp(v, d):
    d = nrm(d)
    return v - np.sum(v * d, -1, keepdims=True) * d


def basis(p, s):
    e1 = nrm(p)
    e2 = nrm(perp(s, e1))
    e3 = np.cross(e1, e2)
    return np.stack([e1, e2, e3], -1)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def rot_between(a, b):
    a, b = nrm(a), nrm(b)
    v = np.cross(a, b)
    c = float(np.dot(a, b))
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1 / (1 + c))


def slerp_m(A, B, t):
    r = R.from_matrix(np.stack([A, B]))
    return Slerp([0, 1], r)([t]).as_matrix()[0]


# ------------------------------------------------------------------------------------------------ cleanup
CHAINS = [('hip_{s}', 'knee_{s}', 'ankle_{s}', 'toe_{s}'), ('ankle_{s}', 'heel_{s}'),
          ('shoulder_{s}', 'elbow_{s}', 'wrist_{s}', 'hand_{s}'), ('wrist_{s}', 'thumb_{s}')]


def cleanup(F, names, fps_in, fps_out, cutoff, inplace, log):
    ix = {n: i for i, n in enumerate(names)}
    # 1. zero-phase low-pass + resample
    if cutoff and cutoff < fps_in / 2:
        b, a = butter(4, cutoff / (fps_in / 2))
        F = filtfilt(b, a, F, axis=0, padtype='odd', padlen=min(len(F) - 1, 3 * max(len(a), len(b))))
    t_in = np.arange(len(F)) / fps_in
    t_out = np.arange(0, t_in[-1] + 1e-9, 1 / fps_out)
    F = np.stack([np.stack([np.interp(t_out, t_in, F[:, j, k]) for k in range(3)], -1) for j in range(F.shape[1])], 1)
    # 2. bone lengths
    for s in 'lr':
        for ch in CHAINS:
            ch = [c.format(s=s) for c in ch]
            for a_, b_ in zip(ch, ch[1:]):
                seg = F[:, ix[b_]] - F[:, ix[a_]]
                L = np.median(np.linalg.norm(seg, axis=-1))
                F[:, ix[b_]] = F[:, ix[a_]] + nrm(seg) * L
                # carry children rigidly is not needed: next segment re-derives from this joint
    # 3. facing +Z, centred start
    hipv = F[:, ix['hip_l']] - F[:, ix['hip_r']]
    n0 = int(min(len(F), fps_out))
    fwd = np.cross(hipv[:n0].mean(0), [0, 1, 0])          # left x up = forward
    ang = np.arctan2(fwd[0], fwd[2])
    Ry = R.from_euler('y', -ang).as_matrix()
    F = F @ Ry.T
    hc = (F[0, ix['hip_l']] + F[0, ix['hip_r']]) / 2
    F[:, :, 0] -= hc[0]
    F[:, :, 2] -= hc[2]
    # 4. foot contact + lock
    slide_before = foot_slide(F, ix, fps_out)
    for s in 'lr':
        A, T_, Hh = ix['ankle_' + s], ix['toe_' + s], ix['heel_' + s]
        low = np.minimum(F[:, T_, 1], F[:, Hh, 1])
        floor = np.percentile(low, 3)
        foot = (F[:, A] + F[:, T_] + F[:, Hh]) / 3
        spd = np.linalg.norm(np.gradient(foot[:, [0, 2]], axis=0), axis=-1) * fps_out
        contact = (low < floor + .035) & (spd < .25)
        # remove blips shorter than 5 frames
        runs = runs_of(contact)
        w = np.zeros(len(F))
        for a, b in runs:
            if b - a < 5:
                continue
            pin = {j: F[a:b, j].mean(0) for j in (A, T_, Hh)}
            for j in pin:
                pin[j][1] = max(pin[j][1], F[a:b, j, 1].min())
            for k in range(max(0, a - 3), min(len(F), b + 3)):
                wk = 1.0 if a <= k < b else (1 - (a - k) / 4 if k < a else 1 - (k - b + 1) / 4)
                for j in pin:
                    F[k, j] = F[k, j] * (1 - wk) + pin[j] * wk
                w[k] = max(w[k], wk)
        # re-solve knees (two-bone IK, keep lengths, bend toward the original knee)
        Hp, K = ix['hip_' + s], ix['knee_' + s]
        l1 = np.median(np.linalg.norm(F[:, K] - F[:, Hp], axis=-1))
        l2 = np.median(np.linalg.norm(F[:, A] - F[:, K], axis=-1))
        for k in np.nonzero(w > 0)[0]:
            F[k, K] = two_bone(F[k, Hp], F[k, A], F[k, K], l1, l2)
        log(f'  foot {s}: {len([r for r in runs if r[1]-r[0] >= 5])} contact phases, {int(contact.sum())} frames planted')
    if inplace:
        hipc = (F[:, ix['hip_l']] + F[:, ix['hip_r']]) / 2
        b, a = butter(2, .4 / (fps_out / 2))
        drift = filtfilt(b, a, hipc, axis=0)
        F[:, :, 0] -= drift[:, None, 0]
        F[:, :, 2] -= drift[:, None, 2]
    log(f'  max planted-foot slide: {slide_before*100:.1f} cm/s before lock -> {foot_slide(F, ix, fps_out)*100:.1f} cm/s after')
    return F


def runs_of(mask):
    out, a = [], None
    for i, m in enumerate(list(mask) + [False]):
        if m and a is None:
            a = i
        elif not m and a is not None:
            out.append((a, i))
            a = None
    return out


def foot_slide(F, ix, fps):
    worst = 0
    for s in 'lr':
        low = np.minimum(F[:, ix['toe_' + s], 1], F[:, ix['heel_' + s], 1])
        planted = low < np.percentile(low, 3) + .02
        v = np.linalg.norm(np.gradient(F[:, ix['ankle_' + s]][:, [0, 2]], axis=0), axis=-1) * fps
        if planted.any():
            worst = max(worst, float(np.percentile(v[planted], 95)))
    return worst


def two_bone(a, c, b0, l1, l2):
    d = c - a
    L = np.linalg.norm(d)
    L = min(max(L, 1e-6), l1 + l2 - 1e-5)
    dn = d / max(np.linalg.norm(d), 1e-9)
    x = (l1 * l1 - l2 * l2 + L * L) / (2 * L)
    h = np.sqrt(max(l1 * l1 - x * x, 0))
    pole = b0 - a
    pole = pole - np.dot(pole, dn) * dn
    pole = pole / max(np.linalg.norm(pole), 1e-9)
    return a + dn * x + pole * h


# ------------------------------------------------------------------------------------------------ retarget
def lm_dict(P, names):
    return {n: P[..., i, :] for i, n in enumerate(names)}


def rig_landmarks(rig):
    h = rig.head
    D = {}
    for s in 'lr':
        D['hip_' + s] = h('thigh_' + s); D['knee_' + s] = h('calf_' + s); D['ankle_' + s] = h('foot_' + s)
        D['toe_' + s] = h('ball_leaf_' + s); D['shoulder_' + s] = h('upperarm_' + s); D['elbow_' + s] = h('lowerarm_' + s)
        D['wrist_' + s] = h('hand_' + s); D['hand_' + s] = (h('index_01_' + s) + h('pinky_01_' + s)) / 2
        D['thumb_' + s] = h('thumb_04_leaf_' + s)
        D['heel_' + s] = h('foot_' + s) + np.array([0, -.06, -.05])
    hd = h('Head')
    D['ear_l'] = hd + [.075, .05, 0]; D['ear_r'] = hd + [-.075, .05, 0]; D['nose'] = hd + [0, .06, .1]
    return D


def frames_for(L, prev=None):
    """per-bone target bases from one frame of landmarks; returns dict bone -> 3x3 basis (columns)"""
    hipC = (L['hip_l'] + L['hip_r']) / 2
    shC = (L['shoulder_l'] + L['shoulder_r']) / 2
    up = shC - hipC
    thighs = -(nrm(L['knee_l'] - L['hip_l']) + nrm(L['knee_r'] - L['hip_r']))
    B = {}
    B['pelvis'] = basis(L['hip_l'] - L['hip_r'], nrm(up) * .7 + nrm(thighs) * .3)
    B['chest'] = basis(L['shoulder_l'] - L['shoulder_r'], up)
    earC = (L['ear_l'] + L['ear_r']) / 2
    B['Head'] = basis(L['ear_l'] - L['ear_r'], L['nose'] - earC)
    for s in 'lr':
        # upper arm: bend plane when bent, else keep the previous frame's twist (or the thumb when there is none)
        d = L['elbow_' + s] - L['shoulder_' + s]
        f = L['wrist_' + s] - L['elbow_' + s]
        pf = perp(f, d)
        wb = smoothstep(.08, .3, np.linalg.norm(pf) / max(np.linalg.norm(f), 1e-9))
        fb = prev['upperarm_' + s][:, 1] if prev is not None else perp(L['thumb_' + s] - L['wrist_' + s], d)
        B['upperarm_' + s] = basis(d, nrm(pf) * wb + nrm(perp(fb, d)) * (1 - wb) + 1e-6)
        # wrist flexion from estimators (and CMU's short hand segment) is noisy: follow the forearm 75 %
        B['hand_' + s] = basis(nrm(f) * .75 + nrm(L['hand_' + s] - L['wrist_' + s]) * .25, L['thumb_' + s] - L['wrist_' + s])
        B['pron_' + s] = basis(f, L['thumb_' + s] - L['wrist_' + s])
        # thigh: knee direction = -(shin perp) when bent, else foot forward
        d = L['knee_' + s] - L['hip_' + s]
        sh = L['ankle_' + s] - L['knee_' + s]
        ps = perp(sh, d)
        wb = smoothstep(.08, .3, np.linalg.norm(ps) / max(np.linalg.norm(sh), 1e-9))
        ff = perp(L['toe_' + s] - L['heel_' + s], d)
        B['thigh_' + s] = basis(d, -nrm(ps) * wb + nrm(ff) * (1 - wb) + 1e-6)
        B['foot_' + s] = basis(L['toe_' + s] - L['ankle_' + s], L['knee_' + s] - L['ankle_' + s])
    return B


def retarget(F, names, rig, log):
    rest = rig_landmarks(rig)
    B0 = frames_for(rest)
    # the rest pose's upper-arm twist reference: the elbow bends toward +Z (palms-down T-pose)
    for s in 'lr':
        d = rest['elbow_' + s] - rest['shoulder_' + s]
        B0['upperarm_' + s] = basis(d, np.array([0, 0, 1.]))
    Grest = {b: rig.rot(b) for b in rig.names}
    Pw = {b: rig.parent_world(b)[:3, :3] for b in rig.names}
    # remove any scale from parent world
    for b in Pw:
        u, _, vt = np.linalg.svd(Pw[b]); Pw[b] = u @ vt
    ix = {n: i for i, n in enumerate(names)}
    # scale + floor
    def leg(P):
        return (np.linalg.norm(P[..., ix['knee_l'], :] - P[..., ix['hip_l'], :], axis=-1) +
                np.linalg.norm(P[..., ix['ankle_l'], :] - P[..., ix['knee_l'], :], axis=-1))
    sc = (np.linalg.norm(rest['knee_l'] - rest['hip_l']) + np.linalg.norm(rest['ankle_l'] - rest['knee_l'])) / np.median(leg(F))
    ank = np.minimum(F[:, ix['ankle_l'], 1], F[:, ix['ankle_r'], 1])
    dy = rest['ankle_l'][1] - np.percentile(ank, 5) * sc
    log(f'  retarget: scale {sc:.3f}, floor offset {dy*100:.1f} cm')
    hipC0 = (rest['hip_l'] + rest['hip_r']) / 2
    pel_off = rig.head('pelvis') - hipC0
    root_w = rig.W[rig.parent['pelvis']]
    root_inv = np.linalg.inv(root_w)
    Q = np.zeros((len(F), len(DRIVEN), 4))
    Tr = np.zeros((len(F), 3))
    prev = None
    GS, PWS = [], []
    for k in range(len(F)):
        L = lm_dict(F[k], names)
        B = frames_for(L, prev)
        prev = B
        D = {key: B[key] @ B0[key].T for key in B0}
        G = {}
        G['pelvis'] = D['pelvis'] @ Grest['pelvis']
        for i, b in ((1, 'spine_01'), (2, 'spine_02'), (3, 'spine_03')):
            G[b] = slerp_m(D['pelvis'], D['chest'], i / 3) @ Grest[b]
        G['neck_01'] = slerp_m(D['chest'], D['Head'], .5) @ Grest['neck_01']
        G['Head'] = D['Head'] @ Grest['Head']
        for s in 'lr':
            G['clavicle_' + s] = D['chest'] @ Grest['clavicle_' + s]
            G['upperarm_' + s] = D['upperarm_' + s] @ Grest['upperarm_' + s]
            # elbow as a hinge from the upper arm, then half of the forearm pronation
            du0 = rest['elbow_' + s] - rest['shoulder_' + s]
            du = L['elbow_' + s] - L['shoulder_' + s]
            dl = L['wrist_' + s] - L['elbow_' + s]
            hinge = rot_between(D['upperarm_' + s] @ (rest['wrist_' + s] - rest['elbow_' + s]), dl) @ G['upperarm_' + s] @ Grest['upperarm_' + s].T @ Grest['lowerarm_' + s]
            pron = D['pron_' + s] @ Grest['lowerarm_' + s]
            G['lowerarm_' + s] = slerp_m(hinge, pron, .5)
            G['hand_' + s] = D['hand_' + s] @ Grest['hand_' + s]
            G['thigh_' + s] = D['thigh_' + s] @ Grest['thigh_' + s]
            dk = L['ankle_' + s] - L['knee_' + s]
            G['calf_' + s] = rot_between(D['thigh_' + s] @ (rest['ankle_' + s] - rest['knee_' + s]), dk) @ G['thigh_' + s] @ Grest['thigh_' + s].T @ Grest['calf_' + s]
            G['foot_' + s] = D['foot_' + s] @ Grest['foot_' + s]
        hipC = (L['hip_l'] + L['hip_r']) / 2
        GS.append(G)
        PWS.append(hipC * sc + np.array([0, dy, 0]) + D['pelvis'] @ pel_off)
    foot_lock_target(GS, PWS, rig, Grest, log)
    for k, G in enumerate(GS):
        for j, b in enumerate(DRIVEN):
            p = rig.parent[b]
            Pg = G[p] if p in G else Pw[b]
            loc = Pg.T @ G[b]
            q = R.from_matrix(loc).as_quat()
            Q[k, j] = q if q[3] >= 0 else -q
        Tr[k] = (root_inv @ np.append(PWS[k], 1))[:3]
    return Q, Tr


def foot_lock_target(GS, PWS, rig, Grest, log, fps=30):
    """Second foot-lock, on the TARGET rig: its legs differ in length from the performer's, so feet that were pinned
    in landmark space can still skate. Find planted phases from the rig's own ankle track, pin each ankle to its mean
    position, re-solve thigh + calf with two-bone IK (knee stays in its plane), keep the foot's world orientation."""
    h = rig.head
    for s in 'lr':
        off_h = Grest['pelvis'].T @ (h('thigh_' + s) - h('pelvis'))
        off_k = Grest['thigh_' + s].T @ (h('calf_' + s) - h('thigh_' + s))
        off_a = Grest['calf_' + s].T @ (h('foot_' + s) - h('calf_' + s))
        l1, l2 = np.linalg.norm(off_k), np.linalg.norm(off_a)
        def chain(k):
            G = GS[k]
            hip = PWS[k] + G['pelvis'] @ off_h
            knee = hip + G['thigh_' + s] @ off_k
            return hip, knee, knee + G['calf_' + s] @ off_a
        A = np.array([chain(k)[2] for k in range(len(GS))])
        floor = np.percentile(A[:, 1], 3)
        spd = np.linalg.norm(np.gradient(A[:, [0, 2]], axis=0), axis=-1) * fps
        contact = (A[:, 1] < floor + .03) & (spd < .3)
        n = 0
        for a, b in runs_of(contact):
            if b - a < 5:
                continue
            n += 1
            pin = A[a:b].mean(0)
            pin[1] = A[a:b, 1].min()
            for k in range(max(0, a - 3), min(len(GS), b + 3)):
                wk = 1.0 if a <= k < b else (1 - (a - k) / 4 if k < a else 1 - (k - b + 1) / 4)
                hip, knee, ank = chain(k)
                goal = ank * (1 - wk) + pin * wk
                knee2 = two_bone(hip, goal, knee, l1, l2)
                G = GS[k]
                r1 = rot_between(knee - hip, knee2 - hip)
                G['thigh_' + s] = r1 @ G['thigh_' + s]
                calf = r1 @ G['calf_' + s]
                r2 = rot_between(calf @ off_a, goal - knee2)
                G['calf_' + s] = r2 @ calf
        log(f'  target foot-lock {s}: {n} planted phases')


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('landmarks'); ap.add_argument('glb'); ap.add_argument('out')
    ap.add_argument('--fps', type=float, default=30); ap.add_argument('--cutoff', type=float, default=6)
    ap.add_argument('--inplace', action='store_true')
    ap.add_argument('--start', type=float, default=0); ap.add_argument('--end', type=float, default=1e9)
    ap.add_argument('--name', default='')
    a = ap.parse_args()
    d = json.load(open(a.landmarks))
    names = d['names']
    F = np.array(d['frames'], float).reshape(len(d['frames']), len(names), 3)
    f0, f1 = int(a.start * d['fps']), min(len(F), int(a.end * d['fps']))
    F = F[f0:f1]
    log = print
    print(f'{a.landmarks}: {len(F)} frames @ {d["fps"]} fps')
    F = cleanup(F, names, d['fps'], a.fps, a.cutoff, a.inplace, log)
    rig = Rig(GLTF(a.glb))
    Q, T = retarget(F, names, rig, log)
    qi = np.round(Q[:, :, :3] * 32767).astype('<i2')
    ti = np.round(np.clip(T * 1e4, -32767, 32767)).astype('<i2')
    out = {'v': 1, 'name': a.name, 'fps': a.fps, 'frames': len(Q), 'bones': DRIVEN, 'rig': 'quaternius-ubc',
           'root': 'pelvis', 'q': b64(qi), 't': b64(ti), 'qScale': 1 / 32767, 'tScale': 1e-4,
           'source': d.get('source', ''), 'cleanup': {'cutoffHz': a.cutoff, 'inplace': a.inplace, 'footLock': True}}
    json.dump(out, open(a.out, 'w'), separators=(',', ':'))
    import os
    print(f'{a.out}: {len(Q)} frames @ {a.fps} fps = {len(Q)/a.fps:.1f} s, {os.path.getsize(a.out)/1024:.0f} KB')


if __name__ == '__main__':
    main()
