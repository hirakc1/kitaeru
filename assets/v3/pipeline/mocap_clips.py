"""Build the app's real-motion clips (assets/v3/mocap/<id>.<f|m>.kclip.json) from CMU / HDM05 motion capture.

    python mocap_clips.py <cmu_dir> <hdm05_cut_amc_dir> [--only id,id] [--sheets <dir>] [--cache <dir>] [--bodies fm]

<cmu_dir>     144.asf 144_17/144_30.amc, 113.asf 113_28/113_29.amc, 12.asf 12_04.amc   (http://mocap.cs.cmu.edu/subjects/<n>/)
<hdm05_dir>   the HDM05 'cut' library unpacked (HDM05_cut_amc/): squat3Reps, jumpingJack3Reps, walkOnPlace4StepsRStart
Writes every clip for both bodies, assets/v3/mocap/index.json (what each clip is, where it came from, its QA numbers;
read by anim-review.html) and js/anim/v3/mocap-index.js (the ids the app plays as real motion).

Each clip is an edit of one take (or a leg / arm composite of two): time windows, time-warped (one monotone cubic per clip, so
the speed never jumps) to the app clip's tempo, cross-faded at joins and at the loop seam; then cleaned on the body (foot
lock, hand lock, floor, prayer palms), every correction low-passed (mocap.smooth_fix) so none of them pops. See
docs/anim-v3-mocap.md.
"""
import os, sys, json, argparse, time
import numpy as np
import mocap as M

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
OUT = os.path.join(os.path.dirname(HERE), 'mocap')
JS_INDEX = os.path.join(ROOT, 'js', 'anim', 'v3', 'mocap-index.js')
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
    """knots: [(source_s, out_s), ...] (out from 0); one monotone cubic time warp through all of them"""
    return M.warp(m, [a for a, _ in knots], [b for _, b in knots], fps)


def centre(m, how='mean'):
    """horizontal centring of the whole clip (the player puts it where the v2 clip's feet are)"""
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


def ramp(F, fps, pts):
    """piecewise smooth weight over frames: pts = [(t, w), ...] (s)"""
    t = np.arange(F) / fps
    w = np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
    return w * w * (3 - 2 * w)


def prayer_arms(m, src, t_src, w):
    """composite: arms (clavicle..hand) from src at t_src, held relative to the chest of m; weight w per frame of m"""
    return M.composite_arms_ik(m, src, np.full(m.F, t_src), w)


def ankle_peaks(m, s, min_h=.12):
    """frames where foot s is highest (a step's top), from the motion's own ankle heights"""
    P, _ = M.Body.fk(ankle_peaks.body, m.G, m.pel)
    y = P['foot_' + s][:, 1]
    return M.peaks(y, m.fps, .35, y.min() + min_h)


# ------------------------------------------------------------------------------------------------ the takes
def sources(cmu, hdm):
    c = lambda f: os.path.join(cmu, f)
    h = lambda cls, f: os.path.join(hdm, cls, f)
    cmu_url = lambda s, t: f'http://mocap.cs.cmu.edu/subjects/{s}/{s}_{t:02d}.amc'
    hdm_url = lambda cls, f: f'HDM05_cut_amc/{cls}/{f}'
    W = 'walkOnPlace4StepsRStart'
    return {
        'cmu144_30': Src('cmu144_30', c('144.asf'), c('144_30.amc'), .3, 'CMU 144_30 "sun salutation"', 'cmu', cmu_url(144, 30)),
        'cmu113_28': Src('cmu113_28', c('113.asf'), c('113_28.amc'), .3, 'CMU 113_28 "Yoga"', 'cmu', cmu_url(113, 28)),
        'cmu113_29': Src('cmu113_29', c('113.asf'), c('113_29.amc'), .2, 'CMU 113_29 "Yoga"', 'cmu', cmu_url(113, 29)),
        'cmu12_04': Src('cmu12_04', c('12.asf'), c('12_04.amc'), 7.0, 'CMU 12_04 "tai chi"', 'cmu', cmu_url(12, 4)),
        'hdm_tr_squat012': Src('hdm_tr_squat012', h('squat3Reps', 'HDM_tr.asf'), h('squat3Reps', 'HDM_tr_squat3Reps_012_120.amc'), 1.9,
                               'HDM05 squat3Reps, actor tr, take 012', 'hdm', hdm_url('squat3Reps', 'HDM_tr_squat3Reps_012_120.amc')),
        'hdm_tr_jack012': Src('hdm_tr_jack012', h('jumpingJack3Reps', 'HDM_tr.asf'), h('jumpingJack3Reps', 'HDM_tr_jumpingJack3Reps_012_120.amc'), 0.,
                              'HDM05 jumpingJack3Reps, actor tr, take 012', 'hdm', hdm_url('jumpingJack3Reps', 'HDM_tr_jumpingJack3Reps_012_120.amc'),
                              ref_dur=.08, f0={'l': 30, 'r': 28}),   # (standing knee flexion of this actor, from the squat take)
        'hdm_bd_walk002': Src('hdm_bd_walk002', h(W, 'HDM_bd.asf'), h(W, 'HDM_bd_walkOnPlace4StepsRStart_002_120.amc'), 0.,
                              'HDM05 walkOnPlace4StepsRStart, actor bd, take 002', 'hdm', hdm_url(W, 'HDM_bd_walkOnPlace4StepsRStart_002_120.amc'), ref_dur=.15),
        'hdm_bk_walk004': Src('hdm_bk_walk004', h(W, 'HDM_bk.asf'), h(W, 'HDM_bk_walkOnPlace4StepsRStart_004_120.amc'), 0.,
                              'HDM05 walkOnPlace4StepsRStart, actor bk, take 004', 'hdm', hdm_url(W, 'HDM_bk_walkOnPlace4StepsRStart_004_120.amc'), ref_dur=.3),
        'hdm_mm_walk011': Src('hdm_mm_walk011', h(W, 'HDM_mm.asf'), h(W, 'HDM_mm_walkOnPlace4StepsRStart_011_120.amc'), 0.,
                              'HDM05 walkOnPlace4StepsRStart, actor mm, take 011', 'hdm', hdm_url(W, 'HDM_mm_walkOnPlace4StepsRStart_011_120.amc'), ref_dur=.08),
    }


# ------------------------------------------------------------------------------------------------ the clips
def clip_squat(S, get, fps, log):
    """bodyweight_squat (v2: 3.8 s = top 0.5, down 2.0, bottom 0.3, up 1.0): HDM05 tr_012, the second rep"""
    m = get(S['hdm_tr_squat012'])
    c = piece(m, [(2.05, 0), (2.42, .5), (3.17, 2.48), (3.27, 2.78), (4.0, 3.62), (4.15, 3.8)], fps)   # (ends standing still, as it starts)
    c = M.loop_spread(c, ankle_peaks.body)
    return centre(c), {'relax_hands': True, 'loop': True, 'src': [('hdm_tr_squat012', 2.05, 4.15)], 'fingers': [(0, 'relaxed')], 'feet': {'flat': True, 'always': 'lr'}}


def clip_jack(S, get, fps, log):
    """jumping_jack (v2: 1.16 s per jack): HDM05 tr_012, from one landing with the feet together to the next"""
    m = get(S['hdm_tr_jack012'])
    # cut at the top of a hop (the body still for an instant), not at a landing: a cut at a landing joins a fall straight
    # to a rise, with no landing between
    pk = M.peaks(m.pel[:, 1], m.fps, .3) / m.fps
    a = pk[np.argmin(np.abs(pk - 1.7))]
    b = pk[np.argmin(np.abs(pk - (a + 1.16)))]
    log(f'  jack cycle: hop tops at {a:.2f} and {b:.2f} s')
    c = piece(m, [(a, 0), (b, 1.16)], fps)
    c = M.loop_spread(c, ankle_peaks.body)
    return centre(c), {'relax_hands': True, 'loop': True, 'src': [('hdm_tr_jack012', a, b)], 'fingers': [(0, 'relaxed')],
                       'feet': {'speed': .9, 'contact_h': .03, 'min_len': 3}, 'fix_hz': 5., 'ground': False}


def clip_tree(S, get, fps, log):
    """vrikshasana (v2: 21.8 s; each side 0.5 stand, 2.4 up, 6 hold with a sway, 2 down; right foot up first).
    CMU 113_29: right foot then left foot high on the inner thigh, placed with a hand; the performer then holds the arms
    out to the sides, so the arms in the hold are replaced by CMU 144_30's palms-together-at-the-chest (the app's cue),
    held relative to this performer's chest (blended in after the foot is placed, out before it comes down)."""
    m = get(S['cmu113_29'])
    pr = get(S['cmu144_30'])
    w = ramp(m.F, m.fps, [(0, 0), (3.0, 0), (4.0, 1), (8.3, 1), (9.2, 0), (12.75, 0), (13.75, 1), (17.1, 1), (18.0, 0), (99, 0)])
    mc = prayer_arms(m, pr, 3.9, w)
    c = piece(mc, [(0.3, 0), (0.8, .5), (4.0, 3.5), (8.0, 8.9), (9.3, 10.9), (9.9, 11.4), (13.75, 14.6), (17.0, 19.8), (18.3, 21.8)], fps)
    c = M.loop_spread(c, ankle_peaks.body)
    return centre(c), {'loop': True, 'src': [('cmu113_29', 0.3, 18.3), ('cmu144_30', 3.9, 3.9, 'arms')], 'palms_together': True, 'palms_near': .3,
                       'note': "Legs, trunk and head from 113_29 (right side, then left). That take holds the arms out to the sides; the palms-together arms in the hold are from 144_30 (another performer), so the clip matches the app's cue."}


def walk_cycle(m, s_first, n_steps, log):
    """source times (s) of a walk-on-the-spot cycle of n_steps (2 or 4), from the double support before a step of foot
    s_first to the double support n_steps later (where the same foot is about to step again)"""
    pr = ankle_peaks(m, 'r'); pl = ankle_peaks(m, 'l')
    steps = sorted([(f, 'r') for f in pr] + [(f, 'l') for f in pl])
    i = next(k for k, (f, s) in enumerate(steps) if s == s_first and k >= 1 and k + n_steps < len(steps))
    seq = steps[i:i + n_steps + 1]
    if len(seq) < n_steps + 1:
        raise RuntimeError('walk cycle: not enough steps')
    # double support: half way between the step before and this one, and between the last and the one after
    prev = steps[i - 1][0] if i > 0 else seq[0][0] - (seq[1][0] - seq[0][0])
    a = (prev + seq[0][0]) / 2
    b = (seq[n_steps - 1][0] + seq[n_steps][0]) / 2
    log(f'  walk cycle: steps at {[round(f / m.fps, 2) for f, _ in seq]} s; cycle {a / m.fps:.2f}-{b / m.fps:.2f} s')
    return a / m.fps, b / m.fps, [f / m.fps for f, _ in seq]


def clip_march(S, get, fps, log):
    """marching_in_place (v2: 1.24 s = two steps, knees to hip height, arms swinging in opposition).
    Legs, trunk and head: HDM05 bd_002 (walk on the spot with the knees at hip height; the performer's arms hardly move).
    Arms: HDM05 mm_011 (walk on the spot with a full arm swing), carried by bd's chest and time-matched step for step
    (left knee up = right arm forward)."""
    m = get(S['hdm_bd_walk002']); arms = get(S['hdm_mm_walk011'])
    a, b, st = walk_cycle(m, 'l', 2, log)
    a2, b2, st2 = walk_cycle(arms, 'l', 2, log)
    # arms: source time for each frame of the leg take, matched at the cycle ends and the two step tops
    from scipy.interpolate import PchipInterpolator
    kl = [a, st[0], st[1], b]; ka = [a2, st2[0], st2[1], b2]
    tl = np.arange(int(round(a * m.fps)), int(round(b * m.fps)) + 1) / m.fps
    mm = m.slice(int(round(a * m.fps)), int(round(b * m.fps)) + 1)
    mc = M.composite_arms(mm, arms, PchipInterpolator(kl, ka)(tl))
    mc.fps = m.fps
    T = 1.24
    c = piece(mc, [(0, 0), (st[0] - a, T * (st[0] - a) / (b - a)), (st[1] - a, T * (st[1] - a) / (b - a)), (b - a, T)], fps)
    c = M.loop_spread(c, ankle_peaks.body)
    return centre(c), {'relax_hands': True, 'hands_clear': True, 'loop': True, 'src': [('hdm_bd_walk002', a, b), ('hdm_mm_walk011', a2, b2, 'arms')], 'fingers': [(0, 'relaxed')],
                       'feet': {'speed': .45, 'min_len': 3},
                       'note': 'Legs, trunk and head from HDM05 actor bd (knees to hip height); arms from HDM05 actor mm (a full swing), time-matched step for step: that performer kept the arms almost still.'}


def clip_paced_walk(S, get, fps, log):
    """breath_paced_walk (v2: 2.68 s = four easy steps on the spot, the arms swinging a little; the breath ring follows the
    steps). HDM05 mm_011: walk on the spot, tall, the arms swinging loosely; two steps from the middle of the take (left,
    right), played twice. (Actor bk's walk was checked too: the head tips back and a hand brushes the thigh.)"""
    m = get(S['hdm_mm_walk011'])
    a, b, st = walk_cycle(m, 'l', 2, log)
    T2 = 1.34
    half = piece(m, [(a, 0), (st[0], T2 * (st[0] - a) / (b - a)), (st[1], T2 * (st[1] - a) / (b - a)), (b, T2)], fps)
    half = M.loop_spread(half, ankle_peaks.body)
    c = M.concat([half, half], fps)
    return centre(c), {'relax_hands': True, 'loop': True, 'src': [('hdm_mm_walk011', a, b)], 'fingers': [(0, 'relaxed')], 'feet': {'speed': .45, 'min_len': 3},
                       'note': 'An easy walk on the spot: two steps from the middle of the take (left, right), played twice per breath (four steps), at the pace of the app clip (1.34 s per two steps).'}


def clip_commencement(S, get, fps, log):
    """taichi_commencement (v2: 9.0 s = arms float up to shoulder height 3.4 s, sink a little and press the palms down
    3.2 s, rise and the arms settle 2.4 s). CMU 12_04 8.3-18.3 s: the opening of the performer's form (the feet already
    shoulder-width): the arms float up to shoulder height, then lower slowly. The performer does not sink while pressing
    (the sink comes later, into the next form), so a 5 cm sink is added while the palms press down (the knees bend; the
    feet stay), and the body rises again as the arms settle."""
    m = get(S['cmu12_04'])
    c = piece(m, [(8.3, 0), (11.0, 3.2), (12.1, 3.8), (15.6, 6.6), (18.3, 9.0)], fps)
    prof = ramp(c.F, fps, [(0, 0), (3.6, 0), (6.6, 1), (7.2, 1), (8.9, 0), (99, 0)])
    c = M.add_sink(c, .05, prof)
    # the take's hands (an early CMU subject) tip up at the wrist; the cue is palms down from the float up to the press
    c = M.palms_down(c, ankle_peaks.body, ramp(c.F, fps, [(0, 0), (1.2, 0), (2.6, 1), (6.9, 1), (8.2, 0), (99, 0)]))
    c = M.loop_spread(c, ankle_peaks.body)
    return centre(c), {'loop': True, 'src': [('cmu12_04', 8.3, 18.3)], 'fingers': [(0, 'soft')], 'feet': {'flat': True, 'always': 'lr'},
                       'note': 'The opening of the performer\'s form. The 5 cm sink while the palms press down is added (the performer sinks only later, into the next form), and the palms are turned down from the float up to the press (the hands of the take tip up at the wrist).'}


def sn_step(key, knots, end, hold_drift=.15, blend_to=None, fade=1.0, note='', palms=False, force_palms=None, head=None, feet=None, tall=None, knee_down=None):
    """a Surya Namaskar position (one breath, 5 s): the arrival (knots, from the previous position) and the hold, in ONE
    time warp (the speed eases into the hold, no join); blend_to: the hold is another moment of the take (cross-faded over
    `fade` s); force_palms: (t0, t1) out-times where the palms rest on the floor (hand lock pulls them down); head: cap on
    the head's extension (degrees) where the take throws it back"""
    def build(S, get, fps, log):
        m = get(S[key])
        T = knots[-1][1]
        if blend_to is None:
            c = piece(m, list(knots) + [(knots[-1][0] + hold_drift, 5.0 + 1 / fps)], fps)
        else:
            A = piece(m, list(knots), fps)
            B = piece(m, [(blend_to, 0), (blend_to + hold_drift, 5 - T + fade + 1 / fps)], fps)
            c = M.crossfade(A, B, int(fade * fps))
        c = c.slice(0, int(round(5 * fps)))
        if knee_down:
            # the back knee hovers a few cm above the floor in the take (the cue: knee down): the body lowers that much
            # over the hold (the front leg bends a little more, the arms re-reach; the clean-up re-plants feet and hands)
            side, t_in = knee_down
            P, _ = M.Body.fk(ankle_peaks.body, c.G, c.pel)
            need = np.maximum(0, P['calf_' + side][:, 1] - .03)
            w = ramp(c.F, fps, [(0, 0), (t_in, 0), (t_in + .8, 1), (99, 1)])
            c = M.add_sink(c, 1., M.lowpass(need * w, fps, 1.5))
        info = {'loop': False, 'dipWrap': True, 'src': [(key, knots[0][0], (blend_to if blend_to is not None else knots[-1][0]) + hold_drift)],
                'hands': True, 'floor': True, 'note': note, 'feet': {'cyclic': False, **(feet or {})}, 'palms_together': palms}
        if force_palms:
            t = np.arange(c.F) / fps
            info['force_palms'] = (t >= force_palms[0]) & (t <= force_palms[1])
        if head is not None:
            info['head_max'] = head
        if tall is not None:
            info['stand_tall'] = tall
        return c, info
    return build


SN_144 = 'CMU 144_30 (sun salutation).'
CLIPS = {
    'bodyweight_squat': dict(build=clip_squat, fps=30, name='Bodyweight squat'),
    'jumping_jack': dict(build=clip_jack, fps=30, name='Jumping jack'),
    'marching_in_place': dict(build=clip_march, fps=30, name='Marching in place'),
    'breath_paced_walk': dict(build=clip_paced_walk, fps=30, name='Breath-paced walk'),
    'vrikshasana': dict(build=clip_tree, fps=20, name='Tree pose'),
    'sn_prayer': dict(build=sn_step('cmu144_30', [(3.30, 0), (3.36, .25), (3.88, 2.0)], 2.0, hold_drift=.13, feet={'flat': True, 'always': 'lr'}, tall=.4, note=SN_144 + ' The performer stoops a little and looks down at her hands; that bend is eased (stand tall, the cue).', palms=True), fps=20, name='Standing, palms together'),
    'sn_raised_arms': dict(build=sn_step('cmu144_30', [(4.02, 0), (5.48, 1.9)], 1.9, hold_drift=.08, feet={'flat': True, 'always': 'lr'}, note=SN_144 + ' The hands go down and out before they rise (a swan arm), and the back arches only a little.'), fps=20, name='Arms up and back'),
    'sn_forward_fold': dict(build=sn_step('cmu144_30', [(5.52, 0), (7.75, 2.4)], 2.4, hold_drift=.25, force_palms=(2.1, 5.0),
                                          feet={'flat': True, 'always': 'lr'}, note=SN_144 + ' The performer\'s palms stop about 10 cm short of the floor; here they go down to it beside the feet (the cue), the knees bending a little more to let them.'), fps=30, name='Forward fold'),
    'sn_dog': dict(build=sn_step('cmu144_30', [(13.95, 0), (15.05, 2.0)], 2.0, hold_drift=1.0, note=SN_144 + ' It starts from an upward dog (the take\'s previous position); in the flow the step blends in from the app\'s cobra.'), fps=20, name='Inverted V'),
    'sn_lunge_in_r': dict(build=sn_step('cmu113_28', [(8.5, 0), (10.4, 1.6), (11.0, 2.0)], 2.0, blend_to=18.75, head=18, force_palms=(1.9, 5.0),
                                        note='CMU 113_28 (another performer). The back knee lowering is a blend between two frames of the take (the performer lowered it while folding forward). The head, thrown back in the take, is brought to a gentle look up; the hands, on their fingertips in the take, rest flat beside the front foot (the cue).'), fps=20, name='Low lunge, right foot forward'),
    'sn_lunge_in_l': dict(build=sn_step('cmu113_28', [(25.0, 0), (26.6, 1.6), (27.2, 2.0)], 2.0, blend_to=33.5, head=18, force_palms=(1.9, 5.0), knee_down=('r', 1.6),
                                        note='CMU 113_28 (another performer). The back knee lowering is a blend between two frames of the take, and the body sinks the last few cm so the knee rests on the floor (the cue). The head, thrown back in the take, is brought to a gentle look up; the hands, on their fingertips in the take, rest flat beside the front foot (the cue).'), fps=20, name='Low lunge, left foot forward'),
    'sn_rise': dict(build=sn_step('cmu144_30', [(20.45, 0), (21.3, 1.7)], 1.7, blend_to=23.12, hold_drift=.08, feet={'flat': True, 'always': 'lr'}, note=SN_144 + " From the fold the hands slide up to the knees (a short half lift, as in this performer's round) before the arms sweep forward and up. The take then bends into a chair pose; that is cut and the rise blends into the take's standing arms-up frame."), fps=20, name='Arms up and back (rise)'),
    'sn_stand': dict(build=sn_step('cmu144_30', [(23.12, 0), (24.0, 1.8)], 1.8, hold_drift=.06, feet={'flat': True, 'always': 'lr'}, note=SN_144), fps=20, name='Standing, arms down'),
}
# app clips that have a take on the coverage map but stay hand-keyed (v2 motion on the body), and why
EXCLUDED = {
    'surya_namaskar': 'The whole round: CMU 144_30 is the Ashtanga jump-back round (no lunges, no knees-chest-chin), not the app\'s Sivananda round. The app plays the flow step by step (the sn_* steps below, real motion where a step has it).',
    'sn_cobra': '144_30 has an upward dog (straight arms, thighs off the floor) from a low push-up, not the app\'s low cobra from knees-chest-chin (hips down, elbows bent).',
    'sn_lunge_r': 'No take steps one leg back from the forward fold into a low lunge (144_30 jumps back; 113_28 walks into the dog).',
    'sn_lunge_l': 'As sn_lunge_r.',
    'sn_plank': 'Only a jump-back plank exists (144_30), not a step back from a lunge.',
    'sn_plank_l': 'As sn_plank.',
    'sn_knees_chest': '144_30 lowers in one straight line (a low push-up), not knees, chest and forehead.',
    'sn_fold_in_l': 'No take steps the back foot forward from a lunge into the fold (113_28 goes back to the dog; 144_30 jumps).',
    'sn_fold_in_r': 'As sn_fold_in_l.',
    'split_squat': 'CMU 144_17 is forward lunges: its only split-squat part has the legs still bent and the trunk leaning at the top, a counter-balancing arm reach, and a 4x slowed descent. No real split-squat take (UI-PRMD m03 would be one).',
    'reverse_lunge': 'Only forward lunges (CMU 144_17): stepping forward is not the cue (step back).',
    'arm_circles': 'HDM05 rotateArms are big, fast windmills with a knee bounce; the cue is arms out to the sides, small circles growing bigger.',
    'plank': 'The app\'s plank is on the forearms (elbows under shoulders); 144_30 passes through a straight-arm plank.',
    'cobra_stretch': 'As sn_cobra: an upward dog, not a cobra with the hips down.',
    'trikonasana': 'CMU 113_29 goes to the full pose (lower hand at the ankle and floor, trunk tilted ~85 deg); the app teaches the hand on the shin.',
    'virabhadrasana_2': 'CMU 113_29 has only the wide-stance, arms-out preparation (front knee nearly straight, head forward), not Warrior II.',
    'high_knees': 'HDM05 has jogging on the spot (knees well below hip height), not a high-knee sprint.',
    'standing_hamstring_stretch': 'The cue puts the heel on a low step; the takes are standing forward bends.',
    'hip_flexor_stretch': 'The cue is a half-kneeling stretch with the trunk upright; 113_28\'s low lunge has the hands on the floor.',
    'leg_swings': 'HDM05 has kicks (fast, snapped), not relaxed swings while holding on.',
    'squat_jump': 'Not checked in enough takes; HDM05 hops are small, not squat jumps (squat to parallel, arms swinging).',
    'box_squat': 'HDM05 sitDownChair sits fully down on a chair; the cue is to just touch a box and stand.',
    'taichi_commencement': 'Built and checked (CMU 12_04, with an added sink and palms turned down), then left out: the performer draws the hands in to the chest with the elbows out before pressing down, a different shape from the cue (arms float up, sink and press the palms down). The builder stays in this file (clip_commencement) for a later look.',
    'deep_squat_hold': 'The cue has the elbows pushing the knees out; the squat takes hold the arms forward.',
}


# ------------------------------------------------------------------------------------------------ QA
def qa(m, body, loop=True):
    """foot slide (planted), floor penetration (soles, palms, flesh probes), loop seam, jerk"""
    import mocap_jerk as J
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
    J.report.body = body
    r = J.report(m, loop=loop, wrap=False)
    out['jerk_spikes'] = r['spikes']
    out['jerk_pop_max_cm'] = round(r['pop_max_cm'], 2)
    return out


def process(m, info, body, log, snap=None):
    """clean-up on the body (foot lock, hand lock, floor, prayer palms, head); every correction low-passed (smooth_fix);
    snap(name, motion) sees every stage"""
    snap = snap or (lambda n, x: None)
    snap('edit', m)
    loop = info.get('loop', True)
    fo = dict(info.get('feet', {}))
    cyc = fo.pop('cyclic', loop)
    sm = lambda a, b: M.smooth_fix(a, b, body, cutoff=info.get('fix_hz', 3.5), cyclic=cyc)
    if info.get('relax_hands'):
        m = M.relax_hands(m, body); snap('relax', m)
    if info.get('hands_clear'):
        m = sm(m, M.hands_clear_thighs(m, body, log=log)); snap('clear', m)
    if info.get('stand_tall'):
        m = M.stand_tall(m, body, info['stand_tall']); snap('tall', m)
    if info.get('head_max') is not None:
        m = sm(m, M.soften_head(m, body, info['head_max'], log=log)); snap('head', m)
    m0 = m
    m = sm(m0, M.foot_lock(m, body, cyclic=cyc, log=log, **fo)); snap('feet', m)
    if info.get('hands'):
        m1 = m
        force = info.get('force_palms')
        m, gap, pull, shift = M.hand_lock(m, body, cyclic=cyc, log=log, force=force)
        m = M.foot_lock(m, body, cyclic=cyc, log=log, **fo)
        m, gap, pull, shift2 = M.hand_lock(m, body, cyclic=cyc, log=log, force=force)
        m = sm(m1, m)
        info['hand_gap_cm'], info['hand_pull_cm'], info['body_shift_cm'] = round(gap * 100, 1), round(pull * 100, 1), round(shift * 100, 1)
        snap('hands', m)
    if info.get('floor'):
        m1 = m
        m, lift = M.floor_lift(m, body, log=log)
        m = M.foot_lock(m, body, cyclic=cyc, log=log, **fo)
        m = sm(m1, m)
        snap('floor', m)
    if info.get('palms_together'):
        m = sm(m, M.palms_together(m, body, near=info.get('palms_near', .13), log=log))
        snap('palms', m)
    if info.get('ground', True):
        m = M.ground(m, body, cyclic=cyc, log=log)
    else:                                        # a jump: its landings are not rests; one constant shift (lowest sole 2 mm)
        P, GG = body.fk(m.G, m.pel)
        low = min(pt[:, 1].min() for s in 'lr' for pt in M.sole_points(body, P, GG, s))
        m = m.copy(); m.pel[:, 1] -= low - .002
    m = M.feet_clear(m, body, log=log)
    if info.get('hands'):
        m = M.hands_floor_clear(m, body, log=log)
    snap('ground', m)
    return m


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
        ankle_peaks.body = body
        M.composite_arms.body = body
        M.BODY['body'] = body
        get = lambda src: src.motion(body, sex, a.cache or None, log)
        for cid in ids:
            spec = CLIPS[cid]
            t0 = time.time()
            log(f'== {cid} ({sex})')
            m, info = spec['build'](S, get, spec['fps'], log)
            loop = info.get('loop', True)
            m = process(m, info, body, log)
            q = qa(m, body, loop and not info.get('dipWrap'))
            if info.get('hands'):
                q['palm_moved_cm'], q['palm_unreachable_cm'], q['body_moved_to_hands_cm'] = info['hand_pull_cm'], info['hand_gap_cm'], info['body_shift_cm']
            log(f'  QA {q}')
            srcs = [S[k] for k, *_ in info['src']]
            lic = 'CC BY-SA 3.0' if any(s.licence == 'hdm' for s in srcs) else 'CMU'
            meta = {'id': cid, 'name': spec['name'], 'loop': loop, 'period': round(m.F / spec['fps'], 3),
                    'swapAt': info.get('swapAt'), 'dipWrap': info.get('dipWrap', False),
                    'source': '; '.join(f'{S[k].label} {a0:.2f}-{a1:.2f} s' + (f' ({r[0]})' if r else '') for k, a0, a1, *r in info['src']),
                    'licence': HDM_LIC if lic != 'CMU' else CMU_LIC, 'credit': CMU_ACK if lic == 'CMU' else HDM_LIC,
                    'qa': q, 'note': info.get('note', '')}
            Q, tl = M.to_local(m, body)
            meta['fingers'] = M.finger_meta(body, info.get('fingers') or M.auto_fingers(m, body), spec['fps'])
            k = M.encode(Q, tl, spec['fps'], meta)
            path = os.path.join(OUT, f'{cid}.{sex}.kclip.json')
            json.dump(k, open(path, 'w'), separators=(',', ':'))
            log(f'  -> {os.path.relpath(path, os.path.dirname(OUT))}: {m.F} frames, {len(k["bones"])} tracks, {os.path.getsize(path) / 1024:.0f} KB ({time.time() - t0:.1f} s)')
            e = index['clips'].setdefault(cid, {})
            e.update({'name': spec['name'], 'period': meta['period'], 'loop': loop, 'fps': spec['fps'], 'frames': m.F, 'source': meta['source'],
                      'licence': meta['licence'], 'note': meta['note'], 'swapAt': meta['swapAt'],
                      'takes': [S[k].url for k, *_ in info['src']]})
            e.setdefault('qa', {})[sex] = q
            if a.sheets:
                import mocap_preview as V
                V.sheet(m, body, os.path.join(a.sheets, f'{cid}.{sex}.png'), n=10, title=f'{cid} ({sex})')
    index['credit'] = {'cmu': CMU_ACK, 'hdm05': HDM_LIC}
    index['excluded'] = EXCLUDED
    index['missing'] = {k: v for k, v in EXCLUDED.items() if k.startswith('sn_')}
    index['clips'] = {k: index['clips'][k] for k in CLIPS if k in index['clips']}
    json.dump(index, open(idx_path, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
    # the app's list: ids with both bodies on disk
    have = {k: {'licence': 'hdm05' if index['clips'][k]['licence'].startswith('CC') else 'cmu'} for k in CLIPS
            if all(os.path.exists(os.path.join(OUT, f'{k}.{s}.kclip.json')) for s in 'fm') and k in index['clips']}
    with open(JS_INDEX, 'w', encoding='utf8') as f:
        f.write('// Written by assets/v3/pipeline/mocap_clips.py: the app clip ids that have a real-motion clip (both bodies), and the\n'
                '// licence of the data it comes from (hdm05 clips are CC BY-SA 3.0; see assets/v3/LICENSES.md).\n')
        f.write('export const MOCAP_CLIPS = {\n' + ''.join(f"  {k}: {{ licence: '{v['licence']}' }},\n" for k, v in have.items()) + '};\n')


if __name__ == '__main__':
    main()
