import "@fontsource-variable/bricolage-grotesque/standard.css"
import "@fontsource-variable/unbounded"
import "@fontsource-variable/fraunces"
import "@fontsource-variable/dm-sans"
import "@fontsource/space-mono/400.css"
import "@fontsource/space-mono/700.css"
import "@fontsource/instrument-serif/400.css"
import "@fontsource/instrument-serif/400-italic.css"
import type { FuenteKey, Tokens } from "./tipos"

export const FUENTES: Record<FuenteKey, { nombre: string; css: string }> = {
  bricolage: { nombre: "Bricolage", css: "'Bricolage Grotesque Variable', system-ui, sans-serif" },
  unbounded: { nombre: "Unbounded", css: "'Unbounded Variable', system-ui, sans-serif" },
  fraunces: { nombre: "Fraunces", css: "'Fraunces Variable', Georgia, serif" },
  dmsans: { nombre: "DM Sans", css: "'DM Sans Variable', system-ui, sans-serif" },
  spacemono: { nombre: "Space Mono", css: "'Space Mono', ui-monospace, monospace" },
  instrument: { nombre: "Instrument Serif", css: "'Instrument Serif', Georgia, serif" },
}

export const PRESETS: { nombre: string; nota: string; tokens: Tokens }[] = [
  {
    nombre: "Kiosco Cósmico",
    nota: "Noche violeta, rosa chicle, verde ácido. La de arranque.",
    tokens: {
      modo: "oscuro", bg: "#120f2b", bg2: "#2a1d6b", superficie: "#1d1844", tinta: "#fff6e5", suave: "#b9b2d9",
      a1: "#ff4fa3", a2: "#c6ff3d", a3: "#ff8a3d", a4: "#5ad1ff",
      radio: 22, display: "bricolage", cuerpo: "dmsans", grano: 0.35, movimiento: 1,
    },
  },
  {
    nombre: "Riso Zine",
    nota: "Papel, tinta rosa y azul de risografía, todo un poco torcido.",
    tokens: {
      modo: "claro", bg: "#f4ecdc", bg2: "#ffd6e8", superficie: "#fffaf0", tinta: "#1d1a3a", suave: "#6d6788",
      a1: "#ff48b0", a2: "#0078bf", a3: "#ffd800", a4: "#00a95c",
      radio: 6, display: "unbounded", cuerpo: "dmsans", grano: 0.55, movimiento: 1,
    },
  },
  {
    nombre: "Noche de Cine",
    nota: "Terciopelo, dorado y butacas.",
    tokens: {
      modo: "oscuro", bg: "#0b0b0d", bg2: "#3a0d16", superficie: "#18161b", tinta: "#f5ecd7", suave: "#a59d8a",
      a1: "#e8b84a", a2: "#ff3d5a", a3: "#f5ecd7", a4: "#6c8ead",
      radio: 14, display: "fraunces", cuerpo: "dmsans", grano: 0.45, movimiento: 0.8,
    },
  },
  {
    nombre: "Pileta en Enero",
    nota: "Cloro, sol y helado de agua.",
    tokens: {
      modo: "claro", bg: "#e3faff", bg2: "#a9ecff", superficie: "#ffffff", tinta: "#04334a", suave: "#4f7d91",
      a1: "#ff6b4a", a2: "#00a8cc", a3: "#ffc93f", a4: "#7b61ff",
      radio: 28, display: "bricolage", cuerpo: "dmsans", grano: 0.2, movimiento: 1.2,
    },
  },
  {
    nombre: "Matecito",
    nota: "Verde yerba, termo naranja y bizcochitos.",
    tokens: {
      modo: "oscuro", bg: "#0f2016", bg2: "#24452b", superficie: "#17301f", tinta: "#f1f5df", suave: "#a7b996",
      a1: "#c8e66a", a2: "#f2a541", a3: "#e86a50", a4: "#8fd1c6",
      radio: 18, display: "fraunces", cuerpo: "dmsans", grano: 0.4, movimiento: 0.9,
    },
  },
]

export const TEMA_INICIAL = PRESETS[0]

/** Aplica un tema a toda la app: son variables CSS en :root. */
export function aplicarTokens(parcial: Partial<Tokens>) {
  // Un tema viejo o incompleto completa lo que le falta con el de fábrica.
  const t: Tokens = { ...TEMA_INICIAL.tokens, ...parcial }
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
    if (t && t.bg) return { ...TEMA_INICIAL.tokens, ...t }
  } catch {
    /* nada */
  }
  return TEMA_INICIAL.tokens
}
