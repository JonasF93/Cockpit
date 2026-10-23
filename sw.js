// Themen-Cockpit: Offline-Unterstützung
// Speichert nur die App selbst (index.html) im Gerätespeicher, keine Inhalte.
// Mit Internet wird immer die neueste Version geladen, ohne Internet die gespeicherte.

const CACHE = 'themen-cockpit-app-v1';
const ASSETS = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fremde Adressen (z. B. Schriften) nicht anfassen

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    network.catch(() => {});
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
    try {
      return await Promise.race([network, timeout]);
    } catch (err) {
      const hit = (await cache.match(req, { ignoreSearch: true })) ||
        (req.mode === 'navigate' ? (await cache.match('./index.html')) || (await cache.match('./')) : null);
      if (hit) return hit;
      return network;
    }
  })());
});
