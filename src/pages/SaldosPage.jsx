import { useEffect, useState } from "react"
import { useData } from "../context/DataContext"

function clp(n) {
  const v = Math.round(Number(n) || 0)
  return `$${v.toLocaleString("es-CL")}`
}

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

  const totales = data.totales || []
  const transferencias = data.transferencias || []

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

      <p className="subsection-title">Balance por persona</p>
      {totales.length === 0 ? (
        <p className="empty-state">Sin movimientos en este periodo.</p>
      ) : (
        <ul className="data-list">
          {totales.map((t) => (
            <li key={t.usuarioid}>
              <div className="list-item-main">
                <strong>{t.nombre}</strong>
                <span className={`badge ${t.neto > 0 ? "badge-inactive" : "badge-active"}`}>
                  {t.neto > 0 ? `Debe ${clp(t.neto)}` : t.neto < 0 ? `Le deben ${clp(-t.neto)}` : "Al día"}
                </span>
              </div>
              <span className="list-item-sub">
                Gastos {clp(t.deudagastos)} · Bencina {clp(t.deudabencina)} · Pagó {clp(t.credito)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="subsection-title" style={{ marginTop: 24 }}>Quién paga a quién</p>
      {transferencias.length === 0 ? (
        <p className="empty-state">{totales.length === 0 ? "Sin movimientos en este periodo." : "Todo saldado."}</p>
      ) : (
        <ul className="data-list">
          {transferencias.map((tr, i) => (
            <li key={`${tr.de}-${tr.a}-${i}`}>
              <div className="list-item-main">
                <strong>{tr.deNombre} → {tr.aNombre}</strong>
                <span className="badge badge-inactive">{clp(tr.monto)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="subsection-title" style={{ marginTop: 24 }}>Detalle por auto</p>
      {(data.autos || []).length === 0 ? (
        <p className="empty-state">Sin autos con movimientos.</p>
      ) : (
        <ul className="data-list">
          {data.autos.map((a) => (
            <li key={a.autoid}>
              <div className="list-item-main">
                <strong>{a.nombre}</strong>
                {a.totalkm > 0 && <span className="badge badge-active">{clp(a.costokm)}/km</span>}
              </div>
              <span className="list-item-sub">
                Bencina {clp(a.totalbencina)} · {a.totalkm} km
                {a.tienebono && a.excedentebono > 0 ? ` · Bono repartido ${clp(a.excedentebono)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
