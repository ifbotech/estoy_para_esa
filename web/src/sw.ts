/// <reference lib="webworker" />
import { CacheableResponsePlugin } from "workbox-cacheable-response"
import { clientsClaim } from "workbox-core"
import { ExpirationPlugin } from "workbox-expiration"
import { addPlugins, cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching"
import { registerRoute } from "workbox-routing"
import { CacheFirst, NetworkFirst } from "workbox-strategies"

declare let self: ServiceWorkerGlobalScope

// La app entera queda guardada en el teléfono: abre al toque y sin señal.
// Los datos van primero a la red y, si no hay, salen de la última copia
// (ver más abajo).
//
// Nunca se guarda una respuesta redirigida o con error: una versión vieja
// del servidor redirigía index.html a la home de ifbotech.com y el teléfono
// se quedaba mostrando esa home. Si algo así vuelve a pasar, la instalación
// falla y sigue andando la versión anterior.
addPlugins([
  {
    cacheWillUpdate: async ({ response }) => (response.redirected || !response.ok ? null : response),
  },
])
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// --- sin señal: planes, viajes y valijas a mano ------------------------------
//
// Las listas de la API se piden a la red primero (con 4 s de paciencia) y se
// guarda la última respuesta buena: en el avión o en la ruta, la app abre con
// lo último que vio, valija e itinerario incluidos. El tiempo real (/api/
// realtime) y las escrituras no pasan por acá.
registerRoute(
  ({ url, request }) => request.method === "GET" && url.pathname.includes("/api/collections/") && url.pathname.endsWith("/records"),
  new NetworkFirst({
    cacheName: "epe-datos",
    networkTimeoutSeconds: 4,
    plugins: [new CacheableResponsePlugin({ statuses: [200] }), new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
)

// Las fotos y miniaturas no cambian nunca (cada archivo tiene su nombre).
registerRoute(
  ({ url, request }) => request.method === "GET" && url.pathname.includes("/api/files/"),
  new CacheFirst({
    cacheName: "epe-fotos",
    plugins: [new CacheableResponsePlugin({ statuses: [200] }), new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 90, purgeOnQuotaError: true })],
  }),
)

// Cada versión nueva toma el control apenas se instala.
self.skipWaiting()
clientsClaim()

// Y si viene a reemplazar a otra, recarga las pantallas abiertas. Hace falta
// para los teléfonos con la copia rota: ahí lo que se ve no es la app (es la
// home de ifbotech.com guardada), así que la app no puede recargarse sola;
// el service worker nuevo sí.
let reemplazaAOtra = false
self.addEventListener("install", () => {
  reemplazaAOtra = Boolean(self.registration.active)
})
self.addEventListener("activate", (e) => {
  if (!reemplazaAOtra) return
  const reclamo = self.clients.claim()
  e.waitUntil(reclamo)
  // Afuera del waitUntil a propósito: la recarga pasa por este mismo service
  // worker, que no atiende nada hasta terminar de activarse. Si la
  // activación esperara a la recarga, se quedarían esperándose para siempre.
  reclamo.then(async () => {
    const ventanas = await self.clients.matchAll({ type: "window" })
    for (const v of ventanas) v.navigate(v.url).catch(() => null)
  })
})
