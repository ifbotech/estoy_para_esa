import { motion } from "motion/react"
import { useState } from "react"
import { promedioGanas } from "../calculos"
import { Arte } from "../componentes/Arte"
import { avisar } from "../componentes/Avisos"
import { BarraGanas, Boton, caraDeGanas, Estrellas, Hoja, Medidor, TextoEditable } from "../componentes/Controles"
import { Contador } from "../componentes/Deco"
import { colorDe, imagenDe } from "../componentes/Tarjetas"
import { PERSONALIDADES } from "../personalidades"
import { ir, volver } from "../router"
import { ListaItems, Fotos } from "../secciones/Comunes"
import { SeccionCine, SeccionLugar, SeccionTaller, SeccionViaje } from "../secciones/Especiales"
import { borrarPlan, editarPlan, useStore, useYo, votar } from "../store"
import { ESTADOS, type Estado, type Personalidad, type Plan } from "../tipos"
import { festejar, festejoGrande, vibrar } from "../util/efectos"
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

  const cambiarEstado = (e: React.MouseEvent, estado: Estado) => {
    if (estado === plan.estado) return
    vibrar(15)
    editarPlan(plan.id, { estado })
    if (estado === "hecho") {
      festejoGrande()
      festejar(e.clientX / innerWidth, e.clientY / innerHeight, 1.5)
      avisar("¡Lo hicieron! 🎉 Ahora puntúenlo y suban fotos.")
    }
  }

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
      <header className={`cabecera p-${personalidad} ${img ? "con-imagen" : ""}`}>
        {img && (
          <motion.div className="cabecera-img" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 1.2 }}>
            <img src={img} alt="" />
          </motion.div>
        )}
        {!img && <Arte tipo={personalidad} tam={22} className="arte-cabecera" />}
        {personalidad === "viaje" && <span className="sello-pasaporte">{plan.datos?.pais || "Pasaporte"} ✈</span>}
        {personalidad === "taller" && <span className="cinta-papel" />}
        <button className="cabecera-volver" onClick={() => volver("/planes")} aria-label="Volver">
          ←
        </button>
        <div className="cabecera-acciones">
          <button onClick={cambiarPortada} aria-label="Cambiar portada">
            📷
          </button>
          <button onClick={borrar} aria-label="Borrar plan">
            🗑
          </button>
        </div>
        <motion.button className="chip-cat chip-cabecera" style={{ "--cc": cat?.color || "var(--a1)" } as React.CSSProperties} onClick={() => setCambiarCat(true)} whileTap={{ scale: 0.9 }}>
          {cat?.emoji} {cat?.nombre} ▾
        </motion.button>
        <TextoEditable ajustable className="campo-titulo" valor={plan.titulo} onGuardar={(v) => v && editarPlan(plan.id, { titulo: v })} />
      </header>

      <div className="estados" role="radiogroup" aria-label="Estado">
        <div className="estados-linea">
          <motion.div
            className="estados-progreso"
            animate={{ width: `${(ESTADOS.findIndex((e) => e.id === plan.estado) / (ESTADOS.length - 1)) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          />
        </div>
        {ESTADOS.map((e, i) => {
          const actual = ESTADOS.findIndex((x) => x.id === plan.estado)
          return (
            <motion.button
              key={e.id}
              role="radio"
              aria-checked={plan.estado === e.id}
              className={`estado ${i <= actual ? "pasado" : ""} ${plan.estado === e.id ? "actual" : ""}`}
              onClick={(ev) => cambiarEstado(ev, e.id)}
              whileTap={{ scale: 0.85 }}
            >
              <motion.span className="estado-punto" animate={plan.estado === e.id ? { scale: [1, 1.3, 1] } : { scale: 1 }} transition={{ duration: 0.4 }}>
                {e.emoji}
              </motion.span>
              <span className="estado-nombre">{e.nombre}</span>
            </motion.button>
          )
        })}
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
        <div className="ganas-resumen">
          <Medidor valor={prom} tam={124}>
            <div>
              <div className="medidor-cara">{prom === null ? "🤔" : caraDeGanas(prom)}</div>
              <b className="medidor-num">{prom === null ? "—" : <Contador valor={Math.round(prom)} />}</b>
            </div>
          </Medidor>
          <div>
            <h2>
              Ganas que <span className="serif">tenemos</span>
            </h2>
            <p className="suave">El promedio de los dos decide su lugar en la lista.</p>
          </div>
        </div>
        <div className="ganas-lista">
          {usuarios.map((u, i) => {
            const v = votos.find((x) => x.usuario === u.id)
            const mio = u.id === yo?.id
            return (
              <BarraGanas
                key={u.id}
                nombre={mio ? `${u.name} (vos)` : u.name}
                color={colorDe(u, i)}
                valor={v?.ganas ?? 50}
                pendiente={!v && !mio}
                editable={mio}
                onCambio={(g) => votar(plan.id, { ganas: g })}
              />
            )
          })}
        </div>
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
              className={`mosaico mosaico-chico p-${c.personalidad}`}
              onClick={() => {
                editarPlan(plan.id, { categoria: c.id })
                setCambiarCat(false)
              }}
            >
              <Arte tipo={c.personalidad} tam={8} />
              <h3>
                {c.emoji} {c.nombre}
              </h3>
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
