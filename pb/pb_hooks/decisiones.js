// Decidir: lo que el servidor controla y resuelve. Ver la migración
// 1762100000_decisiones.js para las colecciones y quién ve qué.

/** Las respuestas de una ronda (de los dos, si ya están). */
function deLaRonda(app, preguntaId, ronda) {
  return app.findRecordsByFilter("respuestas", "pregunta = {:p} && ronda = {:r}", "created", 10, 0, { p: preguntaId, r: ronda })
}

/**
 * Antes de guardar un cambio en una respuesta: se elige sólo cuando están las
 * dos (y entre esas dos, u «otra»), y una vez destapadas ya no se reescriben.
 */
function validarCambio(e) {
  const r = e.record
  const o = r.original()
  const todas = deLaRonda(e.app, r.getString("pregunta"), r.getInt("ronda"))
  const dos = todas.length >= 2
  if (r.getString("texto") !== o.getString("texto") && dos) {
    throw new BadRequestError("Las respuestas ya están a la vista: no se pueden cambiar.")
  }
  const elige = r.getString("elige")
  if (elige && elige !== o.getString("elige")) {
    if (!dos) throw new BadRequestError("Todavía falta la otra respuesta.")
    if (elige !== "otra" && !todas.some((x) => x.id === elige)) throw new BadRequestError("Esa respuesta no es de esta ronda.")
  }
}

/** Una moneda que da lo mismo para los dos: sale de la pregunta y la ronda. */
function moneda(preguntaId, ronda) {
  let n = ronda
  for (const c of preguntaId) n = (n * 31 + c.charCodeAt(0)) % 1000003
  return n % 2
}

/**
 * Después de que alguien elige: si ya eligieron los dos, se resuelve.
 * Misma respuesta → decidida. Alguno pidió «otra» → ronda nueva. Cada uno
 * eligió una distinta → desempata la moneda.
 */
function resolver(app, respuesta, autor) {
  const u = require(`${__hooks}/util.js`)
  let p
  try {
    p = app.findRecordById("preguntas", respuesta.getString("pregunta"))
  } catch (_) {
    return
  }
  const ronda = respuesta.getInt("ronda")
  if (p.getString("estado") !== "abierta" || p.getInt("ronda") !== ronda) return
  const todas = deLaRonda(app, p.id, ronda)
  if (todas.length < 2) return
  const quien = u.nombre(app, autor)
  const titulo = p.getString("texto")
  const base = { url: "#/decidir", tag: `decidir-${p.id}` }

  const elecciones = todas.map((x) => x.getString("elige"))
  if (elecciones.some((x) => !x)) {
    u.notificar(app, autor, { ...base, title: `${quien} ya eligió 👀`, body: `«${titulo}». Falta lo tuyo.` })
    return
  }

  if (elecciones.includes("otra")) {
    p.set("ronda", ronda + 1)
    p.set("respondieron", [])
    app.save(p)
    u.notificar(app, "", { ...base, title: "🔁 Otra ronda", body: `«${titulo}»: ninguna tentó. Cada uno pone una opción nueva.` })
    return
  }

  let ganadora
  let desempate = false
  if (elecciones[0] === elecciones[1]) ganadora = todas.find((x) => x.id === elecciones[0])
  else {
    desempate = true
    ganadora = todas.find((x) => x.id === elecciones[moneda(p.id, ronda)])
  }
  if (!ganadora) return
  p.set("estado", "decidida")
  p.set("elegida", ganadora.getString("texto"))
  p.set("desempate", desempate)
  p.set("decidida_en", new DateTime())
  app.save(p)

  require(`${__hooks}/actividad.js`).registrar(app, "decidido", null, autor, {
    pregunta: titulo,
    elegida: ganadora.getString("texto"),
    rondas: ronda,
    desempate,
  })
  u.notificar(app, "", {
    ...base,
    title: desempate ? "🪙 Lo decidió la moneda" : "✅ ¡Decidido!",
    body: `«${titulo}»: ${ganadora.getString("texto")}`,
  })
}

/** Avisos al responder: que falta el otro, o que ya se puede elegir. */
function alResponder(app, respuesta, autor) {
  const u = require(`${__hooks}/util.js`)
  let p
  try {
    p = app.findRecordById("preguntas", respuesta.getString("pregunta"))
  } catch (_) {
    return
  }
  const todas = deLaRonda(app, p.id, respuesta.getInt("ronda"))
  p.set("respondieron", todas.map((x) => x.getString("usuario")))
  app.save(p)
  const quien = u.nombre(app, autor)
  const base = { url: "#/decidir", tag: `decidir-${p.id}` }
  if (todas.length < 2) {
    u.notificar(app, autor, { ...base, title: `${quien} ya respondió 🙈`, body: `«${p.getString("texto")}». Respondé vos para destapar las dos.` })
  } else {
    u.notificar(app, autor, { ...base, title: "¡Están las dos respuestas!", body: `«${p.getString("texto")}». Elegí la que más te copa.` })
  }
}

module.exports = { validarCambio, resolver, alResponder, moneda }
