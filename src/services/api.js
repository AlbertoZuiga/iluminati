const API_URL = import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_URL

function buildUrl(action, params) {
  if (!API_URL) throw new Error("VITE_API_URL no está configurada")

  const url = new URL(API_URL, window.location.origin)
  url.searchParams.set("action", action)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  })
  return url.toString()
}

function toFormBody(data) {
  const body = new URLSearchParams()
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.set(key, String(value))
    }
  })
  return body
}

async function request(action, options = {}) {
  const method = options.method || "GET"
  const url = buildUrl(action, options.params)

  const requestOptions = {
    method,
    cache: "no-store",
    credentials: "omit",
    redirect: "follow",
    mode: "cors",
  }

  if (method !== "GET") {
    requestOptions.headers = {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      ...(options.headers || {}),
    }
    requestOptions.body = toFormBody({ action, ...(options.body || {}) })
  }

  const controller = new AbortController()
  // Los POST a GAS pueden tardar (cold start + LockService.waitLock de hasta 10s +
  // escritura). Damos más margen a las escrituras que a las lecturas.
  const timeoutMs = options.timeout ?? (method === "GET" ? 20000 : 45000)
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  requestOptions.signal = controller.signal

  let response
  try {
    response = await fetch(url, requestOptions)
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("La API tardó demasiado en responder. Revisa la conexión o el despliegue.", {
        cause: err,
      })
    }
    throw new Error(`No se pudo conectar con la API. ${err.message || "Failed to fetch"}`, {
      cause: err,
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Error HTTP ${response.status}`)
  }

  const text = await response.text()
  if (!text) return null

  let json
  try {
    json = JSON.parse(text)
  } catch {
    console.error("[api] Respuesta no-JSON del servidor:", text.slice(0, 500))
    throw new Error("El servidor devolvió una respuesta inesperada. Revisa la consola para más detalles.")
  }

  if (json.ok === false) {
    throw new Error(json.error || "Error en la API")
  }

  return json.data ?? json
}

export async function createAuto(data) {
  return request("createAuto", { method: "POST", body: data })
}

export async function createUsuario(data) {
  return request("createUsuario", { method: "POST", body: data })
}

export async function updateAuto(id, data) {
  return request("updateAuto", { method: "POST", body: { id, ...data } })
}

export async function updateUsuario(id, data) {
  return request("updateUsuario", { method: "POST", body: { id, ...data } })
}

export async function deleteAuto(id) {
  return request("deleteAuto", { method: "POST", body: { id } })
}

export async function deleteUsuario(id) {
  return request("deleteUsuario", { method: "POST", body: { id } })
}

export async function getBootstrap() {
  return request("bootstrap")
}

export async function createViaje(data) {
  return request("createViaje", { method: "POST", body: data })
}

export async function updateViaje(id, data) {
  return request("updateViaje", { method: "POST", body: { id, ...data } })
}

export async function deleteViaje(id) {
  return request("deleteViaje", { method: "POST", body: { id } })
}

export async function saveParticipantes(viajeId, usuarioIds) {
  return request("setParticipantes", {
    method: "POST",
    body: { viajeid: viajeId, usuarioids: usuarioIds.join(",") },
  })
}

export async function createGasto(data) {
  return request("createGasto", { method: "POST", body: data })
}

export async function updateGasto(id, data) {
  return request("updateGasto", { method: "POST", body: { id, ...data } })
}

export async function deleteGasto(id) {
  return request("deleteGasto", { method: "POST", body: { id } })
}

// miembros: [{ usuarioid, rol, dividegastos, recibebono, pagaestanque }]
export async function saveAutoUsuarios(autoId, miembros) {
  return request("setAutoUsuarios", {
    method: "POST",
    body: { autoid: autoId, miembros: JSON.stringify(miembros) },
  })
}

export async function createPeriodo(data = {}) {
  return request("createPeriodo", { method: "POST", body: data })
}

export async function updatePeriodo(id, data) {
  return request("updatePeriodo", { method: "POST", body: { id, ...data } })
}

export async function cerrarPeriodo(data = {}) {
  return request("cerrarPeriodo", { method: "POST", body: data })
}

export async function getSaldos() {
  return request("saldos")
}

export async function getLiquidacion(periodoid) {
  return request("liquidacion", { params: { periodoid } })
}
