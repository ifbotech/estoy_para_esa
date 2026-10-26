import { useSyncExternalStore } from "react"
import { avisar } from "./componentes/Avisos"
import { editarPlan, votar } from "./store"
import { ESTADOS, type Estado, type Plan } from "./tipos"
import { festejar, festejoGrande, vibrar } from "./util/efectos"
import { sonar } from "./util/sonidos"

/** Doble toque: mis ganas a 100. El nombre de la app hecho gesto. */
export async function estoyParaEsa(planId: string, origen?: { clientX: number; clientY: number }) {
  vibrar([15, 30, 15])
  sonar("esa")
  if (origen) festejar(origen.clientX / innerWidth, origen.clientY / innerHeight, 0.9)
  await votar(planId, { ganas: 100 })
}

/** Cambia el estado de un plan y festeja si quedó hecho. */
export async function cambiarEstado(plan: Plan, estado: Estado, origen?: { clientX: number; clientY: number }) {
  if (estado === plan.estado) return
  vibrar(15)
  if (estado === "hecho") {
    sonar("hecho")
    festejoGrande()
    if (origen) festejar(origen.clientX / innerWidth, origen.clientY / innerHeight, 1.4)
    avisar("¡Lo hicieron! 🎉 Puntúenlo y suban fotos.")
  } else sonar("swish")
  await editarPlan(plan.id, { estado })
}

/** Deslizar: un paso adelante (+1) o atrás (-1). */
export function moverEstado(plan: Plan, dir: 1 | -1) {
  const i = ESTADOS.findIndex((e) => e.id === plan.estado)
  const j = Math.min(ESTADOS.length - 1, Math.max(0, i + dir))
  if (j === i) return
  void cambiarEstado(plan, ESTADOS[j].id)
  avisar(`${ESTADOS[j].emoji} «${plan.titulo}» → ${ESTADOS[j].nombre}`, "info")
}

// --- vista rápida (mantener apretado) --------------------------------------

let rapida: string | null = null
const oyentes = new Set<() => void>()

export function abrirVistaRapida(planId: string | null) {
  rapida = planId
  if (planId) vibrar(25)
  oyentes.forEach((o) => o())
}

export function useVistaRapida(): string | null {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb)
      return () => oyentes.delete(cb)
    },
    () => rapida,
  )
}

// Si se cambia de pantalla (atrás del teléfono, un link), la vista rápida se cierra.
window.addEventListener("hashchange", () => rapida && abrirVistaRapida(null))
