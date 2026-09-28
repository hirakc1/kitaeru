"""Stage 1: convert the OFL glyphs used by the logo explorations into outline path data.

Usage:  python docs/brand/extract_glyphs.py <font_dir>
Writes docs/brand/glyphs.json (path data in font units, y-down, baseline at 0).

Fonts (all SIL OFL 1.1, from github.com/google/fonts/tree/main/ofl, see LICENSES.md):
  YujiSyuku-Regular.ttf       direction A (brush) — 鍛える
  ShipporiMincho-ExtraBold.ttf direction A wordmark — Kitaeru
  ZenAntique-Regular.ttf      direction B (carved) — 鍛える + KITAERU wordmark
  Jost[wght].ttf              direction C wordmark (instanced at wght 500) — KITAERU
Direction C's 鍛える is drawn by hand as centre-line strokes (see build_logos.py), no font.
"""
import json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

JOBS = [
    ('A', 'YujiSyuku-Regular.ttf', None, '鍛える'),
    ('Aw', 'ShipporiMincho-ExtraBold.ttf', None, 'Kitaeru'),
    ('B', 'ZenAntique-Regular.ttf', None, '鍛える'),
    ('Bw', 'ZenAntique-Regular.ttf', None, 'KITAERU'),
    ('Cw', 'Jost[wght].ttf', 500, 'KITAERU'),
]


def num(v):
    s = '%.1f' % v
    return s[:-2] if s.endswith('.0') else s


def main(font_dir):
    out = {}
    for key, fname, wght, text in JOBS:
        f = TTFont(os.path.join(font_dir, fname))
        if wght is not None and 'fvar' in f:
            from fontTools.varLib import instancer
            f = instancer.instantiateVariableFont(f, {'wght': wght})
        gs, cmap = f.getGlyphSet(), f.getBestCmap()
        name = f['name'].getDebugName(4)
        glyphs = []
        for ch in text:
            g = gs[cmap[ord(ch)]]
            pen = SVGPathPen(gs, ntos=num)
            g.draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))
            bp = BoundsPen(gs)
            g.draw(TransformPen(bp, (1, 0, 0, -1, 0, 0)))
            glyphs.append({'ch': ch, 'd': pen.getCommands(), 'bounds': [round(v, 1) for v in bp.bounds], 'adv': g.width})
        out[key] = {'font': name, 'file': fname, 'upm': f['head'].unitsPerEm, 'glyphs': glyphs}
        print(key, name, [len(g['d']) for g in glyphs])
    here = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(here, 'glyphs.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main(sys.argv[1])
