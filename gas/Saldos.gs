// Liquidación del periodo abierto. Signo neto: positivo = debe pagar, negativo = le deben.
function getSaldos() {
  const periodo = getPeriodoAbierto()
  if (!periodo) {
    return { periodo: null, autos: [], totales: [], transferencias: [] }
  }

  const startTs = toLocalDayTs(periodo.fechainicio)
  const endTs = periodo.fechafin ? toLocalDayTs(periodo.fechafin) : Infinity
  function inPeriodo(dateVal) {
    const t = toLocalDayTs(dateVal)
    return !isNaN(t) && t >= startTs && t < endTs
  }

  const autos = getAutos()
  const usuarios = getUsuarios()
  const autoUsuarios = getAutoUsuarios()
  const gastos = getGastos().filter(function (g) { return inPeriodo(g.fecha) })
  const viajes = getViajes().filter(function (v) { return inPeriodo(v.createdat) })
  const participantes = getParticipantes()

  const nombreUsuario = {}
  usuarios.forEach(function (u) { nombreUsuario[u.id] = u.nombre || u.id })

  // Miembros por auto con sus flags.
  const miembrosPorAuto = {}
  autoUsuarios.forEach(function (r) {
    if (!miembrosPorAuto[r.autoid]) miembrosPorAuto[r.autoid] = []
    miembrosPorAuto[r.autoid].push({
      usuarioid: r.usuarioid,
      dividegastos: toBool(r.dividegastos),
      recibebono: toBool(r.recibebono),
      pagaestanque: toBool(r.pagaestanque),
    })
  })

  // Participantes por viaje.
  const partsPorViaje = {}
  participantes.forEach(function (p) {
    if (!partsPorViaje[p.viajeid]) partsPorViaje[p.viajeid] = []
    partsPorViaje[p.viajeid].push(p.usuarioid)
  })

  // Acumulador global por usuario.
  const acc = {}
  function bucket(uid) {
    if (!acc[uid]) acc[uid] = { usuarioid: uid, nombre: nombreUsuario[uid] || uid, deudagastos: 0, deudabencina: 0, credito: 0 }
    return acc[uid]
  }

  const autosOut = []

  autos.forEach(function (auto) {
    const miembros = miembrosPorAuto[auto.id] || []
    const gastosAuto = gastos.filter(function (g) { return g.auto === auto.id })
    const viajesAuto = viajes.filter(function (v) { return v.auto === auto.id })

    // Deuda de bencina local (para aplicar bono antes de volcar al acumulador global).
    const bencinaLocal = {}
    function benc(uid) { if (bencinaLocal[uid] == null) bencinaLocal[uid] = 0; return bencinaLocal[uid] }

    // --- Bucket A: gastos compartidos (todo tipo != Bencina) ---
    const divisores = miembros.filter(function (m) { return m.dividegastos }).map(function (m) { return m.usuarioid })
    gastosAuto.forEach(function (g) {
      if (String(g.tipo).toLowerCase() === "bencina") return
      const monto = Number(g.monto) || 0
      if (g.pagadopor) bucket(g.pagadopor).credito += monto
      if (divisores.length > 0) {
        const parte = monto / divisores.length
        divisores.forEach(function (uid) { bucket(uid).deudagastos += parte })
      }
    })

    // --- Bucket B: bencina proporcional a km ---
    const totalBencina = gastosAuto.reduce(function (s, g) {
      return s + (String(g.tipo).toLowerCase() === "bencina" ? (Number(g.monto) || 0) : 0)
    }, 0)
    const totalKm = viajesAuto.reduce(function (s, v) {
      const km = (Number(v.kmfin) || 0) - (Number(v.kminicio) || 0)
      return s + (km > 0 ? km : 0)
    }, 0)
    const costoKm = totalKm > 0 ? totalBencina / totalKm : 0

    gastosAuto.forEach(function (g) {
      if (String(g.tipo).toLowerCase() === "bencina" && g.pagadopor) {
        bucket(g.pagadopor).credito += Number(g.monto) || 0
      }
    })
    viajesAuto.forEach(function (v) {
      const km = (Number(v.kmfin) || 0) - (Number(v.kminicio) || 0)
      if (km <= 0) return
      const parts = partsPorViaje[v.id] || []
      if (parts.length === 0) return
      const parte = (km * costoKm) / parts.length
      parts.forEach(function (uid) { bencinaLocal[uid] = benc(uid) + parte })
    })

    // --- Bucket C: bono ---
    // Excedente = Σ (lo que cada dador PAGÓ de bencina − lo que USÓ). El estanque varía,
    // así que se deriva del pago real, no de un monto fijo.
    let excedente = 0
    if (toBool(auto.tienebono)) {
      const dadores = miembros.filter(function (m) { return m.pagaestanque })
      const aportePorDador = {}
      dadores.forEach(function (m) {
        const pago = gastosAuto.reduce(function (s, g) {
          return s + (String(g.tipo).toLowerCase() === "bencina" && g.pagadopor === m.usuarioid ? (Number(g.monto) || 0) : 0)
        }, 0)
        const aporte = pago - benc(m.usuarioid)
        aportePorDador[m.usuarioid] = aporte
        excedente += aporte
      })
      excedente = Math.max(0, excedente)

      const receptores = miembros.filter(function (m) { return m.recibebono }).map(function (m) { return m.usuarioid })
      if (excedente > 0 && receptores.length > 0) {
        const cuota = excedente / receptores.length
        let forgiven = 0
        receptores.forEach(function (uid) {
          const red = Math.min(cuota, benc(uid))
          bencinaLocal[uid] = benc(uid) - red
          forgiven += red
        })
        // Los dadores perdonan lo repartido: rebaja su crédito (proporcional a su aporte) para que el balance cierre.
        const totalPos = dadores.reduce(function (s, m) { return s + Math.max(0, aportePorDador[m.usuarioid]) }, 0)
        if (totalPos > 0) {
          dadores.forEach(function (m) {
            const w = Math.max(0, aportePorDador[m.usuarioid]) / totalPos
            bucket(m.usuarioid).credito -= forgiven * w
          })
        }
      }
    }

    // Volcar bencina local al acumulador global.
    const saldosAuto = []
    Object.keys(bencinaLocal).forEach(function (uid) {
      bucket(uid).deudabencina += bencinaLocal[uid]
    })
    miembros.forEach(function (m) {
      saldosAuto.push({
        usuarioid: m.usuarioid,
        nombre: nombreUsuario[m.usuarioid] || m.usuarioid,
        deudabencina: round2(bencinaLocal[m.usuarioid] || 0),
      })
    })

    autosOut.push({
      autoid: auto.id,
      nombre: auto.nombre || auto.id,
      totalbencina: round2(totalBencina),
      totalkm: totalKm,
      costokm: round2(costoKm),
      tienebono: toBool(auto.tienebono),
      excedentebono: round2(excedente),
      saldos: saldosAuto,
    })
  })

  const totales = Object.keys(acc).map(function (uid) {
    const a = acc[uid]
    return {
      usuarioid: a.usuarioid,
      nombre: a.nombre,
      deudagastos: round2(a.deudagastos),
      deudabencina: round2(a.deudabencina),
      credito: round2(a.credito),
      neto: round2(a.deudagastos + a.deudabencina - a.credito),
    }
  }).sort(function (x, y) { return y.neto - x.neto })

  return { periodo: periodo, autos: autosOut, totales: totales, transferencias: calcularTransferencias(totales) }
}

// Convierte una fecha a timestamp de medianoche en hora LOCAL (día calendario), sin desfases de zona horaria.
// Los strings "yyyy-mm-dd" puros se interpretan como fecha local (no UTC) para evitar que un gasto de borde
// caiga en el periodo equivocado en zonas UTC-negativas (ej. Chile).
function toLocalDayTs(v) {
  if (!v) return NaN
  var d
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    var partes = v.split("-")
    d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
  } else {
    d = new Date(v)
  }
  if (isNaN(d.getTime())) return NaN
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Sugiere transferencias mínimas para saldar el periodo (greedy: mayor deudor con mayor acreedor).
function calcularTransferencias(totales) {
  const UMBRAL = 1 // ignora residuos de redondeo menores a $1

  const deudores = totales
    .filter(function (t) { return t.neto > 0 })
    .map(function (t) { return { usuarioid: t.usuarioid, nombre: t.nombre, monto: t.neto } })
    .sort(function (a, b) { return b.monto - a.monto })

  const acreedores = totales
    .filter(function (t) { return t.neto < 0 })
    .map(function (t) { return { usuarioid: t.usuarioid, nombre: t.nombre, monto: -t.neto } })
    .sort(function (a, b) { return b.monto - a.monto })

  const transferencias = []
  let i = 0
  let j = 0
  while (i < deudores.length && j < acreedores.length) {
    const deudor = deudores[i]
    const acreedor = acreedores[j]
    const monto = Math.min(deudor.monto, acreedor.monto)

    if (monto >= UMBRAL) {
      transferencias.push({
        de: deudor.usuarioid,
        deNombre: deudor.nombre,
        a: acreedor.usuarioid,
        aNombre: acreedor.nombre,
        monto: round2(monto),
      })
    }

    deudor.monto -= monto
    acreedor.monto -= monto
    if (deudor.monto < UMBRAL) i++
    if (acreedor.monto < UMBRAL) j++
  }

  return transferencias
}

function toBool(v) {
  if (v === true) return true
  if (typeof v === "string") return v.toLowerCase() === "true" || v === "1"
  return false
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}
