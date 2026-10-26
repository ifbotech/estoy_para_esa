import { animate, motion, useMotionValue, useTransform } from "motion/react"
import { useRef, useState } from "react"
import { abrirVistaRapida, estoyParaEsa, moverEstado } from "../acciones"
import { UMBRAL_MATCH_TOTAL, aCiegas, type Rankeado } from "../calculos"
import { urlArchivo } from "../pb"
import { ir } from "../router"
import { getEstado, useStore, useYo, votar } from "../store"
import { ESTADOS, type Categoria, type Plan, type Usuario } from "../tipos"
import { Arte } from "./Arte"
import { festejar, vibrar } from "../util/efectos"
import { sonar } from "../util/sonidos"
import { avisar } from "./Avisos"
import { EtiquetaSimetria } from "./Deco"

const DEFECTO = ["#E4572E", "#F5D547"]

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
    <span className="chip-cat" style={{ "--cc": cat.color || "var(--amarillo)" } as React.CSSProperties}>
      {cat.emoji} {cat.nombre}
    </span>
  )
}

/** Las dos barritas de ganas de una fila. Si votás a ciegas, la del otro va rayada. */
export function MiniBarras({ r }: { r: Rankeado }) {
  const usuarios = useStore((s) => s.usuarios)
  const yo = useYo()
  const ciego = aCiegas(r.votos, yo?.id)
  return (
    <div className="mini-barras">
      {usuarios.map((u, k) => {
        const v = r.votos.find((x) => x.usuario === u.id)
        const tapada = ciego && u.id !== yo?.id
        return (
          <div key={u.id} className={`mini-barra ${tapada ? "tapada" : ""}`} title={`${u.name}: ${tapada ? "tapado hasta que votes" : v ? v.ganas + "%" : "sin votar"}`}>
            <span className="mini-inicial" style={{ background: colorDe(u, k) }}>
              {u.name.slice(0, 1)}
            </span>
            <span className="mini-pista">
              {!tapada && <span className="mini-relleno" style={{ width: `${v?.ganas ?? 0}%`, background: colorDe(u, k) }} />}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** El número de la derecha: el promedio, o «¿?» si todavía no votaste o nadie votó. */
export function PromedioFila({ r }: { r: Rankeado }) {
  const yo = useYo()
  const ciego = aCiegas(r.votos, yo?.id)
  return (
    <div className="fila-prom">
      {r.promedio === null || ciego ? (
        <>
          <b className="num">¿?</b>
          <small>{ciego ? "votá" : "ganas"}</small>
        </>
      ) : (
        <>
          <b className="num">{Math.round(r.promedio)}</b>
          <small>ganas</small>
        </>
      )}
    </div>
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
 * La fila técnica de un plan: puesto, categoría, título, las dos barras, el
 * promedio y la etiqueta de simetría. Deslizar a la derecha la pasa al
 * estado siguiente; a la izquierda, al anterior.
 */
export function TarjetaPlan({ r, puesto, compacta = false, conEstado = false }: { r: Rankeado; puesto?: number; compacta?: boolean; conEstado?: boolean }) {
  const cat = useCategoria(r.plan.categoria)
  const yo = useYo()
  const img = imagenDe(r.plan, "200x200")
  const x = useMotionValue(0)
  const fondoPista = useTransform(x, [-120, 0, 120], ["var(--rosa)", "var(--papel)", "var(--verde)"])
  const gestos = useGestosPlan(r.plan.id)
  const i = ESTADOS.findIndex((e) => e.id === r.plan.estado)
  const siguiente = ESTADOS[i + 1]
  const anterior = ESTADOS[i - 1]
  const arrastrado = useRef(false)
  const ciego = aCiegas(r.votos, yo?.id)

  return (
    <div className={`tarjeta-envoltorio ${compacta ? "compacta" : ""}`}>
      {!compacta && (
        <motion.div className="tarjeta-pista" style={{ background: fondoPista }} aria-hidden>
          <span>{anterior ? `← ${anterior.nombre}` : ""}</span>
          <span>{siguiente ? `${siguiente.nombre} →` : ""}</span>
        </motion.div>
      )}
      <motion.div
        role="link"
        tabIndex={0}
        aria-label={`${r.plan.titulo}. Doble toque: estoy para esa.${compacta ? "" : " Deslizá para cambiar el estado."}`}
        className="tarjeta"
        style={{ x, "--cc": cat?.color || "var(--amarillo)" } as never}
        drag={compacta ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        dragDirectionLock
        onDragStart={() => (arrastrado.current = true)}
        onDragEnd={(_, info) => {
          if (info.offset.x > 110) moverEstado(r.plan, 1)
          else if (info.offset.x < -110) moverEstado(r.plan, -1)
          animate(x, 0, { type: "spring", stiffness: 600, damping: 40 })
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
      >
        {puesto !== undefined && <span className="tarjeta-puesto num">{String(puesto).padStart(2, "0")}</span>}
        <div className="tarjeta-img">
          {img ? <img src={img} alt="" loading="lazy" draggable={false} /> : <Arte tipo={cat?.personalidad ?? "salida"} tam={8} />}
        </div>
        <div className="tarjeta-cuerpo">
          <div className="tarjeta-meta">
            <ChipCategoria cat={cat} />
            {conEstado && (
              <button
                className="chip-estado"
                aria-label={`Estado: ${ESTADOS[i].nombre}. Tocá para pasar a ${siguiente?.nombre ?? "—"}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  if (siguiente) moverEstado(r.plan, 1)
                }}
              >
                {ESTADOS[i].emoji} {ESTADOS[i].nombre}
                {siguiente && <span aria-hidden> →</span>}
              </button>
            )}
            {!ciego && <EtiquetaSimetria votos={r.votos} chica />}
          </div>
          <h3>{r.plan.titulo}</h3>
          <MiniBarras r={r} />
        </div>
        <PromedioFila r={r} />
      </motion.div>
    </div>
  )
}

const RAPIDOS = [
  { ganas: 10, cara: "😴", nombre: "Ni ahí" },
  { ganas: 40, cara: "🙂", nombre: "Puede ser" },
  { ganas: 75, cara: "🤩", nombre: "Muchas" },
  { ganas: 100, cara: "🔥", nombre: "¡Para esa!" },
]

/** La opción de un toque más cerca de unas ganas (para marcar la elegida). */
function rapidoDe(ganas: number) {
  return RAPIDOS.reduce((a, o) => (Math.abs(o.ganas - ganas) < Math.abs(a.ganas - ganas) ? o : a))
}

/**
 * El voto de un toque, pegado abajo de la fila de un plan. Si todavía no
 * votaste, muestra las opciones (sigue siendo a ciegas: el del otro se
 * destapa recién al tocar). Si ya votaste, muestra tus ganas y se puede
 * cambiar con un toque. Para afinar el número está la barra del detalle.
 */
export function VotoRapido({ planId }: { planId: string }) {
  const yo = useYo()
  const mio = useStore((s) => s.votos).find((v) => v.plan === planId && v.usuario === yo?.id)
  const [cambiando, setCambiando] = useState(false)
  const elegir = (ganas: number, e: React.MouseEvent) => {
    setCambiando(false)
    if (mio && mio.ganas === ganas) return
    const otro = getEstado().votos.find((v) => v.plan === planId && v.usuario !== yo?.id)
    if (ganas === 100) void estoyParaEsa(planId, e)
    else {
      vibrar(12)
      sonar("tic")
      void votar(planId, { ganas })
    }
    if (otro && otro.ganas >= UMBRAL_MATCH_TOTAL && ganas >= UMBRAL_MATCH_TOTAL) {
      festejar(e.clientX / innerWidth, e.clientY / innerHeight, 1.2)
      avisar("¡MATCH TOTAL! 🔥 Los dos están para esa.")
    }
  }
  if (mio && !cambiando) {
    const actual = rapidoDe(mio.ganas)
    return (
      <div className="voto-rapido votado">
        <span className="voto-rapido-pregunta etiqueta">tus ganas</span>
        <span className="voto-rapido-mio">
          <span aria-hidden>{actual.cara}</span> <b className="num">{Math.round(mio.ganas)}%</b>
        </span>
        <button className="voto-rapido-cambiar" onClick={() => setCambiando(true)}>
          cambiar
        </button>
      </div>
    )
  }
  const marcada = mio ? rapidoDe(mio.ganas).ganas : null
  return (
    <div className="voto-rapido" role="group" aria-label="¿Cuántas ganas tenés?">
      <span className="voto-rapido-pregunta etiqueta">¿ganas?</span>
      {RAPIDOS.map((o) => (
        <button
          key={o.ganas}
          className="voto-rapido-op"
          aria-pressed={marcada === o.ganas}
          onClick={(e) => elegir(o.ganas, e)}
          aria-label={`${o.nombre}: ${o.ganas}%`}
        >
          <span aria-hidden>{o.cara}</span>
          <small>{o.nombre}</small>
        </button>
      ))}
    </div>
  )
}
