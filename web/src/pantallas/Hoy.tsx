import { AnimatePresence, motion } from "motion/react"
import { useMemo, useRef, useState } from "react"
import { agendarHoy } from "../acciones"
import {
  FILTROS_SORTEO, MESES, candidatosSorteo, demorasRodillo, fecha, momentum, rankear, sellado, sortear,
  type FiltroSorteo, type Rankeado,
} from "../calculos"
import { Arte } from "../componentes/Arte"
import { Boton } from "../componentes/Controles"
import { Bloque, Segmentos } from "../componentes/Deco"
import { Polaroid } from "../componentes/Polaroid"
import { ChipCategoria, TarjetaPlan, colorDe } from "../componentes/Tarjetas"
import { ir } from "../router"
import { useStore, useYo } from "../store"
import type { Plan } from "../tipos"
import { vibrar } from "../util/efectos"
import { sonar } from "../util/sonidos"

function saludo() {
  const h = new Date().getHours()
  if (h < 6) return "Buenas noches"
  if (h < 13) return "Buen día"
  if (h < 20) return "Buenas tardes"
  return "Buenas noches"
}

const DIA = 86400000

/** «hoy 21:00», «mañana», «en 3 días», «el 12 nov»… */
function cuandoRelativo(s: string, hoy = new Date()): string {
  const d = fecha(s)
  if (!d) return "sin día"
  const a = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dias = Math.round((b - a) / DIA)
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  if (dias === 0) return `hoy ${hora}`
  if (dias === 1) return `mañana ${hora}`
  if (dias === -1) return "ayer"
  if (dias > 1 && dias < 7) return `${d.toLocaleDateString("es-AR", { weekday: "long" })} ${hora}`
  if (dias < 0) return `hace ${-dias} días`
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })
}

export function Hoy({ onNuevo }: { onNuevo: () => void }) {
  const planes = useStore((s) => s.planes)
  const votos = useStore((s) => s.votos)
  const usuarios = useStore((s) => s.usuarios)
  const yo = useYo()
  const ranking = useMemo(() => rankear(planes, votos), [planes, votos])
  const m = useMemo(() => momentum(planes), [planes])
  const pendientes = ranking.filter((r) => r.plan.estado !== "hecho")
  const porVotar = pendientes.filter((r) => !r.votos.some((v) => v.usuario === yo?.id))
  const top = pendientes.filter((r) => r.plan.estado === "idea" && r.promedio !== null).slice(0, 3)

  const enCurso = planes.filter((p) => p.estado === "en_curso").sort((a, b) => b.updated.localeCompare(a.updated))
  const agendados = planes
    .filter((p) => p.estado === "agendado")
    .sort((a, b) => (a.cuando || "9999").localeCompare(b.cuando || "9999"))
  const agenda = [...enCurso, ...agendados]
  const ahora = agenda[0]

  const hechos = planes.filter((p) => p.estado === "hecho").sort((a, b) => b.hecho_en.localeCompare(a.hecho_en))
  // el recuerdo más nuevo que todavía no quedó sellado (de los últimos diez)
  const porSellar = hechos.slice(0, 10).find((p) => !sellado(p, votos, usuarios).completo)
  const hoy = new Date()

  return (
    <div className="hoy">
      <header className="hoy-cabeza">
        <p className="etiqueta">{hoy.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="hoy-saludo">
          {saludo()}, {yo?.name ?? "che"}.
        </h1>
        <dl className="resumen">
          <div>
            <dt>Pendientes</dt>
            <dd className="num">{pendientes.length}</dd>
          </div>
          <a href={porVotar.length ? `#/plan/${porVotar[0].plan.id}` : "#/planes"} className={porVotar.length ? "alerta" : ""}>
            <dt>Por votar</dt>
            <dd className="num">{porVotar.length}</dd>
          </a>
          <div>
            <dt>Este mes</dt>
            <dd className="num">{m.esteMes}</dd>
          </div>
        </dl>
      </header>

      <Bloque numero="01" titulo="Ahora / en agenda" accion={agenda.length > 1 ? <a href="#/planes?estado=agendado">todo</a> : undefined}>
        {ahora ? (
          <>
            <TicketAhora plan={ahora} />
            {agenda.length > 1 && (
              <ul className="agenda">
                {agenda.slice(1, 4).map((p) => (
                  <FilaAgenda key={p.id} plan={p} />
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="vacio vacio-chico">
            <p>Nada agendado ni en curso.</p>
            <p className="suave">Elijan uno del top o tiren la máquina de abajo.</p>
          </div>
        )}
      </Bloque>

      <Bloque numero="02" titulo="Top de ganas" accion={<a href="#/planes">ver todo</a>}>
        {porVotar.length > 0 && (
          <a href={`#/plan/${porVotar[0].plan.id}`} className="aviso-voto">
            <b className="num">{porVotar.length}</b>
            <span>{porVotar.length === 1 ? "plan espera tus ganas" : "planes esperan tus ganas"}. Se vota a ciegas.</span>
            <span aria-hidden>→</span>
          </a>
        )}
        {top.length ? (
          <div className="lista-planes">
            {top.map((r, i) => (
              <TarjetaPlan key={r.plan.id} r={r} puesto={i + 1} compacta />
            ))}
          </div>
        ) : (
          <div className="vacio vacio-chico">
            <p>Todavía no hay ideas votadas.</p>
            <Boton className="boton-chico" onClick={onNuevo}>
              + Nuevo plan
            </Boton>
          </div>
        )}
      </Bloque>

      <Maquina ranking={ranking} />

      {porSellar ? (
        <Bloque numero="04" titulo="Sello pendiente" accion={<a href="#/recuerdos">recuerdos</a>}>
          <SelloPendiente plan={porSellar} />
        </Bloque>
      ) : (
        hechos[0] && (
          <Bloque numero="04" titulo="Último recuerdo" accion={<a href="#/recuerdos">todos</a>}>
            <div className="hoy-polaroid">
              <Polaroid plan={hechos[0]} grande />
            </div>
          </Bloque>
        )
      )}

      <section className="momentum" aria-label="Su ritmo">
        <div>
          <b className="num">{m.total}</b>
          <span>hechos juntos</span>
        </div>
        <div>
          <b className="num">{m.mesRecord ? MESES[m.mesRecord.mes].slice(0, 3) : "—"}</b>
          <span>{m.mesRecord ? `mes récord · ${m.mesRecord.cantidad}` : "mes récord"}</span>
        </div>
        <div>
          <b className="num">{m.rachaMaxima}</b>
          <span>semanas seguidas, récord</span>
        </div>
      </section>

      <a href={`#/wrapped/${hoy.getFullYear()}`} className="cta-wrapped">
        <span>
          <span className="etiqueta">su año en plancitos</span>
          <b>Wrapped {hoy.getFullYear()}</b>
        </span>
        <span aria-hidden>→</span>
      </a>
    </div>
  )
}

/** El plan de ahora como ticket: categoría, día y hora, y el acceso a sus listas. */
function TicketAhora({ plan }: { plan: Plan }) {
  const cat = useStore((s) => s.categorias).find((c) => c.id === plan.categoria)
  const items = useStore((s) => s.items).filter((i) => i.plan === plan.id)
  const d = fecha(plan.cuando)
  const lista = cat?.personalidad === "viaje" ? "valija" : cat?.personalidad === "taller" ? "pasos" : null
  const ls = lista ? items.filter((i) => i.lista === lista) : []
  const dias = new Set(items.filter((i) => i.lista === "itinerario").map((i) => i.dia || 1)).size
  return (
    <a href={`#/plan/${plan.id}`} className="ticket" style={{ "--cc": cat?.color || "var(--amarillo)" } as React.CSSProperties}>
      <div className="ticket-cabeza">
        <span>{plan.estado === "en_curso" ? "● En curso" : "Agendado"}</span>
        <span className="num">
          {d ? `${d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" })} · ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}` : "sin día"}
        </span>
      </div>
      <div className="ticket-cuerpo">
        <div className="ticket-arte">
          <Arte tipo={cat?.personalidad ?? "salida"} tam={8} />
        </div>
        <div className="ticket-texto">
          <ChipCategoria cat={cat} />
          <h3>{plan.titulo}</h3>
          <p className="suave">{plan.estado === "en_curso" ? "Están en esto ahora." : cuandoRelativo(plan.cuando)}</p>
        </div>
      </div>
      {lista && ls.length > 0 && (
        <div className="ticket-progreso">
          <Segmentos
            hechos={ls.filter((i) => i.hecho).length}
            total={ls.length}
            etiqueta={`${ls.filter((i) => i.hecho).length}/${ls.length} ${lista === "valija" ? "en valija" : "pasos"}`}
          />
          {lista === "valija" && dias > 0 && <span className="etiqueta">{dias} {dias === 1 ? "día" : "días"} de itinerario</span>}
        </div>
      )}
      <div className="ticket-pie">
        <span>{lista === "valija" ? "Valija e itinerario" : lista === "pasos" ? "Pasos y materiales" : "Abrir el plan"}</span>
        <span aria-hidden>→</span>
      </div>
    </a>
  )
}

function FilaAgenda({ plan }: { plan: Plan }) {
  const cat = useStore((s) => s.categorias).find((c) => c.id === plan.categoria)
  const d = fecha(plan.cuando)
  return (
    <li>
      <a href={`#/plan/${plan.id}`} className="agenda-item">
        <span className="agenda-fecha num" style={{ background: cat?.color }}>
          {plan.estado === "en_curso" ? (
            <small>en curso</small>
          ) : d ? (
            <>
              <b>{String(d.getDate()).padStart(2, "0")}</b>
              <small>{d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "")}</small>
            </>
          ) : (
            <small>s/d</small>
          )}
        </span>
        <span className="agenda-titulo">{plan.titulo}</span>
        <span className="agenda-cuando etiqueta">{plan.estado === "en_curso" ? "" : cuandoRelativo(plan.cuando)}</span>
      </a>
    </li>
  )
}

/**
 * La máquina «Sorpréndanme»: elegís el filtro, tirás, el rodillo pasa por
 * los planes con más ganas y frena de a poco (1,4 s) hasta el ganador.
 * El ganador sale como boleto, con el compromiso a un toque.
 */
function Maquina({ ranking }: { ranking: Rankeado[] }) {
  const categorias = useStore((s) => s.categorias)
  const [filtro, setFiltro] = useState<FiltroSorteo>("todo")
  const [girando, setGirando] = useState(false)
  const [ganador, setGanador] = useState<Rankeado | null>(null)
  const [visor, setVisor] = useState<Rankeado | null>(null)
  const relojes = useRef<number[]>([])
  const candidatos = useMemo(() => candidatosSorteo(ranking, filtro, categorias), [ranking, filtro, categorias])

  const tirar = () => {
    if (girando || !candidatos.length) return
    const g = sortear(candidatos)
    if (!g) return
    setGanador(null)
    setGirando(true)
    // el rodillo muestra los del top de ganas, y el último cuadro es el ganador
    const rodillo = candidatos.slice(0, Math.max(6, Math.min(candidatos.length, 10)))
    const demoras = demorasRodillo(16, 1400)
    let t = 0
    relojes.current.forEach(clearTimeout)
    relojes.current = demoras.map((dem, i) => {
      t += dem
      return window.setTimeout(() => {
        if (i === demoras.length - 1) {
          setVisor(g)
          setGanador(g)
          setGirando(false)
          vibrar([30, 50, 30])
          sonar("esa")
        } else {
          setVisor(rodillo[(i * 3 + 1) % rodillo.length])
          vibrar(4)
          sonar("tic")
        }
      }, t)
    })
  }

  const catDe = (r: Rankeado | null) => categorias.find((c) => c.id === r?.plan.categoria)

  return (
    <Bloque numero="03" titulo="Sorpréndanme" className="maquina">
      <div className="maquina-filtros" role="radiogroup" aria-label="Qué tipo de plan">
        {(Object.keys(FILTROS_SORTEO) as FiltroSorteo[]).map((f) => (
          <button
            key={f}
            role="radio"
            aria-checked={filtro === f}
            className="chip"
            aria-pressed={filtro === f}
            disabled={girando}
            onClick={() => {
              setFiltro(f)
              setGanador(null)
              setVisor(null)
            }}
          >
            {FILTROS_SORTEO[f].nombre}
          </button>
        ))}
      </div>
      <div className={`visor ${girando ? "girando" : ""}`} aria-live="polite">
        <span className="visor-cat num">{visor ? catDe(visor)?.emoji : "✦"}</span>
        <span className="visor-texto">{visor ? visor.plan.titulo : candidatos.length ? `${candidatos.length} planes en la máquina` : "No hay planes con este filtro"}</span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {ganador && !girando ? (
          <motion.div key="boleto" className="boleto-ganador" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className="boleto-ganador-cabeza">
              <span className="etiqueta">Boleto ganador</span>
              <span className="num">{ganador.promedio === null ? "¿?" : `${Math.round(ganador.promedio)}%`} ganas</span>
            </div>
            <a href={`#/plan/${ganador.plan.id}`} className="boleto-ganador-titulo">
              {ganador.plan.titulo}
            </a>
            <ChipCategoria cat={catDe(ganador)} />
            <div className="boleto-ganador-botones">
              <Boton
                className="boton-grande"
                onClick={async () => {
                  await agendarHoy(ganador.plan)
                  ir(`/plan/${ganador.plan.id}`)
                }}
              >
                ¡Estamos para esa! <small>agendar hoy</small>
              </Boton>
              <Boton variante="secundario" onClick={tirar}>
                1 tiro más
              </Boton>
            </div>
          </motion.div>
        ) : (
          <motion.div key="palanca" exit={{ opacity: 0 }}>
            <Boton className="boton-grande palanca" onClick={tirar} disabled={girando || !candidatos.length}>
              {girando ? "Girando…" : "Tirar"}
            </Boton>
          </motion.div>
        )}
      </AnimatePresence>
    </Bloque>
  )
}

/** El recuerdo más nuevo sin sellar, con lo que le falta. */
function SelloPendiente({ plan }: { plan: Plan }) {
  const votos = useStore((s) => s.votos)
  const usuarios = useStore((s) => s.usuarios)
  const cat = useStore((s) => s.categorias).find((c) => c.id === plan.categoria)
  const s = sellado(plan, votos, usuarios)
  return (
    <a href={`#/plan/${plan.id}`} className="sello-pendiente" style={{ "--cc": cat?.color || "var(--amarillo)" } as React.CSSProperties}>
      <div className="sello-pendiente-cabeza">
        <ChipCategoria cat={cat} />
        <h3>{plan.titulo}</h3>
      </div>
      <Segmentos hechos={s.hechos} total={s.total} etiqueta={`${s.hechos}/${s.total} sellado`} />
      <ul className="checklist">
        {s.pasos.map((p) => {
          const u = usuarios.find((x) => p.id === `puntaje-${x.id}`)
          return (
            <li key={p.id} className={p.ok ? "ok" : ""}>
              <span className="check" aria-hidden style={u ? ({ "--c": colorDe(u, usuarios.indexOf(u)) } as React.CSSProperties) : undefined}>
                {p.ok ? "✓" : ""}
              </span>
              {p.etiqueta}
            </li>
          )
        })}
      </ul>
      <span className="sello-pendiente-pie">
        Completar el recuerdo <span aria-hidden>→</span>
      </span>
    </a>
  )
}
