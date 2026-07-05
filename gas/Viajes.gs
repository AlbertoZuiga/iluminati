function getViajes() {
  return sheetToObjects(getSheet("Viajes"))
}

function createViaje(params) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const autoId = (params.auto || "").trim()
    const kmInicio = params.kminicio != null && params.kminicio !== "" ? Number(params.kminicio) : null
    const kmFin = params.kmfin != null && params.kmfin !== "" ? Number(params.kmfin) : null

    if (!autoId) throw new Error("El auto es requerido")
    if (kmInicio == null) throw new Error("El km inicial es requerido")
    if (kmFin != null && kmFin <= kmInicio) throw new Error("El km final debe ser mayor al km inicial")

    const sheet = getSheet("Viajes")
    const id = Utilities.getUuid()
    const now = new Date().toISOString()

    sheet.appendRow([id, autoId, kmInicio, kmFin, now])

    const raw = params.participantes || ""
    const usuarioIds = raw
      ? String(raw).split(",").map(function (s) { return s.trim() }).filter(Boolean)
      : []

    if (usuarioIds.length > 0) {
      const participantesSheet = getSheet("Participantes")
      usuarioIds.forEach(function (usuarioId) {
        participantesSheet.appendRow([Utilities.getUuid(), id, usuarioId])
      })
    }

    const nuevoKm = kmFin != null ? kmFin : kmInicio
    bumpKmActual(autoId, nuevoKm)

    return { id: id, auto: autoId, kminicio: kmInicio, kmfin: kmFin, createdat: now, participantes: usuarioIds }
  } finally {
    lock.releaseLock()
  }
}

function updateViaje(params) {
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const id = params.id
    if (!id) throw new Error("Se requiere un ID")

    const sheet = getSheet("Viajes")
    const data = sheet.getDataRange().getValues()
    const headers = data[0].map(function (h) { return String(h).trim().toLowerCase() })
    const idCol = headers.indexOf("id")
    const autoCol = headers.indexOf("auto")
    const kminicioCol = headers.indexOf("kminicio")
    const kmfinCol = headers.indexOf("kmfin")

    let rowIndex = -1
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id)) { rowIndex = i; break }
    }
    if (rowIndex === -1) throw new Error("Registro no encontrado")

    const existingAuto = data[rowIndex][autoCol]
    const existingKmInicio = data[rowIndex][kminicioCol]
    const existingKmFin = data[rowIndex][kmfinCol]

    const updates = {}
    if (params.auto !== undefined) updates.auto = String(params.auto).trim()
    if (params.kminicio !== undefined && params.kminicio !== "") updates.kminicio = Number(params.kminicio)
    if (params.kmfin !== undefined && params.kmfin !== "") updates.kmfin = Number(params.kmfin)

    const kmInicioFinal = updates.kminicio !== undefined
      ? updates.kminicio
      : (existingKmInicio !== "" && existingKmInicio != null ? Number(existingKmInicio) : null)
    const kmFinFinal = updates.kmfin !== undefined
      ? updates.kmfin
      : (existingKmFin !== "" && existingKmFin != null ? Number(existingKmFin) : null)

    if (kmFinFinal != null && kmInicioFinal != null && kmFinFinal <= kmInicioFinal) {
      throw new Error("El km final debe ser mayor al km inicial")
    }

    const result = updateRow("Viajes", id, updates)

    const autoIdFinal = updates.auto !== undefined ? updates.auto : existingAuto
    const nuevoKm = kmFinFinal != null ? kmFinFinal : kmInicioFinal
    bumpKmActual(autoIdFinal, nuevoKm)

    return result
  } finally {
    lock.releaseLock()
  }
}

function bumpKmActual(autoId, km) {
  if (!autoId || km == null) return

  const sheet = getSheet("Autos")
  const data = sheet.getDataRange().getValues()
  const headers = data[0].map(function (h) { return String(h).trim().toLowerCase() })
  const idCol = headers.indexOf("id")
  const kmCol = headers.indexOf("kmactual")

  if (idCol === -1 || kmCol === -1) return

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(autoId)) {
      const current = data[i][kmCol]
      const currentNum = current === "" || current == null ? null : Number(current)
      if (currentNum == null || km > currentNum) {
        sheet.getRange(i + 1, kmCol + 1).setValue(km)
      }
      return
    }
  }
}
