import type { Personalidad } from "../tipos"

/**
 * «Contame el plan como te salga»: de una frase suelta saca el título, la
 * categoría, el día y el link. Todo en el teléfono, con reglas simples: si se
 * equivoca, se corrige con un toque antes de guardar.
 */
export interface Interpretado {
  titulo: string
  personalidad: Personalidad | null
  cuando: { fecha: string; etiqueta: string } | null
  link: string
}

const PALABRAS: [Personalidad, RegExp][] = [
  ["cine", /\b(peli|pelis|pel[ií]cula|pel[ií]culas|cine|serie|series|documental|marat[oó]n|netflix|mubi|letterboxd|ver\s+(la|el|una|un)?\s*[a-z])/i],
  ["cafe", /\b(caf[eé]|cafecito|cafecitos|merienda|merendar|brunch|desayuno|desayunar|medialunas|cafeter[ií]a|t[eé]\s)/i],
  ["viaje", /\b(viaje|viajar|escapada|vacaciones|vuelo|mochilear|ruta|finde\s+en|semana\s+en|d[ií]as\s+en|ir\s+a\s+(bariloche|mendoza|salta|jujuy|c[oó]rdoba|uruguay|chile|brasil|europa|colonia|montevideo|mar\s+del\s+plata|la\s+costa))/i],
  ["taller", /\b(diy|armar|pintar|restaurar|arreglar|construir|coser|tejer|plantar|reciclar|lijar|carpinter[ií]a|mueble|estante|mesita)/i],
  ["cocina", /\b(comer|comida|cena|cenar|almuerzo|almorzar|pizza|pizzer[ií]a|sushi|parrilla|asado|empanadas?|restaurante|resto|bodeg[oó]n|hamburguesa|burger|ramen|tacos|helado|fideos|pasta|cocinar|receta)/i],
  ["salida", /\b(recital|show|teatro|museo|bar|boliche|feria|birra|cerveza|tragos|picnic|parque|caminar|bailar|karaoke|stand\s?up|muestra|expo)/i],
]

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function mas(hoy: Date, dias: number) {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  d.setDate(d.getDate() + dias)
  return d
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")

/** Busca un día en la frase. Devuelve la fecha y el pedazo de texto que la nombró. */
export function buscarCuando(texto: string, hoy = new Date()): { fecha: string; etiqueta: string; match: string } | null {
  const t = sinTildes(texto.toLowerCase())
  let m: RegExpExecArray | null

  if ((m = /\b(pasado\s+manana)\b/.exec(t))) return { fecha: iso(mas(hoy, 2)), etiqueta: "pasado mañana", match: m[0] }
  if ((m = /\b(manana)\b/.exec(t))) return { fecha: iso(mas(hoy, 1)), etiqueta: "mañana", match: m[0] }
  if ((m = /\b(hoy|esta\s+noche)\b/.exec(t))) return { fecha: iso(hoy), etiqueta: "hoy", match: m[0] }

  if ((m = /\b(este|el)?\s*(finde|fin\s+de\s+semana)\b/.exec(t))) {
    const falta = (6 - hoy.getDay() + 7) % 7
    return { fecha: iso(mas(hoy, falta)), etiqueta: "el finde", match: m[0] }
  }

  if ((m = /\b(?:el|este|el\s+proximo|proximo)?\s*(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b/.exec(t))) {
    const dia = DIAS.map(sinTildes).indexOf(m[1])
    let falta = (dia - hoy.getDay() + 7) % 7
    if (falta === 0) falta = 7
    return { fecha: iso(mas(hoy, falta)), etiqueta: DIAS[dia], match: m[0] }
  }

  if ((m = /\b(?:el\s+)?(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.exec(t))) {
    const mes = m[2] === "setiembre" ? 8 : MESES.map(sinTildes).indexOf(m[2])
    return conAnio(Number(m[1]), mes, hoy, m[0])
  }
  if ((m = /\b(?:el\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(t))) {
    const anio = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : undefined
    return conAnio(Number(m[1]), Number(m[2]) - 1, hoy, m[0], anio)
  }
  return null
}

function conAnio(dia: number, mes: number, hoy: Date, match: string, anio?: number) {
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null
  let d = new Date(anio ?? hoy.getFullYear(), mes, dia)
  if (anio === undefined && d < mas(hoy, 0)) d = new Date(hoy.getFullYear() + 1, mes, dia)
  return { fecha: iso(d), etiqueta: `${dia} de ${MESES[mes]}`, match }
}

const LINK = /\b((?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/i
const RELLENO = /^(?:che[,\s]+)?(?:(?:quiero\s+ir\s+a|quiero|ir\s+a\s+(?=comer|tomar|ver)|vamos\s+a|vayamos\s+a|tenemos\s+que|hay\s+que|estar[ií]a\s+bueno|me\s+gustar[ií]a|podr[ií]amos|y\s+si)\s+)+/i

export function interpretar(texto: string, hoy = new Date()): Interpretado {
  let resto = texto.trim()

  let link = ""
  const l = LINK.exec(resto)
  if (l && /[./]/.test(l[1]) && !/^\d+\/\d+/.test(l[1])) {
    link = /^https?:\/\//i.test(l[1]) ? l[1] : `https://${l[1]}`
    resto = resto.replace(l[0], " ")
  }

  const c = buscarCuando(resto, hoy)
  if (c) {
    // Saca el pedazo de la fecha respetando las tildes del original.
    const i = sinTildes(resto.toLowerCase()).indexOf(c.match.trim())
    if (i >= 0) resto = resto.slice(0, i) + " " + resto.slice(i + c.match.trim().length)
  }

  let personalidad: Personalidad | null = null
  if (/letterboxd\.com|boxd\.it/i.test(link)) personalidad = "cine"
  for (const [p, re] of PALABRAS) {
    if (personalidad) break
    if (re.test(texto)) personalidad = p
  }

  const titulo = resto
    .replace(RELLENO, "")
    .replace(/\s+(con|y)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "")
  return {
    titulo: titulo ? titulo[0].toUpperCase() + titulo.slice(1) : "",
    personalidad,
    cuando: c ? { fecha: c.fecha, etiqueta: c.etiqueta } : null,
    link,
  }
}
