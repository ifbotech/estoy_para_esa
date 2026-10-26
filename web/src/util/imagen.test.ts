import { describe, expect, it } from "vitest"
import { medidas } from "./imagen"

describe("compresión de fotos", () => {
  it("deja el lado mayor en 1600 px y respeta la proporción", () => {
    expect(medidas(4032, 3024)).toEqual({ ancho: 1600, alto: 1200, escala: 1600 / 4032 })
    expect(medidas(3024, 4032)).toMatchObject({ ancho: 1200, alto: 1600 })
  })

  it("no agranda las fotos chicas", () => {
    expect(medidas(800, 600)).toEqual({ ancho: 800, alto: 600, escala: 1 })
  })
})
