/**
 * La marca: los dos globos del ícono, en tinta. Dos globos livianos juntos
 * (por Kundera), con los hilos cruzados. Toma el color del texto
 * (`currentColor`); el globo de adelante se recorta del de atrás con el color
 * de fondo (`--globos-fondo`, papel por defecto).
 */
function globo(cx: number, y0: number) {
  const r = 94
  const h = 232
  const y1 = y0 + h
  return (
    `M${cx} ${y1} C ${cx + 0.4 * r} ${y1 - 8}, ${cx + r} ${y0 + 0.8 * h}, ${cx + r} ${y0 + 0.46 * h} ` +
    `C ${cx + r} ${y0 + 0.16 * h}, ${cx + 0.58 * r} ${y0}, ${cx} ${y0} ` +
    `C ${cx - 0.58 * r} ${y0}, ${cx - r} ${y0 + 0.16 * h}, ${cx - r} ${y0 + 0.46 * h} ` +
    `C ${cx - r} ${y0 + 0.8 * h}, ${cx - 0.4 * r} ${y1 - 8}, ${cx} ${y1} Z ` +
    `M${cx - 13} ${y1 + 17} L${cx + 13} ${y1 + 17} L${cx} ${y1 - 1} Z`
  )
}

const ATRAS = globo(304, 56)
const ADELANTE = globo(204, 114)

export function Globos({ tam = 26, className = "" }: { tam?: number; className?: string }) {
  return (
    <svg className={`globos ${className}`} viewBox="96 40 330 450" width={(tam * 330) / 450} height={tam} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="22" strokeLinecap="round">
        <path d="M304 305 C 302 346, 272 372, 254 394" />
        <path d="M204 363 C 212 386, 240 390, 254 394" />
        <path d="M254 394 C 258 422, 222 440, 210 420 C 198 398, 234 388, 246 412 C 256 434, 256 454, 248 478" />
      </g>
      <path d={ATRAS} transform="rotate(8 304 305)" fill="currentColor" />
      <path d={ADELANTE} transform="rotate(-6 204 363)" fill="currentColor" stroke="var(--globos-fondo, var(--papel))" strokeWidth="26" />
    </svg>
  )
}
