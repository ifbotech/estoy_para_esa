/// <reference path="../pb_data/types.d.ts" />

// v2 «Papel Pop»: cada categoría de fábrica pasa a su color de capítulo.
// Sólo se cambian las que siguen con el color original (si lo editaron, no).
const CAMBIOS = {
  pelis: ["#ff3d5a", "#E8432E"],
  comida: ["#ff8a3d", "#F9CC73"],
  cafecitos: ["#c98b5a", "#F8C1BA"],
  viajes: ["#3db4ff", "#A9C3E0"],
  diy: ["#4f7dff", "#8584BD"],
  salidas: ["#c6ff3d", "#A84F96"],
}

migrate((app) => {
  for (const [slug, [antes, ahora]] of Object.entries(CAMBIOS)) {
    let rec
    try {
      rec = app.findFirstRecordByData("categorias", "slug", slug)
    } catch (_) {
      continue
    }
    if (rec.getString("color").toLowerCase() === antes) {
      rec.set("color", ahora)
      app.save(rec)
    }
  }
}, (app) => {
  for (const [slug, [antes, ahora]] of Object.entries(CAMBIOS)) {
    try {
      const rec = app.findFirstRecordByData("categorias", "slug", slug)
      if (rec.getString("color") === ahora) {
        rec.set("color", antes)
        app.save(rec)
      }
    } catch (_) {}
  }
})
