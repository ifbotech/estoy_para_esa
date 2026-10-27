import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useState } from "react"
import { Avisos, avisar } from "./componentes/Avisos"
import { BarraNav } from "./componentes/BarraNav"
import { EnVivo } from "./componentes/Deco"
import { Globos } from "./componentes/Globos"
import { NuevoPlan, type ModoNuevo } from "./pantallas/NuevoPlan"
import { VistaRapida } from "./componentes/VistaRapida"
import { Login } from "./pantallas/Login"
import { Mas } from "./pantallas/Mas"
import { PlanDetalle } from "./pantallas/PlanDetalle"
import { Decidir } from "./pantallas/Decidir"
import { Planes } from "./pantallas/Planes"
import { Sumar } from "./pantallas/Sumar"
import { Wrapped } from "./pantallas/Wrapped"
import { enArchivo, pb } from "./pb"
import { ir, useRuta } from "./router"
import { iniciar, useStore, useYo } from "./store"
import { decisionesPendientes } from "./calculos"
import { asegurarPush } from "./util/push"
import { volver } from "./router"
import { marcarWrapVisto, traerWrap, wrapVisto } from "./wrap"

export function App() {
  const [logueado, setLogueado] = useState(pb.authStore.isValid)
  const listo = useStore((s) => s.listo)
  const ruta = useRuta()
  // la hoja de nuevo plan: cerrada (null) o abierta, con la categoría elegida si la hay
  const [nuevo, setNuevo] = useState<{ cat?: string; modo?: ModoNuevo } | null>(null)
  const abrirNuevo = (cat?: string, modo?: ModoNuevo) => setNuevo({ cat, modo })

  useEffect(() => {
    if (!logueado) return
    iniciar().catch((e) => {
      console.error(e)
      if (e?.status === 401) {
        pb.authStore.clear()
        setLogueado(false)
      } else avisar("No pude conectarme 😵 Reintentá en un ratito.", "error", undefined, 6000)
    })
    // Renueva el token de vez en cuando: así no hay que volver a entrar nunca.
    pb.collection("users").authRefresh().catch(() => {})
  }, [logueado])

  // Cuando el servidor abre un Wrapped, la primera vez se abre solo (como el de Spotify).
  useEffect(() => {
    if (!listo) return
    traerWrap().then((w) => {
      if (w && !wrapVisto(w) && !location.hash.startsWith("#/wrapped")) {
        marcarWrapVisto(w)
        ir("/wrapped")
      }
    })
  }, [listo])

  // Avisos push: se revisan (y se arreglan solos) al abrir la app y cada vez
  // que vuelve a primer plano. Si tocan un aviso con la app abierta, el
  // service worker pide cambiar de pantalla sin recargar.
  useEffect(() => {
    if (!listo || enArchivo) return
    void asegurarPush()
    const alVolver = () => document.visibilityState === "visible" && void asegurarPush()
    const alMensaje = (ev: MessageEvent) => {
      if (ev.data?.tipo === "abrir" && typeof ev.data.hash === "string") location.hash = ev.data.hash.replace(/^#/, "")
    }
    document.addEventListener("visibilitychange", alVolver)
    navigator.serviceWorker?.addEventListener("message", alMensaje)
    return () => {
      document.removeEventListener("visibilitychange", alVolver)
      navigator.serviceWorker?.removeEventListener("message", alMensaje)
    }
  }, [listo])

  useNumeritoDelIcono()

  useEffect(() => pb.authStore.onChange(() => setLogueado(pb.authStore.isValid)), [])

  if (!logueado)
    return (
      <>
        <Login onEntrar={() => setLogueado(true)} />
        <Avisos />
      </>
    )

  if (!listo)
    return (
      <>
        <div className="cargando" role="status">
          <span className="cargando-marca">estoy para esa <span className="marca-cuadro grande"><Globos tam={28} /></span></span>
          <span className="cargando-barra" aria-hidden>
            <i />
          </span>
          <span className="etiqueta">trayendo los plancitos…</span>
        </div>
        <Avisos />
      </>
    )

  const seccion = ruta.partes[0] ?? ""
  let pantalla: React.ReactNode
  switch (seccion) {
    case "planes":
      pantalla = <Planes ruta={ruta} />
      break
    case "plan":
      pantalla = <PlanDetalle id={ruta.partes[1]} />
      break
    case "decidir":
      pantalla = <Decidir />
      break
    case "wrapped":
      pantalla = <Wrapped />
      break
    case "mas":
      pantalla = <Mas sub={ruta.partes[1]} />
      break
    default:
      pantalla = <Sumar onNuevo={abrirNuevo} />
  }
  const pantallaCompleta = seccion === "wrapped"
  const tab = seccion === "plan" ? "planes" : seccion

  return (
    <>
      {enArchivo && (
        <div className="cinta-archivo">
          📼 Versión archivada · <a href="../../">ir a la actual</a>
        </div>
      )}
      {!pantallaCompleta && <BarraSuperior seccion={seccion} sub={ruta.partes[1]} />}
      <AnimatePresence mode="wait">
        <motion.main
          key={ruta.partes.slice(0, 2).join("/")}
          className={`pantalla ${pantallaCompleta ? "completa" : ""}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {pantalla}
        </motion.main>
      </AnimatePresence>
      {/* en el detalle de un plan, abajo va su barra de acción (ver PlanDetalle) */}
      {!pantallaCompleta && seccion !== "plan" && <BarraNav actual={tab} />}
      <NuevoPlan
        abierta={nuevo !== null}
        onCerrar={() => setNuevo(null)}
        categoriaInicial={nuevo?.cat ?? ruta.query.get("cat") ?? undefined}
        modoInicial={nuevo?.modo}
      />
      <VistaRapida />
      <Avisos />
    </>
  )
}

const NOMBRES: Record<string, string> = { planes: "Planes", mas: "Más", plan: "Plan" }

/**
 * El numerito en el ícono de la app (iPhone y Android, con la app instalada):
 * lo que espera algo de vos, planes sin tus ganas y preguntas de Decidir.
 */
function useNumeritoDelIcono() {
  const listo = useStore((s) => s.listo)
  const planes = useStore((s) => s.planes)
  const votos = useStore((s) => s.votos)
  const preguntas = useStore((s) => s.preguntas)
  const respuestas = useStore((s) => s.respuestas)
  const yo = useYo()
  const n = useMemo(() => {
    if (!yo) return 0
    const sinGanas = planes.filter((p) => p.estado !== "hecho" && !votos.some((v) => v.plan === p.id && v.usuario === yo.id)).length
    return sinGanas + decisionesPendientes(preguntas, respuestas, yo.id)
  }, [planes, votos, preguntas, respuestas, yo])
  useEffect(() => {
    if (!listo || enArchivo) return
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
    if (!nav.setAppBadge) return
    void (n ? nav.setAppBadge(n) : (nav.clearAppBadge?.() ?? nav.setAppBadge(0))).catch(() => {})
  }, [n, listo])
}

/** La barra de arriba: la marca (o volver en las internas), el en vivo y lo hecho. */
function BarraSuperior({ seccion, sub }: { seccion: string; sub?: string }) {
  const planes = useStore((s) => s.planes)
  const conectado = useStore((s) => s.conectado)
  // Lo mismo que cuenta Sumar y la pestaña «Hecho» de Planes: todo lo marcado
  // como hecho, tenga o no fecha (los importados viejos pueden no tenerla).
  const hechos = useMemo(() => planes.filter((p) => p.estado === "hecho").length, [planes])
  const interna = seccion === "plan" || (seccion === "mas" && sub)
  return (
    <header className="barra">
      {interna ? (
        <button className="barra-volver" onClick={() => volver(seccion === "plan" ? "/planes" : "/mas")} aria-label="Volver">
          ← <span>{NOMBRES[seccion === "plan" ? "planes" : "mas"]}</span>
        </button>
      ) : (
        <a className="barra-marca" href="#/">
          <span className="marca-cuadro"><Globos tam={22} /></span> estoy para esa
        </a>
      )}
      <div className="barra-der">
        <EnVivo conectado={conectado} />
        <span className="barra-chip num" title="Planes que ya hicieron juntos">
          {hechos} {hechos === 1 ? "hecho" : "hechos"}
        </span>
      </div>
    </header>
  )
}
