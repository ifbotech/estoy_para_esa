import type { Categoria, Item, Plan, Voto } from "./tipos"

// --- ganas y ranking -------------------------------------------------------

/** El promedio de ganas de un plan entre los que ya votaron, o null. */
export function promedioGanas(planId: string, votos: Voto[]): number | null {
  const vs = votos.filter((v) => v.plan === planId)
  if (!vs.length) return null
  return vs.reduce((a, v) => a + v.ganas, 0) / vs.length
}

export interface Rankeado {
  plan: Plan
  promedio: number | null
  votos: Voto[]
}

/**
 * Ordena por promedio de ganas: arriba lo que más ganas les da a los dos.
 * Los planes sin votos van al final, los más nuevos primero.
 */
export function rankear(planes: Plan[], votos: Voto[]): Rankeado[] {
  const porPlan = new Map<string, Voto[]>()
  for (const v of votos) {
    const l = porPlan.get(v.plan)
    if (l) l.push(v)
    else porPlan.set(v.plan, [v])
  }
  return planes
    .map((plan) => {
      const vs = porPlan.get(plan.id) ?? []
      const promedio = vs.length ? vs.reduce((a, v) => a + v.ganas, 0) / vs.length : null
      return { plan, promedio, votos: vs }
    })
    .sort((a, b) => {
      if (a.promedio === null && b.promedio === null) return b.plan.created.localeCompare(a.plan.created)
      if (a.promedio === null) return 1
      if (b.promedio === null) return -1
      if (b.promedio !== a.promedio) return b.promedio - a.promedio
      return b.plan.created.localeCompare(a.plan.created)
    })
}

/**
 * Sorpréndanme: elige un plan pendiente al azar, con más chances para los que
 * tienen más ganas. `azar` es inyectable para los tests.
 */
export function sortear(ranking: Rankeado[], azar = Math.random): Rankeado | null {
  const candidatos = ranking.filter((r) => r.plan.estado !== "hecho")
  if (!candidatos.length) return null
  const pesos = candidatos.map((r) => 1 + Math.pow((r.promedio ?? 40) / 10, 2))
  const total = pesos.reduce((a, b) => a + b, 0)
  let x = azar() * total
  for (let i = 0; i < candidatos.length; i++) {
    x -= pesos[i]
    if (x <= 0) return candidatos[i]
  }
  return candidatos[candidatos.length - 1]
}

// --- fechas ----------------------------------------------------------------

export function fecha(s: string): Date | null {
  if (!s) return null
  const d = new Date(s.replace(" ", "T"))
  return isNaN(d.getTime()) ? null : d
}

/** Lunes de la semana de `d`, a las 00:00 (hora local). */
export function inicioSemana(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dia = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dia)
  return x
}

const SEMANA = 7 * 24 * 3600 * 1000

/**
 * La racha: semanas seguidas con al menos un plan hecho. Cuenta hasta esta
 * semana, o hasta la anterior si esta todavía no hicieron nada (no se corta
 * un lunes a la mañana).
 */
export function racha(planes: Plan[], hoy = new Date()): number {
  const semanas = new Set<number>()
  for (const p of planes) {
    const d = fecha(p.hecho_en)
    if (p.estado === "hecho" && d) semanas.add(inicioSemana(d).getTime())
  }
  let s = inicioSemana(hoy).getTime()
  if (!semanas.has(s)) s -= SEMANA
  let n = 0
  while (semanas.has(s)) {
    n++
    s = inicioSemana(new Date(s - SEMANA / 2)).getTime()
  }
  return n
}

/** La racha más larga de semanas seguidas dentro de un conjunto de fechas. */
export function rachaMaxima(fechas: Date[]): number {
  const semanas = [...new Set(fechas.map((d) => inicioSemana(d).getTime()))].sort((a, b) => a - b)
  let mejor = 0
  let actual = 0
  let previa = -Infinity
  for (const s of semanas) {
    // 6 a 8 días de diferencia: semana siguiente (los cambios de horario
    // corren el lunes una hora).
    actual = s - previa < SEMANA + 2 * 3600 * 1000 ? actual + 1 : 1
    mejor = Math.max(mejor, actual)
    previa = s
  }
  return mejor
}

// --- el Wrapped ------------------------------------------------------------

export interface Resumen {
  anio: number
  hechos: Plan[]
  total: number
  porCategoria: { categoria: Categoria; cantidad: number; pct: number }[]
  porMes: number[]
  mesTop: number
  pelis: { cantidad: number; promedio: number | null; mejor: Plan | null; posters: string[] }
  viajes: { cantidad: number; exterior: number; pctExterior: number; paises: string[]; dias: number }
  lugares: { cantidad: number; cafes: number; comidas: number; barrios: { barrio: string; cantidad: number }[] }
  taller: { cantidad: number; pasos: number }
  masGanas: { plan: Plan; promedio: number } | null
  desacuerdo: { plan: Plan; diferencia: number; votos: Voto[] } | null
  ganasPorPersona: { usuario: string; promedio: number }[]
  masRapido: { plan: Plan; dias: number } | null
  masEspera: { plan: Plan; dias: number } | null
  rachaMaxima: number
  ideasNuevas: number
  fotos: number
}

const DIA = 24 * 3600 * 1000

export function resumenAnual(
  anio: number,
  planes: Plan[],
  votos: Voto[],
  categorias: Categoria[],
  items: Item[],
): Resumen {
  const hechos = planes
    .filter((p) => p.estado === "hecho" && fecha(p.hecho_en)?.getFullYear() === anio)
    .sort((a, b) => a.hecho_en.localeCompare(b.hecho_en))
  const total = hechos.length
  const cat = (p: Plan) => categorias.find((c) => c.id === p.categoria)
  const pers = (p: Plan) => cat(p)?.personalidad

  const conteo = new Map<string, number>()
  for (const p of hechos) conteo.set(p.categoria, (conteo.get(p.categoria) ?? 0) + 1)
  const porCategoria = categorias
    .map((c) => ({ categoria: c, cantidad: conteo.get(c.id) ?? 0, pct: total ? ((conteo.get(c.id) ?? 0) / total) * 100 : 0 }))
    .filter((x) => x.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad)

  const porMes = Array.from({ length: 12 }, () => 0)
  for (const p of hechos) porMes[fecha(p.hecho_en)!.getMonth()]++
  const mesTop = porMes.indexOf(Math.max(...porMes))

  const votosDe = (id: string) => votos.filter((v) => v.plan === id)
  const puntajeProm = (id: string) => {
    const vs = votosDe(id).filter((v) => v.puntaje > 0)
    return vs.length ? vs.reduce((a, v) => a + v.puntaje, 0) / vs.length : null
  }

  const pelisHechas = hechos.filter((p) => pers(p) === "cine")
  const puntajesPelis = pelisHechas.map((p) => ({ p, s: puntajeProm(p.id) })).filter((x) => x.s !== null) as { p: Plan; s: number }[]
  const pelis = {
    cantidad: pelisHechas.length,
    promedio: puntajesPelis.length ? puntajesPelis.reduce((a, x) => a + x.s, 0) / puntajesPelis.length : null,
    mejor: puntajesPelis.sort((a, b) => b.s - a.s)[0]?.p ?? null,
    posters: pelisHechas.map((p) => p.datos?.poster || p.datos?.imagen || "").filter(Boolean).slice(0, 12),
  }

  const viajesHechos = hechos.filter((p) => pers(p) === "viaje")
  const exterior = viajesHechos.filter((p) => p.datos?.exterior).length
  let diasViaje = 0
  for (const p of viajesHechos) {
    const d = fecha(p.datos?.desde ?? "")
    const h = fecha(p.datos?.hasta ?? "")
    if (d && h && h >= d) diasViaje += Math.round((h.getTime() - d.getTime()) / DIA) + 1
  }
  const viajes = {
    cantidad: viajesHechos.length,
    exterior,
    pctExterior: viajesHechos.length ? (exterior / viajesHechos.length) * 100 : 0,
    paises: [...new Set(viajesHechos.map((p) => (p.datos?.pais ?? "").trim()).filter(Boolean))],
    dias: diasViaje,
  }

  const lugaresHechos = hechos.filter((p) => ["cocina", "cafe", "salida"].includes(pers(p) ?? ""))
  const barrios = new Map<string, number>()
  for (const p of lugaresHechos) {
    const b = (p.datos?.barrio ?? "").trim()
    if (b) barrios.set(b, (barrios.get(b) ?? 0) + 1)
  }
  const lugares = {
    cantidad: lugaresHechos.length,
    cafes: lugaresHechos.filter((p) => pers(p) === "cafe").length,
    comidas: lugaresHechos.filter((p) => pers(p) === "cocina").length,
    barrios: [...barrios].map(([barrio, cantidad]) => ({ barrio, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
  }

  const tallerHechos = hechos.filter((p) => pers(p) === "taller")
  const ids = new Set(tallerHechos.map((p) => p.id))
  const taller = {
    cantidad: tallerHechos.length,
    pasos: items.filter((i) => ids.has(i.plan) && i.lista === "pasos" && i.hecho).length,
  }

  let masGanas: Resumen["masGanas"] = null
  let desacuerdo: Resumen["desacuerdo"] = null
  for (const p of hechos) {
    const vs = votosDe(p.id)
    if (!vs.length) continue
    const prom = vs.reduce((a, v) => a + v.ganas, 0) / vs.length
    if (!masGanas || prom > masGanas.promedio) masGanas = { plan: p, promedio: prom }
    if (vs.length >= 2) {
      const dif = Math.max(...vs.map((v) => v.ganas)) - Math.min(...vs.map((v) => v.ganas))
      if (!desacuerdo || dif > desacuerdo.diferencia) desacuerdo = { plan: p, diferencia: dif, votos: vs }
    }
  }

  const delAnio = planes.filter((p) => fecha(p.created)?.getFullYear() === anio)
  const idsAnio = new Set([...delAnio, ...hechos].map((p) => p.id))
  const porPersona = new Map<string, number[]>()
  for (const v of votos) {
    if (!idsAnio.has(v.plan)) continue
    const l = porPersona.get(v.usuario) ?? []
    l.push(v.ganas)
    porPersona.set(v.usuario, l)
  }
  const ganasPorPersona = [...porPersona].map(([usuario, l]) => ({
    usuario,
    promedio: l.reduce((a, b) => a + b, 0) / l.length,
  }))

  let masRapido: Resumen["masRapido"] = null
  let masEspera: Resumen["masEspera"] = null
  for (const p of hechos) {
    const c = fecha(p.created)
    const h = fecha(p.hecho_en)
    if (!c || !h) continue
    const dias = Math.max(0, Math.round((h.getTime() - c.getTime()) / DIA))
    if (!masRapido || dias < masRapido.dias) masRapido = { plan: p, dias }
    if (!masEspera || dias > masEspera.dias) masEspera = { plan: p, dias }
  }

  return {
    anio,
    hechos,
    total,
    porCategoria,
    porMes,
    mesTop,
    pelis,
    viajes,
    lugares,
    taller,
    masGanas,
    desacuerdo,
    ganasPorPersona,
    masRapido,
    masEspera,
    rachaMaxima: rachaMaxima(hechos.map((p) => fecha(p.hecho_en)!)),
    ideasNuevas: delAnio.length,
    fotos: hechos.reduce((a, p) => a + (p.fotos?.length ?? 0), 0),
  }
}

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
