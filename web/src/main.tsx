import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import { App } from "./App"
import { FiltrosAerosol } from "./componentes/Aerosol"
import { enArchivo } from "./pb"
import "@fontsource-variable/bricolage-grotesque/standard.css"
import "@fontsource-variable/dm-sans"
import "@fontsource/space-mono/400.css"
import "@fontsource/space-mono/700.css"
import "./estilos/base.css"
import "./estilos/arte.css"
import "./estilos/pantallas.css"
import "./estilos/v4.css"

// El diseño es fijo (v4, sobre la v3): los tokens viven en :root, en base.css. El tema
// que quedó guardado de versiones anteriores ya no se usa.
try {
  localStorage.removeItem("epe_tema")
} catch {
  /* sin almacenamiento */
}

// Las versiones del archivo no se instalan ni registran service worker: son
// para mirar. Cuando se publica una versión nueva, el service worker nuevo
// toma el control solo y recarga la app una vez (ver sw.ts).
//
// En el iPhone, tocar el ícono de una app que quedó en segundo plano no la
// vuelve a abrir: retoma la pantalla. Por eso se pregunta si hay versión
// nueva cada vez que la app vuelve a primer plano (y cada media hora).
if (!enArchivo && window.top === window && "serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registro) {
      if (!registro) return
      let ultima = 0
      const revisar = () => {
        if (Date.now() - ultima < 60 * 1000 || !navigator.onLine) return
        ultima = Date.now()
        registro.update().catch(() => {})
      }
      document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && revisar())
      addEventListener("focus", revisar)
      addEventListener("online", revisar)
      setInterval(revisar, 30 * 60 * 1000)
    },
  })
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <FiltrosAerosol />
    <App />
  </StrictMode>,
)
