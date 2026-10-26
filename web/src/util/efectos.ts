import confetti from "canvas-confetti"

function colores(): string[] {
  const s = getComputedStyle(document.documentElement)
  return ["--amarillo", "--verde", "--rojo", "--azul", "--tinta"].map((v) => s.getPropertyValue(v).trim() || "#121211")
}

const reducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches

/** Explosión de papel picado desde un punto (0..1 de la pantalla). */
export function festejar(x = 0.5, y = 0.6, fuerza = 1) {
  if (reducido()) return
  const colors = colores()
  // papel picado cuadrado, de los colores de la app: una sola tanda
  confetti({ particleCount: Math.round(60 * fuerza), spread: 70, startVelocity: 38, origin: { x, y }, colors, shapes: ["square"], scalar: 0.9, ticks: 140, disableForReducedMotion: true })
}

/** Papel picado desde los dos costados, para los momentos grandes. */
export function festejoGrande() {
  if (reducido()) return
  const colors = colores()
  const fin = Date.now() + 900
  const tiro = () => {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors })
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors })
    if (Date.now() < fin) requestAnimationFrame(tiro)
  }
  tiro()
}

export function vibrar(ms: number | number[] = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* iOS no vibra desde la web */
  }
}

export function desdeEvento(e: { clientX: number; clientY: number }) {
  return [e.clientX / innerWidth, e.clientY / innerHeight] as const
}
