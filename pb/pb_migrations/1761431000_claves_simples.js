/// <reference path="../pb_data/types.d.ts" />

// Contraseñas cortas (como "123"): la app es de dos personas y no tiene que
// molestar. A cambio, se limitan los intentos de entrar: 10 cada 5 minutos
// por IP, así nadie puede probar contraseñas a lo loco.
migrate((app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.getByName("password").min = 3
  app.save(users)

  const settings = app.settings()
  settings.rateLimits.enabled = true
  settings.rateLimits.rules = [
    ...settings.rateLimits.rules.filter((r) => r.label !== "*:auth"),
    { label: "*:auth", audience: "", duration: 300, maxRequests: 10 },
  ]
  app.save(settings)
}, (app) => {
  const users = app.findCollectionByNameOrId("users")
  users.fields.getByName("password").min = 8
  app.save(users)
})
