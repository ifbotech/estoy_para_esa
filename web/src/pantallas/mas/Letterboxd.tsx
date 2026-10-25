import { motion } from "motion/react"
import { useState } from "react"
import { avisar } from "../../componentes/Avisos"
import { Boton, Estrellas } from "../../componentes/Controles"
import { pb } from "../../pb"
import { crearPlan, editarPlan, useStore, useYo, votar } from "../../store"
import type { Plan } from "../../tipos"
import { festejar } from "../../util/efectos"

interface PeliDiario {
  titulo: string
  anio: string
  puntaje: number
  visto: string
  link: string
  poster: string
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")

/**
 * Trae el diario de Letterboxd (las últimas pelis registradas) y las cruza con
 * la lista: las que estaban pendientes se pueden marcar como vistas, con la
 * fecha y el puntaje propio.
 */
export function Letterboxd() {
  const yo = useYo()
  const planes = useStore((s) => s.planes)
  const categorias = useStore((s) => s.categorias)
  const cine = categorias.filter((c) => c.personalidad === "cine").map((c) => c.id)
  const [usuario, setUsuario] = useState(yo?.letterboxd ?? "")
  const [pelis, setPelis] = useState<PeliDiario[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [hechas, setHechas] = useState<Set<string>>(new Set())

  const traer = async () => {
    if (!usuario.trim()) return
    setCargando(true)
    try {
      const r = await pb.send<{ pelis: PeliDiario[] }>("/api/epe/letterboxd", { query: { usuario: usuario.trim() } })
      setPelis(r.pelis)
      if (!r.pelis.length) avisar("El diario está vacío o es privado", "info")
    } catch {
      avisar("No encontré ese usuario de Letterboxd", "error")
    }
    setCargando(false)
  }

  const enLista = (p: PeliDiario): Plan | undefined =>
    planes.find((x) => cine.includes(x.categoria) && (norm(x.titulo) === norm(p.titulo) || (x.datos?.letterboxd && x.datos.letterboxd === p.link)))

  const marcar = async (p: PeliDiario, plan?: Plan) => {
    const esMio = usuario.trim().toLowerCase() === (yo?.letterboxd ?? "").toLowerCase()
    const hecho_en = p.visto ? new Date(p.visto + "T21:00").toISOString() : new Date().toISOString()
    let id = plan?.id
    if (plan) {
      await editarPlan(plan.id, {
        estado: "hecho",
        hecho_en,
        datos: { ...(plan.datos ?? {}), letterboxd: plan.datos?.letterboxd || p.link, poster: plan.datos?.poster || p.poster, anio: plan.datos?.anio || p.anio },
      })
    } else {
      const nuevo = await crearPlan({
        titulo: p.titulo,
        categoria: cine[0],
        estado: "hecho",
        hecho_en,
        link: "",
        datos: { letterboxd: p.link, poster: p.poster, anio: p.anio },
      })
      id = nuevo?.id
    }
    if (id && esMio && p.puntaje) await votar(id, { puntaje: p.puntaje })
    setHechas((s) => new Set(s).add(p.link))
  }

  const pendientes = (pelis ?? []).filter((p) => {
    const plan = enLista(p)
    return plan && plan.estado !== "hecho" && !hechas.has(p.link)
  })

  return (
    <div className="letterboxd">
      <p className="suave">Se usa el RSS público del diario (las últimas ~50 pelis). Si el perfil es privado no va a aparecer nada.</p>
      <form
        className="item-nuevo"
        onSubmit={(e) => {
          e.preventDefault()
          traer()
        }}
      >
        <input className="campo" placeholder="usuario de Letterboxd" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        <Boton type="submit" disabled={cargando || !usuario.trim()}>
          {cargando ? "…" : "Traer"}
        </Boton>
      </form>

      {pendientes.length > 0 && (
        <section className="seccion">
          <div className="seccion-cabeza">
            <h2>Estaban en la lista</h2>
            <Boton
              className="boton-chico"
              onClick={async (e) => {
                for (const p of pendientes) await marcar(p, enLista(p))
                festejar(e.clientX / innerWidth, e.clientY / innerHeight)
                avisar(`${pendientes.length} pelis marcadas como vistas 🎬`)
              }}
            >
              Marcar todas
            </Boton>
          </div>
        </section>
      )}

      {pelis && (
        <div className="diario">
          {pelis.map((p, i) => {
            const plan = enLista(p)
            const lista = hechas.has(p.link) || plan?.estado === "hecho"
            return (
              <motion.div key={p.link + i} className="diario-peli" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.03 }}>
                {p.poster ? <img src={p.poster} alt="" loading="lazy" /> : <span className="diario-sin">🎬</span>}
                <div className="diario-texto">
                  <b>{p.titulo}</b>
                  <small>
                    {p.anio} · {p.visto && new Date(p.visto + "T12:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  </small>
                  {p.puntaje > 0 && <Estrellas valor={p.puntaje} tam={14} />}
                </div>
                {lista ? (
                  <span className="etiqueta">✓ vista</span>
                ) : (
                  <Boton className="boton-chico" variante={plan ? "primario" : "fantasma"} onClick={() => marcar(p, plan)}>
                    {plan ? "Vista ✓" : "+ Sumar"}
                  </Boton>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
