import { useEffect, useMemo, useRef, useState } from "react"
import { Arte } from "../componentes/Arte"
import { avisar } from "../componentes/Avisos"
import { BarraGanas, Boton, Hoja } from "../componentes/Controles"
import { ChipCategoria, colorDe } from "../componentes/Tarjetas"
import { tipoDeLink, usuarioInstagram } from "../personalidades"
import { ir } from "../router"
import { crearItem, crearPlan, useStore, useYo, votar } from "../store"
import type { Datos, Plan } from "../tipos"
import { festejar } from "../util/efectos"
import { interpretar } from "../util/interpretar"
import { limpiarTitulo, promedioLetterboxd, separarAnio, traerPreview } from "../util/preview"
import { sonar } from "../util/sonidos"

export type ModoNuevo = "plan" | "sumar"

/**
 * Nuevo plan en charla: escribís como hablás y la app detecta la categoría,
 * el día y el link. Todo se corrige con un toque antes de agregar.
 *
 * O, en modo «sumar», lo que escribís va como idea a un plan que ya tienen
 * (un día en San Telmo, un viaje que se va armando de a poco).
 */
export function NuevoPlan({
  abierta,
  onCerrar,
  categoriaInicial,
  modoInicial = "plan",
}: {
  abierta: boolean
  onCerrar: () => void
  categoriaInicial?: string
  modoInicial?: ModoNuevo
}) {
  const planes = useStore((s) => s.planes)
  const [modo, setModo] = useState<ModoNuevo>(modoInicial)
  const [destino, setDestino] = useState<string | null>(null)
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
  useEffect(() => {
    if (!abierta) return
    setModo(modoInicial)
    setDestino(null)
    setTexto("")
    setTitulo("")
    setTituloTocado(false)
    setCatElegida(categoriaInicial && categorias.some((c) => c.id === categoriaInicial) ? categoriaInicial : null)
    setSinFecha(false)
    setDatos({})
    setGanas(70)
    leido.current = ""
  }, [abierta, categoriaInicial, categorias, modoInicial])

  const p = useMemo(() => interpretar(texto), [texto])
  // si no hay categoría de café, lo de café va a la de comida (Gastronomía)
  const porPersonalidad = (x: string | null) => (x ? categorias.find((c) => c.personalidad === x) : undefined)
  const catDetectada = (porPersonalidad(p.personalidad) ?? (p.personalidad === "cafe" ? porPersonalidad("cocina") : undefined))?.id ?? null
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
  const planDestino = planes.find((x) => x.id === destino)

  const sumar = async () => {
    if (!planDestino || !texto.trim()) return
    setGuardando(true)
    await crearItem(planDestino.id, "ideas", texto.trim())
    setGuardando(false)
    sonar("tic")
    avisar(`💡 Sumado a «${planDestino.titulo}»`)
    onCerrar()
    ir(`/plan/${planDestino.id}`)
  }

  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      titulo={modo === "plan" ? "Contame el plan" : "Sumale algo a un plan"}
      pie={
        modo === "plan" ? (
          <Boton className="boton-grande" onClick={guardar} disabled={!tituloFinal || !cat || guardando}>
            {guardando ? "Guardando…" : cuando ? `¡Agendar para ${cuando.etiqueta}!` : "¡Agregar!"}
          </Boton>
        ) : (
          <Boton className="boton-grande" onClick={sumar} disabled={!planDestino || !texto.trim() || guardando}>
            {guardando ? "Guardando…" : planDestino ? `Sumar a «${planDestino.titulo}»` : "Elegí a qué plan"}
          </Boton>
        )
      }
    >
      <div className="nuevo">
        <div className="nuevo-modo" role="tablist" aria-label="Qué querés hacer">
          <button role="tab" aria-selected={modo === "plan"} className={modo === "plan" ? "activo" : ""} onClick={() => setModo("plan")}>
            ✦ Plan nuevo
          </button>
          <button role="tab" aria-selected={modo === "sumar"} className={modo === "sumar" ? "activo" : ""} onClick={() => setModo("sumar")}>
            💡 Sumar a un plan
          </button>
        </div>

        <textarea
          className="campo charla"
          rows={2}
          placeholder={modo === "plan" ? "Escribilo como te salga: qué, cuándo, un link…" : "La idea que se les ocurrió…"}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus
          enterKeyHint="done"
        />

        {modo === "sumar" ? (
          <ElegirPlan planes={planes} elegido={destino} onElegir={setDestino} />
        ) : (
          <>
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
          </>
        )}
      </div>
    </Hoja>
  )
}

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/** Los planes que siguen abiertos, para elegir a cuál sumarle la idea. */
function ElegirPlan({ planes, elegido, onElegir }: { planes: Plan[]; elegido: string | null; onElegir: (id: string) => void }) {
  const categorias = useStore((s) => s.categorias)
  const items = useStore((s) => s.items)
  const [buscar, setBuscar] = useState("")
  const abiertos = useMemo(() => {
    const q = normalizar(buscar.trim())
    return planes
      .filter((x) => x.estado !== "hecho" && (!q || normalizar(x.titulo).includes(q)))
      .sort((a, b) => b.updated.localeCompare(a.updated))
  }, [planes, buscar])

  return (
    <div className="elegir-plan">
      <span className="etiqueta">¿A qué plan?</span>
      {planes.filter((x) => x.estado !== "hecho").length > 6 && (
        <input className="campo" type="search" placeholder="Buscar el plan…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
      )}
      <ul className="elegir-plan-lista" role="radiogroup" aria-label="Plan">
        {abiertos.map((x) => {
          const cat = categorias.find((c) => c.id === x.categoria)
          const ideas = items.filter((i) => i.plan === x.id && i.lista === "ideas").length
          return (
            <li key={x.id}>
              <button
                role="radio"
                aria-checked={elegido === x.id}
                className={`elegir-plan-op ${elegido === x.id ? "elegido" : ""}`}
                style={{ "--cc": cat?.color || "var(--amarillo)" } as React.CSSProperties}
                onClick={() => onElegir(x.id)}
              >
                <ChipCategoria cat={cat} />
                <b>{x.titulo}</b>
                <small className="num">{ideas ? `${ideas} ${ideas === 1 ? "idea" : "ideas"}` : ""}</small>
              </button>
            </li>
          )
        })}
        {!abiertos.length && <li className="suave">{buscar ? "Ningún plan con ese nombre." : "Todavía no hay planes abiertos."}</li>}
      </ul>
    </div>
  )
}
