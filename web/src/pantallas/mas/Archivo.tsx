import { motion } from "motion/react"
import { useState } from "react"
import { avisar } from "../../componentes/Avisos"
import { Boton } from "../../componentes/Controles"
import { raizApp } from "../../pb"
import { activarTema, useStore } from "../../store"
import { esTemaV2, FUENTES } from "../../temas"
import versiones from "../../versiones.json"

/**
 * El archivo: cada versión de la app queda publicada en
 * /estoyparaesa/archivo/<id>/ (la sube el deploy) y se puede abrir entera;
 * cada tema guardado queda acá con su número de versión.
 */
export function Archivo() {
  const temas = useStore((s) => s.temas)
  const usuarios = useStore((s) => s.usuarios)
  const [abierta, setAbierta] = useState<string | null>(null)
  const raiz = raizApp()

  return (
    <div className="archivo">
      <section className="seccion">
        <div className="seccion-cabeza">
          <h2>
            Versiones de la <span className="serif">app</span>
          </h2>
        </div>
        <div className="versiones">
          {versiones.map((v, i) => (
            <motion.article key={v.id} className="version" initial={{ opacity: 0, y: 20, rotate: i % 2 ? 1 : -1 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
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
            </motion.article>
          ))}
        </div>
      </section>

      <section className="seccion">
        <div className="seccion-cabeza">
          <h2>
            Versiones del <span className="serif">tema</span>
          </h2>
          <a href="#/mas/tema">editar</a>
        </div>
        {!temas.length && <p className="suave">Todavía no guardaron ningún tema: están usando «Kiosco Cósmico», el de fábrica.</p>}
        <div className="temas-lista">
          {temas.map((t, i) => (
            <motion.div
              key={t.id}
              className={`tema-version ${t.activo ? "activo" : ""}`}
              style={{ background: t.tokens.bg, color: t.tokens.tinta, borderRadius: t.tokens.radio }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <span className="tema-num" style={{ background: t.tokens.a1, color: t.tokens.bg }}>
                v{t.version}
              </span>
              <div className="tema-texto">
                <b style={{ fontFamily: FUENTES[t.tokens.display]?.css }}>{t.nombre}</b>
                <small style={{ color: t.tokens.suave }}>
                  {new Date(t.created.replace(" ", "T")).toLocaleDateString("es-AR")} · {usuarios.find((u) => u.id === t.creado_por)?.name ?? ""}
                  {t.nota && ` · ${t.nota}`}
                </small>
                <span className="preset-colores">
                  {[t.tokens.a1, t.tokens.a2, t.tokens.a3, t.tokens.a4].map((c, j) => (
                    <i key={j} style={{ background: c }} />
                  ))}
                </span>
              </div>
              {!esTemaV2(t.tokens) ? (
                <span className="etiqueta" style={{ color: t.tokens.suave }}>
                  de la v1
                </span>
              ) : t.activo ? (
                <span className="etiqueta" style={{ color: t.tokens.a2 }}>
                  en uso
                </span>
              ) : (
                <Boton
                  className="boton-chico"
                  onClick={() => {
                    activarTema(t.id)
                    avisar(`Volvieron al tema v${t.version} ✨`)
                  }}
                >
                  Usar
                </Boton>
              )}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
