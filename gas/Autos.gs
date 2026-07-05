function getAutos() {
  return sheetToObjects(getSheet("Autos"))
}

function createAuto(params) {
  const nombre = (params.nombre || "").trim()
  const patente = (params.patente || "").trim().toUpperCase()
  const marca = (params.marca || "").trim()
  const modelo = (params.modelo || "").trim()
  const anio = params.anio ? Number(params.anio) : null
  const kmActual = params.kmactual !== undefined && params.kmactual !== "" ? Number(params.kmactual) : ""

  if (!nombre) throw new Error("El nombre es requerido")
  if (!patente) throw new Error("La patente es requerida")
  if (!marca) throw new Error("La marca es requerida")
  if (!modelo) throw new Error("El modelo es requerido")

  const tieneBono = params.tienebono === "true" || params.tienebono === true

  const id = Utilities.getUuid()
  const now = new Date().toISOString()

  appendRowByHeaders("Autos", {
    id: id, nombre: nombre, patente: patente, marca: marca, modelo: modelo,
    anio: anio, activo: true, createdat: now, tienebono: tieneBono, kmactual: kmActual,
  })

  return { id: id, nombre: nombre, patente: patente, marca: marca, modelo: modelo, anio: anio, activo: true, createdAt: now, tienebono: tieneBono, kmactual: kmActual }
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
  if (params.tienebono !== undefined) updates.tienebono = params.tienebono === "true" || params.tienebono === true
  if (params.kmactual !== undefined && params.kmactual !== "") updates.kmactual = Number(params.kmactual)

  return updateRow("Autos", id, updates)
}
