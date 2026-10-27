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
  const f = require(`${__hooks}/avisos.js`).fechaAR(e.record.getString("cuando"))
  const para = e.record.getString("estado") === "agendado" && f ? ` para el ${f.dia} a las ${f.hora}` : ""
  u.notificar(e.app, e.auth ? e.auth.id : "", {
    title: "✨ Plancito nuevo",
    body: `${quien} sumó «${e.record.getString("titulo")}»${para}. ¿Cuántas ganas tenés? (se vota a ciegas)`,
    url: `#/plan/${e.record.id}`,
    tag: `plan-${e.record.id}`,
  })
}, "planes")

onRecordUpdateRequest((e) => {
  const o = e.record.original()
  const antes = { estado: o.getString("estado"), cuando: o.getString("cuando"), fotos: o.getStringSlice("fotos").length }
  e.next()
  const ahora = e.record.getString("estado")
  const autor = e.auth ? e.auth.id : ""
  const a = require(`${__hooks}/actividad.js`)
  const fotos = e.record.getStringSlice("fotos").length
  if (fotos > antes.fotos) a.registrar(e.app, "fotos", e.record, autor, { cantidad: fotos - antes.fotos })
  if (antes.estado !== ahora) a.registrar(e.app, ahora === "idea" ? "a_idea" : ahora, e.record, autor, { antes: antes.estado })
  require(`${__hooks}/avisos.js`).planCambiado(e.app, e.record, antes, autor)
}, "planes")

onRecordDeleteRequest((e) => {
  const plan = e.record
  e.next()
  require(`${__hooks}/actividad.js`).registrar(e.app, "borrado", plan, e.auth ? e.auth.id : "", { estado: plan.getString("estado") })
  require(`${__hooks}/avisos.js`).planBorrado(e.app, plan, e.auth ? e.auth.id : "")
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
  require(`${__hooks}/votos.js`).avisar(e, antes.ganas, antes.puntaje, false, antes.resena)
}, "votos")

// --- ítems: cada paso tachado (valija, proyecto, itinerario) va al diario ---

onRecordCreateRequest((e) => {
  e.next()
  require(`${__hooks}/avisos.js`).itemNuevo(e.app, e.record, e.auth ? e.auth.id : "")
}, "items")

onRecordUpdateRequest((e) => {
  const antes = e.record.original().getBool("hecho")
  e.next()
  if (antes || !e.record.getBool("hecho")) return
  const a = require(`${__hooks}/actividad.js`)
  const plan = a.planDe(e.app, e.record)
  if (plan) a.registrar(e.app, "item_hecho", plan, e.auth ? e.auth.id : "", { lista: e.record.getString("lista"), texto: e.record.getString("texto") })
  require(`${__hooks}/avisos.js`).itemHecho(e.app, e.record, e.auth ? e.auth.id : "")
}, "items")

// --- categorías ---------------------------------------------------------------

onRecordCreateRequest((e) => {
  e.next()
  require(`${__hooks}/avisos.js`).categoriaNueva(e.app, e.record, e.auth ? e.auth.id : "")
}, "categorias")

// --- Decidir: preguntas y respuestas a ciegas ------------------------------

onRecordCreateRequest((e) => {
  if (e.auth) e.record.set("creada_por", e.auth.id)
  e.record.set("estado", "abierta")
  e.record.set("ronda", 1)
  e.record.set("respondieron", [])
  e.record.set("elegida", "")
  e.next()
  const u = require(`${__hooks}/util.js`)
  u.notificar(e.app, e.auth ? e.auth.id : "", {
    title: `❓ ${u.nombre(e.app, e.auth ? e.auth.id : "")} pregunta`,
    body: `«${e.record.getString("texto")}». Respondé a ciegas.`,
    url: "#/decidir",
    tag: `decidir-${e.record.id}`,
  })
}, "preguntas")

onRecordCreateRequest((e) => {
  e.record.set("elige", "")
  e.next()
  require(`${__hooks}/decisiones.js`).alResponder(e.app, e.record, e.auth ? e.auth.id : "")
}, "respuestas")

onRecordUpdateRequest((e) => {
  const d = require(`${__hooks}/decisiones.js`)
  d.validarCambio(e)
  const antes = e.record.original().getString("elige")
  e.next()
  if (e.record.getString("elige") && e.record.getString("elige") !== antes) d.resolver(e.app, e.record, e.auth ? e.auth.id : "")
}, "respuestas")

// --- avisos: un teléfono, una cuenta -----------------------------------------

// Si en un teléfono cambian de cuenta, la suscripción pasa a la cuenta nueva
// (el endpoint es único: sin esto, el teléfono seguiría recibiendo los avisos
// de la otra persona y no los propios).
onRecordCreateRequest((e) => {
  try {
    const vieja = e.app.findFirstRecordByData("push_subs", "endpoint", e.record.getString("endpoint"))
    if (vieja.getString("usuario") !== e.record.getString("usuario")) e.app.delete(vieja)
  } catch (_) {}
  e.next()
}, "push_subs")

// --- recordatorios (hora de acá = UTC−3) ---------------------------------------

// «⏰ En un rato»: los planes agendados que empiezan dentro de la próxima hora.
cronAdd("avisos-recordatorios", "*/10 * * * *", () => {
  require(`${__hooks}/avisos.js`).recordatorios($app)
})

// «☀️ Hoy hay plan», a las 9:30.
cronAdd("avisos-hoy", "30 12 * * *", () => {
  require(`${__hooks}/avisos.js`).resumenDelDia($app)
})

// A las 20:00, a cada uno lo que espera algo de él (Decidir, ganas).
cronAdd("avisos-empujoncitos", "0 23 * * *", () => {
  require(`${__hooks}/avisos.js`).empujoncitos($app)
})

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

// Manda un aviso de prueba a todos tus teléfonos y devuelve cómo le fue a
// cada uno (lo usa Más → Avisos).
routerAdd("POST", "/api/epe/push/probar", (e) => {
  const res = $epe.probarPush(e.auth.id, JSON.stringify({
    title: "¡Estoy para esa! 🙌",
    body: "Los avisos andan en este teléfono.",
    url: "#/mas/avisos",
    tag: "prueba",
  }))
  return e.json(200, { enviados: res.length, ok: res.filter((r) => r.ok).length, resultados: res })
}, $apis.requireAuth())

// Para probar los recordatorios sin esperar al reloj (sólo desde el panel de
// datos): POST {"cual": "recordatorios" | "hoy" | "empujoncitos"}.
routerAdd("POST", "/api/epe/avisos/correr", (e) => {
  const a = require(`${__hooks}/avisos.js`)
  const cual = (e.requestInfo().body || {}).cual
  if (cual === "recordatorios") a.recordatorios(e.app)
  else if (cual === "hoy") a.resumenDelDia(e.app)
  else if (cual === "empujoncitos") a.empujoncitos(e.app)
  else return e.json(400, { error: "cual: recordatorios, hoy o empujoncitos" })
  return e.json(200, { ok: true, cual })
}, $apis.requireSuperuserAuth())

// Cuando el navegador renueva la suscripción por su cuenta
// (pushsubscriptionchange), el service worker avisa acá. No hay sesión en el
// service worker: alcanza con conocer el endpoint viejo, que es secreto.
routerAdd("POST", "/api/epe/push/renovar", (e) => {
  const b = e.requestInfo().body || {}
  const nueva = b.nueva || {}
  if (!b.viejo || !nueva.endpoint || !nueva.keys) return e.json(400, { error: "faltan datos" })
  let sub
  try {
    sub = e.app.findFirstRecordByData("push_subs", "endpoint", String(b.viejo))
  } catch (_) {
    return e.json(404, { error: "no la conozco" })
  }
  sub.set("endpoint", String(nueva.endpoint))
  sub.set("suscripcion", nueva)
  sub.set("fallos", 0)
  sub.set("ultimo_error", "")
  e.app.save(sub)
  return e.json(200, { ok: true })
})

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
