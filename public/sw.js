/*
  Única cobertura offline de la biblioteca. La copia que vivía en
  `android/app/src/main/assets/www/` desapareció con el WebView artesanal: el
  contenedor Capacitor carga `https://ceoubb.com`, así que quien sirve
  `/biblioteca` sin conexión es este service worker y nadie más.
*/
// Implements: REQ-CAP-19
const CACHE = "centro-estudio-ubb-v7";
const SHELL = ["/", "/manifest.webmanifest", "/biblioteca/index.html"];
const IMMUTABLE = /^\/(_next\/static\/|biblioteca\/assets\/vendor\/)/;
const REVALIDATE = /^\/biblioteca\/assets\/(app|data)\.js$|^\/biblioteca\/assets\/styles\.css$/;

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
      IMMUTABLE.test(url.pathname) || REVALIDATE.test(url.pathname)
        ? cacheFirst(event, request)
        : networkFirst(event, request)
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
