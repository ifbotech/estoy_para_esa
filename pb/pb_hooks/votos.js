// Avisos de los votos: muchas ganas (80 o más) o un puntaje nuevo.
function avisar(e, ganasAntes, puntajeAntes) {
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

  if (puntaje > 0 && puntajeAntes === 0) {
    const estrellas = "★".repeat(Math.floor(puntaje)) + (puntaje % 1 ? "½" : "")
    u.notificar(e.app, e.record.getString("usuario"), {
      ...base,
      title: `${quien} puntuó ${estrellas}`,
      body: `«${titulo}». ¿Y vos qué le ponés?`,
    })
  } else if (ganas >= 80 && ganasAntes < 80) {
    u.notificar(e.app, e.record.getString("usuario"), {
      ...base,
      title: `🔥 ${quien} está re para esa`,
      body: `${Math.round(ganas)}% de ganas de «${titulo}».`,
    })
  }
}

module.exports = { avisar }
