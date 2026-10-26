import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import { App } from "./App"
import { enArchivo } from "./pb"
import { aplicarTokens, temaGuardado } from "./temas"
import "./estilos/base.css"
import "./estilos/arte.css"
import "./estilos/pantallas.css"

aplicarTokens(temaGuardado())

// Las versiones del archivo no se instalan ni registran service worker: son
// para mirar. Cuando se publica una versión nueva, el service worker nuevo
// toma el control solo y la app se recarga una vez.
if (!enArchivo && window.top === window && "serviceWorker" in navigator) {
  const habiaVersion = Boolean(navigator.serviceWorker.controller)
  let recargando = false
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!habiaVersion || recargando) return
    recargando = true
    location.reload()
  })
  registerSW({ immediate: true })
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
