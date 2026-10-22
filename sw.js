// Fridge OS service worker: caches the app so it opens instantly and offline.
// Live data still needs internet (MQTT over WebSocket isn't cached).
const CACHE = "fridge-os-v3";
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "https://unpkg.com/mqtt@5/dist/mqtt.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// stale-while-revalidate: show cached copy now, refresh it in the background
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const network = fetch(e.request)
        .then(res => { if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// tapping an alarm notification opens the app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then(list =>
      list.length ? list[0].focus() : self.clients.openWindow("./")
    )
  );
});
