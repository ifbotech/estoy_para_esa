import { useState } from "react"
import { Arte } from "../../componentes/Arte"
import { avisar } from "../../componentes/Avisos"
import { Boton, Hoja } from "../../componentes/Controles"
import { PERSONALIDADES } from "../../personalidades"
import { borrarCategoria, guardarCategoria, useStore } from "../../store"
import type { Categoria, Personalidad } from "../../tipos"

const VACIA: Partial<Categoria> = { nombre: "", emoji: "✨", personalidad: "salida", color: "#F5D547" }

function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cat"
}

export function Categorias() {
  const categorias = useStore((s) => s.categorias)
  const planes = useStore((s) => s.planes)
  const [editando, setEditando] = useState<Partial<Categoria> | null>(null)

  const mover = async (i: number, d: number) => {
    const a = categorias[i]
    const b = categorias[i + d]
    if (!a || !b) return
    await guardarCategoria({ id: a.id, orden: b.orden })
    await guardarCategoria({ id: b.id, orden: a.orden })
  }

  const guardar = async () => {
    if (!editando?.nombre?.trim()) return
    const datos = { ...editando, nombre: editando.nombre.trim() }
    if (!datos.id) {
      let s = slug(datos.nombre)
      while (categorias.some((c) => c.slug === s)) s += "-2"
      datos.slug = s
      datos.orden = Math.max(0, ...categorias.map((c) => c.orden)) + 1
    }
    if (await guardarCategoria(datos)) {
      avisar(datos.id ? "Categoría actualizada" : "Categoría nueva ✨")
      setEditando(null)
    }
  }

  return (
    <div className="categorias-editor">
      <p className="suave">La personalidad define cómo se ve y qué funciones especiales trae (Letterboxd, mapa, itinerario, pasos…).</p>
      <div className="lista-cats">
        {categorias.map((c, i) => (
          <div key={c.id} className="cat-fila" style={{ "--cc": c.color || "var(--amarillo)" } as React.CSSProperties}>
            <Arte tipo={c.personalidad} tam={5} />
            <div className="cat-fila-texto">
              <b>
                {c.emoji} {c.nombre}
              </b>
              <small>
                {PERSONALIDADES[c.personalidad].nombre} · {planes.filter((p) => p.categoria === c.id).length} planes
              </small>
            </div>
            <div className="cat-fila-acciones">
              <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
                ↑
              </button>
              <button onClick={() => mover(i, 1)} disabled={i === categorias.length - 1} aria-label="Bajar">
                ↓
              </button>
              <button onClick={() => setEditando(c)} aria-label="Editar">
                ✎
              </button>
            </div>
          </div>
        ))}
      </div>
      <Boton className="boton-grande" onClick={() => setEditando({ ...VACIA })}>
        + Nueva categoría
      </Boton>

      <Hoja
        abierta={Boolean(editando)}
        onCerrar={() => setEditando(null)}
        titulo={editando?.id ? "Editar categoría" : "Nueva categoría"}
        pie={
          <Boton className="boton-grande" onClick={guardar} disabled={!editando?.nombre?.trim()}>
            Guardar
          </Boton>
        }
      >
        {editando && (
          <div className="nuevo-form">
            <div className="grid2" style={{ gridTemplateColumns: "90px 1fr" }}>
              <label className="campo-etiqueta">
                <span>Emoji</span>
                <input className="campo campo-grande" style={{ textAlign: "center" }} value={editando.emoji} onChange={(e) => setEditando({ ...editando, emoji: e.target.value })} />
              </label>
              <label className="campo-etiqueta">
                <span>Nombre</span>
                <input className="campo campo-grande" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} placeholder="Museos" />
              </label>
            </div>
            <label className="campo-etiqueta">
              <span>Color</span>
              <input className="campo campo-color" type="color" value={editando.color || "#F5D547"} onChange={(e) => setEditando({ ...editando, color: e.target.value })} />
            </label>
            <p className="etiqueta">Personalidad</p>
            <div className="grid2">
              {(Object.keys(PERSONALIDADES) as Personalidad[]).map((p) => (
                <button
                  key={p}
                  className={`ficha nuevo-cat-ficha ${editando.personalidad === p ? "elegido" : ""}`}
                  style={{ "--cc": editando.color || "var(--amarillo)" } as React.CSSProperties}
                  onClick={() => setEditando({ ...editando, personalidad: p })}
                >
                  <Arte tipo={p} tam={7} />
                  <h3>{PERSONALIDADES[p].nombre}</h3>
                  <small>{PERSONALIDADES[p].descripcion}</small>
                </button>
              ))}
            </div>
            {editando.id && (
              <Boton
                variante="peligro"
                onClick={async () => {
                  if (!confirm(`¿Borrar «${editando.nombre}»? Sólo se puede si no tiene planes.`)) return
                  await borrarCategoria(editando.id!)
                  setEditando(null)
                }}
              >
                Borrar categoría
              </Boton>
            )}
          </div>
        )}
      </Hoja>
    </div>
  )
}
