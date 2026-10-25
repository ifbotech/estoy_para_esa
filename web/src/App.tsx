import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { Avisos, avisar } from "./componentes/Avisos"
import { BarraNav } from "./componentes/BarraNav"
import { Fondo, TituloCinetico } from "./componentes/Deco"
import { NuevoPlan } from "./pantallas/NuevoPlan"
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
          <TituloCinetico texto="Cargando plancitos…" />
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
      <AnimatePresence mode="wait">
        <motion.main
          key={ruta.partes.slice(0, 2).join("/")}
          className={`pantalla ${pantallaCompleta ? "completa" : ""}`}
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {pantalla}
        </motion.main>
      </AnimatePresence>
      {!pantallaCompleta && <BarraNav actual={tab} onNuevo={() => setNuevo(true)} />}
      <NuevoPlan abierta={nuevo} onCerrar={() => setNuevo(false)} categoriaInicial={ruta.query.get("cat") ?? undefined} />
      <Avisos />
    </>
  )
}
