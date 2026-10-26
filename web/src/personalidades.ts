import type { Lista, Personalidad } from "./tipos"

/** Lo que trae cada personalidad: su nombre, sus frases y sus listas. */
export const PERSONALIDADES: Record<
  Personalidad,
  { nombre: string; descripcion: string; listas: { id: Lista; nombre: string; placeholder: string }[]; verbo: string }
> = {
  cine: {
    nombre: "Cine",
    descripcion: "Ficha técnica, Letterboxd y curaduría de pareja.",
    listas: [],
    verbo: "verla",
  },
  cocina: {
    nombre: "Cocina",
    descripcion: "Mapa, Instagram, barrio y qué pedir (repetir o pasar).",
    listas: [{ id: "pedir", nombre: "Qué pedir", placeholder: "La milanesa napolitana..." }],
    verbo: "ir a comer",
  },
  cafe: {
    nombre: "Café",
    descripcion: "El lugar en el mapa, barrio y qué pedir.",
    listas: [{ id: "pedir", nombre: "Qué pedir", placeholder: "Flat white y medialuna..." }],
    verbo: "ir a tomar algo",
  },
  viaje: {
    nombre: "Viaje",
    descripcion: "Boarding pass, itinerario por día y valija.",
    listas: [
      { id: "itinerario", nombre: "Itinerario", placeholder: "Día 1: llegar y caminar la rambla..." },
      { id: "valija", nombre: "Valija", placeholder: "Protector solar..." },
    ],
    verbo: "viajar",
  },
  taller: {
    nombre: "Taller",
    descripcion: "Pasos, materiales y la foto del antes y el después.",
    listas: [
      { id: "pasos", nombre: "Pasos", placeholder: "Lijar la madera..." },
      { id: "materiales", nombre: "Materiales", placeholder: "Pintura al agua blanca..." },
    ],
    verbo: "hacerlo",
  },
  salida: {
    nombre: "Plancito",
    descripcion: "El lugar, el barrio y el mapa.",
    listas: [],
    verbo: "salir",
  },
}

export const LISTA_NOMBRES: Record<Lista, string> = {
  pasos: "Pasos",
  materiales: "Materiales",
  valija: "Valija",
  itinerario: "Itinerario",
  pedir: "Qué pedir",
  ideas: "Ideas",
}

/** Reconoce links pegados para completar solo la categoría y los datos. */
export function tipoDeLink(url: string): "letterboxd" | "maps" | "instagram" | "otro" | null {
  if (!/^https?:\/\//i.test(url.trim())) return null
  if (/letterboxd\.com|boxd\.it/i.test(url)) return "letterboxd"
  if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google/i.test(url)) return "maps"
  if (/instagram\.com/i.test(url)) return "instagram"
  return "otro"
}

export function usuarioInstagram(s: string): string {
  const m = /instagram\.com\/([A-Za-z0-9_.]+)/i.exec(s)
  return (m ? m[1] : s).replace(/^@/, "").trim()
}

export function embedMapa(q: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`
}

export function linkMapa(q: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}
