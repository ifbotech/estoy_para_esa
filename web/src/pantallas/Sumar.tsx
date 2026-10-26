import { aCiegas, fecha } from "../calculos"
import { Arte } from "../componentes/Arte"
import { useStore, useYo } from "../store"
import type { Personalidad } from "../tipos"
import { vibrar } from "../util/efectos"
import { nombreWrap, useWrap } from "../wrap"

/** Qué se suma con cada personalidad: «una peli», «un viaje»… */
const QUE: Record<Personalidad, string> = {
  cine: "una peli",
  cocina: "un lugar para comer",
  cafe: "un café",
  viaje: "un viaje",
  taller: "un proyecto",
  salida: "una salida",
}

/**
 * La primera pantalla: sumar una aventura nueva. Elegís la categoría (o lo
 * contás como te salga) y se abre la hoja de nuevo plan con eso elegido.
 * Lo que ya está anotado se ve y se vota en Planes.
 */
export function Sumar({ onNuevo }: { onNuevo: (categoria?: string) => void }) {
  const categorias = useStore((s) => s.categorias)
  const planes = useStore((s) => s.planes)
  const votos = useStore((s) => s.votos)
  const yo = useYo()
  const wrap = useWrap()
  const pendientes = planes.filter((p) => p.estado !== "hecho")
  const porVotar = pendientes.filter((p) => !votos.some((v) => v.plan === p.id && v.usuario === yo?.id))
  const tapados = porVotar.filter((p) => aCiegas(votos.filter((v) => v.plan === p.id), yo?.id)).length

  const abrir = (categoria?: string) => {
    vibrar(15)
    onNuevo(categoria)
  }

  return (
    <div className="sumar">
      <header className="cabeza-pantalla" style={{ "--cc": "var(--amarillo)" } as React.CSSProperties}>
        <div>
          <p className="etiqueta">nueva aventura</p>
          <h1 className="titulo-pantalla">¿Qué sumamos{yo?.name ? `, ${yo.name}` : ""}?</h1>
        </div>
      </header>

      {wrap && (
        <a href="#/wrapped" className="sumar-wrap">
          <span className="sumar-wrap-texto">
            <span className="etiqueta">🎁 llegó · hasta el {fecha(wrap.cierra)?.toLocaleDateString("es-AR", { day: "numeric", month: "long" })}</span>
            <b>Su Wrapped {nombreWrap(wrap)}</b>
          </span>
          <span className="sumar-wrap-play" aria-hidden>
            ▶
          </span>
        </a>
      )}

      <button className="sumar-charla" onClick={() => abrir()}>
        <span className="sumar-charla-campo">Contalo como te salga…</span>
        <span className="sumar-charla-ej etiqueta">ej: escapada a Colonia el 5 de diciembre</span>
        <span className="sumar-charla-mas" aria-hidden>
          +
        </span>
      </button>

      <p className="etiqueta sumar-o">o elegí qué es</p>

      <div className="sumar-cats">
        {categorias.map((c) => {
          const n = pendientes.filter((p) => p.categoria === c.id).length
          return (
            <button key={c.id} className="sumar-cat" style={{ "--cc": c.color || "var(--amarillo)" } as React.CSSProperties} onClick={() => abrir(c.id)}>
              <span className="sumar-cat-arte">
                <Arte tipo={c.personalidad} tam={8} />
              </span>
              <span className="sumar-cat-texto">
                <b>
                  {c.emoji} {c.nombre}
                </b>
                <small className="num">{n ? `${n} en la lista` : "¡estreno!"}</small>
              </span>
              <span className="sumar-cat-pie">
                <span>+ {QUE[c.personalidad] ?? "un plan"}</span>
                <span aria-hidden>→</span>
              </span>
            </button>
          )
        })}
        <a className="sumar-cat sumar-cat-otra" href="#/mas/categorias">
          <span className="sumar-cat-texto">
            <b>+ Otra categoría</b>
            <small>armala a su gusto</small>
          </span>
        </a>
      </div>

      {pendientes.length > 0 && (
      <a href="#/planes" className={`sumar-ver ${porVotar.length ? "con-votos" : ""}`}>
        <b className="num">{porVotar.length || pendientes.length}</b>
        <span>
          {porVotar.length
            ? `${porVotar.length === 1 ? "plan espera" : "planes esperan"} tus ganas${tapados ? `, ${tapados} con el otro voto tapado` : ""}`
            : pendientes.length === 1
              ? "plan en la lista, ya votado"
              : "planes en la lista, todos votados"}
        </span>
        <span aria-hidden>→</span>
      </a>
      )}
    </div>
  )
}
