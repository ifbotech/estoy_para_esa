import { AnimatePresence, motion } from "motion/react"
import { useSyncExternalStore } from "react"

type Tipo = "ok" | "error" | "info"
interface Aviso {
  id: number
  texto: string
  tipo: Tipo
  accion?: { texto: string; hacer: () => void }
}

let avisos: Aviso[] = []
let n = 0
const oyentes = new Set<() => void>()
const emitir = () => oyentes.forEach((o) => o())

export function avisar(texto: string, tipo: Tipo = "ok", accion?: Aviso["accion"], ms = 3200) {
  const id = ++n
  avisos = [...avisos, { id, texto, tipo, accion }]
  emitir()
  if (ms > 0) setTimeout(() => cerrar(id), ms)
}

function cerrar(id: number) {
  avisos = avisos.filter((a) => a.id !== id)
  emitir()
}

export function Avisos() {
  const lista = useSyncExternalStore(
    (cb) => {
      oyentes.add(cb)
      return () => oyentes.delete(cb)
    },
    () => avisos,
  )
  return (
    <div className="avisos" aria-live="polite">
      <AnimatePresence>
        {lista.map((a) => (
          <motion.div
            key={a.id}
            className={`aviso aviso-${a.tipo}`}
            initial={{ y: -40, opacity: 0, scale: 0.8, rotate: -4 }}
            animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
            exit={{ y: -30, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            onClick={() => cerrar(a.id)}
          >
            <span>{a.texto}</span>
            {a.accion && (
              <button
                className="aviso-accion"
                onClick={(e) => {
                  e.stopPropagation()
                  a.accion!.hacer()
                  cerrar(a.id)
                }}
              >
                {a.accion.texto}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
