import { describe, expect, it } from "vitest"
import { buscarCuando, interpretar } from "./interpretar"

// domingo 25 de octubre de 2026
const HOY = new Date(2026, 9, 25)

describe("interpretar", () => {
  it("saca peli, día y link de Letterboxd", () => {
    const r = interpretar("ver perfect days el sábado letterboxd.com/film/perfect-days-2023/", HOY)
    expect(r.personalidad).toBe("cine")
    expect(r.cuando).toEqual({ fecha: "2026-10-31", etiqueta: "sábado" })
    expect(r.link).toBe("https://letterboxd.com/film/perfect-days-2023/")
    expect(r.titulo).toBe("Ver perfect days")
  })

  it("entiende comida y saca el relleno", () => {
    const r = interpretar("che quiero ir a comer pizza en Güerrín mañana", HOY)
    expect(r.personalidad).toBe("cocina")
    expect(r.cuando?.fecha).toBe("2026-10-26")
    expect(r.titulo).toBe("Comer pizza en Güerrín")
  })

  it("café, viaje, DIY y salida", () => {
    expect(interpretar("brunch en Birkin", HOY).personalidad).toBe("cafe")
    expect(interpretar("escapada a Colonia en diciembre", HOY).personalidad).toBe("viaje")
    expect(interpretar("restaurar la mesita de luz", HOY).personalidad).toBe("taller")
    expect(interpretar("recital en el Konex", HOY).personalidad).toBe("salida")
    expect(interpretar("algo raro", HOY).personalidad).toBeNull()
  })

  it("fechas", () => {
    expect(buscarCuando("hoy", HOY)?.fecha).toBe("2026-10-25")
    expect(buscarCuando("pasado mañana", HOY)?.fecha).toBe("2026-10-27")
    expect(buscarCuando("este finde", HOY)?.fecha).toBe("2026-10-31")
    expect(buscarCuando("el domingo", HOY)?.fecha).toBe("2026-11-01")
    expect(buscarCuando("el 12 de noviembre", HOY)?.fecha).toBe("2026-11-12")
    expect(buscarCuando("el 3 de marzo", HOY)?.fecha).toBe("2027-03-03")
    expect(buscarCuando("el 20/12", HOY)?.fecha).toBe("2026-12-20")
    expect(buscarCuando("ver dune", HOY)).toBeNull()
  })
})
