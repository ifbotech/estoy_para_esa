import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { Boton } from "../componentes/Controles"
import { Marquesina, TituloCinetico } from "../componentes/Deco"
import { pb } from "../pb"
import { festejar } from "../util/efectos"

const PERSONAS = [
  { slug: "inaki", nombre: "Iñaki", color: "var(--tomate)" },
  { slug: "rocio", nombre: "Rocío", color: "var(--limon)" },
]

/** La entrada: la pregunta gigante con la entrada asomándose, como la puerta de Flying Papers. */
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
      festejar(0.5, 0.55, 1.4)
      setTimeout(onEntrar, 450)
    } catch (err) {
      const status = (err as { status?: number })?.status
      setError(status === 429 ? "Demasiados intentos. Esperá unos minutos 🙈" : "Esa no es 🙈 Probá de nuevo.")
      setCargando(false)
    }
  }

  return (
    <main className="login">
      <div className="login-centro">
        <span className="etiqueta login-marca">estoy para esa</span>
        <AnimatePresence mode="wait">
          {!persona ? (
            <motion.div key="quien" className="login-paso" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }}>
              <TituloCinetico lineas={["¿Quién", "sos?"]} asoma="entrada" className="login-titulo" />
              <div className="login-botones">
                {PERSONAS.map((p, i) => (
                  <motion.button
                    key={p.slug}
                    className="persona"
                    style={{ "--c": p.color } as React.CSSProperties}
                    onClick={() => setQuien(p.slug)}
                    initial={{ y: 30, opacity: 0, rotate: i ? 6 : -6 }}
                    animate={{ y: 0, opacity: 1, rotate: i ? 2 : -2 }}
                    whileTap={{ x: 4, y: 4, boxShadow: "0 0 0 var(--negro)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.5 + i * 0.1 }}
                  >
                    <span className="persona-inicial">{p.nombre[0]}</span>
                    <span>{p.nombre}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.form key="clave" className="login-paso" onSubmit={entrar} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TituloCinetico lineas={["Hola,", persona.nombre]} className="login-titulo chico" />
              <input
                className="campo campo-grande"
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoFocus
              />
              {error && (
                <motion.p className="login-error" initial={{ x: -10 }} animate={{ x: [10, -8, 6, -4, 0] }}>
                  {error}
                </motion.p>
              )}
              <Boton type="submit" disabled={cargando || !clave} className="boton-grande">
                {cargando ? "Entrando…" : "¡Entrar!"}
              </Boton>
              <button type="button" className="link-sutil" onClick={() => setQuien(null)}>
                No soy {persona.nombre}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      <div className="login-cintas">
        <Marquesina items={["PELIS", "CAFECITOS", "VIAJES", "DIY", "COMIDA", "SALIDAS"]} color="var(--limon)" />
        <Marquesina items={["ESTOY PARA ESA", "¿Y SI VAMOS?", "DALE", "DE UNA"]} invertida giro={2} color="var(--chicle)" />
      </div>
    </main>
  )
}
