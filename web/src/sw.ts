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

// Cada versión nueva toma el control apenas se instala (la app se recarga
// sola): así un teléfono con una copia rota se arregla en la próxima visita.
self.skipWaiting()
clientsClaim()

self.addEventListener("push", (e) => {
  let d: { title?: string; body?: string; url?: string; tag?: string } = {}
  try {
    d = e.data?.json() ?? {}
  } catch {
    d = { body: e.data?.text() }
  }
  e.waitUntil(
    self.registration.showNotification(d.title || "Estoy para esa", {
      body: d.body || "",
      icon: "iconos/icono-192.png",
      badge: "iconos/insignia-96.png",
      tag: d.tag,
      data: { url: d.url || "#/" },
    }),
  )
})

self.addEventListener("notificationclick", (e) => {
  e.notification.close()
  const destino = new URL(`./${e.notification.data?.url || "#/"}`, self.registration.scope).href
  e.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const v of ventanas) {
        if (v.url.startsWith(self.registration.scope) && !v.url.includes("/archivo/")) {
          await v.focus()
          return (v as WindowClient).navigate(destino)
        }
      }
      return self.clients.openWindow(destino)
    })(),
  )
})
