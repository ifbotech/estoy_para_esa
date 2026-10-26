import type { Categoria, Estado, Item, Personalidad, Plan, Usuario, Voto } from "./tipos"

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

// --- simetría de ganas y voto a ciegas -------------------------------------

/**
 * El promedio esconde si los dos tienen 60 y 60 o 100 y 20. La simetría lo
 * dice en una palabra. Se calcula sólo cuando votaron los dos.
 */
export type Simetria = "match" | "consenso" | "por_amor"

export const SIMETRIAS: Record<Simetria, { etiqueta: string; emoji: string; texto: string }> = {
  match: { etiqueta: "Match", emoji: "🔥", texto: "Los dos tienen muchas ganas" },
  consenso: { etiqueta: "Consenso", emoji: "🤝", texto: "Piensan parecido" },
  por_amor: { etiqueta: "Con amor", emoji: "🎁", texto: "Uno se muere de ganas y el otro acompaña por amor al arte" },
}

export const UMBRAL_MATCH = 80
export const UMBRAL_MATCH_TOTAL = 85

export function simetria(votos: Voto[]): Simetria | null {
  if (votos.length < 2) return null
  const [a, b] = votos.map((v) => v.ganas)
  if (a >= UMBRAL_MATCH && b >= UMBRAL_MATCH) return "match"
  const dif = Math.abs(a - b)
  if (dif >= 45) return "por_amor"
  if (dif <= 20) return "consenso"
  return null
}

/** ¡Match total! Los dos votaron y los dos están en 85 o más. */
export function esMatchTotal(votos: Voto[]): boolean {
  return votos.length >= 2 && votos.every((v) => v.ganas >= UMBRAL_MATCH_TOTAL)
}

/**
 * Voto a ciegas: si el otro ya votó y yo todavía no, no veo sus ganas hasta
 * votar (así no me ancla su número).
 */
export function aCiegas(votos: Voto[], yo: string | undefined): boolean {
  if (!yo) return false
  return !votos.some((v) => v.usuario === yo) && votos.some((v) => v.usuario !== yo)
}

// --- sorpréndanme ----------------------------------------------------------

export type FiltroSorteo = "todo" | "casa" | "salir" | "rapido"

export const FILTROS_SORTEO: Record<FiltroSorteo, { nombre: string; personalidades: Personalidad[] | null }> = {
  todo: { nombre: "Todo", personalidades: null },
  casa: { nombre: "En casa", personalidades: ["cine", "taller"] },
  salir: { nombre: "Salir", personalidades: ["cocina", "cafe", "salida", "viaje"] },
  rapido: { nombre: "Rápido", personalidades: ["cine", "cafe", "cocina", "salida"] },
}

/** Los candidatos del sorteo: pendientes (no hechos) que entran en el filtro. */
export function candidatosSorteo(ranking: Rankeado[], filtro: FiltroSorteo, categorias: Categoria[]): Rankeado[] {
  const ps = FILTROS_SORTEO[filtro].personalidades
  return ranking.filter((r) => {
    if (r.plan.estado === "hecho") return false
    if (!ps) return true
    const p = categorias.find((c) => c.id === r.plan.categoria)?.personalidad
    return p ? ps.includes(p) : false
  })
}

/**
 * Elige un plan pendiente al azar, con más chances para los que tienen más
 * ganas. `azar` es inyectable para los tests.
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

/**
 * Las demoras entre cuadro y cuadro del rodillo: arranca rápido y frena de a
 * poco hasta sumar `total` ms (unos 1,4 s).
 */
export function demorasRodillo(pasos = 16, total = 1400): number[] {
  const crudas = Array.from({ length: pasos }, (_, i) => 1 + Math.pow(i / (pasos - 1), 2.4) * 9)
  const suma = crudas.reduce((a, b) => a + b, 0)
  return crudas.map((c) => Math.round((c / suma) * total))
}

// --- el sello de un recuerdo (cierre) --------------------------------------

export interface PasoSello {
  id: string
  etiqueta: string
  ok: boolean
}

/**
 * Un plan hecho queda «100 % sellado» con el puntaje de cada uno, una foto y
 * una nota o reseña. Lo que falta se muestra para que den ganas de cerrarlo.
 */
export function sellado(plan: Plan, votos: Voto[], usuarios: Usuario[]) {
  const vs = votos.filter((v) => v.plan === plan.id)
  const pasos: PasoSello[] = [
    ...usuarios.map((u) => ({
      id: `puntaje-${u.id}`,
      etiqueta: `Puntaje ${u.name}`,
      ok: vs.some((v) => v.usuario === u.id && v.puntaje > 0),
    })),
    { id: "foto", etiqueta: "Foto", ok: (plan.fotos?.length ?? 0) > 0 },
    { id: "nota", etiqueta: "Nota o reseña", ok: Boolean(plan.notas?.trim()) || vs.some((v) => v.resena?.trim()) },
  ]
  const hechos = pasos.filter((p) => p.ok).length
  return { pasos, hechos, total: pasos.length, completo: hechos === pasos.length }
}

// --- la acción principal de un plan (la barra fija de abajo) ----------------

export type AccionPrincipal =
  | { tipo: "votar"; texto: string; sub: string }
  | { tipo: "estado"; texto: string; sub: string; estado: Estado }
  | { tipo: "item"; texto: string; sub: string; itemId: string }
  | { tipo: "puntuar" | "foto" | "resena" | "fotos"; texto: string; sub: string }

/**
 * Lo único que conviene hacer ahora con un plan, según su estado y su
 * personalidad: votar, agendar, armar la valija, tachar el próximo paso,
 * marcarlo hecho o completar el recuerdo. Un solo botón, siempre a mano.
 */
export function accionPrincipal(
  plan: Plan,
  personalidad: Personalidad | undefined,
  votos: Voto[],
  items: Item[],
  usuarios: Usuario[],
  yo: string | undefined,
): AccionPrincipal {
  const vs = votos.filter((v) => v.plan === plan.id)
  const mio = vs.find((v) => v.usuario === yo)
  const lista = (l: Item["lista"]) => items.filter((i) => i.plan === plan.id && i.lista === l).sort((a, b) => a.dia - b.dia || a.orden - b.orden)
  const proximo = (l: Item["lista"]) => {
    const ls = lista(l)
    const i = ls.find((x) => !x.hecho)
    return i ? { item: i, hechos: ls.filter((x) => x.hecho).length, total: ls.length } : null
  }

  if (plan.estado === "idea") {
    if (!mio) return { tipo: "votar", texto: "Votá tus ganas", sub: "a ciegas: el otro no te condiciona" }
    return { tipo: "estado", texto: "📅 Agendar", sub: "pasa a Agendado", estado: "agendado" }
  }

  if (plan.estado === "agendado") {
    if (personalidad === "viaje") {
      const v = proximo("valija")
      if (v) return { tipo: "item", texto: `✓ ${v.item.texto}`, sub: `a la valija · ${v.hechos}/${v.total}`, itemId: v.item.id }
      return { tipo: "estado", texto: "▶ ¡Nos vamos!", sub: "pasa a En curso", estado: "en_curso" }
    }
    if (personalidad === "taller") {
      const m = proximo("materiales")
      if (m) return { tipo: "item", texto: `✓ ${m.item.texto}`, sub: `materiales · ${m.hechos}/${m.total}`, itemId: m.item.id }
      return { tipo: "estado", texto: "▶ Arrancar", sub: "pasa a En curso", estado: "en_curso" }
    }
    return { tipo: "estado", texto: "✓ ¡Lo hicimos!", sub: "pasa a Hecho", estado: "hecho" }
  }

  if (plan.estado === "en_curso") {
    const l = personalidad === "taller" ? "pasos" : personalidad === "viaje" ? "itinerario" : null
    const p = l ? proximo(l) : null
    if (p) {
      const dia = l === "itinerario" ? `Día ${p.item.dia || 1} · ` : ""
      return { tipo: "item", texto: `✓ ${p.item.texto}`, sub: `${dia}${l === "pasos" ? "paso" : "hito"} ${p.hechos + 1} de ${p.total}`, itemId: p.item.id }
    }
    return { tipo: "estado", texto: personalidad === "viaje" ? "✓ ¡Volvimos!" : personalidad === "taller" ? "✓ ¡Terminado!" : "✓ ¡Lo hicimos!", sub: "pasa a Hecho", estado: "hecho" }
  }

  // hecho: completar el recuerdo
  const s = sellado(plan, votos, usuarios)
  const falta = (id: string) => s.pasos.some((p) => p.id === id && !p.ok)
  if (yo && falta(`puntaje-${yo}`)) return { tipo: "puntuar", texto: "★ Puntuar", sub: `falta tu puntaje · ${s.hechos}/${s.total} sellado` }
  if (falta("foto")) return { tipo: "foto", texto: "📷 Subir el recuerdo", sub: `falta la foto · ${s.hechos}/${s.total} sellado` }
  if (falta("nota")) return { tipo: "resena", texto: "✎ Escribir la reseña", sub: `falta la nota · ${s.hechos}/${s.total} sellado` }
  if (!s.completo) {
    const otro = usuarios.find((u) => u.id !== yo && falta(`puntaje-${u.id}`))
    return { tipo: "fotos", texto: "📷 Sumar fotos", sub: `falta el puntaje de ${otro?.name ?? "el otro"}` }
  }
  return { tipo: "fotos", texto: "📷 Sumar fotos", sub: "✦ recuerdo 100 % sellado" }
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
 * Ritmo compartido: lo que ya hicieron juntos, sin castigar las semanas
 * tranquilas. Nada de «perder la racha»: sólo lo conseguido.
 */
export function momentum(planes: Plan[], hoy = new Date()) {
  const fechas = planes.filter((p) => p.estado === "hecho").map((p) => fecha(p.hecho_en)).filter((d): d is Date => Boolean(d))
  const porMes = new Map<string, { anio: number; mes: number; cantidad: number }>()
  for (const d of fechas) {
    const k = `${d.getFullYear()}-${d.getMonth()}`
    const m = porMes.get(k) ?? { anio: d.getFullYear(), mes: d.getMonth(), cantidad: 0 }
    m.cantidad++
    porMes.set(k, m)
  }
  let mesRecord: { anio: number; mes: number; cantidad: number } | null = null
  for (const m of porMes.values()) {
    if (!mesRecord || m.cantidad > mesRecord.cantidad || (m.cantidad === mesRecord.cantidad && m.anio * 12 + m.mes > mesRecord.anio * 12 + mesRecord.mes)) mesRecord = m
  }
  return {
    total: fechas.length,
    esteMes: porMes.get(`${hoy.getFullYear()}-${hoy.getMonth()}`)?.cantidad ?? 0,
    esteAnio: fechas.filter((d) => d.getFullYear() === hoy.getFullYear()).length,
    mesRecord,
    rachaMaxima: rachaMaxima(fechas),
  }
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

// --- curaduría de pareja ---------------------------------------------------

/** Barrios donde comieron, tomaron algo o salieron, del más visitado al menos. */
export function barriosConquistados(lugares: Plan[]): { barrio: string; cantidad: number }[] {
  const barrios = new Map<string, { barrio: string; cantidad: number }>()
  for (const p of lugares) {
    if (p.estado !== "hecho") continue
    const b = (p.datos?.barrio ?? "").trim()
    if (!b) continue
    const k = b.toLowerCase()
    const x = barrios.get(k) ?? { barrio: b, cantidad: 0 }
    x.cantidad++
    barrios.set(k, x)
  }
  return [...barrios.values()].sort((a, b) => b.cantidad - a.cantidad || a.barrio.localeCompare(b.barrio))
}

export interface Curaduria {
  /** Promedio de estrellas de cada uno, sólo en pelis que puntuó. */
  porPersona: { usuario: string; promedio: number; cantidad: number }[]
  /** Quién puntúa más bajo (si la diferencia es de al menos media estrella). */
  masDuro: { usuario: string; diferencia: number } | null
  /** Coincidencia crítica: 100 = puntúan igual; 0 = 5 estrellas de distancia. */
  coincidencia: number | null
  mayorAcuerdo: { plan: Plan; puntajes: number[] } | null
  mayorDesacuerdo: { plan: Plan; puntajes: number[]; diferencia: number } | null
  /** Su promedio contra el de Letterboxd en las pelis que tienen los dos. */
  vsLetterboxd: { nuestro: number; letterboxd: number; diferencia: number; cantidad: number } | null
}

export function curaduriaPelis(pelis: Plan[], votos: Voto[]): Curaduria {
  const hechas = pelis.filter((p) => p.estado === "hecho")
  const ids = new Set(hechas.map((p) => p.id))
  const puntuados = votos.filter((v) => ids.has(v.plan) && v.puntaje > 0)

  const porUsuario = new Map<string, number[]>()
  for (const v of puntuados) porUsuario.set(v.usuario, [...(porUsuario.get(v.usuario) ?? []), v.puntaje])
  const porPersona = [...porUsuario].map(([usuario, l]) => ({ usuario, promedio: l.reduce((a, b) => a + b, 0) / l.length, cantidad: l.length }))

  let masDuro: Curaduria["masDuro"] = null
  if (porPersona.length >= 2) {
    const orden = [...porPersona].sort((a, b) => a.promedio - b.promedio)
    const dif = orden[orden.length - 1].promedio - orden[0].promedio
    if (dif >= 0.5) masDuro = { usuario: orden[0].usuario, diferencia: dif }
  }

  let mayorAcuerdo: Curaduria["mayorAcuerdo"] = null
  let mayorDesacuerdo: Curaduria["mayorDesacuerdo"] = null
  let difAcuerdo = Infinity
  let sumaDif = 0
  let pares = 0
  for (const p of hechas) {
    const ps = puntuados.filter((v) => v.plan === p.id).map((v) => v.puntaje)
    if (ps.length < 2) continue
    const dif = Math.max(...ps) - Math.min(...ps)
    const prom = ps.reduce((a, b) => a + b, 0) / ps.length
    sumaDif += dif
    pares++
    const promAcuerdo = mayorAcuerdo ? mayorAcuerdo.puntajes.reduce((a, b) => a + b, 0) / mayorAcuerdo.puntajes.length : -1
    if (dif < difAcuerdo || (dif === difAcuerdo && prom > promAcuerdo)) {
      difAcuerdo = dif
      mayorAcuerdo = { plan: p, puntajes: ps }
    }
    if (!mayorDesacuerdo || dif > mayorDesacuerdo.diferencia) mayorDesacuerdo = { plan: p, puntajes: ps, diferencia: dif }
  }
  if (mayorDesacuerdo && mayorDesacuerdo.diferencia < 1) mayorDesacuerdo = null

  let suma = 0
  let sumaLb = 0
  let n = 0
  for (const p of hechas) {
    const lb = p.datos?.lbPromedio
    const ps = puntuados.filter((v) => v.plan === p.id).map((v) => v.puntaje)
    if (!lb || !ps.length) continue
    suma += ps.reduce((a, b) => a + b, 0) / ps.length
    sumaLb += lb
    n++
  }
  const vsLetterboxd = n ? { nuestro: suma / n, letterboxd: sumaLb / n, diferencia: (suma - sumaLb) / n, cantidad: n } : null

  return {
    porPersona,
    masDuro,
    coincidencia: pares ? Math.round(100 - (sumaDif / pares / 5) * 100) : null,
    mayorAcuerdo,
    mayorDesacuerdo,
    vsLetterboxd,
  }
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
  curaduria: Curaduria
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
  const lugares = {
    cantidad: lugaresHechos.length,
    cafes: lugaresHechos.filter((p) => pers(p) === "cafe").length,
    comidas: lugaresHechos.filter((p) => pers(p) === "cocina").length,
    barrios: barriosConquistados(lugaresHechos),
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
    curaduria: curaduriaPelis(pelisHechas, votos),
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
