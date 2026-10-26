/// <reference path="../pb_data/types.d.ts" />

// --- planes: quién lo creó, cuándo se hizo, y avisos -----------------------

onRecordCreateRequest((e) => {
  if (e.auth) e.record.set("creado_por", e.auth.id)
  if (!e.record.getString("estado")) e.record.set("estado", "idea")
  e.next()

  const a = require(`${__hooks}/actividad.js`)
  a.registrar(e.app, "plan_nuevo", e.record, e.auth ? e.auth.id : "")
  if (e.record.getString("estado") !== "idea") a.registrar(e.app, e.record.getString("estado"), e.record, e.auth ? e.auth.id : "")

  const u = require(`${__hooks}/util.js`)
  const quien = u.nombre(e.app, e.auth ? e.auth.id : "")
  u.notificar(e.app, e.auth ? e.auth.id : "", {
    title: "Plancito nuevo ✨",
    body: `${quien} sumó «${e.record.getString("titulo")}». ¿Cuántas ganas tenés?`,
    url: `#/plan/${e.record.id}`,
    tag: `plan-${e.record.id}`,
  })
}, "planes")

onRecordUpdateRequest((e) => {
  const antes = e.record.original().getString("estado")
  const fotosAntes = e.record.original().getStringSlice("fotos").length
  e.next()
  const ahora = e.record.getString("estado")
  const autor = e.auth ? e.auth.id : ""
  const a = require(`${__hooks}/actividad.js`)
  const fotos = e.record.getStringSlice("fotos").length
  if (fotos > fotosAntes) a.registrar(e.app, "fotos", e.record, autor, { cantidad: fotos - fotosAntes })
  if (antes === ahora) return
  a.registrar(e.app, ahora === "idea" ? "a_idea" : ahora, e.record, autor, { antes })

  const u = require(`${__hooks}/util.js`)
  const quien = u.nombre(e.app, e.auth ? e.auth.id : "")
  const titulo = e.record.getString("titulo")
  const textos = {
    agendado: [`📅 Agendado`, `${quien} agendó «${titulo}».`],
    en_curso: [`🚧 Arrancaron`, `«${titulo}» está en curso.`],
    hecho: [`🎉 ¡Lo hicieron!`, `«${titulo}» ya es un recuerdo. ¿Qué tal estuvo?`],
    idea: [`💡 De vuelta a idea`, `«${titulo}» volvió a la lista de ideas.`],
  }
  const [title, body] = textos[ahora] || ["Cambio de plan", titulo]
  u.notificar(e.app, e.auth ? e.auth.id : "", { title, body, url: `#/plan/${e.record.id}`, tag: `plan-${e.record.id}` })
}, "planes")

onRecordDeleteRequest((e) => {
  const plan = e.record
  e.next()
  require(`${__hooks}/actividad.js`).registrar(e.app, "borrado", plan, e.auth ? e.auth.id : "", { estado: plan.getString("estado") })
}, "planes")

// hecho_en lo pone el servidor: es lo que usan los recuerdos y el Wrapped.
onRecordCreate((e) => {
  if (e.record.getString("estado") === "hecho" && !e.record.getString("hecho_en")) {
    e.record.set("hecho_en", new DateTime())
  }
  e.next()
}, "planes")

onRecordUpdate((e) => {
  const estado = e.record.getString("estado")
  const antes = e.record.original().getString("estado")
  if (estado === "hecho" && antes !== "hecho" && !e.record.getString("hecho_en")) {
    e.record.set("hecho_en", new DateTime())
  }
  if (estado !== "hecho" && antes === "hecho") {
    e.record.set("hecho_en", "")
  }
  e.next()
}, "planes")

// --- votos: avisar cuando alguien tiene muchas ganas o puntúa ---------------

onRecordCreateRequest((e) => {
  e.next()
  require(`${__hooks}/actividad.js`).voto(e.app, e.record, null)
  require(`${__hooks}/votos.js`).avisar(e, 0, 0, true)
}, "votos")

onRecordUpdateRequest((e) => {
  const o = e.record.original()
  const antes = { ganas: o.getFloat("ganas"), puntaje: o.getFloat("puntaje"), resena: o.getString("resena") }
  e.next()
  require(`${__hooks}/actividad.js`).voto(e.app, e.record, antes)
  require(`${__hooks}/votos.js`).avisar(e, antes.ganas, antes.puntaje, false)
}, "votos")

// --- ítems: cada paso tachado (valija, proyecto, itinerario) va al diario ---

onRecordUpdateRequest((e) => {
  const antes = e.record.original().getBool("hecho")
  e.next()
  if (antes || !e.record.getBool("hecho")) return
  const a = require(`${__hooks}/actividad.js`)
  const plan = a.planDe(e.app, e.record)
  if (plan) a.registrar(e.app, "item_hecho", plan, e.auth ? e.auth.id : "", { lista: e.record.getString("lista"), texto: e.record.getString("texto") })
}, "items")

// --- Wrapped: a mitad y a fin de año (12:00 UTC = 9 de la mañana acá) -------

cronAdd("wrap-mitad", "0 12 30 6 *", () => {
  require(`${__hooks}/wrap.js`).deLaFecha($app, "mitad")
})

cronAdd("wrap-anio", "0 12 31 12 *", () => {
  require(`${__hooks}/wrap.js`).deLaFecha($app, "anio")
})

// --- temas: número de versión y un solo tema activo ------------------------

onRecordCreate((e) => {
  let max = 0
  try {
    const r = e.app.findRecordsByFilter("temas", "version > 0", "-version", 1, 0)
    if (r.length) max = r[0].getInt("version")
  } catch (_) {}
  e.record.set("version", max + 1)
  e.next()
}, "temas")

onRecordAfterCreateSuccess((e) => {
  require(`${__hooks}/temas.js`).unicoActivo(e)
  e.next()
}, "temas")

onRecordAfterUpdateSuccess((e) => {
  require(`${__hooks}/temas.js`).unicoActivo(e)
  e.next()
}, "temas")

// --- rutas propias ----------------------------------------------------------

routerAdd("GET", "/api/epe/salud", (e) => {
  return e.json(200, { ok: true, app: "estoyparaesa" })
})

// Para probar o rehacer un Wrapped a mano (sólo desde el panel de datos):
// POST {"anio": 2026, "tipo": "mitad" | "anio", "dias": 21, "avisar": false}
routerAdd("POST", "/api/epe/wrap/generar", (e) => {
  const w = require(`${__hooks}/wrap.js`)
  const b = e.requestInfo().body || {}
  const anio = parseInt(b.anio, 10) || new Date().getUTCFullYear()
  const tipo = b.tipo === "mitad" ? "mitad" : "anio"
  const r = b.avisar ? w.deLaFecha(e.app, tipo) : w.generar(e.app, anio, tipo, parseFloat(b.dias) || 0)
  return e.json(200, { periodo: r.getString("periodo"), abre: r.getString("abre"), cierra: r.getString("cierra") })
}, $apis.requireSuperuserAuth())

routerAdd("GET", "/api/epe/push/clave", (e) => {
  return e.json(200, { clave: $epe.vapidPublicKey() })
})

routerAdd("POST", "/api/epe/push/probar", (e) => {
  const subs = e.app.findRecordsByFilter("push_subs", "usuario = {:u}", "", 20, 0, { u: e.auth.id })
  const res = subs.map((s) => $epe.webpush(JSON.stringify(s.get("suscripcion")), JSON.stringify({
    title: "¡Estoy para esa! 🙌",
    body: "Los avisos andan perfecto en este teléfono.",
    url: "#/",
    tag: "prueba",
  })))
  return e.json(200, { enviados: res.length, resultados: res })
}, $apis.requireAuth())

// Vista previa de un link: título, imagen y descripción (Open Graph). La usan
// las pelis (Letterboxd), los lugares y cualquier link que se pegue.
routerAdd("GET", "/api/epe/preview", (e) => {
  const u = require(`${__hooks}/util.js`)
  const url = e.request.url.query().get("url")
  if (!u.urlPublica(url)) return e.json(400, { error: "link inválido" })
  let res
  try {
    res = u.traer(url)
  } catch (err) {
    return e.json(502, { error: "no se pudo abrir el link" })
  }
  const html = toString(res.body).slice(0, 600000)
  const titulo = u.meta(html, "og:title") || (/<title[^>]*>([^<]*)<\/title>/i.exec(html) || [])[1] || ""
  return e.json(200, {
    url,
    titulo: u.decodificar(titulo).trim(),
    descripcion: u.meta(html, "og:description") || u.meta(html, "description"),
    imagen: u.meta(html, "og:image") || u.meta(html, "twitter:image"),
    sitio: u.meta(html, "og:site_name"),
    // Letterboxd pone el director acá…
    extra: u.meta(html, "twitter:data1"),
    extraEtiqueta: u.meta(html, "twitter:label1"),
    // …y el promedio («3.92 out of 5») acá.
    extra2: u.meta(html, "twitter:data2"),
    extra2Etiqueta: u.meta(html, "twitter:label2"),
  })
}, $apis.requireAuth())

// El diario de Letterboxd de alguien (su RSS público): para marcar como
// vistas las pelis que ya están en la lista.
routerAdd("GET", "/api/epe/letterboxd", (e) => {
  const u = require(`${__hooks}/util.js`)
  const usuario = String(e.request.url.query().get("usuario") || "").trim().replace(/^@/, "")
  if (!/^[A-Za-z0-9_]{1,40}$/.test(usuario)) return e.json(400, { error: "usuario inválido" })
  let res
  try {
    res = u.traer(`https://letterboxd.com/${usuario}/rss/`)
  } catch (err) {
    return e.json(502, { error: "Letterboxd no respondió" })
  }
  if (res.statusCode !== 200) return e.json(404, { error: "no encontré ese usuario de Letterboxd" })
  const xml = toString(res.body)
  const tag = (bloque, nombre) => {
    const m = new RegExp(`<${nombre}>([\\s\\S]*?)</${nombre}>`).exec(bloque)
    return m ? u.decodificar(m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "")).trim() : ""
  }
  const pelis = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml)) && pelis.length < 100) {
    const b = m[1]
    const titulo = tag(b, "letterboxd:filmTitle")
    if (!titulo) continue // listas y otras entradas que no son pelis
    const link = tag(b, "link")
    const slug = (/\/film\/([^/]+)\//.exec(link) || [])[1] || ""
    const poster = (/<img src="([^"]+)"/.exec(tag(b, "description")) || [])[1] || ""
    pelis.push({
      titulo,
      anio: tag(b, "letterboxd:filmYear"),
      puntaje: parseFloat(tag(b, "letterboxd:memberRating")) || 0,
      visto: tag(b, "letterboxd:watchedDate"),
      link: slug ? `https://letterboxd.com/film/${slug}/` : link,
      poster,
    })
  }
  return e.json(200, { usuario, pelis })
}, $apis.requireAuth())
