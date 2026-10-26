/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core"
import { addPlugins, cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching"

declare let self: ServiceWorkerGlobalScope

// La app entera queda guardada en el teléfono: abre al toque y sin señal.
// Los datos (la API) siempre van a la red.
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
