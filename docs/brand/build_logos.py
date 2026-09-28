"""Stage 2: build the three logo directions as standalone SVG files (no fonts, no live text).

Usage:  python docs/brand/build_logos.py
Reads docs/brand/glyphs.json (made by extract_glyphs.py) and writes docs/brand/{a,b,c}/*.svg.
All randomness is seeded, so the output is identical on every run.
"""
import json, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
G = json.load(open(os.path.join(HERE, 'glyphs.json'), encoding='utf-8'))

LIGHT = dict(name='light', bg='#F5F1E8', ink='#1C1B19', red='#C8372D', cut='#FFF9F2')
DARK = dict(name='dark', bg='#121110', ink='#EFEAE0', red='#E0503F', cut='#FFF6EF')
SUMI = dict(name='sumi', bg='#F5F1E8', ink='#1C1B19', red='#1C1B19', cut='#F5F1E8')
PALETTES = (LIGHT, DARK, SUMI)


def f(v):
    s = '%.2f' % v
    s = s.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def svg(w, h, body, title='Kitaeru'):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{body}</svg>\n')


def poly(pts):
    return 'M' + ' '.join(f'{f(x)},{f(y)}' for x, y in pts) + 'Z'


# ---------------------------------------------------------------- glyph placement
def place(g, box, mode='fit', stretch=1.18, k=None):
    """Transform that puts glyph bounds g['bounds'] centred in box=(x,y,w,h).
    mode 'fit' keeps proportions; 'fill' stretches to fill, clamped to `stretch` aspect change.
    k forces a uniform scale (used so a run of glyphs shares one size)."""
    x0, y0, x1, y1 = g['bounds']
    gw, gh = x1 - x0, y1 - y0
    bx, by, bw, bh = box
    if k is not None:
        sx = sy = k
    elif mode == 'fit':
        sx = sy = min(bw / gw, bh / gh)
    else:
        sx, sy = bw / gw, bh / gh
        r = sx / sy
        if r > stretch: sx = sy * stretch
        if r < 1 / stretch: sy = sx * stretch
    tx = bx + bw / 2 - (x0 + gw / 2) * sx
    ty = by + bh / 2 - (y0 + gh / 2) * sy
    return f'matrix({f(sx)} 0 0 {f(sy)} {f(tx)} {f(ty)})', sx


def glyph_el(g, box, fill, mode='fit', stretch=1.18, k=None, bold=0):
    tf, s = place(g, box, mode, stretch, k)
    extra = f' stroke="{fill}" stroke-width="{f(bold / s)}" stroke-linejoin="round"' if bold else ''
    return f'<path d="{g["d"]}" transform="{tf}" fill="{fill}"{extra}/>'


def wordmark(key, x, y, height, fill, tracking=0, align='center'):
    """Lay out a Latin word from glyphs.json with its cap height = `height`. (x,y) = anchor at baseline."""
    run = G[key]['glyphs']
    cap = max(-g['bounds'][1] for g in run)
    s = height / cap
    xs, pen = [], 0
    for g in run:
        xs.append(pen)
        pen += g['adv'] + tracking
    left = run[0]['bounds'][0]
    right = xs[-1] + run[-1]['bounds'][2]
    width = (right - left) * s
    ox = x - (width / 2 if align == 'center' else 0) - left * s
    parts = ''.join(f'<path d="{g["d"]}" transform="translate({f(px * s + ox)} {f(y)}) scale({f(s)})"/>' for g, px in zip(run, xs))
    return f'<g fill="{fill}">{parts}</g>', width


# ---------------------------------------------------------------- noise helpers
def smooth_noise(rng, n=6):
    vals = [rng.uniform(-1, 1) for _ in range(n + 1)]
    def at(t):
        t = min(max(t, 0), 1) * n
        i = min(int(t), n - 1); u = t - i
        u = (1 - math.cos(u * math.pi)) / 2
        return vals[i] * (1 - u) + vals[i + 1] * u
    return at


# ---------------------------------------------------------------- A: brush ring (朱文)
def brush_stroke(p0, p1, t, rng, streaks=2):
    """One hand-brushed stroke as a filled polygon: pressed start, slight swell, a lifted finish and
    dry-brush streaks (kasure, 掠れ) cut into the last third. Returns path data (use fill-rule evenodd)."""
    (x0, y0), (x1, y1) = p0, p1
    L = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    nx, ny = -uy, ux
    na, nb, nw = smooth_noise(rng, 4), smooth_noise(rng, 4), smooth_noise(rng, 3)
    N = 40
    top, bot = [], []
    for i in range(N + 1):
        s = i / N
        w = t * (1 + 0.32 * math.exp(-s * 7) + 0.12 * nw(s))
        if s > 0.8:
            w *= 1 - (s - 0.8) / 0.2 * 0.38      # lift-off taper
        cx, cy = x0 + ux * L * s, y0 + uy * L * s
        a = w / 2 + t * 0.06 * na(s) + rng.uniform(-.008, .008) * t
        b = w / 2 + t * 0.06 * nb(s) + rng.uniform(-.008, .008) * t
        top.append((cx + nx * a, cy + ny * a))
        bot.append((cx - nx * b, cy - ny * b))
    holes = ''
    for k in range(streaks):                      # thin tapering gaps where the brush ran dry
        s0 = rng.uniform(0.55, 0.72); s1 = min(0.99, s0 + rng.uniform(0.2, 0.3))
        off = rng.uniform(-0.22, 0.22) * t
        hw = rng.uniform(0.03, 0.06) * t
        pts_a, pts_b = [], []
        for i in range(9):
            s = s0 + (s1 - s0) * i / 8
            wv = hw * math.sin(math.pi * i / 8) * (1 + i / 8)
            cx, cy = x0 + ux * L * s + nx * off, y0 + uy * L * s + ny * off
            pts_a.append((cx + nx * wv, cy + ny * wv)); pts_b.append((cx - nx * wv, cy - ny * wv))
        holes += poly(pts_a + pts_b[::-1])
    # rounded, pressed start cap
    start = [(x0 - ux * t * 0.35 + nx * t * 0.62 * math.cos(a) - ux * t * 0.25 * math.sin(a),
              y0 - uy * t * 0.35 + ny * t * 0.62 * math.cos(a) - uy * t * 0.25 * math.sin(a))
             for a in (0.45, 1.2, 1.9, 2.6)]
    # dry-brush finish: the lower edge splits into two short bristle tips
    tip = [(x1 + ux * t * 0.35 + nx * t * 0.10, y1 + uy * t * 0.35 + ny * t * 0.10),
           (x1 + ux * t * 0.05 - nx * t * 0.05, y1 + uy * t * 0.05 - ny * t * 0.05),
           (x1 + ux * t * 0.28 - nx * t * 0.24, y1 + uy * t * 0.28 - ny * t * 0.24)]
    pts = top + tip + bot[::-1] + start[::-1]
    return poly(pts) + holes


def brush_ring(x, y, w, h, t, seed, fill):
    """Four brushed strokes (horizontals left→right and thinner, verticals top→bottom and heavier)."""
    rng = random.Random(seed)
    j = lambda: rng.uniform(-0.5, 0.5)
    ov = t * 0.15
    strokes = [
        ((x - ov + j(), y + j()), (x + w + ov + j(), y + j())),                 # top: left → right
        ((x + w + j(), y - ov + j()), (x + w + j(), y + h + ov + j())),         # right: top → bottom
        ((x - ov + j(), y + h + j()), (x + w + ov + j(), y + h + j())),         # bottom: left → right
        ((x + j(), y - ov + j()), (x + j(), y + h + ov + j())),                 # left: top → bottom
    ]
    weights = (0.86, 1.12, 0.94, 1.08)
    return ''.join(f'<path d="{brush_stroke(p0, p1, t * wt * rng.uniform(.95, 1.05), rng)}" fill="{fill}" fill-rule="evenodd"/>'
                   for (p0, p1), wt in zip(strokes, weights))


def rough_block(x, y, w, h, amp, seed, chip=0.0, bevel=1.2, step=1.5):
    """Filled rectangle with an irregular edge (brush-filled or worn stone)."""
    rng = random.Random(seed)
    pts = []
    corners = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    for c in range(4):
        (ax, ay), (bx, by) = corners[c], corners[(c + 1) % 4]
        L = math.hypot(bx - ax, by - ay)
        ux, uy = (bx - ax) / L, (by - ay) / L
        nx, ny = uy, -ux                                    # outward normal (clockwise walk)
        nz = smooth_noise(rng, max(3, int(L / 12)))
        n = max(4, int(L / step))
        chip_left = 0
        for i in range(n):
            s = i / n
            d = s * L
            if d < bevel:                                  # soften the corner
                d = bevel
                s = d / L
            off = amp * (0.7 * nz(s) + 0.3 * rng.uniform(-1, 1))
            if chip and chip_left == 0 and rng.random() < chip and 0.08 < s < 0.92:
                chip_left = rng.randint(2, 3)
                depth = rng.uniform(0.7, 1.7)
            if chip_left:
                off -= depth * (0.6 if chip_left in (1, 3) else 1)
                chip_left -= 1
            pts.append((ax + ux * d + nx * off, ay + uy * d + ny * off))
    return poly(pts)


def specks(box, n, r0, r1, seed, fill):
    rng = random.Random(seed)
    bx, by, bw, bh = box
    out = []
    for _ in range(n):
        cx, cy, r = bx + rng.uniform(0, bw), by + rng.uniform(0, bh), rng.uniform(r0, r1)
        k = rng.randint(5, 7)
        pts = [(cx + math.cos(2 * math.pi * i / k) * r * rng.uniform(.55, 1.2),
                cy + math.sin(2 * math.pi * i / k) * r * rng.uniform(.55, 1.2)) for i in range(k)]
        out.append(poly(pts))
    return f'<path d="{"".join(out)}" fill="{fill}"/>'


# ---------------------------------------------------------------- C: constructed strokes
KAN_C = [  # 鍛: 金 (8 strokes) + 段 (9 strokes) = 17, in standard stroke order; 100-unit em, y down
    'M4,26 L20,4 L35,20',                               # 金: roof ノ + ㇏ (drawn as one joined path; ㇏ shortened in the radical)
    'M11,36 H30', 'M5,52 H35', 'M20,36 V90',            # 一 一 丨
    'M9,62 L13,76', 'M31,62 L27,76', 'M4,95 L37,83',    # two dots, rising ㇀
    'M60,4 L48,10 V97', 'M48,32 H62', 'M48,55 H62', 'M43,86 L63,74',   # 段 left part (ノ meets 丨)
    'M66,40 L73,24 V7 H90 V30 Q90,35 98,35',            # 殳: 几 (ノ and ㇈ meet at the top-left corner)
    'M67,50 H93 L68,97', 'M74,62 L99,97',               # 殳: 又
]
E_C = ['M38,11 L60,21', 'M22,38 H74 L26,88 L48,66 L54,86 H80']                    # え (2 strokes)
RU_C = ['M26,16 H72 L28,62 Q52,44 72,54 Q86,62 80,78 Q74,94 52,92 Q38,90 40,80 Q42,70 56,76 Q62,80 62,90']  # る (1)


def strokes_el(paths, box, width, color, em=100, cap='square'):
    bx, by, bw, bh = box
    s = min(bw, bh) / em
    tx, ty = bx + (bw - em * s) / 2, by + (bh - em * s) / 2
    return (f'<path d="{" ".join(paths)}" transform="matrix({f(s)} 0 0 {f(s)} {f(tx)} {f(ty)})" fill="none" stroke="{color}" '
            f'stroke-width="{f(width / s)}" stroke-linecap="{cap}" stroke-linejoin="miter" stroke-miterlimit="4"/>')


# ================================================================ direction builders
# Each returns SVG body strings for: mark(p), micro(p), vseal(p) (+ size), wordmark(p)
class A:
    key = 'a'
    run = G['A']['glyphs']

    @staticmethod
    def mark(p, size=100):
        return (brush_ring(8, 8, 84, 84, 5.6, 11, p['red'])
                + glyph_el(A.run[0], (18, 17, 64, 66), p['red'], bold=1.1))

    @staticmethod
    def micro(p):
        # at 16–32 px the paper-and-ring reading collapses, so the micro mark reverses: brushed block, paper-white 鍛
        return (f'<path d="{rough_block(2, 2, 96, 96, 1.1, 5, bevel=3.5)}" fill="{p["red"]}"/>'
                + glyph_el(A.run[0], (9, 8, 82, 84), p['cut'], bold=1.4))

    @staticmethod
    def vseal(p):
        W, H = 100, 250
        body = brush_ring(8, 8, 84, 234, 5.6, 23, p['red'])
        cells = [(21, 22, 58, 66), (24, 98, 52, 60), (24, 168, 52, 60)]
        tf, k = place(A.run[0], cells[0], 'fit')
        k2 = k * 1.12                                  # kana slightly larger so they hold their own under 鍛
        for i, (g, c) in enumerate(zip(A.run, cells)):
            body += glyph_el(g, c, p['red'], k=k if i == 0 else k2, bold=1.1)
        return body, W, H

    @staticmethod
    def word(p, x, y, h, align='center'):
        return wordmark('Aw', x, y, h, p['ink'], tracking=30, align=align)


class B:
    key = 'b'
    run = G['B']['glyphs']

    @staticmethod
    def mark(p, size=100, gi=0):
        """gi: glyph index in the B run (0 = 鍛, 3 = 済). Other glyphs get their own stone (seed offset)."""
        box = (15, 15, 70, 70)
        k = 0 if gi == 0 else gi * 10          # gi 0 keeps the exact stone shown on logo-compare.html
        return (f'<path d="{rough_block(7, 7, 86, 86, 0.38, 3 + k, chip=0.035)}" fill="{p["red"]}"/>'
                + glyph_el(B.run[gi], box, p['cut'], mode='fill', stretch=1.12)
                + specks(box, 26, 0.35, 0.95, 7 + k, p['red'])
                + specks((8, 8, 84, 84), 7, 0.2, 0.45, 9 + k, p['cut']))

    @staticmethod
    def micro(p, gi=0):
        k = 0 if gi == 0 else gi * 10
        return (f'<path d="{rough_block(1, 1, 98, 98, 0.3, 4 + k, bevel=2)}" fill="{p["red"]}"/>'
                + glyph_el(B.run[gi], (9, 9, 82, 82), p['cut'], mode='fill', stretch=1.12))

    @staticmethod
    def vseal(p):
        W, H = 100, 250
        body = f'<path d="{rough_block(7, 7, 86, 236, 0.4, 13, chip=0.03)}" fill="{p["red"]}"/>'
        cells = [(16, 17, 68, 70), (18, 92, 64, 68), (18, 165, 64, 68)]
        for g, c in zip(B.run, cells):
            body += glyph_el(g, c, p['cut'], mode='fill', stretch=1.15)
        body += specks((16, 17, 68, 216), 60, 0.35, 0.95, 17, p['red'])
        return body, W, H

    @staticmethod
    def word(p, x, y, h, align='center'):
        return wordmark('Bw', x, y, h, p['ink'], tracking=150, align=align)


class C:
    key = 'c'

    @staticmethod
    def mark(p, size=100):
        return (f'<rect x="6" y="6" width="88" height="88" rx="5" fill="{p["red"]}"/>'
                + strokes_el(KAN_C, (18, 18, 64, 64), 5.2, p['cut']))

    @staticmethod
    def micro(p):
        return (f'<rect x="1" y="1" width="98" height="98" rx="6" fill="{p["red"]}"/>'
                + strokes_el(KAN_C, (9, 9, 82, 82), 7.4, p['cut']))

    @staticmethod
    def vseal(p):
        W, H = 100, 250
        body = f'<rect x="7" y="7" width="86" height="236" rx="5" fill="{p["red"]}"/>'
        body += strokes_el(KAN_C, (19, 20, 62, 62), 5.2, p['cut'])
        body += strokes_el(E_C, (21, 98, 58, 58), 5.2, p['cut'], cap='butt')
        body += strokes_el(RU_C, (21, 168, 58, 58), 5.2, p['cut'], cap='butt')
        return body, W, H

    @staticmethod
    def word(p, x, y, h, align='center'):
        return wordmark('Cw', x, y, h, p['ink'], tracking=260, align=align)


# ---------------------------------------------------------------- compositions
def lockup_stacked(D, p):
    seal, W, H = D.vseal(p)
    sw = 76                                      # seal width in the lockup
    s = sw / W
    VW = 240
    wm_h = 22
    y_seal = 10
    y_base = y_seal + H * s + 26 + wm_h
    wm, wmw = D.word(p, VW / 2, y_base, wm_h)
    body = f'<g transform="translate({f((VW - sw) / 2)} {y_seal}) scale({f(s)})">{seal}</g>{wm}'
    return body, VW, y_base + 12


def lockup_horizontal(D, p):
    seal, W, H = D.vseal(p)
    sh = 150
    s = sh / H
    wm_h = 30
    wm, wmw = D.word(p, 0, 0, wm_h, align='left')
    x_wm = W * s + 26
    body = (f'<g transform="translate(6 6) scale({f(s)})">{seal}</g>'
            f'<g transform="translate({f(x_wm + 6)} {f(6 + sh / 2 + wm_h / 2)})">{wm}</g>')
    return body, x_wm + wmw + 16, sh + 12


def app_icon(D, bg_seal, full_bleed_red, maskable, size=100):
    """Square app icon. Maskable keeps all content inside the 80% safe-zone circle (r = 40)."""
    p = LIGHT
    if full_bleed_red:
        box = (22, 22, 56, 56) if maskable else (15, 15, 70, 70)
        inner = D.glyph_only(p, box)
        return f'<rect width="100" height="100" fill="{p["red"]}"/>{inner}'
    side = 56 if maskable else 80                 # a 56-unit square's corners sit on the r=40 circle
    off = (100 - side) / 2
    return (f'<rect width="100" height="100" fill="{p["bg"]}"/>'
            f'<g transform="translate({f(off)} {f(off)}) scale({f(side / 100)})">{D.mark(p)}</g>')


def c_glyph_only(p, box):
    return strokes_el(KAN_C, box, 5.2 * box[2] / 64, p['cut'])


C.glyph_only = staticmethod(c_glyph_only)


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write(content)


def main():
    for D in (A, B, C):
        d = os.path.join(HERE, D.key)
        for p in PALETTES:
            write(os.path.join(d, f'mark-{p["name"]}.svg'), svg(100, 100, D.mark(p), 'Kitaeru 鍛 seal'))
            body, W, H = D.vseal(p)
            write(os.path.join(d, f'seal-vertical-{p["name"]}.svg'), svg(W, H, body, 'Kitaeru 鍛える seal'))
            body, W, H = lockup_stacked(D, p)
            write(os.path.join(d, f'lockup-stacked-{p["name"]}.svg'), svg(W, H, body, 'Kitaeru 鍛える'))
            wm, wmw = D.word(p, 4, 34, 30, align='left')
            write(os.path.join(d, f'wordmark-{p["name"]}.svg'), svg(wmw + 8, 40, wm, 'Kitaeru'))
            body, W, H = lockup_horizontal(D, p)
            write(os.path.join(d, f'lockup-horizontal-{p["name"]}.svg'), svg(W, H, body, 'Kitaeru 鍛える'))
        for p in (LIGHT, DARK):
            write(os.path.join(d, f'favicon-{p["name"]}.svg'), svg(100, 100, D.micro(p), 'Kitaeru'))
        red_bg = D is C
        write(os.path.join(d, 'icon-any.svg'), svg(100, 100, app_icon(D, True, red_bg, False), 'Kitaeru'))
        write(os.path.join(d, 'icon-maskable.svg'), svg(100, 100, app_icon(D, True, red_bg, True), 'Kitaeru'))
    emit_app()
    print('ok')


# ---------------------------------------------------------------- the chosen direction (B) in the app
APP = os.path.normpath(os.path.join(HERE, '..', '..'))
TOK = dict(name='app', bg='#F5F1E8', ink='__WM__', red='__BG__', cut='__INK__')


def tokens_to_css(body):
    """Theme hooks: seal parts carry a class (for CSS overrides such as the in-button recolour) and a var() fill."""
    return (body.replace('fill="__BG__"', 'class="seal-bg" fill="var(--accent)"')
                .replace('fill="__INK__"', 'class="seal-ink" fill="var(--on-accent)"')
                .replace('fill="__WM__"', 'fill="currentColor"'))


def emit_app():
    D = B
    vbody, VW, VH = D.vseal(TOK)
    wm, wmw = D.word(TOK, 2, 32, 30, align='left')
    entries = {
        '鍛': dict(vb='0 0 100 100', lg=D.mark(TOK, gi=0), sm=D.micro(TOK, gi=0)),
        '済': dict(vb='0 0 100 100', lg=D.mark(TOK, gi=3), sm=D.micro(TOK, gi=3)),
        '鍛える': dict(vb=f'0 0 {VW} {VH}', lg=vbody, sm=vbody),
    }
    # each glyph outline is stored once (G) and referenced from the seal bodies
    glyph_names = {g['ch']: g['d'] for g in D.run}
    def dedupe(body):
        for ch, d in glyph_names.items():
            body = body.replace(f'd="{d}"', 'd="${G[\'' + ch + '\']}"')
        return body
    js = ['// GENERATED by docs/brand/build_logos.py (direction B, carved seal). Do not edit by hand.',
          '// Glyph outlines: Zen Antique (SIL OFL 1.1), see docs/brand/LICENSES.md. No font is used at runtime.',
          '// lg = carved mark with stone texture (32 px and up); sm = clean small-size cut (below 32 px).',
          'const G = {']
    for ch, d in glyph_names.items():
        js.append(f"  '{ch}': '{d}',")
    js.append('};')
    js.append('export const SEALS = {')
    for k, e in entries.items():
        lg = dedupe(tokens_to_css(e['lg']))
        sm = 'null' if e['sm'] is e['lg'] else '`' + dedupe(tokens_to_css(e['sm'])) + '`'
        js.append(f"  '{k}': {{ vb: '{e['vb']}', lg: `{lg}`, sm: {sm} }},")
    js.append('};')
    js.append(f"export const WORDMARK = {{ w: {f(wmw + 4)}, h: 40, body: '{tokens_to_css(wm)}' }};")
    write(os.path.join(APP, 'js', 'ui', 'seal-paths.js'), '\n'.join(js) + '\n')

    # favicon: the small-size cut, switching colours with the browser's colour scheme
    fav = D.micro(dict(name='fav', red='__BG__', cut='__INK__', ink='#000', bg='#fff'))
    fav = fav.replace('fill="__BG__"', 'class="bg"').replace('fill="__INK__"', 'class="ink"')
    style = ('<style>.bg{fill:#C8372D}.ink{fill:#FFF9F2}'
             '@media (prefers-color-scheme: dark){.bg{fill:#E0503F}.ink{fill:#FFF6EF}}</style>')
    write(os.path.join(APP, 'icons', 'favicon.svg'),
          f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{style}{fav}</svg>\n')
    # vector sources that icons/make_icons.py rasterises into the PNG icons
    write(os.path.join(APP, 'icons', 'icon-any.svg'), svg(100, 100, app_icon(D, True, False, False), 'Kitaeru'))
    write(os.path.join(APP, 'icons', 'icon-maskable.svg'), svg(100, 100, app_icon(D, True, False, True), 'Kitaeru'))


if __name__ == '__main__':
    main()
