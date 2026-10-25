import { motion } from "motion/react"
import type { Rankeado } from "../calculos"
import { urlArchivo } from "../pb"
import { useStore } from "../store"
import type { Categoria, Plan, Usuario } from "../tipos"
import { Arte } from "./Arte"
import { caraDeGanas } from "./Controles"

export function colorDe(u: Usuario | undefined, i: number) {
  return u?.color || (i === 0 ? "var(--a1)" : "var(--a2)")
}

/** La imagen de un plan: portada, póster, vista previa o su dibujo. */
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
    <span className="chip-cat" style={{ "--cc": cat.color || "var(--a1)" } as React.CSSProperties}>
      {cat.emoji} {cat.nombre}
    </span>
  )
}

/** Tarjeta de la lista: puesto, imagen, título, las dos barras y el promedio. */
export function TarjetaPlan({ r, puesto }: { r: Rankeado; puesto?: number }) {
  const cat = useCategoria(r.plan.categoria)
  const usuarios = useStore((s) => s.usuarios)
  const img = imagenDe(r.plan, "200x200")
  return (
    <motion.a
      layout
      layoutId={`plan-${r.plan.id}`}
      href={`#/plan/${r.plan.id}`}
      className={`tarjeta p-${cat?.personalidad ?? "salida"}`}
      style={{ "--cc": cat?.color || "var(--a1)" } as React.CSSProperties}
      initial={{ opacity: 0, y: 30, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
    >
      {puesto !== undefined && <span className="tarjeta-puesto">{puesto}</span>}
      <div className="tarjeta-img">
        {img ? <img src={img} alt="" loading="lazy" /> : <Arte tipo={cat?.personalidad ?? "salida"} tam={9} />}
      </div>
      <div className="tarjeta-cuerpo">
        <ChipCategoria cat={cat} />
        <h3>{r.plan.titulo}</h3>
        <div className="mini-barras">
          {usuarios.map((u, i) => {
            const v = r.votos.find((x) => x.usuario === u.id)
            return (
              <div key={u.id} className="mini-barra" title={`${u.name}: ${v ? v.ganas + "%" : "sin votar"}`}>
                <span className="mini-inicial" style={{ background: colorDe(u, i) }}>
                  {u.name.slice(0, 1)}
                </span>
                <span className="mini-pista">
                  <motion.span
                    className="mini-relleno"
                    style={{ background: colorDe(u, i) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${v?.ganas ?? 0}%` }}
                    transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.1 }}
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
            <span className="tarjeta-cara">{caraDeGanas(r.promedio)}</span>
            <b>{Math.round(r.promedio)}</b>
          </>
        )}
      </div>
    </motion.a>
  )
}
