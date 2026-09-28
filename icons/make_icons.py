"""Generate Kitaeru PWA icons: a vermilion hanko seal with a white 鍛.
Uses Pillow when available (with a Japanese system font); otherwise falls back to a pure
zlib/struct PNG writer that draws the seal with a stylised 'K' mark."""
import os, struct, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = HERE
VERMILION = (200, 55, 45)
WASHI = (245, 241, 232)
WHITE = (255, 249, 242)
FONTS = [r'C:\Windows\Fonts\YuGothB.ttc', r'C:\Windows\Fonts\msgothic.ttc', '/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc',
         '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc']


def pillow_icon(size, maskable):
    from PIL import Image, ImageDraw, ImageFont
    S = size * 4  # supersample for smooth edges
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, S, S], fill=VERMILION)
        inset, rad, scale = int(S * 0.2), int(S * 0.06), 0.36   # keep mark inside the 80% safe zone
    else:
        pad = int(S * 0.06)
        d.rounded_rectangle([pad, pad, S - pad, S - pad], radius=int(S * 0.2), fill=VERMILION)
        inset, rad, scale = int(S * 0.13), int(S * 0.12), 0.5
    d.rounded_rectangle([inset, inset, S - inset, S - inset], radius=rad, outline=WHITE, width=max(2, int(S * 0.018)))
    font = None
    for f in FONTS:
        if os.path.exists(f):
            try: font = ImageFont.truetype(f, int(S * scale)); break
            except OSError: pass
    if font:
        d.text((S / 2, S / 2 + S * 0.01), '鍛', font=font, fill=WHITE, anchor='mm')
    else:
        draw_k(d, S, WHITE)
    return img.resize((size, size), Image.LANCZOS)


def draw_k(d, S, col):
    w = S * 0.07
    x0, y0, y1, xm = S * 0.36, S * 0.3, S * 0.7, S * 0.64
    d.line([(x0, y0), (x0, y1)], fill=col, width=int(w))
    d.line([(x0, S * 0.52), (xm, y0)], fill=col, width=int(w))
    d.line([(S * 0.45, S * 0.45), (xm, y1)], fill=col, width=int(w))


# ---------- pure-python fallback ----------
def png_bytes(w, h, rows):
    raw = b''.join(b'\x00' + bytes(r) for r in rows)
    def chunk(t, data): return struct.pack('>I', len(data)) + t + data + struct.pack('>I', zlib.crc32(t + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')


def fallback_icon(size, maskable):
    import math
    S = size
    def in_rrect(x, y, x0, y0, x1, y1, r):
        cx = min(max(x, x0 + r), x1 - r); cy = min(max(y, y0 + r), y1 - r)
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r and x0 <= x <= x1 and y0 <= y <= y1
    def seg_dist(px, py, ax, ay, bx, by):
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        return math.hypot(px - ax - t * dx, py - ay - t * dy)
    segs = [(0.36, 0.3, 0.36, 0.7), (0.36, 0.52, 0.64, 0.3), (0.45, 0.45, 0.64, 0.7)]
    rows = []
    for yy in range(S):
        row = []
        for xx in range(S):
            x, y = (xx + .5) / S, (yy + .5) / S
            bg = True if maskable else in_rrect(x, y, .06, .06, .94, .94, .2)
            if not bg: row += [0, 0, 0, 0]; continue
            ink = any(seg_dist(x, y, *s) < 0.035 for s in segs)
            ins = 0.2 if maskable else 0.13
            border = in_rrect(x, y, ins, ins, 1 - ins, 1 - ins, .1) and not in_rrect(x, y, ins + .018, ins + .018, 1 - ins - .018, 1 - ins - .018, .09)
            row += list(WHITE if ink or border else VERMILION) + [255]
        rows.append(row)
    return png_bytes(S, S, rows)


def main():
    os.makedirs(OUT, exist_ok=True)
    targets = [('icon-192.png', 192, False), ('icon-512.png', 512, False), ('icon-maskable-512.png', 512, True), ('apple-touch-icon.png', 180, True)]
    try:
        import PIL  # noqa: F401
        for name, size, mask in targets:
            pillow_icon(size, mask).save(os.path.join(OUT, name), optimize=True)
        print('icons written with Pillow')
    except ImportError:
        for name, size, mask in targets:
            with open(os.path.join(OUT, name), 'wb') as f: f.write(fallback_icon(size, mask))
        print('icons written with pure-python fallback')


if __name__ == '__main__':
    main()
