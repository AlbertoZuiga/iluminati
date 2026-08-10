import { useMemo } from "react"
import { useData } from "../context/DataContext"

// Espejo de toLocalDayTs en gas/Saldos.gs: "yyyy-mm-dd" se lee como fecha local, no UTC.
function toLocalDayTs(v) {
  if (!v) return NaN
  let d
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, dd] = v.split("-")
    d = new Date(Number(y), Number(m) - 1, Number(dd))
  } else {
    d = new Date(v)
  }
  if (isNaN(d.getTime())) return NaN
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// Devuelve (fecha) => bool con la misma ventana half-open [inicio, fin) que el backend,
// para no ofrecer editar o borrar lo que assertNoEnPeriodoCerrado va a rechazar.
export function useEnPeriodoCerrado() {
  const { periodos } = useData()

  return useMemo(() => {
    const cerrados = periodos
      .filter((p) => p.fechafin)
      .map((p) => ({ start: toLocalDayTs(p.fechainicio), end: toLocalDayTs(p.fechafin) }))
      .filter((r) => !isNaN(r.start) && !isNaN(r.end))

    return (fecha) => {
      const t = toLocalDayTs(fecha)
      if (isNaN(t)) return false
      return cerrados.some((r) => t >= r.start && t < r.end)
    }
  }, [periodos])
}
