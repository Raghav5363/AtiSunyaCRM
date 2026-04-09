const SHELL_CACHE = "atisunya-crm-shell-v4";
const RUNTIME_CACHE = "atisunya-crm-runtime-v4";

const shellFiles = ["/", "/index.html", "/manifest.json", "/app-icon-192.png", "/app-icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(shellFiles);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== SHELL_CACHE && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }

          return Promise.resolve();
        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isNavigation = event.request.mode === "navigate";
  const isStaticAsset =
    isSameOrigin &&
    (requestUrl.pathname.startsWith("/static/") ||
      requestUrl.pathname.endsWith(".js") ||
      requestUrl.pathname.endsWith(".css") ||
      requestUrl.pathname.endsWith(".png") ||
      requestUrl.pathname.endsWith(".jpg") ||
      requestUrl.pathname.endsWith(".svg") ||
      requestUrl.pathname.endsWith(".ico"));

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match("/index.html");
          return cachedPage || caches.match("/");
        })
    );
    return;
  }

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, copy));
            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request);
      return cachedResponse || Response.error();
    })
  );
});
