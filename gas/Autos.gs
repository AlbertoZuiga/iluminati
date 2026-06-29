function getAutos() {
  return sheetToObjects(getSheet("Autos"))
}

function createAuto(params) {
  const nombre = (params.nombre || "").trim()
  const patente = (params.patente || "").trim().toUpperCase()
  const marca = (params.marca || "").trim()
  const modelo = (params.modelo || "").trim()
  const anio = params.anio ? Number(params.anio) : null

  if (!nombre) throw new Error("El nombre es requerido")
  if (!patente) throw new Error("La patente es requerida")
  if (!marca) throw new Error("La marca es requerida")
  if (!modelo) throw new Error("El modelo es requerido")

  const sheet = getSheet("Autos")
  const id = Utilities.getUuid()
  const now = new Date().toISOString()

  sheet.appendRow([id, nombre, patente, marca, modelo, anio, true, now])

  return { id: id, nombre: nombre, patente: patente, marca: marca, modelo: modelo, anio: anio, activo: true, createdAt: now }
}

function updateAuto(params) {
  const id = params.id
  if (!id) throw new Error("Se requiere un ID")

  const updates = {}
  if (params.nombre !== undefined) updates.nombre = String(params.nombre).trim()
  if (params.patente !== undefined) updates.patente = String(params.patente).trim().toUpperCase()
  if (params.marca !== undefined) updates.marca = String(params.marca).trim()
  if (params.modelo !== undefined) updates.modelo = String(params.modelo).trim()
  if (params.anio !== undefined && params.anio !== "") updates.anio = Number(params.anio)
  if (params.activo !== undefined) updates.activo = params.activo === "true" || params.activo === true

  return updateRow("Autos", id, updates)
}
