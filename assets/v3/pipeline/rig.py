"""Kitaeru anim v3 pipeline: minimal glTF 2.0 reader (JSON + .bin or .glb) and rest-pose forward kinematics.

Python 3 + numpy + scipy only. Quaternions are [x, y, z, w] (glTF / three.js order).
"""
import json, struct, os
import numpy as np
from scipy.spatial.transform import Rotation as R

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


class GLTF:
    def __init__(self, path):
        self.dir = os.path.dirname(path)
        if path.lower().endswith('.glb'):
            data = open(path, 'rb').read()
            n = struct.unpack_from('<I', data, 12)[0]
            self.j = json.loads(data[20:20 + n])
            o = 20 + n
            ln = struct.unpack_from('<I', data, o)[0]
            self.bins = [data[o + 8:o + 8 + ln]]
        else:
            self.j = json.load(open(path, encoding='utf8'))
            self.bins = [open(os.path.join(self.dir, b['uri']), 'rb').read() for b in self.j['buffers']]
        self.nodes = self.j['nodes']
        self.parent = {}
        for i, n in enumerate(self.nodes):
            for c in n.get('children', []):
                self.parent[c] = i

    def acc(self, i):
        a = self.j['accessors'][i]
        bv = self.j['bufferViews'][a['bufferView']]
        dt = CT[a['componentType']]
        nc = NC[a['type']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = bv.get('byteStride', 0)
        item = np.dtype(dt).itemsize * nc
        buf = self.bins[bv['buffer']]
        if stride and stride != item:
            rows = [np.frombuffer(buf, dt, nc, off + k * stride) for k in range(a['count'])]
            out = np.array(rows)
        else:
            out = np.frombuffer(buf, dt, a['count'] * nc, off).reshape(a['count'], nc).copy()
        if a.get('normalized'):
            out = out.astype(np.float32) / np.iinfo(dt).max
        return out

    def local(self, i):
        n = self.nodes[i]
        if 'matrix' in n:
            return np.array(n['matrix'], dtype=float).reshape(4, 4).T
        m = np.eye(4)
        m[:3, :3] = R.from_quat(n.get('rotation', [0, 0, 0, 1])).as_matrix() @ np.diag(n.get('scale', [1, 1, 1]))
        m[:3, 3] = n.get('translation', [0, 0, 0])
        return m

    def world(self, i):
        m = self.local(i)
        while i in self.parent:
            i = self.parent[i]
            m = self.local(i) @ m
        return m

    def index(self, name):
        for i, n in enumerate(self.nodes):
            if n.get('name') == name:
                return i
        raise KeyError(name)


class Rig:
    """Rest pose of a skinned glTF: per-bone world matrices, heads, parents."""

    def __init__(self, g: GLTF, skin=0):
        self.g = g
        sk = g.j['skins'][skin]
        self.joints = sk['joints']
        self.names = [g.nodes[j]['name'] for j in self.joints]
        self.W = {g.nodes[j]['name']: g.world(j) for j in self.joints}
        self.L = {g.nodes[j]['name']: g.local(j) for j in self.joints}
        self.parent = {}
        for j in self.joints:
            p = g.parent.get(j)
            self.parent[g.nodes[j]['name']] = g.nodes[p]['name'] if p is not None else None
        # parent world of the top joint (armature transform), so a clip can be expressed as local rotations
        top = [n for n in self.names if self.parent[n] not in self.names]
        self.top = top

    def head(self, name):
        return self.W[name][:3, 3].copy()

    def rot(self, name):
        m = self.W[name][:3, :3]
        u, _, vt = np.linalg.svd(m)          # strip any scale
        return u @ vt

    def parent_world(self, name):
        p = self.parent[name]
        if p in self.W:
            return self.W[p]
        j = self.joints[self.names.index(name)]
        pp = self.g.parent.get(j)
        return self.g.world(pp) if pp is not None else np.eye(4)
