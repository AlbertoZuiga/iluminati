import Modal from "./Modal"
import AutoCards from "./AutoCards"

// Formulario de viaje reutilizable (crear y editar). El estado vive en useViajeForm;
// aquí solo se renderiza y se delegan los handlers al padre.
export default function ViajeFormModal({
  title,
  open,
  onClose,
  onSubmit,
  form,
  onChange,
  onSelectAuto,
  onToggleParticipante,
  autoOptions,
  participantOptions,
  participantesLabel,
  gap,
  error,
  saving,
  submitLabel,
}) {
  return (
    <Modal title={title} open={open} onClose={onClose}>
      <form className="form-card" onSubmit={onSubmit}>
        {error && (
          <p className="feedback-banner feedback-error" role="alert">{error}</p>
        )}

        <div>
          <p className="auto-cards-label">Auto</p>
          <AutoCards selected={form.auto} onSelect={onSelectAuto} options={autoOptions} />
        </div>

        <div className="split-fields">
          <label>
            <span>KM inicial</span>
            <input
              type="number"
              name="kminicio"
              min="0"
              inputMode="numeric"
              value={form.kminicio}
              onChange={onChange}
              placeholder="12500"
              required
            />
          </label>
          <label>
            <span>KM final <span className="field-optional">(opcional)</span></span>
            <input
              type="number"
              name="kmfin"
              min="0"
              inputMode="numeric"
              value={form.kmfin}
              onChange={onChange}
              placeholder="12650"
            />
          </label>
        </div>

        {gap != null && (
          <p className="feedback-banner feedback-warning">
            Últimos km registrados: {gap.refKm.toLocaleString("es-CL")} · quedarán{" "}
            {gap.km.toLocaleString("es-CL")} km sin registrar
          </p>
        )}

        <div>
          <p className="auto-cards-label" style={{ marginTop: 0 }}>{participantesLabel}</p>
          {participantOptions.length === 0 ? (
            <p className="hint-text">
              No hay usuarios activos registrados.
            </p>
          ) : (
            <ul className="participant-list">
              {participantOptions.map((u) => (
                <li key={u.id}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.participantes.includes(u.id)}
                      onChange={() => onToggleParticipante(u.id)}
                    />
                    {u.nombre ?? u.email ?? u.id}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving || !form.auto}>
          {saving ? "Guardando…" : submitLabel}
        </button>
      </form>
    </Modal>
  )
}
