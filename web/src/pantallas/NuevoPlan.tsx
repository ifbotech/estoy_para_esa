import { useEffect, useMemo, useRef, useState } from "react"
import { Arte } from "../componentes/Arte"
import { BarraGanas, Boton, Hoja } from "../componentes/Controles"
import { colorDe } from "../componentes/Tarjetas"
import { tipoDeLink, usuarioInstagram } from "../personalidades"
import { ir } from "../router"
import { crearPlan, useStore, useYo, votar } from "../store"
import type { Datos } from "../tipos"
import { festejar } from "../util/efectos"
import { interpretar } from "../util/interpretar"
import { limpiarTitulo, promedioLetterboxd, separarAnio, traerPreview } from "../util/preview"
import { sonar } from "../util/sonidos"

const EJEMPLOS = [
  "ver Perfect Days el sábado",
  "pizza en Güerrín mañana",
  "escapada a Colonia el 5 de diciembre",
  "restaurar la mesita de luz",
  "brunch en Birkin este finde",
]

/**
 * Nuevo plan en charla: escribís como hablás y la app detecta la categoría,
 * el día y el link. Todo se corrige con un toque antes de agregar.
 */
export function NuevoPlan({ abierta, onCerrar, categoriaInicial }: { abierta: boolean; onCerrar: () => void; categoriaInicial?: string }) {
  const categorias = useStore((s) => s.categorias)
  const usuarios = useStore((s) => s.usuarios)
  const yo = useYo()
  const [texto, setTexto] = useState("")
  const [titulo, setTitulo] = useState("")
  const [tituloTocado, setTituloTocado] = useState(false)
  const [catElegida, setCatElegida] = useState<string | null>(null)
  const [sinFecha, setSinFecha] = useState(false)
  const [datos, setDatos] = useState<Datos>({})
  const [ganas, setGanas] = useState(70)
  const [buscando, setBuscando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const leido = useRef("")
  const ejemplo = useMemo(() => EJEMPLOS[Math.floor(Math.random() * EJEMPLOS.length)], [abierta])

  useEffect(() => {
    if (!abierta) return
    setTexto("")
    setTitulo("")
    setTituloTocado(false)
    setCatElegida(categoriaInicial && categorias.some((c) => c.id === categoriaInicial) ? categoriaInicial : null)
    setSinFecha(false)
    setDatos({})
    setGanas(70)
    leido.current = ""
  }, [abierta, categoriaInicial, categorias])

  const p = useMemo(() => interpretar(texto), [texto])
  const catDetectada = p.personalidad ? categorias.find((c) => c.personalidad === p.personalidad)?.id ?? null : null
  const cat = categorias.find((c) => c.id === (catElegida ?? catDetectada))
  const cuando = sinFecha ? null : p.cuando
  const tituloFinal = (tituloTocado ? titulo : p.titulo).trim()

  // Un link nuevo trae su vista previa (póster de Letterboxd, foto del lugar).
  useEffect(() => {
    const url = p.link
    if (!url || url === leido.current) return
    leido.current = url
    const tipo = tipoDeLink(url)
    if (tipo === "instagram") {
      setDatos((d) => ({ ...d, instagram: usuarioInstagram(url) }))
      return
    }
    if (tipo === "maps") setDatos((d) => ({ ...d, maps: url }))
    const t = setTimeout(async () => {
      setBuscando(true)
      const prev = await traerPreview(url)
      setBuscando(false)
      if (!prev) return
      if (tipo === "letterboxd") {
        const { titulo: tt, anio } = separarAnio(limpiarTitulo(prev.titulo))
        if (!tituloTocado && tt) {
          setTitulo(tt)
          setTituloTocado(true)
        }
        setDatos((d) => ({
          ...d,
          letterboxd: url,
          poster: prev.imagen,
          anio,
          director: prev.extraEtiqueta?.toLowerCase().includes("direct") ? prev.extra : d.director,
          lbPromedio: promedioLetterboxd(prev),
        }))
      } else if (prev.imagen) setDatos((d) => ({ ...d, imagen: prev.imagen }))
    }, 500)
    return () => clearTimeout(t)
  }, [p.link, tituloTocado])

  const guardar = async (e: React.MouseEvent) => {
    if (!cat || !tituloFinal) return
    setGuardando(true)
    const plan = await crearPlan({
      titulo: tituloFinal,
      categoria: cat.id,
      estado: cuando ? "agendado" : "idea",
      cuando: cuando ? new Date(`${cuando.fecha}T21:00`).toISOString() : "",
      link: p.link && tipoDeLink(p.link) !== "letterboxd" ? p.link : "",
      datos,
    })
    if (plan) {
      await votar(plan.id, { ganas })
      sonar("esa")
      festejar(e.clientX / innerWidth, e.clientY / innerHeight, 1.3)
      onCerrar()
      ir(`/plan/${plan.id}`)
    }
    setGuardando(false)
  }

  const yoI = Math.max(0, usuarios.findIndex((u) => u.id === yo?.id))

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Contame el plan">
      <div className="nuevo">
        <textarea
          className="campo charla"
          rows={2}
          placeholder={`Como te salga. Ej: ${ejemplo}`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
          enterKeyHint="done"
        />

        <div className="detecta" aria-live="polite">
          {cat && (
            <span className="detecta-chip si" style={{ "--cc": cat.color } as React.CSSProperties}>
              {cat.emoji} {cat.nombre}
            </span>
          )}
          {cuando && (
            <button className="detecta-chip si fecha" onClick={() => setSinFecha(true)} aria-label="Quitar el día">
              📅 {cuando.etiqueta} ×
            </button>
          )}
          {p.link && (
            <span className="detecta-chip si">
              🔗 {tipoDeLink(p.link) === "letterboxd" ? "Letterboxd" : tipoDeLink(p.link) === "maps" ? "Maps" : tipoDeLink(p.link) === "instagram" ? "Instagram" : "link"}
              {buscando && " …"}
            </span>
          )}
          {!cat && texto.length > 2 && <span className="detecta-chip">¿qué categoría? elegila abajo</span>}
        </div>

        <div className="fila-scroll nuevo-cats">
          {categorias.map((c) => (
            <button
              key={c.id}
              className={`nuevo-cat ${cat?.id === c.id ? "elegida" : ""}`}
              style={{ "--cc": c.color } as React.CSSProperties}
              onClick={() => setCatElegida(c.id)}
              aria-pressed={cat?.id === c.id}
            >
              <Arte tipo={c.personalidad} tam={5} />
              <span>{c.nombre}</span>
            </button>
          ))}
        </div>

        {(texto || titulo) && (
          <label className="campo-etiqueta">
            <span>Se va a llamar</span>
            <input
              className="campo campo-grande"
              value={tituloTocado ? titulo : p.titulo}
              onChange={(e) => {
                setTitulo(e.target.value)
                setTituloTocado(true)
              }}
            />
          </label>
        )}

        {(datos.poster || datos.imagen) && <img className="nuevo-preview" src={datos.poster || datos.imagen} alt="" />}

        <BarraGanas valor={ganas} nombre="Tus ganas" inicial={yo?.name?.slice(0, 1)} color={colorDe(yo ?? undefined, yoI)} editable onCambio={setGanas} />

        <Boton className="boton-grande" onClick={guardar} disabled={!tituloFinal || !cat || guardando}>
          {guardando ? "Guardando…" : cuando ? `¡Agendar para ${cuando.etiqueta}!` : "¡Agregar!"}
        </Boton>
      </div>
    </Hoja>
  )
}
