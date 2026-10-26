import { useMemo, useState } from "react"
import { fecha, MESES, momentum, sellado } from "../calculos"
import { Arte } from "../componentes/Arte"
import { Polaroid } from "../componentes/Polaroid"
import { useStore } from "../store"

/**
 * Recuerdos: cada plan hecho es una Polaroid, agrupadas por mes. Arriba, el
 * ritmo de los dos (lo logrado, nunca lo perdido) y los Wrapped.
 */
export function Recuerdos() {
  const planes = useStore((s) => s.planes)
  const votos = useStore((s) => s.votos)
  const usuarios = useStore((s) => s.usuarios)
  const [soloSinSellar, setSoloSinSellar] = useState(false)
  const m = useMemo(() => momentum(planes), [planes])
  const hechos = useMemo(
    () => planes.filter((p) => p.estado === "hecho" && p.hecho_en).sort((a, b) => b.hecho_en.localeCompare(a.hecho_en)),
    [planes],
  )
  const sinSellar = hechos.filter((p) => !sellado(p, votos, usuarios).completo)
  const visibles = soloSinSellar ? sinSellar : hechos
  const grupos = useMemo(() => {
    const g = new Map<string, typeof visibles>()
    for (const p of visibles) {
      const d = fecha(p.hecho_en)!
      const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`
      g.set(k, [...(g.get(k) ?? []), p])
    }
    return [...g]
  }, [visibles])
  const anios = [...new Set(hechos.map((p) => fecha(p.hecho_en)!.getFullYear()))]
  if (!anios.includes(new Date().getFullYear())) anios.unshift(new Date().getFullYear())

  return (
    <div className="recuerdos">
      <header className="cabeza-pantalla" style={{ "--cc": "var(--rosa)" } as React.CSSProperties}>
        <div>
          <p className="etiqueta">lo que ya hicieron</p>
          <h1 className="titulo-pantalla">Recuerdos</h1>
        </div>
      </header>

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

      <div className="fila-scroll tickets">
        {anios.map((a) => (
          <a key={a} href={`#/wrapped/${a}`} className="ticket-wrapped">
            <span className="etiqueta">wrapped</span>
            <b className="num">{a}</b>
            <span aria-hidden>→</span>
          </a>
        ))}
      </div>

      {hechos.length > 0 && (
        <div className="fila filtros-recuerdos">
          <button className="chip" aria-pressed={!soloSinSellar} onClick={() => setSoloSinSellar(false)}>
            Todos <span className="num">{hechos.length}</span>
          </button>
          <button className="chip" aria-pressed={soloSinSellar} onClick={() => setSoloSinSellar(true)}>
            Sin sellar <span className="num">{sinSellar.length}</span>
          </button>
        </div>
      )}

      {!hechos.length && (
        <div className="vacio">
          <Arte tipo="cafe" tam={10} />
          <p>
            Cuando marquen un plan como <b>Hecho</b>, aparece acá con sus fotos.
          </p>
        </div>
      )}
      {soloSinSellar && !sinSellar.length && hechos.length > 0 && (
        <div className="vacio vacio-chico">
          <p>✦ Todos los recuerdos están sellados.</p>
        </div>
      )}

      <div className="linea-tiempo">
        {grupos.map(([k, ps]) => {
          const [anio, mes] = k.split("-").map(Number)
          return (
            <section key={k} className="mes">
              <h2 className="mes-titulo">
                {MESES[mes]} <span className="num">{anio}</span>
                <small className="num">{ps.length}</small>
              </h2>
              <div className="polaroids">
                {ps.map((p, i) => (
                  <Polaroid key={p.id} plan={p} giro={i % 2 ? 1 : -1} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
