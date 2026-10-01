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
BODY = {}            # the body being built (set by the clip builder: local-space blends need its hierarchy)
SOFT = .012         # soft IK margin for the clean-up passes and the leg retarget (see soft_reach)


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


def soft_reach(L, Lmax, soft):
    """soft IK: the reach eases into full extension (L -> Lmax only asymptotically) instead of hitting it. Near a straight
    limb the knee / elbow position is infinitely sensitive to the goal distance (h = sqrt(l1^2 - x^2)); a millimetre of hip
    sway then flicks the knee by centimetres from one frame to the next. Past Lmax*(1-soft) the limb is a little short of
    the goal (at most ~0.4 % of its length) and moves smoothly."""
    if soft <= 0:
        return L
    Ls = Lmax * (1 - soft)
    k = Lmax * soft
    return np.where(L > Ls, Ls + k * (1 - np.exp(-(L - Ls) / k)), L)


def two_bone(a, c, pole_pt, l1, l2, soft=0.):
    """batched two-bone IK: root a, goal c, knee/elbow towards pole_pt; returns (mid, end, miss)"""
    d = c - a
    L0 = np.linalg.norm(d, axis=-1)
    L = np.clip(soft_reach(L0, l1 + l2, soft), np.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-5)
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
            # the hand's own frame at the zero pose (along the hand; across, towards the thumb at its zero angle): the
            # thumb segment has its own DOFs and often lies almost along the hand, so it cannot give 'across' per frame
            al0 = nrm(pos[s + 'hand'] - pos[s + 'radius'])
            self.zero['hand_along_' + s] = al0
            self.zero['hand_across_' + s] = nrm(perp(pos[s + 'thumb'] - pos[s + 'wrist'], al0))
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
            self.rest['across_' + s] = nrm(perp(across, along))
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



def stable_twist(d, ant_src, bend_vec, bend_deg, fps, lo=12., hi=30.):
    """a limb's twist reference (the secondary axis of its first bone, perpendicular to d), steady where the joint is
    straight. A mocap solver cannot see the upper arm's (or thigh's) twist when the elbow (knee) is straight and lets it
    spin half a turn there; where the joint is bent, the bend itself (bend_vec, from the joint positions) shows it.
    So: the twist angle (about d, against a reference carried along d without twist) from the bend where bent enough,
    interpolated across straight spells, low-passed; the source's own axis only fixes the sign."""
    F = len(d)
    dn = nrm(d)
    ref = np.zeros((F, 3))
    r = perp(np.array([0, 0, 1.]) if abs(dn[0, 2]) < .9 else np.array([1., 0, 0]), dn[0])
    for i in range(F):                                     # parallel transport of a reference along d
        r = r - np.dot(r, dn[i]) * dn[i]
        r = r / max(np.linalg.norm(r), 1e-9)
        ref[i] = r
    ang = lambda v: signed_angle(ref, nrm(perp(v, dn)), dn)
    phs = np.unwrap(ang(ant_src))
    bent = bend_deg > hi
    w = smoothstep(lo, hi, bend_deg)
    if bent.sum() >= 3:
        bv = nrm(perp(bend_vec, dn))
        # the bend vector's sign against the source axis (where bent)
        sg = np.sign(np.sum(np.sum(bv[bent] * nrm(perp(ant_src, dn))[bent], -1))) or 1.
        php = ang(bv * sg)
        idx = np.nonzero(bent)[0]
        pb = np.unwrap(php[idx])
        allp = np.interp(np.arange(F), idx, pb)
        # where bent but not fully, blend towards the unwrapped bend angle of that frame (same branch as allp)
        dev = np.angle(np.exp(1j * (php - allp)))
        w = w * (1 - smoothstep(np.radians(35), np.radians(70), np.abs(dev)))   # (a reading flipped across the arm: ignored)
        phi = allp + w * dev
        phi = lowpass(phi, fps, 3.)
    else:
        phi = lowpass(phs, fps, 1.)
    # back to a vector
    ax = dn
    c, sn = np.cos(phi)[:, None], np.sin(phi)[:, None]
    return ref * c + np.cross(ax, ref) * sn + ax * np.sum(ax * ref, -1, keepdims=True) * (1 - c)


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
        fore = J['wrist_' + s] - J['elbow_' + s]
        el_deg = np.degrees(np.arccos(np.clip(np.sum(nrm(d) * nrm(fore), -1), -1, 1)))
        ant = stable_twist(d, ant, fore, el_deg, pr.fps, 20., 40.)
        Gua = basis(d, ant) @ mT(body.rest['ua_' + s])
        G['upperarm_' + s] = Gua
        fdir = nrm(J['wrist_' + s] - J['elbow_' + s])
        hinge = rot_between(mv(Gua, body.rest['fa_dir_' + s]), fdir) @ Gua
        side = 1 if s == 'l' else -1
        # the hand: its own segment's rotation (the across axis at the zero pose turned with it). Checked against the thumb
        # marker, which in these takes often lies almost along the hand (its across direction is noise there) and gives
        # palms facing the wrong way at rest; prayer and floor hands are built later anyway (palms_together, hand_lock)
        along = nrm(J['hand_' + s] - J['wrist_' + s])
        across = nrm(perp(mv(R[s + 'hand'], z['hand_across_' + s]), along))
        palm = nrm(np.cross(along, across) * side)
        # forearm twist from the hand's across axis (thumb side), not the palm normal: the palm normal swings onto the forearm
        # axis when the wrist bends 90 deg (palms flat on the floor), where its twist angle is undefined and flips
        ac0 = mv(hinge, body.rest['across_' + s])
        ac1 = across
        tw = signed_angle(nrm(perp(ac0, fdir)), nrm(perp(ac1, fdir)), fdir)
        tw = np.unwrap(tw)                     # (the angle wraps at +-180 deg: unwrapped, the forearm never spins a full turn)
        tw = tw - 2 * np.pi * np.round(np.median(tw) / (2 * np.pi))
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
        kant = mv(R[s + 'femur'], z['knee_ant_' + s])
        th_s, sh_s = J['knee_' + s] - J['hip_' + s], J['ankle_' + s] - J['knee_' + s]
        kn_deg = np.degrees(np.arccos(np.clip(np.sum(nrm(th_s) * nrm(sh_s), -1), -1, 1)))
        kant = stable_twist(th_s, kant, -sh_s, kn_deg, pr.fps, 15., 35.)
        # pole: the source knee's offset from the hip-ankle line, plus a little of the femur's own forward axis (a straight
        # source leg has no offset to speak of, and soft IK always bends the knee a little: it must bend forwards)
        mid, end, _ = two_bone(hip, tgt, pole + (pole - (hip + tgt) / 2) + kant * .05, body.l_thigh, body.l_calf, soft=SOFT)
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


def crossfade(a, b, n, body=None):
    """a then b, the last n frames of a blended into the first n of b (b's first frame is reached). With a body, the blend
    is in each bone's local rotation (a hand never swings the long way round because its forearm also turns)"""
    if n <= 0:
        return concat([a, b], a.fps)
    n = min(n, a.F, b.F)
    w = smoothstep(0, 1, (np.arange(n) + 1) / (n + 1))
    body = body or BODY.get('body')
    pm = a.pel[-n:] * (1 - w)[:, None] + b.pel[:n] * w[:, None]
    pel = np.concatenate([a.pel[:-n], pm, b.pel[n:]])
    if body is not None:
        La, Lb = locals_of(a, body), locals_of(b, body)
        L = {k: np.concatenate([La[k][:-n], slerp_mats(La[k][-n:], Lb[k][:n], w), Lb[k][n:]]) for k in La}
        return from_locals(L, pel, body, a.fps)
    G = {}
    for k in a.G:
        mid = slerp_mats(a.G[k][-n:], b.G[k][:n], w)
        G[k] = np.concatenate([a.G[k][:-n], mid, b.G[k][n:]])
    return Motion(a.fps, G, pel)


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
def locals_of(m, body):
    """local rotations of the driven bones (parent^T world) and the pelvis position"""
    P, GG = body.fk(m.G, m.pel)
    L = {}
    for b in DRIVEN:
        p = body.parent[b]
        L[b] = mT(GG[p]) @ GG[b]
    return L


def from_locals(L, pel, body, fps):
    """world rotations of the driven bones from their local rotations (bones not driven follow their parent)"""
    G = {}

    def world(n):
        if n is None:
            return None
        if n in G:
            return G[n]
        p = world(body.parent[n])
        if n in L:
            G[n] = L[n] if p is None else p @ L[n]
        else:
            G[n] = p
        return G[n]
    for b in DRIVEN:
        world(b)
    F = len(pel)
    return Motion(fps, {b: (G[b] if G[b] is not None else np.tile(np.eye(3), (F, 1, 1))) for b in DRIVEN}, pel)


def continuous_rotvec(rv):
    """rotation vectors made continuous over time: near half a turn a rotation vector can jump to its antipode
    (axis flipped, angle 2 pi - a); each frame takes whichever of the two is nearer the previous one"""
    out = rv.copy()
    for i in range(1, len(out)):
        a = np.linalg.norm(out[i])
        if a < 1e-9:
            continue
        alt = out[i] * (1 - 2 * np.pi / a)
        if np.linalg.norm(alt - out[i - 1]) < np.linalg.norm(out[i] - out[i - 1]):
            out[i] = alt
    return out


def smooth_fix(before, after, body, cutoff=3.5, cyclic=False, keep=None):
    """the clean-up passes (foot / hand lock, floor) correct a motion frame by frame; where an IK flips or a contact switches
    on, that correction has a kink. Keep the correction, without its kinks: the per-bone local correction (after vs before,
    as a rotation vector) and the pelvis offset are low-passed (zero phase) and re-applied to the motion before.
    keep: optional (F,) weight 0..1 where the exact correction is kept (e.g. pinned contacts); default none."""
    F, fps = before.F, before.fps
    La, Lb = locals_of(after, body), locals_of(before, body)
    pad = min(F - 1, int(fps)) if cyclic else 0

    def lp(x):
        if F < 16:
            return x
        if cyclic:
            xe = np.concatenate([x[-pad:], x, x[:pad]])
            return lowpass(xe, fps, cutoff)[pad:pad + F]
        return lowpass(x, fps, cutoff)
    L2 = {}
    for b in DRIVEN:
        d = continuous_rotvec(Rot.from_matrix(mT(Lb[b]) @ La[b]).as_rotvec())
        ds = lp(d)
        if keep is not None:
            ds = ds * (1 - keep[:, None]) + d * keep[:, None]
        L2[b] = Lb[b] @ Rot.from_rotvec(ds).as_matrix()
    dp = lp(after.pel - before.pel)
    if keep is not None:
        dp = dp * (1 - keep[:, None]) + (after.pel - before.pel) * keep[:, None]
    return from_locals(L2, before.pel + dp, body, fps)


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


def foot_lock(m, body, cyclic=False, log=print, flat_tol=.03, contact_h=.025, speed=.3, min_len=4, fix_floor=True, swing_clear=.035, flat=None, always=''):
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
            if s in always:                      # (a foot that never leaves the floor in this clip: one plant)
                contact = np.ones(F, bool)
            runs = [r for r in _cyc_runs(contact, cyclic) if r[1] - r[0] >= min_len]
            stats[s] = len(runs)
            for a, b in runs:
                ks = np.arange(a, b) % F
                base = max(0, low[ks].min())
                is_flat = flat if flat is not None else ((heel[ks, 1] < base + flat_tol).mean() > .5 and (toe[ks, 1] < base + flat_tol).mean() > .5)
                Gf = G['foot_' + s][ks]
                ball_local = mT(Gf) @ G['ball_' + s][ks]
                if is_flat:
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
                ramp = ramp_frames(m.fps)
                for k in range(a, b):
                    if not cyclic and (k < 0 or k >= F):
                        continue
                    kk = k % F
                    wk = ramp_w(k, a, b, ramp, F, cyclic)
                    j = min(max(k - a, 0), len(ks) - 1)
                    _leg_to(G, P, pel, body, s, kk, pin - toe_off[j], wk, Gf2[j])
        P, GG = body.fk(G, pel)
    if fix_floor:
        _feet_clear(G, pel, m.fps, body, swing_clear)
    log(f'  foot lock: planted phases L {stats.get("l", 0)}, R {stats.get("r", 0)}')
    return Motion(m.fps, G, pel)


def ramp_frames(fps, sec=.15):
    return max(2, int(round(sec * fps)))


def ramp_w(k, a, b, ramp, F=None, cyclic=False):
    """contact weight at frame k for a contact over [a, b): eased in and out over ramp frames INSIDE the contact (a foot
    that starts to swing is let go before it moves fast, rather than held back while it accelerates). A contact that runs
    off either end of a one-shot clip (or covers a whole cycle) is not eased at that end."""
    if not a <= k < b:
        return 0.0
    r = min(ramp, max(1, (b - a) // 3))
    whole = cyclic and F is not None and b - a >= F
    open_a = whole or (not cyclic and a <= 0)
    open_b = whole or (not cyclic and F is not None and b >= F)
    u = 1.
    if not open_a:
        u = min(u, (k - a + 1) / (r + 1))
    if not open_b:
        u = min(u, (b - k) / (r + 1))
    u = min(1., u)
    return u * u * (3 - 2 * u)


def _feet_clear(G, pel, fps, body, swing_clear):
    """no sole below the floor; a foot that travels fast clears it by up to swing_clear (leg IK, the body unchanged)"""
    F = len(pel)
    P, GG = body.fk(G, pel)
    for s in 'lr':
        heel, toe = sole_points(body, P, GG, s)
        low = np.minimum(heel[:, 1], toe[:, 1])
        # a swinging foot clears the floor (a few cm while it travels fast) instead of skimming or dragging through it
        sp = np.linalg.norm(np.gradient(P['ball_' + s][:, [0, 2]], axis=0), axis=-1) * fps
        want = .002 + swing_clear * smoothstep(.35, .9, sp)
        want = np.maximum(want, lowpass(want, fps, 3.)) if F > 16 else want
        need = np.maximum(0, want - low)
        if F > 16 and need.max() > 0:          # eased: a lift that never dips under the need, without per-frame kinks
            r = max(1, int(.08 * fps))
            env = np.array([need[max(0, i - r):i + r + 1].max() for i in range(F)])
            need = np.maximum(need, lowpass(env, fps, 4.))
        for k in np.nonzero(need > 1e-4)[0]:     # lift the foot by IK (not the body)
            tgt = P['foot_' + s][k] + np.array([0, need[k], 0])
            _leg_to(G, P, pel, body, s, k, tgt, 1.0, None)


def feet_clear(m, body, swing_clear=.035, log=print):
    """the last pass: no sole and no palm below the floor (legs / arms lifted by IK, eased; the body unchanged)"""
    G, pel = {k: v.copy() for k, v in m.G.items()}, m.pel.copy()
    _feet_clear(G, pel, m.fps, body, swing_clear)
    F = m.F
    P, GG = body.fk(G, pel)
    for s in 'lr':
        need = np.maximum(0, .004 - palm_point(body, P, GG, s)[:, 1])
        if need.max() <= 0:
            continue
        if F > 16:
            r = max(1, int(.08 * m.fps))
            env = np.array([need[max(0, i - r):i + r + 1].max() for i in range(F)])
            need = np.maximum(need, lowpass(env, m.fps, 4.))
        for k in np.nonzero(need > 1e-4)[0]:
            wr = P['hand_' + s][k]
            _arm_to(G, P, body, s, k, wr + np.array([0, need[k], 0]))
        P, GG = body.fk(G, pel)
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
    fwd = G['thigh_' + s][k] @ body.rest['th_' + s][:, 1]          # the knee bends forwards
    mid, end, _ = two_bone(hip[None], goal[None], (knee + (knee - (hip + ank) / 2) + fwd * .05)[None], body.l_thigh, body.l_calf, soft=SOFT)
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


def _hand_phases(m, body, P, GG, cyclic, h, speed, min_len, sides, force=None):
    """palm-on-floor phases per side: [(side, frames, flat hand rotations, pin)]; force: (F,) frames where the palms rest
    on the floor whatever their height (a take whose palms stop short of it, where the cue puts them on it)"""
    F = m.F
    out = []
    for s in sides:
        pp = palm_point(body, P, GG, s)
        spd = np.linalg.norm(np.gradient(pp[:, [0, 2]], axis=0), axis=-1) * m.fps
        contact = (pp[:, 1] < h) & (spd < speed)
        if force is not None:
            contact = contact | force
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


def hand_lock(m, body, cyclic=False, log=print, h=.05, speed=.25, min_len=4, sides='lr', max_shift=.12, force=None):
    """palms resting on the floor: pinned, laid flat (palm down, heading kept), the arm re-solved with two-bone IK.
    This body's trunk and arms are not the performer's (scaled by leg length, the CMU performers have longer trunks), so a
    planted hand can be out of reach: then the whole body moves towards the hands (up to max_shift; the feet are re-pinned
    by the next foot lock), and only what is still missing moves the palm spot horizontally towards the shoulder."""
    G, pel = {k: v.copy() for k, v in m.G.items()}, m.pel.copy()
    F = m.F
    P, GG = body.fk(G, pel)
    ph = _hand_phases(m, body, P, GG, cyclic, h, speed, min_len, sides, force)
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
        ramp = ramp_frames(m.fps)
        for k in range(a, b):
            if not cyclic and (k < 0 or k >= F):
                continue
            kk = k % F
            wk = ramp_w(k, a, b, ramp, F, cyclic)
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


def _arm_to(G, P, body, s, k, goal, wk=1.0):
    sh = P['upperarm_' + s][k]
    el = sh + G['upperarm_' + s][k] @ body.off['lowerarm_' + s]
    wr = el + G['lowerarm_' + s][k] @ body.off['hand_' + s]
    goal = wr * (1 - wk) + goal * wk
    back = -(G['upperarm_' + s][k] @ body.rest['ua_' + s][:, 1])     # the elbow bends backwards (the forearm folds forwards)
    mid, end, miss = two_bone(sh[None], goal[None], (el + (el - (sh + wr) / 2) + back * .05)[None], body.l_ua, body.l_fa, soft=SOFT)
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
    # an envelope that never dips under the need: a running max over 0.3 s, then smoothed (and never below the need)
    r = max(1, int(.15 * m.fps))
    env = np.array([lift[max(0, i - r):i + r + 1].max() for i in range(len(lift))])
    lift = np.maximum(lift, lowpass(env, m.fps, 2.))
    if lift.max() > 1e-4:
        Pfoot = {s: P['foot_' + s].copy() for s in 'lr'}
        Ppalm = {s: palm_point(body, P, GG, s) for s in 'lr'}
        pel = pel + np.outer(lift, UP)
        P, GG = body.fk(G, pel)
        for k in np.nonzero(lift > 1e-4)[0]:
            for s in 'lr':
                wf = 1 - smoothstep(.09, .15, Pfoot[s][k][1])          # a foot near the floor keeps its place (eased)
                if keep_feet and wf > 0:
                    _leg_to(G, P, pel, body, s, k, Pfoot[s][k], wf, None)
                wh = 1 - smoothstep(.04, .08, Ppalm[s][k][1])
                if wh > 0:
                    _arm_to(G, P, body, s, k, Ppalm[s][k] - mv(G['hand_' + s][k], body.sole['palm_' + s]), wh)
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
    if m.F > 16:                                   # eased in and out over ~0.4 s (no per-frame on / off)
        r = max(1, int(.25 * m.fps))
        env = np.array([w[max(0, i - r):i + r + 1].max() for i in range(len(w))])
        w = np.clip(lowpass(env, m.fps, .8), 0, 1)
    ks = np.nonzero(w > .01)[0]
    # the prayer hand is built, not measured: palm towards the other palm (across the chest: the line between two nearly
    # touching palms is not steady), fingers up and a little forward; the forearm takes half of the hand's turn about its
    # own axis (unwrapped over time, so it never jumps half a turn), so the wrist never wrings
    tgt, tws = {}, {}
    for s in 'lr':
        T, tw = [], []
        for k in ks:
            chest = G['spine_03'][k]
            ax = -chest[:, 0]
            up = nrm(perp(chest[:, 1] + .45 * chest[:, 2], ax))
            want = ax if s == 'l' else -ax
            Gh = G['hand_' + s][k]
            Gt = basis(up, want) @ mT(body.rest['hand_' + s])
            Gh2 = slerp_mats(Gh[None], Gt[None], np.array([w[k]]))[0]
            fa = G['lowerarm_' + s][k] @ nrm(body.H['hand_' + s] - body.H['lowerarm_' + s])
            pn0, pn1 = Gh @ body.rest['palm_' + s], Gh2 @ body.rest['palm_' + s]
            T.append(Gh2); tw.append(signed_angle(nrm(perp(pn0, fa)), nrm(perp(pn1, fa)), fa))
        tgt[s] = T
        tws[s] = np.unwrap(np.array(tw)) if len(tw) else np.array(tw)
    n = 0
    for j, k in enumerate(ks):
        mid = (pl[k] + pr[k]) / 2
        ax = -G['spine_03'][k][:, 0]
        for s, want in (('l', ax), ('r', -ax)):
            me = pl[k] if s == 'l' else pr[k]
            Gh2 = tgt[s][j]
            fa = G['lowerarm_' + s][k] @ nrm(body.H['hand_' + s] - body.H['lowerarm_' + s])
            G['lowerarm_' + s][k] = axis_angle(fa, .5 * tws[s][j]) @ G['lowerarm_' + s][k]
            goal = me * (1 - w[k]) + (mid - want * .004) * w[k]
            _arm_to(G, P, body, s, k, goal - Gh2 @ body.sole['palm_' + s])
            G['hand_' + s][k] = Gh2
        n += 1
    log(f'  palms together: {n} frames')
    return Motion(m.fps, G, pel)


def auto_fingers(m, body, floor_h=.07, together=.08, min_run=8):
    """finger shape per hand per frame: 'palm' (flat) where the palm rests on the floor, 'prayer' where the palms meet,
    else 'relaxed'; short runs merged. Returns {'l': [(frame, shape), ...], 'r': [...]}"""
    P, GG = body.fk(m.G, m.pel)
    pl, pr = palm_point(body, P, GG, 'l'), palm_point(body, P, GG, 'r')
    d = np.linalg.norm(pl - pr, axis=-1)
    out = {}
    for s, pp in (('l', pl), ('r', pr)):
        lab = np.array(['relaxed'] * m.F, dtype=object)
        lab[d < together] = 'prayer'
        # on the floor: below floor_h, and it stays 'palm' until the palm is clearly up (hysteresis: no flicker)
        on = False
        for i in range(m.F):
            y = pp[i, 1]
            on = y < floor_h if not on else y < floor_h + .04
            if on:
                lab[i] = 'palm'
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


# ------------------------------------------------------------------------------------------------ edits on the body
def soften_head(m, body, max_ext=18., w=None, log=print):
    """a head thrown back (neck and head extended more than max_ext degrees relative to the chest) is brought forward to
    max_ext, half at the neck and half at the head, eased over time; w: optional (F,) weight"""
    G = {k: v.copy() for k, v in m.G.items()}
    Rel = mT(G['spine_03']) @ G['head']
    x = Rot.from_matrix(Rel).as_rotvec()[:, 0]                 # about the chest's left axis: negative = extension (looking up)
    ext = np.degrees(-x)
    need = np.maximum(0, ext - max_ext)
    need = lowpass(np.maximum(need, lowpass(need, m.fps, 1.)), m.fps, 1.5)
    need = np.maximum(need, 0) * (1 if w is None else w)
    a = G['spine_03'][:, :, 0]                                  # the chest's lateral axis (world)
    for k in range(m.F):
        if need[k] <= 1e-3:
            continue
        r = axis_angle(a[k], np.radians(need[k]))
        rh = axis_angle(a[k], np.radians(need[k] / 2))
        G['neck_01'][k] = rh @ G['neck_01'][k]
        G['head'][k] = r @ G['head'][k]
    log(f'  head: extension {ext.max():.0f} deg at most, brought to <= {max_ext:.0f} (by up to {need.max():.0f} deg)')
    return Motion(m.fps, G, m.pel.copy())


def peaks(x, fps, min_gap=.35, min_h=None):
    """times (frames) of local maxima of x at least min_gap s apart (and above min_h)"""
    from scipy.signal import find_peaks
    kw = {'distance': max(1, int(min_gap * fps))}
    if min_h is not None:
        kw['height'] = min_h
    return find_peaks(x, **kw)[0]


def composite_arms(m, src, tmap, w=None, bones=('clavicle_', 'upperarm_', 'lowerarm_', 'hand_')):
    """arms (clavicle .. hand) of src carried by m's chest (each bone's local rotation from src); tmap: (F,) source times (s)
    for each of m's frames; w: (F,) weight (default 1). The blend is per bone in local rotations (slerp), so a weight that
    eases in and out never swings a hand the long way round."""
    body = composite_arms.body
    sm = src.sample(tmap)
    w = np.ones(m.F) if w is None else np.asarray(w)
    La, Ls = locals_of(m, body), locals_of(sm, body)
    for s in 'lr':
        for b in bones:
            La[b + s] = slerp_mats(La[b + s], Ls[b + s], w)
    return from_locals(La, m.pel.copy(), body, m.fps)


def add_sink(m, depth, prof):
    """lower the pelvis by depth * prof (F,) (the foot lock afterwards keeps the feet, so the knees bend)"""
    out = m.copy()
    out.pel[:, 1] -= depth * np.asarray(prof)
    return out


def ground(m, body, cyclic=False, log=print, h=.03, speed=.3):
    """the last pass: planted soles exactly on the floor. Where a foot rests (sole within h of the floor, slow), the whole
    body is moved up or down (eased, low-passed) so its lowest planted sole point is at 2 mm: soft IK and the smoothed
    corrections leave a resting foot a few millimetres above (or in) the floor otherwise. Nothing else changes."""
    P, GG = body.fk(m.G, m.pel)
    F = m.F
    gap = np.full(F, np.nan)
    for s in 'lr':
        heel, toe = sole_points(body, P, GG, s)
        low = np.minimum(heel[:, 1], toe[:, 1])
        ball = P['ball_' + s]
        spd = np.linalg.norm(np.gradient(ball[:, [0, 2]], axis=0), axis=-1) * m.fps
        rest = (low < h) & (spd < speed)
        gap = np.where(rest, np.where(np.isnan(gap), low, np.minimum(gap, low)), gap)
    has = ~np.isnan(gap)
    if not has.any():
        log('  ground: no resting foot')
        return m
    d = np.where(has, gap - .002, 0.)
    # never push anything else into the floor: palms, flesh, a foot that is not resting
    room = np.full(F, 1.)
    for s in 'lr':
        room = np.minimum(room, palm_point(body, P, GG, s)[:, 1] - .004)
        heel, toe = sole_points(body, P, GG, s)
        room = np.minimum(room, np.minimum(heel[:, 1], toe[:, 1]) - .002 + np.where(has, 0, 0))
    V = body.skin(P, GG, body.probe)
    room = np.minimum(room, V[:, :, 1].min(1) - .003)
    d = np.where(d > 0, np.minimum(d, np.maximum(room, 0)), d)
    idx = np.arange(F)
    if not has.all():
        d[~has] = np.interp(idx[~has], idx[has], d[has], period=F if cyclic else None)
    pad = min(F - 1, int(m.fps)) if cyclic else 0
    ds = lowpass(np.concatenate([d[-pad:], d, d[:pad]]) if pad else d, m.fps, 2.)
    ds = ds[pad:pad + F] if pad else ds
    out = m.copy()
    out.pel[:, 1] -= ds
    log(f'  ground: body moved by {ds.min()*100:+.1f} .. {ds.max()*100:+.1f} cm to rest the feet on the floor')
    return out


def loop_spread(m, body):
    """make a cycle seamless by spreading its seam error over the whole cycle: each bone's local rotation (and the pelvis)
    is corrected by a fraction i/F of the difference between the first frame and where the last frame is heading (its own
    extrapolation), so the joint velocities stay continuous across the wrap (a short cross-fade to the first pose would
    stop the motion there)"""
    L = locals_of(m, body)
    F = m.F
    w = (np.arange(F) / F)[:, None]
    L2 = {}
    for b, v in L.items():
        pred = v[-1] @ (mT(v[-2]) @ v[-1])                      # one frame past the end
        err = Rot.from_matrix(v[0] @ mT(pred)).as_rotvec()      # (world-of-parent side)
        L2[b] = Rot.from_rotvec(w * err[None]).as_matrix() @ v
    pp = 2 * m.pel[-1] - m.pel[-2]
    pel = m.pel + w * (m.pel[0] - pp)[None]
    return from_locals(L2, pel, body, m.fps)


def relax_hands(m, body, deg=28.):
    """free hands hang relaxed: the hand's own rotation (often the noisiest segment of a take, flicking up and down) is
    replaced by the rest pose, flexed a little towards the palm"""
    L = locals_of(m, body)
    for s in 'lr':
        ax = nrm(np.cross(body.rest['palm_' + s], nrm(body.H['middle_01_' + s] - body.H['hand_' + s])))
        L['hand_' + s] = np.tile(axis_angle(ax, np.radians(deg)), (m.F, 1, 1))
    return from_locals(L, m.pel.copy(), body, m.fps)


def palms_down(m, body, w, tilt=10.):
    """hands turned palm-down (world), fingers along the forearm's horizontal heading, the wrist eased; w: (F,) weight.
    For takes whose hand segment is unreliable where the cue is about the palms (Tai Chi: 'press the palms down')"""
    G = {k: v.copy() for k, v in m.G.items()}
    for s in 'lr':
        fa = mv(G['lowerarm_' + s], nrm(body.H['hand_' + s] - body.H['lowerarm_' + s]))
        along = nrm(fa * np.array([1, 0, 1]) + np.array([0, -np.tan(np.radians(tilt)), 0]) * np.linalg.norm(fa * np.array([1, 0, 1]), axis=-1, keepdims=True))
        Gt = basis(along, np.tile([0, -1., 0], (m.F, 1))) @ mT(body.rest['hand_' + s])
        G['hand_' + s] = slerp_mats(G['hand_' + s], Gt, np.asarray(w))
    return Motion(m.fps, G, m.pel.copy())


def _seg_dist(p, a, b):
    ab = b - a
    t = np.clip(np.sum((p - a) * ab, -1) / np.maximum(np.sum(ab * ab, -1), 1e-9), 0, 1)
    return np.linalg.norm(p - (a + ab * t[..., None]), axis=-1)


def hands_clear_thighs(m, body, clear=.17, log=print):
    """a hand that would pass through its own thigh (a composite: this performer's arms, another's knees) is swung back
    from the shoulder until it clears it, eased over time"""
    G = {k: v.copy() for k, v in m.G.items()}
    P, GG = body.fk(G, m.pel)
    worst = 0.
    for s in 'lr':
        need = np.zeros(m.F)
        for k in range(m.F):
            # how far back (deg) the arm must swing at this frame: search in 3 deg steps
            sh = P['upperarm_' + s][k]; lat = G['spine_03'][k][:, 0]
            for deg in range(0, 61, 3):
                R = axis_angle(lat, np.radians(deg))           # positive: the arm swings back (towards -Z)
                hand = sh + R @ (palm_point(body, P, GG, s)[k] - sh)
                if _seg_dist(hand, P['thigh_' + s][k], P['calf_' + s][k]) >= clear:
                    break
            need[k] = deg
        if need.max() == 0:
            continue
        r = max(1, int(.12 * m.fps))
        env = np.array([need[max(0, i - r):i + r + 1].max() for i in range(m.F)])
        need = np.maximum(need, lowpass(env, m.fps, 2.))
        worst = max(worst, need.max())
        for k in range(m.F):
            if need[k] > .1:
                R = axis_angle(G['spine_03'][k][:, 0], np.radians(need[k]))
                for b in ('upperarm_', 'lowerarm_', 'hand_'):
                    G[b + s][k] = R @ G[b + s][k]
    log(f'  hands clear of the thighs: arms swung back by up to {worst:.0f} deg')
    return Motion(m.fps, G, m.pel.copy())


def stand_tall(m, body, keep=.45, bones=('spine_01', 'spine_02', 'spine_03', 'neck_01', 'head')):
    """a stoop eased out: the spine, neck and head keep only `keep` of their bend away from the performer's own standing
    posture (identity, since the standing reference is the rest pose); the arms ride on the straighter chest"""
    L = locals_of(m, body)
    I = np.tile(np.eye(3), (m.F, 1, 1))
    for b in bones:
        L[b] = slerp_mats(I, L[b], np.full(m.F, keep))
    return from_locals(L, m.pel.copy(), body, m.fps)


def composite_arms_ik(m, src, tmap, w):
    """as composite_arms, but the arms are carried by IK: each wrist goes to a blend of its own place and src's (relative to
    the chest), the arm turning the short way from its own pose; so two performers whose forearms are twisted differently
    never wring the forearm half a turn while one hands over to the other. Clavicles blend in local rotation; hands blend
    relative to the chest (the prayer pass builds them anyway)."""
    body = composite_arms.body
    sm = src.sample(tmap)
    w = np.asarray(w)
    La, Ls = locals_of(m, body), locals_of(sm, body)
    for s in 'lr':
        La['clavicle_' + s] = slerp_mats(La['clavicle_' + s], Ls['clavicle_' + s], w)
    out = from_locals(La, m.pel.copy(), body, m.fps)
    G = {k: v.copy() for k, v in out.G.items()}
    P, GG = body.fk(G, out.pel)
    Ps, GGs = body.fk(sm.G, sm.pel)
    for s in 'lr':
        for k in np.nonzero(w > 1e-3)[0]:
            ch, chs = G['spine_03'][k], sm.G['spine_03'][k]
            rel = chs.T @ (Ps['hand_' + s][k] - Ps['upperarm_' + s][k])          # src wrist from its shoulder, chest frame
            own = P['hand_' + s][k]
            tgt = P['upperarm_' + s][k] + ch @ rel
            _arm_to(G, P, body, s, k, own * (1 - w[k]) + tgt * w[k])
            # the hand: its wrist angle (local to the forearm) blended; the forearm was already carried by the IK
            Lh = slerp_mats(La['hand_' + s][k][None], Ls['hand_' + s][k][None], np.array([w[k]]))[0]
            G['hand_' + s][k] = G['lowerarm_' + s][k] @ Lh
    return Motion(m.fps, G, out.pel)


def hands_floor_clear(m, body, log=print):
    """no finger through the floor: where a hand's lowest point (fingers included) is below the floor, the hand turns
    towards lying flat (palm down, fingers along its heading) and what is still missing lifts the wrist (arm IK); both
    eased over time"""
    G, pel = {k: v.copy() for k, v in m.G.items()}, m.pel.copy()
    F = m.F
    worst = 0.
    for s in 'lr':
        # the hand and the first finger joints (the finger tips are shaped by the player: flat on the floor, 'palm'; the
        # rest pose here curls them, which would lift a flat hand off the floor for nothing)
        names = [n for n in body.names if n.endswith('_' + s) and (n.startswith('hand') or any(n.startswith(f + '_01') for f in FINGERS))]
        idx = np.nonzero(np.isin(body.v_dom, names))[0][::3]
        P, GG = body.fk(G, pel)
        low = body.skin(P, GG, idx)[:, :, 1].min(1)
        need = np.maximum(0, .003 - low)
        if need.max() <= 1e-4:
            continue
        worst = max(worst, need.max())
        r = max(1, int(.12 * m.fps))
        env = np.array([need[max(0, i - r):i + r + 1].max() for i in range(F)])
        need = np.maximum(need, lowpass(env, m.fps, 3.)) if F > 16 else need
        wf = smoothstep(0, .05, need)
        along = mv(G['hand_' + s], nrm(body.H['middle_01_' + s] - body.H['hand_' + s]))
        head = nrm(along * np.array([1, 0, 1]) + np.array([1e-6, 0, 0]))
        Gflat = basis(head, np.tile([0, -1., 0], (F, 1))) @ mT(body.rest['hand_' + s])
        for k in np.nonzero(need > 1e-4)[0]:
            G['hand_' + s][k] = slerp_mats(G['hand_' + s][k][None], Gflat[k][None], np.array([wf[k]]))[0]
        # what is still under the floor after flattening: lift the wrist
        P, GG = body.fk(G, pel)
        low2 = body.skin(P, GG, idx)[:, :, 1].min(1)
        need2 = np.maximum(0, .003 - low2)
        if F > 16 and need2.max() > 0:
            env = np.array([need2[max(0, i - r):i + r + 1].max() for i in range(F)])
            need2 = np.maximum(need2, lowpass(env, m.fps, 3.))
        for k in np.nonzero(need2 > 1e-4)[0]:
            _arm_to(G, P, body, s, k, P['hand_' + s][k] + np.array([0, need2[k], 0]))
    log(f'  fingers: up to {worst*100:.1f} cm under the floor, hands turned flat / lifted')
    return Motion(m.fps, G, pel)
