function getGastos() {
  return sheetToObjects(getSheet("Gastos"))
}

function createGasto(params) {
  const autoId = (params.auto || "").trim()
  const fecha = (params.fecha || "").trim()
  const tipo = (params.tipo || "").trim()
  const monto = params.monto != null && params.monto !== "" ? Number(params.monto) : null
  const pagadoPor = (params.pagadopor || "").trim()

  if (!autoId) throw new Error("El auto es requerido")
  if (!fecha) throw new Error("La fecha es requerida")
  if (!tipo) throw new Error("El tipo es requerido")
  if (monto == null || isNaN(monto) || monto <= 0) throw new Error("El monto debe ser mayor a 0")
  if (!pagadoPor) throw new Error("Quién pagó es requerido")

  const id = Utilities.getUuid()
  const now = new Date().toISOString()

  appendRowByHeaders("Gastos", {
    id: id, auto: autoId, fecha: fecha, tipo: tipo, monto: monto, pagadopor: pagadoPor, createdat: now,
  })

  return { id: id, auto: autoId, fecha: fecha, tipo: tipo, monto: monto, pagadopor: pagadoPor, createdat: now }
}

function updateGasto(params) {
  const id = params.id
  if (!id) throw new Error("Se requiere un ID")

  const updates = {}
  if (params.auto !== undefined) updates.auto = String(params.auto).trim()
  if (params.fecha !== undefined && params.fecha !== "") updates.fecha = String(params.fecha).trim()
  if (params.tipo !== undefined) updates.tipo = String(params.tipo).trim()
  if (params.monto !== undefined && params.monto !== "") {
    const monto = Number(params.monto)
    if (isNaN(monto) || monto <= 0) throw new Error("El monto debe ser mayor a 0")
    updates.monto = monto
  }
  if (params.pagadopor !== undefined) updates.pagadopor = String(params.pagadopor).trim()

  return updateRow("Gastos", id, updates)
}
