import { decisionesPendientes } from "../calculos"
import { useStore, useYo } from "../store"
import { vibrar } from "../util/efectos"

const ICONOS: Record<string, React.ReactNode> = {
  "": (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 7.5v9M7.5 12h9" />
    </>
  ),
  planes: <path d="M4 6h16M4 12h11M4 18h7" />,
  // un cartel con dos flechas: para un lado o para el otro
  decidir: <path d="M12 3v18M12 5h6.5l2.5 3-2.5 3H12M12 13H5.5L3 16l2.5 3H12" />,
  mas: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
}

const TABS = [
  { id: "", nombre: "Sumar" },
  { id: "planes", nombre: "Planes" },
  { id: "decidir", nombre: "Decidir" },
  { id: "mas", nombre: "Más" },
]

/** La barra de abajo: fija, de borde a borde, celdas separadas por tinta. Sumar es la primera. */
export function BarraNav({ actual }: { actual: string }) {
  const preguntas = useStore((s) => s.preguntas)
  const respuestas = useStore((s) => s.respuestas)
  const yo = useYo()
  const pendientes = decisionesPendientes(preguntas, respuestas, yo?.id)
  return (
    <nav className="nav" aria-label="Secciones">
      {TABS.map((t) => (
        <a
          key={t.id}
          href={`#/${t.id}`}
          className={`nav-tab ${t.id === "" ? "nav-sumar" : ""} ${actual === t.id ? "activa" : ""}`}
          aria-current={actual === t.id ? "page" : undefined}
          onClick={() => vibrar(10)}
        >
          <svg className="nav-icono" viewBox="0 0 24 24" aria-hidden>
            {ICONOS[t.id]}
          </svg>
          <span className="nav-nombre">{t.nombre}</span>
          {t.id === "decidir" && pendientes > 0 && (
            <span className="nav-punto num" aria-label={`${pendientes} esperando`}>
              {pendientes}
            </span>
          )}
        </a>
      ))}
    </nav>
  )
}
