import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { accionPrincipal, aCiegas, promedioGanas, sellado } from "../calculos"
import { Arte } from "../componentes/Arte"
import { avisar } from "../componentes/Avisos"
import { Boton, Estrellas, GanasDeLosDos, Hoja, Pasos, TextoEditable } from "../componentes/Controles"
import { Bloque, Segmentos } from "../componentes/Deco"
import { cambiarEstado, estoyParaEsa } from "../acciones"
import { colorDe, imagenDe } from "../componentes/Tarjetas"
import { PERSONALIDADES } from "../personalidades"
import { ir, volver } from "../router"
import { ListaItems, Fotos, subirFotos } from "../secciones/Comunes"
import { SeccionCine, SeccionLugar, SeccionTaller, SeccionViaje } from "../secciones/Especiales"
import { borrarPlan, editarItem, editarPlan, useStore, useYo, votar } from "../store"
import { ESTADOS, type Personalidad, type Plan } from "../tipos"
import { vibrar } from "../util/efectos"
import { achicar, elegirArchivos } from "../util/imagen"

export function PlanDetalle({ id }: { id: string }) {
  const plan = useStore((s) => s.planes).find((p) => p.id === id)
  const categorias = useStore((s) => s.categorias)
  if (!plan)
    return (
      <div className="vacio">
        <Arte tipo="salida" tam={10} />
        <p>Este plan no existe (o lo borraron).</p>
        <Boton onClick={() => ir("/planes")}>Ir a los planes</Boton>
      </div>
    )
  const cat = categorias.find((c) => c.id === plan.categoria)
  return <Detalle plan={plan} personalidad={cat?.personalidad ?? "salida"} />
}

function Detalle({ plan, personalidad }: { plan: Plan; personalidad: Personalidad }) {
  const categorias = useStore((s) => s.categorias)
  const votos = useStore((s) => s.votos).filter((v) => v.plan === plan.id)
  const yo = useYo()
  const cat = categorias.find((c) => c.id === plan.categoria)
  const prom = promedioGanas(plan.id, votos)
  const ciego = aCiegas(votos, yo?.id)
  const img = imagenDe(plan, "600x0")
  const [cambiarCat, setCambiarCat] = useState(false)
  const info = PERSONALIDADES[personalidad]
  const cabecera = useRef<HTMLElement>(null)
  const [tituloFijo, setTituloFijo] = useState(false)

  // Cuando la ficha sale de la pantalla, el título queda fijo arriba.
  useEffect(() => {
    const el = cabecera.current
    if (!el || !("IntersectionObserver" in window)) return
    const o = new IntersectionObserver(([e]) => setTituloFijo(!e.isIntersecting), { rootMargin: "-100px 0px 0px 0px" })
    o.observe(el)
    return () => o.disconnect()
  }, [])

  const cambiarPortada = async () => {
    const [a] = await elegirArchivos(false)
    if (!a) return
    const fd = new FormData()
    fd.append("portada", await achicar(a))
    await editarPlan(plan.id, fd)
  }

  const borrar = async () => {
    if (!confirm(`¿Borrar «${plan.titulo}»? No se puede deshacer.`)) return
    await borrarPlan(plan.id)
    avisar("Plan borrado")
    volver("/planes")
  }

  return (
    <div className="detalle" style={{ "--cc": cat?.color || "var(--amarillo)" } as React.CSSProperties}>
      <AnimatePresence>
        {tituloFijo && (
          <motion.div className="titulo-fijo" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.12 }}>
            <span className="titulo-fijo-texto">{plan.titulo}</span>
            <button className="chip-estado" onClick={() => document.querySelector(".detalle-pasos")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              {ESTADOS.find((e) => e.id === plan.estado)?.emoji} {ESTADOS.find((e) => e.id === plan.estado)?.nombre}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="ficha-cabeza" ref={cabecera}>
        <div className="ficha-banda">
          <button className="banda-cat" onClick={() => setCambiarCat(true)}>
            {cat?.emoji} {cat?.nombre} <span aria-hidden>▾</span>
          </button>
          <span className="banda-acciones">
            <button onClick={cambiarPortada} aria-label="Cambiar portada">
              📷
            </button>
            <button onClick={borrar} aria-label="Borrar plan">
              🗑
            </button>
          </span>
        </div>
        <div className={`ficha-imagen ${img ? "" : "sin"}`}>
          {img ? <img src={img} alt="" /> : <Arte tipo={personalidad} tam={12} />}
          {personalidad === "viaje" && plan.datos?.pais && <span className="sello-pasaporte">{plan.datos.pais} ✈</span>}
        </div>
        <TextoEditable ajustable className="campo-titulo" valor={plan.titulo} onGuardar={(v) => v && editarPlan(plan.id, { titulo: v })} />
      </header>

      <div className="detalle-pasos">
        <Pasos actual={plan.estado} onCambio={(e, ev) => cambiarEstado(plan, e, ev)} />
      </div>

      {plan.estado === "agendado" && (
        <label className="campo-etiqueta cuando">
          <span>¿Cuándo?</span>
          <input
            className="campo num"
            type="datetime-local"
            value={plan.cuando ? aLocal(plan.cuando) : ""}
            onChange={(e) => editarPlan(plan.id, { cuando: e.target.value ? new Date(e.target.value).toISOString() : "" })}
          />
        </label>
      )}

      <Bloque
        id="ganas"
        titulo="Ganas"
        className="ganas-bloque"
        accion={<span className="ganas-promedio num">{ciego || prom === null ? "¿?" : `${Math.round(prom)}%`}</span>}
      >
        <GanasDeLosDos planId={plan.id} />
        {plan.estado !== "hecho" && (
          <Boton className="boton-grande" onClick={(e) => estoyParaEsa(plan.id, e)}>
            🙌 ¡Estoy para esa!
          </Boton>
        )}
        <p className="nota-pie">
          {ciego ? "Votás a ciegas: el número del otro se destapa cuando votes." : "El promedio de los dos decide su lugar en la lista."}
        </p>
      </Bloque>

      {plan.estado === "hecho" && <SelloRecuerdo plan={plan} />}
      {plan.estado === "hecho" && <Puntajes plan={plan} />}

      {personalidad === "cine" && <SeccionCine plan={plan} />}
      {(personalidad === "cocina" || personalidad === "cafe" || personalidad === "salida") && <SeccionLugar plan={plan} />}
      {personalidad === "viaje" && <SeccionViaje plan={plan} />}
      {personalidad === "taller" && <SeccionTaller plan={plan} />}

      {/* las ideas que se van sumando: un día en San Telmo, todo lo de un viaje… */}
      <ListaItems plan={plan} lista="ideas" nombre="Ideas" placeholder="Lo que se les ocurra sumarle…" />

      {info.listas.map((l) => (
        <ListaItems
          key={l.id}
          plan={plan}
          lista={l.id}
          nombre={l.id === "pedir" && plan.estado === "hecho" ? "Qué probamos" : l.nombre}
          placeholder={l.placeholder}
        />
      ))}

      <Bloque titulo="Notas">
        <TextoEditable multilinea valor={plan.notas} placeholder="Lo que haya que acordarse…" onGuardar={(v) => editarPlan(plan.id, { notas: v })} />
        <label className="campo-etiqueta">
          <span>Link</span>
          <TextoEditable valor={plan.link} placeholder="https://…" onGuardar={(v) => editarPlan(plan.id, { link: v })} />
        </label>
        {plan.link && (
          <a className="link-externo" href={plan.link} target="_blank" rel="noreferrer">
            Abrir link ↗
          </a>
        )}
      </Bloque>

      <Fotos plan={plan} />

      <p className="detalle-pie num">
        Sumado el {new Date(plan.created.replace(" ", "T")).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
        {plan.hecho_en && ` · hecho el ${new Date(plan.hecho_en.replace(" ", "T")).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}`}
      </p>

      <BarraAccion plan={plan} personalidad={personalidad} />

      <Hoja abierta={cambiarCat} onCerrar={() => setCambiarCat(false)} titulo="Cambiar categoría">
        <div className="grilla-cats">
          {categorias.map((c) => (
            <button
              key={c.id}
              className={`cat-boton ${c.id === plan.categoria ? "elegida" : ""}`}
              style={{ "--cc": c.color } as React.CSSProperties}
              onClick={() => {
                editarPlan(plan.id, { categoria: c.id })
                setCambiarCat(false)
              }}
            >
              <Arte tipo={c.personalidad} tam={6} />
              <span>{c.nombre}</span>
            </button>
          ))}
        </div>
      </Hoja>
    </div>
  )
}

/**
 * La barra fija de abajo: la única acción que conviene ahora (votar, agendar,
 * tachar el próximo ítem de la valija o del proyecto, marcarlo hecho o
 * completar el recuerdo). Respeta el área segura del teléfono.
 */
function BarraAccion({ plan, personalidad }: { plan: Plan; personalidad: Personalidad }) {
  const votos = useStore((s) => s.votos)
  const items = useStore((s) => s.items)
  const usuarios = useStore((s) => s.usuarios)
  const yo = useYo()
  const [ocupado, setOcupado] = useState(false)
  const a = accionPrincipal(plan, personalidad, votos, items, usuarios, yo?.id)

  const llevarA = (id: string, foco?: string) => {
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: "smooth", block: "center" })
    if (foco) setTimeout(() => (el?.querySelector(foco) as HTMLElement | null)?.focus({ preventScroll: true }), 400)
  }

  const hacer = async (ev: React.MouseEvent) => {
    if (ocupado) return
    switch (a.tipo) {
      case "votar":
        return llevarA("ganas", ".ganas.editable .ganas-pista")
      case "estado":
        return cambiarEstado(plan, a.estado, ev)
      case "item":
        vibrar(10)
        return editarItem(a.itemId, { hecho: true })
      case "puntuar":
        return llevarA("puntajes")
      case "resena":
        return llevarA("puntajes", "textarea")
      case "foto":
      case "fotos":
        setOcupado(true)
        await subirFotos(plan)
        setOcupado(false)
    }
  }

  return (
    <div className="cta-fija">
      <Boton className="boton-grande" onClick={hacer} disabled={ocupado}>
        <span className="cta-texto">{ocupado ? "Subiendo…" : a.texto}</span>
        <small>{a.sub}</small>
      </Boton>
    </div>
  )
}

/** «2026-10-26 21:00:00.000Z» → valor de un input datetime-local en la hora de acá. */
function aLocal(iso: string) {
  const d = new Date(iso.replace(" ", "T"))
  if (isNaN(d.getTime())) return ""
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

/** El sello del recuerdo: qué falta para que quede 100 % cerrado. */
function SelloRecuerdo({ plan }: { plan: Plan }) {
  const votos = useStore((s) => s.votos)
  const usuarios = useStore((s) => s.usuarios)
  const s = sellado(plan, votos, usuarios)
  return (
    <Bloque titulo={s.completo ? "Recuerdo sellado" : "Sellar el recuerdo"} className={`sello-bloque ${s.completo ? "completo" : ""}`} accion={<span className="num">{s.hechos}/{s.total}</span>}>
      <Segmentos hechos={s.hechos} total={s.total} />
      <ul className="checklist">
        {s.pasos.map((p) => (
          <li key={p.id} className={p.ok ? "ok" : ""}>
            <span className="check" aria-hidden>
              {p.ok ? "✓" : ""}
            </span>
            {p.etiqueta}
          </li>
        ))}
      </ul>
      {s.completo && <p className="nota-pie">✦ 100 % sellado. Queda así para el Wrapped.</p>}
    </Bloque>
  )
}

function Puntajes({ plan }: { plan: Plan }) {
  const usuarios = useStore((s) => s.usuarios)
  const votos = useStore((s) => s.votos).filter((v) => v.plan === plan.id)
  const yo = useYo()
  const mio = votos.find((v) => v.usuario === yo?.id)
  const [resena, setResena] = useState<string | null>(null)
  return (
    <Bloque id="puntajes" titulo="¿Qué tal estuvo?" className="puntajes">
      {usuarios.map((u, i) => {
        const v = votos.find((x) => x.usuario === u.id)
        const esYo = u.id === yo?.id
        return (
          <div key={u.id} className="puntaje-fila">
            <span className="puntaje-nombre">
              <i style={{ background: colorDe(u, i) }} aria-hidden />
              {u.name}
            </span>
            <Estrellas valor={v?.puntaje ?? 0} tam={26} onCambio={esYo ? (p) => votar(plan.id, { puntaje: p }) : undefined} />
            {!esYo && v?.resena && <p className="resena">“{v.resena}”</p>}
          </div>
        )
      })}
      <textarea
        className="campo campo-area"
        placeholder="Tu reseña en dos líneas…"
        value={resena ?? mio?.resena ?? ""}
        onChange={(e) => setResena(e.target.value)}
        onBlur={() => {
          if (resena !== null && resena !== (mio?.resena ?? "")) votar(plan.id, { resena: resena.trim() })
          setResena(null)
        }}
      />
    </Bloque>
  )
}
