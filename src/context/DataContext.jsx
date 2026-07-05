import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { getBootstrap } from "../services/api"
import { normalizeCollection } from "../utils/normalizeCollection"

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [viajes, setViajes] = useState([])
  const [autos, setAutos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [participantes, setParticipantes] = useState([])
  const [autoUsuarios, setAutoUsuarios] = useState([])
  const [gastos, setGastos] = useState([])
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
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
  }

  useEffect(() => {
    let cancelled = false
    getBootstrap()
      .then((data) => { if (!cancelled) applyBootstrap(data) })
      .catch((err) => { if (!cancelled) setError(err.message || "No se pudieron cargar los datos") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

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
