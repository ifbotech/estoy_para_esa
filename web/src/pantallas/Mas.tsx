import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { Arte } from "../componentes/Arte"
import { avisar } from "../componentes/Avisos"
import { Boton } from "../componentes/Controles"
import { TituloCinetico } from "../componentes/Deco"
import { colorDe } from "../componentes/Tarjetas"
import { BASE } from "../pb"
import { volver } from "../router"
import { editarPerfil, terminar, useStore, useYo } from "../store"
import versiones from "../versiones.json"
import { prenderSonidos, sonidosPrendidos } from "../util/sonidos"
import { activarPush, desactivarPush, esIOSSinInstalar, probarPush, pushDisponible, suscripcionActual } from "../util/push"
import { EditorTema } from "./mas/EditorTema"
import { Archivo } from "./mas/Archivo"
import { Categorias } from "./mas/Categorias"
import { Letterboxd } from "./mas/Letterboxd"

const OPCIONES = [
  { id: "tema", titulo: "Tema", texto: "Colores, letras, grano y movimiento. Cada cambio queda guardado como versión.", arte: "estrella" as const },
  { id: "archivo", titulo: "Archivo de versiones", texto: "Todas las versiones de la app y de los temas, para volver a mirarlas.", arte: "cine" as const },
  { id: "categorias", titulo: "Categorías", texto: "Crear, renombrar y elegirles personalidad.", arte: "taller" as const },
  { id: "letterboxd", titulo: "Letterboxd", texto: "Traer su diario y marcar como vistas las pelis de la lista.", arte: "cine" as const },
]

export function Mas({ sub }: { sub?: string }) {
  if (sub === "tema") return <Sub titulo="Tema"><EditorTema /></Sub>
  if (sub === "archivo") return <Sub titulo="Archivo"><Archivo /></Sub>
  if (sub === "categorias") return <Sub titulo="Categorías"><Categorias /></Sub>
  if (sub === "letterboxd") return <Sub titulo="Letterboxd"><Letterboxd /></Sub>
  return <Menu />
}

function Sub({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="sub">
      <button className="volver" onClick={() => volver("/mas")}>
        ← Más
      </button>
      <TituloCinetico texto={titulo} className="sub-titulo" />
      {children}
    </div>
  )
}

function Menu() {
  const yo = useYo()
  const usuarios = useStore((s) => s.usuarios)
  const i = usuarios.findIndex((u) => u.id === yo?.id)
  return (
    <div className="mas">
      <section className="capitulo" style={{ "--cap": "var(--manteca)" } as React.CSSProperties}>
        <TituloCinetico lineas={["Más", "cosas"]} asoma="taller" />
      </section>

      <section className="perfil" style={{ "--c": colorDe(yo ?? undefined, Math.max(0, i)) } as React.CSSProperties}>
        <span className="perfil-blob">{yo?.name?.[0]}</span>
        <div className="perfil-campos">
          <label className="campo-etiqueta">
            <span>Tu nombre</span>
            <input className="campo" defaultValue={yo?.name} onBlur={(e) => e.target.value.trim() && e.target.value !== yo?.name && editarPerfil({ name: e.target.value.trim() })} />
          </label>
          <div className="grid2">
            <label className="campo-etiqueta">
              <span>Tu color</span>
              <input className="campo campo-color" type="color" defaultValue={yo?.color || "#ff4fa3"} onChange={(e) => editarPerfil({ color: e.target.value })} />
            </label>
            <label className="campo-etiqueta">
              <span>Usuario Letterboxd</span>
              <input className="campo" placeholder="tu_usuario" defaultValue={yo?.letterboxd} onBlur={(e) => e.target.value !== (yo?.letterboxd ?? "") && editarPerfil({ letterboxd: e.target.value.trim().replace(/^@/, "") })} />
            </label>
          </div>
        </div>
      </section>

      <div className="opciones">
        {OPCIONES.map((o, j) => (
          <motion.a
            key={o.id}
            href={`#/mas/${o.id}`}
            className="opcion"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: j * 0.06 }}
            whileTap={{ scale: 0.97 }}
          >
            <Arte tipo={o.arte} tam={7} />
            <div>
              <h3>{o.titulo}</h3>
              <p className="suave">{o.texto}</p>
            </div>
            <span className="opcion-flecha">→</span>
          </motion.a>
        ))}
      </div>

      <Avisos />
      <Sonidos />

      <section className="seccion bloque">
        <div className="seccion-cabeza">
          <h2>La app</h2>
          <span className="etiqueta">
            {versiones[0].id} · {versiones[0].nombre}
          </span>
        </div>
        <p className="suave">
          Para agregarla al inicio del iPhone: abrila en Safari, tocá <b>Compartir</b> y después <b>Agregar a inicio</b>.
        </p>
        <div className="fila" style={{ marginTop: 14, flexWrap: "wrap" }}>
          <a className="boton boton-chico boton-fantasma" href={`${BASE}/_/`} target="_blank" rel="noreferrer">
            Panel de datos ↗
          </a>
          <Boton
            variante="fantasma"
            className="boton-chico"
            onClick={async () => {
              if (!confirm("¿Cerrar sesión en este teléfono?")) return
              await terminar()
            }}
          >
            Cerrar sesión
          </Boton>
        </div>
      </section>
    </div>
  )
}

function Sonidos() {
  const [si, setSi] = useState(sonidosPrendidos)
  return (
    <section className="seccion bloque">
      <div className="seccion-cabeza">
        <h2>Sonidos</h2>
      </div>
      <label className="interruptor">
        <span>Ruiditos al tocar, al votar y al hacer un plan (en este teléfono)</span>
        <input
          type="checkbox"
          checked={si}
          onChange={(e) => {
            setSi(e.target.checked)
            prenderSonidos(e.target.checked)
          }}
        />
      </label>
    </section>
  )
}

function Avisos() {
  const [activo, setActivo] = useState<boolean | null>(null)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    suscripcionActual().then((s) => setActivo(Boolean(s)))
  }, [])

  if (!pushDisponible() && !esIOSSinInstalar()) return null
  return (
    <section className="seccion bloque">
      <div className="seccion-cabeza">
        <h2>Avisos</h2>
      </div>
      {esIOSSinInstalar() ? (
        <p className="suave">En iPhone los avisos andan con la app agregada a la pantalla de inicio. Agregala y activalos desde ahí.</p>
      ) : (
        <>
          <label className="interruptor">
            <span>Avisarme cuando el otro suma un plan, vota con muchas ganas o puntúa</span>
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
            <Boton variante="fantasma" className="boton-chico" onClick={() => probarPush().then(() => avisar("Mandé un aviso de prueba 📨"))}>
              Mandar uno de prueba
            </Boton>
          )}
        </>
      )}
    </section>
  )
}
