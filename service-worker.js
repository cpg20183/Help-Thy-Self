/* Offline cache for Self Motivation Dashboard */
const CACHE_NAME = 'hts-dashboard-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    try{
      const res = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      // cache fresh copies for navigation/assets
      if(event.request.method === 'GET' && res && res.status === 200){
        cache.put(event.request, res.clone());
      }
      return res;
    }catch(_){
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if(cached) return cached;
      // fallback to app shell for navigation
      if(event.request.mode === 'navigate'){
        return caches.match('./index.html');
      }
      throw _;
    }
  })());
});
