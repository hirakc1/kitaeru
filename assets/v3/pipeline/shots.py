"""Save review screenshots of the human body (anim v3) as PNG, with headless Chrome over CDP.

    python shots.py http://localhost:8770 <out folder>

Pages: anim-v3.html (single clip, compare with v2, contact sheets) and anim-bench.html; light and dark.
"""
import asyncio, base64, json, os, subprocess, sys, tempfile, time, urllib.request, shutil
import websockets
from bench_cdp import cdp, ev, CHROME

SHOTS = [
    # name, url (relative), width, height, dark, js to run after load
    ('compare-push-up-v2-v3', 'anim-v3.html?id=push_up&v2&look=xray', 1100, 560, False, "document.querySelector('#grid').scrollIntoView(); p3.pause(); p2.pause(); p3.seek(.45); p2.seek(.45);"),
    ('compare-squat-v2-v3', 'anim-v3.html?id=bodyweight_squat&v2&body=m', 1100, 560, False, "document.querySelector('#grid').scrollIntoView(); p3.pause(); p2.pause(); p3.seek(.5); p2.seek(.5);"),
    ('taiso-solid-female-front', 'anim-v3.html?id=rt_stretch_up&solo&body=f', 520, 640, False, "p3.pause(); p3.seek(.3); p3.orbit(30);"),
    ('taiso-solid-male-front', 'anim-v3.html?id=rt_stretch_up&solo&body=m', 520, 640, False, "p3.pause(); p3.seek(.3); p3.orbit(30);"),
    ('taiso-solid-female-back', 'anim-v3.html?id=rt_deep_breath&solo&body=f', 520, 640, False, "p3.pause(); p3.seek(.05); p3.orbit(210);"),
    ('push-up-xray-skeleton', 'anim-v3.html?id=push_up&solo&skel', 800, 520, False, "p3.pause(); p3.seek(.1);"),
    ('diamond-push-up-detail', 'anim-v3.html?id=diamond_push_up&solo', 800, 520, False, "p3.pause(); p3.seek(.5);"),
    ('tai-chi-dark', 'anim-v3.html?id=taichi_cloud_hands&solo&body=m', 520, 640, True, "p3.pause(); p3.seek(.3);"),
    ('surya-cobra', 'anim-v3.html?id=sn_cobra&solo', 800, 520, False, "p3.pause(); p3.seek(.9);"),
    ('floor-glute-bridge-dark', 'anim-v3.html?id=glute_bridge&solo&body=m', 800, 520, True, "p3.pause(); p3.seek(.5);"),
    ('sheet-strength', 'anim-v3.html?t=0.3&look=solid&sheet=push_up,decline_push_up,pike_push_up,bench_dip,bar_dip,pull_up,inverted_row,archer_row,band_row,bodyweight_squat,split_squat,bulgarian_split_squat,glute_bridge,hip_thrust,plank,side_plank,dead_bug,hanging_leg_raise,l_sit,crow_pose',
     790, 620, False, ''),
    ('sheet-traditions', 'anim-v3.html?t=0.3&look=solid&sheet=rt_stretch_up,rt_arm_circles,rt_side_bend,rt_forward_back_bend,rt_diagonal_bend,taichi_part_horse_mane,taichi_white_crane,taichi_cloud_hands,baduanjin_draw_bow,baduanjin_touch_toes,dand,baithak,horse_stance,zhan_zhuang,vrikshasana,virabhadrasana_2,trikonasana,sn_dog,sn_lunge_r,makko_2',
     790, 620, False, ''),
    ('library-thumbnails-xray', 'anim-bench.html?mode=list&n=12&fig=human', 420, 900, False, ''),
    ('library-thumbnails-v2', 'anim-bench.html?mode=list&n=12&fig=classic', 420, 900, False, ''),
]


async def main(base, out):
    os.makedirs(out, exist_ok=True)
    prof = tempfile.mkdtemp(prefix='kitaeru-shots-')
    port = 9336
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
        async with websockets.connect(page['webSocketDebuggerUrl'], max_size=2 ** 26, proxy=None) as ws:
            await cdp(ws, 'Page.enable'); await cdp(ws, 'Runtime.enable')
            only = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
            for name, url, w, h, dark, js in SHOTS:
                if only and name not in only:
                    continue
                await cdp(ws, 'Emulation.setDeviceMetricsOverride', {'width': w, 'height': h, 'deviceScaleFactor': 2, 'mobile': False})
                await cdp(ws, 'Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-color-scheme', 'value': 'dark' if dark else 'light'}]})
                await cdp(ws, 'Page.navigate', {'url': f'{base}/{url}'})
                await asyncio.sleep(3.5)
                if js:
                    for _ in range(40):
                        if await ev(ws, 'typeof window.p3 === "object" && !!window.p3'):
                            break
                        await asyncio.sleep(.25)
                    await ev(ws, f'(async () => {{ {js} await new Promise(r => setTimeout(r, 300)); return 1; }})()')
                elif url.startswith('anim-bench'):
                    for _ in range(80):
                        if await ev(ws, 'typeof window.ready === "function"'):
                            break
                        await asyncio.sleep(.25)
                    await ev(ws, 'window.ready()')
                await asyncio.sleep(.6)
                r = await cdp(ws, 'Page.captureScreenshot', {'format': 'png'})
                open(os.path.join(out, name + '.png'), 'wb').write(base64.b64decode(r['data']))
                print('saved', name)
    finally:
        p.terminate(); time.sleep(1); shutil.rmtree(prof, ignore_errors=True)


if __name__ == '__main__':
    asyncio.run(main(sys.argv[1].rstrip('/'), sys.argv[2]))
