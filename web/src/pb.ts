import PocketBase, { LocalAuthStore } from "pocketbase"

/**
 * Dónde está la API. La app se publica en /estoyparaesa/ y las versiones
 * viejas en /estoyparaesa/archivo/<id>/: todas usan la misma API, la de la
 * carpeta de arriba de "archivo".
 */
export function raizApp(pathname = location.pathname): string {
  const i = pathname.indexOf("/archivo/")
  if (i >= 0) return pathname.slice(0, i + 1)
  return pathname.replace(/[^/]*$/, "")
}

export const enArchivo = location.pathname.includes("/archivo/")
export const BASE = new URL(raizApp(), location.origin).toString().replace(/\/$/, "")

// Clave propia: ifbotech.com comparte origen con otras apps (ROOTLAB).
export const pb = new PocketBase(BASE, new LocalAuthStore("epe_auth"))
pb.autoCancellation(false)

export function urlArchivo(rec: { collectionId: string; id: string }, archivo: string, thumb?: string) {
  if (!archivo) return ""
  return pb.files.getURL(rec, archivo, thumb ? { thumb } : undefined)
}
