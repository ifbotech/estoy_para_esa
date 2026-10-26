/// <reference path="../pb_data/types.d.ts" />

// El diario de la app y los Wrapped.
//
// `actividad`: cada cosa que pasa (un plan nuevo, uno agendado o hecho, un
// voto, un match, un puntaje, fotos, un paso tachado, un plan borrado) queda
// anotada por los hooks con el título y la categoría del momento, así sobrevive
// aunque después el plan se edite o se borre. Nadie la lee desde la app: es la
// materia prima de los Wrapped.
//
// `wraps`: dos veces por año (30 de junio y 31 de diciembre) el servidor congela
// el período en un Wrapped (ver pb_hooks/wrap.js). Sólo se puede ver mientras
// está abierto (`abre` → `cierra`), como el de Spotify.

const LOGUEADO = '@request.auth.id != ""'

const TIPOS = [
  "plan_nuevo", "agendado", "en_curso", "hecho", "a_idea", "borrado",
  "ganas", "match", "puntaje", "resena", "fotos", "item_hecho",
]

migrate((app) => {
  const users = app.findCollectionByNameOrId("users")

  const actividad = new Collection({
    type: "base",
    name: "actividad",
    fields: [
      ({ type: "select", name: "tipo", required: true, maxSelect: 1, values: TIPOS }),
      // Cuándo pasó (en la carga inicial, la fecha real de lo que ya estaba).
      ({ type: "date", name: "cuando", required: true }),
      // El plan va como texto y con su título y categoría copiados: si el plan
      // se borra, el diario lo sigue recordando.
      ({ type: "text", name: "plan", max: 40 }),
      ({ type: "text", name: "titulo", max: 200 }),
      ({ type: "text", name: "categoria", max: 40 }),
      ({ type: "relation", name: "usuario", collectionId: users.id, maxSelect: 1 }),
      ({ type: "json", name: "datos", maxSize: 20000 }),
      ({ type: "autodate", name: "created", onCreate: true }),
    ],
    indexes: ["CREATE INDEX idx_actividad_cuando ON actividad (cuando)"],
  })
  // sólo los hooks y el panel de datos
  actividad.listRule = null
  actividad.viewRule = null
  actividad.createRule = null
  actividad.updateRule = null
  actividad.deleteRule = null
  app.save(actividad)

  const wraps = new Collection({
    type: "base",
    name: "wraps",
    fields: [
      // «2026-mitad» o «2026-anio»
      ({ type: "text", name: "periodo", required: true, max: 20 }),
      ({ type: "select", name: "tipo", required: true, maxSelect: 1, values: ["mitad", "anio"] }),
      ({ type: "number", name: "anio", required: true }),
      ({ type: "date", name: "desde", required: true }),
      ({ type: "date", name: "hasta", required: true }),
      ({ type: "date", name: "abre", required: true }),
      ({ type: "date", name: "cierra", required: true }),
      // La foto congelada del período: planes, votos, ítems y actividad.
      ({ type: "json", name: "datos", maxSize: 5000000 }),
      ({ type: "autodate", name: "created", onCreate: true }),
      ({ type: "autodate", name: "updated", onCreate: true, onUpdate: true }),
    ],
    indexes: ["CREATE UNIQUE INDEX idx_wraps_periodo ON wraps (periodo)"],
  })
  const abierto = `${LOGUEADO} && abre <= @now && cierra >= @now`
  wraps.listRule = abierto
  wraps.viewRule = abierto
  wraps.createRule = null
  wraps.updateRule = null
  wraps.deleteRule = null
  app.save(wraps)

  // --- carga inicial: lo que ya pasó antes de que existiera el diario -------
  const nuevo = (tipo, cuando, plan, usuario, datos) => {
    if (!cuando) return
    const r = new Record(actividad)
    r.set("tipo", tipo)
    r.set("cuando", cuando)
    r.set("plan", plan.id)
    r.set("titulo", plan.getString("titulo"))
    r.set("categoria", plan.getString("categoria"))
    if (usuario) r.set("usuario", usuario)
    r.set("datos", datos || {})
    app.save(r)
  }
  const fecha = (r, campo) => r.getString(campo)

  for (const plan of app.findAllRecords("planes")) {
    nuevo("plan_nuevo", fecha(plan, "created"), plan, plan.getString("creado_por"))
    if (plan.getString("estado") === "hecho") nuevo("hecho", fecha(plan, "hecho_en") || fecha(plan, "updated"), plan, "")
    const fotos = plan.getStringSlice("fotos").length
    if (fotos) nuevo("fotos", fecha(plan, "hecho_en") || fecha(plan, "updated"), plan, "", { cantidad: fotos })

    const votos = app.findRecordsByFilter("votos", "plan = {:p}", "created", 10, 0, { p: plan.id })
    for (const v of votos) {
      nuevo("ganas", fecha(v, "created"), plan, v.getString("usuario"), { ganas: v.getFloat("ganas") })
      if (v.getFloat("puntaje") > 0) nuevo("puntaje", fecha(v, "updated"), plan, v.getString("usuario"), { puntaje: v.getFloat("puntaje") })
      if (v.getString("resena")) nuevo("resena", fecha(v, "updated"), plan, v.getString("usuario"))
    }
    if (votos.length >= 2 && votos.every((v) => v.getFloat("ganas") >= 85)) {
      nuevo("match", fecha(votos[votos.length - 1], "created"), plan, votos[votos.length - 1].getString("usuario"))
    }
  }
}, (app) => {
  app.delete(app.findCollectionByNameOrId("wraps"))
  app.delete(app.findCollectionByNameOrId("actividad"))
})
