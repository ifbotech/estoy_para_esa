import type { CSSProperties, ReactElement } from "react"
import type { Personalidad } from "../tipos"

/**
 * Los personajes: uno por personalidad, de caricatura orgánica. Cuerpos de un
 * solo color, blandos y un poco torcidos (nunca un círculo ni un cuadrado
 * perfecto), patitas y brazos de línea fina con manos de mitón y caras
 * mínimas. No son la cosa (ni pochoclo ni valija): la personalidad está en
 * la pose. Son un detalle quieto, siempre adentro de un bloque.
 *
 *   cine    el que mira: tirado para atrás, hipnotizado, con un rulo de ideas
 *   cocina  el que tiene hambre: ancho, a carcajadas, con la baba a punto
 *   cafe    el tranqui: un garabato tibio, ojos cerrados y vapor
 *   viaje   el que se va: alto, a paso largo, saludando
 *   taller  el que hace: grumoso, vincha y gota, manos a la obra
 *   salida  el que flota: un globo con patitas colgando (como el ícono)
 *
 * `tam` escala como antes: el dibujo mide 6 × tam píxeles de ancho.
 */

const T = "#121211"
const P = "#FFFDF9"

// Cada personaje trae su color: contrasta con el de su categoría, que va de fondo.
const COLOR: Record<Personalidad, string> = {
  cine: "#F7CF45",
  cocina: "#4FAD5B",
  cafe: "#3D63D6",
  viaje: "#F2609F",
  taller: "#F28A2E",
  salida: "#B9E26E",
}

export type TipoArte = Personalidad

// --- formas orgánicas --------------------------------------------------------

/** Un número que siempre es el mismo para la misma semilla (de 0 a 1). */
function azar(semilla: number) {
  const x = Math.sin(semilla * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Un contorno blando: un círculo de radios `rx` × `ry` deformado por
 * `lobulos` ondas y un poco de ruido, cerrado con curvas suaves. Con la
 * misma semilla sale siempre igual.
 */
function blob(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  { lobulos = 0, onda = 0, ruido = 0.06, semilla = 1, puntos = 10, giro = 0 }: { lobulos?: number; onda?: number; ruido?: number; semilla?: number; puntos?: number; giro?: number } = {},
) {
  const pts: [number, number][] = []
  for (let i = 0; i < puntos; i++) {
    const a = (i / puntos) * Math.PI * 2 + giro
    const k = 1 + onda * Math.sin(lobulos * a + semilla) + ruido * (azar(semilla * 31 + i) * 2 - 1)
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return cerrar(pts)
}

/** Curva suave que pasa por todos los puntos (Catmull-Rom a Bézier), cerrada. */
function cerrar(pts: [number, number][], tension = 1) {
  const n = pts.length
  const f = (v: number) => Math.round(v * 10) / 10
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension]
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension]
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + "Z"
}

// --- piezas ------------------------------------------------------------------

const LINEA = { stroke: T, strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" }

/** Una manito de mitón (palma y pulgar), hacia `ang` grados. */
function Mano({ x, y, ang = 90, s = 1 }: { x: number; y: number; ang?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${ang}) scale(${s})`} {...LINEA} strokeWidth={2.2}>
      <path d="M2.5 -3 C1.5 -6.5 -1.6 -6.4 -1.2 -3.4" fill={P} />
      <path d="M0 -3.6 C4 -5.6 9.6 -4.4 9.8 0 C10 4.4 4 5.6 0 3.6 C-1.4 1.6 -1.4 -1.6 0 -3.6Z" fill={P} />
    </g>
  )
}

/** Un pie chiquito: la patita termina en una bota redonda hacia `lado`. */
function Pie({ x, y, lado = 1 }: { x: number; y: number; lado?: 1 | -1 }) {
  const l = lado
  return <path d={`M${x} ${y} c${2 * l} -3 ${9 * l} -3 ${10 * l} 0 c0 2 ${-3 * l} 3 ${-10 * l} 2`} {...LINEA} fill={P} strokeWidth={2.4} />
}

/** Ojos abiertos: blanco chico y pupila que mira hacia `mx`, `my`. */
function Ojos({ x, y, sep = 12, r = 4.6, mx = 0, my = 0 }: { x: number; y: number; sep?: number; r?: number; mx?: number; my?: number }) {
  return (
    <g>
      {[-sep / 2, sep / 2].map((d, i) => (
        <g key={i}>
          <ellipse cx={x + d} cy={y} rx={r} ry={r * 1.08} fill={P} stroke={T} strokeWidth={2} />
          <circle cx={x + d + mx * r * 0.42} cy={y + my * r * 0.42} r={r * 0.5} fill={T} />
        </g>
      ))}
    </g>
  )
}

/** Ojos cerrados de gusto: dos «u». */
function OjosU({ x, y, sep = 12, w = 6 }: { x: number; y: number; sep?: number; w?: number }) {
  return (
    <g {...LINEA}>
      {[-sep / 2, sep / 2].map((d, i) => (
        <path key={i} d={`M${x + d - w / 2} ${y} q${w / 2} ${w * 0.8} ${w} 0`} />
      ))}
    </g>
  )
}

/** Un destello de cuatro puntas, blando. */
function Destello({ x, y, r = 5, color = P }: { x: number; y: number; r?: number; color?: string }) {
  const k = r * 0.22
  return (
    <path
      d={`M${x} ${y - r} C${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y} C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r} C${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y} C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r}Z`}
      fill={color}
      stroke={T}
      strokeWidth={1.6}
      strokeLinejoin="round"
    />
  )
}

// --- los personajes ----------------------------------------------------------

type Props = { mira: number }

/** Cine: sentado tirado para atrás, mirando la pantalla, con el rulo de la peli en la cabeza. */
function ElQueMira({ mira }: Props) {
  const c = COLOR.cine
  return (
    <svg viewBox="0 0 120 120">
      {/* sentado en el piso, con las patitas estiradas */}
      <path d="M52 88 C42 92 30 96 20 97" {...LINEA} />
      <path d="M60 94 C52 100 42 104 30 106" {...LINEA} />
      <Pie x={20} y={97} lado={-1} />
      <Pie x={30} y={106} lado={-1} />
      <path d={blob(68, 58, 30, 34, { lobulos: 2, onda: 0.05, ruido: 0.07, semilla: 3, giro: 0.4 })} fill={c} transform="rotate(-16 68 58)" />
      {/* el brazo cae y la mano se apoya */}
      <path d="M95 66 C99 76 100 86 98 96" {...LINEA} />
      <Mano x={98} y={96} ang={100} />
      <Ojos x={74} y={48} sep={13} mx={0.7 + mira * 0.3} my={-0.7} />
      <path d="M70 63 C75 62 80 62 84 61" {...LINEA} />
      {/* el rulo: la peli le dio vueltas a la cabeza */}
      <path d="M58 24 c-9 -9 3 -17 9 -9 c5 7 -8 9 -5 0 c3 -10 19 -10 18 0 c-1 7 -11 5 -7 -3 c4 -8 17 -7 16 3" {...LINEA} strokeWidth={2.4} />
    </svg>
  )
}

/** Cocina: ancho y grumoso, muerto de risa y de hambre. */
function ElQueTieneHambre({ mira }: Props) {
  const c = COLOR.cocina
  return (
    <svg viewBox="0 0 120 120">
      <path d="M48 96 L44 108" {...LINEA} />
      <path d="M74 96 L78 108" {...LINEA} />
      <Pie x={44} y={108} lado={-1} />
      <Pie x={78} y={108} />
      <path d={blob(60, 64, 46, 36, { lobulos: 5, onda: 0.07, ruido: 0.05, semilla: 7, puntos: 14 })} fill={c} />
      {/* se agarra la panza */}
      <path d="M22 66 C26 78 34 84 42 84" {...LINEA} />
      <Mano x={43} y={84} ang={0} />
      <path d="M98 64 C96 76 88 84 79 85" {...LINEA} />
      <Mano x={79} y={85} ang={180} />
      <g {...LINEA}>
        <path d={`M${44 + mira * 2} 52 q5 -7 10 0`} />
        <path d={`M${66 + mira * 2} 50 q5 -7 10 0`} />
      </g>
      {/* la boca abierta y la lengua */}
      <path d="M45 61 C48 79 74 80 79 60 C68 63 56 63 45 61Z" fill={T} />
      <path d="M55 72 C58 68 66 68 69 72 C66 75 58 75 55 72Z" fill="#F28C9B" />
      {/* la baba */}
      <path d="M48 68 c-1 4 -2 8 0 10 c2 2 5 0 4 -3 c-1 -2 -2 -4 -4 -7Z" fill={P} stroke={T} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  )
}

/** Café: un garabato tibio con los ojos cerrados y el vapor arriba. */
function ElTranqui({ mira }: Props) {
  const c = COLOR.cafe
  return (
    <svg viewBox="0 0 120 120">
      <g {...LINEA} strokeWidth={2.4}>
        <path d="M46 26 c-5 -6 4 -9 0 -16" />
        <path d="M60 22 c-5 -6 4 -9 0 -16" />
        <path d="M74 26 c-5 -6 4 -9 0 -16" />
      </g>
      {/* el cuerpo es un solo trazo grueso que da vueltas, como un garabato */}
      <path
        d="M20 66 C14 50 28 36 40 44 C50 51 40 64 33 56 C26 46 44 30 58 36 C70 41 60 56 54 47 C47 36 66 26 80 34 C92 41 82 56 76 47 C70 37 94 34 100 50 C106 66 90 72 88 62 C86 52 104 58 100 74 C96 90 78 92 72 82 C68 92 50 96 42 86 C30 94 16 84 22 72"
        fill="none"
        stroke={c}
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <OjosU x={60 + mira * 2} y={64} sep={14} w={7} />
      <path d={`M${50 + mira * 2} 72 q10 10 20 0`} {...LINEA} />
      <Destello x={102} y={34} r={5} color="#F7CF45" />
    </svg>
  )
}

/** Viaje: alto y flaco, a paso largo, saludando al que se queda. */
function ElQueSeVa({ mira }: Props) {
  const c = COLOR.viaje
  return (
    <svg viewBox="0 0 120 120">
      <g {...LINEA} strokeWidth={2.2} opacity={0.9}>
        <path d="M14 52 h12 M10 62 h14 M16 72 h9" />
      </g>
      <path d="M52 90 L40 108" {...LINEA} />
      <path d="M70 90 L84 106" {...LINEA} />
      <Pie x={40} y={108} lado={-1} />
      <Pie x={84} y={106} />
      <path
        d="M44 92 C36 70 36 40 46 26 C56 12 78 10 86 24 C94 38 92 66 86 92 C76 96 56 97 44 92Z"
        fill={c}
        transform="rotate(8 64 56)"
      />
      {/* saluda con una mano y la otra va para atrás */}
      <path d="M90 46 C98 40 102 32 104 24" {...LINEA} />
      <Mano x={104} y={22} ang={-75} />
      <path d="M40 58 C34 64 30 70 28 76" {...LINEA} />
      <Mano x={28} y={78} ang={110} />
      <Ojos x={72} y={40} sep={12} r={4.4} mx={0.9 + mira * 0.1} my={0} />
      <path d="M68 52 q6 5 12 -1" {...LINEA} />
    </svg>
  )
}

/** Taller: grumoso como una flor, con vincha, una gota y las manos arriba. */
function ElQueHace({ mira }: Props) {
  const c = COLOR.taller
  return (
    <svg viewBox="0 0 120 120">
      <path d="M50 96 L48 110" {...LINEA} />
      <path d="M70 96 L72 110" {...LINEA} />
      <Pie x={48} y={110} lado={-1} />
      <Pie x={72} y={110} />
      <path d={blob(60, 60, 40, 39, { lobulos: 5, onda: 0.13, ruido: 0.04, semilla: 11, puntos: 20, giro: -0.3 })} fill={c} />
      {/* la vincha */}
      <path d="M24 44 C40 36 80 34 96 42 L95 50 C80 43 40 45 25 52Z" fill={P} stroke={T} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M26 48 C42 41 78 40 95 46" stroke="#E8432E" strokeWidth={2.4} fill="none" />
      {/* brazos arriba: ¡a laburar! */}
      <path d="M24 66 C14 60 10 50 12 40" {...LINEA} />
      <Mano x={12} y={38} ang={-100} />
      <path d="M96 66 C106 60 110 50 108 40" {...LINEA} />
      <Mano x={108} y={38} ang={-80} />
      <Ojos x={58} y={62} sep={13} r={4.3} mx={mira * 0.6} my={0.2} />
      <path d="M48 76 q8 7 18 -1" {...LINEA} />
      <path d="M66 75 l3 -2" {...LINEA} strokeWidth={2.4} />
      {/* la gota */}
      <path d="M86 58 c2 4 5 8 3 11 c-2 3 -7 2 -7 -2 c0 -3 2 -6 4 -9Z" fill="#A9C3E0" stroke={T} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  )
}

/** Plancitos: un globo con patitas colgando, feliz, como el del ícono. */
function ElQueFlota({ mira }: Props) {
  const c = COLOR.salida
  return (
    <svg viewBox="0 0 120 120">
      {/* el hilo, con su rulito */}
      <path d="M60 80 C60 88 52 92 54 98 C56 104 66 100 62 94 C58 88 52 104 58 116" {...LINEA} strokeWidth={2.2} />
      {/* patitas colgando, sueltas */}
      <path d="M48 76 C46 84 46 90 44 96" {...LINEA} />
      <path d="M72 76 C74 84 76 88 78 94" {...LINEA} />
      <Pie x={44} y={96} lado={-1} />
      <Pie x={78} y={94} />
      <path d="M54 83 C56 78 64 78 66 83 C62 85 58 85 54 83Z" fill={c} />
      <path d={blob(60, 44, 34, 37, { lobulos: 3, onda: 0.04, ruido: 0.05, semilla: 5, puntos: 12, giro: 1 })} fill={c} />
      {/* brazos abiertos de gusto */}
      <path d="M28 46 C20 44 14 38 12 32" {...LINEA} />
      <Mano x={11} y={30} ang={-120} />
      <path d="M92 48 C100 46 106 40 108 34" {...LINEA} />
      <Mano x={109} y={32} ang={-60} />
      <OjosU x={60 + mira * 2} y={42} sep={14} w={7} />
      <path d={`M${50 + mira * 2} 50 q10 10 20 0`} {...LINEA} />
      <path d="M44 24 C48 18 54 15 60 15" stroke={P} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.9} />
      <Destello x={100} y={14} r={5} color="#F7CF45" />
      <Destello x={18} y={62} r={3.5} />
    </svg>
  )
}

const DIBUJOS: Record<TipoArte, (p: Props) => ReactElement> = {
  cine: ElQueMira,
  cocina: ElQueTieneHambre,
  cafe: ElTranqui,
  viaje: ElQueSeVa,
  taller: ElQueHace,
  salida: ElQueFlota,
}

/** Un personaje. `mira`: -1 a la izquierda, 0 al frente, 1 a la derecha. */
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
  const Dibujo = DIBUJOS[tipo] ?? ElQueFlota
  return (
    <span className={`personaje personaje-${tipo} ${className}`} style={{ width: tam * 6, ...style } as CSSProperties} aria-hidden>
      <Dibujo mira={mira} />
    </span>
  )
}
