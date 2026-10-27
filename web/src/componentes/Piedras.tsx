import { useRef, type CSSProperties, type ReactNode } from "react"

/**
 * Las piedras de Decidir: piedras de verdad, orgánicas, con ojitos de plástico
 * y grafiti pintado con aerosol (como las de la referencia). Usan los filtros
 * y degradés de `FiltrosAerosol` (#piedra, #aerosol, #ojo-plastico,
 * #piedra-sombra).
 *
 *   PiedraQueGira  la respuesta de cada uno: de frente tiene cara (dormida si
 *                  esa persona todavía no respondió) y, dada vuelta, la
 *                  respuesta grafiteada.
 *   PiedraChica    las de la pila de lo decidido.
 */

function azar(semilla: number) {
  const x = Math.sin(semilla * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * El contorno de una piedra: pocos puntos y bien desparejos, para que tenga
 * bultos y caras planas (no un óvalo), con la panza apoyada abajo.
 */
export function formaPiedra(w: number, h: number, semilla = 1) {
  const n = 9
  const cx = w / 2
  const cy = h / 2 + 2
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2 + azar(semilla * 7) * 0.6
    const k = 0.8 + 0.22 * azar(semilla * 13 + i * 3)
    // abajo más chata: la piedra apoya
    const aplasta = Math.sin(a) > 0.55 ? 0.9 : 1
    pts.push([cx + Math.cos(a) * (w / 2) * k, cy + Math.sin(a) * (h / 2) * k * aplasta])
  }
  const f = (v: number) => Math.round(v * 10) / 10
  const t = 0.82 // menos tensión: más facetas, menos óvalo
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]]
    d += ` C${f(p1[0] + ((p2[0] - p0[0]) / 6) * t)} ${f(p1[1] + ((p2[1] - p0[1]) / 6) * t)} ${f(p2[0] - ((p3[0] - p1[0]) / 6) * t)} ${f(p2[1] - ((p3[1] - p1[1]) / 6) * t)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + "Z"
}

/** La piedra sola: textura, sombra de abajo, brillo de costado y su sombra en el piso. */
function Roca({ w, h, semilla }: { w: number; h: number; semilla: number }) {
  const d = formaPiedra(w - 10, h - 10, semilla)
  return (
    <g>
      {/* la sombra en el piso, justo debajo de la panza de la piedra */}
      <ellipse cx={w / 2 + 3} cy={(h - 10) / 2 + 2 + (h - 10) * 0.39} rx={w * 0.34} ry={5} fill="rgb(18 18 17 / 0.24)" />
      <g transform="translate(5 0)">
        <path d={d} fill="var(--piedra)" filter="url(#piedra)" />
        <path d={d} fill="url(#piedra-sombra)" />
        <path d={d} fill="none" stroke="rgb(18 18 17 / 0.4)" strokeWidth={1.4} />
      </g>
    </g>
  )
}

/** Un ojito de plástico: blanco con brillo y la pupila caída por la gravedad. */
function Ojito({ x, y, r = 11, cerrado = false }: { x: number; y: number; r?: number; cerrado?: boolean }) {
  if (cerrado) {
    return <path d={`M${x - r * 0.8} ${y} q${r * 0.8} ${r * 0.7} ${r * 1.6} 0`} fill="none" stroke="var(--tinta)" strokeWidth={3.4} strokeLinecap="round" filter="url(#aerosol)" />
  }
  return (
    <g>
      <circle cx={x + 1} cy={y + 2} r={r} fill="rgb(18 18 17 / 0.28)" />
      <circle cx={x} cy={y} r={r} fill="url(#ojo-plastico)" stroke="rgb(18 18 17 / 0.55)" strokeWidth={1.2} />
      <circle className="pupila" cx={x + r * 0.08} cy={y + r * 0.4} r={r * 0.52} fill="var(--tinta)" />
      <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.18} fill="#fff" opacity={0.9} />
    </g>
  )
}

/** El grafiti de la cara: cuatro estilos, pintados con el color de quien es. */
function Grafiti({ variante, color, cx, cy }: { variante: number; color: string; cx: number; cy: number }) {
  const pinta = { filter: "url(#aerosol)" }
  switch (variante % 4) {
    case 0: // un tag de contorno alrededor de los ojos
      return (
        <g {...pinta} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${cx - 40} ${cy - 2} C${cx - 44} ${cy - 22} ${cx - 10} ${cy - 26} ${cx + 4} ${cy - 18} C${cx + 22} ${cy - 30} ${cx + 46} ${cy - 16} ${cx + 38} ${cy + 4} C${cx + 46} ${cy + 22} ${cx + 10} ${cy + 30} ${cx - 6} ${cy + 22} C${cx - 26} ${cy + 32} ${cx - 48} ${cy + 18} ${cx - 40} ${cy - 2}Z`} stroke={color} strokeWidth={5} />
          <path d={`M${cx - 26} ${cy + 20} c4 -8 10 -6 8 2 c-2 6 6 6 9 -2 c3 -8 10 -4 7 4 c-2 5 6 6 10 -1`} stroke="var(--tinta)" strokeWidth={2.6} />
        </g>
      )
    case 1: // una cara pintada sobre un círculo de color
      return (
        <g {...pinta}>
          <ellipse cx={cx} cy={cy + 2} rx={36} ry={32} fill={color} />
          <path d={`M${cx - 26} ${cy - 18} l14 6 M${cx + 26} ${cy - 18} l-14 6`} stroke="var(--tinta)" strokeWidth={4} strokeLinecap="round" />
          <path d={`M${cx - 12} ${cy + 22} q12 -9 24 0`} fill="none" stroke="var(--tinta)" strokeWidth={4} strokeLinecap="round" />
        </g>
      )
    case 2: // un corazón abajo
      return (
        <g {...pinta}>
          <path d={`M${cx} ${cy + 36} C${cx - 30} ${cy + 18} ${cx - 34} ${cy + 2} ${cx - 22} ${cy - 2} C${cx - 12} ${cy - 5} ${cx - 4} ${cy + 2} ${cx} ${cy + 8} C${cx + 4} ${cy + 2} ${cx + 12} ${cy - 5} ${cx + 22} ${cy - 2} C${cx + 34} ${cy + 2} ${cx + 30} ${cy + 18} ${cx} ${cy + 36}Z`} fill={color} />
          <path d={`M${cx - 10} ${cy + 16} h20`} stroke="var(--tinta)" strokeWidth={3} strokeLinecap="round" />
        </g>
      )
    default: // un garabato con chorreada y una coronita
      return (
        <g {...pinta} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${cx - 36} ${cy + 18} C${cx - 20} ${cy + 4} ${cx - 8} ${cy + 30} ${cx + 6} ${cy + 16} C${cx + 18} ${cy + 4} ${cx + 30} ${cy + 26} ${cx + 38} ${cy + 12}`} stroke={color} strokeWidth={7} />
          <path d={`M${cx - 4} ${cy + 22} v10`} stroke={color} strokeWidth={3} />
          <path d={`M${cx - 14} ${cy - 24} l4 -10 l6 7 l6 -9 l5 10 l5 -6 l2 10Z`} stroke="var(--tinta)" strokeWidth={2.6} />
        </g>
      )
  }
}

const W = 160
const H = 132

/** El frente: la piedra con cara. Dormida si esa persona todavía no respondió. */
function Frente({ semilla, color, dormida }: { semilla: number; color: string; dormida: boolean }) {
  const cx = W / 2 + 2
  const cy = H / 2 - 4
  return (
    <svg viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <Roca w={W} h={H} semilla={semilla} />
      {!dormida && <Grafiti variante={semilla} color={color} cx={cx} cy={cy} />}
      <Ojito x={cx - 15} y={cy - 6} r={12} cerrado={dormida} />
      <Ojito x={cx + 15} y={cy - 8} r={11} cerrado={dormida} />
      {dormida && (
        <text x={cx + 26} y={cy - 22} fontFamily="'Bricolage Grotesque Variable', sans-serif" fontWeight={800} fontSize={16} fill={color} filter="url(#aerosol)">
          z z
        </text>
      )}
    </svg>
  )
}

/** El dorso: la respuesta grafiteada sobre una mancha del color de quien la escribió. */
function Dorso({ semilla, color, texto }: { semilla: number; color: string; texto: string }) {
  const cx = W / 2 + 2
  const cy = H / 2 - 2
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden>
        <Roca w={W} h={H} semilla={semilla + 101} />
        <ellipse cx={cx} cy={cy} rx={50} ry={34} fill={color} filter="url(#aerosol)" />
      </svg>
      <span className="piedra-respuesta" style={{ fontSize: texto.length > 24 ? 14 : texto.length > 12 ? 17 : 21 }}>
        {texto}
      </span>
    </>
  )
}

/**
 * La piedra de una respuesta. De frente tiene cara; dada vuelta, la respuesta.
 * El giro es en 3D (y sin movimiento, si el teléfono lo pide).
 */
export function PiedraQueGira({
  semilla,
  color,
  dormida = false,
  texto,
  girada,
  etiqueta,
  marca,
  onTocar,
  aria,
}: {
  semilla: number
  color: string
  dormida?: boolean
  texto?: string
  girada: boolean
  etiqueta: ReactNode
  marca?: ReactNode
  onTocar?: (ev: React.MouseEvent) => void
  aria: string
}) {
  const ref = useRef<HTMLButtonElement>(null)
  // tocarla siempre le sacude los ojitos (aunque no se pueda dar vuelta)
  const tocar = (ev: React.MouseEvent) => {
    const el = ref.current
    if (el) {
      el.classList.remove("sacudon")
      void el.offsetWidth
      el.classList.add("sacudon")
    }
    onTocar?.(ev)
  }
  return (
    <button ref={ref} className={`piedra-gira ${girada ? "girada" : ""}`} onClick={tocar} aria-label={aria} onAnimationEnd={() => ref.current?.classList.remove("sacudon")}>
      <span className="piedra-cuerpo" style={{ "--semilla": semilla } as CSSProperties}>
        <span className="piedra-cara frente">
          <Frente semilla={semilla} color={color} dormida={dormida} />
        </span>
        <span className="piedra-cara dorso">{texto !== undefined && <Dorso semilla={semilla} color={color} texto={texto} />}</span>
      </span>
      <span className="piedra-nombre etiqueta">{etiqueta}</span>
      {marca}
    </button>
  )
}

/** Una piedra chica de la pila: lo que se decidió pintado encima y ojitos que espían. */
export function PiedraChica({ semilla, color, ancho, children }: { semilla: number; color: string; ancho: number; children: ReactNode }) {
  const h = 84
  return (
    <span className="piedra-chica" style={{ width: ancho, height: h }}>
      <svg viewBox={`0 0 ${ancho} ${h}`} aria-hidden>
        <Roca w={ancho} h={h} semilla={semilla} />
        <ellipse cx={ancho / 2 + 2} cy={h / 2 + 2} rx={ancho * 0.3} ry={18} fill={color} filter="url(#aerosol)" />
        <Ojito x={ancho - 34} y={20} r={7} />
        <Ojito x={ancho - 20} y={19} r={6.5} />
      </svg>
      <span className="piedra-chica-texto">{children}</span>
    </span>
  )
}
