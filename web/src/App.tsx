import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { Avisos, avisar } from "./componentes/Avisos"
import { BarraNav } from "./componentes/BarraNav"
import { Fondo, TituloCinetico } from "./componentes/Deco"
import { NuevoPlan } from "./pantallas/NuevoPlan"
import { VistaRapida } from "./componentes/VistaRapida"
import { Hoy } from "./pantallas/Hoy"
import { Login } from "./pantallas/Login"
import { Mas } from "./pantallas/Mas"
import { PlanDetalle } from "./pantallas/PlanDetalle"
import { Planes } from "./pantallas/Planes"
import { Recuerdos } from "./pantallas/Recuerdos"
import { Wrapped } from "./pantallas/Wrapped"
import { enArchivo, pb } from "./pb"
import { useRuta } from "./router"
import { iniciar, useStore } from "./store"
import { racha } from "./calculos"
import { volver } from "./router"
import { aplicarTokens } from "./temas"

export function App() {
  const [logueado, setLogueado] = useState(pb.authStore.isValid)
  const listo = useStore((s) => s.listo)
  const temas = useStore((s) => s.temas)
  const ruta = useRuta()
  const [nuevo, setNuevo] = useState(false)

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

  // El tema compartido: el activo del archivo (en vivo, si el otro lo cambia).
  useEffect(() => {
    const activo = temas.find((t) => t.activo)
    if (activo) aplicarTokens(activo.tokens)
  }, [temas])

  useEffect(() => pb.authStore.onChange(() => setLogueado(pb.authStore.isValid)), [])

  if (!logueado)
    return (
      <>
        <Fondo />
        <Login onEntrar={() => setLogueado(true)} />
        <Avisos />
      </>
    )

  if (!listo)
    return (
      <>
        <Fondo />
        <div className="cargando">
          <TituloCinetico lineas={["Cargando", "plancitos"]} asoma="entrada" />
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
    case "recuerdos":
      pantalla = <Recuerdos />
      break
    case "wrapped":
      pantalla = <Wrapped anio={Number(ruta.partes[1]) || new Date().getFullYear()} />
      break
    case "mas":
      pantalla = <Mas sub={ruta.partes[1]} />
      break
    default:
      pantalla = <Hoy onNuevo={() => setNuevo(true)} />
  }
  const pantallaCompleta = seccion === "wrapped"
  const tab = seccion === "plan" ? "planes" : seccion

  return (
    <>
      <Fondo />
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
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
        >
          {pantalla}
        </motion.main>
      </AnimatePresence>
      {!pantallaCompleta && <BarraNav actual={tab} onNuevo={() => setNuevo(true)} />}
      <NuevoPlan abierta={nuevo} onCerrar={() => setNuevo(false)} categoriaInicial={ruta.query.get("cat") ?? undefined} />
      <VistaRapida />
      <Avisos />
    </>
  )
}

const NOMBRES: Record<string, string> = { planes: "Planes", recuerdos: "Recuerdos", mas: "Más", plan: "Plan" }

/** La barra de arriba, enmarcada: la marca y la racha, o volver en las internas. */
function BarraSuperior({ seccion, sub }: { seccion: string; sub?: string }) {
  const planes = useStore((s) => s.planes)
  const interna = seccion === "plan" || (seccion === "mas" && sub)
  return (
    <header className="barra">
      {interna ? (
        <button className="barra-volver" onClick={() => volver(seccion === "plan" ? "/planes" : "/mas")} aria-label="Volver">
          ←
        </button>
      ) : (
        <a className="barra-marca" href="#/">
          estoy para <b>esa</b>
        </a>
      )}
      <div className="barra-der">
        {interna && <span className="barra-chip">{NOMBRES[seccion] ?? ""}</span>}
        <span className="barra-chip" title="Semanas seguidas haciendo algo">
          🔥 {racha(planes)} sem
        </span>
      </div>
    </header>
  )
}
