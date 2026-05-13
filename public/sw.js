const CACHE_NAME = "restoplus-v1";
const STATIC_ASSETS = [
  "/",
  "/menu.html",
  "/admin.html",
  "/css/main.css",
  "/css/menu.css",
  "/css/admin.css",
  "/css/admin-modal.css",
  "/js/menu.js",
  "/js/cart.js",
  "/js/admin.js",
  "/img/logo.png",
];

// Install : cache les assets statiques
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// Activate : nettoie les anciens caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// Fetch : network-first pour l'API, cache-first pour les assets
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // API : toujours réseau, pas de cache
  if (url.pathname.startsWith("/api/")) return;

  // Assets statiques : cache d'abord, réseau si absent
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          // Cache les nouvelles réponses statiques valides
          if (res && res.status === 200 && e.request.method === "GET") {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          // Fallback offline : retourne menu.html pour les navigations
          if (e.request.mode === "navigate") return caches.match("/menu.html");
        });
    }),
  );
});
