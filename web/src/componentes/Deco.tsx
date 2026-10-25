import { animate, motion, useMotionValue, useTransform } from "motion/react"
import { useEffect, useId } from "react"

/** El fondo de toda la app: aurora de manchas que se mueven y grano de papel. */
export function Fondo() {
  return (
    <div className="fondo" aria-hidden>
      <div className="mancha m1" />
      <div className="mancha m2" />
      <div className="mancha m3" />
      <div className="mancha m4" />
      <div className="grano" />
    </div>
  )
}

/** Título con letras que saltan una por una y se mueven con el dedo. */
export function TituloCinetico({ texto, className = "", demora = 0 }: { texto: string; className?: string; demora?: number }) {
  const palabras = texto.split(" ")
  let i = 0
  return (
    <h1 className={`cinetico ${className}`} aria-label={texto}>
      {palabras.map((p, pi) => (
        <span className="palabra" key={pi} aria-hidden>
          {[...p].map((l) => {
            const k = i++
            return (
              <motion.span
                key={k}
                className="letra"
                style={{ "--i": k } as React.CSSProperties}
                initial={{ y: "110%", rotate: 20, opacity: 0 }}
                animate={{ y: 0, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 16, delay: demora + k * 0.045 }}
                whileTap={{ scale: 1.5, rotate: k % 2 ? 14 : -14, y: -10 }}
              >
                {l}
              </motion.span>
            )
          })}
        </span>
      ))}
    </h1>
  )
}

/** Cinta que corre sin fin, torcida. */
export function Marquesina({ items, invertida = false, giro = -3 }: { items: string[]; invertida?: boolean; giro?: number }) {
  const texto = items.map((t) => `${t} ✦ `).join("")
  return (
    <div className={`marquesina ${invertida ? "inv" : ""}`} style={{ rotate: `${giro}deg` }} aria-hidden>
      <div className="marquesina-pista">
        <span>{texto}</span>
        <span>{texto}</span>
        <span>{texto}</span>
      </div>
    </div>
  )
}

/** Sticker redondo con texto en círculo que gira, y algo en el medio. */
export function Sello({ texto, children, tam = 120 }: { texto: string; children?: React.ReactNode; tam?: number }) {
  const id = useId().replace(/:/g, "")
  return (
    <motion.div
      className="sello"
      style={{ width: tam, height: tam }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.5 }}
      whileTap={{ scale: 0.9, rotate: 30 }}
    >
      <svg viewBox="0 0 100 100" className="sello-texto">
        <defs>
          <path id={id} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text>
          <textPath href={`#${id}`} startOffset="0" textLength={236} lengthAdjust="spacing">
            {texto}
          </textPath>
        </text>
      </svg>
      <div className="sello-centro">{children}</div>
    </motion.div>
  )
}

/** Subrayado dibujado a mano que se traza solo. */
export function Garabato({ color = "var(--a2)", className = "" }: { color?: string; className?: string }) {
  return (
    <svg className={`garabato ${className}`} viewBox="0 0 300 30" preserveAspectRatio="none" aria-hidden>
      <motion.path
        d="M4 20 C 60 4, 90 28, 150 14 S 240 4, 296 16"
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, delay: 0.9, ease: "easeInOut" }}
      />
    </svg>
  )
}

/** Número que cuenta hasta su valor. */
export function Contador({ valor, decimales = 0, duracion = 1.2 }: { valor: number; decimales?: number; duracion?: number }) {
  const mv = useMotionValue(0)
  const texto = useTransform(mv, (v) => v.toFixed(decimales).replace(".", ","))
  useEffect(() => {
    const c = animate(mv, valor, { duration: duracion, ease: [0.2, 0.8, 0.2, 1] })
    return () => c.stop()
  }, [valor, duracion, mv])
  return <motion.span className="contador">{texto}</motion.span>
}
