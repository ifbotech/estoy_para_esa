// Los avisos push de la app: qué se avisa, con qué palabras y a quién.
// Regla general: nunca te avisa de lo que hiciste vos (sólo al otro), cada
// aviso abre justo lo que cuenta (url) y los avisos del mismo tema se pisan
// (tag) para no llenar el teléfono.
//
// El envío lo hace Go en segundo plano ($epe.notificar, ver server/push.go).
// Los recordatorios salen de los cron de main.pb.js.

// Argentina: UTC−3 todo el año (sin horario de verano).
const DESFASE = -3 * 60 * 60 * 1000
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]

/** «2026-11-01 00:00:00.000Z» → { dia: "sáb 31/10", hora: "21:00", clave: "2026-10-31" } (hora de acá). */
function fechaAR(s) {
  if (!s) return null
  const t = new Date(String(s).replace(" ", "T")).getTime()
  if (isNaN(t)) return null
  const d = new Date(t + DESFASE)
  const p = (n) => String(n).padStart(2, "0")
  return {
    dia: `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
    hora: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`,
    clave: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`,
    ms: t,
  }
}

/** Una fecha para un filtro de PocketBase: «2026-10-27 12:00:00.000Z». */
function paraFiltro(ms) {
  return new Date(ms).toISOString().replace("T", " ")
}

function corto(s, n) {
  s = String(s || "").replace(/\s+/g, " ").trim()
  return s.length > n ? s.slice(0, n - 1) + "…" : s
}

function u() {
  return require(`${__hooks}/util.js`)
}

// --- planes -------------------------------------------------------------------

/**
 * Lo que cambió en un plan: estado (con el día, si lo agendaron), el día de
 * un plan agendado, o fotos nuevas. `antes` es { estado, cuando, fotos }.
 */
function planCambiado(app, plan, antes, autor) {
  const quien = u().nombre(app, autor)
  const titulo = plan.getString("titulo")
  const base = { url: `#/plan/${plan.id}`, tag: `plan-${plan.id}` }
  const ahora = plan.getString("estado")
  const cuando = fechaAR(plan.getString("cuando"))

  if (antes.estado !== ahora) {
    const textos = {
      agendado: ["📅 ¡Agendado!", cuando ? `${quien} agendó «${titulo}» para el ${cuando.dia} a las ${cuando.hora}.` : `${quien} agendó «${titulo}». Falta ponerle día.`],
      en_curso: ["🚧 ¡Arrancaron!", `${quien} puso «${titulo}» en curso.`],
      hecho: ["🎉 ¡Lo hicieron!", `«${titulo}» ya es un recuerdo. Puntualo y subí fotos.`],
      idea: ["💡 De vuelta a idea", `${quien} volvió «${titulo}» a la lista de ideas.`],
    }
    const [title, body] = textos[ahora] || ["Cambio de plan", `${quien} cambió «${titulo}».`]
    u().notificar(app, autor, { ...base, title, body })
  } else if (ahora === "agendado" && antes.cuando !== plan.getString("cuando")) {
    u().notificar(app, autor, {
      ...base,
      title: "📅 Cambió el día",
      body: cuando ? `${quien} movió «${titulo}» al ${cuando.dia}, ${cuando.hora}.` : `${quien} le sacó el día a «${titulo}».`,
    })
  }

  const fotos = plan.getStringSlice("fotos").length
  if (fotos > antes.fotos) {
    const n = fotos - antes.fotos
    u().notificar(app, autor, {
      url: `#/plan/${plan.id}`,
      tag: `fotos-${plan.id}`,
      title: "📸 Fotos nuevas",
      body: `${quien} subió ${n === 1 ? "una foto" : `${n} fotos`} de «${titulo}».`,
    })
  }
}

function planBorrado(app, plan, autor) {
  u().notificar(app, autor, {
    url: "#/planes",
    tag: `plan-${plan.id}`,
    title: "🗑 Plan borrado",
    body: `${u().nombre(app, autor)} borró «${plan.getString("titulo")}».`,
  })
}

// --- ítems de las listas --------------------------------------------------------

const LISTAS = {
  ideas: { nuevo: "💡 Idea nueva", lista: "las ideas" },
  valija: { nuevo: "🧳 A la valija", lista: "la valija", lista_lista: ["🧳 ¡Valija lista!", "Todo adentro para «%»."] },
  itinerario: { nuevo: "🗺️ Al itinerario", lista: "el itinerario", lista_lista: ["🗺️ Itinerario cumplido", "Hicieron todo lo de «%»."] },
  pasos: { nuevo: "🔨 Paso nuevo", lista: "los pasos", lista_lista: ["🔨 ¡Todos los pasos hechos!", "«%» está terminado. ¿Lo marcan hecho?"] },
  materiales: { nuevo: "🧰 Material nuevo", lista: "los materiales", lista_lista: ["🧰 Materiales completos", "Ya está todo para «%»."] },
  pedir: { nuevo: "🍽️ Para pedir", lista: "qué pedir" },
}

function itemNuevo(app, item, autor) {
  const plan = require(`${__hooks}/actividad.js`).planDe(app, item)
  if (!plan) return
  const l = LISTAS[item.getString("lista")] || { nuevo: "Algo nuevo", lista: "la lista" }
  const dia = item.getString("lista") === "itinerario" && item.getInt("dia") ? `Día ${item.getInt("dia")}: ` : ""
  u().notificar(app, autor, {
    url: `#/plan/${plan.id}`,
    // los que se cargan de a varios seguidos se pisan: llega el último
    tag: `items-${plan.id}-${item.getString("lista")}`,
    title: `${l.nuevo} · ${corto(plan.getString("titulo"), 40)}`,
    body: `${u().nombre(app, autor)} sumó a ${l.lista}: ${dia}${corto(item.getString("texto"), 120)}`,
  })
}

/** Al tachar el último ítem de una lista: ¡valija lista!, ¡pasos hechos!… */
function itemHecho(app, item, autor) {
  const l = LISTAS[item.getString("lista")]
  if (!l || !l.lista_lista) return
  const plan = require(`${__hooks}/actividad.js`).planDe(app, item)
  if (!plan) return
  let faltan = 1
  try {
    faltan = app.findRecordsByFilter("items", "plan = {:p} && lista = {:l} && hecho = false", "", 1, 0, {
      p: plan.id,
      l: item.getString("lista"),
    }).length
  } catch (_) {}
  if (faltan) return
  const [title, body] = l.lista_lista
  u().notificar(app, autor, {
    url: `#/plan/${plan.id}`,
    tag: `lista-${plan.id}-${item.getString("lista")}`,
    title,
    body: body.replace("%", plan.getString("titulo")),
  })
}

// --- categorías -------------------------------------------------------------------

function categoriaNueva(app, cat, autor) {
  u().notificar(app, autor, {
    url: "#/",
    tag: `categoria-${cat.id}`,
    title: "🏷 Categoría nueva",
    body: `${u().nombre(app, autor)} creó «${cat.getString("emoji")} ${cat.getString("nombre")}». Ya se pueden sumar planes ahí.`,
  })
}

// --- recordatorios (cron) ------------------------------------------------------------

/**
 * Cada 10 minutos: los planes agendados que empiezan dentro de la próxima
 * hora y cuarto reciben su «⏰ en un rato». Se anota para qué «cuándo» salió,
 * así no se repite (y si les cambian el día, se vuelve a avisar).
 */
function recordatorios(app) {
  const ahora = Date.now()
  let planes = []
  try {
    planes = app.findRecordsByFilter(
      "planes",
      "estado = 'agendado' && cuando != '' && cuando >= {:desde} && cuando <= {:hasta}",
      "cuando",
      20,
      0,
      { desde: paraFiltro(ahora), hasta: paraFiltro(ahora + 75 * 60 * 1000) },
    )
  } catch (err) {
    app.logger().warn("recordatorios: no se pudieron leer los planes", "error", String(err))
    return
  }
  for (const p of planes) {
    const cuando = p.getString("cuando")
    if (p.getString("recordatorio") === cuando) continue
    const f = fechaAR(cuando)
    if (!f) continue
    const minutos = Math.max(1, Math.round((f.ms - ahora) / 60000))
    u().notificar(app, "", {
      url: `#/plan/${p.id}`,
      tag: `recordatorio-${p.id}`,
      title: "⏰ En un rato",
      body: `«${p.getString("titulo")}» a las ${f.hora} (en ${minutos < 60 ? `${minutos} min` : "una hora"}).`,
      // si el teléfono estaba apagado y ya empezó, no tiene sentido que llegue
      ttl: Math.max(300, Math.round((f.ms - ahora) / 1000)),
    })
    p.set("recordatorio", cuando)
    try {
      app.saveNoValidate(p)
    } catch (err) {
      app.logger().warn("recordatorios: no se pudo anotar", "plan", p.id, "error", String(err))
    }
  }
}

/** Todas las mañanas (9:30): lo que tienen agendado para hoy. */
function resumenDelDia(app) {
  const hoy = fechaAR(new Date().toISOString())
  // de las 0:00 a las 24:00 de hoy, hora de acá
  const desde = new Date(hoy.clave + "T03:00:00Z").getTime()
  let planes = []
  try {
    planes = app.findRecordsByFilter(
      "planes",
      "estado = 'agendado' && cuando >= {:desde} && cuando < {:hasta}",
      "cuando",
      10,
      0,
      { desde: paraFiltro(desde), hasta: paraFiltro(desde + 24 * 60 * 60 * 1000) },
    )
  } catch (_) {
    return
  }
  if (!planes.length) return
  const primero = planes[0]
  const f = fechaAR(primero.getString("cuando"))
  const mas = planes.length > 1 ? ` y ${planes.length - 1} más` : ""
  u().notificar(app, "", {
    url: planes.length === 1 ? `#/plan/${primero.id}` : "#/planes",
    tag: `hoy-${hoy.clave}`,
    title: "☀️ Hoy hay plan",
    body: `«${primero.getString("titulo")}» a las ${f ? f.hora : "?"}${mas}.`,
    ttl: 12 * 60 * 60,
  })
}

/**
 * Todas las noches (20:00), a cada uno lo que espera algo de él: preguntas de
 * Decidir sin responder o sin elegir, y planes nuevos sin sus ganas. Sólo si
 * hay algo, y como mucho dos avisos.
 */
function empujoncitos(app) {
  let usuarios = []
  try {
    usuarios = app.findAllRecords("users")
  } catch (_) {
    return
  }
  const hace = (horas) => paraFiltro(Date.now() - horas * 60 * 60 * 1000)
  for (const yo of usuarios) {
    // Decidir: preguntas abiertas hace más de 3 horas
    const deberes = []
    try {
      const preguntas = app.findRecordsByFilter("preguntas", "estado = 'abierta' && created <= {:h}", "created", 20, 0, { h: hace(3) })
      for (const p of preguntas) {
        const mias = app.findRecordsByFilter("respuestas", "pregunta = {:p} && ronda = {:r} && usuario = {:u}", "", 1, 0, {
          p: p.id,
          r: p.getInt("ronda"),
          u: yo.id,
        })
        if (!mias.length) deberes.push(["responder", p])
        else if (!mias[0].getString("elige")) {
          const todas = app.findRecordsByFilter("respuestas", "pregunta = {:p} && ronda = {:r}", "", 2, 0, { p: p.id, r: p.getInt("ronda") })
          if (todas.length >= 2) deberes.push(["elegir", p])
        }
      }
    } catch (_) {}
    if (deberes.length) {
      const [que, p] = deberes[0]
      const mas = deberes.length > 1 ? ` (y ${deberes.length - 1} más)` : ""
      u().notificarA(app, yo.id, {
        url: "#/decidir",
        tag: "empujon-decidir",
        title: que === "responder" ? "❓ Te esperan en Decidir" : "👀 Falta que elijas",
        body: `«${p.getString("texto")}»${mas}.`,
        ttl: 12 * 60 * 60,
        urgencia: "normal",
      })
    }

    // planes de los últimos 3 días, del otro, sin tus ganas
    try {
      const nuevos = app.findRecordsByFilter(
        "planes",
        "estado != 'hecho' && created >= {:h} && creado_por != {:u}",
        "-created",
        20,
        0,
        { h: hace(72), u: yo.id },
      )
      const sinVoto = nuevos.filter((p) => {
        try {
          return !app.findRecordsByFilter("votos", "plan = {:p} && usuario = {:u}", "", 1, 0, { p: p.id, u: yo.id }).length
        } catch (_) {
          return false
        }
      })
      if (sinVoto.length) {
        u().notificarA(app, yo.id, {
          url: sinVoto.length === 1 ? `#/plan/${sinVoto[0].id}` : "#/planes",
          tag: "empujon-ganas",
          title: sinVoto.length === 1 ? "🙈 Un plan espera tus ganas" : `🙈 ${sinVoto.length} planes esperan tus ganas`,
          body: sinVoto.map((p) => `«${corto(p.getString("titulo"), 40)}»`).slice(0, 3).join(", ") + ". Se vota a ciegas.",
          ttl: 12 * 60 * 60,
          urgencia: "normal",
        })
      }
    } catch (_) {}
  }
}

module.exports = {
  fechaAR,
  paraFiltro,
  planCambiado,
  planBorrado,
  itemNuevo,
  itemHecho,
  categoriaNueva,
  recordatorios,
  resumenDelDia,
  empujoncitos,
}
