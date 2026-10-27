import type { CSSProperties, ReactNode } from "react"

/**
 * El aerosol y la materia de la v4: pintura de lata, piedras e hilo.
 *
 * Todo sale de filtros SVG que se definen una sola vez (`FiltrosAerosol`,
 * montado en App) y se usan por id:
 *   #aerosol   borde áspero + niebla y motas de pintura alrededor
 *   #piedra    textura de piedra con luz de costado
 * Son dibujos quietos: nada se mueve solo.
 */

/** Las definiciones de los filtros. Va una vez, escondida. */
export function FiltrosAerosol() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <defs>
        <filter id="aerosol" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
          {/* el borde: áspero y apenas desenfocado */}
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="grano" />
          <feDisplacementMap in="SourceGraphic" in2="grano" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="borde" />
          <feGaussianBlur in="borde" stdDeviation="0.55" result="nucleo" />
          {/* la niebla: la pintura que se pasa de largo */}
          <feMorphology in="SourceGraphic" operator="dilate" radius="2.5" result="gordo" />
          <feGaussianBlur in="gordo" stdDeviation="5" result="nube" />
          <feColorMatrix in="nube" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.28 0" result="velo" />
          {/* las motas: gotitas sueltas adentro de la niebla */}
          <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="11" result="ruido" />
          <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  9 0 0 0 -5.3" result="motas" />
          <feComposite in="nube" in2="motas" operator="in" result="lluvia" />
          <feMerge>
            <feMergeNode in="velo" />
            <feMergeNode in="lluvia" />
            <feMergeNode in="nucleo" />
          </feMerge>
        </filter>
        <filter id="piedra" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="5" seed="12" result="relieve" />
          <feDiffuseLighting in="relieve" surfaceScale="2.6" lightingColor="#ffffff" result="luz">
            <feDistantLight azimuth="225" elevation="52" />
          </feDiffuseLighting>
          <feComposite in="luz" in2="SourceGraphic" operator="arithmetic" k1="0.85" k2="0" k3="0.22" k4="0" result="textura" />
          <feComposite in="textura" in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
    </svg>
  )
}

// --- formas blandas (las mismas reglas que los personajes) ------------------

function azar(semilla: number) {
  const x = Math.sin(semilla * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** Un contorno de piedra o de mancha: un óvalo con bultos fijos por semilla. */
export function contorno(w: number, h: number, semilla = 1, bultos = 0.12, puntos = 11) {
  const cx = w / 2
  const cy = h / 2
  const pts: [number, number][] = []
  for (let i = 0; i < puntos; i++) {
    const a = (i / puntos) * Math.PI * 2
    const k = 1 - bultos / 2 + bultos * azar(semilla * 17 + i)
    pts.push([cx + Math.cos(a) * (w / 2) * k, cy + Math.sin(a) * (h / 2) * k])
  }
  const n = pts.length
  const f = (v: number) => Math.round(v * 10) / 10
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]]
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + "Z"
}

// --- aerosol ----------------------------------------------------------------

/**
 * Un sello pintado con lata: el texto en letra de cartel, con niebla,
 * motas y un par de chorreadas. Va torcido, como pintado de apuro.
 */
export function SelloAerosol({ children, color = "var(--rojo)", tam = 30 }: { children: ReactNode; color?: string; tam?: number }) {
  const texto = typeof children === "string" ? children : Array.isArray(children) ? children.join("") : String(children ?? "")
  // ancho estimado de la letra pesada; el textLength lo ajusta exacto
  const largo = Math.max(2, [...texto].length) * tam * 0.56
  const w = largo + tam * 1.2
  const h = tam * 2
  const base = tam * 1.25
  return (
    <span className="aerosol sello-aerosol" role="img" aria-label={texto}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w * 0.9} height={h * 0.9} style={{ color } as CSSProperties}>
        <g filter="url(#aerosol)" fill="currentColor">
          <text
            x={tam * 0.6}
            y={base}
            textLength={largo}
            lengthAdjust="spacingAndGlyphs"
            fontFamily="'Bricolage Grotesque Variable', system-ui, sans-serif"
            fontWeight={800}
            fontSize={tam}
            letterSpacing={-0.5}
          >
            {texto}
          </text>
          {/* las chorreadas */}
          <path d={`M${w * 0.22} ${base + 2} q1.5 ${tam * 0.35} 0 ${tam * 0.5} q-1.2 3 -2.4 0 q-1 -${tam * 0.2} 2.4 -${tam * 0.5}Z`} />
          <path d={`M${w * 0.71} ${base + 2} q1.2 ${tam * 0.22} 0 ${tam * 0.32} q-1 2.4 -2 0 q-0.8 -${tam * 0.12} 2 -${tam * 0.32}Z`} />
        </g>
      </svg>
    </span>
  )
}

/** Una mancha de aerosol: un círculo pintado a pulso, para poner detrás de algo. */
export function Mancha({ color, semilla = 1, className = "", style }: { color: string; semilla?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg className={`mancha ${className}`} viewBox="0 0 120 120" style={{ color, ...style }} aria-hidden>
      <g filter="url(#aerosol)" fill="currentColor">
        <path d={contorno(96, 90, semilla, 0.16)} transform="translate(12 15)" />
        <path d={`M${30 + semilla * 7} 100 q2 8 0 12 q-2 3 -4 0 q-1 -5 4 -12Z`} />
      </g>
    </svg>
  )
}

// --- materia ----------------------------------------------------------------

/**
 * Una piedra con algo pintado encima (como las de las fotos). El contenido va
 * en HTML arriba de la piedra; `ancho` y `alto` son los de la piedra en px.
 */
export function Piedra({
  children,
  semilla = 1,
  ancho = 150,
  alto = 120,
  className = "",
}: {
  children?: ReactNode
  semilla?: number
  ancho?: number
  alto?: number
  className?: string
}) {
  const d = contorno(ancho - 8, alto - 8, semilla, 0.16, 12)
  return (
    <span className={`piedra ${className}`} style={{ "--pw": `${ancho}px`, "--ph": `${alto}px` } as CSSProperties}>
      <svg className="piedra-fondo" viewBox={`0 0 ${ancho} ${alto}`} aria-hidden>
        <ellipse cx={ancho / 2 + 3} cy={alto - 6} rx={ancho * 0.4} ry={5} fill="rgb(18 18 17 / 0.18)" />
        <path d={d} transform="translate(4 2)" fill="var(--piedra)" filter="url(#piedra)" />
        <path d={d} transform="translate(4 2)" fill="none" stroke="rgb(18 18 17 / 0.35)" strokeWidth={1.5} />
      </svg>
      <span className="piedra-contenido">{children}</span>
    </span>
  )
}

/** Un mechón de hilo de colores que se escapa por un borde: el premio de lo hecho. */
export function Hilo({ className = "" }: { className?: string }) {
  return (
    <svg className={`hilo ${className}`} viewBox="0 0 60 50" aria-hidden>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8 C14 2 22 14 16 20 C10 26 4 16 12 12 C22 8 30 22 22 28" stroke="var(--rojo)" strokeWidth={3.2} />
        <path d="M10 16 C20 10 34 18 30 28 C26 36 14 30 20 24 C28 16 42 26 40 36" stroke="var(--verde)" strokeWidth={3.2} />
        <path d="M14 22 C24 18 30 34 22 38 C14 42 12 30 22 30 C34 30 44 40 52 44" stroke="var(--amarillo)" strokeWidth={3.6} />
        <path d="M8 26 C16 22 24 30 30 26 C38 20 46 28 50 24" stroke="#F3EBDD" strokeWidth={2.4} />
        <path d="M18 30 C26 26 36 38 46 32" stroke="var(--azul)" strokeWidth={2.8} />
        <path d="M6 8 C14 2 22 14 16 20" stroke="var(--tinta)" strokeWidth={1} opacity={0.35} />
      </g>
    </svg>
  )
}
