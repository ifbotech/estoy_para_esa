import { motion } from "motion/react"
import { useRef, useState } from "react"
import { avisar } from "../componentes/Avisos"
import { Boton } from "../componentes/Controles"
import { urlArchivo } from "../pb"
import { embedMapa, linkMapa, usuarioInstagram } from "../personalidades"
import { editarDatos, editarPlan, useStore } from "../store"
import type { Plan } from "../tipos"
import { achicar, elegirArchivos } from "../util/imagen"
import { limpiarTitulo, separarAnio, traerPreview } from "../util/preview"
import { Dato } from "./Comunes"

// --- pelis -----------------------------------------------------------------

export function SeccionCine({ plan }: { plan: Plan }) {
  const d = plan.datos ?? {}
  const [buscando, setBuscando] = useState(false)
  const busqueda = `https://letterboxd.com/search/films/${encodeURIComponent(plan.titulo)}/`

  const conectar = async (url: string) => {
    if (!url) return editarDatos(plan, { letterboxd: "" })
    setBuscando(true)
    const p = await traerPreview(url)
    setBuscando(false)
    if (!p) {
      await editarDatos(plan, { letterboxd: url })
      return avisar("Guardé el link, pero no pude leer la peli 🤷", "info")
    }
    const { anio } = separarAnio(limpiarTitulo(p.titulo))
    await editarDatos(plan, {
      letterboxd: url,
      poster: p.imagen || d.poster,
      anio: anio || d.anio,
      director: p.extraEtiqueta?.toLowerCase().includes("direct") ? p.extra : d.director,
    })
    avisar("Peli conectada con Letterboxd 🎬")
  }

  return (
    <section className="seccion bloque cine">
      <div className="cine-fila">
        <Poster plan={plan} />
        <div className="cine-datos">
          <p className="etiqueta">Letterboxd</p>
          {d.letterboxd ? (
            <a className="boton boton-chico lb" href={d.letterboxd} target="_blank" rel="noreferrer">
              <span className="lb-puntos">
                <i />
                <i />
                <i />
              </span>
              Ver en Letterboxd
            </a>
          ) : (
            <a className="boton boton-chico boton-fantasma" href={busqueda} target="_blank" rel="noreferrer">
              🔎 Buscarla en Letterboxd
            </a>
          )}
          <dl className="cine-ficha">
            {d.anio && (
              <>
                <dt>Año</dt>
                <dd>{d.anio}</dd>
              </>
            )}
            {d.director && (
              <>
                <dt>Dirección</dt>
                <dd>{d.director}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
      <Dato etiqueta={buscando ? "Link de Letterboxd · leyendo…" : "Link de Letterboxd"} valor={d.letterboxd} placeholder="https://letterboxd.com/film/…" tipo="url" onGuardar={conectar} />
      <div className="grid2">
        <Dato etiqueta="Año" valor={d.anio} onGuardar={(v) => editarDatos(plan, { anio: v })} />
        <Dato etiqueta="Dónde verla" valor={d.dondeVer} placeholder="Mubi, Netflix, cine…" onGuardar={(v) => editarDatos(plan, { dondeVer: v })} />
      </div>
    </section>
  )
}

/** Póster que se inclina con el dedo, como una figurita brillante. */
function Poster({ plan }: { plan: Plan }) {
  const ref = useRef<HTMLDivElement>(null)
  const [giro, setGiro] = useState({ x: 0, y: 0 })
  const src = plan.portada ? urlArchivo(plan, plan.portada, "600x0") : plan.datos?.poster || plan.datos?.imagen
  return (
    <motion.div
      ref={ref}
      className="poster"
      style={{ rotateX: giro.y, rotateY: giro.x }}
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect()
        setGiro({ x: ((e.clientX - r.left) / r.width - 0.5) * 24, y: -((e.clientY - r.top) / r.height - 0.5) * 24 })
      }}
      onPointerLeave={() => setGiro({ x: 0, y: 0 })}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
    >
      {src ? <img src={src} alt={`Póster de ${plan.titulo}`} /> : <div className="poster-vacio">🎬</div>}
      <div className="poster-brillo" style={{ backgroundPosition: `${50 + giro.x * 2}% ${50 - giro.y * 2}%` }} />
    </motion.div>
  )
}

// --- lugares: comida, café, salidas ---------------------------------------

export function SeccionLugar({ plan }: { plan: Plan }) {
  const d = plan.datos ?? {}
  const consulta = d.direccion || plan.titulo
  const [mapa, setMapa] = useState(Boolean(d.direccion || d.maps))
  const ig = d.instagram ? usuarioInstagram(d.instagram) : ""
  return (
    <section className="seccion bloque lugar">
      <div className="lugar-botones">
        <a className="boton boton-chico maps" href={d.maps || linkMapa(`${plan.titulo} ${d.direccion ?? ""}`)} target="_blank" rel="noreferrer">
          📍 Abrir en Maps
        </a>
        {ig ? (
          <a className="boton boton-chico ig" href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer">
            📸 @{ig}
          </a>
        ) : (
          <a className="boton boton-chico boton-fantasma" href={`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(plan.titulo)}`} target="_blank" rel="noreferrer">
            📸 Buscar en Instagram
          </a>
        )}
      </div>
      {mapa ? (
        <div className="mapa">
          <iframe title="Mapa" src={embedMapa(consulta)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      ) : (
        <button className="mapa mapa-boton" onClick={() => setMapa(true)}>
          <span>🗺️ Ver en el mapa</span>
        </button>
      )}
      <Dato etiqueta="Dirección o nombre del lugar" valor={d.direccion} placeholder="Av. Corrientes 1234" onGuardar={(v) => editarDatos(plan, { direccion: v }).then(() => setMapa(true))} />
      <div className="grid2">
        <Dato etiqueta="Barrio" valor={d.barrio} placeholder="Palermo" onGuardar={(v) => editarDatos(plan, { barrio: v })} />
        <Dato etiqueta="Instagram" valor={d.instagram ? "@" + ig : ""} placeholder="@lugar" onGuardar={(v) => editarDatos(plan, { instagram: usuarioInstagram(v) })} />
      </div>
      <Dato etiqueta="Link de Google Maps" valor={d.maps} placeholder="https://maps.app.goo.gl/…" tipo="url" onGuardar={(v) => editarDatos(plan, { maps: v })} />
    </section>
  )
}

// --- viajes ----------------------------------------------------------------

export function SeccionViaje({ plan }: { plan: Plan }) {
  const d = plan.datos ?? {}
  const dias =
    d.desde && d.hasta ? Math.round((new Date(d.hasta).getTime() - new Date(d.desde).getTime()) / 86400000) + 1 : null
  return (
    <section className="seccion bloque viaje">
      <div className="boleto">
        <div className="boleto-lado">
          <span className="etiqueta">destino</span>
          <b>{d.destino || plan.titulo}</b>
          <span>{d.pais || "¿país?"}</span>
        </div>
        <div className="boleto-avion">✈︎</div>
        <div className="boleto-lado derecha">
          <span className="etiqueta">{d.exterior ? "internacional" : "de cabotaje"}</span>
          <b>{dias ? `${dias} días` : "¿cuántos días?"}</b>
          <span>{d.desde ? new Date(d.desde + "T12:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : "—"} → {d.hasta ? new Date(d.hasta + "T12:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : "—"}</span>
        </div>
      </div>
      <div className="grid2">
        <Dato etiqueta="Destino" valor={d.destino} placeholder="Bariloche" onGuardar={(v) => editarDatos(plan, { destino: v })} />
        <Dato etiqueta="País" valor={d.pais} placeholder="Argentina" onGuardar={(v) => editarDatos(plan, { pais: v, exterior: v ? !/^argentina$/i.test(v.trim()) : d.exterior })} />
        <Dato etiqueta="Desde" tipo="date" valor={d.desde} onGuardar={(v) => editarDatos(plan, { desde: v })} />
        <Dato etiqueta="Hasta" tipo="date" valor={d.hasta} onGuardar={(v) => editarDatos(plan, { hasta: v })} />
      </div>
      <label className="interruptor">
        <span>🌎 Es al exterior</span>
        <input type="checkbox" checked={Boolean(d.exterior)} onChange={(e) => editarDatos(plan, { exterior: e.target.checked })} />
      </label>
      {(d.destino || plan.titulo) && (
        <div className="mapa">
          <iframe title="Mapa del destino" src={embedMapa(`${d.destino || plan.titulo} ${d.pais ?? ""}`).replace("z=15", "z=6")} loading="lazy" />
        </div>
      )}
    </section>
  )
}

// --- DIY -------------------------------------------------------------------

export function SeccionTaller({ plan }: { plan: Plan }) {
  const items = useStore((s) => s.items).filter((i) => i.plan === plan.id && i.lista === "pasos")
  const hechos = items.filter((i) => i.hecho).length
  const pct = items.length ? Math.round((hechos / items.length) * 100) : 0
  const d = plan.datos ?? {}

  const subir = async (cual: "antes" | "despues") => {
    const [archivo] = await elegirArchivos(false)
    if (!archivo) return
    const previas = new Set(plan.fotos)
    const fd = new FormData()
    fd.append("fotos+", await achicar(archivo))
    const rec = await editarPlan(plan.id, fd)
    const nueva = rec?.fotos.find((f) => !previas.has(f))
    if (rec && nueva) await editarDatos(rec, { [cual]: nueva })
  }

  return (
    <section className="seccion bloque taller">
      <div className="plano p-taller">
        <div className="plano-anillo" style={{ "--pct": pct } as React.CSSProperties}>
          <b>{pct}%</b>
          <span>hecho</span>
        </div>
        <div>
          <p className="etiqueta">proyecto</p>
          <p className="plano-texto">
            {items.length ? `${hechos} de ${items.length} pasos` : "Cargá los pasos abajo y vayan tachando."}
          </p>
        </div>
      </div>
      <p className="etiqueta" style={{ margin: "18px 0 8px" }}>
        Antes y después
      </p>
      {d.antes && d.despues ? (
        <AntesDespues antes={urlArchivo(plan, d.antes, "600x0")} despues={urlArchivo(plan, d.despues, "600x0")} />
      ) : null}
      <div className="grid2" style={{ marginTop: 10 }}>
        <Boton variante="fantasma" className="boton-chico" onClick={() => subir("antes")}>
          {d.antes ? "Cambiar «antes»" : "📷 Foto de antes"}
        </Boton>
        <Boton variante="fantasma" className="boton-chico" onClick={() => subir("despues")}>
          {d.despues ? "Cambiar «después»" : "📷 Foto de después"}
        </Boton>
      </div>
    </section>
  )
}

function AntesDespues({ antes, despues }: { antes: string; despues: string }) {
  const [x, setX] = useState(50)
  const ref = useRef<HTMLDivElement>(null)
  const mover = (cx: number) => {
    const r = ref.current!.getBoundingClientRect()
    setX(Math.min(100, Math.max(0, ((cx - r.left) / r.width) * 100)))
  }
  return (
    <div
      ref={ref}
      className="antes-despues"
      onPointerDown={(e) => {
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        mover(e.clientX)
      }}
      onPointerMove={(e) => e.buttons && mover(e.clientX)}
    >
      <img src={despues} alt="Después" />
      <div className="ad-antes" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }}>
        <img src={antes} alt="Antes" />
      </div>
      <div className="ad-linea" style={{ left: `${x}%` }}>
        <span>⟷</span>
      </div>
      <span className="ad-etiqueta izq">antes</span>
      <span className="ad-etiqueta der">después</span>
    </div>
  )
}
