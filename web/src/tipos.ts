export type Estado = "idea" | "agendado" | "en_curso" | "hecho"
export type Personalidad = "cine" | "cocina" | "cafe" | "viaje" | "taller" | "salida"
export type Lista = "pasos" | "materiales" | "valija" | "itinerario" | "pedir" | "ideas"

interface Base {
  id: string
  collectionId: string
  collectionName: string
  created: string
  updated: string
}

export interface Usuario extends Base {
  name: string
  slug: string
  color: string
  letterboxd: string
  avatar: string
}

export interface Categoria extends Base {
  nombre: string
  slug: string
  emoji: string
  personalidad: Personalidad
  color: string
  orden: number
}

/** Lo propio de cada categoría. Todo opcional: se completa de a poco. */
export interface Datos {
  // pelis
  letterboxd?: string
  poster?: string
  anio?: string
  director?: string
  dondeVer?: string
  /** Promedio de Letterboxd (0 a 5), leído del link de la peli. */
  lbPromedio?: number
  // lugares (comida, café, salidas)
  maps?: string
  direccion?: string
  barrio?: string
  instagram?: string
  // viajes
  destino?: string
  pais?: string
  exterior?: boolean
  desde?: string
  hasta?: string
  // DIY: nombres de archivo dentro de `fotos`
  antes?: string
  despues?: string
  // vista previa del link
  imagen?: string
}

export interface Plan extends Base {
  titulo: string
  categoria: string
  estado: Estado
  notas: string
  link: string
  portada: string
  fotos: string[]
  datos: Datos | null
  cuando: string
  hecho_en: string
  creado_por: string
}

export interface Voto extends Base {
  plan: string
  usuario: string
  ganas: number
  puntaje: number
  resena: string
}

export interface Item extends Base {
  plan: string
  lista: Lista
  texto: string
  hecho: boolean
  orden: number
  dia: number
  /** En «Qué pedir», después de ir: ¿lo repetirían? */
  veredicto: "" | "repetir" | "pasar"
}

/** Una línea del diario de la app (la anotan los hooks del servidor). */
export interface Actividad {
  tipo:
    | "plan_nuevo" | "agendado" | "en_curso" | "hecho" | "a_idea" | "borrado"
    | "ganas" | "match" | "puntaje" | "resena" | "fotos" | "item_hecho"
  cuando: string
  plan: string
  titulo: string
  categoria: string
  usuario: string
  datos: Record<string, unknown>
}

/**
 * Un Wrapped: la foto congelada de un período (mitad o año entero) que arma
 * el servidor el 30/6 y el 31/12. Sólo se puede leer mientras está abierto.
 */
export interface Wrap extends Base {
  periodo: string
  tipo: "mitad" | "anio"
  anio: number
  desde: string
  hasta: string
  abre: string
  cierra: string
  datos: {
    generado: string
    usuarios: Usuario[]
    categorias: Categoria[]
    planes: Plan[]
    votos: Voto[]
    items: Item[]
    actividad: Actividad[]
    /** cuándo se hizo cada plan, desde el primero (para el ritmo) */
    historico: string[]
  }
}

export const ESTADOS: { id: Estado; nombre: string; emoji: string }[] = [
  { id: "idea", nombre: "Idea", emoji: "💡" },
  { id: "agendado", nombre: "Agendado", emoji: "📅" },
  { id: "en_curso", nombre: "En curso", emoji: "🚧" },
  { id: "hecho", nombre: "Hecho", emoji: "✅" },
]
