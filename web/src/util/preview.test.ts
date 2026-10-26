import { describe, expect, it, vi } from "vitest"
import { limpiarTitulo, promedioLetterboxd, separarAnio, type Preview } from "./preview"

// preview.ts usa el cliente de PocketBase, que necesita el navegador
vi.mock("../pb", () => ({ pb: {} }))

const base: Preview = { url: "", titulo: "", descripcion: "", imagen: "", sitio: "", extra: "", extraEtiqueta: "" }

describe("vista previa de Letterboxd", () => {
  it("lee el promedio de la tarjeta de Twitter", () => {
    expect(promedioLetterboxd({ ...base, extra2Etiqueta: "Average rating", extra2: "3.92 out of 5" })).toBe(3.92)
    expect(promedioLetterboxd({ ...base, extra2Etiqueta: "Average rating", extra2: "4,1 de 5" })).toBe(4.1)
    expect(promedioLetterboxd({ ...base, extra2Etiqueta: "Directed by", extra2: "Wim Wenders" })).toBeUndefined()
    expect(promedioLetterboxd(base)).toBeUndefined()
  })

  it("limpia el título y separa el año", () => {
    expect(separarAnio(limpiarTitulo("Perfect Days (2023) • Letterboxd"))).toEqual({ titulo: "Perfect Days", anio: "2023" })
  })
})
