import { useEffect, useState } from "react"

/**
 * Rutas con #: el mismo build anda en /estoyparaesa/ y en cualquier versión
 * archivada sin configurar nada en el servidor.
 *
 *   #/                  Hoy
 *   #/planes?estado=…&cat=…
 *   #/plan/<id>
 *   #/recuerdos
 *   #/wrapped/<año>
 *   #/mas, #/mas/tema, #/mas/archivo, #/mas/categorias, #/mas/letterboxd
 */
export interface Ruta {
  partes: string[]
  query: URLSearchParams
}

function leer(): Ruta {
  const h = location.hash.replace(/^#\/?/, "")
  const [path, q = ""] = h.split("?")
  return { partes: path.split("/").filter(Boolean), query: new URLSearchParams(q) }
}

export function useRuta(): Ruta {
  const [ruta, setRuta] = useState(leer)
  useEffect(() => {
    const f = () => {
      setRuta(leer())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener("hashchange", f)
    return () => window.removeEventListener("hashchange", f)
  }, [])
  return ruta
}

export function ir(path: string) {
  location.hash = path.startsWith("#") ? path : `#${path}`
}

export function volver(alternativa = "/") {
  if (history.length > 1) history.back()
  else ir(alternativa)
}
