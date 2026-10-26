import { useMemo, useState } from "react"
import { barriosConquistados, curaduriaPelis, rankear } from "../calculos"
import { Arte } from "../componentes/Arte"
import { Bloque } from "../componentes/Deco"
import { Maquina } from "../componentes/Maquina"
import { TarjetaPlan, VotoRapido } from "../componentes/Tarjetas"
import type { Ruta } from "../router"
import { useStore, useYo } from "../store"
import { ESTADOS, type Categoria, type Estado, type Plan, type Voto } from "../tipos"

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

export function Planes({ ruta }: { ruta: Ruta }) {
  const planes = useStore((s) => s.planes)
  const votos = useStore((s) => s.votos)
  const categorias = useStore((s) => s.categorias)
  const yo = useYo()
  // «todos» son los que siguen pendientes; los hechos viven en su pestaña
  const [estado, setEstado] = useState<Estado | "todos">((ruta.query.get("estado") as Estado) || "todos")
  const [soloPorVotar, setSoloPorVotar] = useState(ruta.query.has("votar"))
  const [cat, setCat] = useState<string | null>(ruta.query.get("cat"))
  const [busqueda, setBusqueda] = useState("")

  const yaVote = (id: string) => votos.some((v) => v.plan === id && v.usuario === yo?.id)
  const enEstado = (p: Plan, e: Estado | "todos") => (e === "todos" ? p.estado !== "hecho" : p.estado === e)
  const lista = useMemo(() => {
    const q = normalizar(busqueda.trim())
    const filtrados = planes.filter(
      (p) =>
        (q ? true : enEstado(p, estado)) &&
        (!cat || p.categoria === cat) &&
        (!q || normalizar(p.titulo + " " + p.notas).includes(q)) &&
        (!soloPorVotar || !yaVote(p.id)),
    )
    const r = rankear(filtrados, votos)
    if (estado === "hecho" && !q) r.sort((a, b) => b.plan.hecho_en.localeCompare(a.plan.hecho_en))
    if (estado === "agendado" && !q) r.sort((a, b) => (a.plan.cuando || "9999").localeCompare(b.plan.cuando || "9999"))
    return r
  }, [planes, votos, estado, cat, busqueda, soloPorVotar, yo?.id])

  const cuenta = (e: Estado | "todos") => planes.filter((p) => enEstado(p, e) && (!cat || p.categoria === cat)).length
  const porVotar = planes.filter((p) => p.estado !== "hecho" && (!cat || p.categoria === cat) && !yaVote(p.id)).length
  const ranking = useMemo(() => rankear(planes, votos), [planes, votos])
  const catActual = categorias.find((c) => c.id === cat)
  const deLaCategoria = catActual ? planes.filter((p) => p.categoria === catActual.id) : []

  return (
    <div className="planes">
      <header className="cabeza-pantalla" style={{ "--cc": catActual?.color ?? "var(--amarillo)" } as React.CSSProperties}>
        <div>
          <p className="etiqueta">{catActual ? "categoría" : "todos, ordenados por ganas"}</p>
          <h1 className="titulo-pantalla">{catActual ? `${catActual.emoji} ${catActual.nombre}` : "Planes"}</h1>
        </div>
        {catActual && (
          <span className="cabeza-arte">
            <Arte tipo={catActual.personalidad} tam={9} />
          </span>
        )}
      </header>

      <input className="campo buscador" type="search" placeholder="Buscar un plan…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

      <div className="filtro-estados" role="tablist" aria-label="Estado">
        {[{ id: "todos" as const, nombre: "Todos" }, ...ESTADOS].map((e, i) => (
          <button
            key={e.id}
            role="tab"
            aria-selected={!busqueda.trim() && estado === e.id}
            className={`filtro-estado ${!busqueda.trim() && estado === e.id ? "activo" : ""}`}
            onClick={() => {
              setEstado(e.id)
              setBusqueda("")
            }}
          >
            <span className="filtro-num num">{i ? String(i).padStart(2, "0") : "∗"}</span>
            <span className="filtro-nombre">{e.nombre}</span>
            <span className="filtro-cuenta num">{cuenta(e.id)}</span>
          </button>
        ))}
      </div>

      <div className="fila-scroll chips-cat">
        <button className="chip chip-votar" aria-pressed={soloPorVotar} onClick={() => setSoloPorVotar(!soloPorVotar)}>
          🗳️ Por votar <span className="num">{porVotar}</span>
        </button>
        <button className="chip" aria-pressed={!cat} onClick={() => setCat(null)}>
          Todas
        </button>
        {categorias.map((c) => (
          <button
            key={c.id}
            className="chip chip-color"
            style={{ "--cc": c.color } as React.CSSProperties}
            aria-pressed={cat === c.id}
            onClick={() => setCat(cat === c.id ? null : c.id)}
          >
            {c.emoji} {c.nombre}
          </button>
        ))}
      </div>

      {catActual && <ExtrasCategoria cat={catActual} planes={deLaCategoria} votos={votos} />}

      {lista.length > 0 && <p className="pista-gestos etiqueta">deslizá → avanza el estado · doble toque: ¡estoy para esa! · mantené: vista rápida</p>}

      <div className="lista-planes">
        {lista.map((r, i) => (
          <div key={r.plan.id} className="plan-votable">
            <TarjetaPlan
              r={r}
              conEstado={Boolean(busqueda.trim()) || estado === "todos"}
              puesto={estado !== "hecho" && estado !== "agendado" && !busqueda && r.promedio !== null ? i + 1 : undefined}
            />
            {r.plan.estado !== "hecho" && !yaVote(r.plan.id) && <VotoRapido planId={r.plan.id} />}
          </div>
        ))}
      </div>

      {!lista.length && (
        <div className="vacio">
          <Arte tipo={catActual?.personalidad ?? "salida"} tam={10} />
          <p>
            {busqueda
              ? "Nada con ese nombre."
              : soloPorVotar
                ? "Votaste todo. ¡Bien ahí! 🗳️"
                : estado === "hecho"
                  ? "Todavía nada hecho acá."
                  : "Nada por acá todavía."}
          </p>
          {!busqueda && !soloPorVotar && estado !== "hecho" && (
            <a className="boton boton-chico" href="#/">
              + Sumar una aventura
            </a>
          )}
        </div>
      )}

      {!busqueda && <Maquina ranking={ranking} />}
    </div>
  )
}

/** Lo propio de cada categoría: la curaduría en pelis, los barrios en lugares. */
function ExtrasCategoria({ cat, planes, votos }: { cat: Categoria; planes: Plan[]; votos: Voto[] }) {
  const usuarios = useStore((s) => s.usuarios)
  const nombre = (id: string) => usuarios.find((u) => u.id === id)?.name ?? "Alguien"
  if (cat.personalidad === "cine") {
    const c = curaduriaPelis(planes, votos)
    if (!c.porPersona.length) return null
    return (
      <Bloque titulo="Curaduría de pareja" className="curaduria">
        <dl className="datos-grilla">
          {c.porPersona.map((p) => (
            <div key={p.usuario}>
              <dt>{nombre(p.usuario)}</dt>
              <dd className="num">★ {p.promedio.toFixed(1).replace(".", ",")}</dd>
            </div>
          ))}
          {c.coincidencia !== null && (
            <div>
              <dt>Coincidencia</dt>
              <dd className="num">{c.coincidencia}%</dd>
            </div>
          )}
          {c.vsLetterboxd && (
            <div>
              <dt>vs. Letterboxd</dt>
              <dd className="num">
                {c.vsLetterboxd.diferencia >= 0 ? "+" : "−"}
                {Math.abs(c.vsLetterboxd.diferencia).toFixed(1).replace(".", ",")}
              </dd>
            </div>
          )}
        </dl>
        <ul className="curaduria-frases">
          {c.masDuro && (
            <li>
              <b>{nombre(c.masDuro.usuario)}</b> es más duro puntuando ({c.masDuro.diferencia.toFixed(1).replace(".", ",")} ★ menos).
            </li>
          )}
          {c.mayorAcuerdo && (
            <li>
              Mayor acuerdo: <a href={`#/plan/${c.mayorAcuerdo.plan.id}`}>{c.mayorAcuerdo.plan.titulo}</a>
            </li>
          )}
          {c.mayorDesacuerdo && (
            <li>
              Los dividió: <a href={`#/plan/${c.mayorDesacuerdo.plan.id}`}>{c.mayorDesacuerdo.plan.titulo}</a> ({c.mayorDesacuerdo.puntajes.map((p) => `${p}★`).join(" vs ")})
            </li>
          )}
          {c.vsLetterboxd && (
            <li>
              En {c.vsLetterboxd.cantidad} {c.vsLetterboxd.cantidad === 1 ? "peli" : "pelis"} con promedio de Letterboxd, ustedes ponen{" "}
              {c.vsLetterboxd.diferencia >= 0 ? "más" : "menos"} que la gente.
            </li>
          )}
        </ul>
      </Bloque>
    )
  }
  if (cat.personalidad === "cocina" || cat.personalidad === "cafe" || cat.personalidad === "salida") {
    const barrios = barriosConquistados(planes)
    if (!barrios.length) return null
    return (
      <Bloque titulo="Barrios conquistados" accion={<span className="num">{barrios.length}</span>}>
        <ul className="barrios">
          {barrios.map((b) => (
            <li key={b.barrio}>
              {b.barrio} <span className="num">×{b.cantidad}</span>
            </li>
          ))}
        </ul>
      </Bloque>
    )
  }
  return null
}
