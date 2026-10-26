import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import { App } from "./App"
import { enArchivo } from "./pb"
import "@fontsource-variable/bricolage-grotesque/standard.css"
import "@fontsource-variable/dm-sans"
import "@fontsource/space-mono/400.css"
import "@fontsource/space-mono/700.css"
import "./estilos/base.css"
import "./estilos/arte.css"
import "./estilos/pantallas.css"

// El diseño es fijo (v3): los tokens viven en :root, en base.css. El tema
// que quedó guardado de versiones anteriores ya no se usa.
try {
  localStorage.removeItem("epe_tema")
} catch {
  /* sin almacenamiento */
}

// Las versiones del archivo no se instalan ni registran service worker: son
// para mirar. Cuando se publica una versión nueva, el service worker nuevo
// toma el control solo y recarga la app una vez (ver sw.ts).
if (!enArchivo && window.top === window && "serviceWorker" in navigator) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
