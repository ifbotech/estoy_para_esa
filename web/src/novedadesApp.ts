/**
 * «Nuevo en la app»: lo que se sumó a la app, para el panel de novedades (la
 * estrella de arriba). La más nueva primero. Cuando sumes algo que el otro
 * tenga que saber, agregá una entrada arriba con un `id` nuevo: aparece como
 * no vista hasta que la abra.
 */
export interface NovedadApp {
  id: string
  fecha: string
  titulo: string
  texto: string
  url?: string
}

export const NOVEDADES_APP: NovedadApp[] = [
  {
    id: "novedades",
    fecha: "2026-11-02",
    titulo: "✶ Novedades",
    texto: "Esta estrella: lo que hizo el otro mientras no mirabas, aunque no tengas los avisos del teléfono activados.",
  },
  {
    id: "piedras",
    fecha: "2026-10-27",
    titulo: "🪨 Decidir con piedras",
    texto: "Cada respuesta es una piedra con ojitos: duerme hasta que esa persona responde y, con las dos, se da vuelta al tocarla.",
    url: "#/decidir",
  },
  {
    id: "decidir",
    fecha: "2026-10-27",
    titulo: "🪧 Decidir",
    texto: "Uno pregunta, cada uno responde a ciegas y eligen la que más les copa. Si ninguna tienta, otra ronda.",
    url: "#/decidir",
  },
  {
    id: "ideas",
    fecha: "2026-10-26",
    titulo: "💡 Ideas para cada plan",
    texto: "Todos los planes, viajes incluidos, tienen una lista de ideas que se va armando de a poco.",
    url: "#/planes",
  },
]

const CLAVE = "epe-novedades-app-vistas"

export function novedadesAppVistas(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || "[]")
  } catch {
    return NOVEDADES_APP.map((n) => n.id)
  }
}

export function marcarNovedadesAppVistas() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(NOVEDADES_APP.map((n) => n.id)))
  } catch {
    // sin almacenamiento: quedan como vistas sólo por esta vez
  }
}
