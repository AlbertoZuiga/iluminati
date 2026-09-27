function doGet(e) {
  try {
    const action = e.parameter.action

    if (action === "usuarios") return respond(getUsuarios())
    if (action === "autos") return respond(getAutos())
    if (action === "viajes") return respond(getViajes())
    if (action === "participantes") return respond(getParticipantes())
    if (action === "autousuarios") return respond(getAutoUsuarios())
    if (action === "gastos") return respond(getGastos())
    if (action === "periodos") return respond(getPeriodos())
    if (action === "saldos") return respond(getSaldos())
    if (action === "liquidacion") return respond(getLiquidacion(e.parameter.periodoid))
    if (action === "bootstrap") return respond({
      viajes: getViajes(),
      autos: getAutos(),
      usuarios: getUsuarios(),
      participantes: getParticipantes(),
      autousuarios: getAutoUsuarios(),
      gastos: getGastos(),
      periodos: getPeriodos(),
    })

    return respondError("Acción no reconocida: " + action)
  } catch (err) {
    return respondError(err.message)
  }
}

function doPost(e) {
  try {
    const params = e.parameter
    const action = params.action

    if (action === "createUsuario") return respond(createUsuario(params))
    if (action === "createAuto") return respond(createAuto(params))
    if (action === "updateUsuario") return respond(updateUsuario(params))
    if (action === "updateAuto") return respond(updateAuto(params))
    if (action === "deleteUsuario") return respond(softDelete("Usuarios", params.id))
    if (action === "deleteAuto") return respond(softDelete("Autos", params.id))
    if (action === "createViaje") return respond(createViaje(params))
    if (action === "updateViaje") return respond(updateViaje(params))
    if (action === "setParticipantes") return respond(setParticipantes(params))
    if (action === "setAutoUsuarios") return respond(setAutoUsuarios(params))
    if (action === "deleteViaje") return respond(deleteViaje(params))
    if (action === "createGasto") return respond(createGasto(params))
    if (action === "updateGasto") return respond(updateGasto(params))
    if (action === "deleteGasto") return respond(deleteGasto(params))
    if (action === "createPeriodo") return respond(createPeriodo(params))
    if (action === "updatePeriodo") return respond(updatePeriodo(params))
    if (action === "cerrarPeriodo") return respond(cerrarPeriodo(params))

    return respondError("Acción no reconocida: " + action)
  } catch (err) {
    return respondError(err.message)
  }
}
