import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { Arte } from "../componentes/Arte"
import { Boton } from "../componentes/Controles"
import { Globos } from "../componentes/Globos"
import { pb } from "../pb"

const PERSONAS = [
  { slug: "inaki", nombre: "Iñaki", color: "var(--rojo)" },
  { slug: "rocio", nombre: "Rocío", color: "var(--amarillo)" },
]

/** La entrada: una ficha con las dos personas y la clave. Sin vueltas. */
export function Login({ onEntrar }: { onEntrar: () => void }) {
  const [quien, setQuien] = useState<string | null>(null)
  const [clave, setClave] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)
  const persona = PERSONAS.find((p) => p.slug === quien)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quien || !clave) return
    setCargando(true)
    setError("")
    try {
      await pb.collection("users").authWithPassword(quien, clave)
      onEntrar()
    } catch (err) {
      const status = (err as { status?: number })?.status
      setError(status === 429 ? "Demasiados intentos. Esperá unos minutos." : "Esa no es. Probá de nuevo.")
      setCargando(false)
    }
  }

  return (
    <main className="login">
      <div className="login-ficha">
        <header className="login-cabeza">
          <span className="login-marca">ESTOY PARA ESA <Globos /></span>
          <span className="etiqueta num">v3</span>
        </header>
        <div className="login-arte" aria-hidden>
          <Arte tipo="salida" tam={9} />
          <Arte tipo="cine" tam={7} />
          <Arte tipo="cafe" tam={7} />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {!persona ? (
            <motion.div key="quien" className="login-paso" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <h1 className="login-titulo">¿Quién sos?</h1>
              <div className="login-botones">
                {PERSONAS.map((p) => (
                  <button key={p.slug} className="persona" style={{ "--c": p.color } as React.CSSProperties} onClick={() => setQuien(p.slug)}>
                    <span className="persona-inicial">{p.nombre[0]}</span>
                    <span>{p.nombre}</span>
                    <span aria-hidden>→</span>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.form key="clave" className="login-paso" onSubmit={entrar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <h1 className="login-titulo">Hola, {persona.nombre}.</h1>
              <label className="campo-etiqueta">
                <span>Tu contraseña</span>
                <input className="campo campo-grande" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus />
              </label>
              {error && (
                <p className="login-error" role="alert">
                  {error}
                </p>
              )}
              <Boton type="submit" disabled={cargando || !clave} className="boton-grande">
                {cargando ? "Entrando…" : "Entrar"}
              </Boton>
              <button type="button" className="link-sutil" onClick={() => setQuien(null)}>
                No soy {persona.nombre}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
