"""Contact sheets of a Motion on the body (skinned silhouette points + bones), for eyeballing clips offline.

    from mocap_preview import sheet; sheet(motion, body, 'out.png', n=8, views=('side', 'front'))
"""
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mocap import mv

LINES = [('pelvis', 'spine_01'), ('spine_01', 'spine_02'), ('spine_02', 'spine_03'), ('spine_03', 'neck_01'), ('neck_01', 'head'),
         ('spine_03', 'clavicle_l'), ('clavicle_l', 'upperarm_l'), ('upperarm_l', 'lowerarm_l'), ('lowerarm_l', 'hand_l'), ('hand_l', 'middle_01_l'),
         ('spine_03', 'clavicle_r'), ('clavicle_r', 'upperarm_r'), ('upperarm_r', 'lowerarm_r'), ('lowerarm_r', 'hand_r'), ('hand_r', 'middle_01_r'),
         ('pelvis', 'thigh_l'), ('thigh_l', 'calf_l'), ('calf_l', 'foot_l'), ('foot_l', 'ball_l'),
         ('pelvis', 'thigh_r'), ('thigh_r', 'calf_r'), ('calf_r', 'foot_r'), ('foot_r', 'ball_r')]


def sheet(m, body, out, n=8, frames=None, views=('side', 'front'), title='', mesh_every=3):
    P, GG = body.fk(m.G, m.pel)
    frames = np.linspace(0, m.F - 1, n).astype(int) if frames is None else np.asarray(frames)
    idx = np.arange(0, len(body.v_pos), mesh_every)
    V = body.skin(P, GG, idx, frames)
    fig, axs = plt.subplots(len(views), len(frames), figsize=(1.9 * len(frames), 3.4 * len(views)), squeeze=False)
    for vi, view in enumerate(views):
        for fi, f in enumerate(frames):
            ax = axs[vi, fi]
            # side: from the body's right (x = -z ... show z horizontally); front: x horizontally (mirror: viewer faces body)
            hx = (lambda p: p[..., 2]) if view == 'side' else (lambda p: -p[..., 0])
            v = V[fi]
            ax.scatter(hx(v), v[:, 1], s=.4, c='#c9b9a0', alpha=.35, linewidths=0)
            for a, b in LINES:
                pa, pb = P[a][f], P[b][f]
                col = '#c8372d' if a.endswith('_r') or b.endswith('_r') else '#1c1b19'
                ax.plot([hx(pa), hx(pb)], [pa[1], pb[1]], '-', c=col, lw=1.2)
            hp = P['head'][f] + mv(GG['head'][f], np.array([0, .09, .02]))
            ax.plot(hx(hp), hp[1], 'o', ms=7, mfc='none', mec='#1c1b19')
            ax.axhline(0, c='#888', lw=.6)
            c = P['pelvis'][f]
            ax.set_xlim(hx(c) - 1.0, hx(c) + 1.0); ax.set_ylim(-.05, 2.0)
            ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([])
            ax.set_title(f'{f / m.fps:.2f}s {view}', fontsize=7)
    if title:
        fig.suptitle(title, fontsize=9)
    fig.tight_layout()
    fig.savefig(out, dpi=70)
    plt.close(fig)
