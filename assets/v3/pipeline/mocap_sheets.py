"""Contact sheets of clips on the real body in headless Chrome (anim-v3.html?phases=...), saved as PNG.

    python mocap_sheets.py http://localhost:8771 <out dir> id[,id...] [--body f|m] [--n 8] [--size 300] [--mocap 0|1] [--per 1]

Each clip is shown from its own camera (the v2 clip's view) at n points of its cycle, real motion where the clip has it
(--mocap 0: the v2 bridge, for comparison). --per N: N clips per PNG (default 1).
"""
import asyncio, base64, json, os, subprocess, tempfile, time, urllib.request, shutil, argparse
import websockets
from bench_cdp import cdp, ev, CHROME


async def run(base, out, ids, body, n, size, mocap, per, look=''):
    os.makedirs(out, exist_ok=True)
    prof = tempfile.mkdtemp(prefix='kitaeru-sheets-')
    port = 9338
    p = subprocess.Popen([CHROME, '--headless=new', f'--remote-debugging-port={port}', f'--user-data-dir={prof}', '--no-first-run',
                          '--no-default-browser-check', '--ignore-gpu-blocklist', '--enable-gpu', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        tabs = []
        for _ in range(50):
            try:
                tabs = json.load(urllib.request.build_opener(urllib.request.ProxyHandler({})).open(f'http://127.0.0.1:{port}/json'))
                if any(t['type'] == 'page' for t in tabs):
                    break
            except Exception:
                time.sleep(.2)
        page = [t for t in tabs if t['type'] == 'page'][0]
        async with websockets.connect(page['webSocketDebuggerUrl'], max_size=2 ** 28, proxy=None) as ws:
            await cdp(ws, 'Page.enable'); await cdp(ws, 'Runtime.enable')
            width = min(n, 8) * (size + 4) + 20
            await cdp(ws, 'Emulation.setDeviceMetricsOverride', {'width': width, 'height': 800, 'deviceScaleFactor': 1, 'mobile': False})
            for i in range(0, len(ids), per):
                grp = ids[i:i + per]
                url = f'{base}/anim-v3.html?phases={",".join(grp)}&n={n}&body={body}&size={size}&mocap={mocap}' + (f'&look={look}' if look else '')
                await cdp(ws, 'Page.navigate', {'url': url})
                ok = False
                for _ in range(240):
                    await asyncio.sleep(.25)
                    try:
                        if await ev(ws, 'window.sheetDone === true'):
                            ok = True
                            break
                    except Exception:
                        pass
                if not ok:
                    print('timeout', grp, await ev(ws, 'document.body.innerText.slice(0, 300)'))
                    continue
                h = await ev(ws, 'document.documentElement.scrollHeight')
                r = await cdp(ws, 'Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': True,
                                                             'clip': {'x': 0, 'y': 0, 'width': width, 'height': h, 'scale': 1}})
                name = '_'.join(grp) if per > 1 else grp[0]
                f = os.path.join(out, f'{name}.{body}{"" if mocap else ".v2"}{"." + look if look else ""}.png')
                open(f, 'wb').write(base64.b64decode(r['data']))
                if per == 1:
                    zoom(f, size, n)
                print('saved', f)
    finally:
        p.terminate(); time.sleep(1); shutil.rmtree(prof, ignore_errors=True)


def zoom(f, size, n, th=420, cols=4):
    """the phases cropped to the figure (one box for all of them, so the camera stays put) and enlarged: <name>.z.png"""
    import numpy as np
    from PIL import Image
    im = Image.open(f).convert('RGB')
    cw = size + 4
    H = im.size[1]
    while H > 20 and np.asarray(im.crop((0, H - 2, im.size[0], H - 1))).std() < 1:   # (the page below the row)
        H -= 2
    cells = [im.crop((i * cw + 2, 18, (i + 1) * cw - 4, H - 4)) for i in range(n)]
    box = None
    for c in cells:
        a = np.asarray(c).astype(int)
        m = np.abs(a - a[-2, -2]).sum(-1) > 45
        ys, xs = np.nonzero(m)
        if len(xs):
            b = [xs.min(), ys.min(), xs.max(), ys.max()]
            box = b if box is None else [min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3])]
    if box is None:
        return
    box = [max(0, box[0] - 8), max(0, box[1] - 8), box[2] + 8, box[3] + 8]
    sc = th / (box[3] - box[1]); tw = int((box[2] - box[0]) * sc)
    rows = (n + cols - 1) // cols
    out = Image.new('RGB', (tw * cols, th * rows), 'white')
    for i, c in enumerate(cells):
        out.paste(c.crop(box).resize((tw, th), Image.LANCZOS), ((i % cols) * tw, (i // cols) * th))
    out.save(f.replace('.png', '.z.png'))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('base'); ap.add_argument('out'); ap.add_argument('ids')
    ap.add_argument('--body', default='f'); ap.add_argument('--n', type=int, default=8); ap.add_argument('--size', type=int, default=300)
    ap.add_argument('--mocap', type=int, default=1); ap.add_argument('--per', type=int, default=1); ap.add_argument('--look', default='')
    a = ap.parse_args()
    asyncio.run(run(a.base.rstrip('/'), a.out, a.ids.split(','), a.body, a.n, a.size, a.mocap, a.per, a.look))
