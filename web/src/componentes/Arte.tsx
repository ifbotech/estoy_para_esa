import { motion } from "motion/react"
import type { CSSProperties } from "react"
import type { Personalidad } from "../tipos"

/**
 * Dibujos hechos sólo con CSS (degradés, sombras y pseudo-elementos), a la
 * manera de a.singlediv.com. Se escalan con el tamaño de letra: todo está en em.
 */
export function Arte({ tipo, tam = 16, style, className = "" }: { tipo: Personalidad | "estrella" | "sol"; tam?: number; style?: CSSProperties; className?: string }) {
  const comun = { className: `arte arte-${tipo} ${className}`, style: { fontSize: tam, ...style }, "aria-hidden": true }
  switch (tipo) {
    case "cafe":
      return (
        <div {...comun}>
          <i className="vapor v1" />
          <i className="vapor v2" />
          <i className="vapor v3" />
          <b className="taza" />
          <b className="plato" />
        </div>
      )
    case "cocina":
      return (
        <div {...comun}>
          <i className="vapor v1" />
          <i className="vapor v2" />
          <b className="plato-fideos" />
          <b className="tenedor" />
        </div>
      )
    case "cine":
      return (
        <div {...comun}>
          <b className="claqueta-palo" />
          <b className="claqueta-cuerpo" />
        </div>
      )
    case "viaje":
      return (
        <div {...comun}>
          <b className="estela" />
          <b className="avion" />
        </div>
      )
    case "taller":
      return (
        <div {...comun}>
          <b className="martillo" />
          <b className="clavo" />
        </div>
      )
    case "salida":
      return (
        <div {...comun}>
          <b className="globo g1" />
          <b className="globo g2" />
          <b className="globo g3" />
        </div>
      )
    case "estrella":
      return <div {...comun} />
    case "sol":
      return <div {...comun} />
  }
}

/** Un dibujo que flota y que se puede revolear con el dedo: vuelve solo. */
export function ArteFlotante({
  tipo,
  tam,
  style,
  demora = 0,
}: {
  tipo: Personalidad | "estrella" | "sol"
  tam?: number
  style?: CSSProperties
  demora?: number
}) {
  return (
    <motion.div
      className="flotante"
      style={style}
      drag
      dragSnapToOrigin
      dragElastic={0.6}
      whileDrag={{ scale: 1.25, rotate: 12, zIndex: 20 }}
      whileTap={{ scale: 1.15 }}
      initial={{ opacity: 0, scale: 0, rotate: -40 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 14, delay: demora }}
    >
      <div className="flota" style={{ animationDelay: `${-demora * 3}s` }}>
        <Arte tipo={tipo} tam={tam} />
      </div>
    </motion.div>
  )
}
