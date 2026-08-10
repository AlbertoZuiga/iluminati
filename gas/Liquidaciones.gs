function getLiquidaciones() {
  return sheetToObjects(getSheet("Liquidaciones"))
}

// Congela la liquidación de un periodo al cerrarlo. El periodo debe venir con la
// fechafin de corte ya seteada en el objeto (aún no escrita en el sheet).
// Upsert: reabrir y volver a cerrar (o editar las fechas) pisa el snapshot previo
// en vez de dejar dos filas para el mismo periodo.
function guardarLiquidacion(periodo) {
  const resultado = calcularSaldos(periodo)
  const json = JSON.stringify(resultado)
  const now = new Date().toISOString()

  const existente = getLiquidaciones().filter(function (l) {
    return String(l.periodoid) === String(periodo.id)
  })[0]

  if (existente) {
    updateRow("Liquidaciones", existente.id, { createdat: now, data: json }, ["data"])
  } else {
    appendRowByHeaders("Liquidaciones", {
      id: Utilities.getUuid(),
      periodoid: periodo.id,
      createdat: now,
      data: json,
    }, ["data"])
  }
  return resultado
}

// Snapshot si existe; si no (periodo cerrado antes del sistema de snapshots), recalcula en vivo.
function getLiquidacion(periodoid) {
  if (!periodoid) throw new Error("Se requiere un periodoid")

  const fila = getLiquidaciones().filter(function (l) {
    return String(l.periodoid) === String(periodoid)
  })[0]
  if (fila) {
    const data = JSON.parse(fila.data)
    data.snapshot = true
    return data
  }

  const periodo = getPeriodos().filter(function (p) {
    return String(p.id) === String(periodoid)
  })[0]
  if (!periodo) throw new Error("Periodo no encontrado")

  const data = calcularSaldos(periodo)
  data.snapshot = false
  return data
}
