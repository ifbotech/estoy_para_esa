import { AnimatePresence, motion, useDragControls } from "motion/react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { vibrar } from "../util/efectos"

// --- la barra de ganas -----------------------------------------------------

export function caraDeGanas(v: number) {
  if (v >= 92) return "🔥"
  if (v >= 75) return "🤩"
  if (v >= 55) return "😃"
  if (v >= 35) return "🙂"
  if (v >= 15) return "🤷"
  return "😴"
}

export function fraseDeGanas(v: number) {
  if (v >= 92) return "¡ESTOY PARA ESA!"
  if (v >= 75) return "Muchas ganas"
  if (v >= 55) return "Va, me copa"
  if (v >= 35) return "Puede ser"
  if (v >= 15) return "Medio que no"
  return "Ni ahí"
}

/**
 * Las ganas de una persona, de 0 a 100. La propia se arrastra; la del otro
 * se ve pero no se toca. Guarda al soltar.
 */
export function BarraGanas({
  valor,
  nombre,
  color,
  editable,
  onCambio,
  pendiente = false,
}: {
  valor: number
  nombre: string
  color: string
  editable: boolean
  onCambio?: (v: number) => void
  pendiente?: boolean
}) {
  const [local, setLocal] = useState(valor)
  const arrastrando = useRef(false)
  const pista = useRef<HTMLDivElement>(null)
  const ultimo = useRef(valor)

  useEffect(() => {
    if (!arrastrando.current) setLocal(valor)
  }, [valor])

  const desde = (x: number) => {
    const r = pista.current!.getBoundingClientRect()
    return Math.round(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)))
  }
  const mover = (v: number) => {
    if (Math.floor(v / 10) !== Math.floor(ultimo.current / 10)) vibrar(6)
    ultimo.current = v
    setLocal(v)
  }
  const soltar = (v: number) => {
    arrastrando.current = false
    if (v >= 92 && valor < 92) vibrar([20, 40, 20])
    onCambio?.(v)
  }

  return (
    <div className={`ganas ${editable ? "editable" : ""} ${pendiente ? "pendiente" : ""}`} style={{ "--c": color } as React.CSSProperties}>
      <div className="ganas-cabeza">
        <span className="ganas-nombre">{nombre}</span>
        <span className="ganas-frase">{pendiente ? "todavía no votó" : fraseDeGanas(local)}</span>
        <span className="ganas-num">{pendiente ? "—" : `${local}%`}</span>
      </div>
      <div
        ref={pista}
        className="ganas-pista"
        role="slider"
        tabIndex={editable ? 0 : -1}
        aria-label={`Ganas de ${nombre}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={local}
        aria-readonly={!editable}
        onPointerDown={(e) => {
          if (!editable) return
          arrastrando.current = true
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          mover(desde(e.clientX))
        }}
        onPointerMove={(e) => arrastrando.current && mover(desde(e.clientX))}
        onPointerUp={(e) => arrastrando.current && soltar(desde(e.clientX))}
        onPointerCancel={() => arrastrando.current && soltar(local)}
        onKeyDown={(e) => {
          if (!editable) return
          const paso = e.shiftKey ? 10 : 5
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            const v = Math.min(100, local + paso)
            setLocal(v)
            onCambio?.(v)
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            const v = Math.max(0, local - paso)
            setLocal(v)
            onCambio?.(v)
          }
        }}
      >
        <div className="ganas-relleno" style={{ width: `${pendiente ? 0 : local}%` }} />
        {!pendiente && (
          <motion.div
            className="ganas-cara"
            style={{ left: `${local}%` }}
            animate={{ scale: 0.8 + local / 120, rotate: local >= 92 ? [0, -12, 12, 0] : 0 }}
            transition={local >= 92 ? { rotate: { repeat: Infinity, duration: 0.6 } } : { type: "spring", stiffness: 400, damping: 18 }}
          >
            {caraDeGanas(local)}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// --- estrellas de 0 a 5 en medios (como Letterboxd) ------------------------

export function Estrellas({ valor, onCambio, tam = 30 }: { valor: number; onCambio?: (v: number) => void; tam?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const v = hover ?? valor
  return (
    <div className="estrellas" style={{ fontSize: tam }} onPointerLeave={() => setHover(null)} role="radiogroup" aria-label="Puntaje">
      {[1, 2, 3, 4, 5].map((n) => {
        const lleno = v >= n ? 1 : v >= n - 0.5 ? 0.5 : 0
        return (
          <motion.button
            key={n}
            type="button"
            className="estrella"
            disabled={!onCambio}
            whileTap={{ scale: 1.4, rotate: 20 }}
            aria-label={`${n} estrellas`}
            onPointerMove={(e) => {
              if (!onCambio) return
              const r = e.currentTarget.getBoundingClientRect()
              setHover(e.clientX - r.left < r.width / 2 ? n - 0.5 : n)
            }}
            onClick={(e) => {
              if (!onCambio) return
              const r = e.currentTarget.getBoundingClientRect()
              const nuevo = e.clientX - r.left < r.width / 2 ? n - 0.5 : n
              vibrar(10)
              onCambio(nuevo === valor ? 0 : nuevo)
            }}
          >
            <span className="estrella-fondo">★</span>
            <span className="estrella-llena" style={{ width: `${lleno * 100}%` }}>★</span>
          </motion.button>
        )
      })}
    </div>
  )
}

// --- medidor circular ------------------------------------------------------

export function Medidor({ valor, tam = 120, children }: { valor: number | null; tam?: number; children?: ReactNode }) {
  const r = 44
  const c = 2 * Math.PI * r
  return (
    <div className="medidor" style={{ width: tam, height: tam }}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} className="medidor-pista" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          className="medidor-arco"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * (valor ?? 0)) / 100 }}
          transition={{ type: "spring", stiffness: 60, damping: 14 }}
        />
      </svg>
      <div className="medidor-centro">{children}</div>
    </div>
  )
}

// --- hoja que sube desde abajo ---------------------------------------------

export function Hoja({ abierta, onCerrar, titulo, children }: { abierta: boolean; onCerrar: () => void; titulo?: string; children: ReactNode }) {
  const controles = useDragControls()
  useEffect(() => {
    if (!abierta) return
    const f = (e: KeyboardEvent) => e.key === "Escape" && onCerrar()
    addEventListener("keydown", f)
    document.body.classList.add("sin-scroll")
    return () => {
      removeEventListener("keydown", f)
      document.body.classList.remove("sin-scroll")
    }
  }, [abierta, onCerrar])
  return (
    <AnimatePresence>
      {abierta && (
        <>
          <motion.div className="hoja-velo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar} />
          <motion.div
            className="hoja"
            role="dialog"
            aria-modal
            aria-label={titulo}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            drag="y"
            dragControls={controles}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(_, i) => (i.offset.y > 120 || i.velocity.y > 600) && onCerrar()}
          >
            <div className="hoja-asa" onPointerDown={(e) => controles.start(e)}>
              <span />
            </div>
            {titulo && <h2 className="hoja-titulo">{titulo}</h2>}
            <div className="hoja-cuerpo">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// --- botón con rebote ------------------------------------------------------

export function Boton({
  children,
  onClick,
  variante = "primario",
  className = "",
  disabled,
  type = "button",
  ...resto
}: {
  children: ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  variante?: "primario" | "secundario" | "fantasma" | "peligro"
  className?: string
  disabled?: boolean
  type?: "button" | "submit"
  "aria-label"?: string
}) {
  return (
    <motion.button
      type={type}
      className={`boton boton-${variante} ${className}`}
      whileTap={{ scale: 0.92, rotate: -1.5 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      onClick={onClick}
      disabled={disabled}
      {...resto}
    >
      {children}
    </motion.button>
  )
}

/** Texto que se edita en el lugar y guarda al salir. */
export function TextoEditable({
  valor,
  onGuardar,
  placeholder,
  multilinea = false,
  ajustable = false,
  className = "",
}: {
  valor: string
  onGuardar: (v: string) => void
  placeholder?: string
  multilinea?: boolean
  /** Una sola línea lógica que crece hacia abajo si no entra (títulos). */
  ajustable?: boolean
  className?: string
}) {
  const [v, setV] = useState(valor)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => setV(valor), [valor])
  useEffect(() => {
    const el = ref.current
    if (!el || !ajustable) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [v, ajustable])
  const guardar = () => v.trim() !== valor.trim() && onGuardar(v.trim())
  if (multilinea || ajustable)
    return (
      <textarea
        ref={ref}
        className={`campo ${ajustable ? "" : "campo-area"} ${className}`}
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(ajustable ? e.target.value.replace(/\n/g, " ") : e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => ajustable && e.key === "Enter" && (e.preventDefault(), (e.target as HTMLTextAreaElement).blur())}
        rows={ajustable ? 1 : Math.max(3, v.split("\n").length)}
      />
    )
  return (
    <input
      className={`campo ${className}`}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={guardar}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  )
}
