import { AnimatePresence, motion, useDragControls } from "motion/react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { aCiegas, esMatchTotal } from "../calculos"
import { useStore, useYo, votar } from "../store"
import { festejar, vibrar } from "../util/efectos"
import { sonar } from "../util/sonidos"
import { EtiquetaSimetria, Sello } from "./Deco"
import { colorDe } from "./Tarjetas"
import type { Estado } from "../tipos"
import { ESTADOS } from "../tipos"

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
 *
 * `ciego`: el otro ya votó pero vos todavía no; su barra queda tapada con
 * un rayado hasta que votes (para que su número no te ancle).
 */
export function BarraGanas({
  valor,
  nombre,
  color,
  editable,
  onCambio,
  pendiente = false,
  ciego = false,
  inicial,
  destapada = false,
}: {
  valor: number
  nombre: string
  color: string
  editable: boolean
  onCambio?: (v: number) => void
  pendiente?: boolean
  ciego?: boolean
  inicial?: string
  destapada?: boolean
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
    if (Math.floor(v / 10) !== Math.floor(ultimo.current / 10)) {
      vibrar(6)
      sonar("tic")
    }
    ultimo.current = v
    setLocal(v)
  }
  const soltar = (v: number) => {
    arrastrando.current = false
    if (v >= 92 && valor < 92) sonar("esa")
    onCambio?.(v)
  }
  const tapada = ciego && !editable
  const sinVoto = pendiente && !tapada

  return (
    <div
      className={`ganas ${editable ? "editable" : ""} ${sinVoto ? "pendiente" : ""} ${tapada ? "tapada" : ""} ${destapada ? "destapada" : ""}`}
      style={{ "--c": color } as React.CSSProperties}
    >
      <div className="ganas-cabeza">
        <span className="ganas-inicial" aria-hidden>
          {inicial ?? nombre.slice(0, 1)}
        </span>
        <span className="ganas-nombre">{nombre}</span>
        <span className="ganas-frase">{tapada ? "votá para destapar" : sinVoto ? (editable ? "tocá la barra para votar" : "todavía no votó") : fraseDeGanas(local)}</span>
        <span className="ganas-num num">{tapada ? "¿?%" : sinVoto ? "—" : `${local}%`}</span>
      </div>
      <div
        ref={pista}
        className="ganas-pista"
        role="slider"
        tabIndex={editable ? 0 : -1}
        aria-label={tapada ? `Ganas de ${nombre}: tapadas hasta que votes` : `Ganas de ${nombre}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={tapada ? undefined : local}
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
        {tapada ? (
          <span className="ganas-rayado" aria-hidden />
        ) : (
          <>
            <div className="ganas-relleno" style={{ width: `${sinVoto ? 0 : local}%` }} />
            <span className="ganas-marcas" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            {editable && !sinVoto && <div className="ganas-perilla" style={{ left: `${local}%` }} />}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Las ganas de los dos en un plan, con el voto a ciegas: la barra del otro
 * queda tapada hasta que votes. Cuando votás se destapa y, si los dos
 * tienen 85 o más, aparece el sello de ¡MATCH TOTAL!.
 */
export function GanasDeLosDos({ planId }: { planId: string }) {
  const usuarios = useStore((s) => s.usuarios)
  const todos = useStore((s) => s.votos)
  const votos = todos.filter((v) => v.plan === planId)
  const yo = useYo()
  const ciego = aCiegas(votos, yo?.id)
  const match = esMatchTotal(votos)
  const estabaCiego = useRef(ciego)
  const [destape, setDestape] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (estabaCiego.current && !ciego) {
      setDestape(true)
      vibrar(match ? [30, 50, 40] : 20)
      if (match && raiz.current) {
        const r = raiz.current.getBoundingClientRect()
        festejar((r.left + r.width / 2) / innerWidth, (r.top + r.height / 2) / innerHeight, 1)
        sonar("esa")
      }
      const t = setTimeout(() => setDestape(false), 1600)
      estabaCiego.current = ciego
      return () => clearTimeout(t)
    }
    estabaCiego.current = ciego
  }, [ciego, match])

  return (
    <div className="ganas-duo" ref={raiz}>
      {usuarios.map((u, i) => {
        const v = votos.find((x) => x.usuario === u.id)
        const mio = u.id === yo?.id
        return (
          <BarraGanas
            key={u.id}
            nombre={mio ? `${u.name} (vos)` : u.name}
            inicial={u.name.slice(0, 1)}
            color={colorDe(u, i)}
            valor={v?.ganas ?? 50}
            pendiente={!v}
            ciego={!mio && ciego}
            destapada={!mio && destape}
            editable={mio}
            onCambio={(g) => votar(planId, { ganas: g })}
          />
        )
      })}
      <AnimatePresence>
        {!ciego && match && (
          <motion.div className="ganas-match" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <Sello>¡MATCH TOTAL! 🔥</Sello>
          </motion.div>
        )}
      </AnimatePresence>
      {!ciego && !match && <EtiquetaSimetria votos={votos} />}
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
          <button
            key={n}
            type="button"
            className="estrella"
            disabled={!onCambio}
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
          </button>
        )
      })}
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

// --- botón mecánico (se hunde con :active, ver base.css) -------------------

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
    <button
      type={type}
      className={`boton boton-${variante} ${className}`}
      onClick={(e) => {
        sonar("pop")
        onClick?.(e)
      }}
      disabled={disabled}
      {...resto}
    >
      {children}
    </button>
  )
}

// --- pasos: los cuatro estados del plan como una regla segmentada --------

export function Pasos({ actual, onCambio }: { actual: Estado; onCambio?: (e: Estado, ev: React.MouseEvent) => void }) {
  const ia = ESTADOS.findIndex((x) => x.id === actual)
  return (
    <div className="pasos" role="radiogroup" aria-label="Estado del plan">
      {ESTADOS.map((e, i) => (
        <button
          key={e.id}
          type="button"
          role="radio"
          aria-checked={e.id === actual}
          aria-label={e.nombre}
          className={`paso ${e.id === actual ? "activo" : ""} ${ia > i ? "pasado" : ""}`}
          onClick={(ev) => onCambio?.(e.id, ev)}
        >
          <span className="paso-num num">{String(i + 1).padStart(2, "0")}</span>
          <span className="paso-nombre">{e.nombre}</span>
        </button>
      ))}
    </div>
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
