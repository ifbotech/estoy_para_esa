import { useState } from "react"
import { raizApp } from "../../pb"
import versiones from "../../versiones.json"

/**
 * El archivo: cada versión de la app queda publicada en
 * /estoyparaesa/archivo/<id>/ (la sube el deploy) y se puede abrir entera.
 */
export function Archivo() {
  const [abierta, setAbierta] = useState<string | null>(null)
  const raiz = raizApp()

  return (
    <div className="archivo">
      <p className="suave">Cada rediseño queda publicado entero. Se pueden abrir y usar: todas leen los mismos planes.</p>
      <section>
        <div className="versiones">
          {versiones.map((v, i) => (
            <article key={v.id} className="version">
              <div className="version-pantalla">
                {abierta === v.id ? (
                  <iframe title={`Versión ${v.id}`} src={`${raiz}archivo/${v.id}/`} loading="lazy" />
                ) : (
                  <button className="version-tapa" onClick={() => setAbierta(v.id)}>
                    <span className="version-id">{v.id}</span>
                    <span>▶ mirar acá</span>
                  </button>
                )}
              </div>
              <div className="version-info">
                <span className="etiqueta">
                  {v.id} · {new Date(v.fecha + "T12:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
                  {i === 0 && " · la actual"}
                </span>
                <h3>{v.nombre}</h3>
                <p className="suave">{v.notas}</p>
                <a className="link-externo" href={`${raiz}archivo/${v.id}/`} target="_blank" rel="noreferrer">
                  Abrir entera ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
