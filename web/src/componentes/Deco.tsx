import { animate, motion, useMotionValue, useTransform } from "motion/react"
import { useEffect, type CSSProperties, type ReactNode } from "react"
import { SIMETRIAS, simetria } from "../calculos"
import type { Voto } from "../tipos"

/**
 * Las piezas del sistema neo-brutalista: bloques con cabezal numerado,
 * barras segmentadas, sellos rectos y números tabulares. Nada se mueve solo.
 */

/** Un bloque de la grilla: cabezal en mayúsculas con número y una acción opcional. */
export function Bloque({
  numero,
  titulo,
  accion,
  children,
  className = "",
  style,
}: {
  numero?: string
  titulo: ReactNode
  accion?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <section className={`bloque ${className}`} style={style}>
      <header className="bloque-cabeza">
        {numero && <span className="bloque-num">{numero}</span>}
        <h2 className="bloque-titulo">{titulo}</h2>
        {accion && <span className="bloque-accion">{accion}</span>}
      </header>
      <div className="bloque-cuerpo">{children}</div>
    </section>
  )
}

/** Barra segmentada en bloques sólidos: [■■■□]. Cierra ciclos a la vista. */
export function Segmentos({ hechos, total, etiqueta, max = 16 }: { hechos: number; total: number; etiqueta?: ReactNode; max?: number }) {
  if (!total) return null
  // con muchos ítems, los segmentos se agrupan para que entren en una línea
  const n = Math.min(total, max)
  const llenos = total <= max ? hechos : Math.round((hechos / total) * n)
  return (
    <div className={`segmentos ${hechos >= total ? "completo" : ""}`}>
      <div className="segmentos-barra" role="img" aria-label={`${hechos} de ${total}`}>
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={i < llenos ? "lleno" : ""} />
        ))}
      </div>
      {etiqueta !== undefined && (
        <span className="segmentos-texto num">
          {etiqueta}
        </span>
      )}
    </div>
  )
}

/** La etiqueta de simetría de un plan: 🔥 MATCH, 🤝 CONSENSO o 🎁 POR AMOR AL ARTE. */
export function EtiquetaSimetria({ votos, chica = false }: { votos: Voto[]; chica?: boolean }) {
  const s = simetria(votos)
  if (!s) return null
  const info = SIMETRIAS[s]
  return (
    <span className={`simetria simetria-${s} ${chica ? "chica" : ""}`} title={info.texto}>
      <span aria-hidden>{info.emoji}</span> {info.etiqueta}
    </span>
  )
}

/** Sello rectangular de goma, recto: [ ¡MATCH TOTAL! 🔥 ]. */
export function Sello({ children, tono = "rojo" }: { children: ReactNode; tono?: "rojo" | "verde" | "tinta" }) {
  return <span className={`sello sello-${tono}`}>{children}</span>
}

/** Indicador de tiempo real: un punto lleno si hay conexión. */
export function EnVivo({ conectado }: { conectado: boolean }) {
  return (
    <span className={`en-vivo ${conectado ? "si" : "no"}`} title={conectado ? "Sincronizado en vivo" : "Sin conexión: se guarda y se manda al volver"}>
      <i aria-hidden /> {conectado ? "en vivo" : "sin señal"}
    </span>
  )
}

/** Número que cuenta hasta su valor (una sola vez, al aparecer). */
export function Contador({ valor, decimales = 0, duracion = 0.9 }: { valor: number; decimales?: number; duracion?: number }) {
  const mv = useMotionValue(0)
  const texto = useTransform(mv, (v) => v.toFixed(decimales).replace(".", ","))
  useEffect(() => {
    const c = animate(mv, valor, { duration: duracion, ease: [0.25, 1, 0.5, 1] })
    return () => c.stop()
  }, [valor, duracion, mv])
  return <motion.span className="num">{texto}</motion.span>
}
