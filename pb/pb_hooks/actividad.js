// El diario de la app (colección `actividad`): lo que después cuentan los
// Wrapped. Nunca frena el cambio que lo dispara: si algo falla, se loguea.

/**
 * Anota algo que pasó. `plan` es el registro del plan (se copian su título y
 * categoría), `usuario` el id de quien lo hizo (o vacío) y `datos` lo propio
 * de cada tipo (las ganas, el puntaje, cuántas fotos…).
 */
function registrar(app, tipo, plan, usuario, datos) {
  try {
    const r = new Record(app.findCollectionByNameOrId("actividad"))
    r.set("tipo", tipo)
    r.set("cuando", new DateTime())
    if (plan) {
      r.set("plan", plan.id)
      r.set("titulo", plan.getString("titulo"))
      r.set("categoria", plan.getString("categoria"))
    }
    if (usuario) r.set("usuario", usuario)
    r.set("datos", datos || {})
    app.save(r)
  } catch (err) {
    app.logger().warn("no se pudo anotar la actividad", "tipo", tipo, "error", String(err))
  }
}

/** El plan de un voto o de un ítem (o null si ya no está). */
function planDe(app, record) {
  try {
    return app.findRecordById("planes", record.getString("plan"))
  } catch (_) {
    return null
  }
}

/** Qué cambió en un voto: ganas nuevas, match, puntaje, reseña. */
function voto(app, record, antes) {
  const plan = planDe(app, record)
  if (!plan) return
  const usuario = record.getString("usuario")
  const ganas = record.getFloat("ganas")
  if (!antes) registrar(app, "ganas", plan, usuario, { ganas })

  const ganasAntes = antes ? antes.ganas : 0
  if (ganas >= 85 && (!antes || ganasAntes < 85)) {
    try {
      const otros = app.findRecordsByFilter("votos", "plan = {:p} && usuario != {:u}", "", 1, 0, { p: plan.id, u: usuario })
      if (otros.length && otros[0].getFloat("ganas") >= 85) registrar(app, "match", plan, usuario, { ganas: [ganas, otros[0].getFloat("ganas")] })
    } catch (_) {}
  }
  const puntaje = record.getFloat("puntaje")
  if (puntaje > 0 && (!antes || antes.puntaje === 0)) registrar(app, "puntaje", plan, usuario, { puntaje })
  if (record.getString("resena") && (!antes || !antes.resena)) registrar(app, "resena", plan, usuario)
}

module.exports = { registrar, planDe, voto }
