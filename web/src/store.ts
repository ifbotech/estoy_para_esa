import { useSyncExternalStore } from "react"
import { pb } from "./pb"
import type { Categoria, Item, Lista, Plan, Usuario, Voto } from "./tipos"
import { avisar } from "./componentes/Avisos"

/**
 * Todo lo de la app vive acá, en memoria, y se mantiene al día con el tiempo
 * real de PocketBase: lo que carga uno le aparece al otro al instante.
 * Son dos personas y unos cientos de planes: se trae todo de una.
 */
export interface Estado {
  listo: boolean
  conectado: boolean
  usuarios: Usuario[]
  categorias: Categoria[]
  planes: Plan[]
  votos: Voto[]
  items: Item[]
}

const inicial: Estado = {
  listo: false,
  conectado: false,
  usuarios: [],
  categorias: [],
  planes: [],
  votos: [],
  items: [],
}

let estado = inicial
const oyentes = new Set<() => void>()

function set(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial }
  oyentes.forEach((o) => o())
}

export function getEstado() {
  return estado
}

/** Elegí una parte estable del estado (un arreglo entero, un booleano). */
export function useStore<T>(sel: (s: Estado) => T): T {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb)
      return () => oyentes.delete(cb)
    },
    () => sel(estado),
  )
}

// La colección `temas` sigue en la base para las versiones archivadas, pero
// la app actual tiene un diseño fijo y ya no la carga.
type Coleccion = "usuarios" | "categorias" | "planes" | "votos" | "items"
const NOMBRES: Record<Coleccion, string> = {
  usuarios: "users",
  categorias: "categorias",
  planes: "planes",
  votos: "votos",
  items: "items",
}
const ORDEN: Record<Coleccion, string> = {
  usuarios: "name",
  categorias: "orden",
  planes: "-created",
  votos: "created",
  items: "orden",
}

// --- cambios propios pendientes (UI optimista + debounce) -----------------
//
// Arrastrar las ganas o tildar varias cosas seguidas no manda una escritura
// por movimiento: el cambio se ve al toque y se manda junto, un ratito
// después. Mientras tanto, lo que llega del tiempo real (o de una recarga)
// para ese registro se mezcla con lo pendiente para que nada parpadee.

const pendientes = new Map<string, Record<string, unknown>>()
const relojes = new Map<string, number>()
const esperando = new Map<string, (() => void)[]>()
const DEMORA = 450

/** Junta cambios de un registro y los manda una sola vez. Resuelve cuando se mandaron. */
function encolar(clave: string, cambios: Record<string, unknown>, enviar: (todo: Record<string, unknown>) => Promise<void>): Promise<void> {
  pendientes.set(clave, { ...(pendientes.get(clave) ?? {}), ...cambios })
  clearTimeout(relojes.get(clave))
  return new Promise((listo) => {
    esperando.set(clave, [...(esperando.get(clave) ?? []), listo])
    relojes.set(
      clave,
      window.setTimeout(async () => {
        const todo = pendientes.get(clave) ?? {}
        const avisar = esperando.get(clave) ?? []
        esperando.delete(clave)
        relojes.delete(clave)
        try {
          await enviar(todo)
        } finally {
          // si mientras viajaba hubo cambios nuevos, quedan para el próximo envío
          const ahora = pendientes.get(clave)
          if (ahora && Object.keys(ahora).every((k) => ahora[k] === todo[k])) pendientes.delete(clave)
          avisar.forEach((f) => f())
        }
      }, DEMORA),
    )
  })
}

const claveDe = (c: Coleccion, rec: { id: string } & Partial<Voto>) =>
  c === "votos" ? `voto:${rec.plan}:${rec.usuario}` : `${c}:${rec.id}`

function conPendientes<T extends { id: string }>(c: Coleccion, rec: T): T {
  const p = pendientes.get(claveDe(c, rec as { id: string } & Partial<Voto>))
  return p ? { ...rec, ...p } : rec
}

/** Manda lo pendiente ya (al salir de la app, para no perder nada). */
export function vaciarPendientes() {
  for (const [clave, t] of [...relojes]) {
    clearTimeout(t)
    relojes.delete(clave)
    const todo = pendientes.get(clave)
    const avisar = esperando.get(clave) ?? []
    esperando.delete(clave)
    if (!todo) continue
    const [tipo, a, b] = clave.split(":")
    const envio = tipo === "voto" ? enviarVoto(a, b, todo) : pb.collection("items").update(a, todo).then(() => {})
    void envio.catch(() => {}).finally(() => {
      if (pendientes.get(clave) === todo) pendientes.delete(clave)
      avisar.forEach((f) => f())
    })
  }
}

function aplicar(clave: Coleccion, accion: string, rec: { id: string }, remoto = false) {
  let lista = estado[clave] as { id: string }[]
  if (remoto) rec = conPendientes(clave, rec)
  if (clave === "votos" && accion !== "delete") {
    // el voto local provisorio se reemplaza por el de verdad
    const v = rec as Voto
    lista = lista.filter((x) => !(x.id.startsWith("tmp-") && (x as Voto).plan === v.plan && (x as Voto).usuario === v.usuario) || x.id === v.id)
  }
  if (accion === "delete") {
    set({ [clave]: lista.filter((r) => r.id !== rec.id) } as Partial<Estado>)
    return
  }
  const i = lista.findIndex((r) => r.id === rec.id)
  const nueva = i >= 0 ? lista.map((r, j) => (j === i ? rec : r)) : clave === "planes" ? [rec, ...lista] : [...lista, rec]
  if (clave === "categorias") (nueva as Categoria[]).sort((a, b) => a.orden - b.orden)
  if (clave === "items") (nueva as Item[]).sort((a, b) => a.orden - b.orden)
  set({ [clave]: nueva } as Partial<Estado>)
}

async function traerTodo() {
  const claves = Object.keys(NOMBRES) as Coleccion[]
  const res = await Promise.all(
    claves.map((c) => pb.collection(NOMBRES[c]).getFullList({ sort: ORDEN[c], batch: 500 })),
  )
  const parcial: Partial<Estado> = {}
  claves.forEach((c, i) => {
    let lista = (res[i] as unknown as { id: string }[]).map((r) => conPendientes(c, r))
    // los votos provisorios (todavía viajando) no se pierden con la recarga
    if (c === "votos") {
      const tmp = estado.votos.filter((v) => v.id.startsWith("tmp-") && !lista.some((x) => (x as Voto).plan === v.plan && (x as Voto).usuario === v.usuario))
      lista = [...lista, ...tmp]
    }
    ;(parcial as Record<string, unknown>)[c] = lista
  })
  set({ ...parcial, listo: true })
}

let iniciado = false
let desuscribir: (() => Promise<void>)[] = []

export async function iniciar() {
  if (iniciado) return
  iniciado = true
  // Sin señal, los datos salen de la copia que guarda el service worker
  // (ver sw.ts): la app abre igual y se pone al día al reconectar.
  try {
    await traerTodo()
  } catch (e) {
    iniciado = false
    throw e
  }
  void suscribir()
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") traerTodo().catch(() => {})
    else vaciarPendientes()
  })
  addEventListener("pagehide", vaciarPendientes)
  addEventListener("online", () => {
    if (!desuscribir.length) void suscribir()
    traerTodo().catch(() => {})
  })
}

let suscribiendo = false
async function suscribir() {
  if (suscribiendo || desuscribir.length) return
  suscribiendo = true
  try {
    let primera = true
    desuscribir.push(
      await pb.realtime.subscribe("PB_CONNECT", () => {
        set({ conectado: true })
        // Al reconectar (el teléfono se durmió, cambió la red) puede haberse
        // perdido algún cambio: se vuelve a traer todo.
        if (!primera) traerTodo().catch(() => {})
        primera = false
      }),
    )
    for (const c of Object.keys(NOMBRES) as Coleccion[]) {
      desuscribir.push(await pb.collection(NOMBRES[c]).subscribe("*", (e) => aplicar(c, e.action, e.record, true)))
    }
    pb.realtime.onDisconnect = () => set({ conectado: false })
  } catch {
    // sin señal: se reintenta con el evento «online»
    for (const d of desuscribir) await d().catch(() => {})
    desuscribir = []
    set({ conectado: false })
  } finally {
    suscribiendo = false
  }
}

export async function terminar() {
  for (const d of desuscribir) await d().catch(() => {})
  desuscribir = []
  iniciado = false
  estado = inicial
  pb.authStore.clear()
  oyentes.forEach((o) => o())
}

// --- quién soy -------------------------------------------------------------

export function yo(): Usuario | null {
  return (pb.authStore.record as unknown as Usuario) ?? null
}

export function useYo(): Usuario | null {
  const usuarios = useStore((s) => s.usuarios)
  const id = pb.authStore.record?.id
  return usuarios.find((u) => u.id === id) ?? yo()
}

// --- cambios ---------------------------------------------------------------

async function intentar<T>(f: () => Promise<T>, error = "No se pudo guardar"): Promise<T | undefined> {
  try {
    return await f()
  } catch (e) {
    console.error(e)
    avisar(`${error} 😵`, "error")
    return undefined
  }
}

export async function crearPlan(datos: Partial<Plan> | FormData) {
  const rec = await intentar(() => pb.collection("planes").create<Plan>(datos))
  if (rec) aplicar("planes", "create", rec)
  return rec
}

/**
 * Edita un plan. Los cambios simples (estado, título, datos…) se ven al
 * instante y, si el servidor los rechaza, se vuelve atrás. Los archivos
 * (FormData) y los «fotos-» esperan la respuesta.
 */
export async function editarPlan(id: string, datos: Partial<Plan> | FormData | Record<string, unknown>) {
  const antes = estado.planes.find((p) => p.id === id)
  const simple = !(datos instanceof FormData) && Object.keys(datos).every((k) => !/[+-]$/.test(k))
  if (antes && simple) aplicar("planes", "update", { ...antes, ...(datos as Partial<Plan>) })
  const rec = await intentar(() => pb.collection("planes").update<Plan>(id, datos))
  if (rec) aplicar("planes", "update", rec)
  else if (antes && simple) aplicar("planes", "update", antes)
  return rec
}

export async function editarDatos(plan: Plan, cambios: Partial<NonNullable<Plan["datos"]>>) {
  return editarPlan(plan.id, { datos: { ...(plan.datos ?? {}), ...cambios } })
}

export async function borrarPlan(id: string) {
  await intentar(() => pb.collection("planes").delete(id), "No se pudo borrar")
  aplicar("planes", "delete", { id })
}

/**
 * Crea o actualiza el voto propio de un plan. Se ve al instante y se manda
 * un ratito después, todo junto.
 */
export function votar(planId: string, cambios: Partial<Pick<Voto, "ganas" | "puntaje" | "resena">>) {
  const uid = pb.authStore.record?.id
  if (!uid) return Promise.resolve()
  const actual = estado.votos.find((v) => v.plan === planId && v.usuario === uid)
  aplicar(
    "votos",
    actual ? "update" : "create",
    actual
      ? { ...actual, ...cambios }
      : ({ id: `tmp-${planId}`, plan: planId, usuario: uid, ganas: 50, puntaje: 0, resena: "", created: new Date().toISOString(), updated: "", collectionId: "", collectionName: "votos", ...cambios } as Voto),
  )
  return encolar(`voto:${planId}:${uid}`, cambios, (todo) => enviarVoto(planId, uid, todo))
}

const creandoVoto = new Map<string, Promise<Voto | undefined>>()

async function enviarVoto(planId: string, uid: string, cambios: Record<string, unknown>) {
  const clave = `${planId}:${uid}`
  await creandoVoto.get(clave)
  const real = estado.votos.find((v) => v.plan === planId && v.usuario === uid && !v.id.startsWith("tmp-"))
  if (real) {
    const rec = await intentar(() => pb.collection("votos").update<Voto>(real.id, cambios))
    if (rec) aplicar("votos", "update", { ...rec, ...(pendientes.get(`voto:${clave}`) ?? {}) })
    return
  }
  const creacion = intentar(() => pb.collection("votos").create<Voto>({ plan: planId, usuario: uid, ganas: 50, ...cambios }))
  creandoVoto.set(clave, creacion)
  const rec = await creacion
  creandoVoto.delete(clave)
  if (rec) aplicar("votos", "create", rec)
  else aplicar("votos", "delete", { id: `tmp-${planId}` })
}

export async function crearItem(planId: string, lista: Lista, texto: string, extra: Partial<Item> = {}) {
  const orden = Math.max(0, ...estado.items.filter((i) => i.plan === planId && i.lista === lista).map((i) => i.orden)) + 1
  const rec = await intentar(() =>
    pb.collection("items").create<Item>({ plan: planId, lista, texto, orden, hecho: false, ...extra }),
  )
  if (rec) aplicar("items", "create", rec)
}

/** Tildar, marcar «repetir»…: se ve al instante y se manda junto. */
export function editarItem(id: string, cambios: Partial<Item>) {
  const actual = estado.items.find((i) => i.id === id)
  if (actual) aplicar("items", "update", { ...actual, ...cambios })
  return encolar(`items:${id}`, cambios, async (todo) => {
    await intentar(() => pb.collection("items").update<Item>(id, todo))
  })
}

export async function borrarItem(id: string) {
  aplicar("items", "delete", { id })
  await intentar(() => pb.collection("items").delete(id), "No se pudo borrar")
}

export async function guardarCategoria(cat: Partial<Categoria> & { id?: string }) {
  const { id, ...datos } = cat
  const rec = await intentar(() =>
    id ? pb.collection("categorias").update<Categoria>(id, datos) : pb.collection("categorias").create<Categoria>(datos),
  )
  if (rec) aplicar("categorias", id ? "update" : "create", rec)
  return rec
}

export async function borrarCategoria(id: string) {
  const ok = await intentar(() => pb.collection("categorias").delete(id), "No se pudo borrar (¿tiene planes?)")
  if (ok !== undefined) aplicar("categorias", "delete", { id })
}

export async function editarPerfil(cambios: Partial<Usuario>) {
  const uid = pb.authStore.record?.id
  if (!uid) return
  const rec = await intentar(() => pb.collection("users").update<Usuario>(uid, cambios))
  if (rec) aplicar("usuarios", "update", rec)
}
