import { abrirVistaRapida, cambiarEstado, useVistaRapida } from "../acciones"
import { ir } from "../router"
import { useStore } from "../store"
import { Arte } from "./Arte"
import { Boton, GanasDeLosDos, Hoja, Pasos } from "./Controles"
import { ChipCategoria, imagenDe } from "./Tarjetas"

/** Mantener apretado un plan: lo justo para decidir sin entrar. */
export function VistaRapida() {
  const id = useVistaRapida()
  const plan = useStore((s) => s.planes).find((p) => p.id === id)
  const cat = useStore((s) => s.categorias).find((c) => c.id === plan?.categoria)
  const cerrar = () => abrirVistaRapida(null)
  const img = plan ? imagenDe(plan, "200x200") : ""

  return (
    <Hoja
      abierta={Boolean(plan)}
      onCerrar={cerrar}
      titulo={plan?.titulo}
      pie={
        plan && (
          <Boton
            className="boton-grande"
            onClick={() => {
              cerrar()
              ir(`/plan/${plan.id}`)
            }}
          >
            Abrir el plan →
          </Boton>
        )
      }
    >
      {plan && (
        <div className="rapida">
          <div className="rapida-cabeza" style={{ "--cc": cat?.color || "var(--amarillo)" } as React.CSSProperties}>
            {img ? <img src={img} alt="" /> : <Arte tipo={cat?.personalidad ?? "salida"} tam={8} />}
            <ChipCategoria cat={cat} />
          </div>
          <Pasos actual={plan.estado} onCambio={(e, ev) => cambiarEstado(plan, e, ev)} />
          <GanasDeLosDos planId={plan.id} />
        </div>
      )}
    </Hoja>
  )
}
