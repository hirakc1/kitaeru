"""Benchmark anim-v3-pilot.html (v3 looks) and the v2 three.js player in headless Chrome, with CDP CPU throttling.

    python bench_cdp.py http://localhost:8770/anim-v3-pilot.html [--rates 1,4] [--chrome PATH]

Uses a throw-away Chrome profile in the temp folder. Needs the 'websockets' package. Reports, per throttle rate:
frame time (CPU side: animation update + render submission; same measure as the v2 player's stats()), rAF rate,
draw calls, triangles, and the load timings (fetch, parse, skeleton build, first frame incl. shader compile).
"""
import asyncio, json, subprocess, sys, tempfile, time, argparse, urllib.request, os, shutil
import websockets

CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'


async def cdp(ws, method, params=None, _id=[0]):
    _id[0] += 1
    i = _id[0]
    await ws.send(json.dumps({'id': i, 'method': method, 'params': params or {}}))
    while True:
        m = json.loads(await ws.recv())
        if m.get('id') == i:
            if 'error' in m:
                raise RuntimeError(m['error'])
            return m.get('result', {})


async def ev(ws, expr):
    r = await cdp(ws, 'Runtime.evaluate', {'expression': expr, 'awaitPromise': True, 'returnByValue': True})
    if 'exceptionDetails' in r:
        raise RuntimeError(r['exceptionDetails'])
    return r['result'].get('value')


BENCH_V3 = """(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  while (!window.v3) await sleep(100);
  const out = { timing: v3.timing, gl: (() => { const g = v3.renderer.getContext(), e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; })() };
  for (const l of ['solid', 'xray', 'muscle']) {
    v3.setLook(l, l !== 'solid'); v3.play(); await sleep(700); v3.resetStats(); await sleep(5000);
    out[l] = v3.stats();
  }
  return out;
})()"""
BENCH_V2 = """(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  v3.destroy(); window.v3 = null;
  document.getElementById('v2btn').click();
  for (let i = 0; i < 150 && !window.v2; i++) await sleep(100);
  if (!window.v2) return { error: document.getElementById('v2box').textContent || 'v2 did not start' };
  await sleep(700);
  const t0 = performance.now(); let n = 0; const gaps = [];
  let last = 0; await new Promise(res => { const f = ts => { if (last) gaps.push(ts - last); last = ts; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  gaps.sort((a, b) => a - b);
  return { ...v2.stats(), fps: 1000 / gaps[gaps.length >> 1] };
})()"""


async def run(url, rates, chrome):
    prof = tempfile.mkdtemp(prefix='kitaeru-bench-')
    port = 9334
    p = subprocess.Popen([chrome, '--headless=new', f'--remote-debugging-port={port}', f'--user-data-dir={prof}',
                          '--window-size=420,900', '--no-first-run', '--no-default-browser-check', '--ignore-gpu-blocklist',
                          '--enable-gpu', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
        results = {}
        async with websockets.connect(page['webSocketDebuggerUrl'], max_size=2 ** 24, proxy=None) as ws:
            await cdp(ws, 'Page.enable'); await cdp(ws, 'Runtime.enable')
            await cdp(ws, 'Emulation.setDeviceMetricsOverride', {'width': 420, 'height': 900, 'deviceScaleFactor': 2, 'mobile': True})
            await cdp(ws, 'Network.enable'); await cdp(ws, 'Network.setCacheDisabled', {'cacheDisabled': True})
            for rate in rates:
                await cdp(ws, 'Emulation.setCPUThrottlingRate', {'rate': rate})
                await cdp(ws, 'Page.navigate', {'url': url})
                await asyncio.sleep(3)
                print(f'rate {rate}: measuring v3 ...', flush=True)
                v3 = await asyncio.wait_for(ev(ws, BENCH_V3), 120)
                print(f'rate {rate}: measuring v2 ...', flush=True)
                v2 = await asyncio.wait_for(ev(ws, BENCH_V2), 120)
                results[rate] = {'v3': v3, 'v2': v2}
                print(f'--- CPU throttle {rate}x  (GL: {v3["gl"]})')
                t = v3['timing']
                print(f"  load: model {t['modelBytes']/1024:.0f} KB fetched {t['modelFetched']-t['start']:.0f} ms, parse {t['parse']:.0f} ms, "
                      f"skeleton {t['skeleton']:.0f} ms, first frame {t['firstFrame']:.0f} ms, total {t['total']:.0f} ms")
                for l in ('solid', 'xray', 'muscle'):
                    s = v3[l]
                    print(f"  v3 {l:6s}: {s['median']:.2f} ms median, {s['p95']:.2f} p95, {s['fps']:.0f} fps, {s['calls']} calls, {s['tris']} tris")
                if 'error' in v2:
                    print('  v2 error:', v2['error']); continue
                print(f"  v2 (jumping_jack): {v2['median']:.2f} ms median, {v2['p95']:.2f} p95, {v2['fps']:.0f} fps, {v2['calls']} calls, {v2['tris']} tris")
        return results
    finally:
        p.terminate()
        time.sleep(1)
        shutil.rmtree(prof, ignore_errors=True)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('url'); ap.add_argument('--rates', default='1,4'); ap.add_argument('--chrome', default=CHROME)
    a = ap.parse_args()
    r = asyncio.run(run(a.url, [float(x) for x in a.rates.split(',')], a.chrome))
    json.dump(r, open(os.path.join(tempfile.gettempdir(), 'kitaeru-bench.json'), 'w'), indent=1)
