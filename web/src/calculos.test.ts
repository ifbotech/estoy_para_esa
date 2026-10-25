import { describe, expect, it } from "vitest"
import { promedioGanas, racha, rachaMaxima, rankear, resumenAnual, sortear } from "./calculos"
import type { Categoria, Item, Plan, Voto } from "./tipos"

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

describe("racha", () => {
  const hecho = (id: string, f: string) => plan(id, { estado: "hecho", hecho_en: f })

  it("cuenta semanas seguidas hasta esta o la anterior", () => {
    const hoy = new Date(2026, 9, 25) // domingo 25/10
    const planes = [hecho("a", "2026-10-21 12:00:00Z"), hecho("b", "2026-10-14 12:00:00Z"), hecho("c", "2026-10-01 12:00:00Z")]
    expect(racha(planes, hoy)).toBe(2)
    // el lunes siguiente sin nada hecho todavía no se corta
    expect(racha(planes, new Date(2026, 9, 26))).toBe(2)
    expect(racha([], hoy)).toBe(0)
  })

  it("encuentra la racha más larga", () => {
    const d = (s: string) => new Date(s)
    expect(rachaMaxima([d("2026-01-05"), d("2026-01-12"), d("2026-01-19"), d("2026-03-02"), d("2026-03-09")])).toBe(3)
    expect(rachaMaxima([])).toBe(0)
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
  })
})
