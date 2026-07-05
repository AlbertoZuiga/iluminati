import { useEffect, useState } from "react"
import { getSaldos } from "../services/api"

function clp(n) {
  const v = Math.round(Number(n) || 0)
  return `$${v.toLocaleString("es-CL")}`
}

export default function SaldosPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  function cargarSaldos({ background, onDone } = {}) {
    if (background) setRefreshing(true)
    else setLoading(true)
    getSaldos()
      .then((d) => { if (onDone?.cancelled) return; setData(d); setError("") })
      .catch((err) => { if (onDone?.cancelled) return; setError(err.message || "No se pudieron calcular los saldos") })
      .finally(() => {
        if (onDone?.cancelled) return
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    const estado = { cancelled: false }
    cargarSaldos({ onDone: estado })
    return () => { estado.cancelled = true }
  }, [])

  if (loading) {
    return <section><div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div></section>
  }

  if (error) {
    return <section><p className="feedback-banner feedback-error" role="alert">{error}</p></section>
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
          onClick={() => cargarSaldos({ background: true })}
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
