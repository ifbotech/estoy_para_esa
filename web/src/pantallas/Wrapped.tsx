import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { DIAS, MESES, fecha, momentum, numerosActividad, resumenPeriodo, type NumerosActividad, type Resumen } from "../calculos"
import { avisar } from "../componentes/Avisos"
import { Arte } from "../componentes/Arte"
import { Boton } from "../componentes/Controles"
import { Contador } from "../componentes/Deco"
import { colorDe } from "../componentes/Tarjetas"
import { urlArchivo } from "../pb"
import { ir } from "../router"
import type { Plan, Usuario, Wrap } from "../tipos"
import { festejoGrande } from "../util/efectos"
import { marcarWrapVisto, useWrap } from "../wrap"

const DURACION = 6500

interface Diapo {
  id: string
  fondo: string
  contenido: ReactNode
}

/**
 * El Wrapped: el semestre o el año en plancitos, en historias que pasan
 * solas. No está en ningún menú: existe sólo mientras el servidor lo tiene
 * abierto (ver pb_hooks/wrap.js) y se arma con la foto congelada del período.
 */
export function Wrapped() {
  const wrap = useWrap()
  useEffect(() => {
    if (wrap === null) {
      avisar("El Wrapped llega el 30 de junio y el 31 de diciembre 🎁", "info")
      ir("/")
    }
    if (wrap) marcarWrapVisto(wrap)
  }, [wrap])
  if (!wrap) return <div className="wrapped w-f1" />
  return <Historias wrap={wrap} />
}

function Historias({ wrap }: { wrap: Wrap }) {
  const { planes, votos, categorias, items, usuarios, actividad, historico } = wrap.datos
  const anio = wrap.anio
  const r = useMemo(
    () => resumenPeriodo({ anio, tipo: wrap.tipo, desde: fecha(wrap.desde)!, hasta: fecha(wrap.hasta)! }, planes, votos, categorias, items),
    [wrap, anio, planes, votos, categorias, items],
  )
  const n = useMemo(() => numerosActividad(actividad ?? []), [actividad])
  const diapos = useMemo(() => armarDiapos(r, usuarios, historico ?? [], n), [r, usuarios, historico, n])
  const [i, setI] = useState(0)
  const [pausa, setPausa] = useState(false)
  const inicio = useRef(Date.now())
  const transcurrido = useRef(0)

  // Si la app pasa a segundo plano, las historias se pausan (y no avanzan solas).
  useEffect(() => {
    const f = () => setPausa(document.visibilityState !== "visible")
    document.addEventListener("visibilitychange", f)
    return () => document.removeEventListener("visibilitychange", f)
  }, [])

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
      <button className="w-cerrar" onClick={() => ir("/")} aria-label="Cerrar">
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

function armarDiapos(r: Resumen, usuarios: Usuario[], historico: string[], n: NumerosActividad): Diapo[] {
  const d: Diapo[] = []
  const anio = r.anio
  const mitad = r.tipo === "mitad"
  // «en 2026» o «en la primera mitad de 2026»
  const enElPeriodo = mitad ? `en la primera mitad de ${anio}` : `en ${anio}`

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
          {mitad ? "Su medio año en plancitos" : "Su año en plancitos"}
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
            Todavía no hay nada hecho {enElPeriodo}.
          </motion.h1>
          <motion.p className="w-texto" {...aparece(0.6)}>
            Marquen planes como <b>Hecho</b> y este Wrapped se llena solo.
          </motion.p>
        </div>
      ),
    })
  } else {
    const porSemana = r.total / ((52 * r.meses) / 12)
    d.push({
      id: "total",
      fondo: "w-f2",
      contenido: (
        <div className="w-centro">
          <motion.p className="w-chico" {...aparece(0.1)}>
            {enElPeriodo[0].toUpperCase() + enElPeriodo.slice(1)} hicieron
          </motion.p>
          <Gigante>
            <Contador valor={r.total} duracion={1.8} />
          </Gigante>
          <motion.h1 className="w-titulo" {...aparece(1)}>
            {r.total === 1 ? "plancito" : "plancitos"}
          </motion.h1>
          <motion.p className="w-texto" {...aparece(1.6)}>
            {porSemana >= 1 ? "¡Más de uno por semana! Imparables." : porSemana >= 0.5 ? "Casi uno cada dos semanas. Nada mal." : r.total >= r.meses ? "Uno por mes, como mínimo." : "Pocos pero buenos."}
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

    if (n.ideas || n.votos) {
      const manija = n.ideasPorPersona[0]
      d.push({
        id: "movimiento",
        fondo: "w-f5",
        contenido: (
          <div className="w-columna">
            <motion.p className="w-chico" {...aparece(0.1)}>
              Y además de hacer…
            </motion.p>
            <Gigante d={0.3}>
              <Contador valor={n.ideas} duracion={1.4} />
            </Gigante>
            <motion.h1 className="w-titulo" {...aparece(0.7)}>
              {n.ideas === 1 ? "idea nueva" : "ideas nuevas"}
            </motion.h1>
            <div className="w-tabla">
              {[
                ["Votos de ganas", n.votos],
                ["Planes agendados", n.agendados],
                ["Pasos tachados", n.tachados],
                ["Fotos subidas", n.fotos],
                ["Puntajes y reseñas", n.puntajes + n.resenas],
              ]
                .filter(([, v]) => Number(v) > 0)
                .map(([k, v], j) => (
                  <motion.div key={k} className="w-tabla-fila" {...aparece(1 + j * 0.15)}>
                    <span>{k}</span>
                    <b className="num">{v}</b>
                  </motion.div>
                ))}
            </div>
            <motion.p className="w-texto" {...aparece(1.9)}>
              {manija && n.ideasPorPersona.length > 1 && manija.cantidad > n.ideasPorPersona[1].cantidad ? (
                <>
                  <b>{nombreDe(usuarios, manija.usuario)}</b> sumó más ideas ({manija.cantidad}).{" "}
                </>
              ) : (
                "Sumaron ideas parejo. "
              )}
              {n.diaTop !== null && (
                <>
                  Su día: los <b>{DIAS[n.diaTop]}{n.diaTop === 0 || n.diaTop === 6 ? "s" : ""}</b>.
                </>
              )}
            </motion.p>
          </div>
        ),
      })
    }

    const max = Math.max(...r.porMes.slice(0, r.meses))
    d.push({
      id: "meses",
      fondo: "w-f4",
      contenido: (
        <div className="w-columna">
          <motion.h1 className="w-titulo" {...aparece(0.2)}>
            <span style={{ textTransform: "capitalize" }}>{MESES[r.mesTop]}</span> fue el mes más intenso
          </motion.h1>
          <motion.p className="w-texto" {...aparece(0.4)}>
            {r.porMes[r.mesTop]} {r.porMes[r.mesTop] === 1 ? "plancito" : "plancitos"} en un solo mes.
          </motion.p>
          <div className="w-meses">
            {r.porMes.slice(0, r.meses).map((cant, j) => (
              <div key={j} className="w-mes">
                <motion.span
                  className={`w-mes-barra ${j === r.mesTop ? "top" : ""}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${max ? (cant / max) * 100 : 0}%` }}
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

    if (n.planesMatch.length) {
      d.push({
        id: "matches",
        fondo: "w-f6",
        contenido: (
          <div className="w-centro">
            <motion.p className="w-chico" {...aparece(0.1)}>
              Los dos al 85 % o más
            </motion.p>
            <Gigante d={0.3}>
              <Contador valor={n.planesMatch.length} />
            </Gigante>
            <motion.h1 className="w-titulo" {...aparece(0.7)}>
              {n.planesMatch.length === 1 ? "¡match total!" : "matches totales"} 🔥
            </motion.h1>
            <div className="w-chips">
              {n.planesMatch.slice(0, 8).map((t, j) => (
                <motion.span key={t} className="w-sello" {...aparece(1.1 + j * 0.15)}>
                  {t}
                </motion.span>
              ))}
            </div>
          </div>
        ),
      })
    }

    const conFotos = r.hechos.filter((p) => p.fotos?.length)
    const fotos = conFotos.flatMap((p) => p.fotos.slice(0, 3).map((f) => ({ plan: p, f }))).slice(0, 9)
    if (fotos.length >= 3) {
      d.push({
        id: "fotos",
        fondo: "w-f2",
        contenido: (
          <div className="w-centro">
            <div className="w-collage">
              {fotos.map(({ plan, f }, j) => (
                <motion.img
                  key={plan.id + f}
                  src={urlArchivo(plan, f, "300x300")}
                  alt=""
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + j * 0.12, duration: 0.25 }}
                />
              ))}
            </div>
            <motion.h1 className="w-titulo" {...aparece(1.4)}>
              {r.fotos} {r.fotos === 1 ? "foto" : "fotos"} de {conFotos.length} {conFotos.length === 1 ? "plan" : "planes"}
            </motion.h1>
            <motion.p className="w-texto" {...aparece(1.8)}>
              Las pruebas de que pasó.
            </motion.p>
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

    const m = momentum(historico.map((hecho_en) => ({ estado: "hecho", hecho_en }) as Plan))
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
              <span>Ideas nuevas {mitad ? "en el semestre" : `en ${anio}`}</span>
              <b className="num">{r.ideasNuevas}</b>
            </motion.div>
            <motion.div className="w-tabla-fila" {...aparece(1.35)}>
              <span>Fotos {mitad ? "en el semestre" : `en ${anio}`}</span>
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
          {mitad ? "¿Para cuál están en lo que queda del año?" : `¿Para cuál están en ${anio + 1}?`}
        </motion.h1>
        <motion.p className="w-texto" {...aparece(0.6)}>
          {mitad ? "Nos vemos el 31 de diciembre con el del año entero." : "Nos vemos a mitad de año con el próximo."}
        </motion.p>
        <motion.div className="w-botones" {...aparece(0.9)} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <Boton onClick={() => ir("/")}>¡A sumar aventuras!</Boton>
        </motion.div>
      </div>
    ),
  })

  return d
}
