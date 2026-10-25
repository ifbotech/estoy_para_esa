import { motion } from "motion/react"
import { useMemo } from "react"
import { fecha, MESES } from "../calculos"
import { Arte } from "../componentes/Arte"
import { TituloCinetico } from "../componentes/Deco"
import { imagenDe } from "../componentes/Tarjetas"
import { useStore } from "../store"

export function Recuerdos() {
  const planes = useStore((s) => s.planes)
  const categorias = useStore((s) => s.categorias)
  const hechos = useMemo(
    () => planes.filter((p) => p.estado === "hecho" && p.hecho_en).sort((a, b) => b.hecho_en.localeCompare(a.hecho_en)),
    [planes],
  )
  const grupos = useMemo(() => {
    const m = new Map<string, typeof hechos>()
    for (const p of hechos) {
      const d = fecha(p.hecho_en)!
      const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`
      m.set(k, [...(m.get(k) ?? []), p])
    }
    return [...m]
  }, [hechos])
  const anios = [...new Set(hechos.map((p) => fecha(p.hecho_en)!.getFullYear()))]
  if (!anios.includes(new Date().getFullYear())) anios.unshift(new Date().getFullYear())

  return (
    <div className="recuerdos">
      <header className="planes-cabeza">
        <TituloCinetico texto="Recuerdos" />
        <p className="suave">
          {hechos.length} plancitos hechos, {hechos.reduce((a, p) => a + p.fotos.length, 0)} fotos.
        </p>
      </header>

      <div className="fila-scroll">
        {anios.map((a, i) => (
          <motion.a
            key={a}
            href={`#/wrapped/${a}`}
            className="ticket-wrapped"
            initial={{ opacity: 0, rotate: -10, y: 20 }}
            animate={{ opacity: 1, rotate: i % 2 ? 2 : -2, y: 0 }}
            whileTap={{ scale: 0.94 }}
          >
            <span className="etiqueta">wrapped</span>
            <b>{a}</b>
            <span>▶ ver</span>
          </motion.a>
        ))}
      </div>

      {!hechos.length && (
        <div className="vacio">
          <Arte tipo="cafe" tam={13} />
          Cuando marquen un plan como <b>Hecho</b>, aparece acá con sus fotos.
        </div>
      )}

      <div className="linea-tiempo">
        {grupos.map(([k, ps]) => {
          const [anio, mes] = k.split("-").map(Number)
          return (
            <section key={k} className="mes">
              <h2 className="mes-titulo">
                <span className="serif">{MESES[mes]}</span> {anio}
              </h2>
              <div className="polaroids">
                {ps.map((p, i) => {
                  const c = categorias.find((x) => x.id === p.categoria)
                  const img = imagenDe(p)
                  const giro = ((p.id.charCodeAt(0) + i * 7) % 11) - 5
                  return (
                    <motion.a
                      key={p.id}
                      href={`#/plan/${p.id}`}
                      className="polaroid"
                      initial={{ opacity: 0, y: 50, rotate: giro * 2 }}
                      whileInView={{ opacity: 1, y: 0, rotate: giro }}
                      viewport={{ once: true, margin: "-30px" }}
                      whileTap={{ scale: 1.05, rotate: 0, zIndex: 3 }}
                      transition={{ type: "spring", stiffness: 140, damping: 14 }}
                    >
                      <div className={`polaroid-foto p-${c?.personalidad}`}>
                        {img ? <img src={img} alt="" loading="lazy" /> : <Arte tipo={c?.personalidad ?? "salida"} tam={11} />}
                        {p.fotos.length > 1 && <span className="polaroid-mas">+{p.fotos.length - 1}</span>}
                      </div>
                      <span className="polaroid-texto">{p.titulo}</span>
                      <span className="polaroid-fecha">
                        {c?.emoji} {fecha(p.hecho_en)!.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </span>
                    </motion.a>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
