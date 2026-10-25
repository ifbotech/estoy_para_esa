import { AnimatePresence, motion, useScroll, useTransform } from "motion/react"
import { useMemo, useRef, useState } from "react"
import { racha, rankear, sortear, type Rankeado } from "../calculos"
import { Arte, ArteFlotante } from "../componentes/Arte"
import { Boton } from "../componentes/Controles"
import { Contador, Garabato, Marquesina, Sello, TituloCinetico } from "../componentes/Deco"
import { ChipCategoria, imagenDe } from "../componentes/Tarjetas"
import { ir } from "../router"
import { useStore, useYo } from "../store"
import { festejar, vibrar } from "../util/efectos"

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
  const top = pendientes.filter((r) => r.promedio !== null).slice(0, 6)
  const agendados = ranking.filter((r) => r.plan.estado === "agendado" || r.plan.estado === "en_curso")
  const ideas = planes.filter((p) => p.estado === "idea").length
  const hechos = planes.filter((p) => p.estado === "hecho")
  const sinMiVoto = pendientes.filter((r) => !r.votos.some((v) => v.usuario === yo?.id))
  const semanas = racha(planes)
  const ultimo = [...hechos].sort((a, b) => b.hecho_en.localeCompare(a.hecho_en))[0]

  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] })
  const solY = useTransform(scrollYProgress, [0, 1], [0, 160])
  const tituloY = useTransform(scrollYProgress, [0, 1], [0, -60])
  const tituloRot = useTransform(scrollYProgress, [0, 1], [0, -6])

  return (
    <div className="hoy">
      <div className="hoy-barra">
        <span className="marca">
          estoy<em>para</em>esa
        </span>
        <motion.span className="racha" title="Semanas seguidas haciendo algo" whileTap={{ scale: 1.3, rotate: -10 }}>
          <span className="racha-fuego">🔥</span>
          {semanas}
          <small>sem</small>
        </motion.span>
      </div>

      <section className="hero" ref={heroRef}>
        <motion.div className="hero-sol" style={{ y: solY }}>
          <Arte tipo="sol" tam={16} />
        </motion.div>
        <ArteFlotante tipo="cine" tam={10} style={{ left: "-2%", top: "2%" }} demora={0.8} />
        <ArteFlotante tipo="cafe" tam={9} style={{ right: "0%", top: "-2%" }} demora={1} />
        <ArteFlotante tipo="viaje" tam={9} style={{ right: "-4%", top: "50%" }} demora={1.2} />
        <ArteFlotante tipo="taller" tam={8} style={{ left: "4%", bottom: "-6%" }} demora={1.4} />
        <ArteFlotante tipo="estrella" tam={8} style={{ left: "60%", top: "8%" }} demora={1.6} />

        <motion.div className="hero-texto" style={{ y: tituloY, rotate: tituloRot }}>
          <p className="etiqueta">
            {saludo()}, {yo?.name ?? "che"}
          </p>
          <TituloCinetico texto="¿Para cuál estamos?" className="hero-titulo" demora={0.2} />
          <Garabato />
        </motion.div>

        <div className="hero-sello">
          <Sello texto="plancitos esperando ✦ ">
            <Contador valor={pendientes.length} />
            <small>pendientes</small>
          </Sello>
        </div>
      </section>

      <div className="hoy-cintas">
        <Marquesina items={categorias.map((c) => `${c.emoji} ${c.nombre.toUpperCase()}`)} />
        <Marquesina items={["ESTOY PARA ESA", `${ideas} IDEAS`, `${hechos.length} HECHOS`, "¿Y SI VAMOS?", "DE UNA"]} invertida giro={2.5} />
      </div>

      {sinMiVoto.length > 0 && (
        <motion.a
          href={`#/plan/${sinMiVoto[0].plan.id}`}
          className="pendiente-voto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileTap={{ scale: 0.96 }}
        >
          <span className="pendiente-voto-num">{sinMiVoto.length}</span>
          <span>
            {sinMiVoto.length === 1 ? "plan espera" : "planes esperan"} tus ganas.
            <b> Votá →</b>
          </span>
        </motion.a>
      )}

      <section className="seccion">
        <div className="seccion-cabeza">
          <h2>
            Las que más <span className="serif">ganas</span> dan
          </h2>
          <a href="#/planes">ver todo</a>
        </div>
        {top.length ? (
          <div className="fila-scroll abanico">
            {top.map((r, i) => (
              <CartaTop key={r.plan.id} r={r} i={i} />
            ))}
          </div>
        ) : (
          <div className="vacio">
            <Arte tipo="salida" tam={12} />
            Todavía no hay planes votados. ¡Cargá el primero!
            <div style={{ marginTop: 14 }}>
              <Boton onClick={onNuevo}>+ Nuevo plan</Boton>
            </div>
          </div>
        )}
      </section>

      <Tragamonedas ranking={ranking} />

      {agendados.length > 0 && (
        <section className="seccion">
          <div className="seccion-cabeza">
            <h2>Agendado y en curso</h2>
          </div>
          <div className="agenda">
            {agendados.map((r, i) => (
              <motion.a
                key={r.plan.id}
                href={`#/plan/${r.plan.id}`}
                className="agenda-item"
                initial={{ x: -20, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="agenda-fecha">
                  {r.plan.estado === "en_curso" ? (
                    <b>🚧</b>
                  ) : r.plan.cuando ? (
                    <>
                      <b>{new Date(r.plan.cuando.replace(" ", "T")).getDate()}</b>
                      <small>{new Date(r.plan.cuando.replace(" ", "T")).toLocaleDateString("es-AR", { month: "short" })}</small>
                    </>
                  ) : (
                    <b>📅</b>
                  )}
                </span>
                <span className="agenda-titulo">{r.plan.titulo}</span>
                <span className="agenda-flecha">→</span>
              </motion.a>
            ))}
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
                className={`mosaico p-${c.personalidad}`}
                initial={{ opacity: 0, y: 30, rotate: i % 2 ? 3 : -3 }}
                whileInView={{ opacity: 1, y: 0, rotate: i % 2 ? 1 : -1 }}
                viewport={{ once: true, margin: "-40px" }}
                whileTap={{ scale: 0.95, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: (i % 2) * 0.08 }}
              >
                <Arte tipo={c.personalidad} tam={11} />
                <span className="mosaico-num">{n} pendientes</span>
                <h3>
                  {c.emoji} {c.nombre}
                </h3>
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
            className="polaroid polaroid-grande"
            initial={{ rotate: -8, y: 40, opacity: 0 }}
            whileInView={{ rotate: -2.5, y: 0, opacity: 1 }}
            viewport={{ once: true }}
            whileTap={{ rotate: 1, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 120, damping: 12 }}
          >
            <div className="polaroid-foto">
              {imagenDe(ultimo) ? <img src={imagenDe(ultimo)} alt="" /> : <Arte tipo={categorias.find((c) => c.id === ultimo.categoria)?.personalidad ?? "salida"} tam={18} />}
            </div>
            <span className="polaroid-texto">{ultimo.titulo}</span>
          </motion.a>
        </section>
      )}

      <motion.a
        href={`#/wrapped/${new Date().getFullYear()}`}
        className="cta-wrapped"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        whileTap={{ scale: 0.96 }}
      >
        <span className="etiqueta">tu año en plancitos</span>
        <b>Wrapped {new Date().getFullYear()}</b>
        <span className="cta-wrapped-flecha">▶</span>
      </motion.a>
    </div>
  )
}

function CartaTop({ r, i }: { r: Rankeado; i: number }) {
  const cat = useStore((s) => s.categorias).find((c) => c.id === r.plan.categoria)
  const img = imagenDe(r.plan)
  return (
    <motion.a
      href={`#/plan/${r.plan.id}`}
      className={`carta p-${cat?.personalidad ?? "salida"}`}
      initial={{ opacity: 0, y: 60, rotate: 12 }}
      animate={{ opacity: 1, y: 0, rotate: i % 2 ? 2.5 : -2.5 }}
      whileTap={{ scale: 0.95, rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.3 + i * 0.08 }}
    >
      <div className="carta-img">{img ? <img src={img} alt="" /> : <Arte tipo={cat?.personalidad ?? "salida"} tam={15} />}</div>
      <span className="carta-puesto">#{i + 1}</span>
      <div className="carta-pie">
        <ChipCategoria cat={cat} />
        <h3>{r.plan.titulo}</h3>
        <div className="carta-ganas">
          <span className="carta-num">{Math.round(r.promedio ?? 0)}</span>
          <span className="carta-pct">% de ganas</span>
        </div>
      </div>
    </motion.a>
  )
}

/** Sorpréndanme: una tragamonedas de plancitos que frena en uno al azar. */
function Tragamonedas({ ranking }: { ranking: Rankeado[] }) {
  const pendientes = ranking.filter((r) => r.plan.estado !== "hecho")
  const [girando, setGirando] = useState(false)
  const [elegido, setElegido] = useState<Rankeado | null>(null)
  const [visible, setVisible] = useState<string>("¿?")

  const girar = (e: React.MouseEvent) => {
    if (girando || !pendientes.length) return
    const ganador = sortear(ranking)
    if (!ganador) return
    setGirando(true)
    setElegido(null)
    vibrar(10)
    const origen = [e.clientX / innerWidth, e.clientY / innerHeight] as const
    let paso = 0
    const total = 22
    const tick = () => {
      paso++
      if (paso >= total) {
        setVisible(ganador.plan.titulo)
        setElegido(ganador)
        setGirando(false)
        vibrar([30, 50, 30])
        festejar(origen[0], origen[1], 1.2)
        return
      }
      setVisible(pendientes[Math.floor(Math.random() * pendientes.length)].plan.titulo)
      vibrar(4)
      setTimeout(tick, 40 + Math.pow(paso / total, 3) * 380)
    }
    tick()
  }

  return (
    <section className="seccion tragamonedas">
      <div className="traga-marco">
        <div className="traga-luces" aria-hidden />
        <p className="etiqueta">¿No se deciden?</p>
        <div className="traga-ventana" aria-live="polite">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={visible + (girando ? Math.random() : "")}
              className="traga-texto"
              initial={{ y: girando ? -50 : -20, opacity: 0, filter: girando ? "blur(3px)" : "blur(0px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ duration: girando ? 0.06 : 0.3 }}
            >
              {visible}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="fila" style={{ justifyContent: "center", gap: 10 }}>
          <Boton onClick={girar} disabled={girando || !pendientes.length} variante="secundario">
            {girando ? "Girando…" : elegido ? "Otra vez" : "¡Sorpréndanme!"}
          </Boton>
          {elegido && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
              <Boton onClick={() => ir(`/plan/${elegido.plan.id}`)}>Vamos →</Boton>
            </motion.span>
          )}
        </div>
      </div>
    </section>
  )
}
