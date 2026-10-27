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
}

/** Lo mismo, pero sólo a los teléfonos de `usuario`. */
function notificarA(app, usuario, aviso) {
  try {
    $epe.notificarA(usuario || "", JSON.stringify(aviso))
  } catch (err) {
    app.logger().warn("no se pudo mandar el aviso", "error", String(err))
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
