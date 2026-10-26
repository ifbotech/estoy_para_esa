import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { avisar } from "../componentes/Avisos"
import { Boton } from "../componentes/Controles"
import { Bloque, Segmentos } from "../componentes/Deco"
import { urlArchivo } from "../pb"
import { borrarItem, crearItem, editarItem, editarPlan, useStore } from "../store"
import type { Lista, Plan } from "../tipos"
import { festejar, vibrar } from "../util/efectos"
import { achicar, elegirArchivos } from "../util/imagen"

/**
 * Una lista con tildes: pasos, materiales, valija, itinerario, qué pedir.
 * El itinerario se agrupa por día y se lee bien sin señal. En «Qué pedir»,
 * una vez hecho el plan, cada plato se marca para repetir o para pasar.
 */
export function ListaItems({ plan, lista, nombre, placeholder }: { plan: Plan; lista: Lista; nombre: string; placeholder: string }) {
  const todos = useStore((s) => s.items)
  const items = todos.filter((i) => i.plan === plan.id && i.lista === lista)
  const [texto, setTexto] = useState("")
  const [dia, setDia] = useState(1)
  const hechos = items.filter((i) => i.hecho).length
  const conDia = lista === "itinerario"
  const veredictos = lista === "pedir" && plan.estado === "hecho"

  const agregar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim()) return
    crearItem(plan.id, lista, texto.trim(), conDia ? { dia } : {})
    setTexto("")
  }

  const ordenados = conDia ? [...items].sort((a, b) => a.dia - b.dia || a.orden - b.orden) : items
  const etiqueta =
    lista === "valija" ? `${hechos}/${items.length} en valija` : lista === "pasos" ? `${hechos}/${items.length} pasos` : veredictos ? `${hechos}/${items.length} probados` : `${hechos}/${items.length}`

  return (
    <Bloque titulo={nombre} className={`lista lista-${lista}`} accion={items.length > 0 && !conDia ? <span className="num">{hechos}/{items.length}</span> : undefined}>
      {items.length > 0 && !conDia && <Segmentos hechos={hechos} total={items.length} etiqueta={etiqueta} />}
      <ul className="lista-items">
        {ordenados.map((it, idx) => {
          const nuevoDia = conDia && (idx === 0 || ordenados[idx - 1].dia !== it.dia)
          return (
            <li key={it.id}>
              {nuevoDia && <span className="dia-marca num">Día {String(it.dia || 1).padStart(2, "0")}</span>}
              <div className={`item ${it.hecho ? "hecho" : ""}`}>
                <button
                  className="item-tilde"
                  aria-label={it.hecho ? "Destildar" : "Tildar"}
                  aria-pressed={it.hecho}
                  onClick={(e) => {
                    vibrar(8)
                    editarItem(it.id, { hecho: !it.hecho })
                    if (!it.hecho && hechos + 1 === items.length && items.length > 1 && !conDia) {
                      festejar(e.clientX / innerWidth, e.clientY / innerHeight, 0.6)
                      avisar(`${nombre}: completo ✦`)
                    }
                  }}
                >
                  {it.hecho && (
                    <svg viewBox="0 0 24 24" aria-hidden>
                      <path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square" />
                    </svg>
                  )}
                </button>
                <span className="item-texto">{it.texto}</span>
                {veredictos && (
                  <span className="veredicto" role="group" aria-label="¿Lo repetirían?">
                    <button
                      className={it.veredicto === "repetir" ? "si" : ""}
                      aria-pressed={it.veredicto === "repetir"}
                      onClick={() => editarItem(it.id, { veredicto: it.veredicto === "repetir" ? "" : "repetir", hecho: true })}
                    >
                      👍 <span>Repetir</span>
                    </button>
                    <button
                      className={it.veredicto === "pasar" ? "no" : ""}
                      aria-pressed={it.veredicto === "pasar"}
                      onClick={() => editarItem(it.id, { veredicto: it.veredicto === "pasar" ? "" : "pasar", hecho: true })}
                    >
                      👎 <span>Pasar</span>
                    </button>
                  </span>
                )}
                <button className="item-borrar" aria-label="Borrar" onClick={() => borrarItem(it.id)}>
                  ×
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <form className="item-nuevo" onSubmit={agregar}>
        {conDia && (
          <input className="campo campo-dia num" type="number" min={1} value={dia} onChange={(e) => setDia(Math.max(1, Number(e.target.value) || 1))} aria-label="Día" />
        )}
        <input className="campo" placeholder={placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} enterKeyHint="done" />
        <Boton type="submit" className="boton-cuadrado" disabled={!texto.trim()} aria-label="Agregar">
          +
        </Boton>
      </form>
    </Bloque>
  )
}

/** Las fotos del plan: el recuerdo. */
export function Fotos({ plan }: { plan: Plan }) {
  const [subiendo, setSubiendo] = useState(0)
  const [abierta, setAbierta] = useState<string | null>(null)

  const subir = async () => {
    const archivos = await elegirArchivos(true)
    if (!archivos.length) return
    setSubiendo(archivos.length)
    const fd = new FormData()
    for (const a of archivos) fd.append("fotos+", await achicar(a))
    await editarPlan(plan.id, fd)
    setSubiendo(0)
    avisar(archivos.length === 1 ? "Foto guardada 📸" : `${archivos.length} fotos guardadas 📸`)
  }

  const borrar = async (f: string) => {
    if (!confirm("¿Borrar esta foto?")) return
    setAbierta(null)
    await editarPlan(plan.id, { "fotos-": [f] })
  }

  return (
    <Bloque
      titulo="Fotos"
      accion={
        <Boton variante="secundario" className="boton-chico" onClick={subir} disabled={subiendo > 0}>
          {subiendo ? `Subiendo ${subiendo}…` : "+ Sumar"}
        </Boton>
      }
    >
      {plan.fotos.length ? (
        <div className="fotos">
          {plan.fotos.map((f) => (
            <motion.button key={f} className="foto" onClick={() => setAbierta(f)} layoutId={`foto-${f}`}>
              <img src={urlArchivo(plan, f, "300x300")} alt="" loading="lazy" />
            </motion.button>
          ))}
        </div>
      ) : (
        <p className="suave">Cuando lo hagan, suban fotos: quedan en Recuerdos y en el Wrapped.</p>
      )}
      <AnimatePresence>
        {abierta && (
          <motion.div className="visor-fotos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbierta(null)}>
            <motion.img layoutId={`foto-${abierta}`} src={urlArchivo(plan, abierta)} alt="" />
            <div className="visor-acciones" onClick={(e) => e.stopPropagation()}>
              <Boton variante="secundario" className="boton-chico" onClick={() => setPortadaDesdeFoto(plan, abierta)}>
                Usar de portada
              </Boton>
              <Boton variante="peligro" className="boton-chico" onClick={() => borrar(abierta)}>
                Borrar
              </Boton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Bloque>
  )
}

async function setPortadaDesdeFoto(plan: Plan, foto: string) {
  try {
    const blob = await fetch(urlArchivo(plan, foto)).then((r) => r.blob())
    const fd = new FormData()
    fd.append("portada", new File([blob], "portada.jpg", { type: blob.type || "image/jpeg" }))
    await editarPlan(plan.id, fd)
    avisar("Nueva portada ✨")
  } catch {
    avisar("No se pudo cambiar la portada", "error")
  }
}

/** Un dato chico editable en línea (año, barrio, país…). */
export function Dato({ etiqueta, valor, onGuardar, placeholder, tipo = "text" }: { etiqueta: string; valor?: string; onGuardar: (v: string) => void; placeholder?: string; tipo?: string }) {
  const [v, setV] = useState<string | null>(null)
  return (
    <label className="campo-etiqueta">
      <span>{etiqueta}</span>
      <input
        className="campo"
        type={tipo}
        value={v ?? valor ?? ""}
        placeholder={placeholder}
        onFocus={() => setV(valor ?? "")}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (v !== null && v !== (valor ?? "")) onGuardar(v.trim())
          setV(null)
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
    </label>
  )
}
