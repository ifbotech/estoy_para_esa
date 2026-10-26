import { abrirVistaRapida, cambiarEstado, useVistaRapida } from "../acciones"
import { ir } from "../router"
import { useStore, useYo, votar } from "../store"
import { Arte } from "./Arte"
import { BarraGanas, Boton, Hoja, Pasos } from "./Controles"
import { ChipCategoria, colorDe, imagenDe } from "./Tarjetas"

/** Mantener apretado un plan: lo justo para decidir sin entrar. */
export function VistaRapida() {
  const id = useVistaRapida()
  const plan = useStore((s) => s.planes).find((p) => p.id === id)
  const cat = useStore((s) => s.categorias).find((c) => c.id === plan?.categoria)
  const usuarios = useStore((s) => s.usuarios)
  const votos = useStore((s) => s.votos)
  const yo = useYo()
  const cerrar = () => abrirVistaRapida(null)
  const img = plan ? imagenDe(plan, "200x200") : ""

  return (
    <Hoja abierta={Boolean(plan)} onCerrar={cerrar} titulo={plan?.titulo}>
      {plan && (
        <div className="rapida">
          <div className="rapida-cabeza" style={{ "--cap": cat?.color || "var(--a3)" } as React.CSSProperties}>
            {img ? <img src={img} alt="" /> : <Arte tipo={cat?.personalidad ?? "salida"} tam={10} />}
            <ChipCategoria cat={cat} />
          </div>
          <Pasos actual={plan.estado} onCambio={(e, ev) => cambiarEstado(plan, e, ev)} />
          {usuarios.map((u, i) => {
            const v = votos.find((x) => x.plan === plan.id && x.usuario === u.id)
            const mio = u.id === yo?.id
            return (
              <BarraGanas
                key={u.id}
                nombre={mio ? `${u.name} (vos)` : u.name}
                inicial={u.name.slice(0, 1)}
                color={colorDe(u, i)}
                valor={v?.ganas ?? 50}
                pendiente={!v && !mio}
                editable={mio}
                onCambio={(g) => votar(plan.id, { ganas: g })}
              />
            )
          })}
          <Boton
            className="boton-grande"
            onClick={() => {
              cerrar()
              ir(`/plan/${plan.id}`)
            }}
          >
            Abrir el plan →
          </Boton>
        </div>
      )}
    </Hoja>
  )
}
