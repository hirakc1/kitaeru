"""Jerk report for real-motion clips: where a clip pops, measured on the body (not guessed).

    python mocap_jerk.py [ids,...] [--body f|m] [--dir assets/v3/mocap] [--top 8] [--json out.json]

Reads the encoded clips (assets/v3/mocap/<id>.<sex>.kclip.json: exactly what the player shows), forward-kinematics them on
the body and reports, per clip:
  * joint acceleration spikes: the 2nd difference of the world position of the hands, elbows, feet, knees, head and pelvis
    (m/s^2). A pop of d metres in one frame shows as ~2 d fps^2 against its neighbours.
  * 'pop' score: the part of the acceleration that is not explained by a smooth (5-frame quadratic) fit, per joint;
    real fast movement fits a quadratic, a step or a kink does not.
  * bone angular acceleration (deg/s^2) of the local rotations (spine, neck, head, arms, legs).
  * pelvis velocity jumps (m/s per frame).
  * across the loop seam (cyclic clips) or the wrap (restart) of one-shot clips: the same numbers across the join.
The 'spike' count is the number of frames whose pop exceeds POP_LIMIT (default 0.9 cm at the clip's frame rate, i.e. a joint
that leaves its smooth path by about a centimetre in a single frame; a 20 fps clip that the player interpolates shows that
as a visible kink).
"""
import os, sys, json, base64, argparse
import numpy as np
from scipy.spatial.transform import Rotation as Rot

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mocap as M

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
JOINTS = {'hand_l': 'hand_l', 'hand_r': 'hand_r', 'elbow_l': 'lowerarm_l', 'elbow_r': 'lowerarm_r', 'foot_l': 'foot_l', 'foot_r': 'foot_r',
          'knee_l': 'calf_l', 'knee_r': 'calf_r', 'head': 'head', 'pelvis': 'pelvis', 'chest': 'spine_03'}
POP_LIMIT = .009        # m: off the smooth path in one frame


def decode(path, body):
    k = json.load(open(path))
    F, B = k['frames'], len(k['bones'])
    q = np.frombuffer(base64.b64decode(k['q']), '<i2').astype(float).reshape(F, B, 3) * k['qScale']
    w = np.sqrt(np.maximum(0, 1 - (q ** 2).sum(-1, keepdims=True)))
    Q = np.concatenate([q, w], -1)
    t = np.frombuffer(base64.b64decode(k['t']), '<i2').astype(float).reshape(F, 3) * k['tScale']
    loc = {b: Rot.from_quat(Q[:, i]).as_matrix() for i, b in enumerate(k['bones'])}
    for b, v in (k.get('fixed') or {}).items():
        loc.setdefault(b, np.tile(Rot.from_quat(v).as_matrix(), (F, 1, 1)))
    # world rotations (rest rotations are identity)
    G = {}
    for n in body.names:
        p = body.parent[n]
        L = loc.get(n)
        if p is None:
            G[n] = L if L is not None else np.tile(np.eye(3), (F, 1, 1))
        else:
            G[n] = G[p] @ L if L is not None else G[p]
    root = body.parent['pelvis']
    pel = t + body.H[root]
    return k, M.Motion(k['fps'], {b: G[b] for b in M.DRIVEN}, pel)


def sgfit_residual(x, half=2):
    """|x - quadratic fit over 2*half+1 frames| per frame (the kink part of a path); x (F, 3)"""
    F = len(x)
    out = np.zeros(F)
    t = np.arange(-half, half + 1)
    A = np.stack([np.ones_like(t), t, t * t], 1).astype(float)
    pinv = np.linalg.pinv(A)
    for i in range(half, F - half):
        seg = x[i - half:i + half + 1]
        c = pinv @ seg
        out[i] = np.linalg.norm(seg[half] - c[0])
    return out


def report(m, loop=False, wrap=True):
    """dict of numbers for a Motion; loop: cyclic (the seam is inside the signal); wrap: also measure end -> start"""
    body = report.body
    P, GG = body.fk(m.G, m.pel)
    fps = m.fps
    pad = 3
    res = {'frames': m.F, 'fps': fps}
    rows = []
    for name, b in JOINTS.items():
        x = P[b]
        xe = np.concatenate([x[-pad:], x, x[:pad]]) if (loop or wrap) else np.concatenate([x[:1].repeat(pad, 0), x, x[-1:].repeat(pad, 0)])
        acc = np.linalg.norm(xe[2:] - 2 * xe[1:-1] + xe[:-2], axis=-1) * fps * fps          # at frames -pad+1 .. F+pad-2
        acc = acc[pad - 1:pad - 1 + m.F]
        pop = sgfit_residual(xe)[pad:pad + m.F]
        rows.append((name, acc, pop))
    acc_all = np.stack([r[1] for r in rows]); pop_all = np.stack([r[2] for r in rows])
    res['acc_p50'] = float(np.percentile(acc_all, 50)); res['acc_p95'] = float(np.percentile(acc_all, 95)); res['acc_max'] = float(acc_all.max())
    res['pop_max_cm'] = float(pop_all.max() * 100)
    res['spikes'] = int((pop_all.max(0) > POP_LIMIT).sum())
    top = []
    fr = pop_all.max(0)
    for i in np.argsort(-fr)[:12]:
        if fr[i] <= POP_LIMIT * .5:
            break
        j = int(np.argmax(pop_all[:, i]))
        top.append({'t': round(i / fps, 2), 'frame': int(i), 'joint': rows[j][0], 'pop_cm': round(float(pop_all[j, i] * 100), 2), 'acc': round(float(acc_all[j, i]), 1)})
    res['top'] = top
    # bone angular acceleration (local rotations)
    angs = []
    for b in M.DRIVEN:
        pb = body.parent[b]
        L = np.einsum('fji,fjk->fik', GG[pb], GG[b]) if pb else GG[b]
        Le = np.concatenate([L[-pad:], L, L[:pad]]) if (loop or wrap) else np.concatenate([L[:1].repeat(pad, 0), L, L[-1:].repeat(pad, 0)])
        rv = Rot.from_matrix(np.einsum('fji,fjk->fik', Le[:-1], Le[1:])).as_rotvec()          # per-frame rotation (local)
        w = np.degrees(rv) * fps
        a = np.linalg.norm(np.diff(w, axis=0), axis=-1) * fps
        a = a[pad - 1:pad - 1 + m.F]
        angs.append((b, a, np.linalg.norm(w, axis=-1)[pad - 1:pad - 1 + m.F]))
    A = np.stack([a for _, a, _ in angs])
    res['ang_acc_p95'] = float(np.percentile(A, 95)); res['ang_acc_max'] = float(A.max())
    i = int(np.argmax(A.max(0))); j = int(np.argmax(A[:, i]))
    res['ang_acc_peak'] = {'t': round(i / fps, 2), 'bone': angs[j][0], 'deg_s2': round(float(A[j, i]))}
    # pelvis velocity jumps (m/s per frame)
    pe = m.pel
    pee = np.concatenate([pe[-pad:], pe, pe[:pad]]) if (loop or wrap) else pe
    v = np.diff(pee, axis=0) * fps
    dv = np.linalg.norm(np.diff(v, axis=0), axis=-1)
    res['pelvis_dv_max'] = float(dv.max()); res['pelvis_dv_p95'] = float(np.percentile(dv, 95))
    if loop or wrap:
        # the join itself: frames F-1 -> 0
        seam = [float(np.linalg.norm(P[b][0] - P[b][-1]) * 100) for b in JOINTS.values()]
        res['join_jump_cm'] = round(max(seam), 2)
        res['join_pop_cm'] = round(float(pop_all[:, [0, -1]].max() * 100), 2)
    return res


def fmt(cid, r):
    s = (f"{cid:22s} {r['frames']:4d}f@{r['fps']:<3d} spikes {r['spikes']:3d}  pop max {r['pop_max_cm']:5.2f} cm  acc p95 {r['acc_p95']:5.1f} max {r['acc_max']:6.1f} m/s2"
         f"  ang-acc p95 {r['ang_acc_p95']:6.0f} max {r['ang_acc_max']:6.0f} deg/s2 ({r['ang_acc_peak']['bone']} @{r['ang_acc_peak']['t']}s)"
         f"  pelvis dv max {r['pelvis_dv_max']:.3f} m/s")
    if 'join_jump_cm' in r:
        s += f"  join jump {r['join_jump_cm']:.1f} cm (pop {r['join_pop_cm']:.2f})"
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ids', nargs='?', default='')
    ap.add_argument('--body', default='f')
    ap.add_argument('--dir', default=os.path.join(ROOT, 'assets', 'v3', 'mocap'))
    ap.add_argument('--top', type=int, default=6)
    ap.add_argument('--json', default='')
    a = ap.parse_args()
    body = M.Body(os.path.join(ROOT, 'assets', 'v3', f'human_{a.body}.glb'))
    report.body = body
    ids = a.ids.split(',') if a.ids else sorted({f.split('.')[0] for f in os.listdir(a.dir) if f.endswith('.kclip.json')})
    out = {}
    for cid in ids:
        p = os.path.join(a.dir, f'{cid}.{a.body}.kclip.json')
        if not os.path.exists(p):
            continue
        k, m = decode(p, body)
        r = report(m, loop=k.get('loop', True) and not k.get('dipWrap'), wrap=False)
        out[cid] = r
        print(fmt(cid, r))
        for t in r['top'][:a.top]:
            print(f"      {t['t']:6.2f}s  {t['joint']:8s} pop {t['pop_cm']:.2f} cm  acc {t['acc']:.1f}")
    if a.json:
        json.dump(out, open(a.json, 'w'), indent=1)


if __name__ == '__main__':
    main()
