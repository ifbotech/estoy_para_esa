import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { MESES, momentum, resumenAnual, type Resumen } from "../calculos"
import { Arte } from "../componentes/Arte"
import { Boton } from "../componentes/Controles"
import { Contador } from "../componentes/Deco"
import { colorDe } from "../componentes/Tarjetas"
import { ir } from "../router"
import { useStore } from "../store"
import type { Plan, Usuario } from "../tipos"
import { festejoGrande } from "../util/efectos"

const DURACION = 6500

interface Diapo {
  id: string
  fondo: string
  contenido: ReactNode
}

/** El Wrapped: el año en plancitos, en historias que pasan solas. */
export function Wrapped({ anio }: { anio: number }) {
  const planes = useStore((s) => s.planes)
  const votos = useStore((s) => s.votos)
  const categorias = useStore((s) => s.categorias)
  const items = useStore((s) => s.items)
  const usuarios = useStore((s) => s.usuarios)
  const r = useMemo(() => resumenAnual(anio, planes, votos, categorias, items), [anio, planes, votos, categorias, items])
  const diapos = useMemo(() => armarDiapos(r, usuarios, planes), [r, usuarios, planes])
  const [i, setI] = useState(0)
  const [pausa, setPausa] = useState(false)
  const inicio = useRef(Date.now())
  const transcurrido = useRef(0)

  useEffect(() => {
    setI(0)
  }, [anio])

  useEffect(() => {
    if (pausa) {
      transcurrido.current += Date.now() - inicio.current
      return
    }
    inicio.current = Date.now()
    const t = setTimeout(() => {
      transcurrido.current = 0
      setI((x) => Math.min(x + 1, diapos.length - 1))
    }, Math.max(0, DURACION - transcurrido.current))
    return () => clearTimeout(t)
  }, [i, pausa, diapos.length])

  useEffect(() => {
    transcurrido.current = 0
    if (diapos[i]?.id === "fin") festejoGrande()
  }, [i, diapos])

  const ir_ = (d: number) => {
    transcurrido.current = 0
    setI((x) => Math.max(0, Math.min(diapos.length - 1, x + d)))
  }
  const diapo = diapos[i]

  return (
    <div className={`wrapped ${diapo.fondo}`}>
      <div className="w-barras">
        {diapos.map((d, j) => (
          <span key={d.id} className="w-barra">
            {j < i && <span className="w-barra-llena" style={{ width: "100%" }} />}
            {j === i && <span key={`${i}-${anio}`} className={`w-barra-llena animada ${pausa ? "pausada" : ""}`} style={{ animationDuration: `${DURACION}ms` }} />}
          </span>
        ))}
      </div>
      <button className="w-cerrar" onClick={() => ir("/recuerdos")} aria-label="Cerrar">
        ×
      </button>
      <div
        className="w-toque"
        onPointerDown={() => setPausa(true)}
        onPointerUp={(e) => {
          setPausa(false)
          const izquierda = e.clientX < innerWidth * 0.3
          ir_(izquierda ? -1 : 1)
        }}
        onPointerCancel={() => setPausa(false)}
      />
      <AnimatePresence mode="wait">
        <motion.div
          key={diapo.id + anio}
          className="w-diapo"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
        >
          {diapo.contenido}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const aparece = (d = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0.25, 1, 0.5, 1] as const, delay: d * 0.6 },
})

function Gigante({ children, d = 0.2, chico = false }: { children: ReactNode; d?: number; chico?: boolean }) {
  return (
    <motion.div className={`w-gigante num ${chico ? "chico" : ""}`} {...aparece(d)}>
      {children}
    </motion.div>
  )
}

function nombreDe(usuarios: Usuario[], id: string) {
  return usuarios.find((u) => u.id === id)?.name ?? "Alguien"
}

function armarDiapos(r: Resumen, usuarios: Usuario[], planes: Plan[]): Diapo[] {
  const d: Diapo[] = []
  const anio = r.anio

  d.push({
    id: "intro",
    fondo: "w-f1",
    contenido: (
      <div className="w-centro">
        <motion.p className="w-chico" {...aparece(0.1)}>
          {usuarios.map((u) => u.name).join(" & ")} presentan
        </motion.p>
        <motion.div className="w-anio num" {...aparece(0.3)}>
          {anio}
        </motion.div>
        <motion.h1 className="w-titulo" {...aparece(0.8)}>
          Su año en plancitos
        </motion.h1>
        <motion.p className="w-chico" {...aparece(1.4)}>
          tocá para seguir →
        </motion.p>
      </div>
    ),
  })

  if (!r.total) {
    d.push({
      id: "vacio",
      fondo: "w-f3",
      contenido: (
        <div className="w-centro">
          <Arte tipo="salida" tam={20} />
          <motion.h1 className="w-titulo" {...aparece(0.3)}>
            Todavía no hay nada hecho en {anio}.
          </motion.h1>
          <motion.p className="w-texto" {...aparece(0.6)}>
            Marquen planes como <b>Hecho</b> y este Wrapped se llena solo.
          </motion.p>
        </div>
      ),
    })
  } else {
    const porSemana = r.total / 52
    d.push({
      id: "total",
      fondo: "w-f2",
      contenido: (
        <div className="w-centro">
          <motion.p className="w-chico" {...aparece(0.1)}>
            En {anio} hicieron
          </motion.p>
          <Gigante>
            <Contador valor={r.total} duracion={1.8} />
          </Gigante>
          <motion.h1 className="w-titulo" {...aparece(1)}>
            plancitos
          </motion.h1>
          <motion.p className="w-texto" {...aparece(1.6)}>
            {porSemana >= 1 ? "¡Más de uno por semana! Imparables." : porSemana >= 0.5 ? "Casi uno cada dos semanas. Nada mal." : r.total >= 12 ? "Uno por mes, como mínimo." : "Pocos pero buenos."}
          </motion.p>
        </div>
      ),
    })

    const top = r.porCategoria[0]
    d.push({
      id: "categorias",
      fondo: "w-f3",
      contenido: (
        <div className="w-columna">
          <motion.p className="w-chico" {...aparece(0.1)}>
            Lo suyo es
          </motion.p>
          <motion.h1 className="w-titulo grande" {...aparece(0.3)}>
            {top.categoria.emoji} {top.categoria.nombre}
          </motion.h1>
          <div className="w-barras-cat">
            {r.porCategoria.map((c, j) => (
              <div key={c.categoria.id} className="w-cat">
                <span className="w-cat-nombre">
                  {c.categoria.emoji} {c.categoria.nombre}
                </span>
                <span className="w-cat-pista">
                  <motion.span
                    className="w-cat-relleno"
                    style={{ background: c.categoria.color || "var(--amarillo)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(6, c.pct)}%` }}
                    transition={{ type: "spring", stiffness: 60, damping: 14, delay: 0.6 + j * 0.15 }}
                  />
                </span>
                <span className="w-cat-num">{Math.round(c.pct)}%</span>
              </div>
            ))}
          </div>
        </div>
      ),
    })

    const max = Math.max(...r.porMes)
    d.push({
      id: "meses",
      fondo: "w-f4",
      contenido: (
        <div className="w-columna">
          <motion.h1 className="w-titulo" {...aparece(0.2)}>
            <span style={{ textTransform: "capitalize" }}>{MESES[r.mesTop]}</span> fue el mes más intenso
          </motion.h1>
          <motion.p className="w-texto" {...aparece(0.4)}>
            {r.porMes[r.mesTop]} plancitos en un solo mes.
          </motion.p>
          <div className="w-meses">
            {r.porMes.map((n, j) => (
              <div key={j} className="w-mes">
                <motion.span
                  className={`w-mes-barra ${j === r.mesTop ? "top" : ""}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${max ? (n / max) * 100 : 0}%` }}
                  transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.5 + j * 0.06 }}
                />
                <span className="w-mes-letra">{MESES[j][0].toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    })

    if (r.pelis.cantidad) {
      d.push({
        id: "pelis",
        fondo: "w-cine",
        contenido: (
          <div className="w-centro">
            <div className="w-posters">
              {r.pelis.posters.map((p, j) => (
                <motion.img key={p + j} src={p} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + j * 0.06 }} />
              ))}
            </div>
            <motion.p className="w-chico" {...aparece(0.3)}>
              Vieron
            </motion.p>
            <Gigante d={0.5}>
              <Contador valor={r.pelis.cantidad} />
            </Gigante>
            <motion.h1 className="w-titulo" {...aparece(0.9)}>
              {r.pelis.cantidad === 1 ? "peli" : "pelis"} juntos
            </motion.h1>
            {r.pelis.promedio !== null && (
              <motion.p className="w-texto" {...aparece(1.3)}>
                Promedio ★ {r.pelis.promedio.toFixed(1).replace(".", ",")}
                {r.pelis.mejor && (
                  <>
                    <br />
                    La mejor: <b>{r.pelis.mejor.titulo}</b>
                  </>
                )}
              </motion.p>
            )}
            <motion.p className="w-chico" {...aparece(1.7)}>
              {r.pelis.cantidad * 2} horas de pochoclo, más o menos.
            </motion.p>
          </div>
        ),
      })
    }

    const c = r.curaduria
    if (c.porPersona.length >= 2 && (c.masDuro || c.mayorAcuerdo || c.vsLetterboxd)) {
      d.push({
        id: "curaduria",
        fondo: "w-f4",
        contenido: (
          <div className="w-columna">
            <motion.p className="w-chico" {...aparece(0.1)}>
              Curaduría de pareja
            </motion.p>
            {c.coincidencia !== null && (
              <>
                <Gigante d={0.3} chico>
                  <Contador valor={c.coincidencia} />%
                </Gigante>
                <motion.h1 className="w-titulo" {...aparece(0.6)}>
                  de coincidencia crítica
                </motion.h1>
              </>
            )}
            <div className="w-tabla">
              {c.porPersona.map((p, j) => (
                <motion.div key={p.usuario} className="w-tabla-fila" {...aparece(0.9 + j * 0.15)}>
                  <span>{nombreDe(usuarios, p.usuario)}</span>
                  <b className="num">★ {p.promedio.toFixed(1).replace(".", ",")}</b>
                </motion.div>
              ))}
              {c.vsLetterboxd && (
                <motion.div className="w-tabla-fila" {...aparece(1.3)}>
                  <span>Letterboxd</span>
                  <b className="num">★ {c.vsLetterboxd.letterboxd.toFixed(1).replace(".", ",")}</b>
                </motion.div>
              )}
            </div>
            <motion.p className="w-texto" {...aparece(1.6)}>
              {c.masDuro ? (
                <>
                  <b>{nombreDe(usuarios, c.masDuro.usuario)}</b> es más duro puntuando.{" "}
                </>
              ) : (
                "Puntúan parejo. "
              )}
              {c.mayorAcuerdo && (
                <>
                  Donde más coincidieron: <b>{c.mayorAcuerdo.plan.titulo}</b>.
                </>
              )}
            </motion.p>
          </div>
        ),
      })
    }

    if (r.viajes.cantidad) {
      d.push({
        id: "viajes",
        fondo: "w-viaje",
        contenido: (
          <div className="w-centro">
            <Arte tipo="viaje" tam={18} />
            <motion.h1 className="w-titulo" {...aparece(0.3)}>
              {r.viajes.cantidad} {r.viajes.cantidad === 1 ? "viaje" : "viajes"}
            </motion.h1>
            <Gigante d={0.6} chico>
              <Contador valor={Math.round(r.viajes.pctExterior)} />%
            </Gigante>
            <motion.p className="w-texto" {...aparece(1)}>
              fueron al exterior{r.viajes.dias ? ` · ${r.viajes.dias} días fuera de casa` : ""}
            </motion.p>
            {r.viajes.paises.length > 0 && (
              <div className="w-chips">
                {r.viajes.paises.map((p, j) => (
                  <motion.span key={p} className="w-sello" {...aparece(1.3 + j * 0.2)}>
                    {p}
                  </motion.span>
                ))}
              </div>
            )}
          </div>
        ),
      })
    }

    if (r.lugares.cantidad) {
      d.push({
        id: "lugares",
        fondo: "w-cafe",
        contenido: (
          <div className="w-centro">
            <div className="fila" style={{ justifyContent: "center" }}>
              <Arte tipo="cafe" tam={12} />
              <Arte tipo="cocina" tam={12} />
            </div>
            <Gigante d={0.3}>
              <Contador valor={r.lugares.cantidad} />
            </Gigante>
            <motion.h1 className="w-titulo" {...aparece(0.7)}>
              lugares conquistados
            </motion.h1>
            <motion.p className="w-texto" {...aparece(1.1)}>
              {r.lugares.cafes} cafecitos · {r.lugares.comidas} comidas
            </motion.p>
            {r.lugares.barrios.length > 0 && (
              <>
                <motion.p className="w-chico" {...aparece(1.4)}>
                  {r.lugares.barrios.length} {r.lugares.barrios.length === 1 ? "barrio conquistado" : "barrios conquistados"}
                </motion.p>
                <div className="w-chips">
                  {r.lugares.barrios.slice(0, 8).map((b, j) => (
                    <motion.span key={b.barrio} className="w-sello" {...aparece(1.6 + j * 0.12)}>
                      {b.barrio} <span className="num">×{b.cantidad}</span>
                    </motion.span>
                  ))}
                </div>
              </>
            )}
          </div>
        ),
      })
    }

    if (r.taller.cantidad) {
      d.push({
        id: "taller",
        fondo: "w-taller",
        contenido: (
          <div className="w-centro">
            <Arte tipo="taller" tam={18} />
            <motion.h1 className="w-titulo" {...aparece(0.3)}>
              {r.taller.cantidad} {r.taller.cantidad === 1 ? "proyecto DIY terminado" : "proyectos DIY terminados"}
            </motion.h1>
            <motion.p className="w-texto" {...aparece(0.8)}>
              {r.taller.pasos} pasos tachados a puro martillazo.
            </motion.p>
          </div>
        ),
      })
    }

    if (r.ganasPorPersona.length) {
      const orden = [...r.ganasPorPersona].sort((a, b) => b.promedio - a.promedio)
      const manija = orden[0]
      d.push({
        id: "ganas",
        fondo: "w-f5",
        contenido: (
          <div className="w-columna">
            <motion.p className="w-chico" {...aparece(0.1)}>
              Ganas promedio
            </motion.p>
            <div className="w-duelo">
              {orden.map((g, j) => {
                const u = usuarios.find((x) => x.id === g.usuario)
                return (
                  <motion.div key={g.usuario} className="w-duelista" style={{ "--c": colorDe(u, usuarios.indexOf(u!)) } as React.CSSProperties} {...aparece(0.3 + j * 0.3)}>
                    <b>
                      <Contador valor={Math.round(g.promedio)} />%
                    </b>
                    <span>{u?.name}</span>
                  </motion.div>
                )
              })}
            </div>
            {orden.length > 1 && (
              <motion.h1 className="w-titulo" {...aparece(1.2)}>
                {nombreDe(usuarios, manija.usuario)} es {Math.abs(orden[0].promedio - orden[1].promedio) < 3 ? "igual de manija que" : "más manija que"} {nombreDe(usuarios, orden[1].usuario)}
              </motion.h1>
            )}
            {r.masGanas && (
              <motion.p className="w-texto" {...aparece(1.6)}>
                El que más ganas les dio: <b>{r.masGanas.plan.titulo}</b> ({Math.round(r.masGanas.promedio)}%)
              </motion.p>
            )}
          </div>
        ),
      })
    }

    if (r.desacuerdo && r.desacuerdo.diferencia >= 30) {
      const des = r.desacuerdo
      d.push({
        id: "desacuerdo",
        fondo: "w-f6",
        contenido: (
          <div className="w-centro">
            <motion.p className="w-chico" {...aparece(0.1)}>
              El que los dividió
            </motion.p>
            <motion.h1 className="w-titulo grande" {...aparece(0.3)}>
              {des.plan.titulo}
            </motion.h1>
            <div className="w-versus">
              {des.votos.map((v, j) => (
                <motion.span key={v.id} {...aparece(0.7 + j * 0.2)}>
                  {nombreDe(usuarios, v.usuario)} <b>{Math.round(v.ganas)}%</b>
                </motion.span>
              ))}
            </div>
            <motion.p className="w-texto" {...aparece(1.2)}>
              …y igual lo hicieron. Eso es amor.
            </motion.p>
          </div>
        ),
      })
    }

    if (r.masRapido && r.masEspera && r.hechos.length > 1) {
      d.push({
        id: "tiempos",
        fondo: "w-f2",
        contenido: (
          <div className="w-columna">
            <motion.div className="w-dato" {...aparece(0.2)}>
              <span className="w-chico">De idea a hecho en</span>
              <b className="w-medio">{r.masRapido.dias === 0 ? "el mismo día" : `${r.masRapido.dias} ${r.masRapido.dias === 1 ? "día" : "días"}`}</b>
              <span className="w-texto">{r.masRapido.plan.titulo} ⚡</span>
            </motion.div>
            <motion.div className="w-dato" {...aparece(0.9)}>
              <span className="w-chico">El que más se hizo esperar</span>
              <b className="w-medio">{r.masEspera.dias} días</b>
              <span className="w-texto">{r.masEspera.plan.titulo} 🐢</span>
            </motion.div>
          </div>
        ),
      })
    }

    const m = momentum(planes)
    d.push({
      id: "ritmo",
      fondo: "w-f1",
      contenido: (
        <div className="w-columna">
          <motion.p className="w-chico" {...aparece(0.1)}>
            Su ritmo, desde el primer plan
          </motion.p>
          <Gigante d={0.3}>
            <Contador valor={m.total} />
          </Gigante>
          <motion.h1 className="w-titulo" {...aparece(0.6)}>
            planes hechos juntos
          </motion.h1>
          <div className="w-tabla">
            {m.mesRecord && (
              <motion.div className="w-tabla-fila" {...aparece(0.9)}>
                <span>Mes récord</span>
                <b className="num" style={{ textTransform: "capitalize" }}>
                  {MESES[m.mesRecord.mes]} {m.mesRecord.anio} · {m.mesRecord.cantidad}
                </b>
              </motion.div>
            )}
            <motion.div className="w-tabla-fila" {...aparece(1.05)}>
              <span>Mejor racha</span>
              <b className="num">
                {m.rachaMaxima} {m.rachaMaxima === 1 ? "semana" : "semanas seguidas"}
              </b>
            </motion.div>
            <motion.div className="w-tabla-fila" {...aparece(1.2)}>
              <span>Ideas nuevas en {anio}</span>
              <b className="num">{r.ideasNuevas}</b>
            </motion.div>
            <motion.div className="w-tabla-fila" {...aparece(1.35)}>
              <span>Fotos en {anio}</span>
              <b className="num">{r.fotos}</b>
            </motion.div>
          </div>
        </div>
      ),
    })
  }

  d.push({
    id: "fin",
    fondo: "w-f3",
    contenido: (
      <div className="w-centro w-fin">
        <motion.h1 className="w-titulo grande" {...aparece(0.2)}>
          ¿Para cuál están en {anio + 1}?
        </motion.h1>
        <motion.div className="w-botones" {...aparece(0.8)} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <Boton onClick={() => ir("/")}>Ir a los planes</Boton>
          <Boton variante="secundario" onClick={() => ir(`/wrapped/${anio - 1}`)}>
            Ver {anio - 1}
          </Boton>
        </motion.div>
      </div>
    ),
  })

  return d
}
