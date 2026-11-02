/// <reference path="../pb_data/types.d.ts" />

// Novedades: lo que pasó en la app mientras no mirabas, en el panel de la
// estrella de arriba. Cada aviso que manda el servidor (util.js: notificar y
// notificarA) queda también guardado acá para cada destinatario, tenga o no
// los avisos del teléfono activados. Los recordatorios no entran.
//
// Cada uno ve sólo las suyas y sólo puede marcarlas como vistas o borrarlas.

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  const novedades = new Collection({
    type: "base",
    name: "novedades",
    fields: [
      ({ type: "relation", name: "para", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true }),
      ({ type: "relation", name: "de", collectionId: users.id, maxSelect: 1 }),
      ({ type: "text", name: "titulo", max: 200 }),
      ({ type: "text", name: "cuerpo", max: 500 }),
      ({ type: "text", name: "url", max: 200 }),
      ({ type: "text", name: "tag", max: 120 }),
      ({ type: "bool", name: "vista" }),
      ({ type: "autodate", name: "created", onCreate: true }),
    ],
    indexes: ["CREATE INDEX idx_novedades_para ON novedades (para, created)"],
  })
  const mias = "para = @request.auth.id"
  novedades.listRule = mias
  novedades.viewRule = mias
  novedades.createRule = null
  novedades.updateRule = `${mias} && @request.body.para:isset = false && @request.body.de:isset = false && @request.body.titulo:isset = false && @request.body.cuerpo:isset = false && @request.body.url:isset = false`
  novedades.deleteRule = mias
  app.save(novedades)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("novedades"))
})
