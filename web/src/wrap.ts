import { useEffect, useState } from "react"
import { fecha } from "./calculos"
import { pb } from "./pb"
import type { Wrap } from "./tipos"

/**
 * El Wrapped abierto, si hay uno. No vive en el menú: aparece solo cuando el
 * servidor lo arma (30/6 y 31/12) y se va cuando cierra. La regla de la
 * colección ya filtra por fecha; acá se vuelve a mirar `cierra` por si la
 * respuesta salió de la copia sin señal del service worker.
 */
let cache: { wrap: Wrap | null; cuando: number } | null = null
const MEDIA_HORA = 30 * 60 * 1000

function abierto(w: Wrap | null): Wrap | null {
  if (!w) return null
  const ahora = new Date()
  const abre = fecha(w.abre)
  const cierra = fecha(w.cierra)
  return abre && cierra && abre <= ahora && ahora <= cierra ? w : null
}

export async function traerWrap(): Promise<Wrap | null> {
  if (cache && Date.now() - cache.cuando < MEDIA_HORA) return abierto(cache.wrap)
  try {
    const r = await pb.collection("wraps").getList<Wrap>(1, 1, { sort: "-hasta", requestKey: "wrap" })
    cache = { wrap: r.items[0] ?? null, cuando: Date.now() }
  } catch {
    cache = { wrap: null, cuando: Date.now() }
  }
  return abierto(cache.wrap)
}

/** `undefined` mientras carga, `null` si no hay ninguno abierto. */
export function useWrap(): Wrap | null | undefined {
  const [wrap, setWrap] = useState<Wrap | null | undefined>(cache ? abierto(cache.wrap) : undefined)
  useEffect(() => {
    let vivo = true
    traerWrap().then((w) => vivo && setWrap(w))
    return () => {
      vivo = false
    }
  }, [])
  return wrap
}

/** «Su Wrapped 2026» o «Su Wrapped · mitad de 2026». */
export function nombreWrap(w: Wrap): string {
  return w.tipo === "mitad" ? `mitad de ${w.anio}` : String(w.anio)
}

// Se abre solo la primera vez en cada teléfono, como el de Spotify.
const CLAVE = (w: Wrap) => `epe-wrap-visto-${w.periodo}`

export function wrapVisto(w: Wrap): boolean {
  try {
    return localStorage.getItem(CLAVE(w)) === "1"
  } catch {
    return true
  }
}

export function marcarWrapVisto(w: Wrap) {
  try {
    localStorage.setItem(CLAVE(w), "1")
  } catch {
    // sin almacenamiento: no pasa nada, sólo no se abre solo
  }
}
