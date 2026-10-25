import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import { App } from "./App"
import { avisar } from "./componentes/Avisos"
import { enArchivo } from "./pb"
import { aplicarTokens, temaGuardado } from "./temas"
import "./estilos/base.css"
import "./estilos/arte.css"
import "./estilos/personalidades.css"
import "./estilos/pantallas.css"

aplicarTokens(temaGuardado())

// Las versiones del archivo no se instalan ni registran service worker: son
// para mirar. La actual avisa cuando hay una nueva publicada.
if (!enArchivo && window.top === window && "serviceWorker" in navigator) {
  const actualizar = registerSW({
    immediate: true,
    onNeedRefresh() {
      avisar("Hay una versión nueva ✨", "info", { texto: "Actualizar", hacer: () => actualizar(true) }, 0)
    },
  })
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
