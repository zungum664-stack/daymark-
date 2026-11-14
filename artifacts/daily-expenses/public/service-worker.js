const CACHE_NAME = "daymark-shell-v1";
const STATIC_FILES = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_FILES);

      const pageResponse = await fetch("/", { cache: "reload" });
      if (!pageResponse.ok) {
        throw new Error("Could not cache the Daymark app shell.");
      }
      await cache.put("/", pageResponse.clone());
      await cache.put("/index.html", pageResponse.clone());

      const html = await pageResponse.text();
      const assetPaths = Array.from(
        html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g),
        (match) => match[1],
      );
      await Promise.all(
        assetPaths.map(async (assetPath) => {
          const assetUrl = new URL(assetPath, self.location.origin);
          if (assetUrl.origin === self.location.origin) {
            await cache.add(assetUrl.href).catch(() => undefined);
          }
        }),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith("daymark-shell-") && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (
    request.method !== "GET" ||
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname.startsWith("/api/")
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request, { ignoreSearch: true });

      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok && networkResponse.type === "basic") {
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        if (cachedResponse) return cachedResponse;
        if (request.mode === "navigate") {
          return (await cache.match("/")) || (await cache.match("/index.html")) || Response.error();
        }
        return new Response("This item is not available offline yet.", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      }
    })(),
  );
});
