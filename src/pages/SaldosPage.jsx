import { useEffect, useState } from "react"
import { useData } from "../context/DataContext"
import LiquidacionDetalle from "../components/LiquidacionDetalle"

export default function SaldosPage() {
  const { saldos: data, saldosLoading, saldosError, fetchSaldos } = useData()
  const [refreshing, setRefreshing] = useState(false)

  // Usa el cache del contexto; solo pide si no hay datos aún.
  useEffect(() => {
    fetchSaldos().catch(() => {})
  }, [fetchSaldos])

  function actualizar() {
    setRefreshing(true)
    fetchSaldos({ force: true }).catch(() => {}).finally(() => setRefreshing(false))
  }

  if (saldosLoading && !data) {
    return <section><div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div></section>
  }

  if (saldosError && !data) {
    return <section><p className="feedback-banner feedback-error" role="alert">No se pudieron calcular los saldos</p></section>
  }

  if (!data?.periodo) {
    return <section><p className="empty-state">No hay un periodo abierto. Abre uno en la sección Periodos.</p></section>
  }

  return (
    <section>
      <div className="section-header" style={{ marginBottom: 16 }}>
        <p className="section-count">
          Periodo: <strong>{data.periodo.nombre || "Sin nombre"}</strong> · desde {new Date(data.periodo.fechainicio).toLocaleDateString("es-CL")}
        </p>
        <button
          className="btn btn-ghost"
          onClick={actualizar}
          disabled={refreshing}
        >
          {refreshing ? "…" : "Actualizar"}
        </button>
      </div>

      <LiquidacionDetalle data={data} />
    </section>
  )
}
