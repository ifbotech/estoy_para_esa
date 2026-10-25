import { useSyncExternalStore } from "react"
import { pb } from "./pb"
import type { Categoria, Item, Lista, Plan, Tema, Tokens, Usuario, Voto } from "./tipos"
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
  temas: Tema[]
}

const inicial: Estado = {
  listo: false,
  conectado: false,
  usuarios: [],
  categorias: [],
  planes: [],
  votos: [],
  items: [],
  temas: [],
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

type Coleccion = "usuarios" | "categorias" | "planes" | "votos" | "items" | "temas"
const NOMBRES: Record<Coleccion, string> = {
  usuarios: "users",
  categorias: "categorias",
  planes: "planes",
  votos: "votos",
  items: "items",
  temas: "temas",
}
const ORDEN: Record<Coleccion, string> = {
  usuarios: "name",
  categorias: "orden",
  planes: "-created",
  votos: "created",
  items: "orden",
  temas: "-version",
}

function aplicar(clave: Coleccion, accion: string, rec: { id: string }) {
  const lista = estado[clave] as { id: string }[]
  if (accion === "delete") {
    set({ [clave]: lista.filter((r) => r.id !== rec.id) } as Partial<Estado>)
    return
  }
  const i = lista.findIndex((r) => r.id === rec.id)
  const nueva = i >= 0 ? lista.map((r, j) => (j === i ? rec : r)) : clave === "planes" ? [rec, ...lista] : [...lista, rec]
  if (clave === "categorias") (nueva as Categoria[]).sort((a, b) => a.orden - b.orden)
  if (clave === "items") (nueva as Item[]).sort((a, b) => a.orden - b.orden)
  if (clave === "temas") (nueva as Tema[]).sort((a, b) => b.version - a.version)
  set({ [clave]: nueva } as Partial<Estado>)
}

async function traerTodo() {
  const claves = Object.keys(NOMBRES) as Coleccion[]
  const res = await Promise.all(
    claves.map((c) => pb.collection(NOMBRES[c]).getFullList({ sort: ORDEN[c], batch: 500 })),
  )
  const parcial: Partial<Estado> = {}
  claves.forEach((c, i) => ((parcial as Record<string, unknown>)[c] = res[i]))
  set({ ...parcial, listo: true })
}

let iniciado = false
let desuscribir: (() => Promise<void>)[] = []

export async function iniciar() {
  if (iniciado) return
  iniciado = true
  await traerTodo()
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
    desuscribir.push(await pb.collection(NOMBRES[c]).subscribe("*", (e) => aplicar(c, e.action, e.record)))
  }
  pb.realtime.onDisconnect = () => set({ conectado: false })
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") traerTodo().catch(() => {})
  })
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

export async function editarPlan(id: string, datos: Partial<Plan> | FormData | Record<string, unknown>) {
  const rec = await intentar(() => pb.collection("planes").update<Plan>(id, datos))
  if (rec) aplicar("planes", "update", rec)
  return rec
}

export async function editarDatos(plan: Plan, cambios: Partial<NonNullable<Plan["datos"]>>) {
  return editarPlan(plan.id, { datos: { ...(plan.datos ?? {}), ...cambios } })
}

export async function borrarPlan(id: string) {
  await intentar(() => pb.collection("planes").delete(id), "No se pudo borrar")
  aplicar("planes", "delete", { id })
}

/** Crea o actualiza el voto propio de un plan. */
export async function votar(planId: string, cambios: Partial<Pick<Voto, "ganas" | "puntaje" | "resena">>) {
  const uid = pb.authStore.record?.id
  if (!uid) return
  const actual = estado.votos.find((v) => v.plan === planId && v.usuario === uid)
  if (actual) {
    aplicar("votos", "update", { ...actual, ...cambios })
    const rec = await intentar(() => pb.collection("votos").update<Voto>(actual.id, cambios))
    if (rec) aplicar("votos", "update", rec)
  } else {
    const rec = await intentar(() =>
      pb.collection("votos").create<Voto>({ plan: planId, usuario: uid, ganas: 50, ...cambios }),
    )
    if (rec) aplicar("votos", "create", rec)
  }
}

export async function crearItem(planId: string, lista: Lista, texto: string, extra: Partial<Item> = {}) {
  const orden = Math.max(0, ...estado.items.filter((i) => i.plan === planId && i.lista === lista).map((i) => i.orden)) + 1
  const rec = await intentar(() =>
    pb.collection("items").create<Item>({ plan: planId, lista, texto, orden, hecho: false, ...extra }),
  )
  if (rec) aplicar("items", "create", rec)
}

export async function editarItem(id: string, cambios: Partial<Item>) {
  const actual = estado.items.find((i) => i.id === id)
  if (actual) aplicar("items", "update", { ...actual, ...cambios })
  const rec = await intentar(() => pb.collection("items").update<Item>(id, cambios))
  if (rec) aplicar("items", "update", rec)
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

export async function guardarTema(nombre: string, tokens: Tokens, nota = "") {
  const rec = await intentar(() =>
    pb.collection("temas").create<Tema>({ nombre, tokens, nota, activo: true, creado_por: pb.authStore.record?.id }),
  )
  if (rec) {
    set({ temas: estado.temas.map((t) => ({ ...t, activo: false })) })
    aplicar("temas", "create", rec)
  }
  return rec
}

export async function activarTema(id: string) {
  set({ temas: estado.temas.map((t) => ({ ...t, activo: t.id === id })) })
  await intentar(() => pb.collection("temas").update(id, { activo: true }))
}

export async function editarPerfil(cambios: Partial<Usuario>) {
  const uid = pb.authStore.record?.id
  if (!uid) return
  const rec = await intentar(() => pb.collection("users").update<Usuario>(uid, cambios))
  if (rec) aplicar("usuarios", "update", rec)
}
