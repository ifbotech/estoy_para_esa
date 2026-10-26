import { describe, expect, it } from "vitest"
import {
  aCiegas, barriosConquistados, candidatosSorteo, curaduriaPelis, demorasRodillo, esMatchTotal, momentum,
  promedioGanas, rachaMaxima, rankear, resumenAnual, sellado, simetria, sortear,
} from "./calculos"
import type { Categoria, Item, Plan, Usuario, Voto } from "./tipos"

const base = { collectionId: "", collectionName: "", updated: "" }

function plan(id: string, extra: Partial<Plan> = {}): Plan {
  return {
    ...base, id, titulo: id, categoria: "c-cine", estado: "idea", notas: "", link: "", portada: "",
    fotos: [], datos: null, cuando: "", hecho_en: "", creado_por: "", created: "2026-01-01 10:00:00.000Z",
    ...extra,
  }
}

function voto(planId: string, usuario: string, ganas: number, puntaje = 0): Voto {
  return { ...base, id: `${planId}-${usuario}`, plan: planId, usuario, ganas, puntaje, resena: "", created: "" }
}

const cat = (id: string, personalidad: Categoria["personalidad"]): Categoria => ({
  ...base, id, nombre: id, slug: id, emoji: "", personalidad, color: "", orden: 0, created: "",
})

describe("ganas", () => {
  it("promedia sólo los votos del plan", () => {
    expect(promedioGanas("a", [voto("a", "i", 80), voto("a", "r", 40), voto("b", "i", 0)])).toBe(60)
    expect(promedioGanas("z", [])).toBeNull()
  })

  it("ordena por promedio y deja al final los planes sin votos", () => {
    const planes = [plan("sin"), plan("medio"), plan("top")]
    const votos = [voto("top", "i", 100), voto("top", "r", 90), voto("medio", "i", 50)]
    expect(rankear(planes, votos).map((r) => r.plan.id)).toEqual(["top", "medio", "sin"])
  })

  it("sortea sólo entre los pendientes", () => {
    const r = rankear([plan("hecho", { estado: "hecho" }), plan("pendiente")], [])
    for (const x of [0, 0.5, 0.999]) expect(sortear(r, () => x)?.plan.id).toBe("pendiente")
    expect(sortear([], () => 0.5)).toBeNull()
  })
})

describe("simetría de ganas", () => {
  const v = (a: number, b: number) => [voto("p", "i", a), voto("p", "r", b)]

  it("MATCH cuando los dos tienen 80 o más", () => {
    expect(simetria(v(80, 95))).toBe("match")
    expect(simetria(v(100, 100))).toBe("match")
  })

  it("CONSENSO con 20 puntos o menos de diferencia", () => {
    expect(simetria(v(60, 60))).toBe("consenso")
    expect(simetria(v(40, 60))).toBe("consenso")
    expect(simetria(v(79, 99))).toBe("consenso")
  })

  it("POR AMOR AL ARTE con 45 puntos o más de diferencia", () => {
    expect(simetria(v(100, 20))).toBe("por_amor")
    expect(simetria(v(50, 95))).toBe("por_amor")
  })

  it("nada en el medio ni con un solo voto", () => {
    expect(simetria(v(40, 70))).toBeNull()
    expect(simetria([voto("p", "i", 100)])).toBeNull()
    expect(simetria([])).toBeNull()
  })

  it("match total con los dos en 85 o más", () => {
    expect(esMatchTotal(v(85, 90))).toBe(true)
    expect(esMatchTotal(v(84, 100))).toBe(false)
    expect(esMatchTotal([voto("p", "i", 100)])).toBe(false)
  })
})

describe("voto a ciegas", () => {
  it("tapa las ganas del otro hasta que yo vote", () => {
    expect(aCiegas([voto("p", "r", 90)], "i")).toBe(true)
    expect(aCiegas([voto("p", "r", 90), voto("p", "i", 10)], "i")).toBe(false)
    expect(aCiegas([voto("p", "i", 10)], "i")).toBe(false)
    expect(aCiegas([], "i")).toBe(false)
    expect(aCiegas([voto("p", "r", 90)], undefined)).toBe(false)
  })
})

describe("sorpréndanme", () => {
  const categorias = [cat("c-cine", "cine"), cat("c-viaje", "viaje"), cat("c-cafe", "cafe"), cat("c-diy", "taller")]
  const r = rankear(
    [plan("peli"), plan("viaje", { categoria: "c-viaje" }), plan("cafe", { categoria: "c-cafe" }), plan("diy", { categoria: "c-diy" }), plan("vista", { estado: "hecho" })],
    [],
  )
  const ids = (f: Parameters<typeof candidatosSorteo>[1]) => candidatosSorteo(r, f, categorias).map((x) => x.plan.id).sort()

  it("filtra por en casa, salir y rápido, y nunca trae lo hecho", () => {
    expect(ids("todo")).toEqual(["cafe", "diy", "peli", "viaje"])
    expect(ids("casa")).toEqual(["diy", "peli"])
    expect(ids("salir")).toEqual(["cafe", "viaje"])
    expect(ids("rapido")).toEqual(["cafe", "peli"])
  })

  it("el rodillo frena de a poco y dura lo pedido", () => {
    const d = demorasRodillo(16, 1400)
    expect(d).toHaveLength(16)
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThanOrEqual(d[i - 1])
    expect(Math.abs(d.reduce((a, b) => a + b, 0) - 1400)).toBeLessThan(16)
  })
})

describe("sello de un recuerdo", () => {
  const usuarios = [{ ...base, id: "i", name: "Iñaki" }, { ...base, id: "r", name: "Rocío" }] as Usuario[]

  it("pide puntaje de los dos, foto y nota", () => {
    const p = plan("p", { estado: "hecho" })
    const s = sellado(p, [voto("p", "i", 80, 4)], usuarios)
    expect(s.total).toBe(4)
    expect(s.hechos).toBe(1)
    expect(s.pasos.filter((x) => !x.ok).map((x) => x.etiqueta)).toEqual(["Puntaje Rocío", "Foto", "Nota o reseña"])
    expect(s.completo).toBe(false)
  })

  it("queda 100 % sellado con todo", () => {
    const p = plan("p", { estado: "hecho", fotos: ["a.jpg"] })
    const votos = [voto("p", "i", 80, 4), { ...voto("p", "r", 60, 3.5), resena: "Muy rica" }]
    expect(sellado(p, votos, usuarios).completo).toBe(true)
  })
})

describe("ritmo compartido", () => {
  const hecho = (id: string, f: string) => plan(id, { estado: "hecho", hecho_en: f })

  it("suma lo hecho, el mes récord y la racha máxima sin castigar", () => {
    const hoy = new Date(2026, 9, 25)
    const planes = [
      hecho("a", "2026-10-21 12:00:00Z"),
      hecho("b", "2026-10-14 12:00:00Z"),
      hecho("c", "2026-03-02 12:00:00Z"),
      hecho("d", "2026-03-09 12:00:00Z"),
      hecho("e", "2026-03-16 12:00:00Z"),
      hecho("f", "2025-12-01 12:00:00Z"),
      plan("pendiente"),
    ]
    const m = momentum(planes, hoy)
    expect(m.total).toBe(6)
    expect(m.esteMes).toBe(2)
    expect(m.esteAnio).toBe(5)
    expect(m.mesRecord).toEqual({ anio: 2026, mes: 2, cantidad: 3 })
    expect(m.rachaMaxima).toBe(3)
    // un mes tranquilo no borra nada de lo logrado
    expect(momentum(planes, new Date(2027, 5, 1)).total).toBe(6)
    expect(momentum([], hoy)).toMatchObject({ total: 0, mesRecord: null, rachaMaxima: 0 })
  })

  it("encuentra la racha más larga", () => {
    const d = (s: string) => new Date(s)
    expect(rachaMaxima([d("2026-01-05"), d("2026-01-12"), d("2026-01-19"), d("2026-03-02"), d("2026-03-09")])).toBe(3)
    expect(rachaMaxima([])).toBe(0)
  })
})

describe("curaduría de pareja", () => {
  it("dice quién es más duro, el mayor acuerdo y cómo les va contra Letterboxd", () => {
    const pelis = [
      plan("a", { estado: "hecho", datos: { lbPromedio: 4 } }),
      plan("b", { estado: "hecho", datos: { lbPromedio: 3 } }),
      plan("c", { estado: "hecho" }),
      plan("pendiente"),
    ]
    const votos = [
      voto("a", "i", 0, 4), voto("a", "r", 0, 4.5),
      voto("b", "i", 0, 2), voto("b", "r", 0, 4.5),
      voto("c", "i", 0, 3), voto("c", "r", 0, 3),
      voto("pendiente", "i", 90, 0),
    ]
    const c = curaduriaPelis(pelis, votos)
    expect(c.masDuro?.usuario).toBe("i")
    expect(c.mayorAcuerdo?.plan.id).toBe("c")
    expect(c.mayorDesacuerdo?.plan.id).toBe("b")
    // diferencias 0,5 + 2,5 + 0 = 3 en 3 pelis: 1 estrella de promedio = 80
    expect(c.coincidencia).toBe(80)
    expect(c.vsLetterboxd).toMatchObject({ cantidad: 2, letterboxd: 3.5 })
    expect(c.vsLetterboxd!.nuestro).toBeCloseTo((4.25 + 3.25) / 2)
  })

  it("sin puntajes no inventa nada", () => {
    const c = curaduriaPelis([plan("a", { estado: "hecho" })], [])
    expect(c).toMatchObject({ masDuro: null, coincidencia: null, mayorAcuerdo: null, vsLetterboxd: null })
  })

  it("cuenta los barrios conquistados sin importar mayúsculas", () => {
    const l = [
      plan("a", { estado: "hecho", datos: { barrio: "Palermo" } }),
      plan("b", { estado: "hecho", datos: { barrio: "palermo " } }),
      plan("c", { estado: "hecho", datos: { barrio: "Chacarita" } }),
      plan("d", { datos: { barrio: "Belgrano" } }),
    ]
    expect(barriosConquistados(l)).toEqual([{ barrio: "Palermo", cantidad: 2 }, { barrio: "Chacarita", cantidad: 1 }])
  })
})

describe("wrapped", () => {
  it("resume el año", () => {
    const categorias = [cat("c-cine", "cine"), cat("c-viaje", "viaje"), cat("c-cafe", "cafe")]
    const planes = [
      plan("peli1", { estado: "hecho", hecho_en: "2026-02-10 20:00:00Z", created: "2026-02-01 10:00:00Z" }),
      plan("peli2", { estado: "hecho", hecho_en: "2026-02-20 20:00:00Z", created: "2026-01-01 10:00:00Z" }),
      plan("viaje", { categoria: "c-viaje", estado: "hecho", hecho_en: "2026-07-10 20:00:00Z",
        datos: { exterior: true, pais: "Uruguay", desde: "2026-07-05", hasta: "2026-07-10" } }),
      plan("cafe", { categoria: "c-cafe", estado: "hecho", hecho_en: "2026-07-11 20:00:00Z", datos: { barrio: "Palermo" } }),
      plan("viejo", { estado: "hecho", hecho_en: "2025-12-31 20:00:00Z" }),
      plan("pendiente"),
    ]
    const votos = [voto("peli1", "i", 90, 4.5), voto("peli1", "r", 30, 3), voto("peli2", "i", 60, 5)]
    const items: Item[] = []
    const r = resumenAnual(2026, planes, votos, categorias, items)
    expect(r.total).toBe(4)
    expect(r.porCategoria[0].categoria.id).toBe("c-cine")
    expect(r.porCategoria[0].pct).toBe(50)
    expect(r.mesTop).toBe(1)
    expect(r.pelis.cantidad).toBe(2)
    expect(r.pelis.mejor?.id).toBe("peli2")
    expect(r.viajes.pctExterior).toBe(100)
    expect(r.viajes.paises).toEqual(["Uruguay"])
    expect(r.viajes.dias).toBe(6)
    expect(r.lugares.cafes).toBe(1)
    expect(r.lugares.barrios[0]).toEqual({ barrio: "Palermo", cantidad: 1 })
    expect(r.desacuerdo?.plan.id).toBe("peli1")
    expect(r.desacuerdo?.diferencia).toBe(60)
    expect(r.masRapido?.dias).toBe(9)
    expect(r.curaduria.porPersona.map((x) => x.usuario).sort()).toEqual(["i", "r"])
  })
})
