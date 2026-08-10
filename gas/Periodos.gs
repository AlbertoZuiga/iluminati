function getPeriodos() {
  return sheetToObjects(getSheet("Periodos"))
}

// Periodo abierto = el único con FechaFin vacío.
function getPeriodoAbierto() {
  const periodos = getPeriodos()
  return periodos.filter(function (p) { return !p.fechafin })[0] || null
}

function createPeriodo(params) {
  return withLock(function () {
    if (getPeriodoAbierto()) {
      throw new Error("Ya existe un periodo abierto. Ciérralo antes de crear otro.")
    }

    const nombre = (params.nombre || "").trim()
    const fechaInicio = (params.fechainicio || "").trim() || new Date().toISOString()
    const id = Utilities.getUuid()
    const now = new Date().toISOString()

    appendRowByHeaders("Periodos", {
      id: id, nombre: nombre, fechainicio: fechaInicio, fechafin: "", createdat: now,
    }, ["nombre"])

    return { id: id, nombre: nombre, fechainicio: fechaInicio, fechafin: null, createdat: now }
  })
}

// Edición manual de un periodo (nombre y fechas).
function updatePeriodo(params) {
  return withLock(function () {
    const id = (params.id || "").trim()
    if (!id) throw new Error("Se requiere un ID")

    const periodos = getPeriodos()
    const actual = periodos.filter(function (p) { return String(p.id) === id })[0]
    if (!actual) throw new Error("Periodo no encontrado")

    const updates = {}
    if (params.nombre !== undefined) updates.nombre = (params.nombre || "").trim()

    const nuevaInicio = params.fechainicio !== undefined ? (params.fechainicio || "").trim() : actual.fechainicio
    const nuevaFin = params.fechafin !== undefined ? (params.fechafin || "").trim() : (actual.fechafin || "")

    if (params.fechainicio !== undefined) updates.fechainicio = nuevaInicio
    if (params.fechafin !== undefined) updates.fechafin = nuevaFin

    if (nuevaInicio && nuevaFin && new Date(nuevaFin) < new Date(nuevaInicio)) {
      throw new Error("La fecha de fin no puede ser anterior a la de inicio.")
    }

    // Reabrir (fechafin vacío): solo si no hay otro periodo abierto.
    if (!nuevaFin) {
      const otroAbierto = periodos.filter(function (p) {
        return String(p.id) !== id && !p.fechafin
      })[0]
      if (otroAbierto) throw new Error("Ya existe otro periodo abierto. Ciérralo antes de reabrir este.")
    }

    updateRow("Periodos", id, updates, ["nombre"])

    // Mover las fechas de un periodo cerrado deja su snapshot desalineado: lo regenera.
    if (nuevaFin && (params.fechainicio !== undefined || params.fechafin !== undefined)) {
      guardarLiquidacion(Object.assign({}, actual, {
        nombre: updates.nombre !== undefined ? updates.nombre : actual.nombre,
        fechainicio: nuevaInicio,
        fechafin: nuevaFin,
      }))
    }

    return { id: id, nombre: updates.nombre, fechainicio: nuevaInicio, fechafin: nuevaFin || null }
  })
}

// Cierra el periodo abierto y abre el siguiente de forma contigua.
function cerrarPeriodo(params) {
  return withLock(function () {
    const abierto = getPeriodoAbierto()
    if (!abierto) throw new Error("No hay un periodo abierto para cerrar")

    const corte = (params.fecha || "").trim() || new Date().toISOString()

    // Congela la liquidación ANTES de cerrar: si falla, el periodo sigue abierto.
    guardarLiquidacion(Object.assign({}, abierto, { fechafin: corte }))

    updateRow("Periodos", abierto.id, { fechafin: corte })

    const siguiente = createPeriodo({
      nombre: (params.nombreSiguiente || "").trim(),
      fechainicio: corte,
    })

    return { cerrado: { id: abierto.id, fechafin: corte }, abierto: siguiente }
  })
}
