// Wisar service worker (23-vazifa) — offline rejim.
// Strategiya:
//   - Statik asset'lar (_next/static, rasm/font) → cache-first
//   - Sahifa navigatsiyasi (maqolalar) → stale-while-revalidate, offline fallback
//   - API so'rovlari → tarmoq (keshlanmaydi)
const CACHE = "wisar-v2";
const OFFLINE_URL = "/offline";
const PRECACHE = ["/", "/offline", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon") ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API — keshlamaymiz
  if (url.pathname.includes("/api/")) return;

  // Statik asset'lar — cache-first
  if (isStatic(url)) {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          }),
      ),
    );
    return;
  }

  // Sahifa navigatsiyasi — stale-while-revalidate + offline fallback
  if (req.mode === "navigate") {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => cached || cache.match(OFFLINE_URL));
        return cached || network;
      }),
    );
    return;
  }

  // Qolganlari — network, fallback cache
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
