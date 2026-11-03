/**
 * «Nuevo en estoy para esa»: las mejoras que cada uno le hizo a la app, para
 * el panel de novedades (la estrella de arriba). Se arma sola en cada build
 * con los PR que llegaron a main (ver `cambiosPublicados` en vite.config.ts):
 * el título del PR, quién lo hizo (su rama) y cuándo. La más nueva primero.
 * Una mejora queda como no vista hasta que la abras.
 */
export interface CambioApp {
  /** el número del PR */
  id: string
  fecha: string
  quien: string
  titulo: string
}

declare const __CAMBIOS__: CambioApp[]

export const CAMBIOS_APP: CambioApp[] = typeof __CAMBIOS__ === "undefined" ? [] : __CAMBIOS__

/** Las que se muestran en el panel. */
export const CAMBIOS_RECIENTES = CAMBIOS_APP.slice(0, 8)

const CLAVE = "epe-cambios-vistos"

export function cambiosVistos(): string[] {
  try {
    const guardado = localStorage.getItem(CLAVE)
    // la primera vez, sólo cuenta como nueva la última mejora
    return guardado ? JSON.parse(guardado) : CAMBIOS_APP.slice(1).map((c) => c.id)
  } catch {
    return CAMBIOS_APP.map((c) => c.id)
  }
}

export function marcarCambiosVistos() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(CAMBIOS_APP.map((c) => c.id)))
  } catch {
    // sin almacenamiento: quedan como vistas sólo por esta vez
  }
}
