import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { Arte } from "../componentes/Arte"
import { BarraGanas, Boton, Hoja } from "../componentes/Controles"
import { colorDe } from "../componentes/Tarjetas"
import { tipoDeLink, usuarioInstagram } from "../personalidades"
import { ir } from "../router"
import { crearPlan, useStore, useYo, votar } from "../store"
import type { Datos, Personalidad } from "../tipos"
import { festejar } from "../util/efectos"
import { limpiarTitulo, separarAnio, traerPreview } from "../util/preview"

export function NuevoPlan({ abierta, onCerrar, categoriaInicial }: { abierta: boolean; onCerrar: () => void; categoriaInicial?: string }) {
  const categorias = useStore((s) => s.categorias)
  const usuarios = useStore((s) => s.usuarios)
  const yo = useYo()
  const [cat, setCat] = useState<string | null>(null)
  const [titulo, setTitulo] = useState("")
  const [link, setLink] = useState("")
  const [datos, setDatos] = useState<Datos>({})
  const [ganas, setGanas] = useState(70)
  const [buscando, setBuscando] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (abierta) {
      setCat(categoriaInicial && categorias.some((c) => c.id === categoriaInicial) ? categoriaInicial : null)
      setTitulo("")
      setLink("")
      setDatos({})
      setGanas(70)
    }
  }, [abierta, categoriaInicial, categorias])

  const porPersonalidad = (p: Personalidad) => categorias.find((c) => c.personalidad === p)?.id

  // Pegar un link completa lo que se pueda: Letterboxd → peli con póster,
  // Maps → lugar, Instagram → el @.
  const procesado = useRef("")
  const alPegarLink = async (url: string) => {
    url = url.trim()
    setLink(url)
    if (procesado.current === url) return
    procesado.current = url
    const tipo = tipoDeLink(url)
    if (!tipo) return
    if (tipo === "instagram") {
      setDatos((d) => ({ ...d, instagram: usuarioInstagram(url) }))
      if (!titulo) setTitulo("@" + usuarioInstagram(url))
      return
    }
    if (tipo === "letterboxd" && !cat) setCat(porPersonalidad("cine") ?? null)
    if (tipo === "maps") setDatos((d) => ({ ...d, maps: url }))
    setBuscando(true)
    const p = await traerPreview(url)
    setBuscando(false)
    if (!p) return
    if (tipo === "letterboxd") {
      const { titulo: t, anio } = separarAnio(limpiarTitulo(p.titulo))
      setTitulo((v) => v || t)
      setDatos((d) => ({ ...d, letterboxd: url, poster: p.imagen, anio, director: p.extraEtiqueta?.toLowerCase().includes("direct") ? p.extra : d.director }))
    } else {
      setTitulo((v) => v || limpiarTitulo(p.titulo))
      if (p.imagen) setDatos((d) => ({ ...d, imagen: p.imagen }))
    }
  }

  const guardar = async (e: React.MouseEvent) => {
    if (!cat || !titulo.trim()) return
    setGuardando(true)
    const plan = await crearPlan({
      titulo: titulo.trim(),
      categoria: cat,
      estado: "idea",
      link: tipoDeLink(link) ? link.trim() : "",
      datos,
    })
    if (plan) {
      await votar(plan.id, { ganas })
      festejar(e.clientX / innerWidth, e.clientY / innerHeight, 1.3)
      onCerrar()
      ir(`/plan/${plan.id}`)
    }
    setGuardando(false)
  }

  const categoria = categorias.find((c) => c.id === cat)
  const yoIndice = usuarios.findIndex((u) => u.id === yo?.id)

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="¿Qué se les ocurrió?">
      <AnimatePresence mode="wait">
        {!cat ? (
          <motion.div key="cats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }}>
            <p className="etiqueta" style={{ marginBottom: 12 }}>
              Elegí una categoría
            </p>
            <div className="grid2">
              {categorias.map((c, i) => (
                <motion.button
                  key={c.id}
                  className={`mosaico mosaico-chico p-${c.personalidad}`}
                  onClick={() => setCat(c.id)}
                  initial={{ opacity: 0, scale: 0.6, rotate: i % 2 ? 8 : -8 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16, delay: i * 0.04 }}
                >
                  <Arte tipo={c.personalidad} tam={8} />
                  <h3>
                    {c.emoji} {c.nombre}
                  </h3>
                </motion.button>
              ))}
            </div>
            <label className="campo-etiqueta" style={{ marginTop: 18 }}>
              <span>…o pegá un link (Letterboxd, Maps, Instagram)</span>
              <input className="campo" inputMode="url" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} onBlur={(e) => alPegarLink(e.target.value)} onPaste={(e) => alPegarLink(e.clipboardData.getData("text"))} />
            </label>
          </motion.div>
        ) : (
          <motion.div key="form" className="nuevo-form" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
            <button className={`nuevo-cat p-${categoria?.personalidad}`} onClick={() => setCat(null)}>
              <Arte tipo={categoria?.personalidad ?? "salida"} tam={5} />
              <span>
                {categoria?.emoji} {categoria?.nombre}
              </span>
              <small>cambiar</small>
            </button>
            <input
              className="campo campo-grande"
              placeholder={categoria?.personalidad === "cine" ? "Perfect Days" : categoria?.personalidad === "viaje" ? "Bariloche en invierno" : "¿Qué plan?"}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
              enterKeyHint="done"
            />
            <label className="campo-etiqueta">
              <span>Link (opcional) {buscando && "· buscando…"}</span>
              <input className="campo" inputMode="url" placeholder="Letterboxd, Google Maps, Instagram, lo que sea" value={link} onChange={(e) => setLink(e.target.value)} onBlur={(e) => alPegarLink(e.target.value)} onPaste={(e) => alPegarLink(e.clipboardData.getData("text"))} />
            </label>
            {(datos.poster || datos.imagen) && (
              <motion.img className="nuevo-preview" src={datos.poster || datos.imagen} alt="" initial={{ scale: 0.8, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: -2, opacity: 1 }} />
            )}
            <BarraGanas valor={ganas} nombre={`Tus ganas`} color={colorDe(yo ?? undefined, Math.max(0, yoIndice))} editable onCambio={setGanas} />
            <Boton className="boton-grande" onClick={guardar} disabled={!titulo.trim() || guardando}>
              {guardando ? "Guardando…" : "¡Agregar!"}
            </Boton>
          </motion.div>
        )}
      </AnimatePresence>
    </Hoja>
  )
}
