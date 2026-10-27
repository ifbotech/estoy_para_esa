/// <reference path="../pb_data/types.d.ts" />

// Avisos push que andan siempre:
//
// - `push_subs` anota cómo le fue al último envío de cada teléfono
//   (ultimo_ok, ultimo_error, fallos): se ve en Más → Avisos y el servidor
//   borra las suscripciones que fallan seguido. Cada uno puede actualizar
//   la suya (cuando el navegador la renueva), sin cambiar de dueño.
// - `planes.recordatorio` guarda para qué «cuándo» ya salió el recordatorio
//   de «en un rato»: si cambian el día, se vuelve a avisar.
migrate((app) => {
  const subs = app.findCollectionByNameOrId("push_subs")
  if (!subs.fields.getByName("ultimo_ok")) subs.fields.add(new DateField({ name: "ultimo_ok" }))
  if (!subs.fields.getByName("ultimo_error")) subs.fields.add(new TextField({ name: "ultimo_error", max: 300 }))
  if (!subs.fields.getByName("fallos")) subs.fields.add(new NumberField({ name: "fallos", min: 0, onlyInt: true }))
  subs.updateRule =
    "usuario = @request.auth.id && @request.body.usuario:isset = false && " +
    "@request.body.ultimo_ok:isset = false && @request.body.fallos:isset = false"
  app.save(subs)

  const planes = app.findCollectionByNameOrId("planes")
  if (!planes.fields.getByName("recordatorio")) planes.fields.add(new TextField({ name: "recordatorio", max: 40 }))
  app.save(planes)
}, (app) => {
  const subs = app.findCollectionByNameOrId("push_subs")
  for (const n of ["ultimo_ok", "ultimo_error", "fallos"]) subs.fields.removeByName(n)
  subs.updateRule = null
  app.save(subs)
  const planes = app.findCollectionByNameOrId("planes")
  planes.fields.removeByName("recordatorio")
  app.save(planes)
})
