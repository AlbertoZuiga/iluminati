function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON)
}

function respondError(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON)
}

function rowToObject(headers, row) {
  const obj = {}
  headers.forEach(function (header, i) {
    const key = String(header).trim().toLowerCase()
    let value = row[i]
    if (value === "") value = null
    if (value instanceof Date) value = value.toISOString()
    obj[key] = value
  })
  return obj
}

function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name)
  if (!sheet) throw new Error("Hoja '" + name + "' no encontrada")
  return sheet
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues()
  if (data.length <= 1) return []
  const headers = data[0]
  return data.slice(1).map(function (row) { return rowToObject(headers, row) })
}

function appendRowByHeaders(sheetName, values) {
  const sheet = getSheet(sheetName)
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase() })
  const row = headers.map(function (h) {
    return Object.prototype.hasOwnProperty.call(values, h) ? values[h] : ""
  })
  sheet.appendRow(row)
}

function updateRow(sheetName, id, updates) {
  if (!id) throw new Error("Se requiere un ID")

  const sheet = getSheet(sheetName)
  const data = sheet.getDataRange().getValues()
  const headers = data[0].map(function(h) { return String(h).trim().toLowerCase() })
  const idCol = headers.indexOf("id")

  if (idCol === -1) throw new Error("Columna 'id' no encontrada")

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      Object.keys(updates).forEach(function(field) {
        const col = headers.indexOf(field.toLowerCase())
        if (col !== -1) sheet.getRange(i + 1, col + 1).setValue(updates[field])
      })
      return { id: id }
    }
  }

  throw new Error("Registro no encontrado")
}

function softDelete(sheetName, id) {
  if (!id) throw new Error("Se requiere un ID")

  const sheet = getSheet(sheetName)
  const data = sheet.getDataRange().getValues()
  const headers = data[0]
  const idCol = headers.indexOf("id")
  const activoCol = headers.indexOf("activo")

  if (idCol === -1 || activoCol === -1) throw new Error("Columnas requeridas no encontradas")

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.getRange(i + 1, activoCol + 1).setValue(false)
      return { id: id }
    }
  }

  throw new Error("Registro no encontrado")
}
