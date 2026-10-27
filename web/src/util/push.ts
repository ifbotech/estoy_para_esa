import { useSyncExternalStore } from "react"
import { pb } from "../pb"

/**
 * Los avisos push de este teléfono.
 *
 * La regla de oro: cada vez que se abre la app (y cada vez que vuelve a
 * primer plano), `asegurarPush()` revisa que el teléfono tenga su suscripción
 * y que el servidor la conozca. Si el navegador la renovó, si el servidor la
 * borró porque venció o si cambiaron las claves, se arregla sola, sin que
 * nadie toque nada. Sólo pedir el permiso necesita un toque (lo exige iOS).
 */

export type EstadoPush =
  | "cargando"
  | "no-disponible" // este navegador no tiene push
  | "instalar" // iPhone en Safari: hay que agregarla a la pantalla de inicio
  | "pedir" // todavía no se pidió el permiso
  | "denegado" // el permiso se negó (se cambia en los ajustes del teléfono)
  | "activo"
  | "error"

let estado: EstadoPush = "cargando"
let ultimoError = ""
const oyentes = new Set<() => void>()
function poner(e: EstadoPush, error = "") {
  estado = e
  ultimoError = error
  oyentes.forEach((o) => o())
}

export function useEstadoPush(): { estado: EstadoPush; error: string } {
  const e = useSyncExternalStore(
    (cb) => {
      oyentes.add(cb)
      return () => oyentes.delete(cb)
    },
    () => estado,
  )
  return { estado: e, error: ultimoError }
}

function claveABytes(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4)
  const b = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

function bytesABase64(buf: ArrayBuffer | null | undefined) {
  if (!buf) return ""
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function pushDisponible() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

/** En iPhone los avisos sólo andan con la app agregada a la pantalla de inicio. */
export function esIOSSinInstalar() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const instalada = matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone
  return ios && !instalada
}

/** Un nombre que se entienda para un teléfono, a partir del user agent. */
export function nombreDispositivo(ua = navigator.userAgent) {
  if (/iphone/i.test(ua)) return "iPhone"
  if (/ipad/i.test(ua)) return "iPad"
  if (/android/i.test(ua)) return /mobile/i.test(ua) ? "Android" : "Tablet Android"
  if (/macintosh/i.test(ua)) return "Mac"
  if (/windows/i.test(ua)) return "Windows"
  if (/linux/i.test(ua)) return "Linux"
  return "Otro dispositivo"
}

async function registro(): Promise<ServiceWorkerRegistration | null> {
  // en el archivo de versiones no hay service worker: no esperar para siempre
  const listo = navigator.serviceWorker.ready
  const tiempo = new Promise<null>((r) => setTimeout(() => r(null), 8000))
  return Promise.race([listo, tiempo])
}

let claveServidor = ""
async function clave() {
  if (!claveServidor) claveServidor = (await pb.send<{ clave: string }>("/api/epe/push/clave", {})).clave
  return claveServidor
}

/** Que el servidor tenga esta suscripción, a nombre de quien está usando la app. */
async function registrarEnServidor(sub: PushSubscription) {
  const json = sub.toJSON()
  const mias = await pb.collection("push_subs").getFullList({ filter: pb.filter("endpoint = {:e}", { e: json.endpoint }) })
  const dispositivo = `${nombreDispositivo()} · ${navigator.userAgent}`.slice(0, 190)
  if (!mias.length) {
    // si estaba a nombre del otro (cambiaron de cuenta en este teléfono), el servidor la pasa
    await pb.collection("push_subs").create({ usuario: pb.authStore.record?.id, endpoint: json.endpoint, suscripcion: json, dispositivo })
    return
  }
  const guardada = mias[0].suscripcion as PushSubscriptionJSON | undefined
  if (guardada?.keys?.p256dh !== json.keys?.p256dh || guardada?.keys?.auth !== json.keys?.auth || mias[0].dispositivo !== dispositivo) {
    await pb.collection("push_subs").update(mias[0].id, { suscripcion: json, dispositivo })
  }
}

let enCurso: Promise<EstadoPush> | null = null

/**
 * Revisa y arregla los avisos de este teléfono, sin pedir nada. Se llama al
 * abrir la app y al volver a primer plano.
 */
export function asegurarPush(): Promise<EstadoPush> {
  if (!enCurso) enCurso = asegurar().finally(() => (enCurso = null))
  return enCurso
}

async function asegurar(): Promise<EstadoPush> {
  if (!pb.authStore.isValid) return estado
  if (esIOSSinInstalar()) {
    poner("instalar")
    return estado
  }
  if (!pushDisponible()) {
    poner("no-disponible")
    return estado
  }
  if (Notification.permission === "denied") {
    poner("denegado")
    return estado
  }
  if (Notification.permission === "default") {
    poner("pedir")
    return estado
  }
  try {
    const reg = await registro()
    if (!reg) {
      poner("error", "La app todavía no terminó de instalarse. Probá en un ratito.")
      return estado
    }
    const k = await clave()
    let sub = await reg.pushManager.getSubscription()
    // si la suscripción se hizo con otras claves, ya no sirve: se rehace
    if (sub && bytesABase64(sub.options.applicationServerKey) !== k) {
      await sub.unsubscribe().catch(() => {})
      sub = null
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(k) })
    await registrarEnServidor(sub)
    poner("activo")
  } catch (e) {
    console.error(e)
    poner("error", e instanceof Error ? e.message : String(e))
  }
  return estado
}

/** Con un toque del usuario (iOS lo exige): pide el permiso y activa. */
export async function activarPush(): Promise<EstadoPush> {
  if (esIOSSinInstalar()) return asegurarPush()
  if (!pushDisponible()) return asegurarPush()
  if (Notification.permission === "default") await Notification.requestPermission()
  return asegurarPush()
}

/** Deja de avisar a este teléfono (y lo saca del servidor). */
export async function desactivarPush() {
  if (!pushDisponible()) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  try {
    const mias = await pb.collection("push_subs").getFullList({ filter: pb.filter("endpoint = {:e}", { e: sub.endpoint }) })
    for (const s of mias) await pb.collection("push_subs").delete(s.id)
  } catch {
    /* sin señal: el servidor la borra solo cuando falle */
  }
  await sub.unsubscribe().catch(() => {})
  poner(Notification.permission === "granted" ? "pedir" : estado)
}

export interface ResultadoPrueba {
  id: string
  dispositivo: string
  status: number
  error: string
  ok: boolean
}

/** Manda un aviso de prueba a todos tus teléfonos y dice cómo le fue a cada uno. */
export async function probarPush() {
  return pb.send<{ enviados: number; ok: number; resultados: ResultadoPrueba[] }>("/api/epe/push/probar", { method: "POST" })
}

export interface TelefonoSuscripto {
  id: string
  endpoint: string
  dispositivo: string
  ultimo_ok: string
  ultimo_error: string
  fallos: number
  created: string
}

/** Tus teléfonos con avisos, con cómo le fue al último envío a cada uno. */
export async function misTelefonos(): Promise<TelefonoSuscripto[]> {
  return pb.collection("push_subs").getFullList<TelefonoSuscripto>({ sort: "-created" })
}

/** El endpoint de este teléfono, para marcarlo en la lista. */
export async function endpointDeEsteTelefono() {
  if (!pushDisponible()) return ""
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription())?.endpoint ?? ""
}
