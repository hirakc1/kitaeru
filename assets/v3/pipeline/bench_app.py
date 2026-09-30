"""Benchmark the app's animation players (v2 plate vs v3 human body) in headless Chrome with CDP CPU throttling.

    python bench_app.py http://localhost:8770 [--rates 1,4] [--chrome PATH]

Loads anim-bench.html (a dev page: the real createSkeletonPlayer, in the workout stage's CSS box, or a grid of Library
thumbnails) for each case, then reports per throttle rate:
  frame   the player's own draw time (CPU: pose + retarget + render submission / SVG build), median and p95
  raf     requestAnimationFrame gaps over 5 s (what the user sees: 16.7 ms = 60 fps), and frames over 34 ms
  mount   ms from page script start until every player has painted (thumbnail lists: the cost of opening the list)
Same machine and flags as bench_cdp.py (phase 1): 420x900 viewport at DPR 2, mobile emulation, cache disabled.
"""
import asyncio, json, subprocess, tempfile, time, argparse, urllib.request, os, shutil
import websockets
from bench_cdp import cdp, ev, CHROME

CASES = [
    ('player', 'classic', 'mode=player&id=jumping_jack'),
    ('player', 'human', 'mode=player&id=jumping_jack'),
    ('player taichi', 'classic', 'mode=player&id=taichi_cloud_hands'),
    ('player taichi', 'human', 'mode=player&id=taichi_cloud_hands'),
    ('player taiso', 'human', 'mode=player&id=rt_arm_swing_knee_bend&look=solid'),
    ('library 24 static', 'classic', 'mode=list&n=24'),
    ('library 24 static', 'human', 'mode=list&n=24'),
    ('plan 8 playing', 'classic', 'mode=plan&n=8'),
    ('plan 8 playing', 'human', 'mode=plan&n=8'),
]


async def run(base, rates, chrome):
    prof = tempfile.mkdtemp(prefix='kitaeru-bench-')
    port = 9335
    p = subprocess.Popen([chrome, '--headless=new', f'--remote-debugging-port={port}', f'--user-data-dir={prof}',
                          '--window-size=420,900', '--no-first-run', '--no-default-browser-check', '--ignore-gpu-blocklist',
                          '--enable-gpu', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    out = []
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
        async with websockets.connect(page['webSocketDebuggerUrl'], max_size=2 ** 24, proxy=None) as ws:
            await cdp(ws, 'Page.enable'); await cdp(ws, 'Runtime.enable')
            await cdp(ws, 'Emulation.setDeviceMetricsOverride', {'width': 420, 'height': 900, 'deviceScaleFactor': 2, 'mobile': True})
            await cdp(ws, 'Network.enable'); await cdp(ws, 'Network.setCacheDisabled', {'cacheDisabled': True})
            gl = None
            for rate in rates:
                await cdp(ws, 'Emulation.setCPUThrottlingRate', {'rate': rate})
                for name, fig, qs in CASES:
                    await cdp(ws, 'Page.navigate', {'url': f'{base}/anim-bench.html?{qs}&fig={fig}'})
                    await asyncio.sleep(2)
                    for _ in range(100):
                        try:
                            if await ev(ws, 'typeof window.bench'):
                                break
                        except Exception:
                            pass
                        await asyncio.sleep(.2)
                    r = await asyncio.wait_for(ev(ws, 'window.bench(5000)'), 180)
                    if gl is None:
                        gl = await ev(ws, "(() => { const g = document.createElement('canvas').getContext('webgl2'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; })()")
                        print('GL:', gl)
                    r.update(case=name, rate=rate, fig=fig)
                    out.append(r)
                    f = r.get('frame') or {}
                    print(f"{rate:>3}x  {name:20s} {fig:8s} [{r.get('renderer')}]  frame {f.get('median', 0):6.2f} ms (p95 {f.get('p95', 0):6.2f}, sum {f.get('sumMedian', 0):6.1f})"
                          f"   raf {r['raf']['median']:5.1f} ms / {r['raf']['fps']:4.0f} fps, >34 ms: {r['raf']['over33']}/{r['raf']['frames']}   mount {r['mount']} ms (load {r.get('load')} ms)", flush=True)
    finally:
        p.terminate(); time.sleep(1); shutil.rmtree(prof, ignore_errors=True)
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('base'); ap.add_argument('--rates', default='1,4'); ap.add_argument('--chrome', default=CHROME)
    a = ap.parse_args()
    res = asyncio.run(run(a.base.rstrip('/'), [float(x) for x in a.rates.split(',')], a.chrome))
    json.dump(res, open(os.path.join(tempfile.gettempdir(), 'kitaeru-bench-app.json'), 'w'), indent=1)
