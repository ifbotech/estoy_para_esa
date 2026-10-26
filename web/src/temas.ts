import "@fontsource-variable/bricolage-grotesque/standard.css"
import "@fontsource-variable/fraunces"
import "@fontsource-variable/dm-sans"
import "@fontsource/lilita-one/400.css"
import "@fontsource/space-mono/400.css"
import "@fontsource/space-mono/700.css"
import type { FuenteKey, Tokens } from "./tipos"

export const FUENTES: Record<FuenteKey, { nombre: string; css: string }> = {
  bricolage: { nombre: "Bricolage", css: "'Bricolage Grotesque Variable', 'Arial Narrow', system-ui, sans-serif" },
  lilita: { nombre: "Lilita", css: "'Lilita One', 'Arial Rounded MT Bold', system-ui, sans-serif" },
  fraunces: { nombre: "Fraunces", css: "'Fraunces Variable', Georgia, serif" },
  dmsans: { nombre: "DM Sans", css: "'DM Sans Variable', system-ui, sans-serif" },
  spacemono: { nombre: "Space Mono", css: "'Space Mono', ui-monospace, monospace" },
}

/**
 * Los temas de la v2 («Papel Pop»). Qué es cada color:
 *   bg          el papel (fondo)
 *   bg2         el capítulo de la portada (Hoy, entrada)
 *   superficie  las fichas y cartas
 *   tinta       bordes, sombras duras y texto
 *   suave       texto secundario
 *   a1          la acción principal (botón lleno)
 *   a2          lo hecho y los logros
 *   a3, a4      acentos cálido y frío
 * Los capítulos de cada categoría salen del color de la categoría.
 */
export const PRESETS: { nombre: string; nota: string; tokens: Tokens }[] = [
  {
    nombre: "Papel Pop",
    nota: "Papel hueso, tinta casi negra y capítulos de color plano. La de la v2.",
    tokens: {
      v: 2, modo: "claro", bg: "#FBF6EE", bg2: "#E8432E", superficie: "#FFFFFF", tinta: "#171313", suave: "#5C5252",
      a1: "#F2EA3A", a2: "#6FE05C", a3: "#E8432E", a4: "#A9C3E0",
      radio: 12, display: "bricolage", cuerpo: "dmsans", grano: 0.12, movimiento: 1,
    },
  },
  {
    nombre: "Noche Pop",
    nota: "Lo mismo pero de noche: papel carbón y tinta de tiza.",
    tokens: {
      v: 2, modo: "oscuro", bg: "#1B1717", bg2: "#8584BD", superficie: "#272121", tinta: "#FBF6EE", suave: "#BDB2A8",
      a1: "#F2EA3A", a2: "#6FE05C", a3: "#F8C1BA", a4: "#A9C3E0",
      radio: 12, display: "bricolage", cuerpo: "dmsans", grano: 0.18, movimiento: 1,
    },
  },
  {
    nombre: "Lavanda Volador",
    nota: "Portada lavanda y amarillo manteca, para los días tranqui.",
    tokens: {
      v: 2, modo: "claro", bg: "#F9F5F2", bg2: "#8584BD", superficie: "#FFFFFF", tinta: "#1A1A1A", suave: "#5E5A6E",
      a1: "#F9CC73", a2: "#B5C995", a3: "#AC4F98", a4: "#A7B5CC",
      radio: 8, display: "bricolage", cuerpo: "dmsans", grano: 0.1, movimiento: 1,
    },
  },
  {
    nombre: "Planeta Burger",
    nota: "Amarillo mostaza y rojo kétchup, todo redondo.",
    tokens: {
      v: 2, modo: "claro", bg: "#F7F2E5", bg2: "#FFC737", superficie: "#FFFFFF", tinta: "#111111", suave: "#5B5348",
      a1: "#FFC737", a2: "#8DF947", a3: "#EB3322", a4: "#2097CF",
      radio: 18, display: "lilita", cuerpo: "dmsans", grano: 0.08, movimiento: 1.2,
    },
  },
  {
    nombre: "Riso Zine",
    nota: "Papel, rosa y azul de risografía, letras con serifa.",
    tokens: {
      v: 2, modo: "claro", bg: "#F4ECDC", bg2: "#FF48B0", superficie: "#FFFAF0", tinta: "#1D1A3A", suave: "#6D6788",
      a1: "#FFD800", a2: "#00A95C", a3: "#FF48B0", a4: "#0078BF",
      radio: 4, display: "fraunces", cuerpo: "dmsans", grano: 0.3, movimiento: 0.9,
    },
  },
]

export const TEMA_INICIAL = PRESETS[0]

/** Los temas de la v1 (sin `v: 2`) quedan en el Archivo pero no se aplican. */
export function esTemaV2(t: Partial<Tokens> | null | undefined): boolean {
  return Boolean(t && t.v === 2 && t.bg)
}

/** Aplica un tema a toda la app: son variables CSS en :root. */
export function aplicarTokens(parcial: Partial<Tokens>) {
  const t: Tokens = esTemaV2(parcial) ? { ...TEMA_INICIAL.tokens, ...parcial } : TEMA_INICIAL.tokens
  const r = document.documentElement
  const v: Record<string, string> = {
    "--bg": t.bg,
    "--bg2": t.bg2,
    "--superficie": t.superficie,
    "--tinta": t.tinta,
    "--suave": t.suave,
    "--a1": t.a1,
    "--a2": t.a2,
    "--a3": t.a3,
    "--a4": t.a4,
    "--radio": `${t.radio}px`,
    "--f-display": FUENTES[t.display]?.css ?? FUENTES.bricolage.css,
    "--f-cuerpo": FUENTES[t.cuerpo]?.css ?? FUENTES.dmsans.css,
    "--grano": String(t.grano),
    "--mov": String(t.movimiento),
  }
  for (const [k, val] of Object.entries(v)) r.style.setProperty(k, val)
  r.dataset.modo = t.modo
  r.dataset.display = t.display
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t.bg)
  try {
    localStorage.setItem("epe_tema", JSON.stringify(t))
  } catch {
    /* sin almacenamiento: el tema llega igual desde el servidor */
  }
}

/** El último tema usado, para pintar bien antes de que llegue el servidor. */
export function temaGuardado(): Tokens {
  try {
    const t = JSON.parse(localStorage.getItem("epe_tema") || "null")
    if (esTemaV2(t)) return { ...TEMA_INICIAL.tokens, ...t }
  } catch {
    /* nada */
  }
  return TEMA_INICIAL.tokens
}

/** Colores fijos de los capítulos (no dependen del tema). */
export const CAPITULOS = {
  tomate: "#E8432E",
  manteca: "#F9CC73",
  chicle: "#F8C1BA",
  cielo: "#A9C3E0",
  lavanda: "#8584BD",
  uva: "#A84F96",
  limon: "#F2EA3A",
  lima: "#6FE05C",
  pasto: "#2E4A2A",
  electrico: "#1428FF",
}
