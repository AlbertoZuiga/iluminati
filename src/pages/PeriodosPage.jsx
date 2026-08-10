import { useMemo, useRef, useState } from "react"
import { createPeriodo, updatePeriodo, cerrarPeriodo, getLiquidacion } from "../services/api"
import { useData } from "../context/DataContext"
import useFeedback from "../hooks/useFeedback"
import Modal from "../components/Modal"
import EditButton from "../components/EditButton"
import LiquidacionDetalle from "../components/LiquidacionDetalle"

function fmtFecha(v) {
  if (!v) return "—"
  const d = new Date(v)
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("es-CL")
}

// ISO/fecha almacenada → yyyy-mm-dd para <input type="date"> (en hora local).
function toDateInput(v) {
  if (!v) return ""
  const d = new Date(v)
  if (isNaN(d.getTime())) return ""
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export default function PeriodosPage() {
  const { periodos, loading, reload } = useData()
  const [nombre, setNombre] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const { success, showSuccess } = useFeedback()
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ nombre: "", fechainicio: "", fechafin: "" })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [confirmCerrarOpen, setConfirmCerrarOpen] = useState(false)
  const [liqTarget, setLiqTarget] = useState(null)
  const [liqLoading, setLiqLoading] = useState(false)
  const [liqError, setLiqError] = useState("")
  const [liqData, setLiqData] = useState(null)
  const liqReqRef = useRef(null) // descarta respuestas de una liquidación ya descartada

  const abierto = useMemo(() => periodos.find((p) => !p.fechafin) || null, [periodos])
  const cerrados = useMemo(
    () => periodos.filter((p) => p.fechafin).sort((a, b) => new Date(b.fechainicio) - new Date(a.fechainicio)),
    [periodos]
  )

  async function handleAbrir(e) {
    e.preventDefault()
    setBusy(true)
    setError("")
    try {
      await createPeriodo({ nombre })
      setNombre("")
      await reload()
      showSuccess("Periodo abierto.")
    } catch (err) {
      setError(err.message || "No se pudo abrir el periodo")
    } finally {
      setBusy(false)
    }
  }

  function handleCerrar() {
    setConfirmCerrarOpen(true)
  }

  async function handleConfirmCerrar() {
    setBusy(true)
    setError("")
    try {
      await cerrarPeriodo({})
      await reload()
      showSuccess("Periodo cerrado. Se abrió el siguiente.")
      setConfirmCerrarOpen(false)
    } catch (err) {
      setError(err.message || "No se pudo cerrar el periodo")
    } finally {
      setBusy(false)
    }
  }

  function handleOpenLiquidacion(p) {
    setLiqTarget(p)
    setLiqData(null)
    setLiqError("")
    setLiqLoading(true)
    liqReqRef.current = p.id
    getLiquidacion(p.id)
      .then((data) => { if (liqReqRef.current === p.id) setLiqData(data) })
      .catch((err) => { if (liqReqRef.current === p.id) setLiqError(err.message || "No se pudo cargar la liquidación") })
      .finally(() => { if (liqReqRef.current === p.id) setLiqLoading(false) })
  }

  function handleCloseLiquidacion() {
    liqReqRef.current = null
    setLiqTarget(null)
    setLiqData(null)
    setLiqError("")
  }

  function handleOpenEdit(p) {
    setEditTarget(p)
    setEditForm({
      nombre: p.nombre ?? "",
      fechainicio: toDateInput(p.fechainicio),
      fechafin: toDateInput(p.fechafin),
    })
    setEditError("")
  }

  function handleCloseEdit() {
    setEditTarget(null)
    setEditError("")
  }

  function handleEditChange(e) {
    const { name, value } = e.target
    setEditForm((prev) => ({ ...prev, [name]: value }))
  }

  // Conserva el ISO original si el día no cambió; si cambió, usa medianoche local.
  function resolveFecha(inputVal, originalIso) {
    if (!inputVal) return ""
    if (toDateInput(originalIso) === inputVal) return originalIso
    return new Date(`${inputVal}T00:00:00`).toISOString()
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    const esCerrado = !!editTarget.fechafin
    if (esCerrado && !editForm.fechafin) {
      setEditError("La fecha de fin es obligatoria en un periodo cerrado.")
      return
    }
    setEditSaving(true)
    setEditError("")
    try {
      const payload = {
        nombre: editForm.nombre,
        fechainicio: resolveFecha(editForm.fechainicio, editTarget.fechainicio),
      }
      if (esCerrado) {
        payload.fechafin = resolveFecha(editForm.fechafin, editTarget.fechafin)
      }
      await updatePeriodo(editTarget.id, payload)
      await reload()
      handleCloseEdit()
      showSuccess("Periodo actualizado.")
    } catch (err) {
      setEditError(err.message || "No se pudo actualizar el periodo")
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <section>
      {success && <p className="feedback-banner feedback-success feedback-banner-spaced" aria-live="polite">{success}</p>}
      {error && <p className="feedback-banner feedback-error feedback-banner-spaced" role="alert">{error}</p>}

      {loading ? (
        <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /></div>
      ) : (
        <>
          <div className="form-card" style={{ marginBottom: 20 }}>
            <p className="subsection-title">Periodo actual</p>
            {abierto ? (
              <>
                <p style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
                  <strong>{abierto.nombre || "Sin nombre"}</strong>
                  <EditButton onClick={() => handleOpenEdit(abierto)} />
                </p>
                <p className="list-item-sub" style={{ margin: "0 0 12px" }}>
                  Desde {fmtFecha(abierto.fechainicio)} · <span className="badge badge-active">Abierto</span>
                </p>
                <button className="btn btn-primary" onClick={handleCerrar} disabled={busy}>
                  {busy ? "…" : "Cerrar periodo y abrir siguiente"}
                </button>
              </>
            ) : (
              <form onSubmit={handleAbrir}>
                <p className="list-item-sub" style={{ margin: "0 0 12px" }}>No hay periodo abierto.</p>
                <label>
                  <span>Nombre <span className="field-optional">(opcional)</span></span>
                  <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Junio 2026" autoComplete="off" />
                </label>
                <button type="submit" className="btn btn-primary" disabled={busy} style={{ marginTop: 12 }}>
                  {busy ? "…" : "Abrir periodo"}
                </button>
              </form>
            )}
          </div>

          <p className="section-count">Cerrados ({cerrados.length})</p>
          {cerrados.length === 0 ? (
            <p className="empty-state">Aún no hay periodos cerrados.</p>
          ) : (
            <ul className="data-list">
              {cerrados.map((p, i) => (
                <li key={p.id ?? `per-${i}`}>
                  <div className="list-item-main">
                    <strong>{p.nombre || "Sin nombre"}</strong>
                    <span className="badge badge-inactive">Cerrado</span>
                    <EditButton onClick={() => handleOpenEdit(p)} />
                  </div>
                  <span className="list-item-sub">{fmtFecha(p.fechainicio)} — {fmtFecha(p.fechafin)}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginTop: 8 }}
                    onClick={() => handleOpenLiquidacion(p)}
                  >
                    Ver liquidación
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Modal title="Editar periodo" open={editTarget !== null} onClose={handleCloseEdit}>
        <form className="form-card" onSubmit={handleEditSubmit}>
          {editError && (
            <p className="feedback-banner feedback-error" role="alert">{editError}</p>
          )}

          <label>
            <span>Nombre <span className="field-optional">(opcional)</span></span>
            <input type="text" name="nombre" value={editForm.nombre} onChange={handleEditChange} placeholder="Junio 2026" autoComplete="off" />
          </label>

          <label>
            <span>Fecha de inicio</span>
            <input type="date" name="fechainicio" value={editForm.fechainicio} onChange={handleEditChange} required />
          </label>

          {editTarget?.fechafin && (
            <label>
              <span>Fecha de fin</span>
              <input type="date" name="fechafin" value={editForm.fechafin} onChange={handleEditChange} required />
            </label>
          )}

          <button type="submit" className="btn btn-primary" disabled={editSaving}>
            {editSaving ? "Guardando…" : "Guardar cambios"}
          </button>
        </form>
      </Modal>

      <Modal
        title={`Liquidación · ${liqTarget?.nombre || "Sin nombre"}`}
        open={liqTarget !== null}
        onClose={handleCloseLiquidacion}
      >
        {liqLoading ? (
          <div className="skeleton-list"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
        ) : liqError ? (
          <p className="feedback-banner feedback-error" role="alert">{liqError}</p>
        ) : liqData ? (
          <>
            {liqData.snapshot === false && (
              <p className="list-item-sub" style={{ margin: "0 0 12px" }}>
                Recalculado (cerrado antes del sistema de snapshots)
              </p>
            )}
            <LiquidacionDetalle data={liqData} />
          </>
        ) : null}
      </Modal>

      <Modal title="Cerrar periodo" open={confirmCerrarOpen} onClose={() => !busy && setConfirmCerrarOpen(false)}>
        <div className="form-card">
          <p>¿Cerrar el periodo actual y abrir el siguiente? Los gastos y viajes nuevos entrarán al nuevo periodo.</p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmCerrarOpen(false)} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleConfirmCerrar} disabled={busy}>
              {busy ? "…" : "Cerrar periodo"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
