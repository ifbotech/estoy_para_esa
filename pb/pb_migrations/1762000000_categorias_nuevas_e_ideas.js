/// <reference path="../pb_data/types.d.ts" />

// Las categorías de ahora: Cine en casa, Gastronomía, Viajes, DIY y Plancitos.
// Cafecitos se suma a Gastronomía (sus planes y su diario pasan para allá).
//
// Y una lista nueva en los ítems: «ideas», para los planes que se van armando
// de a poco (un día en San Telmo con mil cosas para hacer).

const CAMBIOS = [
  // slug viejo, nombre, slug nuevo, emoji, orden
  ["pelis", "Cine en casa", "cine-en-casa", "🍿", 0],
  ["comida", "Gastronomía", "gastronomia", "🍝", 1],
  ["viajes", null, null, null, 2],
  ["diy", null, null, null, 3],
  ["salidas", "Plancitos", "plancitos", "🎈", 4],
]

function porSlug(app, slug) {
  try {
    return app.findFirstRecordByData("categorias", "slug", slug)
  } catch (_) {
    return null
  }
}

migrate((app) => {
  const items = app.findCollectionByNameOrId("items")
  const lista = items.fields.getByName("lista")
  if (!lista.values.includes("ideas")) {
    lista.values = [...lista.values, "ideas"]
    app.save(items)
  }

  for (const [viejo, nombre, slug, emoji, orden] of CAMBIOS) {
    const c = porSlug(app, viejo)
    if (!c) continue
    if (nombre) c.set("nombre", nombre)
    if (slug) c.set("slug", slug)
    if (emoji) c.set("emoji", emoji)
    c.set("orden", orden)
    app.save(c)
  }

  const cafe = porSlug(app, "cafecitos")
  const gastro = porSlug(app, "gastronomia")
  if (cafe && gastro) {
    for (const p of app.findRecordsByFilter("planes", "categoria = {:c}", "", 0, 0, { c: cafe.id })) {
      p.set("categoria", gastro.id)
      app.save(p)
    }
    for (const a of app.findRecordsByFilter("actividad", "categoria = {:c}", "", 0, 0, { c: cafe.id })) {
      a.set("categoria", gastro.id)
      app.save(a)
    }
    app.delete(cafe)
  }
}, (app) => {
  // vuelve los nombres; Cafecitos no se recrea (sus planes quedan en Gastronomía)
  const viejos = [
    ["cine-en-casa", "Pelis", "pelis", "🎬"],
    ["gastronomia", "Comida", "comida", "🍝"],
    ["plancitos", "Salidas", "salidas", "🎈"],
  ]
  for (const [slug, nombre, viejo, emoji] of viejos) {
    const c = porSlug(app, slug)
    if (!c) continue
    c.set("nombre", nombre)
    c.set("slug", viejo)
    c.set("emoji", emoji)
    app.save(c)
  }
  for (const it of app.findRecordsByFilter("items", "lista = 'ideas'", "", 0, 0)) app.delete(it)
  const items = app.findCollectionByNameOrId("items")
  const lista = items.fields.getByName("lista")
  lista.values = lista.values.filter((v) => v !== "ideas")
  app.save(items)
})
