function doGet(e) {
  try {
    const action = e.parameter.action

    if (action === "usuarios") return respond(getUsuarios())
    if (action === "autos") return respond(getAutos())

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

    return respondError("Acción no reconocida: " + action)
  } catch (err) {
    return respondError(err.message)
  }
}
