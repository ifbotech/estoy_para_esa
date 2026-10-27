import { useEffect, useRef, type CSSProperties, type ReactElement } from "react"
import type { Personalidad } from "../tipos"

/**
 * Los personajes (v4, «Hecho a mano»): criaturas-mueble de cartel. Contorno
 * negro grueso, colores planos, formas blandas y torcidas (nunca un círculo
 * ni un cuadrado perfecto) y ojitos de plástico. No son la cosa: la
 * personalidad está en la forma y en la pose.
 *
 *   cine    el sillón monstruo, con los ojos altos y medio dormidos
 *   cocina  casi todo boca
 *   cafe    un charquito derretido de tan tranqui, con su vapor
 *   viaje   el que camina con muchas patas
 *   taller  un cubo torcido con una pata de bota
 *   salida  una nube en un palito: un globo (como el ícono)
 *
 * Los ojitos siguen el dedo (o el mouse) y se sacuden si los tocás. Nada se
 * mueve solo. `tam` escala como siempre: 6 × tam píxeles de ancho.
 */

const T = "#121211"
const B = "#FFFEFB"
const TRAZO = 4.5

const COLOR: Record<Personalidad, string> = {
  cine: "#FF5032",
  cocina: "#00C26E",
  cafe: "#FFB3CB",
  viaje: "#8EAEFF",
  taller: "#C3A0FF",
  salida: "#FFD93B",
}

export type TipoArte = Personalidad

const CONTORNO = { stroke: T, strokeWidth: TRAZO, strokeLinejoin: "round" as const, strokeLinecap: "round" as const }

/** Un ojito de plástico: blanco con borde y la pupila que se mueve. */
function Ojo({ x, y, r = 8 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={B} stroke={T} strokeWidth={3} />
      <circle className="pupila" cx={x} cy={y + r * 0.3} r={r * 0.46} fill={T} />
    </g>
  )
}

/** Ojos cerrados de gusto: dos «u» gruesas. */
function OjosU({ x, y, sep = 16, w = 8 }: { x: number; y: number; sep?: number; w?: number }) {
  return (
    <g fill="none" {...CONTORNO} strokeWidth={3.6}>
      {[-sep / 2, sep / 2].map((d, i) => (
        <path key={i} d={`M${x + d - w / 2} ${y} q${w / 2} ${w * 0.85} ${w} 0`} />
      ))}
    </g>
  )
}

// --- los personajes ----------------------------------------------------------

/** Cine en casa: el sillón monstruo, con los ojos altos y medio dormidos. */
function Sillon() {
  return (
    <svg viewBox="0 0 120 120">
      <path d="M30 92 L28 104 M92 92 L94 103" {...CONTORNO} strokeWidth={7} />
      <path
        d="M14 48 C12 38 20 32 30 35 C50 41 72 50 92 60 C104 66 108 76 106 86 C105 93 98 95 88 94 C66 93 44 94 24 93 C16 93 12 87 12 78 C12 68 15 58 14 48Z"
        fill={COLOR.cine}
        {...CONTORNO}
      />
      {/* el brazo del sillón, que también es una sonrisa */}
      <path d="M30 56 C36 70 46 80 62 82 C72 83 80 82 86 82" fill="none" {...CONTORNO} />
      {/* los ojos altos, inclinados, que se asoman por arriba */}
      <g transform="rotate(14 66 40)">
        <rect x={54} y={14} width={13} height={34} rx={6.5} fill={B} stroke={T} strokeWidth={3.4} />
        <rect x={69} y={14} width={13} height={34} rx={6.5} fill={B} stroke={T} strokeWidth={3.4} />
        <circle className="pupila" cx={61} cy={41} r={3.6} fill={T} />
        <circle className="pupila" cx={76} cy={41} r={3.6} fill={T} />
      </g>
    </svg>
  )
}

/** Gastronomía: casi todo boca. */
function Boca() {
  return (
    <svg viewBox="0 0 120 120">
      <path d="M44 98 L42 110 M78 98 L80 110" {...CONTORNO} strokeWidth={6} />
      <path
        d="M20 58 C16 36 34 18 58 18 C84 17 104 32 104 56 C105 80 90 100 62 100 C36 101 23 82 20 58Z"
        fill={COLOR.cocina}
        {...CONTORNO}
      />
      <Ojo x={48} y={34} r={7} />
      <Ojo x={68} y={33} r={7.5} />
      {/* la boca, enorme, con dientes y lengua */}
      <path d="M28 54 C40 58 78 58 94 52 C94 76 78 90 60 90 C42 90 30 76 28 54Z" fill={T} stroke={T} strokeWidth={3} strokeLinejoin="round" />
      <path d="M50 57.4 L50 64 C50 66 58 66 58 64 L58 57.8Z M60 57.8 L60 64 C60 66 68 66 68 64 L68 57.4Z" fill={B} stroke={T} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M44 82 C48 74 70 72 78 80 C72 87 52 89 44 82Z" fill="#FF7BA6" />
    </svg>
  )
}

/** Café: un charquito derretido de tan tranqui, con su vapor. */
function Charquito() {
  return (
    <svg viewBox="0 0 120 120">
      <g fill="none" {...CONTORNO} strokeWidth={3.6}>
        <path d="M48 44 c-6 -6 5 -10 0 -18" />
        <path d="M64 40 c-6 -6 5 -10 0 -18" />
      </g>
      <path
        d="M12 86 C10 74 22 70 30 72 C32 58 48 52 60 56 C72 50 90 56 92 68 C104 66 112 76 108 86 C106 96 94 98 82 97 C62 99 40 99 22 97 C14 96 12 92 12 86Z"
        fill={COLOR.cafe}
        {...CONTORNO}
      />
      <OjosU x={58} y={75} sep={18} w={9} />
      <path d="M52 86 q7 6 14 0" fill="none" {...CONTORNO} strokeWidth={3.4} />
      <path d="M24 92 c2 4 6 6 10 5" fill="none" {...CONTORNO} strokeWidth={3} />
    </svg>
  )
}

/** Viajes: el que camina con muchas patas, siempre yéndose. */
function Caminante() {
  return (
    <svg viewBox="0 0 120 120">
      <path
        d="M14 68 C12 40 34 18 62 18 C90 18 108 38 106 66 L108 98 C108 104 100 104 100 99 L96 72 L88 72 L90 102 C90 107 82 107 82 102 L78 72 L68 72 L68 104 C68 109 60 109 60 104 L58 72 L48 72 L44 102 C43 107 35 106 36 101 L38 72 L28 72 L22 98 C20 103 13 101 14 96Z"
        fill={COLOR.viaje}
        {...CONTORNO}
      />
      <Ojo x={74} y={42} r={7.5} />
      <Ojo x={93} y={44} r={6.5} />
      <path d="M78 58 q8 4 15 -1" fill="none" {...CONTORNO} strokeWidth={3.4} />
    </svg>
  )
}

/** DIY: un cubo torcido con una pata de bota. */
function Cubo() {
  return (
    <svg viewBox="0 0 120 120">
      {/* la pata, que sale por abajo */}
      <path
        d="M70 84 L74 100 C70 100 60 101 58 106 C57 110 62 111 66 110 L86 110 C90 110 91 106 89 102 L84 84Z"
        fill="#00C26E"
        {...CONTORNO}
      />
      <path
        d="M22 26 C40 22 70 21 94 24 C98 25 100 28 100 32 C101 52 101 72 99 88 C99 92 96 94 92 94 C70 95 44 96 24 94 C20 94 18 91 18 87 C17 68 17 48 18 31 C18 28 19 27 22 26Z"
        fill={COLOR.taller}
        {...CONTORNO}
      />
      <Ojo x={46} y={52} r={8} />
      <Ojo x={68} y={50} r={8} />
      <path d="M46 70 C52 78 64 78 70 70" fill="none" {...CONTORNO} strokeWidth={3.6} />
    </svg>
  )
}

/** Plancitos: una nube en un palito, que en realidad es un globo. */
function NubeEnPalito() {
  return (
    <svg viewBox="0 0 120 120">
      <path d="M58 82 C57 92 59 104 57 114 C56 117 62 117 63 114 C65 104 63 92 64 82Z" fill={COLOR.salida} {...CONTORNO} strokeWidth={4} />
      <path
        d="M30 74 C18 72 14 60 22 54 C14 46 20 34 30 36 C30 24 42 18 50 24 C54 14 70 14 74 24 C82 18 94 24 92 34 C102 36 106 48 98 54 C106 62 100 74 90 72 C90 82 78 86 70 80 C66 88 52 88 50 80 C42 86 30 84 30 74Z"
        fill={COLOR.salida}
        {...CONTORNO}
      />
      <OjosU x={61} y={50} sep={18} w={9} />
      <path d="M54 62 q7 7 14 0" fill="none" {...CONTORNO} strokeWidth={3.6} />
    </svg>
  )
}

const DIBUJOS: Record<TipoArte, () => ReactElement> = {
  cine: Sillon,
  cocina: Boca,
  cafe: Charquito,
  viaje: Caminante,
  taller: Cubo,
  salida: NubeEnPalito,
}

// --- los ojitos que siguen el dedo -------------------------------------------
// Un solo oyente para todos: guarda dónde está el dedo y, en el próximo
// cuadro, le dice a cada personaje para dónde mirar (variables --ox / --oy).

const vivos = new Set<HTMLElement>()
let dedo: { x: number; y: number } | null = null
let pendiente = false

function mirar() {
  pendiente = false
  if (!dedo) return
  for (const el of vivos) {
    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > innerHeight) continue
    const dx = dedo.x - (r.left + r.width / 2)
    const dy = dedo.y - (r.top + r.height / 2)
    const d = Math.hypot(dx, dy) || 1
    const k = Math.min(1, d / 160) * 2.6
    el.style.setProperty("--ox", ((dx / d) * k).toFixed(2))
    el.style.setProperty("--oy", ((dy / d) * k - 0.6).toFixed(2))
  }
}

function alMover(e: PointerEvent) {
  dedo = { x: e.clientX, y: e.clientY }
  if (!pendiente) {
    pendiente = true
    requestAnimationFrame(mirar)
  }
}

/** Un personaje. `vivo`: los ojitos siguen el dedo (por defecto, si es mediano o grande). */
export function Arte({
  tipo,
  tam = 16,
  vivo,
  style,
  className = "",
}: {
  tipo: TipoArte
  tam?: number
  vivo?: boolean
  style?: CSSProperties
  className?: string
}) {
  const Dibujo = DIBUJOS[tipo] ?? NubeEnPalito
  const ref = useRef<HTMLSpanElement>(null)
  const sigue = vivo ?? tam >= 8

  useEffect(() => {
    const el = ref.current
    if (!el || !sigue) return
    vivos.add(el)
    if (vivos.size === 1) addEventListener("pointermove", alMover, { passive: true })
    return () => {
      vivos.delete(el)
      if (!vivos.size) removeEventListener("pointermove", alMover)
    }
  }, [sigue])

  // tocarlo le sacude los ojos
  const sacudir = () => {
    const el = ref.current
    if (!el) return
    el.classList.remove("sacudon")
    void el.offsetWidth
    el.classList.add("sacudon")
  }

  return (
    <span
      ref={ref}
      className={`personaje personaje-${tipo} ${className}`}
      style={{ width: tam * 6, ...style } as CSSProperties}
      onPointerDown={sacudir}
      onAnimationEnd={() => ref.current?.classList.remove("sacudon")}
      aria-hidden
    >
      <Dibujo />
    </span>
  )
}
