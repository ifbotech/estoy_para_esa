import { AnimatePresence, motion } from "motion/react"
import { useMemo, useRef, useState } from "react"
import { agendarHoy } from "../acciones"
import { FILTROS_SORTEO, candidatosSorteo, demorasRodillo, sortear, type FiltroSorteo, type Rankeado } from "../calculos"
import { ir } from "../router"
import { useStore } from "../store"
import { vibrar } from "../util/efectos"
import { sonar } from "../util/sonidos"
import { Boton } from "./Controles"
import { Bloque } from "./Deco"
import { ChipCategoria } from "./Tarjetas"

/**
 * La máquina «Sorpréndanme»: elegís el filtro, tirás, el rodillo pasa por
 * los planes con más ganas y frena de a poco (1,4 s) hasta el ganador.
 * El ganador sale como boleto, con el compromiso a un toque.
 */
export function Maquina({ ranking }: { ranking: Rankeado[] }) {
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
    <Bloque titulo="Sorpréndanme" className="maquina">
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
