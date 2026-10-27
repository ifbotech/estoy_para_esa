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
import { iniciar, useStore } from "./store"
import { momentum } from "./calculos"
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
          <span className="cargando-marca">ESTOY PARA ESA <Globos tam={30} /></span>
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

/** La barra de arriba: la marca (o volver en las internas), el en vivo y lo hecho. */
function BarraSuperior({ seccion, sub }: { seccion: string; sub?: string }) {
  const planes = useStore((s) => s.planes)
  const conectado = useStore((s) => s.conectado)
  const m = useMemo(() => momentum(planes), [planes])
  const interna = seccion === "plan" || (seccion === "mas" && sub)
  return (
    <header className="barra">
      {interna ? (
        <button className="barra-volver" onClick={() => volver(seccion === "plan" ? "/planes" : "/mas")} aria-label="Volver">
          ← <span>{NOMBRES[seccion === "plan" ? "planes" : "mas"]}</span>
        </button>
      ) : (
        <a className="barra-marca" href="#/">
          ESTOY PARA ESA <Globos />
        </a>
      )}
      <div className="barra-der">
        <EnVivo conectado={conectado} />
        <span className="barra-chip num" title="Planes que ya hicieron juntos">
          {m.total} hechos
        </span>
      </div>
    </header>
  )
}
