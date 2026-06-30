function getViajes() {
  return sheetToObjects(getSheet("Viajes"))
}

function createViaje(params) {
  const autoId = (params.auto || "").trim()
  const kmInicio = params.kminicio != null && params.kminicio !== "" ? Number(params.kminicio) : null
  const kmFin = params.kmfin != null && params.kmfin !== "" ? Number(params.kmfin) : null

  if (!autoId) throw new Error("El auto es requerido")
  if (kmInicio == null) throw new Error("El km inicial es requerido")

  const sheet = getSheet("Viajes")
  const id = Utilities.getUuid()
  const now = new Date().toISOString()

  sheet.appendRow([id, autoId, kmInicio, kmFin, now])

  return { id, auto: autoId, kminicio: kmInicio, kmfin: kmFin, createdat: now }
}

function updateViaje(params) {
  const id = params.id
  if (!id) throw new Error("Se requiere un ID")

  const updates = {}
  if (params.auto !== undefined) updates.auto = String(params.auto).trim()
  if (params.kminicio !== undefined && params.kminicio !== "") updates.kminicio = Number(params.kminicio)
  if (params.kmfin !== undefined && params.kmfin !== "") updates.kmfin = Number(params.kmfin)

  return updateRow("Viajes", id, updates)
}
