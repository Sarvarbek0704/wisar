// Service Worker — static assetlarni cache qilish (PWA)
const CACHE = "mana-v1";
const STATIC = ["/", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // API so'rovlarini cache qilmaymiz
  if (e.request.url.includes("/api/")) return;
  // Faqat GET so'rovlari
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(
      (cached) => cached || fetch(e.request).catch(() => caches.match("/")),
    ),
  );
});
