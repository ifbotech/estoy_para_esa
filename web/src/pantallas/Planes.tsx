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
      <header className="planes-cabeza">
        <TituloCinetico texto={catActual ? `${catActual.emoji} ${catActual.nombre}` : "Planes"} />
        <p className="suave">Ordenados por ganas: arriba lo que más ganas les da a los dos.</p>
      </header>

      <input className="campo buscador" type="search" placeholder="Buscar un plan…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

      <LayoutGroup>
        <div className="segmentos" role="tablist">
          {ESTADOS.map((e) => (
            <button key={e.id} role="tab" aria-selected={estado === e.id} className={`segmento ${estado === e.id ? "activo" : ""}`} onClick={() => setEstado(e.id)}>
              {estado === e.id && <motion.span layoutId="segmento" className="segmento-fondo" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
              <span className="segmento-emoji">{e.emoji}</span>
              <span>{e.nombre}</span>
              <span className="segmento-num">{cuenta(e.id)}</span>
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

      <LayoutGroup>
        <div className="lista-planes">
          <AnimatePresence mode="popLayout">
            {lista.map((r, i) => (
              <TarjetaPlan key={r.plan.id} r={r} puesto={estado !== "hecho" && !busqueda && r.promedio !== null ? i + 1 : undefined} />
            ))}
          </AnimatePresence>
        </div>
      </LayoutGroup>

      {!lista.length && (
        <motion.div className="vacio" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Arte tipo={catActual?.personalidad ?? "salida"} tam={13} />
          {busqueda ? "Nada con ese nombre." : estado === "hecho" ? "Todavía nada hecho acá. ¡A hacer!" : "Nada por acá todavía. Tocá el + para sumar uno."}
        </motion.div>
      )}
    </div>
  )
}
