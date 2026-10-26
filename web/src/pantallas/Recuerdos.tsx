import { motion } from "motion/react"
import { useMemo } from "react"
import { fecha, MESES } from "../calculos"
import { Arte } from "../componentes/Arte"
import { TituloCinetico } from "../componentes/Deco"
import { imagenDe } from "../componentes/Tarjetas"
import { ir } from "../router"
import { useStore } from "../store"

/** Recuerdos: cada plan hecho es una ventana flotante con su foto, como en KARO. */
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
  const fotos = hechos.reduce((a, p) => a + p.fotos.length, 0)

  return (
    <div className="recuerdos">
      <section className="capitulo" style={{ "--cap": "var(--chicle)" } as React.CSSProperties}>
        <TituloCinetico lineas={["Lo que", "ya hicimos"]} asoma="cafe" />
        <p className="etiqueta recuerdos-cuenta">
          [ {hechos.length} plancitos ] ( {fotos} fotos )
        </p>
      </section>

      <div className="fila-scroll tickets">
        {anios.map((a, i) => (
          <motion.a
            key={a}
            href={`#/wrapped/${a}`}
            className="ticket-wrapped"
            initial={{ opacity: 0, rotate: -8, y: 20 }}
            animate={{ opacity: 1, rotate: i % 2 ? 2 : -2, y: 0 }}
            whileTap={{ x: 3, y: 3 }}
          >
            <span className="etiqueta">wrapped</span>
            <b>{a}</b>
            <span>▶ ver</span>
          </motion.a>
        ))}
      </div>

      {!hechos.length && (
        <div className="vacio">
          <Arte tipo="cafe" tam={14} />
          Cuando marquen un plan como <b>Hecho</b>, aparece acá con sus fotos.
        </div>
      )}

      <div className="linea-tiempo">
        {grupos.map(([k, ps]) => {
          const [anio, mes] = k.split("-").map(Number)
          return (
            <section key={k} className="mes">
              <h2 className="mes-titulo">
                {MESES[mes]} <span>{anio}</span>
              </h2>
              <div className="ventanas">
                {ps.map((p, i) => {
                  const c = categorias.find((x) => x.id === p.categoria)
                  const img = imagenDe(p, "600x0")
                  const giro = ((p.id.charCodeAt(0) + i * 7) % 9) - 4
                  return (
                    <motion.div
                      key={p.id}
                      className="ventana"
                      style={{ rotate: giro }}
                      drag
                      dragSnapToOrigin
                      dragElastic={0.5}
                      whileDrag={{ scale: 1.06, rotate: 0, zIndex: 5 }}
                      initial={{ opacity: 0, y: 40 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-20px" }}
                      transition={{ type: "spring", stiffness: 150, damping: 16 }}
                      onTap={() => ir(`/plan/${p.id}`)}
                    >
                      <header>
                        <i />
                        <i />
                        <i />
                        <span>{p.titulo.toLowerCase().replace(/[^a-z0-9ñáéíóú]+/gi, "-").slice(0, 18)}.jpg</span>
                      </header>
                      <div className="ventana-foto" style={{ background: c?.color }}>
                        {img ? <img src={img} alt="" loading="lazy" draggable={false} /> : <Arte tipo={c?.personalidad ?? "salida"} tam={12} />}
                        {p.fotos.length > 1 && <span className="ventana-mas">+{p.fotos.length - 1}</span>}
                      </div>
                      <p>{p.titulo}</p>
                      <span className="etiqueta ventana-fecha">
                        {c?.emoji} {fecha(p.hecho_en)!.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </span>
                    </motion.div>
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
