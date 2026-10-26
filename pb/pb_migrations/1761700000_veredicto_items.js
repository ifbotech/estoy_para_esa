/// <reference path="../pb_data/types.d.ts" />

// v3: en «Qué pedir», después de ir, cada plato queda marcado como para
// repetir o para pasar.
migrate((app) => {
  const items = app.findCollectionByNameOrId("items")
  if (!items.fields.getByName("veredicto")) {
    items.fields.add(new SelectField({ name: "veredicto", values: ["repetir", "pasar"], maxSelect: 1 }))
    app.save(items)
  }
}, (app) => {
  const items = app.findCollectionByNameOrId("items")
  items.fields.removeByName("veredicto")
  app.save(items)
})
