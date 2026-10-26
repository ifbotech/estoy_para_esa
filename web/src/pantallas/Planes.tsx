import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { useMemo, useState } from "react"
import { rankear } from "../calculos"
import { Arte } from "../componentes/Arte"
import { TituloCinetico } from "../componentes/Deco"
import { TarjetaPlan } from "../componentes/Tarjetas"
import type { Ruta } from "../router"
import { useStore } from "../store"
import { ESTADOS, type Estado } from "../tipos"

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

export function Planes({ ruta }: { ruta: Ruta }) {
  const planes = useStore((s) => s.planes)
  const votos = useStore((s) => s.votos)
  const categorias = useStore((s) => s.categorias)
  const [estado, setEstado] = useState<Estado>((ruta.query.get("estado") as Estado) || "idea")
  const [cat, setCat] = useState<string | null>(ruta.query.get("cat"))
  const [busqueda, setBusqueda] = useState("")

  const lista = useMemo(() => {
    const q = normalizar(busqueda.trim())
    const filtrados = planes.filter(
      (p) => (q ? true : p.estado === estado) && (!cat || p.categoria === cat) && (!q || normalizar(p.titulo + " " + p.notas).includes(q)),
    )
    const r = rankear(filtrados, votos)
    if (estado === "hecho" && !q) r.sort((a, b) => b.plan.hecho_en.localeCompare(a.plan.hecho_en))
    return r
  }, [planes, votos, estado, cat, busqueda])

  const cuenta = (e: Estado) => planes.filter((p) => p.estado === e && (!cat || p.categoria === cat)).length
  const catActual = categorias.find((c) => c.id === cat)

  return (
    <div className="planes">
      <section className="capitulo planes-cabeza" style={{ "--cap": catActual?.color ?? "var(--lavanda)" } as React.CSSProperties}>
        <TituloCinetico
          key={cat ?? "todas"}
          lineas={catActual ? [catActual.nombre] : ["Todos", "los planes"]}
          asoma={catActual ? catActual.personalidad : "entrada"}
          className="planes-titulo"
        />
        {catActual && (
          <span className="planes-arte">
            <Arte tipo={catActual.personalidad} tam={14} mira={-1} />
          </span>
        )}
        <p>Ordenados por ganas: arriba lo que más ganas les da a los dos.</p>
      </section>

      <input className="campo buscador" type="search" placeholder="Buscar un plan…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

      <LayoutGroup>
        <div className="filtro-estados" role="tablist" aria-label="Estado">
          {ESTADOS.map((e, i) => (
            <button key={e.id} role="tab" aria-selected={estado === e.id} className={`filtro-estado ${estado === e.id ? "activo" : ""}`} onClick={() => setEstado(e.id)}>
              {estado === e.id && <motion.span layoutId="filtro-estado" className="filtro-fondo" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
              <span className="filtro-num">{i + 1}</span>
              <span className="filtro-nombre">{e.nombre}</span>
              <span className="filtro-cuenta">{cuenta(e.id)}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      <div className="fila-scroll chips-cat">
        <button className="chip" aria-pressed={!cat} onClick={() => setCat(null)}>
          ✦ Todas
        </button>
        {categorias.map((c) => (
          <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)}>
            {c.emoji} {c.nombre}
          </button>
        ))}
      </div>

      {lista.length > 0 && <p className="pista-gestos etiqueta">deslizá → para avanzar · doble toque: ¡estoy para esa! · mantené para ver rápido</p>}

      <div className="lista-planes">
        <AnimatePresence mode="popLayout">
          {lista.map((r, i) => (
            <TarjetaPlan key={r.plan.id} r={r} puesto={estado !== "hecho" && !busqueda && r.promedio !== null ? i + 1 : undefined} />
          ))}
        </AnimatePresence>
      </div>

      {!lista.length && (
        <motion.div className="vacio" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
          <Arte tipo={catActual?.personalidad ?? "salida"} tam={14} />
          {busqueda ? "Nada con ese nombre." : estado === "hecho" ? "Todavía nada hecho acá. ¡A hacer!" : "Nada por acá todavía. Tocá el + para sumar uno."}
        </motion.div>
      )}
    </div>
  )
}
