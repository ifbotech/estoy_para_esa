// Avisos de los votos: un puntaje nuevo, un voto que espera el del otro, o
// muchas ganas. Las ganas son a ciegas: si el otro todavía no votó, el aviso
// no dice el número (lo destapa cuando vota).
function avisar(e, ganasAntes, puntajeAntes, nuevo, resenaAntes) {
  const u = require(`${__hooks}/util.js`)
  const ganas = e.record.getFloat("ganas")
  const puntaje = e.record.getFloat("puntaje")
  let plan
  try {
    plan = e.app.findRecordById("planes", e.record.getString("plan"))
  } catch (_) {
    return
  }
  const quien = u.nombre(e.app, e.record.getString("usuario"))
  const titulo = plan.getString("titulo")
  const base = { url: `#/plan/${plan.id}`, tag: `voto-${plan.id}` }

  const resena = e.record.getString("resena").trim()
  if (resena && !String(resenaAntes || "").trim()) {
    u.notificar(e.app, e.record.getString("usuario"), {
      ...base,
      tag: `resena-${plan.id}`,
      title: `✍️ ${quien} escribió su reseña`,
      body: `«${titulo}»: ${resena.length > 140 ? resena.slice(0, 139) + "…" : resena}`,
    })
  }

  if (puntaje > 0 && puntajeAntes === 0) {
    const estrellas = "★".repeat(Math.floor(puntaje)) + (puntaje % 1 ? "½" : "")
    u.notificar(e.app, e.record.getString("usuario"), {
      ...base,
      title: `${quien} puntuó ${estrellas}`,
      body: `«${titulo}». ¿Y vos qué le ponés?`,
    })
  } else if (nuevo || (ganas >= 80 && ganasAntes < 80)) {
    const usuario = e.record.getString("usuario")
    let otro = null
    try {
      const vs = e.app.findRecordsByFilter("votos", "plan = {:p} && usuario != {:u}", "", 1, 0, { p: plan.id, u: usuario })
      otro = vs.length ? vs[0] : null
    } catch (_) {}
    if (!otro) {
      // Quien crea un plan vota enseguida: ya salió el aviso de «plancito nuevo».
      const creado = new Date(plan.getString("created").replace(" ", "T")).getTime()
      if (plan.getString("creado_por") === usuario && Date.now() - creado < 2 * 60 * 1000) return
      u.notificar(e.app, usuario, {
        ...base,
        title: `${quien} ya votó sus ganas 🙈`,
        body: `«${titulo}». Votá vos para destapar su número.`,
      })
      return
    }
    if (ganas >= 85 && otro.getFloat("ganas") >= 85) {
      u.notificar(e.app, usuario, {
        ...base,
        title: "🔥 ¡Match total!",
        body: `${quien} también está re para «${titulo}». ¿Lo agendan?`,
      })
      return
    }
    if (ganas < 80) return
    u.notificar(e.app, e.record.getString("usuario"), {
      ...base,
      title: `🔥 ${quien} está re para esa`,
      body: `${Math.round(ganas)}% de ganas de «${titulo}».`,
    })
  }
}

module.exports = { avisar }
