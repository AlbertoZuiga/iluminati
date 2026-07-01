function getAutoUsuarios() {
  return sheetToObjects(getSheet("AutoUsuarios"))
}

function setAutoUsuarios(params) {
  const autoId = params.autoid
  if (!autoId) throw new Error("Se requiere autoid")

  const raw = params.usuarioids || ""
  const usuarioIds = raw
    ? String(raw).split(",").map(function (s) { return s.trim() }).filter(Boolean)
    : []

  const sheet = getSheet("AutoUsuarios")
  const data = sheet.getDataRange().getValues()

  if (data.length > 1) {
    const headers = data[0].map(function (h) { return String(h).trim().toLowerCase() })
    const autoIdCol = headers.indexOf("autoid")

    for (var i = data.length - 1; i >= 1; i--) {
      if (String(data[i][autoIdCol]) === String(autoId)) {
        sheet.deleteRow(i + 1)
      }
    }
  }

  usuarioIds.forEach(function (usuarioId) {
    const id = Utilities.getUuid()
    sheet.appendRow([id, autoId, usuarioId])
  })

  return { autoid: autoId, count: usuarioIds.length }
}
