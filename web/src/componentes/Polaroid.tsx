import { fecha, sellado } from "../calculos"
import { useStore } from "../store"
import type { Plan } from "../tipos"
import { Arte } from "./Arte"
import { Segmentos } from "./Deco"
import { imagenDe } from "./Tarjetas"

/**
 * Un recuerdo como Polaroid: la foto (o el personaje de la categoría), el
 * título, la fecha y cuánto le falta para quedar sellado. La única pieza de
 * la app que puede ir apenas torcida (`giro`, como mucho 1°).
 */
export function Polaroid({ plan, giro = 0, grande = false }: { plan: Plan; giro?: number; grande?: boolean }) {
  const cat = useStore((s) => s.categorias).find((c) => c.id === plan.categoria)
  const votos = useStore((s) => s.votos)
  const usuarios = useStore((s) => s.usuarios)
  const img = imagenDe(plan, grande ? "600x0" : "400x400")
  const s = sellado(plan, votos, usuarios)
  const d = fecha(plan.hecho_en)
  return (
    <a href={`#/plan/${plan.id}`} className={`polaroid ${grande ? "grande" : ""} ${s.completo ? "sellada" : ""}`} style={{ rotate: `${Math.max(-1, Math.min(1, giro))}deg` }}>
      <div className="polaroid-foto" style={{ background: cat?.color }}>
        {img ? <img src={img} alt="" loading="lazy" draggable={false} /> : <Arte tipo={cat?.personalidad ?? "salida"} tam={grande ? 16 : 11} />}
        {plan.fotos.length > 1 && <span className="polaroid-mas num">+{plan.fotos.length - 1}</span>}
      </div>
      <p className="polaroid-titulo">{plan.titulo}</p>
      <div className="polaroid-pie">
        <span className="num">
          {cat?.emoji} {d ? d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }).replace(".", "") : ""}
        </span>
        <Segmentos hechos={s.hechos} total={s.total} etiqueta={s.completo ? "sellado" : `${s.hechos}/${s.total}`} />
      </div>
    </a>
  )
}
