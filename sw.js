// Kitaeru service worker: cache-first app shell, versioned caches, runtime caching for fonts.
const VERSION = 'v2026.09.28-1537';
const SHELL = `kitaeru-shell-${VERSION}`;
const RUNTIME = `kitaeru-runtime-${VERSION}`;

const SHELL_FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/store.js',
  './js/ui/deps.js', './js/ui/components.js', './js/ui/seal-paths.js', './js/ui/model.js', './js/ui/welcome.js', './js/ui/onboarding.js',
  './js/ui/today.js', './js/ui/plan.js', './js/ui/workout.js', './js/ui/progress.js', './js/ui/library.js', './js/ui/me.js', './js/ui/quick.js',
  './js/data/muscles.js', './js/data/exercises.js',
  './js/anim/skeleton.js', './js/anim/poses.js', './js/anim/bodymap.js',
  // v2 animation: ids.js loads at start; the rest is imported on first use but precached here for offline
  './js/anim/v2/ids.js', './js/anim/v2/core.js', './js/anim/v2/anatomy.js', './js/anim/v2/plate.js', './js/anim/v2/clips/lib.js',
  './js/anim/v2/clips/push.js', './js/anim/v2/clips/pull.js', './js/anim/v2/clips/legs.js', './js/anim/v2/clips/trunk.js',
  './js/engine/planner.js',
  './icons/favicon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    // Add individually so one missing file never blocks installation.
    await Promise.all(SHELL_FILES.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('kitaeru-') && k !== SHELL && k !== RUNTIME).map(k => caches.delete(k)));
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

  // Navigations: serve the cached shell (hash routing means one document).
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
