import { motion } from "motion/react"
import { vibrar } from "../util/efectos"

const ICONOS: Record<string, React.ReactNode> = {
  "": <path d="M12 2l2.2 6.3L20.5 6l-3.6 5.6L22 14l-6.4.6L16 21l-4-5-4 5 .4-6.4L2 14l5.1-2.4L3.5 6l6.3 2.3z" />,
  planes: <path d="M4 6h16M4 12h11M4 18h7" />,
  recuerdos: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M4 16l5-5 4 4 2-2 5 5" />
      <circle cx="15.5" cy="8.5" r="1.5" />
    </>
  ),
  mas: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
}

const TABS = [
  { id: "", nombre: "Hoy" },
  { id: "planes", nombre: "Planes" },
  { id: "+", nombre: "Nuevo" },
  { id: "recuerdos", nombre: "Recuerdos" },
  { id: "mas", nombre: "Más" },
]

export function BarraNav({ actual, onNuevo }: { actual: string; onNuevo: () => void }) {
  return (
    <nav className="nav" aria-label="Secciones">
      {TABS.map((t) =>
        t.id === "+" ? (
          <motion.button
            key="+"
            className="nav-mas"
            aria-label="Nuevo plan"
            onClick={() => {
              vibrar(15)
              onNuevo()
            }}
            whileTap={{ scale: 0.85, rotate: 90 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <span>+</span>
          </motion.button>
        ) : (
          <a key={t.id} href={`#/${t.id}`} className={`nav-tab ${actual === t.id ? "activa" : ""}`} aria-current={actual === t.id ? "page" : undefined}>
            {actual === t.id && <motion.span layoutId="nav-burbuja" className="nav-burbuja" transition={{ type: "spring", stiffness: 500, damping: 32 }} />}
            <svg className="nav-icono" viewBox="0 0 24 24" aria-hidden>
              {ICONOS[t.id]}
            </svg>
            <span className="nav-nombre">{t.nombre}</span>
          </a>
        ),
      )}
    </nav>
  )
}
