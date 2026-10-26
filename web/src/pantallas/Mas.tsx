import { useEffect, useState } from "react"
import { avisar } from "../componentes/Avisos"
import { Boton } from "../componentes/Controles"
import { Bloque } from "../componentes/Deco"
import { colorDe } from "../componentes/Tarjetas"
import { BASE } from "../pb"
import { editarPerfil, terminar, useStore, useYo } from "../store"
import versiones from "../versiones.json"
import { prenderSonidos, sonidosPrendidos } from "../util/sonidos"
import { activarPush, desactivarPush, esIOSSinInstalar, probarPush, pushDisponible, suscripcionActual } from "../util/push"
import { Archivo } from "./mas/Archivo"
import { Categorias } from "./mas/Categorias"
import { Letterboxd } from "./mas/Letterboxd"

/**
 * Más: lo utilitario y nada más. Categorías, Letterboxd, avisos y el
 * archivo de versiones. El diseño es fijo desde la v3: no hay editor de temas.
 */
const OPCIONES = [
  { id: "categorias", num: "01", titulo: "Categorías", texto: "Crear, renombrar, ordenar y elegirles personalidad." },
  { id: "letterboxd", num: "02", titulo: "Letterboxd", texto: "Traer su diario y marcar como vistas las pelis de la lista." },
  { id: "avisos", num: "03", titulo: "Avisos", texto: "Notificaciones cuando el otro suma, vota o puntúa." },
  { id: "archivo", num: "04", titulo: "Archivo de versiones", texto: "Todas las versiones de la app, para volver a mirarlas." },
]

export function Mas({ sub }: { sub?: string }) {
  if (sub === "categorias") return <Sub titulo="Categorías"><Categorias /></Sub>
  if (sub === "letterboxd") return <Sub titulo="Letterboxd"><Letterboxd /></Sub>
  if (sub === "avisos") return <Sub titulo="Avisos"><Avisos /></Sub>
  if (sub === "archivo") return <Sub titulo="Archivo"><Archivo /></Sub>
  return <Menu />
}

function Sub({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="sub">
      <header className="cabeza-pantalla">
        <div>
          <p className="etiqueta">más</p>
          <h1 className="titulo-pantalla">{titulo}</h1>
        </div>
      </header>
      {children}
    </div>
  )
}

function Menu() {
  return (
    <div className="mas">
      <header className="cabeza-pantalla">
        <div>
          <p className="etiqueta">ajustes</p>
          <h1 className="titulo-pantalla">Más</h1>
        </div>
      </header>

      <nav className="opciones" aria-label="Ajustes">
        {OPCIONES.map((o) => (
          <a key={o.id} href={`#/mas/${o.id}`} className="opcion">
            <span className="opcion-num num">{o.num}</span>
            <span className="opcion-texto">
              <b>{o.titulo}</b>
              <small>{o.texto}</small>
            </span>
            <span className="opcion-flecha" aria-hidden>
              →
            </span>
          </a>
        ))}
      </nav>

      <Cuenta />
    </div>
  )
}

/** Lo mínimo de la cuenta: tu color, sonidos, instalar y salir. */
function Cuenta() {
  const yo = useYo()
  const usuarios = useStore((s) => s.usuarios)
  const i = Math.max(0, usuarios.findIndex((u) => u.id === yo?.id))
  const [sonidos, setSonidos] = useState(sonidosPrendidos)
  return (
    <Bloque titulo="Cuenta" accion={<span className="etiqueta">{versiones[0].id} · {versiones[0].nombre}</span>}>
      <div className="cuenta-fila">
        <span className="cuenta-inicial" style={{ background: colorDe(yo ?? undefined, i) }}>
          {yo?.name?.[0]}
        </span>
        <span className="cuenta-nombre">{yo?.name}</span>
        <label className="cuenta-color">
          <span className="etiqueta">tu color</span>
          <input type="color" defaultValue={colorDe(yo ?? undefined, i)} onChange={(e) => editarPerfil({ color: e.target.value })} aria-label="Tu color en las barras de ganas" />
        </label>
      </div>
      <label className="interruptor">
        <span>Sonidos al tocar y votar (en este teléfono)</span>
        <input
          type="checkbox"
          checked={sonidos}
          onChange={(e) => {
            setSonidos(e.target.checked)
            prenderSonidos(e.target.checked)
          }}
        />
      </label>
      <p className="nota-pie">
        Para tenerla en el inicio del iPhone: abrila en Safari → <b>Compartir</b> → <b>Agregar a inicio</b>.
      </p>
      <div className="fila">
        <a className="boton boton-chico boton-secundario" href={`${BASE}/_/`} target="_blank" rel="noreferrer">
          Panel de datos ↗
        </a>
        <Boton
          variante="secundario"
          className="boton-chico"
          onClick={async () => {
            if (!confirm("¿Cerrar sesión en este teléfono?")) return
            await terminar()
          }}
        >
          Cerrar sesión
        </Boton>
      </div>
    </Bloque>
  )
}

function Avisos() {
  const [activo, setActivo] = useState<boolean | null>(null)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    suscripcionActual().then((s) => setActivo(Boolean(s)))
  }, [])

  if (esIOSSinInstalar())
    return (
      <Bloque titulo="En iPhone">
        <p>Los avisos andan con la app agregada a la pantalla de inicio. Abrila en Safari → Compartir → Agregar a inicio, y activalos desde ahí.</p>
      </Bloque>
    )
  if (!pushDisponible())
    return (
      <Bloque titulo="No disponible">
        <p>Este navegador no soporta avisos.</p>
      </Bloque>
    )
  return (
    <Bloque titulo="Avisos de este teléfono" accion={<span className="num">{activo ? "ON" : "OFF"}</span>}>
      <label className="interruptor">
        <span>Avisarme cuando el otro suma un plan, vota (a ciegas, sin el número) o puntúa</span>
        <input
          type="checkbox"
          checked={Boolean(activo)}
          disabled={ocupado || activo === null}
          onChange={async (e) => {
            setOcupado(true)
            if (e.target.checked) {
              const r = await activarPush()
              if (r === "ok") {
                setActivo(true)
                avisar("Avisos activados 🔔")
              } else avisar(r === "denegado" ? "El teléfono no dio permiso 🙈" : "No se pudieron activar", "error")
            } else {
              await desactivarPush()
              setActivo(false)
            }
            setOcupado(false)
          }}
        />
      </label>
      {activo && (
        <Boton variante="secundario" className="boton-chico" onClick={() => probarPush().then(() => avisar("Mandé un aviso de prueba 📨"))}>
          Mandar uno de prueba
        </Boton>
      )}
    </Bloque>
  )
}
