import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { ArteFlotante } from "../componentes/Arte"
import { Boton } from "../componentes/Controles"
import { Garabato, Marquesina, TituloCinetico } from "../componentes/Deco"
import { pb } from "../pb"
import { festejar } from "../util/efectos"

const PERSONAS = [
  { slug: "inaki", nombre: "Iñaki", color: "var(--a1)" },
  { slug: "rocio", nombre: "Rocío", color: "var(--a2)" },
]

export function Login({ onEntrar }: { onEntrar: () => void }) {
  const [quien, setQuien] = useState<string | null>(null)
  const [clave, setClave] = useState("")
  const [error, setError] = useState("")
  const [cargando, setCargando] = useState(false)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quien || !clave) return
    setCargando(true)
    setError("")
    try {
      await pb.collection("users").authWithPassword(quien, clave)
      festejar(0.5, 0.5, 1.4)
      setTimeout(onEntrar, 500)
    } catch {
      setError("Esa no es 🙈 Probá de nuevo.")
      setCargando(false)
    }
  }

  return (
    <main className="login">
      <ArteFlotante tipo="cine" tam={12} style={{ left: "6%", top: "9%" }} demora={0.3} />
      <ArteFlotante tipo="cafe" tam={11} style={{ right: "4%", top: "14%" }} demora={0.5} />
      <ArteFlotante tipo="viaje" tam={11} style={{ left: "10%", bottom: "16%" }} demora={0.7} />
      <ArteFlotante tipo="salida" tam={10} style={{ right: "8%", bottom: "10%" }} demora={0.9} />

      <div className="login-centro">
        <TituloCinetico texto="Estoy para esa" className="login-titulo" />
        <Garabato />
        <p className="login-sub">Todos nuestros plancitos, en un solo lugar.</p>

        <AnimatePresence mode="wait">
          {!quien ? (
            <motion.div key="quien" className="login-personas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <p className="etiqueta">¿Quién sos?</p>
              <div className="login-botones">
                {PERSONAS.map((p, i) => (
                  <motion.button
                    key={p.slug}
                    className="persona"
                    style={{ "--c": p.color } as React.CSSProperties}
                    onClick={() => setQuien(p.slug)}
                    initial={{ scale: 0, rotate: i ? 20 : -20 }}
                    animate={{ scale: 1, rotate: i ? 3 : -3 }}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ rotate: 0, scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.6 + i * 0.12 }}
                  >
                    <span className="persona-blob">{p.nombre[0]}</span>
                    <span className="persona-nombre">{p.nombre}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.form key="clave" className="login-form" onSubmit={entrar} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="etiqueta">
                Hola, {PERSONAS.find((p) => p.slug === quien)?.nombre} 👋
              </p>
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
                No soy yo
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <div className="login-cintas">
        <Marquesina items={["PELIS", "CAFECITOS", "VIAJES", "DIY", "COMIDA", "SALIDAS"]} />
        <Marquesina items={["ESTOY PARA ESA", "¿Y SI VAMOS?", "DALE", "DE UNA"]} invertida giro={2} />
      </div>
    </main>
  )
}
