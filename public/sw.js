/*
  Cobertura offline del portal web y PWA de Centro de Estudio UBB.
  El contenedor Capacitor carga https://ceoubb.com y este service worker
  proporciona la resiliencia offline necesaria.
*/
// Implements: REQ-CAP-19
const CACHE = "centro-estudio-ubb-v9";
const SHELL = ["/", "/manifest.webmanifest"];
const IMMUTABLE = /^\/(_next\/static\/|vendor\/)/;

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) => cache.addAll(SHELL))
        .then(() => self.skipWaiting())
    );
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.flatMap((key) => (key !== CACHE ? [caches.delete(key)] : [])))
        )
        .then(() => self.clients.claim())
    );
  });

  self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
    event.respondWith(
      IMMUTABLE.test(url.pathname) ? cacheFirst(event, request) : networkFirst(event, request)
    );
  });
}

function store(event, request, response) {
  if (!response.ok) return response;
  const copy = response.clone();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
  return response;
}

async function cacheFirst(event, request) {
  const cached = await caches.match(request);
  if (cached) {
    event.waitUntil(
      fetch(request)
        .then(
          (response) =>
            response.ok && caches.open(CACHE).then((cache) => cache.put(request, response))
        )
        .catch(() => undefined)
    );
    return cached;
  }
  return store(event, request, await fetch(request));
}

async function networkFirst(event, request) {
  try {
    return store(event, request, await fetch(request));
  } catch {
    return (await caches.match(request)) || (await caches.match("/"));
  }
}
