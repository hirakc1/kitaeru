"""CMU mocap (ASF/AMC) -> Kitaeru landmark track (JSON), for PIPELINE TESTING ONLY.

    python cmu_to_landmarks.py 13.asf 13_29.amc out.landmarks.json [--start s] [--end s]

The landmark set deliberately matches what a phone-video pose estimator gives (MediaPipe BlazePose / FreeMoCap
names): nose, ears, shoulders, elbows, wrists, hand (knuckle centre), thumb, hips, knees, ankles, heels, toes.
So the retargeter (landmarks_to_clip.py) is exactly the one the real filmed motion will go through.

Output JSON: {fps, names:[...], frames:[[x,y,z,...] per frame], units:'m', up:'+Y', facing:'+Z', source:...}
CMU data: http://mocap.cs.cmu.edu/ "free for all uses" (see assets/v3/LICENSES.md).
"""
import sys, json, argparse
import numpy as np
from scipy.spatial.transform import Rotation as R

TO_M = (1 / 0.45) * 0.0254          # CMU ASF 'length 0.45' units -> inches -> metres


def euler_xyz(deg):
    # CMU/Acclaim 'XYZ' axis & dof order: M = Rz @ Ry @ Rx (static xyz)
    return R.from_euler('xyz', deg, degrees=True).as_matrix()


def parse_asf(path):
    lines = [l.strip() for l in open(path) if l.strip() and not l.startswith('#')]
    bones = {'root': {'dir': np.zeros(3), 'len': 0, 'axis': np.eye(3), 'dof': ['rx', 'ry', 'rz']}}
    hier = {}
    i, sec = 0, ''
    while i < len(lines):
        l = lines[i]
        if l.startswith(':'):
            sec = l.split()[0]
        if l == 'begin' and sec == ':bonedata':
            b = {'dof': []}
            i += 1
            while lines[i] != 'end':
                t = lines[i].split()
                if t[0] == 'name': name = t[1]
                elif t[0] == 'direction': b['dir'] = np.array(list(map(float, t[1:4])))
                elif t[0] == 'length': b['len'] = float(t[1])
                elif t[0] == 'axis': b['axis'] = euler_xyz(list(map(float, t[1:4])))
                elif t[0] == 'dof': b['dof'] = t[1:]
                i += 1
            bones[name] = b
        elif l == 'begin' and sec == ':hierarchy':
            i += 1
            while lines[i] != 'end':
                t = lines[i].split()
                hier[t[0]] = t[1:]
                i += 1
        i += 1
    return bones, hier


def parse_amc(path):
    frames, cur = [], None
    for l in open(path):
        l = l.strip()
        if not l or l[0] in '#:':
            continue
        if l.isdigit():
            cur = {}
            frames.append(cur)
            continue
        t = l.split()
        cur[t[0]] = list(map(float, t[1:]))
    return frames


def fk(bones, hier, fr):
    """world end positions + world rotation matrices of every bone for one AMC frame"""
    pos, rot = {}, {}
    rv = fr['root']
    pos['root'] = np.array(rv[:3]) * TO_M
    rot['root'] = euler_xyz(rv[3:6])
    stack = ['root']
    while stack:
        p = stack.pop()
        for c in hier.get(p, []):
            b = bones[c]
            ang = {'rx': 0., 'ry': 0., 'rz': 0.}
            for k, v in zip(b['dof'], fr.get(c, [])):
                ang[k] = v
            L = euler_xyz([ang['rx'], ang['ry'], ang['rz']])
            C = b['axis']
            rot[c] = rot[p] @ C @ L @ C.T
            pos[c] = pos[p] + rot[c] @ (b['dir'] * b['len'] * TO_M)
            stack.append(c)
    return pos, rot


NAMES = ['nose', 'ear_l', 'ear_r', 'shoulder_l', 'shoulder_r', 'elbow_l', 'elbow_r', 'wrist_l', 'wrist_r', 'hand_l', 'hand_r',
         'thumb_l', 'thumb_r', 'hip_l', 'hip_r', 'knee_l', 'knee_r', 'ankle_l', 'ankle_r', 'heel_l', 'heel_r', 'toe_l', 'toe_r']


def landmarks(pos, rot):
    H = rot['head']
    base = pos['upperneck']
    L = {
        'nose': base + H @ [0, .06, .1], 'ear_l': base + H @ [.075, .05, 0], 'ear_r': base + H @ [-.075, .05, 0],
    }
    for s, c in (('l', 'l'), ('r', 'r')):
        L['shoulder_' + s] = pos[c + 'clavicle']
        L['elbow_' + s] = pos[c + 'humerus']
        L['wrist_' + s] = pos[c + 'radius']
        L['hand_' + s] = pos[c + 'hand']
        L['thumb_' + s] = pos[c + 'thumb']
        L['hip_' + s] = pos[c + 'hipjoint']
        L['knee_' + s] = pos[c + 'femur']
        L['ankle_' + s] = pos[c + 'tibia']
        L['toe_' + s] = pos[c + 'toes']
        L['heel_' + s] = pos[c + 'tibia'] + rot[c + 'foot'] @ [0, -.06, -.05]
    return np.array([L[n] for n in NAMES])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('asf'); ap.add_argument('amc'); ap.add_argument('out')
    ap.add_argument('--fps', type=float, default=120)
    ap.add_argument('--start', type=float, default=0); ap.add_argument('--end', type=float, default=1e9)
    a = ap.parse_args()
    bones, hier = parse_asf(a.asf)
    frames = parse_amc(a.amc)
    f0, f1 = int(a.start * a.fps), min(len(frames), int(a.end * a.fps))
    out = np.array([landmarks(*fk(bones, hier, fr)) for fr in frames[f0:f1]])
    json.dump({'fps': a.fps, 'names': NAMES, 'units': 'm', 'up': '+Y', 'facing': 'any',
               'source': f'CMU Graphics Lab Motion Capture Database, {a.amc.split("/")[-1]} (mocap.cs.cmu.edu)',
               'frames': np.round(out.reshape(len(out), -1), 4).tolist()}, open(a.out, 'w'), separators=(',', ':'))
    print(f'{a.out}: {len(out)} frames @ {a.fps} fps ({len(out)/a.fps:.1f} s)')


if __name__ == '__main__':
    main()
