function clp(n) {
  const v = Math.round(Number(n) || 0)
  return `$${v.toLocaleString("es-CL")}`
}

// Render de una liquidación (objeto saldos): balance por persona, transferencias y detalle por auto.
export default function LiquidacionDetalle({ data }) {
  const totales = data.totales || []
  const transferencias = data.transferencias || []

  return (
    <>
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
    </>
  )
}
