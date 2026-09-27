function getAutoUsuarios() {
  return sheetToObjects(getSheet("AutoUsuarios"))
}

function setAutoUsuarios(params) {
  return withLock(function () {
    const autoId = params.autoid
    if (!autoId) throw new Error("Se requiere autoid")

    // Payload nuevo: miembros = JSON [{usuarioid, dividegastos, recibebono, pagaestanque}].
    // Fallback legado: usuarioids = CSV de ids (sin flags).
    let miembros = []
    if (params.miembros) {
      const parsed = JSON.parse(params.miembros)
      miembros = parsed.map(function (m) {
        return {
          usuarioid: String(m.usuarioid || "").trim(),
          dividegastos: !!m.dividegastos,
          recibebono: !!m.recibebono,
          pagaestanque: !!m.pagaestanque,
        }
      }).filter(function (m) { return m.usuarioid })
    } else {
      const raw = params.usuarioids || ""
      miembros = (raw ? String(raw).split(",") : [])
        .map(function (s) { return s.trim() }).filter(Boolean)
        .map(function (uid) {
          return { usuarioid: uid, dividegastos: true, recibebono: false, pagaestanque: false }
        })
    }

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

    miembros.forEach(function (m) {
      appendRowByHeaders("AutoUsuarios", {
        id: Utilities.getUuid(),
        autoid: autoId,
        usuarioid: m.usuarioid,
        dividegastos: m.dividegastos,
        recibebono: m.recibebono,
        pagaestanque: m.pagaestanque,
      })
    })

    return { autoid: autoId, count: miembros.length }
  })
}
