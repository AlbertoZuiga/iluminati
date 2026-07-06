import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { getBootstrap } from "../services/api"
import { normalizeCollection } from "../utils/normalizeCollection"

const DataContext = createContext(null)
const BOOTSTRAP_CACHE_KEY = "iluminati:bootstrap"

// Lee el snapshot del bootstrap cacheado en localStorage (best-effort).
function readCachedBootstrap() {
  try {
    const raw = localStorage.getItem(BOOTSTRAP_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.data ?? null
  } catch {
    return null // JSON corrupto u otro: ignorar el cache
  }
}

// Guarda el data crudo del bootstrap (con timestamp). Ignora errores de quota.
function writeCachedBootstrap(data) {
  try {
    localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch {
    // quota excedida u otro: el cache es opcional, seguir
  }
}

export function DataProvider({ children }) {
  // Snapshot cacheado (si existe) para pintar al instante — stale-while-revalidate.
  const [cached] = useState(readCachedBootstrap)

  const [viajes, setViajes] = useState(() => normalizeCollection(cached?.viajes))
  const [autos, setAutos] = useState(() => normalizeCollection(cached?.autos))
  const [usuarios, setUsuarios] = useState(() => normalizeCollection(cached?.usuarios))
  const [participantes, setParticipantes] = useState(() => normalizeCollection(cached?.participantes))
  const [autoUsuarios, setAutoUsuarios] = useState(() => normalizeCollection(cached?.autousuarios))
  const [gastos, setGastos] = useState(() => normalizeCollection(cached?.gastos))
  const [periodos, setPeriodos] = useState(() => normalizeCollection(cached?.periodos))
  const [loading, setLoading] = useState(cached == null)
  const [refreshing, setRefreshing] = useState(cached != null)
  const [error, setError] = useState("")

  function applyBootstrap(data) {
    setViajes(normalizeCollection(data?.viajes))
    setAutos(normalizeCollection(data?.autos))
    setUsuarios(normalizeCollection(data?.usuarios))
    setParticipantes(normalizeCollection(data?.participantes))
    setAutoUsuarios(normalizeCollection(data?.autousuarios))
    setGastos(normalizeCollection(data?.gastos))
    setPeriodos(normalizeCollection(data?.periodos))
    setError("")
    writeCachedBootstrap(data)
  }

  useEffect(() => {
    let cancelled = false
    getBootstrap()
      .then((data) => { if (!cancelled) applyBootstrap(data) })
      .catch((err) => {
        // Con cache mostrándose, no romper la UI: solo reportar si no había cache.
        if (!cancelled && cached == null) setError(err.message || "No se pudieron cargar los datos")
      })
      .finally(() => { if (!cancelled) { setLoading(false); setRefreshing(false) } })
    return () => { cancelled = true }
  }, [cached])

  const reload = useCallback(() => {
    setRefreshing(true)
    return getBootstrap()
      .then((data) => applyBootstrap(data))
      .catch((err) => setError(err.message || "No se pudieron cargar los datos"))
      .finally(() => setRefreshing(false))
  }, [])

  const value = {
    viajes, setViajes,
    autos, setAutos,
    usuarios, setUsuarios,
    participantes, setParticipantes,
    autoUsuarios, setAutoUsuarios,
    gastos, setGastos,
    periodos, setPeriodos,
    loading, refreshing, error,
    reload,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData debe usarse dentro de un DataProvider")
  return ctx
}
