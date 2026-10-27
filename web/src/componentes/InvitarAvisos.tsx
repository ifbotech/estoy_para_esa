import { useState } from "react"
import { activarPush, useEstadoPush } from "../util/push"
import { avisar } from "./Avisos"

const CLAVE = "epe_invitar_avisos"
const SEMANA = 7 * 24 * 60 * 60 * 1000

function cerradaHasta(): number {
  try {
    return Number(localStorage.getItem(CLAVE)) || 0
  } catch {
    return 0
  }
}

/**
 * Arriba en Sumar, mientras este teléfono no tenga los avisos andando: un
 * toque los activa (iOS exige que el permiso se pida con un toque). En
 * iPhone sin instalar, o con el permiso negado, lleva a las instrucciones.
 * Se puede cerrar por una semana.
 */
export function InvitarAvisos() {
  const { estado } = useEstadoPush()
  const [cerrada, setCerrada] = useState(() => cerradaHasta() > Date.now())
  const [ocupado, setOcupado] = useState(false)
  if (cerrada || !["pedir", "instalar", "denegado", "error"].includes(estado)) return null

  const cerrar = () => {
    try {
      localStorage.setItem(CLAVE, String(Date.now() + SEMANA))
    } catch {
      /* sin almacenamiento: se cierra hasta la próxima vez */
    }
    setCerrada(true)
  }

  const textos: Record<string, [string, string]> = {
    pedir: ["Activá los avisos", "planes nuevos, ganas, Decidir y recordatorios, al toque"],
    error: ["Los avisos no arrancaron", "tocá para reintentar"],
    instalar: ["Agregala al inicio para tener avisos", "en iPhone sólo andan con la app instalada"],
    denegado: ["Los avisos están bloqueados", "te cuento cómo destrabarlos"],
  }
  const [titulo, sub] = textos[estado]
  const directo = estado === "pedir" || estado === "error"

  const contenido = (
    <>
      <span aria-hidden>🔔</span>
      <span>
        <b>{titulo}</b>
        <small>{sub}</small>
      </span>
      <span aria-hidden>→</span>
    </>
  )

  return (
    <div className="invitar-avisos">
      {directo ? (
        <button
          className="sumar-idea"
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true)
            const r = await activarPush()
            setOcupado(false)
            if (r === "activo") avisar("Avisos activados 🔔")
            else if (r === "denegado") avisar("El teléfono no dio permiso 🙈", "error")
          }}
        >
          {contenido}
        </button>
      ) : (
        <a className="sumar-idea" href="#/mas/avisos">
          {contenido}
        </a>
      )}
      <button className="invitar-avisos-cerrar" onClick={cerrar} aria-label="Ahora no">
        ×
      </button>
    </div>
  )
}
