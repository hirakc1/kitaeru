// Kitaeru service worker: cache-first app shell, versioned caches, runtime caching for fonts.
const VERSION = 'v2026.10.01-1154';
const SHELL = `kitaeru-shell-${VERSION}`;
const RUNTIME = `kitaeru-runtime-${VERSION}`;
// Large files that rarely change (three.js and the two v3 bodies, ~1.7 MB) live in their own cache, named by a hash
// of their contents that deploy.py writes. A normal update never downloads them again; changing one of them does.
const ASSETS_ID = '02c440eafc';
const ASSETS = `kitaeru-assets-${ASSETS_ID}`;
const ASSET_FILES = ['./js/vendor/three.module.min.js', './assets/v3/human_f.glb', './assets/v3/human_m.glb'];

const SHELL_FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/version.js', './js/store.js',
  './js/ui/deps.js', './js/ui/base.js', './js/ui/components.js', './js/ui/seal-paths.js', './js/ui/model.js', './js/ui/welcome.js', './js/ui/onboarding.js',
  './js/ui/today.js', './js/ui/plan.js', './js/ui/workout.js', './js/ui/progress.js', './js/ui/library.js', './js/ui/me.js', './js/ui/quick.js', './js/ui/terms.js', './js/ui/culture.js', './js/ui/maker.js',
  './js/data/muscles.js', './js/data/exercises.js', './js/data/traditions.js', './js/data/animated.js',
  './js/anim/skeleton.js', './js/anim/poses.js', './js/anim/bodymap.js',
  // v2 animation: ids.js loads at start; the rest is imported on first use but precached here for offline
  './js/anim/v2/ids.js', './js/anim/v2/core.js', './js/anim/v2/anatomy.js', './js/anim/v2/plate.js', './js/anim/v2/clips/lib.js',
  './js/anim/v2/clips/push.js', './js/anim/v2/clips/pull.js', './js/anim/v2/clips/legs.js', './js/anim/v2/clips/trunk.js', './js/anim/v2/clips/abs.js', './js/anim/v2/clips/strength.js', './js/anim/v2/clips/cond.js', './js/anim/v2/clips/mob.js', './js/anim/v2/clips/moments.js',
  './js/anim/v2/clips/rot.js', './js/anim/v2/clips/trad.js', './js/anim/v2/clips/taiso.js', './js/anim/v2/clips/taichi.js',
  './js/anim/v2/clips/baduanjin.js', './js/anim/v2/clips/stances.js', './js/anim/v2/clips/yoga.js', './js/anim/v2/clips/makko.js',
  // v3 human body (Me -> Animation: Human body, the default): imported on first use, precached for offline
  './js/anim/v3/body-player.js', './js/anim/v3/glb.js', './js/anim/v3/retarget.js', './js/anim/v3/stage.js',
  './js/anim/v3/look.js', './js/anim/v3/bones.js',   // three.js and the bodies: ASSET_FILES
  './js/engine/planner.js',
  './icons/favicon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Add individually so one missing file never blocks installation.
    await Promise.all(SHELL_FILES.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => null)));
    // Long-lived assets: fetched only when this asset set is new (a hash change), otherwise kept from before.
    const assets = await caches.open(ASSETS);
    await Promise.all(ASSET_FILES.map(async u => { if (!(await assets.match(u))) await assets.add(new Request(u, { cache: 'reload' })).catch(() => null); }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('kitaeru-') && k !== SHELL && k !== RUNTIME && k !== ASSETS).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: stale-while-revalidate in the runtime cache.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const hit = await cache.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Navigations: serve the cached shell (hash routing means one document). Other pages at the root (the review tools:
  // anim-review.html, taiso-check.html) are not the app: they go straight to the network, and never replace the shell.
  if (req.mode === 'navigate' && /\.html$/.test(url.pathname) && !/\/index\.html$/.test(url.pathname)) return;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match('./index.html') || await cache.match('./');
      if (hit) { fetch(req).then(res => res.ok && cache.put('./index.html', res.clone())).catch(() => {}); return hit; }
      return fetch(req);
    })());
    return;
  }

  // Everything else same-origin: cache-first, then network (and cache it).
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok) (await caches.open(RUNTIME)).put(req, res.clone());
      return res;
    } catch {
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
