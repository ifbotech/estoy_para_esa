/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching"

declare let self: ServiceWorkerGlobalScope

// La app entera queda guardada en el teléfono: abre al toque y sin señal.
// Los datos (la API) siempre van a la red.
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting()
})

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
