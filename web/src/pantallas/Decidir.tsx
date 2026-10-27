import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { estadoDecision, fecha, type EstadoDecision } from "../calculos"
import { PiedraChica, PiedraQueGira } from "../componentes/Piedras"
import { Boton } from "../componentes/Controles"
import { Sello } from "../componentes/Deco"
import { colorDe } from "../componentes/Tarjetas"
import { archivarPregunta, borrarPregunta, crearPregunta, elegirRespuesta, responder, useStore, useYo } from "../store"
import type { Pregunta } from "../tipos"
import { festejar, vibrar } from "../util/efectos"
import { sonar } from "../util/sonidos"

/**
 * Decidir: uno pregunta, cada uno responde a ciegas, se destapan las dos y
 * cada uno elige la que más le copa. Si ninguna tienta, otra ronda. Lo que se
 * decide lo resuelve el servidor (pb_hooks/decisiones.js), así que a los dos
 * les da lo mismo, moneda incluida.
 */
export function Decidir() {
  const preguntas = useStore((s) => s.preguntas)
  const respuestas = useStore((s) => s.respuestas)
  const yo = useYo()
  const [texto, setTexto] = useState("")
  const [creando, setCreando] = useState(false)

  const abiertas = preguntas.filter((p) => p.estado !== "archivada")
  const archivadas = preguntas
    .filter((p) => p.estado === "archivada" && p.elegida)
    .sort((a, b) => (b.decidida_en || b.updated).localeCompare(a.decidida_en || a.updated))
    .slice(0, 8)

  const preguntar = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return
    setCreando(true)
    const rec = await crearPregunta(t.endsWith("?") || t.startsWith("¿") ? t : `¿${t}?`)
    setCreando(false)
    if (rec) {
      vibrar(15)
      sonar("tic")
      setTexto("")
    }
  }

  return (
    <div className="decidir">
      <header className="cabeza-pantalla" style={{ "--cc": "var(--lila)" } as React.CSSProperties}>
        <div>
          <p className="etiqueta">entre los dos</p>
          <h1 className="titulo-pantalla">Decidir</h1>
        </div>
      </header>

      <ol className="decidir-como">
        <li>
          <span className="num">01</span>
          <p>Uno hace la pregunta y cada uno escribe su respuesta. No se ven hasta que respondieron los dos.</p>
        </li>
        <li>
          <span className="num">02</span>
          <p>Con las dos a la vista, cada uno elige la que más le copa.</p>
        </li>
        <li>
          <span className="num">03</span>
          <p>Si ninguna tienta, otra ronda: cada uno pone una opción nueva. Si eligen distinto, desempata la moneda.</p>
        </li>
      </ol>

      <form className="decidir-nueva" onSubmit={preguntar}>
        <input className="campo campo-grande" placeholder="¿Qué decidimos?" value={texto} onChange={(e) => setTexto(e.target.value)} enterKeyHint="send" maxLength={200} />
        <Boton type="submit" disabled={!texto.trim() || creando}>
          Preguntar
        </Boton>
      </form>

      <AnimatePresence initial={false}>
        {abiertas.map((p) => (
          <motion.div key={p.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <TarjetaPregunta pregunta={p} e={estadoDecision(p, respuestas, yo?.id)} />
          </motion.div>
        ))}
      </AnimatePresence>

      {!abiertas.length && (
        <div className="vacio">
          <p>No hay nada para decidir. Cuando haga falta, preguntá arriba.</p>
        </div>
      )}

      {archivadas.length > 0 && (
        <section className="decidir-historial" aria-label="Ya decidido">
          <h2 className="etiqueta">ya decidido</h2>
          {/* una pila de piedras: lo más nuevo arriba, como se apilan */}
          <ol className="pila">
            {archivadas.map((p, i) => (
              <li key={p.id} style={{ "--corre": `${((i * 37) % 5) * 8 - 16}px`, zIndex: archivadas.length - i } as React.CSSProperties}>
                <PiedraChica semilla={semillaDe(p.id)} color={i % 2 ? "var(--rosa)" : "var(--amarillo)"} ancho={Math.min(300, 150 + p.elegida.length * 6)}>
                  <span className="pila-pregunta">{p.texto}</span>
                  <span className="pila-elegida">
                    {p.desempate ? "🪙 " : ""}
                    {p.elegida}
                  </span>
                </PiedraChica>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}

function useNombres() {
  const usuarios = useStore((s) => s.usuarios)
  const yo = useYo()
  const otro = usuarios.find((u) => u.id !== yo?.id)
  return { usuarios, yo, otro, nombre: (id: string) => usuarios.find((u) => u.id === id)?.name ?? "Alguien" }
}

function TarjetaPregunta({ pregunta: p, e }: { pregunta: Pregunta; e: EstadoDecision }) {
  const { usuarios, yo, otro, nombre } = useNombres()
  const [texto, setTexto] = useState("")
  const [mandando, setMandando] = useState(false)
  const nombreOtro = otro?.name ?? "el otro"
  const color = (id: string) => colorDe(usuarios.find((u) => u.id === id), Math.max(0, usuarios.findIndex((u) => u.id === id)))

  const mandar = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!texto.trim()) return
    setMandando(true)
    await responder(p, texto.trim())
    setMandando(false)
    setTexto("")
    vibrar(15)
  }

  const elegir = (id: string, ev?: React.MouseEvent) => {
    if (!e.mia) return
    vibrar(20)
    if (id !== "otra") {
      sonar("esa")
      if (ev) festejar(ev.clientX / innerWidth, ev.clientY / innerHeight, 0.6)
    } else sonar("swish")
    void elegirRespuesta(e.mia, id)
  }

  // las piedras que diste vuelta (después de elegir, quedan las dos dadas vuelta)
  const [giradas, setGiradas] = useState<string[]>([])
  // en una ronda nueva, las piedras nuevas arrancan de frente
  useEffect(() => setGiradas([]), [p.ronda])
  const ambas = Boolean(e.mia && e.otra)
  const giradaMia = Boolean(e.mia) && (e.fase === "esperando-eleccion" || giradas.includes("mia"))
  const giradaOtra = ambas && (e.fase === "esperando-eleccion" || giradas.includes("otra"))
  const girar = (cual: string) => {
    vibrar(12)
    sonar("swish")
    setGiradas((g) => (g.includes(cual) ? g.filter((x) => x !== cual) : [...g, cual]))
  }
  const tocarMia = (ev?: React.MouseEvent) => {
    if (!e.mia) return
    if (ambas && giradaMia && e.mia.elige !== e.mia.id) elegir(e.mia.id, ev)
    else if (!(ambas && giradaMia)) girar("mia")
  }
  const tocarOtra = (ev?: React.MouseEvent) => {
    if (!e.otra) return
    if (giradaOtra && e.mia?.elige !== e.otra.id) elegir(e.otra.id, ev)
    else if (!giradaOtra) girar("otra")
  }
  const pista =
    e.fase === "responder"
      ? e.otroRespondio
        ? `${nombreOtro} ya respondió: su piedra está despierta. Ahora vos.`
        : "Las dos piedras duermen hasta que cada uno responda."
      : e.fase === "esperando"
        ? `Respondiste. La piedra de ${nombreOtro} sigue dormida.`
        : e.fase === "elegir"
          ? giradaMia && giradaOtra
            ? "¿Cuál te copa más? Tocala de nuevo para elegirla."
            : "¡Están las dos! Tocá las piedras para darlas vuelta."
          : `Elegiste. Falta ${nombreOtro}.`

  const quien = p.creada_por ? `pregunta de ${nombre(p.creada_por)}` : "pregunta"
  const ronda = p.ronda > 1 ? ` · ronda ${p.ronda}` : ""

  return (
    <section className={`pregunta fase-${e.fase}`}>
      <header className="pregunta-cabeza">
        <span className="etiqueta">
          {quien}
          {ronda}
        </span>
        <button
          className="pregunta-quitar"
          aria-label={p.estado === "decidida" ? "Guardar en lo decidido" : "Borrar la pregunta"}
          onClick={() => {
            if (p.estado === "decidida") void archivarPregunta(p.id)
            else if (confirm("¿Borrar esta pregunta?")) void borrarPregunta(p.id)
          }}
        >
          {p.estado === "decidida" ? "✓" : "×"}
        </button>
      </header>
      <h2 className="pregunta-texto">{p.texto}</h2>

      {e.descartadas.length > 0 && e.fase !== "decidida" && (
        <p className="pregunta-descartadas">
          <span className="etiqueta">no tentaron</span>{" "}
          {e.descartadas.map((r) => (
            <s key={r.id}>{r.texto}</s>
          ))}
        </p>
      )}

      {e.fase !== "decidida" && e.fase !== "archivada" && (
        <>
          <p className="pregunta-pista">{pista}</p>
          <div className="decidir-opciones">
            <PiedraQueGira
              semilla={semillaDe(`${p.id}${yo?.id}${p.ronda}`)}
              color={color(yo?.id ?? "")}
              dormida={!e.mia}
              texto={e.mia?.texto}
              girada={giradaMia}
              etiqueta="vos"
              marca={e.mia && e.mia.elige === e.mia.id ? <span className="opcion-marca">tu elegida</span> : undefined}
              onTocar={tocarMia}
              aria={e.mia ? (giradaMia ? `Tu respuesta: ${e.mia.texto}` : "Tu piedra: tocala para darla vuelta") : "Tu piedra, dormida: respondé abajo"}
            />
            <PiedraQueGira
              semilla={semillaDe(`${p.id}${otro?.id}${p.ronda}`)}
              color={color(otro?.id ?? "")}
              dormida={!e.otroRespondio}
              texto={e.otra?.texto}
              girada={giradaOtra}
              etiqueta={nombreOtro}
              marca={e.mia && e.otra && e.mia.elige === e.otra.id ? <span className="opcion-marca">tu elegida</span> : undefined}
              onTocar={tocarOtra}
              aria={
                e.otra
                  ? giradaOtra
                    ? `La respuesta de ${nombreOtro}: ${e.otra.texto}`
                    : `La piedra de ${nombreOtro}: tocala para darla vuelta`
                  : e.otroRespondio
                    ? `${nombreOtro} ya respondió: se da vuelta cuando respondas`
                    : `${nombreOtro} todavía no respondió`
              }
            />
          </div>
          {e.fase === "responder" && (
            <form className="pregunta-responder" onSubmit={mandar}>
              <input className="campo" placeholder="Tu respuesta, a ciegas…" value={texto} onChange={(ev) => setTexto(ev.target.value)} enterKeyHint="send" maxLength={300} />
              <Boton type="submit" disabled={!texto.trim() || mandando}>
                Listo
              </Boton>
            </form>
          )}
          {(e.fase === "elegir" || e.fase === "esperando-eleccion") && e.mia && (
            <button className={`pregunta-otra ${e.mia.elige === "otra" ? "elegida" : ""}`} onClick={(ev) => elegir("otra", ev)} aria-pressed={e.mia.elige === "otra"}>
              🔁 Ninguna me tienta: otra ronda
            </button>
          )}
        </>
      )}

      {e.fase === "decidida" && (
        <div className="pregunta-decidida">
          <Sello tono={p.desempate ? "tinta" : "verde"}>{p.desempate ? "🪙 lo decidió la moneda" : "¡decidido!"}</Sello>
          <p className="pregunta-elegida">{p.elegida}</p>
          {p.decidida_en && (
            <span className="etiqueta">
              {p.ronda > 1 ? `en ${p.ronda} rondas · ` : ""}
              {fecha(p.decidida_en)?.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          )}
        </div>
      )}
    </section>
  )
}

/** Un número fijo por id, para que cada piedra tenga siempre la misma forma. */
function semillaDe(id: string) {
  let n = 0
  for (const c of id) n = (n * 31 + c.charCodeAt(0)) % 997
  return n + 1
}
