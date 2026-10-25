import { pb } from "../pb"

function claveABytes(base64: string) {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4)
  const b = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

export function pushDisponible() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

/** En iPhone los avisos sólo andan con la app agregada a la pantalla de inicio. */
export function esIOSSinInstalar() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const instalada = matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone
  return ios && !instalada
}

export async function suscripcionActual() {
  if (!pushDisponible()) return null
  const reg = await navigator.serviceWorker.getRegistration()
  return (await reg?.pushManager.getSubscription()) ?? null
}

export async function activarPush(): Promise<"ok" | "denegado" | "no-disponible" | "error"> {
  if (!pushDisponible()) return "no-disponible"
  const permiso = await Notification.requestPermission()
  if (permiso !== "granted") return "denegado"
  try {
    const { clave } = await pb.send<{ clave: string }>("/api/epe/push/clave", {})
    const reg = await navigator.serviceWorker.ready
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clave) }))
    const json = sub.toJSON()
    const existentes = await pb.collection("push_subs").getFullList({ filter: pb.filter("endpoint = {:e}", { e: json.endpoint }) })
    if (!existentes.length) {
      await pb.collection("push_subs").create({
        usuario: pb.authStore.record?.id,
        endpoint: json.endpoint,
        suscripcion: json,
        dispositivo: navigator.userAgent.slice(0, 190),
      })
    }
    return "ok"
  } catch (e) {
    console.error(e)
    return "error"
  }
}

export async function desactivarPush() {
  const sub = await suscripcionActual()
  if (!sub) return
  const existentes = await pb.collection("push_subs").getFullList({ filter: pb.filter("endpoint = {:e}", { e: sub.endpoint }) })
  for (const s of existentes) await pb.collection("push_subs").delete(s.id)
  await sub.unsubscribe()
}

export async function probarPush() {
  return pb.send<{ enviados: number }>("/api/epe/push/probar", { method: "POST" })
}
