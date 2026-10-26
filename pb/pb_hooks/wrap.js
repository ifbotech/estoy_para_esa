// Los Wrapped: dos veces por año el servidor congela el período (los planes
// que se sumaron o se hicieron, sus votos, sus listas y el diario de
// actividad) en un registro de `wraps`, avisa por push y lo deja abierto unas
// semanas. La app arma las historias con esa foto (ver Wrapped.tsx), así que
// lo que se edite o se borre después no cambia lo que ya se contó.

// Argentina: los cortes del período van a la medianoche de acá (UTC−3).
const HUSO = 3
// Cuántos días queda abierto, como el de Spotify.
const DIAS_ABIERTO = 21

function iso(ms) {
  return new Date(ms).toISOString().replace("T", " ")
}

/** Desde y hasta (exclusivo) de un período, en ms. */
function rango(anio, tipo) {
  const desde = Date.UTC(anio, 0, 1, HUSO)
  const hasta = tipo === "mitad" ? Date.UTC(anio, 6, 1, HUSO) : Date.UTC(anio + 1, 0, 1, HUSO)
  return { desde, hasta }
}

function ms(s) {
  if (!s) return NaN
  return new Date(String(s).replace(" ", "T")).getTime()
}

function json(r, campo) {
  try {
    const v = r.getString(campo)
    return v ? JSON.parse(v) : null
  } catch (_) {
    return null
  }
}

function plan(r) {
  return {
    id: r.id,
    collectionId: r.collection().id,
    collectionName: "planes",
    titulo: r.getString("titulo"),
    categoria: r.getString("categoria"),
    estado: r.getString("estado"),
    datos: json(r, "datos"),
    portada: r.getString("portada"),
    fotos: r.getStringSlice("fotos"),
    cuando: r.getString("cuando"),
    hecho_en: r.getString("hecho_en"),
    creado_por: r.getString("creado_por"),
    created: r.getString("created"),
    updated: r.getString("updated"),
    notas: "",
    link: "",
  }
}

/**
 * Arma (o vuelve a armar) el Wrapped de `anio` y `tipo` («mitad» o «anio»)
 * y lo abre desde ahora por `dias`. Devuelve el registro guardado.
 */
function generar(app, anio, tipo, dias) {
  const { desde, hasta } = rango(anio, tipo)
  const enRango = (s) => {
    const t = ms(s)
    return t >= desde && t < hasta
  }

  const usuarios = app.findAllRecords("users").map((u) => ({
    id: u.id,
    collectionId: u.collection().id,
    name: u.getString("name"),
    slug: u.getString("slug"),
    color: u.getString("color"),
  }))
  const categorias = app.findAllRecords("categorias").map((c) => ({
    id: c.id,
    nombre: c.getString("nombre"),
    slug: c.getString("slug"),
    emoji: c.getString("emoji"),
    personalidad: c.getString("personalidad"),
    color: c.getString("color"),
    orden: c.getInt("orden"),
  }))

  const todos = app.findAllRecords("planes")
  // para el ritmo de siempre: cuándo se hizo cada cosa, desde el primer plan
  const historico = todos
    .filter((p) => p.getString("estado") === "hecho" && ms(p.getString("hecho_en")) < hasta)
    .map((p) => p.getString("hecho_en"))
  const delPeriodo = todos.filter((p) => enRango(p.getString("created")) || enRango(p.getString("hecho_en")))
  const ids = {}
  delPeriodo.forEach((p) => (ids[p.id] = true))

  const votos = app
    .findAllRecords("votos")
    .filter((v) => ids[v.getString("plan")])
    .map((v) => ({
      id: v.id,
      plan: v.getString("plan"),
      usuario: v.getString("usuario"),
      ganas: v.getFloat("ganas"),
      puntaje: v.getFloat("puntaje"),
      resena: v.getString("resena"),
      created: v.getString("created"),
      updated: v.getString("updated"),
    }))
  const items = app
    .findAllRecords("items")
    .filter((i) => ids[i.getString("plan")])
    .map((i) => ({ id: i.id, plan: i.getString("plan"), lista: i.getString("lista"), hecho: i.getBool("hecho") }))
  const actividad = app
    .findRecordsByFilter("actividad", "cuando >= {:d} && cuando < {:h}", "cuando", 0, 0, { d: iso(desde), h: iso(hasta) })
    .map((a) => ({
      tipo: a.getString("tipo"),
      cuando: a.getString("cuando"),
      plan: a.getString("plan"),
      titulo: a.getString("titulo"),
      categoria: a.getString("categoria"),
      usuario: a.getString("usuario"),
      datos: json(a, "datos") || {},
    }))

  const periodo = `${anio}-${tipo}`
  let r
  try {
    r = app.findFirstRecordByData("wraps", "periodo", periodo)
  } catch (_) {
    r = new Record(app.findCollectionByNameOrId("wraps"))
  }
  const ahora = Date.now()
  r.set("periodo", periodo)
  r.set("tipo", tipo)
  r.set("anio", anio)
  r.set("desde", iso(desde))
  r.set("hasta", iso(hasta))
  r.set("abre", iso(ahora - 60 * 1000))
  r.set("cierra", iso(ahora + (dias || DIAS_ABIERTO) * 24 * 3600 * 1000))
  r.set("datos", {
    generado: iso(ahora),
    usuarios,
    categorias,
    planes: delPeriodo.map(plan),
    votos,
    items,
    actividad,
    historico,
  })
  app.save(r)
  return r
}

/** El de la fecha: arma el Wrapped que toca y avisa a los dos. */
function deLaFecha(app, tipo) {
  const anio = new Date().getUTCFullYear()
  const r = generar(app, anio, tipo)
  require(`${__hooks}/util.js`).notificar(app, "", {
    title: tipo === "mitad" ? "🎁 ¡Llegó su Wrapped de mitad de año!" : `🎁 ¡Llegó su Wrapped ${anio}!`,
    body: "Todo lo que vivieron juntos, en historias. Está abierto unas semanas: no se lo pierdan.",
    url: "#/wrapped",
    tag: `wrap-${r.getString("periodo")}`,
  })
  app.logger().info("wrapped generado", "periodo", r.getString("periodo"))
  return r
}

module.exports = { generar, deLaFecha, rango }
