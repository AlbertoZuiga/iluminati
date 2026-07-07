import { useState } from "react"
import Modal from "./Modal"

// Modal liviano para cerrar un viaje abierto: único input de KM final.
// `viaje`: el viaje abierto (o null). `autoNombre(autoId)`: etiqueta del auto.
// `onFinalizar(viaje, kmfin)`: async, hace el update; devuelve/lanza según resultado.
export default function FinalizarViajeModal({ viaje, autoNombre, onClose, onFinalizar }) {
  const [kmfin, setKmfin] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    const kmfinNum = Number(kmfin)
    if (!kmfin || kmfinNum <= Number(viaje.kminicio)) {
      setError("El KM final debe ser mayor que el KM inicial.")
      return
    }
    setSaving(true)
    try {
      await onFinalizar(viaje, kmfinNum)
      onClose()
    } catch (err) {
      setError(err.message || "No se pudo finalizar el viaje")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Finalizar viaje" open={viaje !== null} onClose={onClose}>
      {viaje && (
        <form className="form-card" onSubmit={handleSubmit}>
          {error && (
            <p className="feedback-banner feedback-error" role="alert">{error}</p>
          )}

          <p className="hint-text">
            <strong>{autoNombre(viaje.auto)}</strong>
            {viaje.kminicio != null ? ` · KM inicial: ${viaje.kminicio.toLocaleString("es-CL")}` : ""}
          </p>

          <label>
            <span>KM final</span>
            <input
              type="number"
              name="kmfin"
              min="0"
              inputMode="numeric"
              value={kmfin}
              onChange={(e) => setKmfin(e.target.value)}
              placeholder="12650"
              autoFocus
              required
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Finalizar viaje"}
          </button>
        </form>
      )}
    </Modal>
  )
}
