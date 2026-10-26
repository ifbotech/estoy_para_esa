import { pb } from "../pb"

export interface Preview {
  url: string
  titulo: string
  descripcion: string
  imagen: string
  sitio: string
  extra: string
  extraEtiqueta: string
  extra2?: string
  extra2Etiqueta?: string
}

/** Título, imagen y descripción de un link (lo trae el servidor). */
export async function traerPreview(url: string): Promise<Preview | null> {
  try {
    return await pb.send<Preview>("/api/epe/preview", { query: { url } })
  } catch {
    return null
  }
}

/** "Perfect Days (2023)" → { titulo: "Perfect Days", anio: "2023" } */
export function separarAnio(t: string): { titulo: string; anio: string } {
  const m = /^(.*?)\s*\((\d{4})\)\s*$/.exec(t.trim())
  return m ? { titulo: m[1], anio: m[2] } : { titulo: t.trim(), anio: "" }
}

/** Saca " • Letterboxd", " - Google Maps", etc. del final de un título. */
export function limpiarTitulo(t: string): string {
  return t.replace(/\s*[•·|–-]\s*(Letterboxd|Google Maps|Instagram).*$/i, "").replace(/\s+/g, " ").trim()
}

/** El promedio de Letterboxd de una vista previa («3.92 out of 5» → 3.92), si vino. */
export function promedioLetterboxd(p: Preview): number | undefined {
  if (!/rating/i.test(p.extra2Etiqueta ?? "")) return undefined
  const m = /(\d+(?:[.,]\d+)?)/.exec(p.extra2 ?? "")
  const n = m ? Number(m[1].replace(",", ".")) : NaN
  return n > 0 && n <= 5 ? Math.round(n * 100) / 100 : undefined
}
