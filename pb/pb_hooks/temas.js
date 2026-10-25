// El tema es compartido: cuando uno se activa, los demás quedan en el archivo.
function unicoActivo(e) {
  if (!e.record.getBool("activo")) return
  const otros = e.app.findRecordsByFilter("temas", "activo = true && id != {:id}", "", 100, 0, { id: e.record.id })
  for (const t of otros) {
    t.set("activo", false)
    e.app.save(t)
  }
}

module.exports = { unicoActivo }
