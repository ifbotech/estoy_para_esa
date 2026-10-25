/// <reference path="../pb_data/types.d.ts" />

// El esquema inicial: cuentas, categorías, planes, ganas, ítems de las listas
// (pasos, materiales, valija, itinerario, qué pedir), temas y avisos push.
//
// Todo lo comparten Iñaki y Rocío: cualquier cuenta logueada ve y edita todo,
// salvo lo que es de cada uno (sus ganas, su puntaje, sus avisos).

const LOGUEADO = '@request.auth.id != ""'

migrate((app) => {
  // --- cuentas -------------------------------------------------------------
  const users = app.findCollectionByNameOrId("users")
  users.fields.add(new TextField({ name: "slug", required: true, max: 30, pattern: "^[a-z0-9-]+$" }))
  users.fields.add(new TextField({ name: "color", max: 20 }))
  users.fields.add(new TextField({ name: "letterboxd", max: 60 }))
  users.addIndex("idx_users_slug", true, "slug", "")
  users.passwordAuth.identityFields = ["slug", "email"]
  // Un año: la app queda abierta en el teléfono y no pide entrar a cada rato.
  users.authToken.duration = 60 * 60 * 24 * 365
  users.listRule = LOGUEADO
  users.viewRule = LOGUEADO
  users.createRule = null
  users.updateRule = "id = @request.auth.id"
  users.deleteRule = null
  app.save(users)

  const fechas = () => [
    ({ type: "autodate", name: "created", onCreate: true }),
    ({ type: "autodate", name: "updated", onCreate: true, onUpdate: true }),
  ]
  const abierta = (c) => {
    c.listRule = LOGUEADO
    c.viewRule = LOGUEADO
    c.createRule = LOGUEADO
    c.updateRule = LOGUEADO
    c.deleteRule = LOGUEADO
    return c
  }

  // --- categorías ----------------------------------------------------------
  const categorias = abierta(new Collection({
    type: "base",
    name: "categorias",
    fields: [
      ({ type: "text", name: "nombre", required: true, max: 40 }),
      ({ type: "text", name: "slug", required: true, max: 40, pattern: "^[a-z0-9-]+$" }),
      ({ type: "text", name: "emoji", max: 16 }),
      // La personalidad visual y las funciones especiales que trae.
      ({ type: "select", name: "personalidad", required: true, maxSelect: 1,
        values: ["cine", "cocina", "cafe", "viaje", "taller", "salida"] }),
      ({ type: "text", name: "color", max: 20 }),
      ({ type: "number", name: "orden" }),
      ...fechas(),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_categorias_slug ON categorias (slug)"],
  }))
  app.save(categorias)

  const semillas = [
    ["Pelis", "pelis", "🎬", "cine", "#ff3d5a"],
    ["Comida", "comida", "🍝", "cocina", "#ff8a3d"],
    ["Cafecitos", "cafecitos", "☕", "cafe", "#c98b5a"],
    ["Viajes", "viajes", "✈️", "viaje", "#3db4ff"],
    ["DIY", "diy", "🔨", "taller", "#4f7dff"],
    ["Salidas", "salidas", "🎈", "salida", "#c6ff3d"],
  ]
  semillas.forEach(([nombre, slug, emoji, personalidad, color], i) => {
    const r = new Record(categorias)
    r.set("nombre", nombre)
    r.set("slug", slug)
    r.set("emoji", emoji)
    r.set("personalidad", personalidad)
    r.set("color", color)
    r.set("orden", i)
    app.save(r)
  })

  // --- planes --------------------------------------------------------------
  const planes = abierta(new Collection({
    type: "base",
    name: "planes",
    fields: [
      ({ type: "text", name: "titulo", required: true, max: 140 }),
      ({ type: "relation", name: "categoria", required: true, collectionId: categorias.id, maxSelect: 1 }),
      ({ type: "select", name: "estado", required: true, maxSelect: 1,
        values: ["idea", "agendado", "en_curso", "hecho"] }),
      ({ type: "text", name: "notas", max: 5000 }),
      ({ type: "url", name: "link" }),
      ({ type: "file", name: "portada", maxSelect: 1, maxSize: 12 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
        thumbs: ["600x0", "200x200"] }),
      ({ type: "file", name: "fotos", maxSelect: 60, maxSize: 12 * 1024 * 1024,
        mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
        thumbs: ["600x0", "300x300"] }),
      // Lo propio de cada categoría (Letterboxd, Maps, Instagram, destino...).
      ({ type: "json", name: "datos", maxSize: 200000 }),
      // Opcional: sólo se muestra cuando el plan está agendado.
      ({ type: "date", name: "cuando" }),
      // Lo pone el servidor cuando el plan pasa a "hecho".
      ({ type: "date", name: "hecho_en" }),
      ({ type: "relation", name: "creado_por", collectionId: users.id, maxSelect: 1 }),
      ...fechas(),
    ],
    indexes: [
      "CREATE INDEX idx_planes_estado ON planes (estado)",
      "CREATE INDEX idx_planes_categoria ON planes (categoria)",
    ],
  }))
  app.save(planes)

  // --- votos: las ganas (antes) y el puntaje (después) de cada uno ---------
  const votos = new Collection({
    type: "base",
    name: "votos",
    fields: [
      ({ type: "relation", name: "plan", required: true, collectionId: planes.id, maxSelect: 1, cascadeDelete: true }),
      ({ type: "relation", name: "usuario", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true }),
      ({ type: "number", name: "ganas", min: 0, max: 100 }),
      // De 0 a 5 en medios, como Letterboxd. 0 = todavía no puntuó.
      ({ type: "number", name: "puntaje", min: 0, max: 5 }),
      ({ type: "text", name: "resena", max: 2000 }),
      ...fechas(),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_votos_plan_usuario ON votos (plan, usuario)"],
  })
  votos.listRule = LOGUEADO
  votos.viewRule = LOGUEADO
  votos.createRule = '@request.auth.id != "" && usuario = @request.auth.id'
  votos.updateRule = 'usuario = @request.auth.id && @request.body.usuario:isset = false && @request.body.plan:isset = false'
  votos.deleteRule = "usuario = @request.auth.id"
  app.save(votos)

  // --- ítems de las listas de un plan --------------------------------------
  const items = abierta(new Collection({
    type: "base",
    name: "items",
    fields: [
      ({ type: "relation", name: "plan", required: true, collectionId: planes.id, maxSelect: 1, cascadeDelete: true }),
      ({ type: "select", name: "lista", required: true, maxSelect: 1,
        values: ["pasos", "materiales", "valija", "itinerario", "pedir"] }),
      ({ type: "text", name: "texto", required: true, max: 500 }),
      ({ type: "bool", name: "hecho" }),
      ({ type: "number", name: "orden" }),
      // Para el itinerario: el día del viaje (1, 2, 3...).
      ({ type: "number", name: "dia", min: 0 }),
      ...fechas(),
    ],
    indexes: ["CREATE INDEX idx_items_plan ON items (plan)"],
  }))
  app.save(items)

  // --- temas: cada versión guardada queda en el archivo --------------------
  const temas = abierta(new Collection({
    type: "base",
    name: "temas",
    fields: [
      ({ type: "text", name: "nombre", required: true, max: 60 }),
      ({ type: "number", name: "version", onlyInt: true }),
      ({ type: "json", name: "tokens", required: true, maxSize: 20000 }),
      ({ type: "text", name: "nota", max: 500 }),
      ({ type: "bool", name: "activo" }),
      ({ type: "relation", name: "creado_por", collectionId: users.id, maxSelect: 1 }),
      ...fechas(),
    ],
  }))
  temas.deleteRule = null // el archivo no se borra
  app.save(temas)

  // --- avisos push ---------------------------------------------------------
  const subs = new Collection({
    type: "base",
    name: "push_subs",
    fields: [
      ({ type: "relation", name: "usuario", required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true }),
      ({ type: "text", name: "endpoint", required: true, max: 1000 }),
      ({ type: "json", name: "suscripcion", required: true, maxSize: 4000 }),
      ({ type: "text", name: "dispositivo", max: 200 }),
      ...fechas(),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_push_endpoint ON push_subs (endpoint)"],
  })
  subs.listRule = "usuario = @request.auth.id"
  subs.viewRule = "usuario = @request.auth.id"
  subs.createRule = '@request.auth.id != "" && usuario = @request.auth.id'
  subs.updateRule = null
  subs.deleteRule = "usuario = @request.auth.id"
  app.save(subs)

  // --- respaldo diario, 14 días --------------------------------------------
  const settings = app.settings()
  settings.meta.appName = "Estoy para esa"
  settings.meta.appURL = "https://ifbotech.com/estoyparaesa"
  settings.backups.cron = "30 4 * * *"
  settings.backups.cronMaxKeep = 14
  app.save(settings)
}, (app) => {
  for (const n of ["push_subs", "temas", "items", "votos", "planes", "categorias"]) {
    try { app.delete(app.findCollectionByNameOrId(n)) } catch (_) {}
  }
})
