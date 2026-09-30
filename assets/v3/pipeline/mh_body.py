"""MakeHuman (CC0) base mesh -> an everyday-proportion body in metres, with the 'game engine' rig and its skin weights.

Reads the CC0 asset data that ships inside MPFB2 (https://github.com/makehumancommunity/mpfb2, folder src/mpfb/data;
assets CC0 1.0, see LICENSE.ASSETS.md there). No Blender or MakeHuman program is run: the macro targets are applied and
the joints placed here, in numpy, the same way MakeHuman / MPFB do it:
  * macro targets: the race targets (african / asian / caucasian, 1/3 each: MakeHuman's default mix) for the gender at
    age 25 ('young'), average muscle, average weight, average height and proportions (all MakeHuman defaults);
  * joints: the rig's 'CUBE' strategy = the mean of the helper joint-cube's vertices (they move with the targets),
    'MEAN' = the mean of the listed vertices;
  * weights: the rig's weights file, top 4 per vertex.

Coordinates out: metres, +Y up, the body faces +Z, its left is +X, the soles on y = 0, the pelvis joint at x = z = 0.
"""
import gzip, json, os
import numpy as np


def ranges(rs):
    out = []
    for a, b in rs:
        out.extend(range(a, b + 1))
    return np.array(out, dtype=np.int64)


class MHData:
    def __init__(self, data_dir):
        self.dir = data_dir
        self.groups = json.load(open(os.path.join(data_dir, 'mesh_metadata', 'basemesh_vertex_groups.json')))
        self._obj()

    def _obj(self):
        V, UV, F, FT, G = [], [], [], [], []
        g = ''
        with open(os.path.join(self.dir, '3dobjs', 'base.obj')) as f:
            for line in f:
                if line.startswith('v '):
                    V.append([float(x) for x in line.split()[1:4]])
                elif line.startswith('vt '):
                    UV.append([float(x) for x in line.split()[1:3]])
                elif line.startswith('g '):
                    g = line.split()[1]
                elif line.startswith('f '):
                    it = [p.split('/') for p in line.split()[1:]]
                    F.append([int(p[0]) - 1 for p in it])
                    FT.append([int(p[1]) - 1 if len(p) > 1 and p[1] else -1 for p in it])
                    G.append(g)
        self.V0 = np.array(V, np.float64)
        self.UV = np.array(UV, np.float64)
        self.F, self.FT, self.FG = F, FT, G

    def group(self, name):
        return ranges(self.groups[name])

    def target(self, rel):
        p = os.path.join(self.dir, 'targets', rel)
        if not p.endswith('.gz'):
            p += '.target.gz'
        idx, d = [], []
        with gzip.open(p, 'rt') as f:
            for line in f:
                s = line.split()
                if len(s) == 4 and not line.startswith('#'):
                    idx.append(int(s[0])); d.append([float(x) for x in s[1:]])
        return np.array(idx, np.int64), np.array(d, np.float64).reshape(-1, 3)


def build(data_dir, sex, extra=()):
    """sex: 'female' | 'male'. extra: [(target path, weight)]. Returns dict with mesh, rig and weights (metres)."""
    mh = MHData(data_dir)
    V = mh.V0.copy()
    mods = [(f'macrodetails/{race}-{sex}-young', 1 / 3) for race in ('african', 'asian', 'caucasian')]
    mods += [(f'macrodetails/universal-{sex}-young-averagemuscle-averageweight', 1.0)]
    mods += list(extra)
    applied = []
    for rel, w in mods:
        i, d = mh.target(rel)
        if len(i):
            V[i] += w * d
        applied.append((rel, w, int(len(i))))
    # ---- rig ----
    rig = json.load(open(os.path.join(data_dir, 'rigs', 'standard', 'rig.game_engine.json')))

    def at(spec):
        if spec['strategy'] == 'CUBE':
            return V[mh.group(spec['cube_name'])].mean(0)
        if spec['strategy'] == 'MEAN':
            return V[np.array(spec['vertex_indices'])].mean(0)
        if spec['strategy'] == 'VERTEX':
            return V[spec['vertex_index']]
        raise ValueError(spec['strategy'])
    bones = {}
    for name, b in rig.items():
        bones[name] = {'head': at(b['head']), 'tail': at(b['tail']), 'parent': b['parent'] or None}
    # parents before children
    order, seen = [], set()

    def visit(n):
        if n in seen:
            return
        p = bones[n]['parent']
        if p:
            visit(p)
        seen.add(n); order.append(n)
    for n in bones:
        visit(n)
    # ---- units + placement: dm -> m, soles on the floor, pelvis joint at x = z = 0 ----
    body = mh.group('body')
    s = .1
    off = np.array([-bones['pelvis']['head'][0], -V[body, 1].min(), -bones['pelvis']['head'][2]])
    V = (V + off) * s
    for b in bones.values():
        b['head'] = (b['head'] + off) * s
        b['tail'] = (b['tail'] + off) * s
    # ---- weights ----
    W = json.load(open(os.path.join(data_dir, 'rigs', 'standard', 'weights.game_engine.json')))
    names = order
    bi = {n: i for i, n in enumerate(names)}
    nv = len(V)
    pairs = [[] for _ in range(nv)]
    for bn, lst in W['weights'].items():
        for v, w in lst:
            pairs[v].append((w, bi[bn]))
    J = np.zeros((nv, 4), np.int32)
    Wt = np.zeros((nv, 4), np.float64)
    for v, p in enumerate(pairs):
        p.sort(reverse=True)
        p = p[:4]
        tot = sum(w for w, _ in p) or 1
        for k, (w, j) in enumerate(p):
            J[v, k] = j; Wt[v, k] = w / tot
        if not p:
            J[v, 0] = bi['head' if V[v, 1] > 1.4 else 'pelvis']; Wt[v, 0] = 1
    # full weight matrix (for region painting)
    Wfull = np.zeros((nv, len(names)), np.float32)
    for k in range(4):
        np.add.at(Wfull, (np.arange(nv), J[:, k]), Wt[:, k])
    return {'V': V, 'F': mh.F, 'FG': mh.FG, 'mh': mh, 'bones': bones, 'names': names, 'J': J, 'W': Wt, 'Wfull': Wfull,
            'applied': applied, 'weights_meta': {k: W[k] for k in ('name', 'license', 'copyright', 'version') if k in W}}
