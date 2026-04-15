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

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    payload = {
      body: event.data.text(),
    };
  }

  const title = payload.title || "AtiSunya CRM";
  const options = {
    body: payload.body || "You have a new reminder.",
    icon: payload.icon || "/app-icon-192.png",
    badge: payload.badge || "/app-icon-192.png",
    tag: payload.tag || "crm-reminder",
    renotify: true,
    requireInteraction: true,
    vibrate: [180, 100, 180],
    timestamp: Date.now(),
    data: payload.data || {},
  };

  if (payload.url) {
    options.data = {
      ...(options.data || {}),
      url: payload.url,
    };
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification?.data?.url || "/dashboard", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const matchingClient = clientList.find((client) => client.url === targetUrl);
      if (matchingClient && "focus" in matchingClient) {
        return matchingClient.focus();
      }

      for (const client of clientList) {
        if ("focus" in client) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
