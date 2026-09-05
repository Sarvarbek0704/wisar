// Wisar service worker (23-vazifa) — offline + NETWORK-FIRST.
// Strategiya:
//   - Statik asset'lar (_next/static, rasm/font) → cache-first (hashli — o'zgarmaydi)
//   - Sahifa navigatsiyasi (HTML) → NETWORK-FIRST: DOIM eng yangi versiya, offline'da keshdan
//   - API so'rovlari → tarmoq (keshlanmaydi)
// Kesh nomi (v3) o'zgargani uchun eski kesh activate'da o'chiriladi — eski versiya ilashib qolmaydi.
const CACHE = "wisar-v4"; // v4: shaxsiy sahifalar endi keshlanmaydi — eski kesh tozalanadi
const OFFLINE_URL = "/offline";
const PRECACHE = ["/offline", "/manifest.json"];

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

// Shaxsiy (kirish talab qiladigan) sahifalar — bular hech qachon keshlanmaydi.
const PRIVATE_PREFIXES = [
  "/me",
  "/admin",
  "/planner",
  "/review",
  "/bookmarks",
  "/groups",
  "/flashcards",
  "/ielts",
  "/onboarding",
  "/certificate",
  "/auth",
  "/profile",
];

function isPublicPage(url) {
  return !PRIVATE_PREFIXES.some(
    (p) => url.pathname === p || url.pathname.startsWith(p + "/"),
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API — keshlamaymiz
  if (url.pathname.includes("/api/")) return;

  // Statik asset'lar — cache-first (hashli fayllar, o'zgarmaydi)
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

  // Sahifa navigatsiyasi — NETWORK-FIRST: avval tarmoq (yangi), keyin (offline) kesh.
  // MUHIM: shaxsiy sahifalar keshlanmaydi — umumiy qurilmada chiqib ketilgandan
  // keyin boshqa odam oldingi foydalanuvchi sahifasini ko'rmasligi uchun.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (isPublicPage(url) && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Qolganlari — network, fallback cache
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
