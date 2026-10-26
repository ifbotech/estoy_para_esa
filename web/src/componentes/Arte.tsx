import { motion } from "motion/react"
import type { CSSProperties } from "react"
import type { Personalidad } from "../tipos"

/**
 * Los personajes-objeto de la v2: una cosa con cara por categoría
 * (pochoclo, empanada, taza, valija, lata de pintura y la entrada).
 * No son una mascota: son los planes mismos mirándote.
 *
 * `tam` escala como en la v1: el dibujo mide 6 × tam píxeles de ancho.
 */
const T = "#171313"

export type TipoArte = Personalidad | "estrella" | "sol"

function Ojos({ x, y, mira = 0, s = 1 }: { x: number; y: number; mira?: number; s?: number }) {
  const dx = 3 * mira
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className="ojos">
      {[-14, 14].map((cx) => (
        <g key={cx} className="ojo">
          <ellipse cx={cx} cy={0} rx={11} ry={14} fill="#fff" stroke={T} strokeWidth={4} />
          <ellipse cx={cx + 3 + dx} cy={-2} rx={5.5} ry={8} fill={T} />
          <circle cx={cx + 5 + dx} cy={-6} r={2.2} fill="#fff" />
        </g>
      ))}
    </g>
  )
}

function Pochoclo({ mira }: { mira: number }) {
  return (
    <svg viewBox="0 0 100 122">
      <g fill="#FBF6EE" stroke={T} strokeWidth={3.5}>
        <circle cx={30} cy={30} r={13} /><circle cx={50} cy={22} r={15} /><circle cx={70} cy={30} r={13} />
        <circle cx={40} cy={38} r={12} /><circle cx={62} cy={40} r={12} />
      </g>
      <path d="M18 42 h64 l-8 64 h-48z" fill="#fff" />
      <path d="M30 42 l4 64 M46 42 v64 M62 42 l-4 64" stroke="#E8432E" strokeWidth={7} />
      <path d="M18 42 h64 l-8 64 h-48z" fill="none" stroke={T} strokeWidth={4} strokeLinejoin="round" />
      <Ojos x={50} y={68} mira={mira} />
      <ellipse className="pie pie-i" cx={34} cy={114} rx={11} ry={6} fill={T} />
      <ellipse className="pie pie-d" cx={66} cy={114} rx={11} ry={6} fill={T} />
    </svg>
  )
}

function Empanada({ mira }: { mira: number }) {
  return (
    <svg viewBox="0 0 130 92">
      <path d="M10 70 a55 55 0 0 1 110 0z" fill="#F2B54A" stroke={T} strokeWidth={4} strokeLinejoin="round" />
      <path
        d="M16 62 q6 -8 12 -2 q6 -9 12 -2 q6 -9 12 -2 q6 -9 12 -2 q6 -9 12 -2 q6 -9 12 -2 q6 -9 12 -2 q6 -8 12 0"
        fill="none" stroke={T} strokeWidth={3} strokeLinecap="round"
      />
      <Ojos x={65} y={40} mira={mira} />
      <ellipse className="pie pie-i" cx={44} cy={82} rx={11} ry={6} fill={T} />
      <ellipse className="pie pie-d" cx={86} cy={82} rx={11} ry={6} fill={T} />
    </svg>
  )
}

function Taza({ mira }: { mira: number }) {
  return (
    <svg viewBox="0 0 110 110">
      <path className="vapor" d="M40 8 q-6 8 0 16 q6 8 0 16 M60 6 q-6 8 0 16 q6 8 0 16" fill="none" stroke={T} strokeWidth={3.5} strokeLinecap="round" />
      <path d="M78 54 h8 a12 12 0 0 1 0 24 h-8" fill="none" stroke={T} strokeWidth={5} />
      <path d="M14 46 h70 v34 a22 22 0 0 1 -22 22 h-26 a22 22 0 0 1 -22 -22z" fill="#fff" stroke={T} strokeWidth={4} strokeLinejoin="round" />
      <ellipse cx={49} cy={46} rx={35} ry={7} fill="#8A4B26" stroke={T} strokeWidth={4} />
      <Ojos x={49} y={74} mira={mira} />
    </svg>
  )
}

function Valija({ mira }: { mira: number }) {
  return (
    <svg viewBox="0 0 110 120">
      <path d="M40 22 v-10 a6 6 0 0 1 6 -6 h18 a6 6 0 0 1 6 6 v10" fill="none" stroke={T} strokeWidth={5} />
      <rect x={12} y={22} width={86} height={80} rx={12} fill="#F9CC73" stroke={T} strokeWidth={4} />
      <path d="M32 22 v80 M78 22 v80" stroke={T} strokeWidth={3} />
      <circle cx={88} cy={38} r={9} fill="#A9C3E0" stroke={T} strokeWidth={3} />
      <rect x={16} y={78} width={14} height={10} rx={2} fill="#E8432E" stroke={T} strokeWidth={2.5} transform="rotate(-12 23 83)" />
      <Ojos x={55} y={62} mira={mira} />
      <circle className="pie pie-i" cx={30} cy={110} r={7} fill={T} />
      <circle className="pie pie-d" cx={80} cy={110} r={7} fill={T} />
    </svg>
  )
}

function Lata({ mira }: { mira: number }) {
  return (
    <svg viewBox="0 0 100 120">
      <path d="M20 26 q30 -26 60 0" fill="none" stroke={T} strokeWidth={4} />
      <rect x={14} y={26} width={72} height={80} rx={8} fill="#fff" stroke={T} strokeWidth={4} />
      <path
        d="M14 34 h72 v16 q-8 10 -12 0 q-4 18 -10 0 q-6 12 -12 0 q-6 22 -12 0 q-6 10 -12 0 q-4 14 -14 4z"
        fill="#8584BD" stroke={T} strokeWidth={3.5} strokeLinejoin="round"
      />
      <Ojos x={50} y={80} mira={mira} />
      <ellipse className="pie pie-i" cx={34} cy={112} rx={10} ry={5.5} fill={T} />
      <ellipse className="pie pie-d" cx={66} cy={112} rx={10} ry={5.5} fill={T} />
    </svg>
  )
}

export function Entrada({ mira = 0, manos = true }: { mira?: number; manos?: boolean }) {
  return (
    <svg viewBox="0 0 140 102">
      <path
        d="M14 8 h112 a6 6 0 0 1 6 6 v20 a12 12 0 0 0 0 24 v34 h-124 v-34 a12 12 0 0 0 0 -24 v-20 a6 6 0 0 1 6 -6z"
        fill="#FBF6EE" stroke={T} strokeWidth={4} strokeLinejoin="round"
      />
      <path d="M100 12 v76" stroke={T} strokeWidth={3} strokeDasharray="5 6" />
      <text x={117} y={56} fontFamily="'Lilita One', sans-serif" fontSize={13} fill="#E8432E" transform="rotate(-90 117 52)">
        ¡SÍ!
      </text>
      <Ojos x={54} y={42} mira={mira} />
      <path d="M46 64 q8 7 16 0" fill="none" stroke={T} strokeWidth={4} strokeLinecap="round" />
      {manos && (
        <>
          <g fill="#fff" stroke={T} strokeWidth={3.5}>
            <rect x={16} y={84} width={30} height={16} rx={8} />
            <rect x={70} y={84} width={30} height={16} rx={8} />
          </g>
          <path d="M26 86 v8 M33 86 v8 M80 86 v8 M87 86 v8" stroke={T} strokeWidth={2.5} strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

function Estrella() {
  return (
    <svg viewBox="0 0 100 100">
      <path
        d="M50 4 l11 28 30 -6 -19 24 19 24 -30 -6 -11 28 -11 -28 -30 6 19 -24 -19 -24 30 6z"
        fill="#F2EA3A" stroke={T} strokeWidth={4} strokeLinejoin="round"
      />
    </svg>
  )
}

function Sol() {
  return (
    <svg viewBox="0 0 100 100">
      <g stroke={T} strokeWidth={3}>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M50 2 l6 18 h-12z" fill="#F9CC73" transform={`rotate(${i * 30} 50 50)`} />
        ))}
      </g>
      <circle cx={50} cy={50} r={26} fill="#F2EA3A" stroke={T} strokeWidth={4} />
      <Ojos x={50} y={50} s={0.7} />
    </svg>
  )
}

const DIBUJOS: Record<TipoArte, (p: { mira: number }) => React.ReactElement> = {
  cine: Pochoclo,
  cocina: Empanada,
  cafe: Taza,
  viaje: Valija,
  taller: Lata,
  salida: ({ mira }) => <Entrada mira={mira} manos={false} />,
  estrella: Estrella,
  sol: Sol,
}

/** Un personaje-objeto. `mira`: -1 a la izquierda, 0 al frente, 1 a la derecha. */
export function Arte({
  tipo,
  tam = 16,
  mira = 0,
  style,
  className = "",
}: {
  tipo: TipoArte
  tam?: number
  mira?: number
  style?: CSSProperties
  className?: string
}) {
  const Dibujo = DIBUJOS[tipo] ?? Estrella
  // Cada uno parpadea a su ritmo.
  const demora = ((tipo.charCodeAt(0) * 37 + tam * 13) % 40) / 10
  return (
    <span
      className={`personaje personaje-${tipo} ${className}`}
      style={{ width: tam * 6, "--parpadeo": `${-demora}s`, ...style } as CSSProperties}
      aria-hidden
    >
      <Dibujo mira={mira} />
    </span>
  )
}

/** Un personaje suelto que flota y se puede revolear con el dedo: vuelve solo. */
export function ArteFlotante({ tipo, tam, style, demora = 0 }: { tipo: TipoArte; tam?: number; style?: CSSProperties; demora?: number }) {
  return (
    <motion.div
      className="flotante"
      style={style}
      drag
      dragSnapToOrigin
      dragElastic={0.6}
      whileDrag={{ scale: 1.2, rotate: 10, zIndex: 20 }}
      whileTap={{ scale: 1.1 }}
      initial={{ opacity: 0, scale: 0, rotate: -30 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 14, delay: demora }}
    >
      <div className="flota" style={{ animationDelay: `${-demora * 3}s` }}>
        <Arte tipo={tipo} tam={tam} />
      </div>
    </motion.div>
  )
}

/**
 * La entrada (o el personaje que toque) asomándose entre dos líneas de un
 * título, agarrada del borde de la segunda. Se asoma una vez al entrar y
 * después de vez en cuando.
 */
export function Asoma({ tipo = "entrada", ancho = 110 }: { tipo?: TipoArte | "entrada"; ancho?: number }) {
  return (
    <span className="asoma" style={{ width: ancho }} aria-hidden>
      <span className="asoma-cuerpo">{tipo === "entrada" ? <Entrada /> : <Arte tipo={tipo} tam={ancho / 6} />}</span>
    </span>
  )
}
