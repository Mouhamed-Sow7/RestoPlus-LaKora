// Bump cette version à chaque changement de stratégie du SW lui-même
// (le contenu des fichiers cachés, lui, n'a plus besoin de bump manuel
// grâce à la stratégie network-first ci-dessous).
const CACHE_NAME = "restoplus-v2";
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

// Fetch : network-first pour le same-origin, cache en secours hors-ligne.
// Le cross-origin (CDN scripts, Google Fonts, api.qrserver.com...) n'est
// PAS intercepté : on laisse le navigateur gérer ces requêtes nativement.
// Avant ce fix, le SW essayait de les re-fetcher lui-même, et ce fetch
// interne est soumis à connect-src (CSP) — d'où les échecs "Failed to
// convert value to 'Response'" sur unpkg/cdnjs/fonts.googleapis.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Cross-origin : on ne touche à rien, le navigateur s'en charge.
  if (url.origin !== self.location.origin) return;

  // API : toujours réseau, jamais de cache (données live).
  if (url.pathname.startsWith("/api/")) return;

  // Same-origin (HTML/CSS/JS/images) : network-first.
  // On essaie le réseau en premier pour que chaque déploiement soit visible
  // immédiatement (plus besoin de hard refresh) ; le cache ne sert que de
  // filet de sécurité hors-ligne.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.status === 200 && e.request.method === "GET") {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => {
          if (cached) return cached;
          if (e.request.mode === "navigate") return caches.match("/menu.html");
        }),
      ),
  );
});
