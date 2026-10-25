import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { avisar } from "../componentes/Avisos"
import { Boton } from "../componentes/Controles"
import { urlArchivo } from "../pb"
import { borrarItem, crearItem, editarItem, editarPlan, useStore } from "../store"
import type { Lista, Plan } from "../tipos"
import { festejar, vibrar } from "../util/efectos"
import { achicar, elegirArchivos } from "../util/imagen"

/** Una lista con tildes: pasos, materiales, valija, itinerario, qué pedir. */
export function ListaItems({ plan, lista, nombre, placeholder }: { plan: Plan; lista: Lista; nombre: string; placeholder: string }) {
  const todos = useStore((s) => s.items)
  const items = todos.filter((i) => i.plan === plan.id && i.lista === lista)
  const [texto, setTexto] = useState("")
  const [dia, setDia] = useState(1)
  const hechos = items.filter((i) => i.hecho).length
  const conDia = lista === "itinerario"

  const agregar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim()) return
    crearItem(plan.id, lista, texto.trim(), conDia ? { dia } : {})
    setTexto("")
  }

  const ordenados = conDia ? [...items].sort((a, b) => a.dia - b.dia || a.orden - b.orden) : items

  return (
    <section className="seccion bloque">
      <div className="seccion-cabeza">
        <h2>{nombre}</h2>
        {items.length > 0 && !conDia && (
          <span className="etiqueta">
            {hechos}/{items.length}
          </span>
        )}
      </div>
      {items.length > 0 && !conDia && (
        <div className="progreso">
          <motion.div className="progreso-relleno" animate={{ width: `${(hechos / items.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} />
        </div>
      )}
      <ul className="lista-items">
        <AnimatePresence initial={false}>
          {ordenados.map((it, idx) => {
            const nuevoDia = conDia && (idx === 0 || ordenados[idx - 1].dia !== it.dia)
            return (
              <motion.li key={it.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40, height: 0 }}>
                {nuevoDia && <span className="dia-marca">Día {it.dia || 1}</span>}
                <div className={`item ${it.hecho ? "hecho" : ""}`}>
                  <motion.button
                    className="item-tilde"
                    whileTap={{ scale: 0.7 }}
                    aria-label={it.hecho ? "Destildar" : "Tildar"}
                    onClick={(e) => {
                      vibrar(8)
                      editarItem(it.id, { hecho: !it.hecho })
                      if (!it.hecho && hechos + 1 === items.length && items.length > 1 && !conDia) {
                        festejar(e.clientX / innerWidth, e.clientY / innerHeight, 0.8)
                        avisar(`¡${nombre}: todo listo! 🎉`)
                      }
                    }}
                  >
                    {it.hecho && (
                      <motion.svg viewBox="0 0 24 24" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <motion.path d="M5 12l5 5 9-11" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
                      </motion.svg>
                    )}
                  </motion.button>
                  <span className="item-texto">{it.texto}</span>
                  <button className="item-borrar" aria-label="Borrar" onClick={() => borrarItem(it.id)}>
                    ×
                  </button>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      <form className="item-nuevo" onSubmit={agregar}>
        {conDia && (
          <input className="campo campo-dia" type="number" min={1} value={dia} onChange={(e) => setDia(Math.max(1, Number(e.target.value) || 1))} aria-label="Día" />
        )}
        <input className="campo" placeholder={placeholder} value={texto} onChange={(e) => setTexto(e.target.value)} enterKeyHint="done" />
        <Boton type="submit" className="boton-chico" disabled={!texto.trim()} aria-label="Agregar">
          +
        </Boton>
      </form>
    </section>
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
    <section className="seccion bloque">
      <div className="seccion-cabeza">
        <h2>Fotos</h2>
        <Boton variante="fantasma" className="boton-chico" onClick={subir} disabled={subiendo > 0}>
          {subiendo ? `Subiendo ${subiendo}…` : "+ Sumar fotos"}
        </Boton>
      </div>
      {plan.fotos.length ? (
        <div className="fotos">
          {plan.fotos.map((f, i) => (
            <motion.button
              key={f}
              className="foto"
              style={{ rotate: `${((i * 37) % 9) - 4}deg` }}
              onClick={() => setAbierta(f)}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.95 }}
              layoutId={`foto-${f}`}
            >
              <img src={urlArchivo(plan, f, "300x300")} alt="" loading="lazy" />
            </motion.button>
          ))}
        </div>
      ) : (
        <p className="suave">Cuando lo hagan, suban fotos: quedan en Recuerdos y en el Wrapped.</p>
      )}
      <AnimatePresence>
        {abierta && (
          <motion.div className="visor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAbierta(null)}>
            <motion.img layoutId={`foto-${abierta}`} src={urlArchivo(plan, abierta)} alt="" />
            <div className="visor-acciones" onClick={(e) => e.stopPropagation()}>
              <Boton variante="fantasma" className="boton-chico" onClick={() => setPortadaDesdeFoto(plan, abierta)}>
                Usar de portada
              </Boton>
              <Boton variante="peligro" className="boton-chico" onClick={() => borrar(abierta)}>
                Borrar
              </Boton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
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
