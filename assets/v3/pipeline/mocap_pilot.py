"""Build the 'real motion' pilot clips (assets/v3/mocap/<id>.<f|m>.kclip.json) from CMU / HDM05 mocap.

    python mocap_pilot.py <cmu_dir> <hdm05_cut_amc_dir> [--only id,id] [--sheets <dir>] [--cache <dir>]

<cmu_dir>     holds 144.asf, 144_17.amc, 144_30.amc, 113.asf, 113_28.amc, 113_29.amc  (http://mocap.cs.cmu.edu/subjects/<n>/)
<hdm05_dir>   the HDM05 'cut' library unpacked (HDM05_cut_amc/), for squat3Reps and jumpingJack3Reps (HDM_tr takes)
Writes every clip for both bodies plus assets/v3/mocap/index.json (what each clip is, where it came from, its QA numbers).

Each clip is an edit of one take: time windows, time-warped (monotone cubic) to the app clip's tempo, cross-faded at the joins
and at the loop seam; then cleaned on the body (foot lock, hand lock, floor). See docs/anim-v3-mocap-pilot.md.
"""
import os, sys, json, argparse, time
import numpy as np
import mocap as M

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'mocap')
BODIES = {'f': os.path.join(os.path.dirname(HERE), 'human_f.glb'), 'm': os.path.join(os.path.dirname(HERE), 'human_m.glb')}

CMU_ACK = 'The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.'
CMU_LIC = 'CMU Graphics Lab Motion Capture Database: free for all uses (no reselling of the data itself)'
HDM_LIC = 'CC BY-SA 3.0 (derived from HDM05, M. Müller, T. Röder, M. Clausen, B. Eberhardt, B. Krüger, A. Weber: Documentation Mocap Database HDM05, Universität Bonn, 2007)'


# ------------------------------------------------------------------------------------------------ edit helpers
class Src:
    """one take, prepared and retargeted once per body (cached)"""
    _cache = {}

    def __init__(self, key, asf, amc, ref, label, licence, url, fps=60., ref_dur=.4, f0=None):
        self.key, self.asf, self.amc, self.ref, self.label, self.licence, self.url, self.fps = key, asf, amc, ref, label, licence, url, fps
        self.ref_dur, self.f0 = ref_dur, f0
        self.take = None

    def motion(self, body, sex, cache_dir, log):
        k = (self.key, sex)
        if k in Src._cache:
            return Src._cache[k]
        if self.take is None:
            self.take = M.Take(self.asf, self.amc, label=self.key, cache_dir=cache_dir)
        log(f'  {self.key} ({sex}): {self.take.F / self.take.fps:.1f} s')
        pr = M.prepare(self.take, body, 0, (self.take.F - 1) / self.take.fps, self.ref, fps=self.fps, ref_dur=self.ref_dur, f0=self.f0, log=log)
        m = M.retarget(pr, body)
        m.pr = pr
        Src._cache[k] = m
        return m


def piece(m, knots, fps):
    """knots: [(source_s, out_s), ...] (out from 0); returns the warped piece"""
    src = [a for a, _ in knots]
    out = [b for _, b in knots]
    return M.warp(m, src, out, fps)


def hold(m, t, dur, fps, drift=None):
    """a held pose: the source around t, played very slowly (drift s of source over dur) so it is not dead still"""
    drift = .25 if drift is None else drift
    return piece(m, [(t, 0), (t + drift, dur + 1 / fps)], fps)


def join(parts, fade):
    """concatenate pieces, cross-fading fade frames at each join"""
    out = parts[0]
    for p in parts[1:]:
        out = M.crossfade(out, p, fade)
    return out


def centre(m, how='mean'):
    """horizontal centring of the whole clip (the body stays where it is relative to its feet)"""
    c = m.pel[:, [0, 2]].mean(0) if how == 'mean' else m.pel[0, [0, 2]]
    m.pel[:, 0] -= c[0]
    m.pel[:, 2] -= c[1]
    return m


def mirror(m):
    """left <-> right mirror of a motion on a left/right symmetric body (x -> -x)"""
    S = np.diag([-1., 1, 1])
    G = {}
    for k, v in m.G.items():
        o = k[:-1] + ('r' if k[-1] == 'l' else 'l') if k[-2:] in ('_l', '_r') else k
        G[o] = S @ v @ S
    return M.Motion(m.fps, G, m.pel * np.array([-1., 1, 1]))


def blend_to(m, target, n):
    """cross-fade the last n frames of m into target's first frame (a pose-to-pose bridge between non-adjacent source frames)"""
    return M.crossfade(m, target, n)


# ------------------------------------------------------------------------------------------------ the clips
def sources(cmu, hdm):
    c = lambda f: os.path.join(cmu, f)
    h = lambda cls, f: os.path.join(hdm, cls, f)
    cmu_url = lambda s, t: f'http://mocap.cs.cmu.edu/subjects/{s}/{s}_{t:02d}.amc'
    return {
        'cmu144_17': Src('cmu144_17', c('144.asf'), c('144_17.amc'), .3, 'CMU 144_17 "Lunges"', 'cmu', cmu_url(144, 17)),
        'cmu144_30': Src('cmu144_30', c('144.asf'), c('144_30.amc'), .3, 'CMU 144_30 "sun salutation"', 'cmu', cmu_url(144, 30)),
        'cmu113_28': Src('cmu113_28', c('113.asf'), c('113_28.amc'), .3, 'CMU 113_28 "Yoga"', 'cmu', cmu_url(113, 28)),
        'cmu113_29': Src('cmu113_29', c('113.asf'), c('113_29.amc'), .2, 'CMU 113_29 "Yoga"', 'cmu', cmu_url(113, 29)),
        'hdm_tr_squat012': Src('hdm_tr_squat012', h('squat3Reps', 'HDM_tr.asf'), h('squat3Reps', 'HDM_tr_squat3Reps_012_120.amc'), 1.9,
                               'HDM05 squat3Reps, actor tr, take 012', 'hdm', 'HDM05_cut_amc/squat3Reps/HDM_tr_squat3Reps_012_120.amc'),
        'hdm_tr_jack012': Src('hdm_tr_jack012', h('jumpingJack3Reps', 'HDM_tr.asf'), h('jumpingJack3Reps', 'HDM_tr_jumpingJack3Reps_012_120.amc'), 0.,
                              'HDM05 jumpingJack3Reps, actor tr, take 012', 'hdm', 'HDM05_cut_amc/jumpingJack3Reps/HDM_tr_jumpingJack3Reps_012_120.amc',
                              ref_dur=.08, f0={'l': 30, 'r': 28}),   # (standing knee flexion of this actor, from the squat take)
    }


def clip_squat(S, get, fps, log):
    """bodyweight_squat (v2: 3.8 s = top 0.5, down 2.0, bottom 0.3, up 1.0): HDM05 tr_012, the second rep"""
    m = get(S['hdm_tr_squat012'])
    c = piece(m, [(2.05, 0), (2.42, .5), (3.17, 2.48), (3.27, 2.78), (3.97, 3.8)], fps)
    c = M.loop_seam(c, 6)
    return centre(c), {'loop': True, 'src': [('hdm_tr_squat012', 2.05, 3.97)], 'fingers': [(0, 'relaxed')]}


def clip_jack(S, get, fps, log):
    """jumping_jack (v2: 1.16 s per jack): HDM05 tr_012, from one landing with the feet together to the next"""
    m = get(S['hdm_tr_jack012'])
    c = piece(m, [(1.45, 0), (2.61, 1.16)], fps)
    c = M.loop_seam(c, 4)
    return centre(c), {'loop': True, 'src': [('hdm_tr_jack012', 1.45, 2.61)], 'fingers': [(0, 'relaxed')],
                       'feet': {'speed': .9, 'contact_h': .03, 'min_len': 3}}


def clip_split(S, get, fps, log):
    """split_squat (v2: 7.6 s = right foot forward 3.8 s, then the left; each 0.4 top, 2.0 down, 0.3 bottom, 1.1 up).
    CMU 144_17 is forward lunges (step out, down, up, step back). Only the part with both feet planted is used, which is a
    split-squat rep; the step in and out is cut. Right foot forward from the take; the left side is its mirror image."""
    m = get(S['cmu144_17'])
    R = piece(m, [(6.585, 0), (6.60, .4), (7.03, 2.4), (7.12, 2.7), (7.47, 3.45), (7.56, 3.8)], fps)
    L = mirror(R)
    c = M.concat([R, L], fps)
    return centre(c), {'loop': True, 'swapAt': 3.8, 'dipWrap': True, 'src': [('cmu144_17', 6.585, 7.56), ('cmu144_17', 6.585, 7.56, 'mirror')],
                       'feet': {'cyclic': False},
                       'note': 'The in-place part of a forward lunge (both feet planted): a split-squat rep. The step forward and back is cut; the left side is the right side mirrored.'}


def prayer_arms(m, src, t_src, w):
    """composite: arms (clavicle..hand) from src at t_src, held relative to the chest of m; weight w per frame of m"""
    out = m.copy()
    k = int(round(t_src * src.fps))
    ch_src = src.G['spine_03'][k]
    for s in 'lr':
        for b in ('clavicle_', 'upperarm_', 'lowerarm_', 'hand_'):
            rel = ch_src.T @ src.G[b + s][k]
            tgt = m.G['spine_03'] @ rel
            out.G[b + s] = M.slerp_mats(m.G[b + s], tgt, np.asarray(w))
    return out


def ramp(F, fps, pts):
    """piecewise smooth weight over frames: pts = [(t, w), ...] (s)"""
    t = np.arange(F) / fps
    w = np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
    return w * w * (3 - 2 * w)


def clip_tree(S, get, fps, log):
    """vrikshasana (v2: 21.8 s; each side 0.5 stand, 2.4 up, 6 hold with a sway, 2 down; right foot up first).
    CMU 113_29: right foot then left foot high on the inner thigh, placed with a hand; the performer then holds the arms
    out to the sides, so the arms in the hold are replaced by CMU 144_30's palms-together-at-the-chest (the app's cue),
    held relative to this performer's chest (blended in after the foot is placed, out before it comes down)."""
    m = get(S['cmu113_29'])
    pr = get(S['cmu144_30'])
    w = ramp(m.F, m.fps, [(0, 0), (3.0, 0), (4.0, 1), (8.3, 1), (9.2, 0), (12.75, 0), (13.75, 1), (17.1, 1), (18.0, 0), (99, 0)])   # (after the performer is upright again)
    mc = prayer_arms(m, pr, 3.9, w)
    c = piece(mc, [(0.3, 0), (0.8, .5), (4.0, 3.5), (8.0, 8.9), (9.3, 10.9), (9.9, 11.4), (13.75, 14.6), (17.0, 19.8), (18.3, 21.8)], fps)
    c = M.loop_seam(c, 10)
    return centre(c), {'loop': True, 'src': [('cmu113_29', 0.3, 18.3), ('cmu144_30', 3.9, 3.9, 'arms')], 'palms_together': True,
                       'note': "Legs, trunk and head from 113_29 (right side, then left). That take holds the arms out to the sides; the palms-together arms in the hold are from 144_30 (another performer), so the clip matches the app's cue."}


def sn_step(key, knots, hold_dur=None, blend_to=None, fade=.6, note='', palms=False):
    """a Surya Namaskar position: the arrival (knots, from the previous position), then a hold to 5 s (one breath)"""
    def build(S, get, fps, log):
        m = get(S[key])
        A = piece(m, knots, fps)
        T = knots[-1][1]
        if blend_to is not None:
            B = hold(m, blend_to, 5 - T + fade, fps, drift=.08)
            c = M.crossfade(A, B, int(fade * fps))
        else:
            B = hold(m, knots[-1][0], 5 - T, fps, drift=hold_dur or .15)
            c = M.concat([A, B], fps)
        c = c.slice(0, int(round(5 * fps)))
        end = (blend_to if blend_to is not None else knots[-1][0]) + (hold_dur or .08)
        return c, {'loop': False, 'dipWrap': True, 'src': [(key, knots[0][0], end)], 'hands': True, 'floor': True, 'note': note,
                   'feet': {'cyclic': False}, 'palms_together': palms}
    return build


def clip_sn_round(S, get, fps, log):
    """surya_namaskar, whole round: CMU 144_30, one round (3.35-24.06 s) of an Ashtanga-style sun salutation (jump back to
    plank, low push-up, upward dog, downward dog, jump forward, half lift, rise; the chair pose is cut). Arrivals a little
    slower, holds about one breath. Not the app's Sivananda round (no lunges, no knees-chest-chin)."""
    m = get(S['cmu144_30'])
    A = piece(m, [(3.35, 0), (3.88, 1.2), (4.02, 2.2), (5.5, 4.0), (5.56, 4.9), (7.8, 7.4), (8.0, 8.4), (9.6, 10.4), (10.0, 11.0),
                  (10.8, 11.8), (11.2, 12.8), (11.8, 13.7), (12.1, 14.6), (13.3, 16.2), (14.0, 17.4), (15.0, 18.8), (16.1, 21.2),
                  (17.0, 22.1), (17.3, 22.5), (18.3, 23.9), (20.45, 26.4), (21.3, 27.8)], fps)
    B = piece(m, [(23.1, 0), (23.2, 1.0), (24.0, 2.6), (24.06, 3.8)], fps)
    c = M.crossfade(A, B, int(.6 * fps))
    return c, {'loop': False, 'dipWrap': True, 'src': [('cmu144_30', 3.35, 24.06)], 'hands': True, 'floor': True, 'feet': {'cyclic': False}, 'palms_together': True,
               'note': "One round of an Ashtanga-style sun salutation (jumps back to plank and forward again; low push-up and upward dog). The app teaches the Sivananda round with lunges, so this shows the quality of real motion, not the same sequence."}


SN_NOTE_144 = 'CMU 144_30 (sun salutation).'
CLIPS = {
    'bodyweight_squat': dict(build=clip_squat, fps=30, name='Bodyweight squat'),
    'split_squat': dict(build=clip_split, fps=30, name='Split squat'),
    'jumping_jack': dict(build=clip_jack, fps=30, name='Jumping jack'),
    'vrikshasana': dict(build=clip_tree, fps=20, name='Tree pose'),
    'surya_namaskar': dict(build=clip_sn_round, fps=20, name='Surya Namaskar (one round, jump-back variant)'),
    'sn_prayer': dict(build=sn_step('cmu144_30', [(3.30, 0), (3.36, .25), (3.88, 2.0)], hold_dur=.13, note=SN_NOTE_144, palms=True), fps=20, name='Standing, palms together'),
    'sn_raised_arms': dict(build=sn_step('cmu144_30', [(4.02, 0), (5.48, 1.9)], hold_dur=.08, note=SN_NOTE_144 + ' The hands go down and out before they rise (a swan arm), and the back arches only a little.'), fps=20, name='Arms up and back'),
    'sn_forward_fold': dict(build=sn_step('cmu144_30', [(5.52, 0), (7.75, 2.4)], hold_dur=.25, note=SN_NOTE_144 + " The palms stay a little above the floor, by the shins (the app's cue: palms beside the feet)."), fps=20, name='Forward fold'),
    'sn_cobra': dict(build=sn_step('cmu144_30', [(11.95, 0), (13.25, 2.0)], hold_dur=.7, note=SN_NOTE_144 + ' Close, not exact: an upward dog (arms straight) from a low push-up, where the app has a low cobra from knees-chest-chin.'), fps=20, name='Cobra (upward dog)'),
    'sn_dog': dict(build=sn_step('cmu144_30', [(13.95, 0), (15.05, 2.0)], hold_dur=1.0, note=SN_NOTE_144), fps=20, name='Inverted V'),
    'sn_lunge_in_r': dict(build=sn_step('cmu113_28', [(8.5, 0), (10.4, 1.6), (11.0, 2.0)], blend_to=18.75, note='CMU 113_28 (another performer). The back knee lowering is a blend between two frames of the take (the performer lowered it while folding forward).'), fps=20, name='Low lunge, right foot forward'),
    'sn_lunge_in_l': dict(build=sn_step('cmu113_28', [(25.0, 0), (26.6, 1.6), (27.2, 2.0)], blend_to=33.5, note='CMU 113_28 (another performer). The back knee lowering is a blend between two frames of the take.'), fps=20, name='Low lunge, left foot forward'),
    'sn_rise': dict(build=sn_step('cmu144_30', [(20.45, 0), (21.3, 1.7)], blend_to=23.12, note=SN_NOTE_144 + " The take bends into a chair pose here; that is cut and the rise blends into the take's standing arms-up frame."), fps=20, name='Arms up and back (rise)'),
    'sn_stand': dict(build=sn_step('cmu144_30', [(23.12, 0), (24.0, 1.8)], hold_dur=.06, note=SN_NOTE_144), fps=20, name='Standing, arms down'),
}
SN_MISSING = {
    'sn_lunge_r': 'No take steps one leg back from the forward fold into a low lunge (144_30 jumps back; 113_28 walks into the dog).',
    'sn_lunge_l': 'As sn_lunge_r.',
    'sn_plank': 'Only a jump-back plank exists (144_30), not a step back from a lunge.',
    'sn_plank_l': 'As sn_plank.',
    'sn_knees_chest': '144_30 lowers in one straight line (a low push-up), not knees, chest and forehead.',
    'sn_fold_in_l': 'No take steps the back foot forward from a lunge into the fold (113_28 goes back to the dog; 144_30 jumps).',
    'sn_fold_in_r': 'As sn_fold_in_l.',
}


# ------------------------------------------------------------------------------------------------ QA
def qa(m, body, loop=True):
    """foot slide (planted), floor penetration (soles, palms, flesh probes), loop seam"""
    P, GG = body.fk(m.G, m.pel)
    out = {}
    slides, pens = [], []
    for s in 'lr':
        heel, toe = M.sole_points(body, P, GG, s)
        low = np.minimum(heel[:, 1], toe[:, 1])
        pens.append(low.min())
        for pt in (heel, toe):
            v = np.linalg.norm(np.gradient(pt[:, [0, 2]], axis=0), axis=-1) * m.fps
            planted = pt[:, 1] < .01
            if planted.sum() > 3:
                slides.append(np.percentile(v[planted], 95))
    out['foot_slide_p95_cm_s'] = round(float(max(slides) * 100), 1) if slides else None
    out['sole_min_cm'] = round(float(min(pens) * 100), 1)
    pp = [M.palm_point(body, P, GG, s)[:, 1].min() for s in 'lr']
    out['palm_min_cm'] = round(float(min(pp) * 100), 1)
    V = body.skin(P, GG, body.probe)
    out['flesh_min_cm'] = round(float(V[:, :, 1].min() * 100), 1)
    # loop seam: rotation step across the wrap vs the clip's typical step (max over bones), and pelvis jump
    if loop:
        steps, seam = [], []
        for k, v in m.G.items():
            d = M.Rot.from_matrix(np.concatenate([v, v[:1]])).as_quat()
            dots = np.abs(np.sum(d[1:] * d[:-1], -1))
            ang = 2 * np.degrees(np.arccos(np.clip(dots, 0, 1)))
            steps.append(np.percentile(ang[:-1], 95))
            seam.append(ang[-1])
        out['seam_rot_deg'] = round(float(max(seam)), 1)
        out['typical_step_p95_deg'] = round(float(max(steps)), 1)
        out['seam_pelvis_cm'] = round(float(np.linalg.norm(m.pel[-1] - m.pel[0]) * 100), 1)
        out['typical_pelvis_step_cm'] = round(float(np.percentile(np.linalg.norm(np.diff(m.pel, axis=0), axis=-1), 95) * 100), 1)
    return out


# ------------------------------------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmu'); ap.add_argument('hdm')
    ap.add_argument('--only', default='')
    ap.add_argument('--sheets', default='')
    ap.add_argument('--cache', default='')
    ap.add_argument('--bodies', default='fm')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    S = sources(a.cmu, a.hdm)
    ids = [i for i in CLIPS if not a.only or i in a.only.split(',')]
    idx_path = os.path.join(OUT, 'index.json')
    index = json.load(open(idx_path, encoding='utf8')) if os.path.exists(idx_path) else {'clips': {}}
    log = print
    for sex in a.bodies:
        body = M.Body(BODIES[sex])
        get = lambda src: src.motion(body, sex, a.cache or None, log)
        for cid in ids:
            spec = CLIPS[cid]
            t0 = time.time()
            log(f'== {cid} ({sex})')
            m, info = spec['build'](S, get, spec['fps'], log)
            loop = info.get('loop', True)
            fo = dict(info.get('feet', {}))
            cyc = fo.pop('cyclic', loop)
            m = M.foot_lock(m, body, cyclic=cyc, log=log, **fo)
            if info.get('hands'):
                m, gap, pull, shift = M.hand_lock(m, body, cyclic=cyc, log=log)
                m = M.foot_lock(m, body, cyclic=cyc, log=log, **fo)
                m, gap, pull, shift2 = M.hand_lock(m, body, cyclic=cyc, log=log)
                info['hand_gap_cm'], info['hand_pull_cm'], info['body_shift_cm'] = round(gap * 100, 1), round(pull * 100, 1), round(shift * 100, 1)
            if info.get('floor'):
                m, lift = M.floor_lift(m, body, log=log)
                m = M.foot_lock(m, body, cyclic=cyc, log=log, **fo)
            if info.get('palms_together'):
                m = M.palms_together(m, body, log=log)
            q = qa(m, body, loop and not info.get('dipWrap'))
            if info.get('hands'):
                q['palm_moved_cm'], q['palm_unreachable_cm'], q['body_moved_to_hands_cm'] = info['hand_pull_cm'], info['hand_gap_cm'], info['body_shift_cm']
            log(f'  QA {q}')
            srcs = [S[k] for k, *_ in info['src']]
            lic = 'CC BY-SA 3.0' if any(s.licence == 'hdm' for s in srcs) else 'CMU'
            meta = {'id': cid, 'name': spec['name'], 'loop': loop, 'period': round(m.F / spec['fps'], 3),
                    'swapAt': info.get('swapAt'), 'dipWrap': info.get('dipWrap', False), 'steps': info.get('steps'),
                    'source': '; '.join(f'{S[k].label} {a0:.2f}-{a1:.2f} s' + (' (mirrored)' if len(r) > 0 and r and r[0] == 'mirror' else '')
                                        for k, a0, a1, *r in info['src']),
                    'licence': HDM_LIC if lic != 'CMU' else CMU_LIC, 'credit': CMU_ACK if lic == 'CMU' else HDM_LIC,
                    'qa': q, 'note': info.get('note', '')}
            Q, tl = M.to_local(m, body)
            meta['fingers'] = M.finger_meta(body, info.get('fingers') or M.auto_fingers(m, body), spec['fps'])
            k = M.encode(Q, tl, spec['fps'], meta)
            path = os.path.join(OUT, f'{cid}.{sex}.kclip.json')
            json.dump(k, open(path, 'w'), separators=(',', ':'))
            log(f'  -> {os.path.relpath(path, os.path.dirname(OUT))}: {m.F} frames, {len(k["bones"])} tracks, {os.path.getsize(path) / 1024:.0f} KB ({time.time() - t0:.1f} s)')
            e = index['clips'].setdefault(cid, {})
            e.update({'name': spec['name'], 'period': meta['period'], 'loop': loop, 'source': meta['source'], 'licence': meta['licence'],
                      'note': meta['note'], 'swapAt': meta['swapAt'], 'steps': meta['steps']})
            e.setdefault('qa', {})[sex] = q
            if a.sheets:
                import mocap_preview as V
                V.sheet(m, body, os.path.join(a.sheets, f'{cid}.{sex}.png'), n=10, title=f'{cid} ({sex})')
    index['credit'] = {'cmu': CMU_ACK, 'hdm05': HDM_LIC}
    index['missing'] = SN_MISSING
    index['clips'] = {k: index['clips'][k] for k in CLIPS if k in index['clips']}
    json.dump(index, open(idx_path, 'w', encoding='utf8'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    main()
