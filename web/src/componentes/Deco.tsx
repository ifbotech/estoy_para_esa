import { animate, motion, useMotionValue, useTransform } from "motion/react"
import { useEffect, useId, type CSSProperties, type ReactNode } from "react"
import { Asoma, type TipoArte } from "./Arte"

/** El papel de fondo: color plano con una pizca de grano. */
export function Fondo() {
  return <div className="fondo" aria-hidden />
}

const EASE = [0.25, 1, 0.5, 1] as const

/** Palabras que entran de a una con un tambaleo, como en Flying Papers. */
function Palabras({ texto, demora, inicio }: { texto: string; demora: number; inicio: number }) {
  return (
    <>
      {texto.split(" ").map((p, i) => (
        <motion.span
          key={i}
          className="palabra"
          initial={{ y: "0.6em", rotate: i % 2 ? 5 : -5, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: demora + (inicio + i) * 0.06 }}
        >
          {p}
        </motion.span>
      ))}
    </>
  )
}

/**
 * Título gigante condensado. Con `asoma`, un personaje se asoma por
 * detrás de la primera línea, agarrado de las letras.
 */
export function TituloCinetico({
  texto,
  lineas,
  asoma,
  className = "",
  demora = 0,
  como = "h1",
}: {
  texto?: string
  lineas?: string[]
  asoma?: TipoArte | "entrada"
  className?: string
  demora?: number
  como?: "h1" | "h2"
}) {
  const ls = lineas ?? [texto ?? ""]
  const Tag = como
  let i = 0
  return (
    <Tag className={`titulo ${className}`} aria-label={ls.join(" ")}>
      {ls.map((l, n) => {
        const inicio = i
        i += l.split(" ").length
        if (asoma && n === 0)
          return (
            <span key={n} className="t-linea t-ancla" aria-hidden>
              <Asoma tipo={asoma} ancho={84} />
              <span className="t-texto">
                <Palabras texto={l} demora={demora} inicio={inicio} />
              </span>
            </span>
          )
        return (
          <span key={n} className="t-linea" aria-hidden>
            <Palabras texto={l} demora={demora} inicio={inicio} />
          </span>
        )
      })}
    </Tag>
  )
}

/** Cinta que corre sin fin, torcida. */
export function Marquesina({ items, invertida = false, giro = -2, color }: { items: string[]; invertida?: boolean; giro?: number; color?: string }) {
  const texto = items.map((t) => `${t} ✦ `).join("")
  return (
    <div className={`marquesina ${invertida ? "inv" : ""}`} style={{ rotate: `${giro}deg`, "--cinta": color } as CSSProperties} aria-hidden>
      <div className="marquesina-pista">
        <span>{texto}</span>
        <span>{texto}</span>
      </div>
    </div>
  )
}

/** Sello redondo con texto en círculo que gira (como los parches de Kikin). */
export function Sello({ texto, children, tam = 110, color }: { texto: string; children?: ReactNode; tam?: number; color?: string }) {
  const id = useId().replace(/:/g, "")
  return (
    <motion.div
      className="sello"
      style={{ width: tam, height: tam, "--sello": color } as CSSProperties}
      initial={{ scale: 0, rotate: -120 }}
      animate={{ scale: 1, rotate: 8 }}
      transition={{ type: "spring", stiffness: 220, damping: 13, delay: 0.4 }}
      whileTap={{ scale: 0.9, rotate: 40 }}
    >
      <svg viewBox="0 0 100 100" className="sello-texto">
        <defs>
          <path id={id} d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
        </defs>
        <text>
          <textPath href={`#${id}`} startOffset="0" textLength={230} lengthAdjust="spacing">
            {texto}
          </textPath>
        </text>
      </svg>
      <div className="sello-centro">{children}</div>
    </motion.div>
  )
}

/** Globo de historieta («¡ESTOY PARA ESA!»). */
export function Estallido({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={`estallido ${className}`} style={style}>
      <span>{children}</span>
    </span>
  )
}

/** Palabra subrayada con resaltador. */
export function Resaltado({ children }: { children: ReactNode }) {
  return <span className="resaltado">{children}</span>
}

/** Subrayado hecho a mano que se dibuja solo (se mantiene por compatibilidad). */
export function Garabato({ color = "var(--a1)", className = "" }: { color?: string; className?: string }) {
  return (
    <svg className={`garabato ${className}`} viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden>
      <motion.path
        d="M4 20 C 60 4, 90 28, 150 14 S 240 4, 296 16"
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, delay: 0.6, ease: "easeInOut" }}
      />
    </svg>
  )
}

/** Número que cuenta hasta su valor. */
export function Contador({ valor, decimales = 0, duracion = 1.2 }: { valor: number; decimales?: number; duracion?: number }) {
  const mv = useMotionValue(0)
  const texto = useTransform(mv, (v) => v.toFixed(decimales).replace(".", ","))
  useEffect(() => {
    const c = animate(mv, valor, { duration: duracion, ease: EASE })
    return () => c.stop()
  }, [valor, duracion, mv])
  return <motion.span className="contador">{texto}</motion.span>
}
