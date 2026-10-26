/**
 * Ruiditos cortos hechos en el momento con Web Audio (sin archivos).
 * Apagados por defecto; se prenden en Más → Sonidos y la preferencia queda
 * en este teléfono.
 */
let ctx: AudioContext | null = null

export function sonidosPrendidos(): boolean {
  try {
    return localStorage.getItem("epe_sonidos") === "1"
  } catch {
    return false
  }
}

export function prenderSonidos(si: boolean) {
  try {
    localStorage.setItem("epe_sonidos", si ? "1" : "0")
  } catch {
    /* sin almacenamiento: queda apagado */
  }
  if (si) sonar("pop")
}

function audio(): AudioContext | null {
  if (!sonidosPrendidos()) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === "suspended") void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tono(a: AudioContext, desde: number, hasta: number, dur: number, tipo: OscillatorType, vol = 0.12, demora = 0) {
  const t = a.currentTime + demora
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = tipo
  o.frequency.setValueAtTime(desde, t)
  o.frequency.exponentialRampToValueAtTime(hasta, t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export type Sonido = "pop" | "tic" | "esa" | "hecho" | "swish"

export function sonar(s: Sonido) {
  const a = audio()
  if (!a) return
  switch (s) {
    case "pop":
      tono(a, 520, 180, 0.09, "sine", 0.18)
      break
    case "tic":
      tono(a, 1400, 900, 0.03, "square", 0.04)
      break
    case "swish":
      tono(a, 300, 900, 0.14, "triangle", 0.08)
      break
    case "esa":
      tono(a, 392, 392, 0.1, "triangle", 0.14)
      tono(a, 523, 523, 0.1, "triangle", 0.14, 0.09)
      tono(a, 784, 1046, 0.22, "triangle", 0.14, 0.18)
      break
    case "hecho":
      ;[523, 659, 784, 1046].forEach((f, i) => tono(a, f, f, 0.16, "sine", 0.12, i * 0.08))
      break
  }
}
