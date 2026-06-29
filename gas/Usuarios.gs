function getUsuarios() {
  return sheetToObjects(getSheet("Usuarios"))
}

function createUsuario(params) {
  const nombre = (params.nombre || "").trim()
  if (!nombre) throw new Error("El nombre es requerido")

  const sheet = getSheet("Usuarios")
  const id = Utilities.getUuid()
  const now = new Date().toISOString()

  sheet.appendRow([id, nombre, true, now])

  return { id: id, nombre: nombre, activo: true, createdAt: now }
}
