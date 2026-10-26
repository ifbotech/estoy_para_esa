import { AnimatePresence, motion } from "motion/react"
import { useMemo, useState } from "react"
import { abrirVistaRapida, estoyParaEsa } from "../acciones"
import { rankear, sortear, type Rankeado } from "../calculos"
import { Arte } from "../componentes/Arte"
import { Boton } from "../componentes/Controles"
import { Contador, Estallido, Marquesina, Resaltado, Sello, TituloCinetico } from "../componentes/Deco"
import { ChipCategoria, imagenDe, useGestosPlan } from "../componentes/Tarjetas"
import { ir } from "../router"
import { useStore, useYo } from "../store"
import { festejar, vibrar } from "../util/efectos"
import { sonar } from "../util/sonidos"

function saludo() {
  const h = new Date().getHours()
  if (h < 6) return "Buenas noches"
  if (h < 13) return "Buen día"
  if (h < 20) return "Buenas tardes"
  return "Buenas noches"
}

export function Hoy({ onNuevo }: { onNuevo: () => void }) {
  const planes = useStore((s) => s.planes)
  const votos = useStore((s) => s.votos)
  const categorias = useStore((s) => s.categorias)
  const yo = useYo()
  const ranking = useMemo(() => rankear(planes, votos), [planes, votos])
  const pendientes = ranking.filter((r) => r.plan.estado !== "hecho")
  const top = pendientes.filter((r) => r.promedio !== null).slice(0, 5)
  const agenda = ranking.filter((r) => r.plan.estado === "agendado" || r.plan.estado === "en_curso")
  const hechos = planes.filter((p) => p.estado === "hecho")
  const sinMiVoto = pendientes.filter((r) => !r.votos.some((v) => v.usuario === yo?.id))
  const ultimo = [...hechos].sort((a, b) => b.hecho_en.localeCompare(a.hecho_en))[0]
  const anio = new Date().getFullYear()

  return (
    <div className="hoy">
      <section className="capitulo portada">
        <p className="etiqueta">
          {saludo()}, {yo?.name ?? "che"}
        </p>
        <TituloCinetico lineas={["¿Para cuál", "estamos?"]} asoma="entrada" className="portada-titulo" demora={0.1} />
        <div className="portada-pie">
          <p>
            {pendientes.length
              ? `Hay ${pendientes.length} ${pendientes.length === 1 ? "plan esperando" : "planes esperando"}. ${hechos.length} ya son recuerdo.`
              : "No hay planes pendientes. ¡A inventar uno!"}
          </p>
          <Sello texto="plancitos pendientes ✦ " tam={96} color="var(--limon)">
            <Contador valor={pendientes.length} />
          </Sello>
        </div>
      </section>

      <div className="hoy-cinta">
        <Marquesina items={categorias.map((c) => `${c.emoji} ${c.nombre.toUpperCase()}`)} color="var(--limon)" />
      </div>

      {sinMiVoto.length > 0 && (
        <motion.a
          href={`#/plan/${sinMiVoto[0].plan.id}`}
          className="aviso-voto"
          initial={{ rotate: -6, scale: 0.8, opacity: 0 }}
          animate={{ rotate: -1.5, scale: 1, opacity: 1 }}
          whileTap={{ x: 3, y: 3 }}
        >
          <b>{sinMiVoto.length}</b>
          <span>
            {sinMiVoto.length === 1 ? "plan espera tus ganas" : "planes esperan tus ganas"} <u>votá →</u>
          </span>
        </motion.a>
      )}

      <section className="seccion">
        <div className="seccion-cabeza">
          <h2>
            Las que más <Resaltado>ganas</Resaltado> dan
          </h2>
          <a href="#/planes">ver todo</a>
        </div>
        {top.length ? (
          <PilaDeCartas cartas={top} />
        ) : (
          <div className="vacio">
            <Arte tipo="salida" tam={14} />
            Todavía no hay planes votados.
            <Boton onClick={onNuevo}>+ Nuevo plan</Boton>
          </div>
        )}
      </section>

      <Tragamonedas ranking={ranking} />

      {agenda.length > 0 && (
        <section className="seccion">
          <div className="seccion-cabeza">
            <h2>Agendado y en curso</h2>
          </div>
          <div className="agenda">
            {agenda.map((r, i) => {
              const d = r.plan.cuando ? new Date(r.plan.cuando.replace(" ", "T")) : null
              const cat = categorias.find((c) => c.id === r.plan.categoria)
              return (
                <motion.a
                  key={r.plan.id}
                  href={`#/plan/${r.plan.id}`}
                  className="agenda-item"
                  initial={{ x: -16, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  whileTap={{ x: 3, y: 3 }}
                >
                  <span className="agenda-fecha" style={{ background: cat?.color }}>
                    {r.plan.estado === "en_curso" ? (
                      <small>en curso</small>
                    ) : d ? (
                      <>
                        <b>{d.getDate()}</b>
                        <small>{d.toLocaleDateString("es-AR", { month: "short" })}</small>
                      </>
                    ) : (
                      <small>sin día</small>
                    )}
                  </span>
                  <span className="agenda-titulo">{r.plan.titulo}</span>
                  <span className="agenda-flecha">→</span>
                </motion.a>
              )
            })}
          </div>
        </section>
      )}

      <section className="seccion">
        <div className="seccion-cabeza">
          <h2>Categorías</h2>
          <a href="#/mas/categorias">editar</a>
        </div>
        <div className="grid2">
          {categorias.map((c, i) => {
            const n = planes.filter((p) => p.categoria === c.id && p.estado !== "hecho").length
            return (
              <motion.a
                key={c.id}
                href={`#/planes?cat=${c.id}`}
                className="marco mosaico"
                style={{ "--cap": c.color } as React.CSSProperties}
                initial={{ opacity: 0, y: 24, rotate: i % 2 ? 2 : -2 }}
                whileInView={{ opacity: 1, y: 0, rotate: i % 2 ? 1 : -1 }}
                viewport={{ once: true, margin: "-30px" }}
                whileTap={{ x: 4, y: 4, boxShadow: "0 0 0 var(--tinta)" }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                <div className="marco-dentro mosaico-dentro">
                  <Arte tipo={c.personalidad} tam={11} mira={i % 2 ? -1 : 1} />
                  <span className="mosaico-nombre">{c.nombre}</span>
                  <span className="etiqueta">( {n} pendientes )</span>
                </div>
              </motion.a>
            )
          })}
        </div>
      </section>

      {ultimo && (
        <section className="seccion">
          <div className="seccion-cabeza">
            <h2>El último recuerdo</h2>
            <a href="#/recuerdos">todos</a>
          </div>
          <motion.a
            href={`#/plan/${ultimo.id}`}
            className="ventana ventana-grande"
            initial={{ rotate: -5, y: 30, opacity: 0 }}
            whileInView={{ rotate: -1.5, y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 140, damping: 14 }}
          >
            <header>
              <i />
              <i />
              <i />
              <span>{ultimo.titulo.toLowerCase().replace(/\s+/g, "-").slice(0, 28)}.jpg</span>
            </header>
            <div className="ventana-foto" style={{ background: categorias.find((c) => c.id === ultimo.categoria)?.color }}>
              {imagenDe(ultimo) ? <img src={imagenDe(ultimo)} alt="" /> : <Arte tipo={categorias.find((c) => c.id === ultimo.categoria)?.personalidad ?? "salida"} tam={18} />}
            </div>
            <p>{ultimo.titulo}</p>
          </motion.a>
        </section>
      )}

      <motion.a
        href={`#/wrapped/${anio}`}
        className="cta-wrapped"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileTap={{ x: 4, y: 4, boxShadow: "0 0 0 var(--negro)" }}
      >
        <span className="etiqueta">[ su año en plancitos ]</span>
        <b>Wrapped {anio}</b>
        <span className="cta-wrapped-flecha">▶</span>
      </motion.a>
    </div>
  )
}

/** El top de ganas como una pila de cartas inclinadas: tocá para pasar, doble toque = ¡estoy para esa! */
function PilaDeCartas({ cartas }: { cartas: Rankeado[] }) {
  const [orden, setOrden] = useState(() => cartas.map((c) => c.plan.id))
  const ids = cartas.map((c) => c.plan.id)
  // si cambian los planes, se reacomoda sin perder el orden que eligieron
  const vigente = [...orden.filter((id) => ids.includes(id)), ...ids.filter((id) => !orden.includes(id))]
  const arriba = vigente[0]
  const pasar = () => {
    sonar("swish")
    setOrden([...vigente.slice(1), vigente[0]])
  }
  return (
    <div className="pila">
      <div className="pila-cartas">
        <AnimatePresence initial={false}>
          {[...vigente].reverse().map((id) => {
            const r = cartas.find((c) => c.plan.id === id)!
            const pos = vigente.indexOf(id)
            return <Carta key={id} r={r} pos={pos} onPasar={pasar} />
          })}
        </AnimatePresence>
      </div>
      <div className="pila-pie">
        <span className="etiqueta">tocá para pasar · doble toque: ¡estoy para esa!</span>
        <Boton className="boton-chico" onClick={() => ir(`/plan/${arriba}`)}>
          Abrir →
        </Boton>
      </div>
    </div>
  )
}

function Carta({ r, pos, onPasar }: { r: Rankeado; pos: number; onPasar: () => void }) {
  const cat = useStore((s) => s.categorias).find((c) => c.id === r.plan.categoria)
  const yo = useYo()
  const gestos = useGestosPlan(r.plan.id)
  const img = imagenDe(r.plan, "600x0")
  const mio = r.votos.find((v) => v.usuario === yo?.id)
  const giros = [-2, 6, -7, 9, -4]
  const arriba = pos === 0
  return (
    <motion.div
      className={`carta ${arriba ? "arriba" : ""}`}
      style={{ "--cc": cat?.color, zIndex: 10 - pos } as never}
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: pos * 10, x: pos * (pos % 2 ? 14 : -14), rotate: giros[pos % giros.length], opacity: pos > 3 ? 0 : 1, scale: 1 - pos * 0.03 }}
      exit={{ x: 300, rotate: 30, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      onPointerDown={arriba ? gestos.onPointerDown : undefined}
      onPointerMove={arriba ? gestos.onPointerMove : undefined}
      onPointerUp={arriba ? gestos.onPointerUp : undefined}
      onPointerCancel={arriba ? gestos.onPointerCancel : undefined}
      onContextMenu={gestos.onContextMenu}
      onClick={(e) => arriba && gestos.tocar(e, onPasar)}
      aria-hidden={!arriba}
    >
      <div className="carta-arte">{img ? <img src={img} alt="" draggable={false} /> : <Arte tipo={cat?.personalidad ?? "salida"} tam={17} />}</div>
      <div className="carta-pie">
        <ChipCategoria cat={cat} />
        <h3>{r.plan.titulo}</h3>
        <div className="carta-ganas">
          <b>{Math.round(r.promedio ?? 0)}</b>
          <span className="etiqueta">% de ganas</span>
        </div>
      </div>
      <AnimatePresence>
        {mio && mio.ganas >= 92 && (
          <motion.span className="carta-estallido" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: -10 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 14 }}>
            <Estallido>¡ESTOY PARA ESA!</Estallido>
          </motion.span>
        )}
      </AnimatePresence>
      {arriba && (
        <button
          className="carta-mas"
          aria-label="Vista rápida"
          onClick={(e) => {
            e.stopPropagation()
            abrirVistaRapida(r.plan.id)
          }}
        >
          ···
        </button>
      )}
    </motion.div>
  )
}

/** Sorpréndanme: una tragamonedas de plancitos que frena en uno al azar. */
function Tragamonedas({ ranking }: { ranking: Rankeado[] }) {
  const pendientes = ranking.filter((r) => r.plan.estado !== "hecho")
  const [girando, setGirando] = useState(false)
  const [elegido, setElegido] = useState<Rankeado | null>(null)
  const [visible, setVisible] = useState("¿?")
  const [vuelta, setVuelta] = useState(0)

  const girar = (e: React.MouseEvent) => {
    if (girando || !pendientes.length) return
    const ganador = sortear(ranking)
    if (!ganador) return
    setGirando(true)
    setElegido(null)
    const origen = [e.clientX / innerWidth, e.clientY / innerHeight] as const
    let paso = 0
    const total = 20
    const tick = () => {
      paso++
      setVuelta((v) => v + 1)
      if (paso >= total) {
        setVisible(ganador.plan.titulo)
        setElegido(ganador)
        setGirando(false)
        vibrar([30, 50, 30])
        sonar("esa")
        festejar(origen[0], origen[1], 1.1)
        return
      }
      setVisible(pendientes[Math.floor(Math.random() * pendientes.length)].plan.titulo)
      vibrar(4)
      sonar("tic")
      setTimeout(tick, 45 + Math.pow(paso / total, 3) * 360)
    }
    tick()
  }

  return (
    <section className="capitulo traga">
      <p className="etiqueta">¿No se deciden?</p>
      <h2 className="titulo traga-titulo">Sorpréndanme</h2>
      <div className="traga-ventana" aria-live="polite">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={vuelta}
            className="traga-texto"
            initial={{ y: girando ? -40 : -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: girando ? 0.05 : 0.25 }}
          >
            {visible}
          </motion.span>
        </AnimatePresence>
      </div>
      <div className="fila traga-botones">
        <Boton onClick={girar} disabled={girando || !pendientes.length}>
          {girando ? "Girando…" : elegido ? "Otra vez" : "¡Tirar!"}
        </Boton>
        {elegido && (
          <>
            <Boton variante="secundario" onClick={() => ir(`/plan/${elegido.plan.id}`)}>
              Vamos →
            </Boton>
            <Boton variante="secundario" aria-label="Estoy para esa" onClick={(e) => estoyParaEsa(elegido.plan.id, e)}>
              🙌
            </Boton>
          </>
        )}
      </div>
    </section>
  )
}
