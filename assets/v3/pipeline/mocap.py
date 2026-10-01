"""Kitaeru anim v3: real motion capture (ASF/AMC: CMU, HDM05) -> the MakeHuman body (assets/v3/human_{f,m}.glb).

Library for mocap_pilot.py. Python 3 + numpy + scipy only. Everything is in metres, +Y up; the rig faces +Z and its +X is
the body's left (build_body.py: identity rest rotations, so a bone's world rotation IS its pose).

Why not landmarks_to_clip.py: that was written for the Quaternius pilot rig (other bone names, leaf bones) and only sees
23 landmarks. Optical mocap gives us the whole solved skeleton, so this retarget uses it:

  trunk, neck, head, clavicles, feet   the source segment's rotation relative to a quiet standing reference frame of the
                                       same take (so the performer's standing posture == the body's rest posture; fit
                                       offsets of the source skeleton cancel out). Feet keep the performer's toe-out.
  arms                                 basis matching: bone direction from the source joint positions + the source
                                       humerus' own anterior axis for twist; the elbow is a hinge; 60 % of the forearm
                                       pronation goes to the forearm, the rest to the hand (no candy-wrapper wrist)
  legs                                 two-bone IK from this body's hip to the (scaled) source ankle, the knee towards the
                                       source knee, twist from the source femur / tibia
  knees                                source skeleton fits show standing knees at 135-160 deg (they are not that bent):
                                       the knee flexion is remapped so the take's standing flexion becomes ~4 deg while deep
                                       flexion (squat, lunge) is unchanged; the body is lifted over planted feet to suit
Clean-up on the body afterwards (cleanup.py-like, all here): foot lock with two-bone IK and flat feet, a floor clamp from the
skinned sole, hand lock (palms flat on the floor where the source hands rest on it), and a flesh-on-the-floor lift.
"""
import json, os, base64
import numpy as np
from scipy.signal import butter, filtfilt
from scipy.spatial.transform import Rotation as Rot, Slerp
from scipy.interpolate import PchipInterpolator
import cmu_to_landmarks as C
from rig import GLTF, Rig

UP = np.array([0., 1, 0])


# ------------------------------------------------------------------------------------------------ small maths
def nrm(v):
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-9)


def perp(v, d):
    d = nrm(d)
    return v - np.sum(v * d, -1, keepdims=True) * d


def basis(p, s):
    """columns e1 = p, e2 = s made perpendicular, e3 = e1 x e2 (batched over leading axes)"""
    e1 = nrm(p)
    e2 = nrm(perp(s, e1))
    e3 = np.cross(e1, e2)
    return np.stack([e1, e2, e3], -1)


def rot_between(a, b):
    """minimal rotation(s) taking a to b (batched)"""
    a, b = nrm(np.asarray(a, float)), nrm(np.asarray(b, float))
    v = np.cross(a, b)
    c = np.sum(a * b, -1)
    s = np.linalg.norm(v, axis=-1)
    ang = np.arctan2(s, c)
    ax = v / np.maximum(s, 1e-12)[..., None]
    # antiparallel: any perpendicular axis
    bad = s < 1e-9
    if np.any(bad & (c < 0)):
        alt = np.cross(a, np.array([1., 0, 0]))
        alt2 = np.cross(a, np.array([0., 1, 0]))
        alt = np.where((np.linalg.norm(alt, axis=-1) < 1e-6)[..., None], alt2, alt)
        ax = np.where(bad[..., None], nrm(alt), ax)
    return Rot.from_rotvec(ax * ang[..., None]).as_matrix()


def axis_angle(ax, ang):
    return Rot.from_rotvec(nrm(np.asarray(ax, float)) * np.asarray(ang)[..., None]).as_matrix()


def signed_angle(a, b, axis):
    return np.arctan2(np.sum(np.cross(a, b) * axis, -1), np.sum(a * b, -1))


def mT(m):
    return np.swapaxes(m, -1, -2)


def mv(m, v):
    return np.einsum('...ij,...j->...i', m, v)


def yaw_of(v):
    return np.arctan2(v[..., 0], v[..., 2])


def Ry(a):
    a = np.asarray(a, float)
    c, s = np.cos(a), np.sin(a)
    z, o = np.zeros_like(a), np.ones_like(a)
    return np.stack([np.stack([c, z, s], -1), np.stack([z, o, z], -1), np.stack([-s, z, c], -1)], -2)


def slerp_mats(A, B, t):
    """per-frame slerp between rotation stacks A, B (F,3,3) with weights t (F,)"""
    qa = Rot.from_matrix(A).as_quat()
    qb = Rot.from_matrix(B).as_quat()
    d = np.sum(qa * qb, -1)
    qb = np.where(d[:, None] < 0, -qb, qb)
    d = np.abs(d)
    t = np.asarray(t, float) * np.ones(len(qa))
    th = np.arccos(np.clip(d, -1, 1))
    s = np.sin(th)
    w1 = np.where(s > 1e-6, np.sin((1 - t) * th) / np.maximum(s, 1e-9), 1 - t)
    w2 = np.where(s > 1e-6, np.sin(t * th) / np.maximum(s, 1e-9), t)
    q = qa * w1[:, None] + qb * w2[:, None]
    return Rot.from_quat(nrm(q)).as_matrix()


def two_bone(a, c, pole_pt, l1, l2):
    """batched two-bone IK: root a, goal c, knee/elbow towards pole_pt; returns (mid, end, miss)"""
    d = c - a
    L0 = np.linalg.norm(d, axis=-1)
    L = np.clip(L0, np.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-5)
    dn = d / np.maximum(L0, 1e-9)[..., None]
    x = (l1 * l1 - l2 * l2 + L * L) / (2 * L)
    h = np.sqrt(np.maximum(l1 * l1 - x * x, 0))
    pole = perp(pole_pt - a, dn)
    pole = nrm(pole)
    mid = a + dn * x[..., None] + pole * h[..., None]
    return mid, a + dn * L[..., None], L0 - L


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def lowpass(x, fps, cutoff, axis=0):
    if not cutoff or cutoff >= fps / 2 or len(x) < 16:
        return x
    b, a = butter(4, cutoff / (fps / 2))
    return filtfilt(b, a, x, axis=axis, padtype='odd', padlen=min(len(x) - 1, 3 * max(len(a), len(b))))


def runs_of(mask):
    out, a = [], None
    for i, m in enumerate(list(mask) + [False]):
        if m and a is None:
            a = i
        elif not m and a is not None:
            out.append((a, i))
            a = None
    return out


# ------------------------------------------------------------------------------------------------ source: ASF/AMC
def euler_xyz_batch(deg):
    return Rot.from_euler('xyz', deg, degrees=True).as_matrix()


class Take:
    """One ASF/AMC take, forward kinematics for every frame (vectorised). P: bone end positions (m), R: world rotations
    relative to the skeleton's zero pose (which is a T-pose facing +Z, left = +X, Y up, palms down)."""

    def __init__(self, asf, amc, fps=120., label='', cache_dir=None):
        self.label, self.fps, self.asf, self.amc = label, fps, asf, amc
        cache = os.path.join(cache_dir, os.path.basename(amc) + '.fk.npz') if cache_dir else None
        if cache and os.path.exists(cache) and os.path.getmtime(cache) > os.path.getmtime(amc):
            z = np.load(cache)
            self.P = {k[2:]: z[k] for k in z.files if k.startswith('P_')}
            self.R = {k[2:]: z[k] for k in z.files if k.startswith('R_')}
        else:
            self._fk(asf, amc)
            if cache:
                np.savez_compressed(cache, **{'P_' + k: v for k, v in self.P.items()}, **{'R_' + k: v for k, v in self.R.items()})
        self.F = len(self.R['root'])
        # zero-pose geometry (for twist references)
        bones, hier = C.parse_asf(asf)
        self.zero = {}
        pos, rot = C.fk(bones, hier, {'root': [0, 0, 0, 0, 0, 0]})
        self.zero_pos = pos
        for s in 'lr':
            # elbow flexion direction at zero pose: perturb the radius
            hum = nrm(pos[s + 'humerus'] - pos[s + 'clavicle'])
            fr = {'root': [0] * 6, s + 'radius': [40.]}
            p2, _ = C.fk(bones, hier, fr)
            fore = p2[s + 'radius'] - p2[s + 'humerus']
            self.zero['elbow_ant_' + s] = nrm(perp(fore, hum))
            fem = nrm(pos[s + 'femur'] - pos[s + 'hipjoint'])
            self.zero['knee_ant_' + s] = nrm(perp(np.array([0, 0, 1.]), fem))
            tib = nrm(pos[s + 'tibia'] - pos[s + 'femur'])
            self.zero['shin_ant_' + s] = nrm(perp(np.array([0, 0, 1.]), tib))

    def _fk(self, asf, amc):
        bones, hier = C.parse_asf(asf)
        frames = C.parse_amc(amc)
        F = len(frames)
        order, stack = [], ['root']
        while stack:
            p = stack.pop(0)
            for c in hier.get(p, []):
                order.append((p, c))
                stack.append(c)
        rv = np.array([fr['root'] for fr in frames], float)
        P, R = {'root': rv[:, :3] * C.TO_M}, {'root': euler_xyz_batch(rv[:, 3:6])}
        for p, c in order:
            b = bones[c]
            ang = np.zeros((F, 3))
            for k, dof in enumerate(b['dof']):
                col = 'xyz'.index(dof[1])
                ang[:, col] = [fr.get(c, [0] * 3)[k] if len(fr.get(c, [])) > k else 0 for fr in frames]
            L = euler_xyz_batch(ang)
            Cm = b['axis']
            R[c] = R[p] @ (Cm @ L @ Cm.T)
            P[c] = P[p] + mv(R[c], b['dir'] * b['len'] * C.TO_M)
        self.P, self.R = P, R


# ------------------------------------------------------------------------------------------------ the target body
class Body:
    def __init__(self, glb):
        self.glb = glb
        g = GLTF(glb)
        self.rig = rig = Rig(g)
        self.names = rig.names
        self.parent = rig.parent
        self.H = {n: rig.head(n) for n in rig.names}
        h = self.H
        self.off = {n: (h[n] - h[self.parent[n]]) if self.parent[n] else h[n] for n in rig.names}
        self.l_thigh = np.linalg.norm(h['calf_l'] - h['thigh_l'])
        self.l_calf = np.linalg.norm(h['foot_l'] - h['calf_l'])
        self.leg = self.l_thigh + self.l_calf
        self.l_ua = np.linalg.norm(h['lowerarm_l'] - h['upperarm_l'])
        self.l_fa = np.linalg.norm(h['hand_l'] - h['lowerarm_l'])
        self.rest = {}
        for s, side in (('l', 1), ('r', -1)):
            ua, fa = h['lowerarm_' + s] - h['upperarm_' + s], h['hand_' + s] - h['lowerarm_' + s]
            along = h['middle_01_' + s] - h['hand_' + s]
            across = h['index_01_' + s] - h['pinky_01_' + s]
            palm = nrm(np.cross(along, across) * side)
            ant = nrm(perp(fa, ua))
            self.rest['ua_' + s] = basis(ua, ant)
            self.rest['fa_dir_' + s] = nrm(fa)
            self.rest['palm_' + s] = palm
            self.rest['hand_' + s] = basis(along, palm)
            th, ca = h['calf_' + s] - h['thigh_' + s], h['foot_' + s] - h['calf_' + s]
            self.rest['th_' + s] = basis(th, perp(np.array([0, 0, 1.]), th))
            self.rest['ca_' + s] = basis(ca, perp(np.array([0, 0, 1.]), ca))
            f = h['ball_' + s] - h['foot_' + s]
            self.rest['foot_yaw_' + s] = yaw_of(f)
        hipC = (h['thigh_l'] + h['thigh_r']) / 2
        self.hipC = hipC
        self.pel_off = h['pelvis'] - hipC
        self._mesh(g)

    def _mesh(self, g):
        """skinning data: positions, 4 joints, 4 weights (for probes, soles and palms)"""
        prim = g.j['meshes'][0]['primitives'][0]
        A = prim['attributes']
        pos = g.acc(A['POSITION']).astype(float)
        acc = g.j['accessors'][A['POSITION']]
        if acc['componentType'] != 5126:          # KHR_mesh_quantization int16 (build_body.py stores 0.1 mm)
            pos = pos * 1e-4
        js = g.acc(A['JOINTS_0']).astype(int)
        ws = g.acc(A['WEIGHTS_0']).astype(float)
        ws = ws / np.maximum(ws.sum(1, keepdims=True), 1e-9)
        skin = g.j['skins'][0]
        jn = [g.nodes[j]['name'] for j in skin['joints']]
        self.v_pos, self.v_j, self.v_w, self.v_jn = pos, js, ws, jn
        dom = np.array([jn[j] for j in js[np.arange(len(js)), ws.argmax(1)]])
        self.v_dom = dom
        # sole points: lowest vertices of each foot (heel region and toe region), as offsets in the foot / ball frames
        self.sole = {}
        for s in 'lr':
            m = np.isin(dom, ['foot_' + s, 'ball_' + s])
            P = pos[m]
            low = P[P[:, 1] < P[:, 1].min() + .012]
            heel = low[low[:, 2].argmin()]
            toe = low[low[:, 2].argmax()]
            self.sole['heel_' + s] = heel - self.H['foot_' + s]
            self.sole['toe_' + s] = toe - self.H['ball_' + s]
            # palm centre: on the palm surface, between the wrist and the middle-finger knuckle
            hm = np.isin(dom, ['hand_' + s])
            Ph = pos[hm]
            palm_n = self.rest['palm_' + s]
            c = self.H['hand_' + s] * .45 + self.H['middle_01_' + s] * .55
            d = (Ph - c) @ palm_n
            surf = Ph[d > np.percentile(d, 92)]
            self.sole['palm_' + s] = surf.mean(0) - self.H['hand_' + s]
        # probes for the floor: every 7th vertex that is not a hand or foot vertex
        skip = set(n for n in jn if any(n.startswith(p) for p in ('hand', 'foot', 'ball', 'thumb', 'index', 'middle', 'ring', 'pinky')))
        idx = np.array([i for i in range(0, len(pos), 7) if dom[i] not in skip])
        self.probe = idx

    def fk(self, G, pel):
        """world positions of every bone head for world rotations G (dict bone -> (F,3,3); missing = parent's) and
        pelvis head position pel (F,3). Returns P dict, and the completed G."""
        F = len(pel)
        P, GG = {}, {}
        for n in self.names:
            p = self.parent[n]
            if p is None:
                P[n] = np.tile(self.H[n], (F, 1)); GG[n] = np.tile(np.eye(3), (F, 1, 1)); continue
            GG[n] = G[n] if n in G else GG[p]
            P[n] = pel if n == 'pelvis' else P[p] + mv(GG[p], self.off[n])
        return P, GG

    def skin(self, P, GG, idx=None, frames=None):
        """linear-blend skinned vertex positions (F, V, 3) for vertex subset idx"""
        idx = np.arange(len(self.v_pos)) if idx is None else idx
        fr = slice(None) if frames is None else frames
        v = self.v_pos[idx]
        out = 0
        for k in range(4):
            j = self.v_j[idx, k]
            w = self.v_w[idx, k]
            names = [self.v_jn[x] for x in j]
            uniq = sorted(set(names))
            acc = np.zeros((len(P['pelvis'][fr]), len(idx), 3))
            for u in uniq:
                m = np.array([n == u for n in names])
                if not m.any():
                    continue
                Gm, Pm = GG[u][fr], P[u][fr]
                acc[:, m] = np.einsum('fij,vj->fvi', Gm, v[m] - self.H[u]) + Pm[:, None]
            out = out + acc * w[None, :, None]
        return out


# ------------------------------------------------------------------------------------------------ preparing a take
class Prepared:
    """A take (or a time window of it) cleaned up and expressed for one body: positions scaled to the body (rig metres,
    floor y = 0, facing +Z), rotations in rig axes, and the standing reference for the rotation deltas."""
    pass


def prepare(take, body, t0, t1, ref, fps=60., cutoff=6., mirror=False, knee_fix=True, ref_dur=.4, f0=None, log=print):
    """t0, t1: window (s); ref: time (s) of a quiet standing frame inside the take (the rest-pose reference)."""
    fs = take.fps
    i0, i1 = max(0, int(t0 * fs) - 60), min(take.F, int(t1 * fs) + 60)   # 0.5 s pad for the filter
    r0, r1 = int(ref * fs), int((ref + ref_dur) * fs)
    # facing from the reference frame's hips
    hv = (take.P['lhipjoint'][r0:r1] - take.P['rhipjoint'][r0:r1]).mean(0)
    fwd = np.cross(hv, UP)
    ang = np.arctan2(fwd[0], fwd[2])
    A = Ry(-ang)
    Pn, Rn = {}, {}
    for k, v in take.P.items():
        Pn[k] = lowpass(mv(A, v[i0:i1]), fs, cutoff)
    for k, v in take.R.items():
        q = Rot.from_matrix(A @ v[i0:i1] @ A.T).as_quat()
        for i in range(1, len(q)):
            if np.dot(q[i], q[i - 1]) < 0:
                q[i] = -q[i]
        q = nrm(lowpass(q, fs, cutoff))
        Rn[k] = Rot.from_quat(q).as_matrix()
    zero = {k: A @ v for k, v in take.zero.items()}
    # reference rotations (average over the reference window)
    Rref = {}
    for k, v in take.R.items():
        Rref[k] = Rot.from_matrix(A @ v[r0:r1] @ A.T).mean().as_matrix()   # (A acts on the world side only)
    if mirror:
        Pn, Rn, Rref, zero = _mirror(Pn, Rn, Rref, zero)
    # resample to fps
    n_in = len(Pn['root'])
    t_in = (np.arange(n_in) + i0) / fs
    t_out = np.arange(t0, t1 + 1e-9, 1 / fps)
    def rs(x):
        return np.stack([np.interp(t_out, t_in, x[:, k]) for k in range(x.shape[1])], -1)
    P = {k: rs(v) for k, v in Pn.items()}
    R = {}
    for k, v in Rn.items():
        sl = Slerp(t_in, Rot.from_matrix(v))
        R[k] = sl(np.clip(t_out, t_in[0], t_in[-1])).as_matrix()
    pr = Prepared()
    pr.t, pr.fps, pr.F, pr.A, pr.take, pr.mirror = t_out, fps, len(t_out), A, take, mirror
    # landmarks (source names -> ours)
    J = {}
    for s in 'lr':
        J['hip_' + s], J['knee_' + s], J['ankle_' + s] = P[s + 'hipjoint'], P[s + 'femur'], P[s + 'tibia']
        J['ball_' + s], J['toe_' + s] = P[s + 'foot'], P[s + 'toes']
        J['shoulder_' + s], J['elbow_' + s], J['wrist_' + s] = P[s + 'clavicle'], P[s + 'humerus'], P[s + 'radius']
        J['wristb_' + s], J['hand_' + s], J['thumb_' + s] = P[s + 'wrist'], P[s + 'hand'], P[s + 'thumb']
    # scale: this body's leg / the performer's leg
    leg = np.median(np.linalg.norm(J['knee_l'] - J['hip_l'], axis=-1) + np.linalg.norm(J['ankle_l'] - J['knee_l'], axis=-1))
    sc = body.leg / leg
    for k in J:
        J[k] = J[k] * sc
    pr.sc = sc
    # knee remap: the take's standing flexion -> ~4 deg, deep flexion unchanged; planted feet keep their spot (the body
    # rises), free feet swing with the knee
    rr = slice(max(0, int((ref - t0) * fps)), max(1, int((ref - t0 + ref_dur) * fps)))
    pr.knee = {}
    if knee_fix:
        _knee_fix(J, P, R, pr, rr, take, i0, fs, sc, A, mirror, ref, ref_dur, log, f0)
    # floor: the reference ankles at this body's rest ankle height
    ank_ref = np.mean([J['ankle_' + s][rr, 1].mean() for s in 'lr']) if rr.start < pr.F else None
    if ank_ref is None:
        ank_ref = _ref_ankle(take, A, sc, ref, ref_dur, mirror)
    dy = body.H['foot_l'][1] - ank_ref
    # centre: the reference hips at x = z = 0
    hc = (J['hip_l'][rr] + J['hip_r'][rr]).mean(0) / 2 if rr.start < pr.F else np.zeros(3)
    for k in J:
        J[k] = J[k] + np.array([-hc[0], dy, -hc[2]])
    pr.J, pr.R, pr.Rref, pr.zero = J, R, Rref, zero
    pr.foot_yaw = {s: float(yaw_of((J['toe_' + s] - J['ankle_' + s])[rr].mean(0))) for s in 'lr'}
    return pr


def _ref_ankle(take, A, sc, ref, ref_dur, mirror):
    r0, r1 = int(ref * take.fps), int((ref + ref_dur) * take.fps)
    return np.mean([mv(A, take.P[s + 'tibia'][r0:r1])[:, 1].mean() for s in 'lr']) * sc


def _mirror(Pn, Rn, Rref, zero):
    """reflect across the sagittal plane (x -> -x) and swap left / right"""
    M = np.diag([-1., 1, 1])
    SIDED = {a + b for a in 'lr' for b in ('hipjoint', 'femur', 'tibia', 'foot', 'toes', 'clavicle', 'humerus', 'radius', 'wrist', 'hand', 'fingers', 'thumb')}
    sw = lambda k: ('r' + k[1:] if k[0] == 'l' else 'l' + k[1:]) if k in SIDED else k
    sw2 = lambda k: k[:-1] + ('r' if k[-1] == 'l' else 'l') if k[-2:] in ('_l', '_r') else k
    P2 = {sw(k): v * np.array([-1., 1, 1]) for k, v in Pn.items()}
    R2 = {sw(k): M @ v @ M for k, v in Rn.items()}
    Rr2 = {sw(k): M @ v @ M for k, v in Rref.items()}
    z2 = {sw2(k): v * np.array([-1., 1, 1]) for k, v in zero.items()}
    return P2, R2, Rr2, z2


def knee_remap(f, f0, keep=4.):
    """flexion f (deg) -> f': f0 (standing) -> keep, 0 -> 0, above f0 + 70 unchanged, smooth and monotonic between"""
    f = np.asarray(f, float)
    lo = keep * f / max(f0, 1e-6)
    hi = f - (f0 - keep) * (1 - smoothstep(f0, f0 + 70, f))
    return np.where(f <= f0, lo, hi)


def _knee_fix(J, P, R, pr, rr, take, i0, fs, sc, A, mirror, ref, ref_dur, log, f0o=None):
    F = len(J['hip_l'])
    disp_num, disp_den = np.zeros((F, 3)), np.zeros(F)
    new = {}
    for s in 'lr':
        H, K, Aa = J['hip_' + s], J['knee_' + s], J['ankle_' + s]
        l1 = np.median(np.linalg.norm(K - H, axis=-1)); l2 = np.median(np.linalg.norm(Aa - K, axis=-1))
        u, v = nrm(K - H), nrm(Aa - K)
        f = np.degrees(np.arccos(np.clip(np.sum(u * v, -1), -1, 1)))
        if f0o:
            f0 = float(f0o[s])
        elif rr.start < F:
            f0 = float(np.median(f[rr]))
        else:
            r0, r1 = int(ref * fs), int((ref + ref_dur) * fs)
            Pk = take.P
            uu = nrm(Pk[s + 'femur'][r0:r1] - Pk[s + 'hipjoint'][r0:r1]); vv = nrm(Pk[s + 'tibia'][r0:r1] - Pk[s + 'femur'][r0:r1])
            f0 = float(np.median(np.degrees(np.arccos(np.clip(np.sum(uu * vv, -1), -1, 1)))))
        f2 = knee_remap(f, f0)
        D = np.linalg.norm(Aa - H, axis=-1)
        D2 = np.sqrt(l1 * l1 + l2 * l2 + 2 * l1 * l2 * np.cos(np.radians(f2)))
        dirHA = nrm(Aa - H)
        # contact weight: ankle low and slow
        low = Aa[:, 1] - np.percentile(Aa[:, 1], 2)
        spd = np.linalg.norm(np.gradient(Aa[:, [0, 2]], axis=0), axis=-1) * pr.fps
        w = (1 - smoothstep(.03, .08, low)) * (1 - smoothstep(.25, .6, spd))
        own = (D2 - D)[:, None] * -dirHA
        disp_num += w[:, None] * own
        disp_den += w
        pr.knee[s] = {'f0': f0, 'l1': l1, 'l2': l2}
        new[s] = (f, f2, w, l1, l2, own)
        log(f'  knee {s}: standing flexion {f0:.0f} deg -> 4 deg')
    has = disp_den > 1e-3
    disp = np.zeros((F, 3))
    disp[has] = disp_num[has] / disp_den[has][:, None]
    if has.any() and not has.all():
        idx = np.arange(F)
        for k in range(3):
            disp[~has, k] = np.interp(idx[~has], idx[has], disp[has, k])
    disp = lowpass(disp, pr.fps, 3.)
    for s in 'lr':
        f, f2, w, l1, l2, own = new[s]
        H0, K0, A0 = J['hip_' + s].copy(), J['knee_' + s].copy(), J['ankle_' + s].copy()
        # this leg's hip: its own lift where its foot is planted (so each planted leg gets exactly its remapped knee; the
        # pelvis may tilt by a few tenths of a degree), the body's mean lift elsewhere
        wl = lowpass(w, pr.fps, 3.)[:, None]
        Hn = H0 + own * wl + disp * (1 - wl)
        # free leg: the hip -> ankle line kept, the leg lengthened to the remapped knee (as a planted leg, where the hip
        # moves along that line instead)
        D2 = np.sqrt(l1 * l1 + l2 * l2 + 2 * l1 * l2 * np.cos(np.radians(f2)))
        Afree = Hn + nrm(A0 - H0) * D2[:, None]
        tgt = A0 * w[:, None] + Afree * (1 - w[:, None])
        mid, end, _ = two_bone(Hn, tgt, K0 + disp + (K0 - (H0 + A0) / 2), l1, l2)
        dA = end - A0
        J['hip_' + s], J['knee_' + s], J['ankle_' + s] = Hn, mid, end
        for k in ('ball_', 'toe_'):
            J[k + s] = J[k + s] + dA
    for k in list(J):
        if k.split('_')[0] in ('shoulder', 'elbow', 'wrist', 'wristb', 'hand', 'thumb'):
            J[k] = J[k] + disp
    pr.disp = disp


# ------------------------------------------------------------------------------------------------ retarget
DRIVEN = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', 'clavicle_l', 'upperarm_l', 'lowerarm_l', 'hand_l',
          'clavicle_r', 'upperarm_r', 'lowerarm_r', 'hand_r', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r']


def retarget(pr, body):
    """-> Motion: world rotations of the driven bones (F,3,3) and the pelvis head position (F,3)"""
    J, R, Rr, z = pr.J, pr.R, pr.Rref, pr.zero
    F = pr.F
    delta = lambda b: R[b] @ Rr[b].T
    G = {}
    G['pelvis'] = delta('root')
    G['spine_01'], G['spine_02'], G['spine_03'] = delta('lowerback'), delta('upperback'), delta('thorax')
    G['neck_01'] = slerp_mats(delta('lowerneck'), delta('upperneck'), .5)
    G['head'] = delta('head')
    hipC = (J['hip_l'] + J['hip_r']) / 2
    pel = hipC + mv(G['pelvis'], body.pel_off)
    for s in 'lr':
        G['clavicle_' + s] = delta(s + 'clavicle')
    P, GG = body.fk(G, pel)
    for s in 'lr':
        # ---- arm
        sh = P['upperarm_' + s]
        d = J['elbow_' + s] - J['shoulder_' + s]
        ant = mv(R[s + 'humerus'], z['elbow_ant_' + s])
        Gua = basis(d, ant) @ mT(body.rest['ua_' + s])
        G['upperarm_' + s] = Gua
        fdir = nrm(J['wrist_' + s] - J['elbow_' + s])
        hinge = rot_between(mv(Gua, body.rest['fa_dir_' + s]), fdir) @ Gua
        side = 1 if s == 'l' else -1
        along = nrm(J['hand_' + s] - J['wrist_' + s])
        across = perp(J['thumb_' + s] - J['wristb_' + s], along)
        palm = nrm(np.cross(along, across) * side)
        pn0 = mv(hinge, body.rest['palm_' + s])
        tw = signed_angle(nrm(perp(pn0, fdir)), nrm(perp(palm, fdir)), fdir)
        G['lowerarm_' + s] = axis_angle(fdir, .6 * tw) @ hinge
        G['hand_' + s] = basis(along, palm) @ mT(body.rest['hand_' + s])
        # ---- leg: IK from this body's hip along the source's own hip -> ankle vector (scaled to this leg), so a straight
        # source leg stays straight even where the source pelvis and this body's pelvis disagree by a centimetre or two
        hip = P['thigh_' + s]
        kn = pr.knee.get(s)
        lsrc = (kn['l1'] + kn['l2']) if kn else np.median(np.linalg.norm(J['knee_' + s] - J['hip_' + s], axis=-1) + np.linalg.norm(J['ankle_' + s] - J['knee_' + s], axis=-1))
        k = body.leg / lsrc
        tgt = hip + (J['ankle_' + s] - J['hip_' + s]) * k
        pole = hip + (J['knee_' + s] - J['hip_' + s]) * k
        mid, end, _ = two_bone(hip, tgt, pole + (pole - (hip + tgt) / 2), body.l_thigh, body.l_calf)
        kant = mv(R[s + 'femur'], z['knee_ant_' + s])
        sant = mv(R[s + 'tibia'], z['shin_ant_' + s])
        G['thigh_' + s] = basis(mid - hip, kant) @ mT(body.rest['th_' + s])
        G['calf_' + s] = basis(end - mid, sant) @ mT(body.rest['ca_' + s])
        # ---- foot: rotation relative to the reference (yaw added below, so the performer's toe-out is kept)
        G['foot_' + s] = delta(s + 'foot')
        G['ball_' + s] = delta(s + 'toes')
    # toe-out: the reference foot yaw relative to the pelvis, applied in the pelvis-yaw frame
    for s in 'lr':
        y = pr.foot_yaw[s] if hasattr(pr, 'foot_yaw') else 0.
        Yo = Ry(np.array(y - body.rest['foot_yaw_' + s]))
        G['foot_' + s] = G['foot_' + s] @ Yo
        G['ball_' + s] = G['ball_' + s] @ Yo
    m = Motion(pr.fps, {k: G[k] for k in DRIVEN}, pel)
    return m


def foot_yaw_ref(pr, ref_idx):
    """the performer's toe-out at the reference frames (relative to straight ahead), per side"""
    out = {}
    for s in 'lr':
        f = (pr.J['toe_' + s] - pr.J['ankle_' + s])[ref_idx].mean(0)
        out[s] = float(yaw_of(f))
    return out


# ------------------------------------------------------------------------------------------------ motion (on the body)
class Motion:
    """world rotations G (bone -> (F,3,3)) and pelvis head position pel (F,3) at fps"""

    def __init__(self, fps, G, pel):
        self.fps, self.G, self.pel = fps, G, pel

    @property
    def F(self):
        return len(self.pel)

    def sample(self, times):
        """resample at fractional source times (s): slerp per bone, lerp for the pelvis"""
        x = np.clip(np.asarray(times, float) * self.fps, 0, self.F - 1)
        i0 = np.floor(x).astype(int)
        i1 = np.minimum(i0 + 1, self.F - 1)
        u = x - i0
        G = {k: slerp_mats(v[i0], v[i1], u) for k, v in self.G.items()}
        pel = self.pel[i0] * (1 - u)[:, None] + self.pel[i1] * u[:, None]
        return Motion(self.fps, G, pel)

    def slice(self, a, b):
        return Motion(self.fps, {k: v[a:b] for k, v in self.G.items()}, self.pel[a:b])

    def copy(self):
        return Motion(self.fps, {k: v.copy() for k, v in self.G.items()}, self.pel.copy())


def concat(ms, fps):
    G = {k: np.concatenate([m.G[k] for m in ms]) for k in ms[0].G}
    return Motion(fps, G, np.concatenate([m.pel for m in ms]))


def crossfade(a, b, n):
    """a then b, the last n frames of a blended into the first n of b (b's first frame is reached)"""
    if n <= 0:
        return concat([a, b], a.fps)
    n = min(n, a.F, b.F)
    w = smoothstep(0, 1, (np.arange(n) + 1) / (n + 1))
    G = {}
    for k in a.G:
        mid = slerp_mats(a.G[k][-n:], b.G[k][:n], w)
        G[k] = np.concatenate([a.G[k][:-n], mid, b.G[k][n:]])
    pm = a.pel[-n:] * (1 - w)[:, None] + b.pel[:n] * w[:, None]
    return Motion(a.fps, G, np.concatenate([a.pel[:-n], pm, b.pel[n:]]))


def warp(m, knots_src, knots_out, fps_out):
    """time-warp: monotone cubic map from output time to source time through the knots (s)"""
    f = PchipInterpolator(knots_out, knots_src)
    t = np.arange(0, knots_out[-1] - 1e-9, 1 / fps_out)
    out = m.sample(f(t))
    out.fps = fps_out
    return out


def loop_seam(m, n):
    """make a cycle seamless: blend its last n frames towards the frames just before its first one (cyclic)"""
    F = m.F
    n = min(n, F // 3)
    w = smoothstep(0, 1, (np.arange(n) + 1) / (n + 1))
    # the pose the end should become: the start, approached the way the start was approached (the frames before it are
    # not available; use the start's own first frames shifted): blend towards frames 0..n-1 mapped onto the last n
    G = {}
    for k, v in m.G.items():
        tail = v[F - n:]
        tgt = np.concatenate([v[:1]] * n)
        G[k] = v.copy()
        G[k][F - n:] = slerp_mats(tail, tgt, w)
    pel = m.pel.copy()
    pel[F - n:] = m.pel[F - n:] * (1 - w)[:, None] + m.pel[:1] * w[:, None]
    return Motion(m.fps, G, pel)


# ------------------------------------------------------------------------------------------------ clean-up on the body
def sole_points(body, P, GG, s):
    heel = P['foot_' + s] + mv(GG['foot_' + s], body.sole['heel_' + s])
    toe = P['ball_' + s] + mv(GG['ball_' + s], body.sole['toe_' + s])
    return heel, toe


def palm_point(body, P, GG, s):
    return P['hand_' + s] + mv(GG['hand_' + s], body.sole['palm_' + s])


def flatten(Gf):
    """the same heading, pitch and roll removed: the sole parallel to the floor"""
    f = mv(Gf, np.array([0, 0, 1.]))
    return Ry(yaw_of(f))


def foot_lock(m, body, cyclic=False, log=print, flat_tol=.03, contact_h=.025, speed=.3, min_len=4, fix_floor=True):
    """planted feet: the toe point (ball of the foot) is pinned at its phase mean, the leg re-solved with two-bone IK; the foot
    laid flat (heading kept) when heel and toe are both down, otherwise it keeps its roll (landing on the balls of the
    feet, heel rising); afterwards no sole point below the floor."""
    G, pel = {k: v.copy() for k, v in m.G.items()}, m.pel.copy()
    F = m.F
    stats = {}
    for it in range(2):
        P, GG = body.fk(G, pel)
        for s in 'lr':
            heel, toe = sole_points(body, P, GG, s)
            ball = P['ball_' + s]
            low = np.minimum(heel[:, 1], toe[:, 1])
            if cyclic:
                ext = np.concatenate([ball[-2:], ball, ball[:2]])
                spd = np.linalg.norm(np.gradient(ext[:, [0, 2]], axis=0)[2:-2], axis=-1) * m.fps
            else:
                spd = np.linalg.norm(np.gradient(ball[:, [0, 2]], axis=0), axis=-1) * m.fps
            contact = (low < max(0, np.percentile(low, 2)) + contact_h) & (spd < speed)
            runs = [r for r in _cyc_runs(contact, cyclic) if r[1] - r[0] >= min_len]
            stats[s] = len(runs)
            for a, b in runs:
                ks = np.arange(a, b) % F
                base = max(0, low[ks].min())
                flat = (heel[ks, 1] < base + flat_tol).mean() > .5 and (toe[ks, 1] < base + flat_tol).mean() > .5
                Gf = G['foot_' + s][ks]
                ball_local = mT(Gf) @ G['ball_' + s][ks]
                if flat:
                    Gf2 = np.tile(Rot.from_matrix(flatten(Gf)).mean().as_matrix(), (len(ks), 1, 1))
                else:
                    Gf2 = Gf
                Gb2 = Gf2 @ ball_local
                ball_off = mv(Gf2, body.off['ball_' + s])                    # ankle -> ball joint (the pivot)
                tip = ball_off + mv(Gb2, body.sole['toe_' + s])               # ankle -> toe tip (sole)
                heel_off = mv(Gf2, body.sole['heel_' + s])
                pin = ball[ks].mean(0)
                # the lowest sole point (heel or toe tip) at 4 mm
                pin[1] = .004 + float(np.max(ball_off[:, 1] - np.minimum(tip[:, 1], heel_off[:, 1])))
                toe_off = ball_off
                ramp = 3
                for k in range(a - ramp, b + ramp):
                    if not cyclic and (k < 0 or k >= F):
                        continue
                    kk = k % F
                    wk = 1.0 if a <= k < b else (1 - (a - k) / (ramp + 1) if k < a else 1 - (k - b + 1) / (ramp + 1))
                    j = min(max(k - a, 0), len(ks) - 1)
                    _leg_to(G, P, pel, body, s, kk, pin - toe_off[j], wk, Gf2[j])
        P, GG = body.fk(G, pel)
    if fix_floor:
        P, GG = body.fk(G, pel)
        for s in 'lr':
            heel, toe = sole_points(body, P, GG, s)
            low = np.minimum(heel[:, 1], toe[:, 1])
            pen = np.minimum(low - .002, 0)
            for k in np.nonzero(pen < 0)[0]:     # lift a sinking foot by IK (not the body)
                tgt = P['foot_' + s][k] - np.array([0, pen[k], 0])
                _leg_to(G, P, pel, body, s, k, tgt, 1.0, None)
    log(f'  foot lock: planted phases L {stats.get("l", 0)}, R {stats.get("r", 0)}')
    return Motion(m.fps, G, pel)


def _cyc_runs(mask, cyclic):
    runs = runs_of(mask)
    if cyclic and len(runs) > 1 and runs[0][0] == 0 and runs[-1][1] == len(mask):
        a = runs.pop()
        r0 = runs.pop(0)
        runs.append((a[0], r0[1] + len(mask)))
    elif cyclic and len(runs) == 1 and runs[0] == (0, len(mask)):
        pass
    return runs


def _leg_to(G, P, pel, body, s, k, pin, wk, Gfoot):
    """re-solve one leg at frame k so the ankle goes (weight wk) to pin; optionally set the foot's world rotation"""
    hip = P['thigh_' + s][k]
    knee = hip + G['thigh_' + s][k] @ body.off['calf_' + s]
    ank = knee + G['calf_' + s][k] @ body.off['foot_' + s]
    goal = ank * (1 - wk) + pin * wk
    mid, end, _ = two_bone(hip[None], goal[None], knee[None] + (knee - (hip + ank) / 2)[None], body.l_thigh, body.l_calf)
    mid, end = mid[0], end[0]
    r1 = rot_between(knee - hip, mid - hip)
    G['thigh_' + s][k] = r1 @ G['thigh_' + s][k]
    calf = r1 @ G['calf_' + s][k]
    r2 = rot_between(calf @ body.off['foot_' + s], end - mid)
    G['calf_' + s][k] = r2 @ calf
    if Gfoot is not None and wk > 0:
        ball_local = G['foot_' + s][k].T @ G['ball_' + s][k]
        Gf = slerp_mats(G['foot_' + s][k][None], Gfoot[None], np.array([wk]))[0]
        G['foot_' + s][k] = Gf
        G['ball_' + s][k] = Gf @ ball_local
    P['foot_' + s][k] = end


def _hand_phases(m, body, P, GG, cyclic, h, speed, min_len, sides):
    """palm-on-floor phases per side: [(side, frames, flat hand rotations, pin)]"""
    F = m.F
    out = []
    for s in sides:
        pp = palm_point(body, P, GG, s)
        spd = np.linalg.norm(np.gradient(pp[:, [0, 2]], axis=0), axis=-1) * m.fps
        contact = (pp[:, 1] < h) & (spd < speed)
        for a, b in [r for r in _cyc_runs(contact, cyclic) if r[1] - r[0] >= min_len]:
            ks = np.arange(a, b) % F
            Gh = m.G['hand_' + s][ks]
            along_now = mv(Gh, nrm(body.H['middle_01_' + s] - body.H['hand_' + s]))
            along_f = nrm(along_now * np.array([1, 0, 1]))
            Gflat = basis(along_f, np.tile([0, -1., 0], (len(ks), 1))) @ mT(body.rest['hand_' + s])
            Gflat = Rot.from_matrix(Gflat).mean().as_matrix()
            pin = pp[ks].mean(0)
            pin[1] = .006
            out.append((s, a, b, ks, Gflat, pin))
    return out


def hand_lock(m, body, cyclic=False, log=print, h=.05, speed=.25, min_len=4, sides='lr', max_shift=.12):
    """palms resting on the floor: pinned, laid flat (palm down, heading kept), the arm re-solved with two-bone IK.
    This body's trunk and arms are not the performer's (scaled by leg length, the CMU performers have longer trunks), so a
    planted hand can be out of reach: then the whole body moves towards the hands (up to max_shift; the feet are re-pinned
    by the next foot lock), and only what is still missing moves the palm spot horizontally towards the shoulder."""
    G, pel = {k: v.copy() for k, v in m.G.items()}, m.pel.copy()
    F = m.F
    P, GG = body.fk(G, pel)
    ph = _hand_phases(m, body, P, GG, cyclic, h, speed, min_len, sides)
    Lr = .995 * (body.l_ua + body.l_fa)
    # pass 1: body shift where a planted hand cannot reach
    sh_num, sh_den = np.zeros((F, 3)), np.zeros(F)
    for s, a, b, ks, Gflat, pin in ph:
        wg = pin - Gflat @ body.sole['palm_' + s]
        d = wg - P['upperarm_' + s][ks]
        L = np.linalg.norm(d, axis=-1)
        miss = np.maximum(0, L - Lr)
        sh_num[ks] += d / np.maximum(L, 1e-9)[:, None] * miss[:, None]
        sh_den[ks] += 1
    shift = np.where(sh_den[:, None] > 0, sh_num / np.maximum(sh_den, 1)[:, None], 0)
    shift = lowpass(shift, m.fps, 1.5) if F > 16 else shift
    nrm_s = np.linalg.norm(shift, axis=-1)
    shift = shift * np.minimum(1, max_shift / np.maximum(nrm_s, 1e-9))[:, None]
    pel = pel + shift
    P, GG = body.fk(G, pel)
    # pass 2: pins (pulled towards the shoulder only for what is still out of reach), arms re-solved
    gaps, pulls, n = [], [], {'l': 0, 'r': 0}
    for s, a, b, ks, Gflat, pin in ph:
        n[s] += 1
        pull = 0.
        for k in ks:
            sh = P['upperarm_' + s][k]
            hv = np.array([sh[0] - pin[0], 0, sh[2] - pin[2]])
            hn = np.linalg.norm(hv)
            while pull < min(hn, .3):
                cand = pin + hv / max(hn, 1e-9) * pull
                if np.linalg.norm(cand - Gflat @ body.sole['palm_' + s] - sh) <= Lr:
                    break
                pull += .005
        if pull > 0:
            sh0 = P['upperarm_' + s][ks].mean(0)
            hv = np.array([sh0[0] - pin[0], 0, sh0[2] - pin[2]])
            pin = pin + hv / max(np.linalg.norm(hv), 1e-9) * pull
        pulls.append(pull)
        pp = palm_point(body, P, GG, s)
        ramp = 3
        for k in range(a - ramp, b + ramp):
            if not cyclic and (k < 0 or k >= F):
                continue
            kk = k % F
            wk = 1.0 if a <= k < b else (1 - (a - k) / (ramp + 1) if k < a else 1 - (k - b + 1) / (ramp + 1))
            Gh2 = slerp_mats(G['hand_' + s][kk][None], Gflat[None], np.array([wk]))[0]
            goal_palm = pp[kk] * (1 - wk) + pin * wk
            gap = _arm_to(G, P, body, s, kk, goal_palm - Gh2 @ body.sole['palm_' + s])
            G['hand_' + s][kk] = Gh2
            if a <= k < b:
                gaps.append(gap)
        P, GG = body.fk(G, pel)
    gaps = np.array(gaps) if gaps else np.zeros(1)
    pull = max(pulls) if pulls else 0.
    log(f'  hand lock: palm phases L {n["l"]}, R {n["r"]}; body moved up to {nrm_s.max()*100:.1f} cm towards the hands, '
        f'palms moved up to {pull*100:.1f} cm nearer the body; left unreachable by up to {gaps.max()*100:.1f} cm')
    return Motion(m.fps, G, pel), float(gaps.max()), float(pull), float(min(nrm_s.max(), max_shift))


def _arm_to(G, P, body, s, k, goal):
    sh = P['upperarm_' + s][k]
    el = sh + G['upperarm_' + s][k] @ body.off['lowerarm_' + s]
    wr = el + G['lowerarm_' + s][k] @ body.off['hand_' + s]
    mid, end, miss = two_bone(sh[None], goal[None], el[None] + (el - (sh + wr) / 2)[None], body.l_ua, body.l_fa)
    mid, end = mid[0], end[0]
    r1 = rot_between(el - sh, mid - sh)
    G['upperarm_' + s][k] = r1 @ G['upperarm_' + s][k]
    fa = r1 @ G['lowerarm_' + s][k]
    r2 = rot_between(fa @ body.off['hand_' + s], end - mid)
    G['lowerarm_' + s][k] = r2 @ fa
    return max(0., float(miss[0]))


def floor_lift(m, body, log=print, keep_feet=True):
    """flesh on the floor: where any probe (torso, head, thighs, upper arms) is below y = 0.004, lift the pelvis; feet and
    hands keep their places (legs and arms re-solved), so a kneeling or prone body rests on the floor instead of in it"""
    G, pel = {k: v.copy() for k, v in m.G.items()}, m.pel.copy()
    P, GG = body.fk(G, pel)
    V = body.skin(P, GG, body.probe)
    low = V[:, :, 1].min(1)
    lift = np.maximum(0, .004 - low)
    lift = np.maximum(lift, lowpass(lift, m.fps, 2.))
    if lift.max() > 1e-4:
        Pfoot = {s: P['foot_' + s].copy() for s in 'lr'}
        Ppalm = {s: palm_point(body, P, GG, s) for s in 'lr'}
        pel = pel + np.outer(lift, UP)
        P, GG = body.fk(G, pel)
        for k in np.nonzero(lift > 1e-4)[0]:
            for s in 'lr':
                if keep_feet and Pfoot[s][k][1] < .12:
                    _leg_to(G, P, pel, body, s, k, Pfoot[s][k], 1.0, None)
                if Ppalm[s][k][1] < .05:
                    _arm_to(G, P, body, s, k, Ppalm[s][k] - mv(G['hand_' + s][k], body.sole['palm_' + s]))
    log(f'  floor: lifted the body by up to {lift.max()*100:.1f} cm where flesh met the floor')
    return Motion(m.fps, G, pel), float(lift.max())


# ------------------------------------------------------------------------------------------------ fingers
FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky']
SHAPES = {   # degrees per joint (as js/anim/v3/retarget.js)
    'relaxed': {'f': [14, 22, 14], 't': [-8, 10, 8]},
    'palm': {'f': [-10, -12, -8], 't': [-40, 0, 0]},
    'prayer': {'f': [-4, -4, -2], 't': [-20, 0, 0]},
    'soft': {'f': [6, 10, 6], 't': [-10, 4, 2]},
}


def finger_locals(body, shape):
    """constant local rotations (bone -> 3x3) of the finger joints for a hand shape"""
    sh = SHAPES[shape]
    out = {}
    for s in 'lr':
        for f in FINGERS:
            a = nrm(body.H[f'{f}_02_{s}'] - body.H[f'{f}_01_{s}'])
            ax = nrm(np.cross(a, body.rest['palm_' + s]))
            c = sh['t'] if f == 'thumb' else sh['f']
            for k in (1, 2, 3):
                n = f'{f}_0{k}_{s}'
                if n in body.H:
                    out[n] = axis_angle(ax, np.radians(c[k - 1]))
    return out


# ------------------------------------------------------------------------------------------------ encode
def to_local(m, body):
    """local quaternions of the driven bones and the pelvis local position"""
    P, GG = body.fk(m.G, m.pel)
    Q = {}
    for b in DRIVEN:
        p = body.parent[b]
        Q[b] = Rot.from_matrix(mT(GG[p]) @ GG[b]).as_quat()
    root = body.parent['pelvis']
    return Q, m.pel - body.H[root]


def finger_meta(body, track, fps):
    """{'shapes': {shape: {bone: quat}}, 'track': {'l': [[t, shape], ...], 'r': [...]}}: the player cross-fades shapes"""
    tracks = track if isinstance(track, dict) else {'l': track, 'r': track}
    used = sorted({sh for tr in tracks.values() for _, sh in tr})
    shapes = {sh: {b: [round(float(x), 5) for x in Rot.from_matrix(R).as_quat()] for b, R in finger_locals(body, sh).items()} for sh in used}
    return {'shapes': shapes, 'track': {s: [[round(f / fps, 3), sh] for f, sh in tr] for s, tr in tracks.items()}, 'fade': .25}


def encode(Q, tl, fps, meta, eps_deg=.3):
    """kclip v2: tracks only for bones that move; 'fixed' for bones whose rotation stays put (fingers mostly)"""
    bones, fixed, arrs = [], {}, []
    for b, q in Q.items():
        q = np.where(q[:, 3:4] < 0, -q, q)
        ang = 2 * np.degrees(np.arccos(np.clip(np.abs(np.sum(q * q[:1], -1)), 0, 1)))
        if ang.max() < eps_deg and b != 'pelvis':
            fixed[b] = [round(float(x), 5) for x in q[0]]
        else:
            bones.append(b)
            arrs.append(q)
    Qa = np.stack(arrs, 1)                     # F, B, 4
    qi = np.round(Qa[:, :, :3] * 32767).astype('<i2')
    ti = np.round(np.clip(tl * 1e4, -32767, 32767)).astype('<i2')
    b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
    out = {'v': 2, 'rig': 'makehuman-ge', 'fps': fps, 'frames': len(Qa), 'bones': bones, 'root': 'pelvis',
           'q': b64(qi), 't': b64(ti), 'qScale': 1 / 32767, 'tScale': 1e-4, 'fixed': fixed, **meta}
    return out


# ------------------------------------------------------------------------------------------------ hands: prayer, finger shapes
def palms_together(m, body, near=.13, full=.06, log=print):
    """where the palms nearly meet in front of the body (prayer), close the gap: both palms to their midpoint, facing each
    other, the arms re-solved (this body's shoulders are not the performer's, so captured palms can miss by a few cm)"""
    G, pel = {k: v.copy() for k, v in m.G.items()}, m.pel.copy()
    P, GG = body.fk(G, pel)
    pl, pr = palm_point(body, P, GG, 'l'), palm_point(body, P, GG, 'r')
    d = np.linalg.norm(pl - pr, axis=-1)
    high = np.minimum(pl[:, 1], pr[:, 1]) > P['pelvis'][:, 1]
    w = (1 - smoothstep(full, near, d)) * high
    w = np.maximum(w, lowpass(w, m.fps, 2.)) if m.F > 16 else w
    n = 0
    for k in np.nonzero(w > .01)[0]:
        mid = (pl[k] + pr[k]) / 2
        for s, other in (('l', pr[k]), ('r', pl[k])):
            me = pl[k] if s == 'l' else pr[k]
            Gh = G['hand_' + s][k]
            pn = Gh @ body.rest['palm_' + s]
            want = nrm(other - me) if np.linalg.norm(other - me) > 1e-3 else pn
            Gh2 = rot_between(pn, want) @ Gh
            Gh2 = slerp_mats(Gh[None], Gh2[None], np.array([w[k]]))[0]
            goal = me * (1 - w[k]) + (mid - want * .004) * w[k]
            _arm_to(G, P, body, s, k, goal - Gh2 @ body.sole['palm_' + s])
            G['hand_' + s][k] = Gh2
        n += 1
    log(f'  palms together: {n} frames')
    return Motion(m.fps, G, pel)


def auto_fingers(m, body, floor_h=.07, together=.08, min_run=6):
    """finger shape per hand per frame: 'palm' (flat) where the palm rests on the floor, 'prayer' where the palms meet,
    else 'relaxed'; short runs merged. Returns {'l': [(frame, shape), ...], 'r': [...]}"""
    P, GG = body.fk(m.G, m.pel)
    pl, pr = palm_point(body, P, GG, 'l'), palm_point(body, P, GG, 'r')
    d = np.linalg.norm(pl - pr, axis=-1)
    out = {}
    for s, pp in (('l', pl), ('r', pr)):
        lab = np.array(['relaxed'] * m.F, dtype=object)
        lab[d < together] = 'prayer'
        lab[pp[:, 1] < floor_h] = 'palm'
        # merge short runs into the previous one
        runs, a = [], 0
        for i in range(1, m.F + 1):
            if i == m.F or lab[i] != lab[a]:
                runs.append([a, i, lab[a]]); a = i
        for i in range(len(runs)):
            if runs[i][1] - runs[i][0] < min_run and i > 0:
                runs[i][2] = runs[i - 1][2]
        track, cur = [], None
        for a, b, l in runs:
            if l != cur:
                track.append((a, l)); cur = l
        out[s] = track
    return out
