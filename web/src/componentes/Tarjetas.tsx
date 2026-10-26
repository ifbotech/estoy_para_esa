import { animate, motion, useMotionValue, useTransform } from "motion/react"
import { useRef } from "react"
import { abrirVistaRapida, estoyParaEsa, moverEstado } from "../acciones"
import type { Rankeado } from "../calculos"
import { urlArchivo } from "../pb"
import { ir } from "../router"
import { useStore } from "../store"
import { ESTADOS, type Categoria, type Plan, type Usuario } from "../tipos"
import { Arte } from "./Arte"

const DEFECTO = ["#E8432E", "#F2EA3A"]

export function colorDe(u: Usuario | undefined, i: number) {
  return u?.color || DEFECTO[i % 2]
}

/** La imagen de un plan: portada, póster, vista previa o la primera foto. */
export function imagenDe(plan: Plan, thumb = "600x0"): string {
  if (plan.portada) return urlArchivo(plan, plan.portada, thumb)
  if (plan.datos?.poster) return plan.datos.poster
  if (plan.datos?.imagen) return plan.datos.imagen
  if (plan.fotos?.length) return urlArchivo(plan, plan.fotos[0], thumb)
  return ""
}

export function useCategoria(id: string): Categoria | undefined {
  return useStore((s) => s.categorias).find((c) => c.id === id)
}

export function ChipCategoria({ cat }: { cat?: Categoria }) {
  if (!cat) return null
  return (
    <span className="chip-cat" style={{ "--cc": cat.color || "var(--a3)" } as React.CSSProperties}>
      {cat.emoji} {cat.nombre}
    </span>
  )
}

/**
 * Los gestos de un plan, compartidos por las tarjetas y las cartas:
 * un toque abre, doble toque = ¡estoy para esa!, mantener = vista rápida.
 */
export function useGestosPlan(planId: string) {
  const ultimo = useRef(0)
  const espera = useRef<number | null>(null)
  const larga = useRef<number | null>(null)
  const huboLarga = useRef(false)
  const inicio = useRef<{ x: number; y: number } | null>(null)

  const cancelarLarga = () => {
    if (larga.current) clearTimeout(larga.current)
    larga.current = null
  }

  return {
    onPointerDown: (e: React.PointerEvent) => {
      huboLarga.current = false
      inicio.current = { x: e.clientX, y: e.clientY }
      cancelarLarga()
      larga.current = window.setTimeout(() => {
        huboLarga.current = true
        abrirVistaRapida(planId)
      }, 480)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (inicio.current && Math.hypot(e.clientX - inicio.current.x, e.clientY - inicio.current.y) > 8) cancelarLarga()
    },
    onPointerUp: cancelarLarga,
    onPointerCancel: cancelarLarga,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    tocar: (e: { clientX: number; clientY: number }, unToque: () => void) => {
      if (huboLarga.current) return
      const ahora = Date.now()
      if (ahora - ultimo.current < 300) {
        if (espera.current) clearTimeout(espera.current)
        espera.current = null
        ultimo.current = 0
        void estoyParaEsa(planId, e)
        return
      }
      ultimo.current = ahora
      espera.current = window.setTimeout(() => {
        espera.current = null
        unToque()
      }, 260)
    },
  }
}

/**
 * Tarjeta de la lista: puesto, personaje o imagen, título, las dos barras y el
 * promedio. Deslizar a la derecha la pasa al estado siguiente; a la izquierda,
 * al anterior.
 */
export function TarjetaPlan({ r, puesto }: { r: Rankeado; puesto?: number }) {
  const cat = useCategoria(r.plan.categoria)
  const usuarios = useStore((s) => s.usuarios)
  const img = imagenDe(r.plan, "200x200")
  const x = useMotionValue(0)
  const fondoPista = useTransform(x, [-120, 0, 120], ["var(--chicle)", "var(--bg)", "var(--a2)"])
  const gestos = useGestosPlan(r.plan.id)
  const i = ESTADOS.findIndex((e) => e.id === r.plan.estado)
  const siguiente = ESTADOS[i + 1]
  const anterior = ESTADOS[i - 1]
  const arrastrado = useRef(false)

  return (
    <motion.div
      layout
      className="tarjeta-envoltorio"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
    >
      <motion.div className="tarjeta-pista" style={{ background: fondoPista }} aria-hidden>
        <span>{anterior ? `← ${anterior.nombre}` : ""}</span>
        <span>{siguiente ? `${siguiente.nombre} →` : ""}</span>
      </motion.div>
      <motion.div
        role="link"
        tabIndex={0}
        aria-label={`${r.plan.titulo}. Doble toque: estoy para esa. Deslizá para cambiar el estado.`}
        className="tarjeta"
        style={{ x, "--cc": cat?.color || "var(--a3)" } as never}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        dragDirectionLock
        onDragStart={() => (arrastrado.current = true)}
        onDragEnd={(_, info) => {
          if (info.offset.x > 110) moverEstado(r.plan, 1)
          else if (info.offset.x < -110) moverEstado(r.plan, -1)
          animate(x, 0, { type: "spring", stiffness: 500, damping: 35 })
          setTimeout(() => (arrastrado.current = false), 50)
        }}
        onPointerDown={gestos.onPointerDown}
        onPointerMove={gestos.onPointerMove}
        onPointerUp={gestos.onPointerUp}
        onPointerCancel={gestos.onPointerCancel}
        onContextMenu={gestos.onContextMenu}
        onClick={(e) => {
          if (arrastrado.current) return
          gestos.tocar(e, () => ir(`/plan/${r.plan.id}`))
        }}
        onKeyDown={(e) => e.key === "Enter" && ir(`/plan/${r.plan.id}`)}
        whileTap={{ scale: 0.98 }}
      >
        {puesto !== undefined && <span className="tarjeta-puesto">#{puesto}</span>}
        <div className="tarjeta-img">
          {img ? <img src={img} alt="" loading="lazy" draggable={false} /> : <Arte tipo={cat?.personalidad ?? "salida"} tam={9} />}
        </div>
        <div className="tarjeta-cuerpo">
          <ChipCategoria cat={cat} />
          <h3>{r.plan.titulo}</h3>
          <div className="mini-barras">
            {usuarios.map((u, k) => {
              const v = r.votos.find((x) => x.usuario === u.id)
              return (
                <div key={u.id} className="mini-barra" title={`${u.name}: ${v ? v.ganas + "%" : "sin votar"}`}>
                  <span className="mini-inicial" style={{ background: colorDe(u, k) }}>
                    {u.name.slice(0, 1)}
                  </span>
                  <span className="mini-pista">
                    <motion.span
                      className="mini-relleno"
                      style={{ background: colorDe(u, k) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${v?.ganas ?? 0}%` }}
                      transition={{ type: "spring", stiffness: 90, damping: 16 }}
                    />
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="tarjeta-prom">
          {r.promedio === null ? (
            <span className="tarjeta-sin">¿?</span>
          ) : (
            <>
              <b>{Math.round(r.promedio)}</b>
              <small>ganas</small>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
