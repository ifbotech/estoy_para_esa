/// <reference path="../pb_data/types.d.ts" />

// Decidir: uno pregunta, cada uno responde a ciegas y después cada uno elige
// la respuesta que más le copa (o pide otra ronda si ninguna tienta).
//
// `preguntas`: la pregunta, en qué ronda va, quiénes ya respondieron y,
// cuando se decide, la respuesta elegida (y si desempató la moneda).
// `respuestas`: una por persona y por ronda. `elige` es el id de la respuesta
// que eligió esa persona, u «otra» si ninguna la tentó. La respuesta del otro
// no se puede leer hasta que vos también respondiste esa ronda (regla de la
// colección, no sólo de la pantalla). Lo que se resuelve, lo resuelve el
// hook (pb_hooks/decisiones.js).

const LOGUEADO = '@request.auth.id != ""'

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")

  const preguntas = new Collection({
    type: "base",
    name: "preguntas",
    fields: [
      ({ type: "text", name: "texto", required: true, max: 200 }),
      ({ type: "relation", name: "creada_por", collectionId: users.id, maxSelect: 1 }),
      ({ type: "select", name: "estado", required: true, maxSelect: 1, values: ["abierta", "decidida", "archivada"] }),
      ({ type: "number", name: "ronda", min: 1, onlyInt: true }),
      // quiénes ya respondieron esta ronda (sin decir qué): para el «ya respondió 🙈»
      ({ type: "json", name: "respondieron", maxSize: 2000 }),
      ({ type: "text", name: "elegida", max: 300 }),
      ({ type: "bool", name: "desempate" }),
      ({ type: "date", name: "decidida_en" }),
      ({ type: "autodate", name: "created", onCreate: true }),
      ({ type: "autodate", name: "updated", onCreate: true, onUpdate: true }),
    ],
  })
  preguntas.listRule = LOGUEADO
  preguntas.viewRule = LOGUEADO
  preguntas.createRule = LOGUEADO
  // la ronda, quiénes respondieron, la elegida y el desempate los pone el servidor
  preguntas.updateRule = `${LOGUEADO} && @request.body.ronda:isset = false && @request.body.respondieron:isset = false && @request.body.elegida:isset = false && @request.body.desempate:isset = false`
  preguntas.deleteRule = LOGUEADO
  app.save(preguntas)

  const respuestas = new Collection({
    type: "base",
    name: "respuestas",
    fields: [
      ({ type: "relation", name: "pregunta", required: true, collectionId: preguntas.id, maxSelect: 1, cascadeDelete: true }),
      ({ type: "relation", name: "usuario", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true }),
      ({ type: "number", name: "ronda", required: true, min: 1, onlyInt: true }),
      ({ type: "text", name: "texto", required: true, max: 300 }),
      ({ type: "text", name: "elige", max: 40 }),
      ({ type: "autodate", name: "created", onCreate: true }),
      ({ type: "autodate", name: "updated", onCreate: true, onUpdate: true }),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_respuestas_ronda ON respuestas (pregunta, usuario, ronda)"],
  })
  // la tuya siempre; la del otro, sólo si vos también respondiste esa ronda
  const visible =
    `${LOGUEADO} && (usuario = @request.auth.id || (` +
    "@collection.respuestas:mia.pregunta ?= pregunta && " +
    "@collection.respuestas:mia.ronda ?= ronda && " +
    "@collection.respuestas:mia.usuario ?= @request.auth.id))"
  respuestas.listRule = visible
  respuestas.viewRule = visible
  respuestas.createRule =
    `${LOGUEADO} && usuario = @request.auth.id && pregunta.estado = "abierta" && ronda = pregunta.ronda`
  respuestas.updateRule =
    "usuario = @request.auth.id && pregunta.estado = \"abierta\" && ronda = pregunta.ronda && " +
    "@request.body.usuario:isset = false && @request.body.pregunta:isset = false && @request.body.ronda:isset = false"
  respuestas.deleteRule = null
  app.save(respuestas)

  // el diario también anota cada decisión (para el Wrapped)
  const actividad = app.findCollectionByNameOrId("actividad")
  const tipo = actividad.fields.getByName("tipo")
  if (!tipo.values.includes("decidido")) {
    tipo.values = [...tipo.values, "decidido"]
    app.save(actividad)
  }
}, (app) => {
  app.delete(app.findCollectionByNameOrId("respuestas"))
  app.delete(app.findCollectionByNameOrId("preguntas"))
})
