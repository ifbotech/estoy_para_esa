import { motion } from "motion/react"
import { useState } from "react"
import { promedioGanas } from "../calculos"
import { Arte } from "../componentes/Arte"
import { avisar } from "../componentes/Avisos"
import { BarraGanas, Boton, Estrellas, Hoja, Pasos, TextoEditable } from "../componentes/Controles"
import { Contador, Resaltado } from "../componentes/Deco"
import { cambiarEstado, estoyParaEsa } from "../acciones"
import { colorDe, imagenDe } from "../componentes/Tarjetas"
import { PERSONALIDADES } from "../personalidades"
import { ir, volver } from "../router"
import { ListaItems, Fotos } from "../secciones/Comunes"
import { SeccionCine, SeccionLugar, SeccionTaller, SeccionViaje } from "../secciones/Especiales"
import { borrarPlan, editarPlan, useStore, useYo, votar } from "../store"
import type { Personalidad, Plan } from "../tipos"
import { achicar, elegirArchivos } from "../util/imagen"

export function PlanDetalle({ id }: { id: string }) {
  const plan = useStore((s) => s.planes).find((p) => p.id === id)
  const categorias = useStore((s) => s.categorias)
  if (!plan)
    return (
      <div className="vacio" style={{ marginTop: 80 }}>
        <Arte tipo="salida" tam={14} />
        Este plan no existe (o lo borraron).
        <div style={{ marginTop: 14 }}>
          <Boton onClick={() => ir("/planes")}>Ir a los planes</Boton>
        </div>
      </div>
    )
  const cat = categorias.find((c) => c.id === plan.categoria)
  return <Detalle plan={plan} personalidad={cat?.personalidad ?? "salida"} />
}

function Detalle({ plan, personalidad }: { plan: Plan; personalidad: Personalidad }) {
  const categorias = useStore((s) => s.categorias)
  const usuarios = useStore((s) => s.usuarios)
  const votos = useStore((s) => s.votos).filter((v) => v.plan === plan.id)
  const yo = useYo()
  const cat = categorias.find((c) => c.id === plan.categoria)
  const prom = promedioGanas(plan.id, votos)
  const img = imagenDe(plan, "600x0")
  const [cambiarCat, setCambiarCat] = useState(false)
  const info = PERSONALIDADES[personalidad]

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
    <div className="detalle">
      <header className={`capitulo cabecera ${img ? "con-imagen" : ""}`} style={{ "--cap": cat?.color || "var(--a3)" } as React.CSSProperties}>
        {img && (
          <motion.div className="cabecera-img" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 1 }}>
            <img src={img} alt="" />
          </motion.div>
        )}
        {!img && (
          <motion.span className="cabecera-arte" initial={{ y: 40, rotate: 12, opacity: 0 }} animate={{ y: 0, rotate: 4, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}>
            <Arte tipo={personalidad} tam={22} mira={-1} />
          </motion.span>
        )}
        {personalidad === "viaje" && <span className="sello-pasaporte">{plan.datos?.pais || "Pasaporte"} ✈</span>}
        <div className="cabecera-acciones">
          <button className="boton boton-chico" onClick={() => setCambiarCat(true)}>
            {cat?.emoji} {cat?.nombre} ▾
          </button>
          <button className="boton boton-chico" onClick={cambiarPortada} aria-label="Cambiar portada">
            📷
          </button>
          <button className="boton boton-chico" onClick={borrar} aria-label="Borrar plan">
            🗑
          </button>
        </div>
        <TextoEditable ajustable className="campo-titulo" valor={plan.titulo} onGuardar={(v) => v && editarPlan(plan.id, { titulo: v })} />
      </header>

      <div className="detalle-pasos">
        <Pasos actual={plan.estado} onCambio={(e, ev) => cambiarEstado(plan, e, ev)} />
      </div>

      {plan.estado === "agendado" && (
        <label className="campo-etiqueta cuando">
          <span>¿Cuándo? (opcional)</span>
          <input
            className="campo"
            type="datetime-local"
            value={plan.cuando ? plan.cuando.replace(" ", "T").slice(0, 16) : ""}
            onChange={(e) => editarPlan(plan.id, { cuando: e.target.value ? new Date(e.target.value).toISOString() : "" })}
          />
        </label>
      )}

      <section className="seccion bloque ganas-bloque">
        <div className="seccion-cabeza ganas-resumen">
          <h2>
            Ganas que <Resaltado>tenemos</Resaltado>
          </h2>
          <span className="ganas-promedio">{prom === null ? "—" : <Contador valor={Math.round(prom)} />}</span>
        </div>
        <div className="ganas-lista">
          {usuarios.map((u, i) => {
            const v = votos.find((x) => x.usuario === u.id)
            const mio = u.id === yo?.id
            return (
              <BarraGanas
                key={u.id}
                nombre={mio ? `${u.name} (vos)` : u.name}
                inicial={u.name.slice(0, 1)}
                color={colorDe(u, i)}
                valor={v?.ganas ?? 50}
                pendiente={!v && !mio}
                editable={mio}
                onCambio={(g) => votar(plan.id, { ganas: g })}
              />
            )
          })}
        </div>
        {plan.estado !== "hecho" && (
          <Boton className="boton-grande" onClick={(e) => estoyParaEsa(plan.id, e)}>
            🙌 ¡Estoy para esa!
          </Boton>
        )}
        <p className="etiqueta suave">el promedio de los dos decide su lugar en la lista</p>
      </section>

      {plan.estado === "hecho" && <Puntajes plan={plan} />}

      {personalidad === "cine" && <SeccionCine plan={plan} />}
      {(personalidad === "cocina" || personalidad === "cafe" || personalidad === "salida") && <SeccionLugar plan={plan} />}
      {personalidad === "viaje" && <SeccionViaje plan={plan} />}
      {personalidad === "taller" && <SeccionTaller plan={plan} />}

      {info.listas.map((l) => (
        <ListaItems key={l.id} plan={plan} lista={l.id} nombre={l.nombre} placeholder={l.placeholder} />
      ))}

      <section className="seccion bloque">
        <div className="seccion-cabeza">
          <h2>Notas</h2>
        </div>
        <TextoEditable multilinea valor={plan.notas} placeholder="Lo que haya que acordarse…" onGuardar={(v) => editarPlan(plan.id, { notas: v })} />
        <label className="campo-etiqueta" style={{ marginTop: 12 }}>
          <span>Link</span>
          <TextoEditable valor={plan.link} placeholder="https://…" onGuardar={(v) => editarPlan(plan.id, { link: v })} />
        </label>
        {plan.link && (
          <a className="link-externo" href={plan.link} target="_blank" rel="noreferrer">
            Abrir link ↗
          </a>
        )}
      </section>

      <Fotos plan={plan} />

      <p className="detalle-pie suave">
        Sumado el {new Date(plan.created.replace(" ", "T")).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
        {plan.hecho_en && ` · hecho el ${new Date(plan.hecho_en.replace(" ", "T")).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}`}
      </p>

      <Hoja abierta={cambiarCat} onCerrar={() => setCambiarCat(false)} titulo="Cambiar categoría">
        <div className="grid2">
          {categorias.map((c) => (
            <button
              key={c.id}
              className="marco mosaico mosaico-chico"
              style={{ "--cap": c.color } as React.CSSProperties}
              onClick={() => {
                editarPlan(plan.id, { categoria: c.id })
                setCambiarCat(false)
              }}
            >
              <span className="marco-dentro mosaico-dentro">
                <Arte tipo={c.personalidad} tam={8} />
                <span className="mosaico-nombre">{c.nombre}</span>
              </span>
            </button>
          ))}
        </div>
      </Hoja>
    </div>
  )
}

function Puntajes({ plan }: { plan: Plan }) {
  const usuarios = useStore((s) => s.usuarios)
  const votos = useStore((s) => s.votos).filter((v) => v.plan === plan.id)
  const yo = useYo()
  const mio = votos.find((v) => v.usuario === yo?.id)
  const [resena, setResena] = useState<string | null>(null)
  return (
    <motion.section className="seccion bloque puntajes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="seccion-cabeza">
        <h2>
          ¿Qué tal <span className="serif">estuvo</span>?
        </h2>
      </div>
      {usuarios.map((u, i) => {
        const v = votos.find((x) => x.usuario === u.id)
        const esYo = u.id === yo?.id
        return (
          <div key={u.id} className="puntaje-fila">
            <span className="puntaje-nombre" style={{ color: colorDe(u, i) }}>
              {u.name}
            </span>
            <Estrellas valor={v?.puntaje ?? 0} onCambio={esYo ? (p) => votar(plan.id, { puntaje: p }) : undefined} />
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
    </motion.section>
  )
}
