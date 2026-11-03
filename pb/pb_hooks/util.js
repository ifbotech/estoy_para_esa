// Funciones compartidas por los hooks. Cada handler de PocketBase corre en su
// propio contexto, así que se cargan con require() adentro del handler.

/** Nombre corto de una cuenta para los avisos. */
function nombre(app, userId) {
  try {
    return app.findRecordById("users", userId).getString("name") || "Alguien"
  } catch (_) {
    return "Alguien"
  }
}

/**
 * Manda un aviso push a todos los teléfonos menos los de `excepto` (quien
 * hizo el cambio). Sale en segundo plano desde Go (server/push.go): no frena
 * la respuesta, manda a cada teléfono en paralelo, anota cómo le fue y borra
 * las suscripciones vencidas.
 *
 * `aviso`: { title, body, url, tag } y, si hace falta, ttl (segundos) y
 * urgencia ("high" por defecto, "normal", "low").
 */
function notificar(app, excepto, aviso) {
  try {
    $epe.notificar(excepto || "", JSON.stringify(aviso))
  } catch (err) {
    app.logger().warn("no se pudo mandar el aviso", "error", String(err))
  }
  guardarNovedad(app, null, excepto, aviso)
}

/** Lo mismo, pero sólo a los teléfonos de `usuario`. */
function notificarA(app, usuario, aviso) {
  try {
    $epe.notificarA(usuario || "", JSON.stringify(aviso))
  } catch (err) {
    app.logger().warn("no se pudo mandar el aviso", "error", String(err))
  }
  guardarNovedad(app, usuario, "", aviso)
}

// Los recordatorios son para el momento: no van al panel de novedades.
const SIN_NOVEDAD = /^(recordatorio|hoy|empujon)-/

// Una novedad es novedad por 48 horas: después se borra del panel (lo que
// cuenta, el plan, el voto o la decisión, queda en la app).
const VIDA_NOVEDAD = 48 * 3600 * 1000

/**
 * Guarda el aviso en `novedades` (el panel de la estrella) para `para` (un id)
 * o, si es null, para todas las cuentas: a los demás como no vista y a quien
 * lo hizo (`excepto`) como vista, así cada uno ve todo lo que hizo cada uno.
 * Nunca frena nada.
 */
function guardarNovedad(app, para, excepto, aviso) {
  if (SIN_NOVEDAD.test(aviso.tag || "")) return
  try {
    const col = app.findCollectionByNameOrId("novedades")
    const ids = para ? [para] : app.findAllRecords("users").map((u) => u.id)
    const vencida = new Date(Date.now() - VIDA_NOVEDAD).toISOString().replace("T", " ")
    for (const id of ids) {
      const r = new Record(col)
      r.set("para", id)
      if (excepto) r.set("de", excepto)
      r.set("vista", Boolean(excepto) && id === excepto)
      r.set("titulo", String(aviso.title || "").slice(0, 200))
      r.set("cuerpo", String(aviso.body || "").slice(0, 500))
      r.set("url", String(aviso.url || "").slice(0, 200))
      r.set("tag", String(aviso.tag || "").slice(0, 120))
      app.save(r)
      // fuera las de más de 48 horas, y nunca más de 150 por persona
      for (const vieja of app.findRecordsByFilter("novedades", "para = {:p} && created < {:v}", "", 100, 0, { p: id, v: vencida })) app.delete(vieja)
      for (const vieja of app.findRecordsByFilter("novedades", "para = {:p}", "-created", 50, 150, { p: id })) app.delete(vieja)
    }
  } catch (err) {
    app.logger().warn("no se pudo guardar la novedad", "error", String(err))
  }
}

/** Primer contenido de un <meta> por property o name. */
function meta(html, clave) {
  const esc = clave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const a = new RegExp('<meta[^>]+(?:property|name)=["\']' + esc + '["\'][^>]*content=["\']([^"\']*)["\']', "i").exec(html)
  if (a) return decodificar(a[1])
  const b = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + esc + '["\']', "i").exec(html)
  return b ? decodificar(b[1]) : ""
}

function decodificar(s) {
  return String(s)
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
}

/** Sólo http(s) hacia afuera: nada de la red interna del VPS. */
function urlPublica(raw) {
  const m = /^https?:\/\/([^/:?#]+)/i.exec(String(raw || ""))
  if (!m) return false
  const host = m[1].toLowerCase()
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return false
  if (host.startsWith("[")) return false
  return true
}

const AGENTE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"

function traer(url) {
  return $http.send({
    url,
    method: "GET",
    timeout: 12,
    headers: { "User-Agent": AGENTE, "Accept-Language": "es-AR,es;q=0.9,en;q=0.8" },
  })
}

module.exports = { nombre, notificar, notificarA, meta, decodificar, urlPublica, traer }
