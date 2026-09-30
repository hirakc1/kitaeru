"""MediaPipe BlazePose 33-point 3D output (FreeMoCap or single-camera MediaPipe) -> Kitaeru landmark track (JSON).

    python mediapipe_to_landmarks.py body_3d.npy out.landmarks.json --fps 30 [--units mm] [--up z] [--start s --end s]

Input: an array (frames, 33, 3) as .npy (FreeMoCap: output_data/mediapipe_body_3d_xyz.npy) or a .csv with 99 numeric
columns per row (x0,y0,z0,...,x32,y32,z32). NaNs (missed frames) are filled by linear interpolation.
--up    which input axis points up: 'z' (FreeMoCap default) or 'y' or '-y' (MediaPipe world landmarks: y points DOWN)
--units 'mm' (FreeMoCap) or 'm' (MediaPipe world landmarks)
Output is the same landmark JSON that cmu_to_landmarks.py writes, ready for landmarks_to_clip.py.
NOT YET RUN ON REAL FOOTAGE: written against the documented MediaPipe landmark order; check axes on the first take.
"""
import argparse, json, csv
import numpy as np

# MediaPipe Pose landmark indices (subject's own left/right)
MP = {'nose': 0, 'ear_l': 7, 'ear_r': 8, 'shoulder_l': 11, 'shoulder_r': 12, 'elbow_l': 13, 'elbow_r': 14,
      'wrist_l': 15, 'wrist_r': 16, 'pinky_l': 17, 'pinky_r': 18, 'index_l': 19, 'index_r': 20, 'thumb_l': 21, 'thumb_r': 22,
      'hip_l': 23, 'hip_r': 24, 'knee_l': 25, 'knee_r': 26, 'ankle_l': 27, 'ankle_r': 28, 'heel_l': 29, 'heel_r': 30,
      'toe_l': 31, 'toe_r': 32}
NAMES = ['nose', 'ear_l', 'ear_r', 'shoulder_l', 'shoulder_r', 'elbow_l', 'elbow_r', 'wrist_l', 'wrist_r', 'hand_l', 'hand_r',
         'thumb_l', 'thumb_r', 'hip_l', 'hip_r', 'knee_l', 'knee_r', 'ankle_l', 'ankle_r', 'heel_l', 'heel_r', 'toe_l', 'toe_r']


def load(path):
    if path.endswith('.npy'):
        a = np.load(path).astype(float)
    else:
        rows = [r for r in csv.reader(open(path)) if r]
        rows = [r for r in rows if all(_isnum(x) for x in r[-99:])]
        a = np.array([[float(x) for x in r[-99:]] for r in rows])
    return a.reshape(len(a), -1, 3)[:, :33]


def _isnum(x):
    try:
        float(x); return True
    except ValueError:
        return x.strip().lower() == 'nan'


def fill_nans(a):
    t = np.arange(len(a))
    for j in range(a.shape[1]):
        for k in range(3):
            v = a[:, j, k]
            ok = np.isfinite(v)
            if ok.sum() >= 2 and not ok.all():
                a[:, j, k] = np.interp(t, t[ok], v[ok])
    return a


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--fps', type=float, required=True)
    ap.add_argument('--units', default='mm', choices=['mm', 'm'])
    ap.add_argument('--up', default='z', choices=['z', 'y', '-y'])
    ap.add_argument('--start', type=float, default=0); ap.add_argument('--end', type=float, default=1e9)
    a = ap.parse_args()
    P = fill_nans(load(a.src))
    P = P[int(a.start * a.fps):int(min(len(P), a.end * a.fps))]
    if a.units == 'mm':
        P = P / 1000
    if a.up == 'z':            # (x, y, z-up) -> (x, z, -y): right-handed, +Y up
        P = np.stack([P[..., 0], P[..., 2], -P[..., 1]], -1)
    elif a.up == '-y':         # image-style y-down -> y-up (flip y and z to stay right-handed)
        P = np.stack([P[..., 0], -P[..., 1], -P[..., 2]], -1)
    L = {n: P[:, i] for n, i in MP.items()}
    L['hand_l'] = (L['index_l'] + L['pinky_l']) / 2
    L['hand_r'] = (L['index_r'] + L['pinky_r']) / 2
    out = np.stack([L[n] for n in NAMES], 1)
    json.dump({'fps': a.fps, 'names': NAMES, 'units': 'm', 'up': '+Y', 'facing': 'any', 'source': a.src.replace('\\', '/').split('/')[-1],
               'frames': np.round(out.reshape(len(out), -1), 4).tolist()}, open(a.out, 'w'), separators=(',', ':'))
    print(f'{a.out}: {len(out)} frames @ {a.fps} fps ({len(out)/a.fps:.1f} s)')


if __name__ == '__main__':
    main()
