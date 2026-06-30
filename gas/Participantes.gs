function getParticipantes() {
  return sheetToObjects(getSheet("Participantes"))
}

function setParticipantes(params) {
  const viajeId = params.viajeid
  if (!viajeId) throw new Error("Se requiere viajeid")

  const raw = params.usuarioids || ""
  const usuarioIds = raw
    ? String(raw).split(",").map(function (s) { return s.trim() }).filter(Boolean)
    : []

  const sheet = getSheet("Participantes")
  const data = sheet.getDataRange().getValues()

  if (data.length > 1) {
    const headers = data[0].map(function (h) { return String(h).trim().toLowerCase() })
    const viajeIdCol = headers.indexOf("viajeid")

    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][viajeIdCol]) === String(viajeId)) {
        sheet.deleteRow(i + 1)
      }
    }
  }

  usuarioIds.forEach(function (usuarioId) {
    const id = Utilities.getUuid()
    sheet.appendRow([id, viajeId, usuarioId])
  })

  return { viajeid: viajeId, count: usuarioIds.length }
}
