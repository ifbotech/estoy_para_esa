import { useRef, useState } from "react"
import { avisar } from "../componentes/Avisos"
import { Boton } from "../componentes/Controles"
import { Bloque, Segmentos } from "../componentes/Deco"
import { urlArchivo } from "../pb"
import { embedMapa, linkMapa, usuarioInstagram } from "../personalidades"
import { editarDatos, editarPlan, useStore } from "../store"
import type { Plan } from "../tipos"
import { achicar, elegirArchivos } from "../util/imagen"
import { limpiarTitulo, promedioLetterboxd, separarAnio, traerPreview } from "../util/preview"
import { Dato } from "./Comunes"

const coma = (n: number, d = 1) => n.toFixed(d).replace(".", ",")

// --- pelis -----------------------------------------------------------------

export function SeccionCine({ plan }: { plan: Plan }) {
  const d = plan.datos ?? {}
  const votos = useStore((s) => s.votos).filter((v) => v.plan === plan.id && v.puntaje > 0)
  const [buscando, setBuscando] = useState(false)
  const busqueda = `https://letterboxd.com/search/films/${encodeURIComponent(plan.titulo)}/`
  const nuestro = votos.length ? votos.reduce((a, v) => a + v.puntaje, 0) / votos.length : null

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
      lbPromedio: promedioLetterboxd(p) ?? d.lbPromedio,
    })
    avisar("Peli conectada con Letterboxd 🎬")
  }

  const src = plan.portada ? urlArchivo(plan, plan.portada, "600x0") : d.poster || d.imagen

  return (
    <Bloque titulo="Ficha de la peli" className="cine">
      <div className="cine-fila">
        <div className="poster">{src ? <img src={src} alt={`Póster de ${plan.titulo}`} /> : <div className="poster-vacio">🎬</div>}</div>
        <dl className="ficha-tecnica">
          <div>
            <dt>Año</dt>
            <dd className="num">{d.anio || "—"}</dd>
          </div>
          <div>
            <dt>Dirección</dt>
            <dd>{d.director || "—"}</dd>
          </div>
          <div>
            <dt>Letterboxd</dt>
            <dd className="num">{d.lbPromedio ? `★ ${coma(d.lbPromedio, 2)}` : "—"}</dd>
          </div>
          <div>
            <dt>Ustedes</dt>
            <dd className="num">
              {nuestro === null ? "—" : `★ ${coma(nuestro)}`}
              {nuestro !== null && d.lbPromedio ? (
                <small> ({nuestro - d.lbPromedio >= 0 ? "+" : "−"}{coma(Math.abs(nuestro - d.lbPromedio))})</small>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>
      {d.letterboxd ? (
        <a className="boton boton-chico lb" href={d.letterboxd} target="_blank" rel="noreferrer">
          <span className="lb-puntos" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          Ver en Letterboxd ↗
        </a>
      ) : (
        <a className="boton boton-chico boton-secundario" href={busqueda} target="_blank" rel="noreferrer">
          Buscarla en Letterboxd ↗
        </a>
      )}
      <Dato etiqueta={buscando ? "Link de Letterboxd · leyendo…" : "Link de Letterboxd"} valor={d.letterboxd} placeholder="https://letterboxd.com/film/…" tipo="url" onGuardar={conectar} />
      <div className="grid2">
        <Dato etiqueta="Año" valor={d.anio} onGuardar={(v) => editarDatos(plan, { anio: v })} />
        <Dato etiqueta="Dónde verla" valor={d.dondeVer} placeholder="Dónde la dan…" onGuardar={(v) => editarDatos(plan, { dondeVer: v })} />
      </div>
    </Bloque>
  )
}

// --- lugares: comida, café, salidas ---------------------------------------

export function SeccionLugar({ plan }: { plan: Plan }) {
  const d = plan.datos ?? {}
  const consulta = d.direccion || plan.titulo
  const [mapa, setMapa] = useState(Boolean(d.direccion || d.maps))
  const ig = d.instagram ? usuarioInstagram(d.instagram) : ""
  return (
    <Bloque titulo="El lugar" className="lugar" accion={d.barrio ? <span className="etiqueta">{d.barrio}</span> : undefined}>
      <div className="lugar-botones">
        <a className="boton boton-chico maps" href={d.maps || linkMapa(`${plan.titulo} ${d.direccion ?? ""}`)} target="_blank" rel="noreferrer">
          📍 Maps ↗
        </a>
        {ig ? (
          <a className="boton boton-chico ig" href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer">
            @{ig} ↗
          </a>
        ) : (
          <a className="boton boton-chico boton-secundario" href={`https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(plan.titulo)}`} target="_blank" rel="noreferrer">
            Instagram ↗
          </a>
        )}
      </div>
      {mapa ? (
        <div className="mapa">
          <iframe title="Mapa" src={embedMapa(consulta)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      ) : (
        <button className="mapa mapa-boton" onClick={() => setMapa(true)}>
          Ver en el mapa
        </button>
      )}
      <Dato etiqueta="Dirección o nombre del lugar" valor={d.direccion} placeholder="Dónde queda…" onGuardar={(v) => editarDatos(plan, { direccion: v }).then(() => setMapa(true))} />
      <div className="grid2">
        <Dato etiqueta="Barrio" valor={d.barrio} placeholder="El barrio…" onGuardar={(v) => editarDatos(plan, { barrio: v })} />
        <Dato etiqueta="Instagram" valor={d.instagram ? "@" + ig : ""} placeholder="@lugar" onGuardar={(v) => editarDatos(plan, { instagram: usuarioInstagram(v) })} />
      </div>
      <Dato etiqueta="Link de Google Maps" valor={d.maps} placeholder="https://maps.app.goo.gl/…" tipo="url" onGuardar={(v) => editarDatos(plan, { maps: v })} />
    </Bloque>
  )
}

// --- viajes: boarding pass -------------------------------------------------

const corta = (s?: string) => (s ? new Date(s + "T12:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" }).replace(".", "") : "—")

/** Las tres letras grandes del boleto: «Bariloche» → BAR. */
function codigo(s: string) {
  const limpio = s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z]/g, "")
  return (limpio.slice(0, 3) || "???").toUpperCase()
}

export function SeccionViaje({ plan }: { plan: Plan }) {
  const d = plan.datos ?? {}
  const items = useStore((s) => s.items).filter((i) => i.plan === plan.id)
  const valija = items.filter((i) => i.lista === "valija")
  const enValija = valija.filter((i) => i.hecho).length
  const dias = d.desde && d.hasta ? Math.round((new Date(d.hasta).getTime() - new Date(d.desde).getTime()) / 86400000) + 1 : null
  const destino = d.destino || plan.titulo
  return (
    <Bloque titulo="Boarding pass" className="viaje">
      <div className="boarding">
        <div className="boarding-ruta">
          <div>
            <span className="etiqueta">desde</span>
            <b className="num">BUE</b>
            <span>Buenos Aires</span>
          </div>
          <span className="boarding-avion" aria-hidden>
            ✈
          </span>
          <div className="derecha">
            <span className="etiqueta">hasta</span>
            <b className="num">{codigo(destino)}</b>
            <span>{destino}</span>
          </div>
        </div>
        <dl className="boarding-datos">
          <div>
            <dt>Ida</dt>
            <dd className="num">{corta(d.desde)}</dd>
          </div>
          <div>
            <dt>Vuelta</dt>
            <dd className="num">{corta(d.hasta)}</dd>
          </div>
          <div>
            <dt>Días</dt>
            <dd className="num">{dias ?? "—"}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{d.exterior ? `Intl. ${d.pais ?? ""}` : "Cabotaje"}</dd>
          </div>
        </dl>
        <div className="boarding-valija">
          {valija.length ? (
            <Segmentos hechos={enValija} total={valija.length} etiqueta={`${enValija}/${valija.length} en valija`} />
          ) : (
            <span className="etiqueta">Armen la valija abajo ↓</span>
          )}
        </div>
      </div>
      <div className="grid2">
        <Dato etiqueta="Destino" valor={d.destino} placeholder="A dónde van…" onGuardar={(v) => editarDatos(plan, { destino: v })} />
        <Dato etiqueta="País" valor={d.pais} placeholder="El país…" onGuardar={(v) => editarDatos(plan, { pais: v, exterior: v ? !/^argentina$/i.test(v.trim()) : d.exterior })} />
        <Dato etiqueta="Ida" tipo="date" valor={d.desde} onGuardar={(v) => editarDatos(plan, { desde: v })} />
        <Dato etiqueta="Vuelta" tipo="date" valor={d.hasta} onGuardar={(v) => editarDatos(plan, { hasta: v })} />
      </div>
      <label className="interruptor">
        <span>Es al exterior</span>
        <input type="checkbox" checked={Boolean(d.exterior)} onChange={(e) => editarDatos(plan, { exterior: e.target.checked })} />
      </label>
    </Bloque>
  )
}

// --- DIY -------------------------------------------------------------------

export function SeccionTaller({ plan }: { plan: Plan }) {
  const items = useStore((s) => s.items).filter((i) => i.plan === plan.id)
  const pasos = items.filter((i) => i.lista === "pasos")
  const materiales = items.filter((i) => i.lista === "materiales")
  const hechos = pasos.filter((i) => i.hecho).length
  const d = plan.datos ?? {}
  const [subiendo, setSubiendo] = useState<"antes" | "despues" | null>(null)

  const subir = async (cual: "antes" | "despues") => {
    const [archivo] = await elegirArchivos(false)
    if (!archivo) return
    setSubiendo(cual)
    const previas = new Set(plan.fotos)
    const fd = new FormData()
    fd.append("fotos+", await achicar(archivo))
    const rec = await editarPlan(plan.id, fd)
    const nueva = rec?.fotos.find((f) => !previas.has(f))
    if (rec && nueva) await editarDatos(rec, { [cual]: nueva })
    setSubiendo(null)
  }

  // El recordatorio que importa según el momento del proyecto.
  const recordatorio =
    !d.antes && plan.estado !== "hecho"
      ? { cual: "antes" as const, texto: "Antes de arrancar: sacá la foto del ANTES." }
      : !d.despues && (plan.estado === "hecho" || (pasos.length > 0 && hechos === pasos.length))
        ? { cual: "despues" as const, texto: "¡Terminado! Falta la foto del DESPUÉS." }
        : null

  return (
    <Bloque titulo="Proyecto" className="taller">
      <dl className="datos-grilla">
        <div>
          <dt>Pasos</dt>
          <dd className="num">
            {hechos}/{pasos.length}
          </dd>
        </div>
        <div>
          <dt>Materiales</dt>
          <dd className="num">
            {materiales.filter((i) => i.hecho).length}/{materiales.length}
          </dd>
        </div>
        <div>
          <dt>Fotos</dt>
          <dd className="num">{(d.antes ? 1 : 0) + (d.despues ? 1 : 0)}/2</dd>
        </div>
      </dl>
      {pasos.length > 0 ? <Segmentos hechos={hechos} total={pasos.length} etiqueta={`${Math.round((hechos / pasos.length) * 100)}%`} /> : <p className="suave">Carguen los pasos abajo y vayan tachando.</p>}
      {recordatorio && (
        <button className="recordatorio" onClick={() => subir(recordatorio.cual)} disabled={subiendo !== null}>
          <span aria-hidden>📷</span>
          <span>{recordatorio.texto}</span>
          <span aria-hidden>→</span>
        </button>
      )}
      {d.antes && d.despues ? <AntesDespues antes={urlArchivo(plan, d.antes, "600x0")} despues={urlArchivo(plan, d.despues, "600x0")} /> : null}
      <div className="grid2">
        <Boton variante="secundario" className="boton-chico" onClick={() => subir("antes")} disabled={subiendo !== null}>
          {subiendo === "antes" ? "Subiendo…" : d.antes ? "Cambiar el antes" : "📷 Foto del antes"}
        </Boton>
        <Boton variante="secundario" className="boton-chico" onClick={() => subir("despues")} disabled={subiendo !== null}>
          {subiendo === "despues" ? "Subiendo…" : d.despues ? "Cambiar el después" : "📷 Foto del después"}
        </Boton>
      </div>
    </Bloque>
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
