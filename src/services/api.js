const API_URL = import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_URL

function buildUrl(action) {
  if (!API_URL) throw new Error("VITE_API_URL no está configurada")

  const url = new URL(API_URL, window.location.origin)
  url.searchParams.set("action", action)
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
  const url = buildUrl(action)

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

  let response
  try {
    response = await fetch(url, requestOptions)
  } catch (err) {
    throw new Error(`No se pudo conectar con la API. ${err.message || "Failed to fetch"}`, {
      cause: err,
    })
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

export async function getAutos() {
  return request("autos")
}

export async function getUsuarios() {
  return request("usuarios")
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
