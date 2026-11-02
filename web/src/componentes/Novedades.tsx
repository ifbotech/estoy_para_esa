import { useEffect, useMemo, useRef, useState } from "react"
import { fecha } from "../calculos"
import { NOVEDADES_APP, marcarNovedadesAppVistas, novedadesAppVistas } from "../novedadesApp"
import { ir } from "../router"
import { marcarNovedadesVistas, useStore, useYo } from "../store"
import type { Novedad } from "../tipos"
import { vibrar } from "../util/efectos"
import { Hoja } from "./Controles"

/**
 * Las novedades: una estrella de seis picos desparejos arriba a la derecha.
 * Se pone amarilla y con el número cuando hay algo sin ver; tocarla abre el
 * panel con lo que hizo el otro (los avisos del servidor, guardados aunque no
 * tengas push) y lo nuevo en la app.
 */

/** La estrella: seis picos de largo y ángulo distinto, con las puntas blandas. */
const ESTRELLA = (() => {
  const largos = [10.6, 8.4, 9.8, 7.6, 10.1, 8.8]
  const giros = [0, 0.12, -0.08, 0.1, -0.05, 0.07]
  const pts: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + giros[i]
    pts.push([12 + Math.cos(a) * largos[i], 12 + Math.sin(a) * largos[i]])
    const b = a + Math.PI / 6 + giros[(i + 2) % 6] * 0.6
    const r = 4.1 + (i % 3) * 0.35
    pts.push([12 + Math.cos(b) * r, 12 + Math.sin(b) * r])
  }
  const f = (v: number) => Math.round(v * 100) / 100
  // las puntas, redondeadas con una curva que pasa cerca del pico
  let d = ""
  pts.forEach(([x, y], i) => {
    const [px, py] = pts[(i - 1 + pts.length) % pts.length]
    const mx = (px + x) / 2
    const my = (py + y) / 2
    d += i === 0 ? `M${f(mx)} ${f(my)}` : ""
    const [nx, ny] = pts[(i + 1) % pts.length]
    d += ` Q${f(x)} ${f(y)} ${f((x + nx) / 2)} ${f((y + ny) / 2)}`
  })
  return d + "Z"
})()

export function Estrella({ llena }: { llena: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="estrella-novedades" aria-hidden>
      <path d={ESTRELLA} fill={llena ? "var(--amarillo)" : "var(--superficie)"} stroke="var(--tinta)" strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  )
}

/** «hace 5 min», «hace 3 h», «ayer 21:40», «12 oct». */
function cuando(s: string, ahora = new Date()) {
  const d = fecha(s)
  if (!d) return ""
  const min = Math.round((ahora.getTime() - d.getTime()) / 60000)
  if (min < 1) return "recién"
  if (min < 60) return `hace ${min} min`
  if (min < 60 * 12) return `hace ${Math.round(min / 60)} h`
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()
  const dia = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  if (dia === hoy) return `hoy ${hora}`
  if (hoy - dia === 86400000) return `ayer ${hora}`
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "")
}

/** El botón de la barra de arriba, con su panel. */
export function BotonNovedades() {
  const novedades = useStore((s) => s.novedades)
  const [abierta, setAbierta] = useState(false)
  const [appVistas, setAppVistas] = useState(novedadesAppVistas)
  const sinVer = novedades.filter((n) => !n.vista).length + NOVEDADES_APP.filter((n) => !appVistas.includes(n.id)).length

  return (
    <>
      <button
        className={`boton-novedades ${sinVer ? "con" : ""}`}
        aria-label={sinVer ? `Novedades: ${sinVer} sin ver` : "Novedades"}
        onClick={() => {
          vibrar(12)
          setAbierta(true)
        }}
      >
        <Estrella llena={sinVer > 0} />
        {sinVer > 0 && <span className="boton-novedades-num num">{sinVer > 9 ? "9+" : sinVer}</span>}
      </button>
      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Novedades">
        {abierta && (
          <Panel
            novedades={novedades}
            appVistas={appVistas}
            onVer={() => {
              marcarNovedadesAppVistas()
              setAppVistas(novedadesAppVistas())
            }}
            onIr={(url) => {
              setAbierta(false)
              if (url) ir(url.replace(/^#/, ""))
            }}
          />
        )}
      </Hoja>
    </>
  )
}

function Panel({ novedades, appVistas, onVer, onIr }: { novedades: Novedad[]; appVistas: string[]; onVer: () => void; onIr: (url?: string) => void }) {
  const usuarios = useStore((s) => s.usuarios)
  const yo = useYo()
  const otro = usuarios.find((u) => u.id !== yo?.id)
  // lo que estaba sin ver al abrir queda marcado como «nuevo» mientras el panel está abierto
  const nuevas = useRef(new Set(novedades.filter((n) => !n.vista).map((n) => n.id)))
  const nuevasApp = useRef(new Set(NOVEDADES_APP.filter((n) => !appVistas.includes(n.id)).map((n) => n.id)))
  useEffect(() => {
    const t = setTimeout(() => {
      void marcarNovedadesVistas([...nuevas.current])
      onVer()
    }, 900)
    return () => clearTimeout(t)
  }, [])

  const grupos = useMemo(() => {
    const g: { dia: string; items: Novedad[] }[] = []
    const ahora = new Date()
    for (const n of novedades.slice(0, 60)) {
      const d = fecha(n.created)
      const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()
      const dia = d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : 0
      const nombre = dia === hoy ? "hoy" : hoy - dia === 86400000 ? "ayer" : d ? d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }) : ""
      const ultimo = g[g.length - 1]
      if (ultimo && ultimo.dia === nombre) ultimo.items.push(n)
      else g.push({ dia: nombre, items: [n] })
    }
    return g
  }, [novedades])

  return (
    <div className="novedades">
      {!novedades.length && (
        <p className="novedades-vacio">Todavía nada. Acá va a aparecer lo que haga {otro?.name ?? "el otro"}: planes nuevos, ganas, decisiones…</p>
      )}
      {grupos.map((g) => (
        <section key={g.dia} className="novedades-dia">
          <h3 className="etiqueta">{g.dia}</h3>
          <ul>
            {g.items.map((n) => (
              <li key={n.id}>
                <button className={`novedad ${nuevas.current.has(n.id) ? "nueva" : ""}`} onClick={() => onIr(n.url)}>
                  <span className="novedad-texto">
                    <b>{n.titulo}</b>
                    {n.cuerpo && <span>{n.cuerpo}</span>}
                  </span>
                  <span className="novedad-cuando num">{cuando(n.created)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="novedades-app">
        <h3 className="etiqueta">nuevo en la app</h3>
        <ul>
          {NOVEDADES_APP.map((n) => (
            <li key={n.id}>
              <button className={`novedad-app ${nuevasApp.current.has(n.id) ? "nueva" : ""}`} onClick={() => onIr(n.url)} disabled={!n.url}>
                <b>{n.titulo}</b>
                <span>{n.texto}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
