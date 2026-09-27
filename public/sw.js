const CACHE = "iluminati-v1"
const BASE = new URL("./", self.registration.scope).pathname
const SHELL = [
  BASE,
  BASE + "manifest.webmanifest",
  BASE + "icon-192.png",
  BASE + "icon-512.png",
  BASE + "favicon.svg",
  BASE + "icons.svg",
]

// Solo cacheamos respuestas 200 propias: un 404/500 guardado en cache-first
// deja la app rota hasta que el usuario borre los datos del sitio.
function isCacheable(response) {
  return response && response.status === 200 && response.type === "basic"
}

function putInCache(request, response) {
  return caches
    .open(CACHE)
    .then((cache) => cache.put(request, response))
    .catch(() => {})
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // cache: "reload" evita precachear una copia rancia del HTTP cache.
      .then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Documento HTML: network-first con fallback al shell cacheado.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isCacheable(response)) putInCache(BASE, response.clone())
          return response
        })
        .catch(() =>
          caches.match(BASE).then(
            (cached) =>
              cached ||
              new Response("Sin conexión y sin copia local de la app.", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              })
          )
        )
    )
    return
  }

  // Assets con hash: inmutables, cache-first.
  if (url.pathname.startsWith(BASE + "assets/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (isCacheable(response)) putInCache(request, response.clone())
            return response
          })
      )
    )
    return
  }

  // Resto del mismo origen (iconos, manifest): sin hash en el nombre, así que
  // stale-while-revalidate para que un cambio llegue en la siguiente carga.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (isCacheable(response)) putInCache(request, response.clone())
          return response
        })
        .catch(() => cached)

      return cached || network
    })
  )
})
