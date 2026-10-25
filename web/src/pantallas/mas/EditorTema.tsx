import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { avisar } from "../../componentes/Avisos"
import { Boton } from "../../componentes/Controles"
import { getEstado, guardarTema, useStore } from "../../store"
import { aplicarTokens, FUENTES, PRESETS, TEMA_INICIAL } from "../../temas"
import type { FuenteKey, Tokens } from "../../tipos"
import { festejar } from "../../util/efectos"

const COLORES: { k: keyof Tokens; nombre: string }[] = [
  { k: "bg", nombre: "Fondo" },
  { k: "bg2", nombre: "Brillo del fondo" },
  { k: "superficie", nombre: "Tarjetas" },
  { k: "tinta", nombre: "Texto" },
  { k: "suave", nombre: "Texto suave" },
  { k: "a1", nombre: "Acento 1" },
  { k: "a2", nombre: "Acento 2" },
  { k: "a3", nombre: "Acento 3" },
  { k: "a4", nombre: "Acento 4" },
]

/** El tema se prueba en vivo; al guardar queda como una versión nueva. */
export function EditorTema() {
  const temas = useStore((s) => s.temas)
  const activo = temas.find((t) => t.activo)
  const base = activo?.tokens ?? TEMA_INICIAL.tokens
  const [t, setT] = useState<Tokens>(base)
  const [nombre, setNombre] = useState("")
  const [nota, setNota] = useState("")
  const cambiado = JSON.stringify(t) !== JSON.stringify(base)

  useEffect(() => aplicarTokens(t), [t])
  // Si se va sin guardar, vuelve el tema activo.
  useEffect(() => () => aplicarTokens(getEstado().temas.find((x) => x.activo)?.tokens ?? TEMA_INICIAL.tokens), [])

  const set = <K extends keyof Tokens>(k: K, v: Tokens[K]) => setT((x) => ({ ...x, [k]: v }))

  const guardar = async (e: React.MouseEvent) => {
    const n = nombre.trim() || `Versión ${(temas[0]?.version ?? 0) + 1}`
    const rec = await guardarTema(n, t, nota.trim())
    if (rec) {
      festejar(e.clientX / innerWidth, e.clientY / innerHeight)
      avisar(`Tema «${n}» guardado como v${rec.version} 🎨`)
      setNombre("")
      setNota("")
    }
  }

  return (
    <div className="editor-tema">
      <p className="suave">El tema es de los dos: lo que guarden acá le cambia la app al otro también, en vivo.</p>

      <section className="seccion">
        <p className="etiqueta" style={{ marginBottom: 10 }}>
          Para arrancar
        </p>
        <div className="fila-scroll">
          {PRESETS.map((p) => (
            <motion.button
              key={p.nombre}
              className="preset"
              onClick={() => {
                setT(p.tokens)
                setNombre(p.nombre)
                setNota(p.nota)
              }}
              whileTap={{ scale: 0.94 }}
              style={{ background: p.tokens.bg, color: p.tokens.tinta, borderRadius: p.tokens.radio }}
            >
              <span className="preset-colores">
                {[p.tokens.a1, p.tokens.a2, p.tokens.a3, p.tokens.a4].map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <b style={{ fontFamily: FUENTES[p.tokens.display].css }}>{p.nombre}</b>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="seccion bloque">
        <div className="seccion-cabeza">
          <h2>Colores</h2>
          <label className="interruptor" style={{ padding: 0 }}>
            <span className="etiqueta">{t.modo === "claro" ? "claro" : "oscuro"}</span>
            <input type="checkbox" checked={t.modo === "claro"} onChange={(e) => set("modo", e.target.checked ? "claro" : "oscuro")} />
          </label>
        </div>
        <div className="colores">
          {COLORES.map((c) => (
            <label key={c.k} className="color">
              <input type="color" value={t[c.k] as string} onChange={(e) => set(c.k, e.target.value as never)} />
              <span>{c.nombre}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="seccion bloque">
        <div className="seccion-cabeza">
          <h2>Letras</h2>
        </div>
        <div className="grid2">
          <label className="campo-etiqueta">
            <span>Títulos</span>
            <select className="campo" value={t.display} onChange={(e) => set("display", e.target.value as FuenteKey)}>
              {Object.entries(FUENTES).map(([k, f]) => (
                <option key={k} value={k}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="campo-etiqueta">
            <span>Texto</span>
            <select className="campo" value={t.cuerpo} onChange={(e) => set("cuerpo", e.target.value as FuenteKey)}>
              {Object.entries(FUENTES).map(([k, f]) => (
                <option key={k} value={k}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="seccion bloque">
        <div className="seccion-cabeza">
          <h2>Forma y ritmo</h2>
        </div>
        <Deslizador nombre="Redondez" min={0} max={36} paso={1} valor={t.radio} sufijo="px" onCambio={(v) => set("radio", v)} />
        <Deslizador nombre="Grano de papel" min={0} max={1} paso={0.05} valor={t.grano} onCambio={(v) => set("grano", v)} />
        <Deslizador nombre="Movimiento" min={0} max={2} paso={0.1} valor={t.movimiento} sufijo="×" onCambio={(v) => set("movimiento", v)} />
      </section>

      <section className="seccion bloque guardar-tema">
        <div className="seccion-cabeza">
          <h2>Guardar versión</h2>
        </div>
        <input className="campo" placeholder="Nombre del tema" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className="campo" placeholder="¿Qué cambió? (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
        <div className="fila">
          <Boton onClick={guardar} disabled={!cambiado && !nombre}>
            Guardar y usar
          </Boton>
          {cambiado && (
            <Boton variante="fantasma" onClick={() => setT(base)}>
              Deshacer
            </Boton>
          )}
        </div>
      </section>
    </div>
  )
}

function Deslizador({ nombre, min, max, paso, valor, sufijo = "", onCambio }: { nombre: string; min: number; max: number; paso: number; valor: number; sufijo?: string; onCambio: (v: number) => void }) {
  return (
    <label className="deslizador">
      <span>
        {nombre} <b>{Number.isInteger(paso) ? valor : valor.toFixed(2).replace(/\.?0+$/, "")}{sufijo}</b>
      </span>
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onCambio(Number(e.target.value))} />
    </label>
  )
}
